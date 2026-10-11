/** Longest side of a stored progress photo, in pixels. */
export const PHOTO_MAX_SIDE = 900;
/** Upper bound for a stored photo, as characters of its data URL (about 170 KB). */
export const PHOTO_MAX_LENGTH = 230_000;

/** Scales a size down so that its longest side is at most `max`; never scales up. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The file is not an image the browser can read'));
    };
    image.src = url;
  });
}

/**
 * Shrinks a photo in the browser before it is stored: it is scaled to at most
 * 900 px and encoded as JPEG, lowering the quality step by step until it is
 * small enough. Nothing is uploaded anywhere.
 */
export async function compressImage(file: Blob): Promise<string> {
  const image = await loadImage(file);
  const size = fitWithin(image.naturalWidth, image.naturalHeight, PHOTO_MAX_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(image, 0, 0, size.width, size.height);

  let quality = 0.78;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > PHOTO_MAX_LENGTH && quality > 0.3) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}
