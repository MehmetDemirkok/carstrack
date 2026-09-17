/**
 * Tarayıcı tarafı görsel yeniden boyutlandırma.
 *
 * Fotoğraflar yüklenmeden önce burada küçültülür: telefon kamerasından gelen
 * 4-8 MB'lık dosyalar ne storage'a ne de karta taşınabilir boyutta değil.
 */

/** Dosyayı en fazla `maxPx` uzun kenara indirip JPEG data-URI döndürür. */
export async function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    return await drawToDataUrl(url, maxPx, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Hazır bir data-URI'yi daha küçük bir JPEG data-URI'ye indirger. */
export async function resizeDataUrl(dataUrl: string, maxPx: number, quality = 0.72): Promise<string | null> {
  if (typeof document === "undefined") return null;
  try {
    return await drawToDataUrl(dataUrl, maxPx, quality);
  } catch {
    return null;
  }
}

function drawToDataUrl(src: string, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas context alınamadı"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("görsel yüklenemedi"));
    img.src = src;
  });
}
