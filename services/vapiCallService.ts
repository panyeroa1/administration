type VapiCallResponse = {
  id?: string;
  [key: string]: any;
};

const VAPI_API_URL = 'https://api.vapi.ai';

const getVapiConfig = () => {
  const apiKey = import.meta.env.VITE_VAPI_API_KEY as string | undefined;
  const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined;
  const phoneNumberId = import.meta.env.VITE_VAPI_PHONE_NUMBER_ID as string | undefined;

  if (!apiKey || !assistantId || !phoneNumberId) {
    throw new Error('Missing Vapi API configuration.');
  }

  return { apiKey, assistantId, phoneNumberId };
};

export const createOutboundCall = async (customerNumber: string) => {
  const { apiKey, assistantId, phoneNumberId } = getVapiConfig();

  const response = await fetch(`${VAPI_API_URL}/call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId,
      phoneNumberId,
      customer: { number: customerNumber },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Vapi call failed: ${response.status} ${message}`);
  }

  return (await response.json()) as VapiCallResponse;
};
