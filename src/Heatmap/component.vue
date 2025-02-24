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

// Handler para carregamento da imagem
const handleImageLoad = () => {
  if (backgroundRef.value) {
    const img = backgroundRef.value;
    dimensions.value = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };

    if (heatmapInstance) {
      const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
      if (container) {
        container.style.width = `${img.naturalWidth}px`;
        container.style.height = `${img.naturalHeight}px`;
      }
      heatmapInstance.renderer.setDimensions(img.naturalWidth, img.naturalHeight);
      updateHeatmapData();
    }
  }
};

const updateHeatmapData = () => {
  if (!heatmapInstance) return;

  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  heatmapInstance.setData({
    max: 100,
    min: 0,
    data: data.value // Usa os dados originais sem normalização
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

:deep(canvas) {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  transform-origin: 0 0 !important;
  width: 100% !important;
  height: 100% !important;
}
</style>

