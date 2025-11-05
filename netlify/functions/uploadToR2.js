// /netlify/functions/uploadToR2.js
require('dotenv').config();
const fs = require('fs');
import multiparty from 'multiparty';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const { uploadFile } = require('../../scripts/upload-to-r2.js');

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 🧩 If Content-Type includes multipart/form-data (browser upload)
  if (event.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const form = new multiparty.Form();

      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(event, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      const destKey = fields.destKey?.[0];
      const fileObj = Object.values(files)[0]?.[0];
      if (!fileObj || !destKey) {
        return { statusCode: 400, body: 'Missing file or destKey' };
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

      const fileStream = fs.createReadStream(fileObj.path);
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: destKey,
        Body: fileStream,
        ContentType: fileObj.headers['content-type'] || 'application/octet-stream',
      };

      await s3.send(new PutObjectCommand(params));
      const url = `https://media.k4studios.com/${destKey}`;
      console.log(`✅ Uploaded via FormData → ${url}`);

      return { statusCode: 200, body: JSON.stringify({ url }) };
    } catch (err) {
      console.error('Multipart upload error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // 🧩 Otherwise fallback to JSON mode (for manifest JSON uploads)
  try {
    const body = JSON.parse(event.body);
    const { localFile, destKey, content } = body;
    if (!destKey) {
      return { statusCode: 400, body: 'Missing destKey' };
    }

    let url;
    if (content) {
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
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: destKey,
        Body: content,
        ContentType: 'application/json',
      };
      await s3.send(new PutObjectCommand(params));
      url = `https://media.k4studios.com/${destKey}`;
    } else {
      url = await uploadFile(localFile, destKey);
    }

    return { statusCode: 200, body: JSON.stringify({ url }) };
  } catch (err) {
    console.error('Legacy JSON upload error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
