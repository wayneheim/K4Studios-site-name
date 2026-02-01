// /netlify/functions/uploadToR2.js
import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  // Preferred path: raw binary body from fetch(File)
  if (event.isBase64Encoded) {
    try {
      const qs = event.queryStringParameters || {};
      const destKey = qs.destKey;
      if (!destKey) return { statusCode: 400, body: 'Missing destKey' };
      const contentType = event.headers['content-type'] || 'application/octet-stream';
      const buffer = Buffer.from(event.body, 'base64');

      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: destKey,
        Body: buffer,
        ContentType: contentType,
      }));
      const url = `https://media.k4studios.com/${destKey}`;
      console.log(`✅ Uploaded binary → ${url}`);
      return { statusCode: 200, body: JSON.stringify({ url }) };
    } catch (err) {
      console.error('Binary upload error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // Fallback: JSON payloads (e.g., small text content)
  try {
    const body = JSON.parse(event.body || '{}');
    const { destKey, content, contentType = 'application/json' } = body || {};
    if (!destKey || typeof content !== 'string') {
      return { statusCode: 400, body: 'Missing destKey or content' };
    }
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: destKey,
      Body: content,
      ContentType: contentType,
    }));
    const url = `https://media.k4studios.com/${destKey}`;
    console.log(`✅ Uploaded JSON → ${url}`);
    return { statusCode: 200, body: JSON.stringify({ url }) };
  } catch (err) {
    console.error('JSON upload error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
