// /netlify/functions/uploadToR2.js
import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const missing = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
  ].filter((k) => !process.env[k]);
  if (missing.length) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Missing required env vars: ${missing.join(', ')}` }),
    };
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

  const headers = event.headers || {};
  const contentType = headers['content-type'] || headers['Content-Type'] || 'application/octet-stream';
  const qs = event.queryStringParameters || {};
  const queryDestKey = qs.destKey;

  // Preferred path: raw binary body from fetch(File)
  if (event.isBase64Encoded) {
    try {
      const destKey = queryDestKey;
      if (!destKey) return { statusCode: 400, body: 'Missing destKey' };
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

  // JSON payloads (supports explicit base64 uploads and text uploads)
  if (String(contentType).includes('application/json')) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { destKey, content, contentBase64, payloadType, contentType: bodyContentType } = body || {};
      const resolvedDestKey = destKey || queryDestKey;
      if (!resolvedDestKey) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing destKey' }) };
      }

      if (typeof contentBase64 === 'string' && contentBase64.length > 0) {
        const buffer = Buffer.from(contentBase64, 'base64');
        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: resolvedDestKey,
          Body: buffer,
          ContentType: bodyContentType || 'application/octet-stream',
        }));
        const url = `https://media.k4studios.com/${resolvedDestKey}`;
        console.log(`✅ Uploaded base64 JSON → ${url}`);
        return { statusCode: 200, body: JSON.stringify({ url }) };
      }

      if (typeof content === 'string') {
        const badObjectString = /^\[object\s+.+\]$/.test(content.trim());
        if (badObjectString || payloadType === 'audio') {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON audio payload; expected contentBase64 for binary uploads' }),
          };
        }
        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: resolvedDestKey,
          Body: content,
          ContentType: bodyContentType || 'application/json',
        }));
        const url = `https://media.k4studios.com/${resolvedDestKey}`;
        console.log(`✅ Uploaded JSON text → ${url}`);
        return { statusCode: 200, body: JSON.stringify({ url }) };
      }

      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing contentBase64 or content payload' }),
      };
    } catch (err) {
      console.error('JSON upload error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // Raw body fallback (non-JSON, non-base64). Guard against accidental object payload strings.
  try {
    const destKey = queryDestKey;
    if (!destKey) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing destKey' }) };
    }
    const rawBody = event.body || '';
    if (/^\[object\s+.+\]$/.test(String(rawBody).trim())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Refusing to upload object-string payload' }),
      };
    }
    const buffer = Buffer.from(rawBody, 'binary');
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: destKey,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    }));
    const url = `https://media.k4studios.com/${destKey}`;
    console.log(`✅ Uploaded raw body → ${url}`);
    return { statusCode: 200, body: JSON.stringify({ url }) };
  } catch (err) {
    console.error('Raw upload error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
