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
import "./style.css";

const props = withDefaults(defineProps<Omit<HeatmapProps, "dataValue">>(), {
  config: () => HEATMAP_DEFAULT_CONFIG,
});

const data = defineModel("data", {
  type: Array<DataPoint>,
  default: () => [],
});

const max = computed(() => Math.max(...data.value.map((d) => d.value)));
const min = computed(() => Math.min(...data.value.map((d) => d.value)));

const containerRef = ref<HTMLElement | null>(null);
let heatmapInstance: HeatMap | null = null;
let panzoomInstance: ReturnType<typeof panzoom> | null = null;

const initHeatmap = () => {
  const container = containerRef.value?.querySelector('#heatmap');
  if (!container) return;

  // Inicializa o heatmap
  heatmapInstance = new HeatMap({
    container,
    ...props.config,
  });

  // Define os dados iniciais
  updateHeatmapData();

  // Aguarda a criação do canvas pelo heatmap
  nextTick(() => {
    const heatmapCanvas = container.querySelector('canvas');
    if (!heatmapCanvas) return;

    // Configura o panzoom no canvas do heatmap
    panzoomInstance = panzoom(heatmapCanvas, {
      maxZoom: 4,
      minZoom: 0.5,
      bounds: true,
      boundsPadding: 0.1,
      smoothScroll: true,
      transformOrigin: { x: 0, y: 0 },
    });

    // Atualiza o heatmap quando o zoom muda
    panzoomInstance.on('transform', () => {
      if (!heatmapInstance || !container) return;

      const { scale } = panzoomInstance!.getTransform();
      if (heatmapInstance.renderer) {
        const containerElement = container as HTMLElement;
        const width = containerElement.offsetWidth * scale;
        const height = containerElement.offsetHeight * scale;
        heatmapInstance.renderer.setDimensions(width, height);
        updateHeatmapData();
      }
    });

    // Ajusta o estilo do canvas para interação
    heatmapCanvas.style.cursor = 'grab';
    heatmapCanvas.addEventListener('mousedown', () => {
      heatmapCanvas.style.cursor = 'grabbing';
    });
    heatmapCanvas.addEventListener('mouseup', () => {
      heatmapCanvas.style.cursor = 'grab';
    });
  });
};

const updateHeatmapData = () => {
  if (!heatmapInstance) return;

  heatmapInstance.setData({
    max: max.value,
    min: min.value,
    data: data.value,
  });
};

// Watch para atualizar os dados quando mudarem
watch(data, () => {
  updateHeatmapData();
}, { deep: true });

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
  width: 100%;
  height: 100%;
  position: relative;
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
  overflow: hidden;
}

.heatmap-content {
  width: 100%;
  height: 100%;
  position: relative;
}

#heatmap {
  width: 100%;
  height: 100%;
  position: relative;
}

:deep(canvas) {
  transform-origin: 0 0 !important;
}
</style>

