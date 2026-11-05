// MapLibre ha bisogno di colori veri e può non capire oklch(): i token in globals.css sono oklch.
// Si dipinge il colore calcolato dell'elemento su un canvas 1×1 e lo si rilegge come rgba, che ogni renderer accetta.
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
