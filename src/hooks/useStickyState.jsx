// /src/hooks/useStickyState.js
import { useEffect, useRef, useState } from "react";

export default function useStickyState(key, initialValue) {
  const hasHydrated = useRef(false);
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!hasHydrated.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  // mark hydration complete after first paint
  useEffect(() => {
    hasHydrated.current = true;
  }, []);

  return [state, setState];
}
