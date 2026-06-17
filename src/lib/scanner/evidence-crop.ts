import type { BoundingBox, ScanViewport } from "./types";

const CLIP_PADDING = 32;
const MAX_CLIP_WIDTH = 720;
const MAX_CLIP_HEIGHT = 520;

export interface ImageSize {
  width: number;
  height: number;
}

export function buildEvidenceClip(
  box: BoundingBox,
  viewport: Pick<ScanViewport, "width" | "height">
): BoundingBox {
  const x = Math.max(0, Math.floor(box.x - CLIP_PADDING));
  const y = Math.max(0, Math.floor(box.y - CLIP_PADDING));
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width + CLIP_PADDING));
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + CLIP_PADDING));
  return {
    x,
    y,
    width: Math.max(1, Math.min(MAX_CLIP_WIDTH, right - x)),
    height: Math.max(1, Math.min(MAX_CLIP_HEIGHT, bottom - y)),
  };
}

/** Crop a stored context screenshot down to the highlighted issue element. */
export function calculateEvidenceCrop(
  image: ImageSize,
  box: BoundingBox | null,
  viewport: Pick<ScanViewport, "width" | "height"> | null
): BoundingBox {
  const fullImage = { x: 0, y: 0, width: image.width, height: image.height };
  if (!validSize(image) || !box || !viewport || !validBox(box) || !validSize(viewport)) {
    return fullImage;
  }

  // Locator screenshots already contain only the element and need no crop.
  if (approximately(image.width, box.width) && approximately(image.height, box.height)) {
    return fullImage;
  }

  const clip = buildEvidenceClip(box, viewport);
  const scaleX = image.width / clip.width;
  const scaleY = image.height / clip.height;
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return fullImage;
  if (Math.abs(scaleX - scaleY) / Math.max(scaleX, scaleY) > 0.08) return fullImage;

  const left = Math.max(box.x, clip.x);
  const top = Math.max(box.y, clip.y);
  const right = Math.min(box.x + box.width, clip.x + clip.width);
  const bottom = Math.min(box.y + box.height, clip.y + clip.height);
  if (right <= left || bottom <= top) return fullImage;

  return {
    x: clamp((left - clip.x) * scaleX, 0, image.width),
    y: clamp((top - clip.y) * scaleY, 0, image.height),
    width: clamp((right - left) * scaleX, 1, image.width),
    height: clamp((bottom - top) * scaleY, 1, image.height),
  };
}

function validSize(value: ImageSize): boolean {
  return Number.isFinite(value.width) && value.width > 0 && Number.isFinite(value.height) && value.height > 0;
}

function validBox(value: BoundingBox): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && validSize(value);
}

function approximately(a: number, b: number): boolean {
  return Math.abs(a - b) <= 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
