import type { PhotoInput } from "./model";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function readPhoto(photo: PhotoInput, signal: AbortSignal): Promise<string> {
  if (signal.aborted) throw new Error("Photo selection cancelled.");
  if (!("base64" in photo) || !photo.base64) throw new Error("Could not read this photo.");

  const type = photo.mimeType ?? "image/jpeg";
  const bytes = Math.floor((photo.base64.length * 3) / 4);
  if (!TYPES.includes(type) || bytes === 0 || bytes > MAX_BYTES)
    throw new Error("Choose a JPG, PNG or WebP image under 5 MB.");

  return `data:${type};base64,${photo.base64}`;
}