import Vapi from '@vapi-ai/web';
import { db } from './db';
import { LAURENT_AGENT_CONFIG } from './laurentConfig';
import { Lead } from '../types';

const vapi = new Vapi((import.meta as any).env.VITE_VAPI_PUBLIC_KEY || '');

export const vapiManager = {
  vapi,

  // Track active context
  currentLeadId: null as string | null,

  startCall: async (lead?: Lead) => {
    // Override assistant context if lead is provided
    const assistantOverrides = lead ? {
        variableValues: {
            leadName: `${lead.firstName} ${lead.lastName}`,
            // leadAddress removed as it doesn't exist on Lead type
        }
    } : {};
    
    if (lead) {
        vapiManager.currentLeadId = lead.id;
    } else {
        vapiManager.currentLeadId = null;
    }

    // We start the call with the FULL config to ensure prompts are respected
    return vapi.start(LAURENT_AGENT_CONFIG as any, assistantOverrides);
  },

  stopCall: () => {
     vapi.stop();
     vapiManager.currentLeadId = null;
  },

  toggleMute: (mute: boolean) => {
      vapi.setMuted(mute);
  },

  // Event Listeners Initialization
  init: () => {
      // Remove existing listeners to avoid duplicates if init called multiple times
      vapi.removeAllListeners();

      vapi.on('call-end', () => {
          console.log('Call Ended. Waiting for report...');
          vapiManager.currentLeadId = null;
      });
      
      vapi.on('message', (message: any) => {
          console.log('Vapi Message:', message);
          
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
                          direction: 'OUTBOUND', // Laurent usually calls out, or it's an inbound web call. We can default to 'VOICE_CALL' without specific direction if unsure.
                          leadId: vapiManager.currentLeadId || undefined, 
                          content: summary,
                          metadata: {
                              transcript: transcript,
                              vapiCallId: message.call?.id,
                              structuredData: structuredData
                          },
                          timestamp: new Date().toISOString()
                      };

                      await db.createInteraction(interaction);
                      
                      console.log('Call interaction saved from report.');
                  } catch (e) {
                      console.error('Error processing call report:', e);
                  }
              })();
          }
      });
      
      vapi.on('error', (e) => {
          console.error('Vapi Error:', e);
      });
  }
};
