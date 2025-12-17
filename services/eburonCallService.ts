type EburonCallResponse = {
  id?: string;
  [key: string]: any;
};

const EBURON_API_URL = 'https://api.vapi.ai';

const getEburonConfig = () => {
  const apiKey = import.meta.env.VITE_EBURON_API_KEY as string | undefined;
  const assistantId = import.meta.env.VITE_EBURON_ASSISTANT_ID as string | undefined;
  const phoneNumberId = import.meta.env.VITE_EBURON_PHONE_NUMBER_ID as string | undefined;

  if (!apiKey || !assistantId || !phoneNumberId) {
    throw new Error('Missing Eburon API configuration.');
  }

  return { apiKey, assistantId, phoneNumberId };
};

export const createOutboundCall = async (customerNumber: string, assistantIdOverride?: string) => {
  const { apiKey, assistantId, phoneNumberId } = getEburonConfig();
  const selectedAssistantId = assistantIdOverride || assistantId;

  const response = await fetch(`${EBURON_API_URL}/call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: selectedAssistantId,
      phoneNumberId,
      customer: { number: customerNumber },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Eburon call failed: ${response.status} ${message}`);
  }

  return (await response.json()) as EburonCallResponse;
};
