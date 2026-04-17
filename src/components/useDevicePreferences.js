import React from "https://esm.sh/react@18.2.0";

function bindMediaQuery(mediaQuery, update) {
  if (!mediaQuery) {
    return () => {};
  }

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }

  mediaQuery.addListener(update);
  return () => mediaQuery.removeListener(update);
}

export function useDevicePreferences() {
  const [state, setState] = React.useState({
    isMobile: false,
    prefersReducedMotion: false,
    saveData: false,
  });

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const connection = navigator.connection;

    const update = () => {
      setState({
        isMobile: mobileQuery.matches,
        prefersReducedMotion: reducedMotionQuery.matches,
        saveData: Boolean(connection?.saveData),
      });
    };

    update();

    const unbindMobile = bindMediaQuery(mobileQuery, update);
    const unbindReducedMotion = bindMediaQuery(reducedMotionQuery, update);

    if (connection && typeof connection.addEventListener === "function") {
      connection.addEventListener("change", update);
    }

    return () => {
      unbindMobile();
      unbindReducedMotion();

      if (connection && typeof connection.removeEventListener === "function") {
        connection.removeEventListener("change", update);
      }
    };
  }, []);

  return state;
}
