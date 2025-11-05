// scripts/upload-to-r2.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(localPath, destKey) {
  const fileStream = fs.createReadStream(localPath);
  const contentType = localPath.endsWith(".mp3")
    ? "audio/mpeg"
    : localPath.endsWith(".wav")
    ? "audio/wav"
    : "application/octet-stream";

  const uploadParams = {
    Bucket: R2_BUCKET_NAME,
    Key: destKey,
    Body: fileStream,
    ContentType: contentType,
  };

  await s3.send(new PutObjectCommand(uploadParams));
  const publicUrl = `https://media.k4studios.com/${destKey}`;
  console.log(`✅ Uploaded to: ${publicUrl}`);
  return publicUrl;
}

// CLI usage: node ./scripts/upload-to-r2.js "localPath" "destKey"
if (process.argv.length >= 4) {
  const localPath = process.argv[2];
  const destKey = process.argv[3];
  uploadFile(localPath, destKey).catch((err) => {
    console.error("❌ Upload failed:", err);
    process.exit(1);
  });
}

export { uploadFile };
