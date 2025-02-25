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
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from "vue";
import { CURSOR_DEFAULT_STYLES, HEATMAP_DEFAULT_CONFIG, PANZOOM_DEFAULT_CONFIG } from "./conts";
import type { HeatmapProps } from "./types";
import panzoom from "panzoom";
import "./styles.css";
import { normalizeData } from "./utils";
import { useRequestAnimationFrame } from './composables/useRequestAnimationFrame';
import { usePerformanceMetrics } from './composables/usePerformanceMetrics';
import { useThrottle } from './composables/useThrottle';

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

// Computed para dados normalizados
const normalizedData = computed(() => {
  if (!dimensions.value.width || !dimensions.value.height) return data.value;

  return normalizeData(data.value, dimensions.value);
});

const { schedule: scheduleRender } = useRequestAnimationFrame();

// Performance metrics
const isDev = process.env.NODE_ENV === 'development';
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

  panzoomInstance.on('transform', () => {
    // Oculta o heatmap durante a transformação
    isTransforming.value = true;

    // Limpa o timeout anterior se existir
    if (transformTimeout) {
      clearTimeout(transformTimeout);
    }

    // Agenda a atualização e exibição do heatmap
    transformTimeout = window.setTimeout(() => {
      if (heatmapInstance?.renderer && backgroundRef.value) {
        const { naturalWidth, naturalHeight } = backgroundRef.value;
        heatmapInstance.renderer.setDimensions(naturalWidth, naturalHeight);
        updateHeatmapData();
        isTransforming.value = false;
      }
    }, 150); // Delay para aguardar o fim da transformação
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

<style scoped>
.heatmap-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.heatmap-content {
  position: relative;
  min-width: 100%;
  min-height: 100%;
}

.heatmap-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
}

.heatmap-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.heatmap-overlay.is-transforming {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.6);
}

:deep(canvas) {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  transform-origin: 0 0 !important;
  width: 100% !important;
  height: 100% !important;
  will-change: transform; /* Otimiza transformações */
  backface-visibility: hidden; /* Melhora performance */
}

.performance-metrics {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  z-index: 1000;
}
</style>

