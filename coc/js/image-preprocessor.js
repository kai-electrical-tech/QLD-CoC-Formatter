// QLD CoC Generator — Client-Side Image Pre-Processor & Compressor
// Automatically normalizes photo orientation, aspect-fit scaling, and compresses to target 200 DPI resolution
(function(window) {
  'use strict';

  // Target A4 3:4 portrait photo box at 200 DPI
  // Box in PDF: 150pt x 200pt (ratio 3:4).
  // Target raster canvas: 900px x 1200px (provides >2.5x oversampling for ultra-crisp 200 DPI rendering)
  const TARGET_WIDTH = 900;
  const TARGET_HEIGHT = 1200;
  const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT; // 0.75 (3:4)
  const JPEG_QUALITY = 0.82;

  async function loadSourceImage(file) {
    if (typeof window.createImageBitmap === 'function') {
      try {
        const bitmap = await window.createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => {
            if (typeof bitmap.close === 'function') bitmap.close();
          }
        };
      } catch (_) {
        // Fallback to Image element if createImageBitmap is unsupported for the image format
      }
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({
          source: img,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          cleanup: () => URL.revokeObjectURL(url)
        });
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  const ImagePreprocessor = {
    /**
     * Process an image file: auto-orient, scale, aspect-fit, and compress
     * @param {File} file 
     * @returns {Promise<{id: string, dataUrl: string, width: number, height: number, originalName: string}>}
     */
    async processPhotoFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        throw new Error('Selected file is not an image');
      }

      const imageSource = await loadSourceImage(file);
      const srcW = imageSource.width;
      const srcH = imageSource.height;

      // Detect if image is 4:3 landscape (width > height, ratio ~1.33)
      const srcRatio = srcW / srcH;
      const isLandscape43 = srcW > srcH && (srcRatio >= 1.2 && srcRatio <= 1.55);

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext('2d');

      // Fill canvas with pure white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (isLandscape43) {
        // Auto-rotate 90 degrees clockwise into 3:4 portrait
        ctx.save();
        ctx.translate(TARGET_WIDTH / 2, TARGET_HEIGHT / 2);
        ctx.rotate((90 * Math.PI) / 180);

        // In rotated space, the source width maps to TARGET_HEIGHT and height maps to TARGET_WIDTH
        // Scale to fill or fit cleanly
        const scale = Math.min(TARGET_HEIGHT / srcW, TARGET_WIDTH / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;

        ctx.drawImage(imageSource.source, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        // Standard portrait or non-standard aspect ratio: perform aspect-fit containment
        // Calculate dimensions to fit inside 900x1200 while preserving aspect ratio
        let drawW, drawH;
        if (srcRatio > TARGET_RATIO) {
          // Wider than 3:4 -> fit to width, letterbox top/bottom
          drawW = TARGET_WIDTH;
          drawH = TARGET_WIDTH / srcRatio;
        } else {
          // Taller than or equal to 3:4 -> fit to height, pillarbox left/right
          drawH = TARGET_HEIGHT;
          drawW = TARGET_HEIGHT * srcRatio;
        }

        const offsetX = (TARGET_WIDTH - drawW) / 2;
        const offsetY = (TARGET_HEIGHT - drawH) / 2;

        ctx.drawImage(imageSource.source, offsetX, offsetY, drawW, drawH);
      }

      // Immediately free the decoded source bitmap/object URL from heap
      imageSource.cleanup();

      const compressedDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

      // Clean up canvas bitmap to release mobile memory
      canvas.width = 0;
      canvas.height = 0;

      const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(16).substring(2, 8);

      return {
        id: photoId,
        dataUrl: compressedDataUrl,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        originalName: file.name
      };
    }
  };

  window.ImagePreprocessor = ImagePreprocessor;
})(window);
