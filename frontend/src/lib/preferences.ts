export type Preferences = {
  home: string;
  work: string;
  topics: string[];
  largeText: boolean;
};
export const defaultPreferences: Preferences = {
  home: "",
  work: "",
  topics: [],
  largeText: false,
};
export function readPreferences(): Preferences {
  try {
    const value = JSON.parse(
      localStorage.getItem("citirep-preferences") || "{}",
    );
    return {
      home: typeof value.home === "string" ? value.home.slice(0, 200) : "",
      work: typeof value.work === "string" ? value.work.slice(0, 200) : "",
      topics: Array.isArray(value.topics)
        ? value.topics.filter(
            (t: unknown): t is string => typeof t === "string",
          )
        : [],
      largeText: value.largeText === true,
    };
  } catch {
    return { ...defaultPreferences };
  }
}
