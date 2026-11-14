import "server-only";

import nodemailer from "nodemailer";

export type AlertMailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type AlertSendMail = (message: AlertMailMessage) => Promise<unknown>;

export async function sendAlertEmail(input: {
  to: string;
  subject: string;
  text: string;
  user: string;
  pass: string;
  from: string;
  sendMail?: AlertSendMail;
}): Promise<boolean> {
  const sendMail =
    input.sendMail ??
    (async (message) => {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: input.user, pass: input.pass },
      });
      await transporter.sendMail(message);
    });

  try {
    await sendMail({
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return true;
  } catch (error) {
    console.error("[alerts] smtp", error);
    return false;
  }
}
