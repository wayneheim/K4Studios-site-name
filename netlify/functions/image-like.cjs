import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzyCEvOy7f4sfePpdnNjRLy3HosBoJEUcPcG0bQiFAx8AtvkKxO8_KUrY-3eNZF300/exec';

// Simplify User-Agent to just the OS/device
function simplifyUA(ua) {
  if (!ua || ua === 'unknown') return 'unknown';
  const lower = ua.toLowerCase();
  if (lower.includes('iphone')) return 'iPhone';
  if (lower.includes('ipad')) return 'iPad';
  if (lower.includes('android')) return 'Android';
  if (lower.includes('macintosh') || lower.includes('mac os')) return 'Mac';
  if (lower.includes('windows')) return 'Windows';
  if (lower.includes('linux')) return 'Linux';
  return 'Other';
}

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
  const rawUA = event.headers['user-agent'] || 'unknown';
  const ua = simplifyUA(rawUA);
  const referer = event.headers['referer'] || event.headers['referrer'] || 'none';
  
  // Cloudflare is in front, so cf-connecting-ip has the real client IP
  // x-nf-client-connection-ip will show Cloudflare's edge server IP
  const rawIp =
    event.headers['cf-connecting-ip'] ||
    event.headers['true-client-ip'] ||
    event.headers['x-real-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0]?.trim() ||
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    '';
  const ip = rawIp || 'unknown';

  // 📝 Google Sheets Logging - always log all likes for analytics
  try {
    const sheetRes = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheet: 'Likes',
        timestamp: likeTime,
        imageID: imageId,
        title: title || 'Untitled',
        page,
        isRepeat: isRepeatLike ? 'Yes' : 'No',
        ip,
        ua,
      }),
    });
    console.log('Google Sheets response:', sheetRes.status);
  } catch (sheetError) {
    console.error('Google Sheets logging error:', sheetError);
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
