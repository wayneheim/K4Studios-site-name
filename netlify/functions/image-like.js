import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { imageId, page, title, timestamp } = JSON.parse(event.body || '{}');

  if (!imageId || !page) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing imageId or page URL' }),
    };
  }

  const {
    NOTIFY_EMAIL,
    NOTIFY_EMAIL_PASS,
    NOTIFY_TO,
    NOTIFY_FROM = 'K4 Like Notification',
    AIRTABLE_API_TOKEN,
    AIRTABLE_BASE_ID,
  } = process.env;

  const likeTime = new Date(timestamp || Date.now()).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // 📝 Airtable Logging
  const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Likes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        imageID: imageId,
        title: title || 'Untitled',
        Page: page,
        timestamp: likeTime,
      },
    }),
  });

  const airtableResponseText = await airtableRes.text();
  console.log('Airtable response:', airtableResponseText);

  if (!airtableRes.ok) {
    console.error('Airtable logging error:', airtableResponseText);
  }

  // 📧 Email Notification
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
      subject: `❤️ K4 Image Liked – "${title || 'Untitled'}"`,
      text: `A ❤️-like was registered on K4 Studios!

Image Title: ${title || 'Untitled'}
Image ID: ${imageId}
Page: ${page}
Time: ${likeTime}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Mailer error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send like notification email' }),
    };
  }
}
