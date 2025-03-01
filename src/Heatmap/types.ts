import type { Config as HeatmapConfig, DataPoint } from "heatmap-ts"

// Estender o tipo Config da biblioteca
export interface Config extends HeatmapConfig {
    useValueExtent?: boolean;
    valueExtent?: [number, number];
}

export interface HeatmapProps {
    config?: Config;
    backgroundImage?: string | null;
    devMode?: boolean;
    data: DataPoint[];
    radius: number;
    valueFilter: [number, number];
}

export interface RadiusControlProps {
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
}

export interface ValueFilterProps {
    modelValue: [number, number];
    min: number;
    max: number;
    step?: number;
    gradient: Record<string, string>;
}

export interface LegendProps {
    min: number;
    max: number;
    gradient: Record<string, string>;
}

