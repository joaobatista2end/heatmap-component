import type { Config } from "heatmap-ts";

export const HEATMAP_DEFAULT_CONFIG: Config = {
  radius: 30,
  maxOpacity: 0.8,
  minOpacity: 0.3,
  blur: 0.85,
  gradient: {
    0.4: "blue",
    0.6: "cyan",
    0.8: "yellow",
    1.0: "red",
  },
}

// Configurações do Panzoom
export const PANZOOM_DEFAULT_CONFIG = {
  maxZoom: 4,
  minZoom: 0.5,
  bounds: true,
  boundsPadding: 0.1,
  smoothScroll: false,
  transformOrigin: { x: 0, y: 0 }
};

export const CURSOR_DEFAULT_STYLES = {
  default: 'grab',
  dragging: 'grabbing'
} as const;
