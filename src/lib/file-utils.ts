/** Bir dosyayı base64'e çevirir (data URL prefix'i olmadan) — AI belge tarama için. */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SCAN_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const SCAN_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
export const SCAN_ALLOWED_EXTS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
