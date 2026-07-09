"use client";

import { useEffect, useRef, useState } from "react";

export default function usePresentationMode() {
  const [inactiveSeconds, setInactiveSeconds] = useState(0);

  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function resetTimer() {
      setInactiveSeconds(0);
    }

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("wheel", resetTimer);

    timer.current = setInterval(() => {
      setInactiveSeconds((current) => current + 1);
    }, 1000);

    return () => {
      if (timer.current) clearInterval(timer.current);

      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("wheel", resetTimer);
    };
  }, []);

  return {
    inactiveSeconds,
    isPresentation: inactiveSeconds >= 120,
    shouldReturnHome: inactiveSeconds >= 30,
  };
}