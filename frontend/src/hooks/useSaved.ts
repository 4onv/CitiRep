import { useEffect, useState } from "react";

export default function useSaved() {
  const [saved, setSaved] = useState<number[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem("citirep-saved") || "[]");
      return Array.isArray(value)
        ? [
            ...new Set(
              value.filter(
                (id): id is number => Number.isSafeInteger(id) && id > 0,
              ),
            ),
          ]
        : [];
    } catch {
      return [];
    }
  });
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem("citirep-saved", JSON.stringify(saved));
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is unavailable. Saved items will be lost when this page is reloaded.",
      );
    }
  }, [saved]);
  const toggle = (id: number) =>
    setSaved((previous) => {
      const next = previous.includes(id)
        ? previous.filter((i) => i !== id)
        : [...previous, id];
      return next;
    });
  return { saved, toggle, storageError };
}
