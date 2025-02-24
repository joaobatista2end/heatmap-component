import type { DataPoint } from "heatmap-ts";

export const normalizeData = (rawData: DataPoint[], targetSize: number = 1200) => {
  if (!rawData.length) return rawData;

  const maxX = Math.max(...rawData.map(p => p.x));
  const maxY = Math.max(...rawData.map(p => p.y));
  const maxValue = Math.max(...rawData.map(p => p.value));

  const scaleX = targetSize / maxX;
  const scaleY = targetSize / maxY;

  return rawData.map(point => ({
    x: Math.floor(point.x * scaleX),
    y: Math.floor(point.y * scaleY),
    value: Math.floor((point.value / maxValue) * 100)
  }));
};
