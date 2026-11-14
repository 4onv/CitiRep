import { useEffect, useState } from "react";
import { api, type Document } from "../api";

export default function useSavedDocuments(saved: number[]) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.allSettled(
      saved.map((id) =>
        api<Document>("/api/documents/" + id, { signal: controller.signal }),
      ),
    ).then((results) => {
      if (controller.signal.aborted) return;
      setDocs(
        results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
      );
      setFailed(results.filter((r) => r.status === "rejected").length);
      setLoading(false);
    });
    return () => controller.abort();
  }, [saved, attempt]);
  return { docs, loading, failed, retry: () => setAttempt((a) => a + 1) };
}
