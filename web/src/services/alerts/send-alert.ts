import "server-only";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export async function sendAlertEmail(input: {
  to: string;
  subject: string;
  text: string;
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (response.ok) return true;
  console.error("[alerts] resend", response.status, await response.text());
  return false;
}
