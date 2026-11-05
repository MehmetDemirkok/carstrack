import { AwsClient } from "aws4fetch";

export type OffsiteResult =
  | { status: "skipped" }
  | { status: "ok" }
  | { status: "failed"; error: string };

const UPLOAD_TIMEOUT_MS = 60_000;

/** Yedeğin bir kopyasını S3 uyumlu dış depoya (S3, Cloudflare R2, Backblaze B2...) yazar. */
export async function uploadBackupOffsite(key: string, body: Uint8Array): Promise<OffsiteResult> {
  const endpoint = process.env.BACKUP_S3_ENDPOINT?.replace(/\/+$/, "");
  const bucket = process.env.BACKUP_S3_BUCKET;
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;

  const settings = [endpoint, bucket, accessKeyId, secretAccessKey];
  if (settings.every((value) => !value)) return { status: "skipped" };
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return { status: "failed", error: "BACKUP_S3_* ortam değişkenleri eksik" };
  }

  try {
    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: process.env.BACKUP_S3_REGION || "auto",
    });
    const response = await client.fetch(`${endpoint}/${bucket}/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/gzip" },
      body: Buffer.from(body),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (response.ok) return { status: "ok" };
    return { status: "failed", error: `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}` };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
