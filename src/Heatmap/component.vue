<template>
  <div ref="containerRef" class="heatmap-container">
    <div id="heatmap" class="heatmap-content">
      <img
        v-if="backgroundImage"
        :src="backgroundImage"
        alt="Background"
        class="heatmap-background"
        ref="backgroundRef"
        @load="handleImageLoad"
      />
    </div>

    <div v-if="devMode" class="performance-metrics">
      <p>FPS: {{ fps }}</p>
      <p>Frame Time: {{ frameTime.toFixed(2) }}ms</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import HeatMap from "heatmap-ts";
import type { DataPoint } from "heatmap-ts";
import {  onUnmounted, ref, nextTick } from "vue";
import { CURSOR_DEFAULT_STYLES, HEATMAP_DEFAULT_CONFIG, PANZOOM_DEFAULT_CONFIG } from "./conts";
import type { HeatmapProps } from "./types";
import panzoom from "panzoom";
import "./styles.css";
import { usePerformanceMetrics } from './composables/usePerformanceMetrics';

const props = withDefaults(defineProps<Omit<HeatmapProps, "dataValue">>(), {
  config: () => HEATMAP_DEFAULT_CONFIG,
  backgroundImage: null,
  devMode: true
});

const data = defineModel("data", {
  type: Array<DataPoint>,
  default: () => [],
});

const containerRef = ref<HTMLElement | null>(null);
const backgroundRef = ref<HTMLImageElement | null>(null);
let heatmapInstance: HeatMap | null = null;
let panzoomInstance: ReturnType<typeof panzoom> | null = null;

const dimensions = ref({ width: 0, height: 0 });

const { fps, frameTime } = usePerformanceMetrics();

const handleImageLoad = () => {
  if (backgroundRef.value) {
    const img = backgroundRef.value;
    const { naturalWidth, naturalHeight } = img;

    dimensions.value = {
      width: naturalWidth,
      height: naturalHeight
    };

    initHeatmap();
  }
};

const updateHeatmapData = () => {
  if (!heatmapInstance) return;

  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  const cachedData = data.value;

  requestAnimationFrame(() => {
    heatmapInstance!.setData({
      max: 100,
      min: 0,
      data: cachedData
    });
  });
};

const setupCursorEvents = (canvas: HTMLElement) => {
  canvas.style.cursor = CURSOR_DEFAULT_STYLES.default;
  canvas.addEventListener('mousedown', () => {
    canvas.style.cursor = CURSOR_DEFAULT_STYLES.dragging;
  });
  canvas.addEventListener('mouseup', () => {
    canvas.style.cursor = CURSOR_DEFAULT_STYLES.default;
  });
};

const setupPanzoom = (container: HTMLElement) => {
  const containerRect = container.getBoundingClientRect();
  const scaleX = containerRect.width / dimensions.value.width;
  const scaleY = containerRect.height / dimensions.value.height;
  const initialScale = Math.min(scaleX, scaleY);

  panzoomInstance = panzoom(container, {
    ...PANZOOM_DEFAULT_CONFIG,
    minZoom: initialScale * 0.1,
    maxZoom: initialScale * 4,
    bounds: false,
    boundsPadding: 1
  });

  const centerX = (containerRect.width - dimensions.value.width * initialScale) / 2;
  const centerY = (containerRect.height - dimensions.value.height * initialScale) / 2;

  container.style.transform = `translate(${centerX}px, ${centerY}px) scale(${initialScale})`;

  panzoomInstance.on('transform', (e) => {
    const transform = panzoomInstance!.getTransform();

    if (container && heatmapInstance?.renderer.canvas) {
      const matrix = `matrix(${transform.scale}, 0, 0, ${transform.scale}, ${transform.x}, ${transform.y})`;
      container.style.transform = matrix;
      heatmapInstance.renderer.canvas.style.transform = 'none';
    }
  });

  panzoomInstance.on('panend zoomend', () => panzoomInstance!.getTransform());
};

const initHeatmap = () => {
  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  container.style.width = `${dimensions.value.width}px`;
  container.style.height = `${dimensions.value.height}px`;

  heatmapInstance = new HeatMap({
    container,
    ...HEATMAP_DEFAULT_CONFIG,
    ...props.config,
    width: dimensions.value.width,
    height: dimensions.value.height
  });

  updateHeatmapData();

  nextTick(() => {
    const heatmapCanvas = container.querySelector('canvas');
    if (!heatmapCanvas) return;

    setupPanzoom(container);
    setupCursorEvents(heatmapCanvas);
  });
};


onUnmounted(() => {
  if (panzoomInstance) {
    panzoomInstance.dispose();
  }
});
</script>
