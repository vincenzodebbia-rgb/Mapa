// MapLibre needs real color values and may not parse oklch(): the tokens in globals.css are oklch.
// Paint the element's computed color on a 1×1 canvas and read it back as rgba, which every renderer accepts.
export function readCssColor(element: HTMLElement): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = getComputedStyle(element).color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${red}, ${green}, ${blue}, ${(alpha ?? 255) / 255})`;
}
