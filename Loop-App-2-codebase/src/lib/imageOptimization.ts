// Client-side image optimization utility for zero-latency avatar loading

export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  fileExt: string;
  contentType: string;
  originalSize: number;
  compressedSize: number;
}

// Global in-memory cache of avatar URLs that have already loaded in this session
export const avatarLoadedCache = new Set<string>();

/**
 * Compresses and resizes an avatar image client-side using HTML5 Canvas.
 * Drops typical 3MB-10MB mobile phone camera photos down to 20KB-40KB WebP/JPEG,
 * reducing network transfer time by >98% and rendering instantly on mobile screens.
 */
export async function compressAvatarImage(
  file: File,
  maxDimension = 384,
  quality = 0.82
): Promise<CompressedImageResult> {
  // If it's an animated GIF or SVG, do not compress via canvas to preserve animation/vector
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    const rawExt = file.name.split(".").pop()?.toLowerCase() || (file.type === "image/gif" ? "gif" : "svg");
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      previewUrl,
      fileExt: rawExt,
      contentType: file.type,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unable to parse image data"));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale proportionally to fit within maxDimension x maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
          const fallbackUrl = URL.createObjectURL(file);
          return resolve({
            file,
            previewUrl: fallbackUrl,
            fileExt: file.name.split(".").pop()?.toLowerCase() || "jpg",
            contentType: file.type || "image/jpeg",
            originalSize: file.size,
            compressedSize: file.size,
          });
        }

        // High quality bicubic-like downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Check if WebP is supported in this browser
        const testData = canvas.toDataURL("image/webp");
        const supportsWebP = testData.startsWith("data:image/webp");
        const mimeType = supportsWebP ? "image/webp" : "image/jpeg";
        const fileExt = supportsWebP ? "webp" : "jpg";

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const fallbackUrl = URL.createObjectURL(file);
              return resolve({
                file,
                previewUrl: fallbackUrl,
                fileExt: file.name.split(".").pop()?.toLowerCase() || "jpg",
                contentType: file.type || "image/jpeg",
                originalSize: file.size,
                compressedSize: file.size,
              });
            }

            const compressedFile = new File([blob], `avatar.${fileExt}`, {
              type: mimeType,
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);
            // Pre-seed in-memory cache with the preview blob URL
            avatarLoadedCache.add(previewUrl);

            resolve({
              file: compressedFile,
              previewUrl,
              fileExt,
              contentType: mimeType,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          mimeType,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Preloads avatar images headlessly in the background into browser memory.
 * By the time the user navigates to a screen or modal, the image is already decoded.
 */
export function preloadAvatars(urls: (string | null | undefined)[]) {
  if (typeof window === "undefined") return;

  const validUrls = urls.filter((url): url is string => Boolean(url && url.startsWith("http")));

  for (const url of validUrls) {
    if (avatarLoadedCache.has(url)) continue;

    const img = new Image();
    img.decoding = "async";
    img.onload = () => avatarLoadedCache.add(url);
    img.onerror = () => {
      // Ignore preload errors silently
    };
    img.src = url;
  }
}
