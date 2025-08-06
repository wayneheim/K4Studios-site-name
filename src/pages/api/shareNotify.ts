import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, page, title } = req.body;

  if (!platform || !page) {
    return res.status(400).json({ error: 'Missing platform or page URL' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NOTIFY_EMAIL,         // e.g. yourapp@gmail.com
        pass: process.env.NOTIFY_EMAIL_PASS     // App password, not regular password
      },
    });

    await transporter.sendMail({
      from: process.env.NOTIFY_EMAIL,
      to: '14408236667@vtext.com',
      subject: '',
      text: `🔔 K4 Share Triggered:\nPlatform: ${platform}\nTitle: ${title || 'Untitled'}\nPage: ${page}`,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Share notify error:', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
