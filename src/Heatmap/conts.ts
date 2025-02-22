import type { Config } from "heatmap-ts";

export const HEATMAP_DEFAULT_CONFIG: Config = {
    radius: 200,
    maxOpacity: 0.8,
    minOpacity: 0,
    blur: 0.75,
    gradient: {
      0.1: 'blue',
      0.2: 'green',
      0.4: 'yellow',
      0.6: 'orange',
      0.8: 'red',
      1.0: 'white'
    },
    height: 10000,
    width: 10000,
  }
