const nodemailer = require('nodemailer');

let transporterCache = null;
let transporterErrorLogged = false;

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function getMailerConfig() {
  const service = String(process.env.MAILER_SERVICE || process.env.SMTP_SERVICE || 'gmail').trim();
  const user = String(process.env.MAILER_USER || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.MAILER_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
  const host = String(process.env.MAILER_HOST || process.env.SMTP_HOST || '').trim();
  const from = String(
    process.env.MAILER_FROM
    || process.env.EMAIL_FROM
    || (user ? `iDENTify Clinic <${user}>` : '')
  ).trim();

  const port = Number.parseInt(String(process.env.MAILER_PORT || process.env.SMTP_PORT || ''), 10);
  const secure = toBoolean(process.env.MAILER_SECURE || process.env.SMTP_SECURE, false);

  const hasCredentials = Boolean(user && pass);
  const useHostTransport = Boolean(host && Number.isFinite(port) && port > 0);

  return {
    service,
    user,
    pass,
    host,
    from,
    port,
    secure,
    hasCredentials,
    useHostTransport,
  };
}

function isMailerConfigured() {
  const config = getMailerConfig();
  if (!config.hasCredentials) return false;
  if (config.useHostTransport) return true;
  return Boolean(config.service);
}

function getTransporter() {
  if (transporterCache) return transporterCache;

  const config = getMailerConfig();
  if (!config.hasCredentials) {
    if (!transporterErrorLogged) {
      console.warn('Mailer credentials are not configured. Set MAILER_USER and MAILER_PASS in backend environment.');
      transporterErrorLogged = true;
    }
    return null;
  }

  const transportConfig = config.useHostTransport
    ? {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }
    : {
      service: config.service,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    };

  transporterCache = nodemailer.createTransport(transportConfig);
  return transporterCache;
}

async function sendEmail({ to, subject, text }) {
  const destination = String(to || '').trim();
  if (!destination) {
    throw new Error('Email recipient is required.');
  }

  const mailer = getTransporter();
  const config = getMailerConfig();
  if (!mailer || !config.from) {
    throw new Error('Mailer is not configured. Set MAILER_USER, MAILER_PASS, and MAILER_FROM.');
  }

  await mailer.sendMail({
    from: config.from,
    to: destination,
    subject: String(subject || '').trim() || 'iDENTify Notification',
    text: String(text || '').trim(),
  });
}

module.exports = {
  isMailerConfigured,
  sendEmail,
};
