import type { DataPoint } from "heatmap-ts";

export const normalizeData = (rawData: DataPoint[], imageDimensions?: { width: number, height: number }) => {
  if (!rawData.length || !imageDimensions) return rawData;

  const maxValue = Math.max(...rawData.map(p => p.value));

  // Apenas normaliza o valor, mantendo as coordenadas x,y originais
  return rawData.map(point => ({
    x: point.x,
    y: point.y,
    value: Math.floor((point.value / maxValue) * 100)
  }));
};
