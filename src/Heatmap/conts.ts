import type { Config } from "heatmap-ts";

export const HEATMAP_DEFAULT_CONFIG: Config = {
  radius: 220,
  maxOpacity: 0.6,
  minOpacity: 0.1,
  blur: 0.75,
  gradient: {
    0.4: "blue",
    0.6: "cyan",
    0.8: "yellow",
    1.0: "red",
  },
};

// Configurações do Panzoom
export const PANZOOM_DEFAULT_CONFIG = {
  maxZoom: 4,
  minZoom: 0.1,
  bounds: true,
  boundsPadding: 0.5,
  smoothScroll: false,
  transformOrigin: { x: 0, y: 0 },
  zoomSpeed: 0.065,
};

export const CURSOR_DEFAULT_STYLES = {
  default: 'grab',
  dragging: 'grabbing'
} as const;
