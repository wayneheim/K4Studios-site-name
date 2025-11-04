import { existsSync } from "fs";
import path from "path";

export async function handler(event) {
  try {
    const { filename } = JSON.parse(event.body || "{}");
    if (!filename) return { statusCode: 400, body: "Filename required" };

    const filePath = path.join(process.cwd(), "src/data/Other/Stories", filename);
    const exists = existsSync(filePath);

    return { statusCode: 200, body: JSON.stringify({ exists }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
