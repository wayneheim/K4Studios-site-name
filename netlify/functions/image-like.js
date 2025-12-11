import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { imageId, page, title, timestamp, isRepeatLike, sendEmail } = JSON.parse(event.body || '{}');

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

  // Request context: UA, Referer, IP
  const ua = event.headers['user-agent'] || 'unknown';
  const referer = event.headers['referer'] || event.headers['referrer'] || 'none';
  const rawIp =
    event.headers['x-forwarded-for'] ||
    event.headers['client-ip'] ||
    event.headers['x-nf-client-connection-ip'] ||
    event.ip ||
    '';
  const ip = (rawIp || '')
    .toString()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0] || 'unknown';

  // 📝 Airtable Logging - always log all likes for analytics
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
        isRepeat: isRepeatLike ? 'Yes' : 'No',
        ip,
        ua,
      },
    }),
  });

  const airtableResponseText = await airtableRes.text();
  console.log('Airtable response:', airtableResponseText);

  if (!airtableRes.ok) {
    console.error('Airtable logging error:', airtableResponseText);
  }

  // 📧 Email Notification (optional - only for first-time likes)
  if (!sendEmail) {
    console.log('Repeat like - skipping email notification');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, emailSent: false, reason: 'repeat_like' }),
    };
  }
  
  if (!NOTIFY_EMAIL || !NOTIFY_EMAIL_PASS) {
    console.warn('Missing NOTIFY_EMAIL or NOTIFY_EMAIL_PASS - skipping email notification');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, emailSent: false }),
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
      body: JSON.stringify({ success: true, emailSent: true }),
    };
  } catch (err) {
    console.error('Mailer error (non-fatal):', err);
    // Still return success since Airtable logged successfully
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, emailSent: false, emailError: err.message }),
    };
  }
}
