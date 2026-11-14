import { useState } from "react";
import { readPreferences, type Preferences } from "../lib/preferences";

export default function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [storageError, setStorageError] = useState("");
  function updatePreferences(next: Preferences) {
    setPreferences(next);
    try {
      localStorage.setItem("citirep-preferences", JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is unavailable. Changes apply only until this page is reloaded.",
      );
    }
  }
  return { preferences, updatePreferences, storageError };
}
