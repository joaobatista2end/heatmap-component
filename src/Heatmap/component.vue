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
      <div
        v-if="heatmapInstance"
        :class="['heatmap-overlay', { 'is-transforming': isTransforming }]"
      ></div>
    </div>

    <!-- Overlay para métricas de performance -->
    <div v-if="isDev" class="performance-metrics">
      <p>FPS: {{ fps }}</p>
      <p>Frame Time: {{ frameTime.toFixed(2) }}ms</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import HeatMap from "heatmap-ts";
import type { DataPoint } from "heatmap-ts";
import { onMounted, onUnmounted, ref, nextTick } from "vue";
import { CURSOR_DEFAULT_STYLES, HEATMAP_DEFAULT_CONFIG, PANZOOM_DEFAULT_CONFIG } from "./conts";
import type { HeatmapProps } from "./types";
import panzoom from "panzoom";
import "./styles.css";
import { useRequestAnimationFrame } from './composables/useRequestAnimationFrame';
import { usePerformanceMetrics } from './composables/usePerformanceMetrics';

// Props e Model
const props = withDefaults(defineProps<Omit<HeatmapProps, "dataValue">>(), {
  config: () => HEATMAP_DEFAULT_CONFIG,
  backgroundImage: null
});

const data = defineModel("data", {
  type: Array<DataPoint>,
  default: () => [],
});

// Refs e instâncias
const containerRef = ref<HTMLElement | null>(null);
const backgroundRef = ref<HTMLImageElement | null>(null);
let heatmapInstance: HeatMap | null = null;
let panzoomInstance: ReturnType<typeof panzoom> | null = null;

// Dimensões
const dimensions = ref({ width: 0, height: 0 });

const { schedule: scheduleRender } = useRequestAnimationFrame();

// Performance metrics
const isDev = import.meta.env.DEV;
const { fps, frameTime } = usePerformanceMetrics();

// Adiciona ref para controlar visibilidade
const isTransforming = ref(false);

// Handler para carregamento da imagem
const handleImageLoad = () => {
  if (backgroundRef.value) {
    const img = backgroundRef.value;
    dimensions.value = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };

    scheduleRender(() => {
      if (heatmapInstance) {
        const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
        if (container) {
          container.style.width = `${img.naturalWidth}px`;
          container.style.height = `${img.naturalHeight}px`;
        }
        heatmapInstance.renderer.setDimensions(img.naturalWidth, img.naturalHeight);
        updateHeatmapData();
      }
    });
  }
};

const updateHeatmapData = () => {
  if (!heatmapInstance) return;

  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  // Cache os dados normalizados para evitar recálculos
  const cachedData = data.value;

  scheduleRender(() => {
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

const setupPanzoom = (container: HTMLElement, canvas: HTMLElement) => {
  panzoomInstance = panzoom(container, PANZOOM_DEFAULT_CONFIG);

  let transformTimeout: number;
  let isActive = false;

  panzoomInstance.on('transform', () => {
    // Oculta o heatmap durante a transformação
    isTransforming.value = true;

    // Se já estiver em transformação, apenas atualiza o timeout
    if (isActive) {
      clearTimeout(transformTimeout);
    }

    isActive = true;

    // Agenda a atualização apenas quando parar de transformar
    transformTimeout = window.setTimeout(() => {
      if (heatmapInstance?.renderer && backgroundRef.value) {
        const { naturalWidth, naturalHeight } = backgroundRef.value;
        heatmapInstance.renderer.setDimensions(naturalWidth, naturalHeight);
        updateHeatmapData();
        isTransforming.value = false;
        isActive = false;
      }
    }, 150);
  });
};

const initHeatmap = () => {
  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  if (backgroundRef.value) {
    const { naturalWidth, naturalHeight } = backgroundRef.value;
    dimensions.value = { width: naturalWidth, height: naturalHeight };
  }

  heatmapInstance = new HeatMap({
    container,
    ...HEATMAP_DEFAULT_CONFIG,
    ...props.config,
    width: dimensions.value.width || 800, // Valor padrão caso não tenha imagem
    height: dimensions.value.height || 600
  });

  updateHeatmapData();

  nextTick(() => {
    const heatmapCanvas = container.querySelector('canvas');
    if (!heatmapCanvas) return;

    setupPanzoom(container, heatmapCanvas);
    setupCursorEvents(heatmapCanvas);
  });
};

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

