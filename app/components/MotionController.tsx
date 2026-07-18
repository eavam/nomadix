"use client";

import { useEffect } from "react";

const PARALLAX_QUERY = "(hover: hover) and (pointer: fine)";

export default function MotionController() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const cleanupCallbacks: Array<() => void> = [];

    root.classList.add("motion-enhanced");

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8%", threshold: 0.12 },
      );

      revealTargets.forEach((target) => revealObserver.observe(target));
      cleanupCallbacks.push(() => revealObserver.disconnect());
    }

    const progress = document.querySelector<HTMLElement>(".scroll-progress");
    let progressFrame = 0;

    const updateProgress = () => {
      progressFrame = 0;
      if (!progress) return;
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const value = Math.min(1, Math.max(0, window.scrollY / scrollable));
      progress.style.transform = `scaleX(${value})`;
    };

    const requestProgressUpdate = () => {
      if (progressFrame) return;
      progressFrame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate);
    cleanupCallbacks.push(() => {
      window.removeEventListener("scroll", requestProgressUpdate);
      window.removeEventListener("resize", requestProgressUpdate);
      window.cancelAnimationFrame(progressFrame);
    });

    if (!reducedMotion && window.matchMedia(PARALLAX_QUERY).matches) {
      document.querySelectorAll<HTMLElement>("[data-parallax-card]").forEach((card) => {
        let pointerFrame = 0;
        let pointerX = 0;
        let pointerY = 0;

        const renderPointer = () => {
          pointerFrame = 0;
          card.style.setProperty("--parallax-x", `${(pointerX * 10).toFixed(2)}px`);
          card.style.setProperty("--parallax-y", `${(pointerY * 8).toFixed(2)}px`);
          card.style.setProperty("--parallax-rotate", `${(pointerX * 1.35).toFixed(2)}deg`);
          card.style.setProperty("--parallax-x-reverse", `${(-pointerX * 6).toFixed(2)}px`);
          card.style.setProperty("--parallax-y-reverse", `${(-pointerY * 5).toFixed(2)}px`);
        };

        const handlePointerMove = (event: PointerEvent) => {
          const bounds = card.getBoundingClientRect();
          pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
          pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
          if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
        };

        const resetPointer = () => {
          pointerX = 0;
          pointerY = 0;
          if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
        };

        card.addEventListener("pointermove", handlePointerMove);
        card.addEventListener("pointerleave", resetPointer);
        cleanupCallbacks.push(() => {
          card.removeEventListener("pointermove", handlePointerMove);
          card.removeEventListener("pointerleave", resetPointer);
          window.cancelAnimationFrame(pointerFrame);
        });
      });
    }

    return () => {
      cleanupCallbacks.forEach((cleanup) => cleanup());
      root.classList.remove("motion-enhanced");
    };
  }, []);

  return null;
}
