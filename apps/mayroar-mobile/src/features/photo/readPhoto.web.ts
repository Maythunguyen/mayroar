import type { PhotoInput } from "./model";

export function readPhoto(file: PhotoInput, signal: AbortSignal): Promise<string> {
  if (!(file instanceof File)) throw new Error("Could not read this photo.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG or WebP image under 5 MB.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cancel = () => {
      reader.abort();
      reject(new Error("Photo selection cancelled."));
    };
    if (signal.aborted) return cancel();
    signal.addEventListener("abort", cancel, { once: true });
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this photo."));
    reader.onloadend = () => signal.removeEventListener("abort", cancel);
    reader.readAsDataURL(file);
  });
}
