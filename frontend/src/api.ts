import { PUBLIC_DEMO, demoApi } from "./demo";
export type {
  Related,
  Document,
  Results,
  Revision,
  UploadPreview,
} from "./types/api";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (PUBLIC_DEMO) return demoApi<T>(path, init);
  const response = await fetch(path, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = typeof data.detail === "string" ? data.detail : message;
    } catch {
      /* retain HTTP status */
    }
    throw new Error(message);
  }
  return response.json();
}
export const date = (value?: string | null) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not provided";
