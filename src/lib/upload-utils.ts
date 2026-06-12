import path from "node:path";

/**
 * Returns the absolute path of the uploads directory.
 * In serverless production environments (like Vercel), it returns '/tmp/uploads'.
 * In local development, it returns the local 'uploads' directory.
 */
export function getUploadsDir(): string {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "/tmp/uploads";
  }
  return path.join(process.cwd(), "uploads");
}
