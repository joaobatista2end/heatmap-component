import type { Config, DataPoint } from "heatmap-ts"

export interface HeatmapProps {
    config?: Record<string, any>;
    backgroundImage?: string | null;
    devMode?: boolean;
    data: DataPoint[];
}

