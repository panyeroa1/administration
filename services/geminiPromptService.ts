import { GoogleGenAI } from '@google/genai';

type PromptInput = {
  agentName: string;
  companyName: string;
  companyDescription: string;
  websiteUrl?: string;
  knowledgeText?: string;
};

export const generateAgentSystemPrompt = async (input: PromptInput) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = [
    'Write a SYSTEM PROMPT for a voice agent who calls leads on behalf of a company.',
    'Use a natural, human tone with short sentences, occasional pauses, and empathy.',
    'Focus on outbound real-estate style calls unless company context suggests otherwise.',
    'Return ONLY the system prompt text with no extra formatting.',
    '',
    `Agent Name: ${input.agentName}`,
    `Company: ${input.companyName}`,
    `Company Description: ${input.companyDescription}`,
    input.websiteUrl ? `Website URL: ${input.websiteUrl}` : '',
    input.knowledgeText ? `Knowledge:\n${input.knowledgeText}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest-lite',
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });

  const text =
    (response as any).text ||
    (response as any).response?.text?.() ||
    '';

  if (!text || typeof text !== 'string') {
    throw new Error('No prompt generated');
  }

  return text.trim();
};
