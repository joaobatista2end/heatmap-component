<template>
  <div ref="containerRef" class="heatmap-container">
    <div id="heatmap" class="heatmap-content"></div>
  </div>
</template>

<script setup lang="ts">
import HeatMap from "heatmap-ts";
import type { DataPoint } from "heatmap-ts";
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from "vue";
import { HEATMAP_DEFAULT_CONFIG } from "./conts";
import type { HeatmapProps } from "./types";
import panzoom from "panzoom";
import "./styles.css";

// Configurações do Panzoom
const PANZOOM_CONFIG = {
  maxZoom: 4,
  minZoom: 0.5,
  bounds: true,
  boundsPadding: 0.1,
  smoothScroll: false,
  transformOrigin: { x: 0, y: 0 }
} as const;

// Configurações de cursor
const CURSOR_STYLES = {
  default: 'grab',
  dragging: 'grabbing'
} as const;

// Props e Model
const props = withDefaults(defineProps<Omit<HeatmapProps, "dataValue">>(), {
  config: () => HEATMAP_DEFAULT_CONFIG,
});

const data = defineModel("data", {
  type: Array<DataPoint>,
  default: () => [],
});

// Refs e instâncias
const containerRef = ref<HTMLElement | null>(null);
let heatmapInstance: HeatMap | null = null;
let panzoomInstance: ReturnType<typeof panzoom> | null = null;

// Computed values
const max = computed(() => Math.max(...data.value.map((d) => d.value)));
const min = computed(() => Math.min(...data.value.map((d) => d.value)));

// Métodos
const updateHeatmapData = () => {
  if (!heatmapInstance) return;

  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  heatmapInstance.setData({
    max: max.value,
    min: min.value,
    data: data.value
  });
};

const setupCursorEvents = (canvas: HTMLElement) => {
  canvas.style.cursor = CURSOR_STYLES.default;
  canvas.addEventListener('mousedown', () => {
    canvas.style.cursor = CURSOR_STYLES.dragging;
  });
  canvas.addEventListener('mouseup', () => {
    canvas.style.cursor = CURSOR_STYLES.default;
  });
};

const setupPanzoom = (container: HTMLElement, canvas: HTMLElement) => {
  panzoomInstance = panzoom(canvas, PANZOOM_CONFIG);

  let isTransforming = false;
  panzoomInstance.on('transform', () => {
    if (isTransforming) return;
    isTransforming = true;

    requestAnimationFrame(() => {
      if (heatmapInstance?.renderer) {
        heatmapInstance.renderer.setDimensions(
          container.offsetWidth,
          container.offsetHeight
        );
        updateHeatmapData();
      }
      isTransforming = false;
    });
  });
};

const initHeatmap = () => {
  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  heatmapInstance = new HeatMap({
    container,
    ...props.config,
  });

  updateHeatmapData();

  nextTick(() => {
    const heatmapCanvas = container.querySelector('canvas');
    if (!heatmapCanvas) return;

    setupPanzoom(container, heatmapCanvas);
    setupCursorEvents(heatmapCanvas);
  });
};

// Watchers
watch(data, updateHeatmapData, { deep: true });

// Lifecycle hooks
onMounted(() => {
  if (containerRef.value) {
    initHeatmap();
  }
});

onUnmounted(() => {
  if (panzoomInstance) {
    panzoomInstance.dispose();
  }
});
</script>

