import { useEffect } from "https://esm.sh/react@18.2.0";

export function useScrollReveal(selector = ".reveal") {
  useEffect(() => {
    const nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;
    const reducedMotion = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;

    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [selector]);
}

