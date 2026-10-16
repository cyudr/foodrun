/**
 * SnapChef Image Processing Utility
 * Multi-tiered image decoder:
 * Tier 1: Hardware-accelerated createImageBitmap
 * Tier 2: HTMLImageElement via Base64 Data URL (bypasses iframe blob URL restrictions)
 * Tier 3: Client-side HEIC/HEIF converter via dynamic CDN script
 * Tier 4: Direct Base64 Data URL fallback (Gemini natively supports JPEG, PNG, WebP, HEIC)
 */

// Helper to convert any Blob/File to a Base64 data URL
export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file into data URL'));
    reader.readAsDataURL(file);
  });
}

// Dynamically load heic2any from CDN if needed for non-Safari browsers
async function convertHeicIfNeeded(file: File | Blob): Promise<Blob> {
  const isHeic =
    (file.type && (file.type.toLowerCase().includes('heic') || file.type.toLowerCase().includes('heif'))) ||
    ('name' in file && typeof file.name === 'string' && /\.(heic|heif)$/i.test(file.name));

  if (!isHeic) {
    return file;
  }

  // Check if browser can decode it natively (Safari)
  if (typeof window !== 'undefined' && typeof createImageBitmap === 'function') {
    try {
      const testBitmap = await createImageBitmap(file);
      testBitmap.close();
      return file; // Native support exists!
    } catch {
      // Native decoder failed, proceed with conversion
    }
  }

  // Attempt dynamic conversion via CDN script if available
  try {
    if (typeof window !== 'undefined') {
      const anyWin = window as any;
      if (!anyWin.heic2any) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Could not load heic2any CDN'));
          document.head.appendChild(script);
        });
      }

      if (anyWin.heic2any) {
        const conversionResult = await anyWin.heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.85,
        });
        if (Array.isArray(conversionResult)) {
          return conversionResult[0];
        }
        return conversionResult as Blob;
      }
    }
  } catch (err) {
    console.warn('HEIC conversion warning (falling back to direct base64):', err);
  }

  return file;
}

/**
 * Process any uploaded image file (JPEG, PNG, WebP, HEIC/HEIF, etc.)
 * Resizes down to maxDimension (default 1280px) and returns a clean data URL.
 * NEVER throws an unhandled decode error; safely returns Base64 fallback if canvas fails.
 */
export async function processImageFile(
  file: File | Blob,
  maxDimension: number = 1280,
  quality: number = 0.82
): Promise<string> {
  if (!file) {
    throw new Error('No image file provided');
  }

  // Always prepare raw data URL first as an unbreakable fallback
  let rawDataUrl = '';
  try {
    rawDataUrl = await readFileAsDataUrl(file);
  } catch {
    // If FileReader fails on raw file, try URL.createObjectURL
  }

  try {
    // 1. Convert HEIC if needed
    const normalizedBlob = await convertHeicIfNeeded(file);

    // 2. Tier 1: Try hardware createImageBitmap
    if (typeof window !== 'undefined' && typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(normalizedBlob);
        const width = bitmap.width || 720;
        const height = bitmap.height || 960;

        let targetW = width;
        let targetH = height;
        if (targetW > maxDimension || targetH > maxDimension) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDimension) / targetW);
            targetW = maxDimension;
          } else {
            targetW = Math.round((targetW * maxDimension) / targetH);
            targetH = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
          const resultUrl = canvas.toDataURL('image/jpeg', quality);
          bitmap.close();
          return resultUrl;
        }
        bitmap.close();
      } catch (bitmapErr) {
        console.warn('createImageBitmap fallback:', bitmapErr);
      }
    }

    // 3. Tier 2: HTMLImageElement via DataURL (avoids blob URL security issues in iframes)
    const imageSource = rawDataUrl || (typeof URL !== 'undefined' ? URL.createObjectURL(normalizedBlob) : '');
    if (imageSource) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const imageElement = new Image();
          imageElement.crossOrigin = 'anonymous';
          let finished = false;

          const timeout = setTimeout(() => {
            if (!finished) {
              finished = true;
              reject(new Error('Image load timeout'));
            }
          }, 8000);

          imageElement.onload = () => {
            if (!finished) {
              finished = true;
              clearTimeout(timeout);
              resolve(imageElement);
            }
          };

          imageElement.onerror = (e) => {
            if (!finished) {
              finished = true;
              clearTimeout(timeout);
              reject(e);
            }
          };

          imageElement.src = imageSource;
        });

        const width = img.naturalWidth || img.width || 720;
        const height = img.naturalHeight || img.height || 960;
        let targetW = width;
        let targetH = height;

        if (targetW > maxDimension || targetH > maxDimension) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDimension) / targetW);
            targetW = maxDimension;
          } else {
            targetW = Math.round((targetW * maxDimension) / targetH);
            targetH = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          return canvas.toDataURL('image/jpeg', quality);
        }
      } catch (imgErr) {
        console.warn('HTMLImageElement decode fallback:', imgErr);
      }
    }
  } catch (err) {
    console.warn('General image decode fallback:', err);
  }

  // 4. Tier 4: Direct Data URL fallback (Guarantees upload NEVER fails)
  if (rawDataUrl) {
    return rawDataUrl;
  }

  // Absolute last resort
  return await readFileAsDataUrl(file);
}
