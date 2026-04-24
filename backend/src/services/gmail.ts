import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { GmailToken } from '@prisma/client';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

class GmailService {
  private createOAuthClient(): OAuth2Client {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(userId: string): string {
    const oauth2 = this.createOAuthClient();
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state: userId,
    });
  }

  async exchangeCode(code: string) {
    const oauth2 = this.createOAuthClient();
    const { tokens } = await oauth2.getToken(code);
    return tokens;
  }

  private async getClient(token: GmailToken): Promise<OAuth2Client> {
    const oauth2 = this.createOAuthClient();
    oauth2.setCredentials({
      access_token:  token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date:   token.expiresAt.getTime(),
    });
    return oauth2;
  }

  async getEmail(token: GmailToken): Promise<string | null> {
    try {
      const auth = await this.getClient(token);
      const oauth2api = google.oauth2({ version: 'v2', auth });
      const { data } = await oauth2api.userinfo.get();
      return data.email || null;
    } catch {
      return null;
    }
  }

  async sendMail(token: GmailToken, opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    pdfUrl?: string;
    pdfName?: string;
  }) {
    const auth = await this.getClient(token);
    const gmail = google.gmail({ version: 'v1', auth });

    const fromEmail = await this.getEmail(token) || 'me';

    // Construire message MIME
    const boundary = `boundary_${Date.now()}`;
    const lines: string[] = [
      `From: ${fromEmail}`,
      `To: ${opts.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
    ];

    let bodyMime: string;
    if (opts.pdfUrl) {
      // avec pièce jointe
      const pdfRes = await fetch(opts.pdfUrl);
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      const pdfBase64 = pdfBuffer.toString('base64');

      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      bodyMime = [
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        opts.text,
        '',
        `--${boundary}`,
        'Content-Type: application/pdf',
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${opts.pdfName || 'document.pdf'}"`,
        '',
        pdfBase64,
        `--${boundary}--`,
      ].join('\r\n');
    } else {
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      bodyMime = `\r\n${opts.text}`;
    }

    const raw = Buffer.from(lines.join('\r\n') + bodyMime)
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const { data } = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return { messageId: data.id || '', from: fromEmail };
  }
}

export const gmailService = new GmailService();
