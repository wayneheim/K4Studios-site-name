import nodemailer from "nodemailer";

export async function POST({ request }) {
  const body = await request.json();
  const { platform = "Unknown", imageUrl = "", pageUrl = "", pageTitle = "" } = body;

  const transporter = nodemailer.createTransport({
    host: import.meta.env.EMAIL_HOST,
    port: Number(import.meta.env.EMAIL_PORT),
    secure: import.meta.env.EMAIL_SECURE === "true",
    auth: {
      user: import.meta.env.NOTIFY_EMAIL,
      pass: import.meta.env.NOTIFY_EMAIL_PASS,
    },
  });

  const platformTitle = platform.charAt(0).toUpperCase() + platform.slice(1);
  const subject = `K4 Share Notification – ${platformTitle}`;
  const bodyText = `
New share click recorded.

Platform: ${platformTitle}
Page Title: ${pageTitle}
URL: ${pageUrl}
Image: ${imageUrl}
`;

  try {
    await transporter.sendMail({
      from: import.meta.env.NOTIFY_FROM || `"K4 Studios" <${import.meta.env.NOTIFY_EMAIL}>`,
      to: import.meta.env.NOTIFY_EMAIL,
      subject,
      text: bodyText,
    });

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Mail send failed:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
    });
  }
}
