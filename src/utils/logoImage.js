/**
 * Scaling a vendor logo before it is stored (#336 in linked-data-explorer).
 *
 * The logo travels in the publish body as a data URL. Read as-is, one above
 * about 7.5 MB took the body past the LDE backend's 10 MB limit, and the whole
 * publish failed with 413, where before only the logo upload failed.
 *
 * The organisation logo is cropped to a 256 x 256 square in OrganizationTab. A
 * vendor logo keeps its proportions instead, because vendor logos are often
 * wide wordmarks that a square crop would cut off.
 */

/** Longest side of a stored vendor logo, in pixels. */
export const VENDOR_LOGO_MAX_SIDE = 512;

/**
 * The size an image of `width` x `height` gets when it must fit within
 * `maxSide` on both sides: unchanged when it already fits, otherwise scaled
 * down with its proportions kept. Neither side drops below 1.
 */
export function fitWithin(width, height, maxSide) {
  if (width <= maxSide && height <= maxSide) return { width, height };
  const scale = maxSide / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Read an image file and return it as a PNG data URL that fits within
 * `maxSide`. Rejects when the file cannot be read or decoded as an image.
 * @param {File} file
 * @param {number} [maxSide]
 * @returns {Promise<string>}
 */
export function readScaledImage(file, maxSide = VENDOR_LOGO_MAX_SIDE) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The file is not an image this browser can read'));
      img.onload = () => {
        const { width, height } = fitWithin(img.width, img.height, maxSide);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('This browser cannot scale images'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
