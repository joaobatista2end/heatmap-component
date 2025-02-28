import type { Config, DataPoint } from "heatmap-ts"

export type HeatmapProps = {
    data: DataPoint[],
    config?: Config,
    devMode?: boolean,
    backgroundImage?: string | null
}

