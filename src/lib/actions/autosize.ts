// Grows a textarea with its text where CSS `field-sizing` is missing
// (Firefox). Elsewhere the CSS does it and this does nothing.

export const fieldSizing = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

export function autosize(el: HTMLTextAreaElement) {
  if (fieldSizing) return;
  const fit = () => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  fit();
  el.addEventListener("input", fit);
  const ro = new ResizeObserver(fit);
  if (el.parentElement) ro.observe(el.parentElement);
  return {
    update: fit,
    destroy() {
      el.removeEventListener("input", fit);
      ro.disconnect();
    },
  };
}
