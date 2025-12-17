/**
 * Gmail Service
 * Handles sending follow-up emails via Gmail API using OAuth tokens
 * Note: Actual email sending requires a backend/Edge Function for security
 */

import { supabase } from '../supabaseClient';
import { db } from './db';
import { Lead } from '../types';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface GmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email templates for common follow-up scenarios
export const emailTemplates = {
  callFollowUp: (leadName: string, summary: string) => ({
    subject: `Following up on our conversation - Eburon Properties`,
    body: `
Dear ${leadName},

Thank you for speaking with us today. We wanted to follow up on our conversation and provide you with the next steps.

${summary}

If you have any questions or need further assistance, please don't hesitate to reach out.

Best regards,
Eburon Properties Team
contact@eburon.ai
    `.trim()
  }),

  propertyInquiry: (leadName: string, propertyAddress: string) => ({
    subject: `Property Information: ${propertyAddress}`,
    body: `
Dear ${leadName},

Thank you for your interest in the property at ${propertyAddress}.

We would be happy to schedule a viewing at your earliest convenience. Please reply to this email or call us to arrange a time that works best for you.

Best regards,
Eburon Properties Team
contact@eburon.ai
    `.trim()
  }),

  maintenanceConfirmation: (leadName: string, ticketSummary: string) => ({
    subject: `Maintenance Request Confirmation`,
    body: `
Dear ${leadName},

We have received your maintenance request and wanted to confirm the details:

${ticketSummary}

Our team will be in touch shortly to schedule the work. If you have any questions in the meantime, please don't hesitate to contact us.

Best regards,
Eburon Properties Maintenance Team
    `.trim()
  })
};

/**
 * Get the user's Google OAuth access token from Supabase session
 */
export const getGoogleAccessToken = async (): Promise<string | null> => {
  if (!supabase) return null;
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.provider_token && session?.user?.app_metadata?.provider === 'google') {
    return session.provider_token;
  }
  
  return null;
};

/**
 * Check if Gmail integration is available for the current user
 */
export const isGmailEnabled = async (): Promise<boolean> => {
  const token = await getGoogleAccessToken();
  return !!token;
};

/**
 * Queue an email for sending and log it as an interaction
 * Note: In production, this would send to a backend endpoint
 */
export const queueFollowUpEmail = async (
  lead: Lead,
  subject: string,
  body: string
): Promise<GmailSendResult> => {
  const token = await getGoogleAccessToken();
  
  if (!token) {
    // Queue email as interaction even without Gmail token
    await db.createInteraction({
      type: 'EMAIL',
      direction: 'OUTBOUND',
      leadId: lead.id,
      content: `Subject: ${subject}\n\n${body}`,
      metadata: { 
        status: 'pending_gmail_auth',
        recipient: lead.email 
      },
      timestamp: new Date().toISOString()
    });
    
    return { 
      success: false, 
      error: 'Gmail not connected. Please sign in with Google to enable email sending.' 
    };
  }
  
  // In production, this would make an API call to a backend that uses the token
  // For now, we'll simulate the email being queued
  
  try {
    // Log the email as a sent interaction
    await db.createInteraction({
      type: 'EMAIL',
      direction: 'OUTBOUND',
      leadId: lead.id,
      content: `Subject: ${subject}\n\n${body}`,
      metadata: { 
        status: 'sent',
        recipient: lead.email,
        sentAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
    console.log(`Email queued for ${lead.email}: ${subject}`);
    
    return { 
      success: true,
      messageId: `msg-${Date.now()}`
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to queue email' 
    };
  }
};

/**
 * Send a follow-up email after a call ends
 */
export const sendCallFollowUp = async (
  lead: Lead,
  callSummary: string
): Promise<GmailSendResult> => {
  const template = emailTemplates.callFollowUp(
    `${lead.firstName} ${lead.lastName}`,
    callSummary
  );
  
  return queueFollowUpEmail(lead, template.subject, template.body);
};

export const gmailService = {
  getGoogleAccessToken,
  isGmailEnabled,
  queueFollowUpEmail,
  sendCallFollowUp,
  emailTemplates
};
