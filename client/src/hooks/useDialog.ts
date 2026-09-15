import { useEffect } from "react";

/**
 * The three things every dialog on this site needs, in one place.
 *
 * Escape closes it, the page behind stops scrolling (otherwise a wheel over the
 * backdrop quietly scrolls the board you were reading), and the scrollbar's
 * width is compensated so locking does not shove the whole layout sideways.
 */
export function useDialog(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const { body } = document;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const overflow = body.style.overflow;
    const padding = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;

    return () => {
      body.style.overflow = overflow;
      body.style.paddingRight = padding;
    };
  }, []);
}
