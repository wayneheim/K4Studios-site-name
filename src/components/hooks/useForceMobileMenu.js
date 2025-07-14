import { useEffect } from "react";

export default function useForceMobileMenu(active) {
  useEffect(() => {
    if (active) {
      document.body.classList.add("force-mobile-menu");
    } else {
      document.body.classList.remove("force-mobile-menu");
    }

    return () => {
      document.body.classList.remove("force-mobile-menu");
    };
  }, [active]);
}