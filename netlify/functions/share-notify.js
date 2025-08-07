import nodemailer from 'nodemailer';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { platform, page, title } = JSON.parse(event.body || '{}');

  if (!platform || !page) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing platform or page URL' }),
    };
  }

  const {
    NOTIFY_EMAIL,
    NOTIFY_EMAIL_PASS,
    NOTIFY_TO,
    NOTIFY_FROM = 'K4 Share Notification'
  } = process.env;

  if (!NOTIFY_EMAIL || !NOTIFY_EMAIL_PASS) {
    console.error('Missing NOTIFY_EMAIL or NOTIFY_EMAIL_PASS in environment.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing email credentials' }),
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: NOTIFY_EMAIL,
        pass: NOTIFY_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${NOTIFY_FROM}" <${NOTIFY_EMAIL}>`,
      to: NOTIFY_TO || NOTIFY_EMAIL,
      subject: `🔔 K4 Share Notification – ${platform}`,
      text: `A share was triggered from K4 Studios!

Platform: ${platform}
Title: ${title || 'Untitled'}
Page: ${page}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Mailer error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
    };
  }
}
