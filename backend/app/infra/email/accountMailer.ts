import nodemailer from 'nodemailer';
import type { AccountMailer } from '../../application/ports/auth.port.js';
import type { Environment } from '../config/environment.js';

export class SmtpAccountMailer implements AccountMailer {
  private readonly transport;

  constructor(private readonly env: Environment) {
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      ...(env.SMTP_USER
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
        : {}),
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10_000,
    });
  }

  async sendReset(email: string, token: string) {
    const url = new URL('/reset-password', this.env.FRONTEND_URL);
    url.searchParams.set('token', token);
    await this.transport.sendMail({
      from: this.env.MAIL_FROM,
      to: email,
      subject: 'Redefina sua senha — Financy',
      text: `Recebemos um pedido para redefinir sua senha. O link vale por 30 minutos:\n\n${url.toString()}\n\nSe você não solicitou, ignore este e-mail.`,
    });
  }

  async sendPasswordChanged(email: string) {
    await this.transport.sendMail({
      from: this.env.MAIL_FROM,
      to: email,
      subject: 'Sua senha foi alterada — Financy',
      text: 'A senha da sua conta Financy foi alterada. Se você não reconhece essa ação, solicite a recuperação da senha.',
    });
  }
}
