import { useEffect, useState } from "react";

export default function useHashRoute() {
  const [route, setRoute] = useState(
    () => window.location.hash.slice(1) || "/",
  );
  useEffect(() => {
    const change = () => {
      setRoute(window.location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const question = route.indexOf("?");
  return {
    route,
    path: question < 0 ? route : route.slice(0, question),
    query: question < 0 ? "" : route.slice(question + 1),
  };
}
