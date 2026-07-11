"use client";

import { useEffect, useRef, useState } from "react";

export default function usePresentationMode() {
  const [inactiveSeconds, setInactiveSeconds] = useState(0);

  const timer = useRef<number | null>(null);

  useEffect(() => {
    function resetTimer() {
      setInactiveSeconds(0);
    }

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "wheel",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    timer.current = window.setInterval(() => {
      setInactiveSeconds((current) => current + 1);
    }, 1000);

    return () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
      }

      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return {
    inactiveSeconds,
    isPresentation: inactiveSeconds >= 120,
    shouldReturnHome:
      inactiveSeconds >= 30 && inactiveSeconds < 120,
  };
}