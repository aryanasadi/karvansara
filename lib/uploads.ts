import "server-only";
import { db } from "@/db";
import { uploads } from "@/db/schema";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_EXT_LABEL = "JPG، PNG یا WEBP";

export type UploadResult = { url?: string; error?: string };

/**
 * Stores an image in postgres as base64 and returns a served URL.
 * Keeping binaries in the DB avoids requiring a persistent volume / S3 on PaaS.
 */
export async function storeImage(userId: string, file: File): Promise<UploadResult> {
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "فایلی انتخاب نشده است." };
  }
  const mime = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mime as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { error: `فقط فرمت‌های ${ALLOWED_EXT_LABEL} پذیرفته می‌شوند.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "حجم تصویر باید کمتر از ۲ مگابایت باشد." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Signature sniffing: make sure the bytes really are the claimed image type.
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isJpeg && !isPng && !isWebp) {
    return { error: "محتوای فایل یک تصویر معتبر نیست." };
  }

  const inserted = await db
    .insert(uploads)
    .values({
      userId,
      mimeType: mime,
      size: buffer.length,
      data: buffer.toString("base64"),
    })
    .returning({ id: uploads.id });

  const id = inserted[0]?.id;
  if (!id) return { error: "ذخیره تصویر ناموفق بود." };
  return { url: `/api/uploads/${id}` };
}
