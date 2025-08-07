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
        user: process.env.NOTIFY_EMAIL,
        pass: process.env.NOTIFY_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"K4 Share Notification" <${process.env.NOTIFY_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL, // sent back to self, triggers Gmail filter
      subject: `K4 Share Notification - ${platform}`,
      text: `🔔 A share was triggered from K4 Studios!\n\nPlatform: ${platform}\nTitle: ${title || 'Untitled'}\nPage: ${page}`,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Share notify error:', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
