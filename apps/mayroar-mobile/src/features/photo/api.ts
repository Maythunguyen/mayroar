import { api } from "../../data/apiClient";
import { parseEstimate } from "./model";
export async function analysePhoto(image: string, notes: string, signal: AbortSignal) {
  return parseEstimate(await api.request<unknown>("/analyse-food", {
    method: "POST", body: JSON.stringify({ image, notes }), signal,
  }));
}
