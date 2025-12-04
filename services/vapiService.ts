import { AgentPersona } from '../types';
import { VAPI_AUTH, VAPI_SETTINGS } from '../constants';

export class VapiService {
  // Store the monitor URLs from the last call
  private callMonitorMap: Map<string, { listenUrl?: string, controlUrl?: string }> = new Map();
  
  async initiateCall(
    phoneNumber: string, 
    persona: AgentPersona
  ): Promise<{ status: string, call_id: string, message?: string }> {
    
    // Vapi payload for outbound phone call
    const payload = {
      assistantId: VAPI_SETTINGS.assistantId,
      phoneNumberId: VAPI_SETTINGS.phoneNumberId,
      customer: {
        number: phoneNumber
      }
    };

    try {
      const response = await fetch(`${VAPI_SETTINGS.baseUrl}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VAPI_AUTH.privateKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to initiate call');
      }

      // Store the monitor URLs if available
      if (data.monitor) {
        this.callMonitorMap.set(data.id, {
          listenUrl: data.monitor.listenUrl,
          controlUrl: data.monitor.controlUrl
        });
      }

      return { status: 'success', call_id: data.id };
    } catch (error: any) {
      console.error("Vapi API Call Failed", error);
      return { status: "error", call_id: "", message: error.message };
    }
  }

  // Get the WebSocket URL for real-time audio monitoring
  async listenToCall(callId: string): Promise<string | null> {
      const monitor = this.callMonitorMap.get(callId);
      return monitor?.listenUrl || null;
  }

  // Get the control URL for call control features
  getControlUrl(callId: string): string | null {
      const monitor = this.callMonitorMap.get(callId);
      return monitor?.controlUrl || null;
  }

  // Fetch actual call details including recording_url
  async getCallDetails(callId: string): Promise<any> {
      try {
          const response = await fetch(`${VAPI_SETTINGS.baseUrl}/call/${callId}`, {
              method: 'GET',
              headers: {
                  'Authorization': `Bearer ${VAPI_AUTH.privateKey}`
              }
          });
          
          if (!response.ok) {
              throw new Error(`Error fetching call details: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Map Vapi response to what App.tsx expects (recording_url, call_length)
          // Vapi: recordingUrl, endedAt, startedAt
          let callLength = 0;
          if (data.startedAt && data.endedAt) {
              const start = new Date(data.startedAt).getTime();
              const end = new Date(data.endedAt).getTime();
              callLength = (end - start) / 1000 / 60; // in minutes
          }

          return {
              recording_url: data.recordingUrl,
              call_length: callLength,
              status: data.status
          };
      } catch (error) {
          console.error("Failed to fetch call details", error);
          return null;
      }
  }

  // Clean up stored monitor data for a call
  cleanupCall(callId: string): void {
      this.callMonitorMap.delete(callId);
  }
}

export const vapiService = new VapiService();
