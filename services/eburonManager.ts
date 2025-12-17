import Vapi from '@vapi-ai/web';
import { db } from './db';
import { LAURENT_AGENT_CONFIG } from './laurentConfig';
import { Lead, Task } from '../types';

const eburonClient = new Vapi((import.meta as any).env.VITE_EBURON_PUBLIC_KEY || '');

// Tool call handlers
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  getClientInfo: async (args: { phoneNumber: string }) => {
    console.log('Tool: getClientInfo called with', args);
    const leads = await db.getLeads();
    // Normalize phone number for matching
    const normalizedInput = args.phoneNumber.replace(/\D/g, '');
    const lead = leads.find((l: Lead) => l.phone.replace(/\D/g, '').includes(normalizedInput));
    
    if (lead) {
      return {
        found: true,
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        status: lead.status,
        interest: lead.interest,
        lastActivity: lead.lastActivity,
        notes: lead.notes
      };
    }
    return { found: false, message: 'No client found with that phone number' };
  },

  scheduleFollowUp: async (args: { leadId: string; reason: string; daysFromNow?: number }) => {
    console.log('Tool: scheduleFollowUp called with', args);
    const leads = await db.getLeads();
    const lead = leads.find((l: Lead) => l.id === args.leadId);
    
    if (!lead) {
      return { success: false, message: 'Lead not found' };
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (args.daysFromNow || 1));
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: `Follow up: ${args.reason}`,
      dueDate: dueDate.toISOString(),
      completed: false,
      leadId: lead.id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      priority: 'MEDIUM'
    };
    
    await db.createTask(newTask);
    return { 
      success: true, 
      message: `Follow-up scheduled for ${dueDate.toLocaleDateString()}`,
      taskId: newTask.id
    };
  },

  sendFollowUpEmail: async (args: { leadId: string; subject: string; message: string }) => {
    console.log('Tool: sendFollowUpEmail called with', args);
    const leads = await db.getLeads();
    const lead = leads.find((l: Lead) => l.id === args.leadId);
    
    if (!lead) {
      return { success: false, message: 'Lead not found' };
    }

    // Log the email request as an interaction (actual sending requires Gmail service)
    await db.createInteraction({
      type: 'EMAIL',
      direction: 'OUTBOUND',
      leadId: lead.id,
      content: `Subject: ${args.subject}\n\n${args.message}`,
      metadata: { status: 'queued', recipient: lead.email },
      timestamp: new Date().toISOString()
    });

    return { 
      success: true, 
      message: `Email queued to ${lead.email}`,
      note: 'Email will be sent when Gmail integration is active'
    };
  }
};

export const eburonManager = {
  client: eburonClient,

  // Track active context
  currentLeadId: null as string | null,

  startCall: async (lead?: Lead) => {
    // Override assistant context if lead is provided
    const assistantOverrides = lead ? {
        variableValues: {
            leadName: `${lead.firstName} ${lead.lastName}`,
        }
    } : {};
    
    if (lead) {
        eburonManager.currentLeadId = lead.id;
    } else {
        eburonManager.currentLeadId = null;
    }

    // We start the call with the FULL config to ensure prompts are respected
    return eburonClient.start(LAURENT_AGENT_CONFIG as any, assistantOverrides);
  },

  stopCall: () => {
     eburonClient.stop();
     eburonManager.currentLeadId = null;
  },

  toggleMute: (mute: boolean) => {
      eburonClient.setMuted(mute);
  },

  // Event Listeners Initialization
  init: () => {
      // Remove existing listeners to avoid duplicates if init called multiple times
      eburonClient.removeAllListeners();

      eburonClient.on('call-end', () => {
          console.log('Call Ended. Waiting for report...');
          eburonManager.currentLeadId = null;
      });
      
      eburonClient.on('message', async (message: any) => {
          console.log('Eburon Message:', message);
          
          // Handle tool calls from the assistant
          if (message.type === 'tool-call') {
              const { name, arguments: args } = message.toolCall || {};
              const handler = toolHandlers[name];
              
              if (handler) {
                  try {
                      const result = await handler(args);
                      // Send tool result back to Eburon
                      (eburonClient as any).send({
                          type: 'tool-call-result',
                          toolCallId: message.toolCallId,
                          result: JSON.stringify(result)
                      });
                  } catch (error) {
                      console.error(`Tool ${name} error:`, error);
                      (eburonClient as any).send({
                          type: 'tool-call-result',
                          toolCallId: message.toolCallId,
                          result: JSON.stringify({ error: 'Tool execution failed' })
                      });
                  }
              }
          }
          
          // Check for End of Call Report to save data
          if (message.type === 'end-of-call-report') {
               (async () => {
                  try {
                      // Extract meaningful data from the call report
                      const summary = message.analysis?.summary || 'No summary available.';
                      const structuredData = message.artifact?.structuredOutput || {};
                      const transcript = message.transcript || 'No transcript.';
                      
                      // 1. Create Interaction Log
                      const interaction = {
                          type: 'VOICE_CALL',
                          direction: 'OUTBOUND',
                          leadId: eburonManager.currentLeadId || undefined, 
                          content: summary,
                          metadata: {
                              transcript: transcript,
                              eburonCallId: message.call?.id,
                              structuredData: structuredData
                          },
                          timestamp: new Date().toISOString()
                      };

                      await db.createInteraction(interaction);
                      if (eburonManager.currentLeadId) {
                          const noteTimestamp = new Date().toLocaleString();
                          const structuredText = structuredData
                              ? JSON.stringify(structuredData, null, 2)
                              : 'No structured output.';
                          const note = `[${noteTimestamp}] Call Summary\n${summary}\n\nStructured Output\n${structuredText}`;
                          await db.appendLeadNotes(eburonManager.currentLeadId, note, 'Call summary saved');
                      }
                      
                      console.log('Call interaction saved from report.');
                  } catch (e) {
                      console.error('Error processing call report:', e);
                  }
              })();
          }
      });
      
      eburonClient.on('error', (e) => {
          console.error('Eburon Error:', e);
      });
  }
};
