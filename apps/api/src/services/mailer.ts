import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Create a transporter using environment variables. Falls back to console logging.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass }
    });
  }
  // Dummy transporter: prints emails to the console; 
  // console log instead of sending email for now
  return {
    async sendMail(options: EmailOptions) {
      // eslint-disable-next-line no-console
      console.log(`[TEST ONLY] Sending email to ${options.to}: ${options.subject}\n${options.text}`);
    }
  } as any;
}

const transporter = createTransporter();

export async function sendEmail(opts: EmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@example.com',
    ...opts
  });
}