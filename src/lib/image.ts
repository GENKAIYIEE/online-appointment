export const MAX_DIMENSION = 1200; // sufficiently legible but much smaller footprint
export const TARGET_LENGTH = 200_000; // ≈ 150 KB binary per page (200k chars in base64)
export const MAX_SAFE_LENGTH = 1_500_000; // ≈ 1.1 MB binary fallback cap

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = src;
  });
}

export async function compressToJpegDataUrl(src: string): Promise<string> {
  const img = await loadImage(src);
  let maxDim = MAX_DIMENSION;
  let quality = 0.85;
  let lastOut = "";

  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-unavailable");
    // White background so transparent PNGs don't turn black when encoded as JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const out = canvas.toDataURL("image/jpeg", quality);
    lastOut = out;
    if (out.length <= TARGET_LENGTH) return out;

    quality = Math.max(0.5, quality - 0.1);
    maxDim = Math.round(maxDim * 0.85);
  }

  // If after 5 aggressive compression passes it didn't hit 200k chars,
  // accept the result as long as it's comfortably below the safe 1.5MB cap.
  if (lastOut && lastOut.length <= MAX_SAFE_LENGTH) {
    return lastOut;
  }

  throw new Error("too-large");
}
