import nodemailer from 'nodemailer';

export async function handler(event, context) {
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

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NOTIFY_EMAIL,
        pass: process.env.NOTIFY_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${process.env.NOTIFY_FROM || 'K4 Share Notification'}" <${process.env.NOTIFY_EMAIL}>`,
      to: process.env.NOTIFY_TO || process.env.NOTIFY_EMAIL,
      subject: `K4 Share Notification - ${platform}`,
      text: `🔔 A share was triggered from K4 Studios!\n\nPlatform: ${platform}\nTitle: ${title || 'Untitled'}\nPage: ${page}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Full error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send notification' }),
    };
  }
}
