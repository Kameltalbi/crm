import nodemailer from 'nodemailer';

type SendResetEmailInput = {
  toEmail: string;
  userName?: string | null;
  resetUrl: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

export async function sendPasswordResetEmail(input: SendResetEmailInput): Promise<boolean> {
  const config = getSmtpConfig();
  if (!config) return false;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const displayName = input.userName?.trim() || 'utilisateur';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#1f2937;">
      <h2 style="margin:0 0 12px;">Réinitialisation du mot de passe</h2>
      <p>Bonjour ${displayName},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>
        <a href="${input.resetUrl}" style="background:#16a34a;color:#fff;padding:10px 14px;text-decoration:none;border-radius:6px;display:inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p>Ce lien expire dans 30 minutes.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.from,
    to: input.toEmail,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Bonjour ${displayName},\n\nRéinitialisez votre mot de passe via ce lien: ${input.resetUrl}\n\nCe lien expire dans 30 minutes.`,
    html,
  });

  return true;
}

