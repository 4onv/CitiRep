import { useEffect, useState } from "react";
import { api, type Document } from "../api";

export default function useDocument(id: number) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setDoc(null);
    setError("");
    if (!Number.isSafeInteger(id) || id < 1) {
      setError("Invalid document number.");
      return;
    }
    api<Document>("/api/documents/" + id, { signal: controller.signal })
      .then(setDoc)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [id]);
  return { doc, error, loading: !doc && !error };
}
