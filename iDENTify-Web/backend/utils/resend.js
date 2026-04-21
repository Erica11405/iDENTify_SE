const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
let resend = null;

if (apiKey) {
  try {
    resend = new Resend(apiKey);
  } catch (err) {
    console.error('Error initializing Resend client:', err.message);
  }
} else {
  console.warn('RESEND_API_KEY is not defined in .env. Resend functionality will be unavailable.');
}

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    throw new Error('Resend is not configured. Set RESEND_API_KEY in backend .env.');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.MAILER_FROM || 'iDENTify Clinic <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend API error response:', error);
      throw new Error(error.message || 'Failed to send email via Resend API');
    }

    return data;
  } catch (err) {
    console.error('Resend service exception:', err.message);
    throw err;
  }
}

module.exports = { sendEmail };
