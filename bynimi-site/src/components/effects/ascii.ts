// Shared by the ASCII effects (the home intro, the Our story header): a
// photo turned into one character per cell.

export const ASCII_RAMP = " .·:-=+*%#@";
export const ASCII_SCRAMBLE = "BNIMbn✦*+#%@";

/**
 * Samples `image` (object-fit: cover) into `cols` × `rows` cells, each
 * `cellAspect` times taller than wide, and returns each cell's brightness
 * (0 to 1, contrast stretched to use the whole ramp) and character.
 */
export function asciiCells(image: HTMLImageElement, cols: number, rows: number, cellAspect: number) {
  const sample = document.createElement("canvas");
  sample.width = cols;
  sample.height = rows;
  const ctx = sample.getContext("2d", { willReadFrequently: true })!;
  const scale = Math.max(cols / image.width, (rows * cellAspect) / image.height);
  const w = image.width * scale;
  const h = (image.height * scale) / cellAspect;
  ctx.drawImage(image, (cols - w) / 2, (rows - h) / 2, w, h);
  const pixels = ctx.getImageData(0, 0, cols, rows).data;

  const lums = new Float32Array(cols * rows);
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < lums.length; i++) {
    const lum = (0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2]) / 255;
    lums[i] = lum;
    lo = Math.min(lo, lum);
    hi = Math.max(hi, lum);
  }
  const glyphs: string[] = [];
  for (let i = 0; i < lums.length; i++) {
    lums[i] = (lums[i] - lo) / Math.max(hi - lo, 0.01);
    glyphs.push(ASCII_RAMP[Math.min(ASCII_RAMP.length - 1, Math.floor(lums[i] * ASCII_RAMP.length))]);
  }
  return { lums, glyphs };
}
