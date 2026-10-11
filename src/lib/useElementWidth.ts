import { type RefObject, useLayoutEffect, useState } from 'react';

/**
 * The rendered width of an element in pixels, measured before the first paint
 * and kept current as the layout changes. Zero until it is known.
 */
export function useElementWidth(ref: RefObject<Element | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    // Missing where there is no layout engine, as in tests.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
