/// <reference types="vite/client" />
import type { Document } from "./types/api";

export const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === "true";
type IndexedDocument = Document & { search_text: string };
let catalog: Promise<IndexedDocument[]> | undefined;
const json = async (file: string) => {
  const response = await fetch(`${import.meta.env.BASE_URL}demo-data/${file}.json`);
  if (!response.ok) throw new Error("Record not included in this demo snapshot.");
  return response.json();
};
const synonyms: Record<string, string[]> = {
  bike: ["bike", "bicycle", "cycling"], bikes: ["bike", "bicycle", "cycling"],
  rent: ["rent", "rental", "tenant"], apartment: ["apartment", "residential"],
  construction: ["construction", "development"], trees: ["tree", "forest"],
  garbage: ["garbage", "waste"], loud: ["loud", "noise"],
};
const stop = new Set("a an the is are of in on at to for and or what where how can i my near about with me".split(" "));

export async function demoApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (init?.method && init.method !== "GET") throw new Error("Uploads are disabled in this public browsing demo.");
  const url = new URL(path, "https://citirep.invalid");
  let result: unknown;
  if (url.pathname === "/api/facets") result = await json("facets");
  else if (/^\/api\/documents\/\d+(?:\/revisions(?:\/\d+)?)?$/.test(url.pathname)) {
    result = await json(url.pathname.replace("/api/", ""));
  } else if (url.pathname === "/api/search") {
    catalog ??= json("index").catch((error) => { catalog = undefined; throw error; });
    const records = await catalog!;
    const p = url.searchParams;
    const terms = (p.get("q")?.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(t => !stop.has(t));
    const groups = terms.map(t => synonyms[t] || [t]);
    const location = (p.get("location") || "").toLowerCase().trim();
    const limit = Math.min(100, Math.max(1, Number(p.get("limit")) || 20));
    const offset = Math.max(0, Number(p.get("offset")) || 0);
    const matches = records.flatMap(record => {
      if (["kind", "provenance"].some(k => p.get(k) && record[k as "kind" | "provenance"] !== p.get(k))) return [];
      if (p.get("tag") && !record.tags.includes(p.get("tag")!)) return [];
      const title = record.title.toLowerCase();
      const text = record.search_text.toLowerCase();
      const metadata = `${title} ${record.tags.join(" ")} ${record.locations.join(" ")}`.toLowerCase();
      if (location && !`${record.locations.join(" ")} ${text}`.toLowerCase().includes(location)) return [];
      if (groups.some(group => !group.some(t => `${metadata} ${text}`.includes(t)))) return [];
      if (p.get("q")?.trim() && !terms.length) return [];
      const score = groups.reduce((n, g) => n + (g.some(t => title.includes(t)) ? 30 : 0) + (g.some(t => record.tags.includes(t)) ? 8 : 0), 0);
      return [{ record, score }];
    }).sort((a, b) => b.score - a.score || (b.record.published_at || b.record.updated_at).localeCompare(a.record.published_at || a.record.updated_at) || a.record.id - b.record.id);
    result = {
      total: matches.length, limit, offset,
      items: matches.slice(offset, offset + limit).map(({ record }) => {
        const { search_text, ...item } = record;
        const positions = groups.flat().map(t => search_text.toLowerCase().indexOf(t)).filter(i => i >= 0);
        const start = positions.length ? Math.max(0, Math.min(...positions) - 70) : 0;
        const excerpt = terms.length ? `${start ? "… " : ""}${search_text.slice(start, start + 330)}${search_text.length > start + 330 ? " …" : ""}` : item.description;
        return { ...item, excerpt };
      }),
    };
  } else throw new Error("This feature needs the full backend. It is not available in the browsing demo.");
  if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return result as T;
}
