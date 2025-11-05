process.env.NODE_TLS_MIN_VERSION = "TLSv1.2";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

console.log("🔹 Using endpoint:", endpoint);
console.log("🔹 Bucket:", R2_BUCKET_NAME);

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const filePath = "./audio/test-audio.mp3";
const fileName = "test-audio.mp3";

const uploadParams = {
  Bucket: R2_BUCKET_NAME,
  Key: fileName,
  Body: fs.createReadStream(filePath),
  ContentType: "audio/mpeg",
};

console.log("⏳ Uploading to R2...");

try {
  const data = await s3.send(new PutObjectCommand(uploadParams));
  console.log("✅ Upload successful!");
  console.log(`🌐 Public URL: https://media.k4studios.com/${fileName}`);
} catch (err) {
  console.error("❌ Upload failed:", err);
}
