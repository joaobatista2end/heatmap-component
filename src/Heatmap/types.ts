import type { Config, DataPoint } from "heatmap-ts"

export type HeatmapProps = {
    dataValue: DataPoint[],
    config?: Config,
    backgroundImage?: File | string
}

