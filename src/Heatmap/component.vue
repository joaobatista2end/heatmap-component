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

// Watch para atualizar os dados quando mudarem
watch(data, () => {
  updateHeatmapData();
}, { deep: true });

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

    panzoomInstance = panzoom(heatmapCanvas, {
      maxZoom: 4,
      minZoom: 0.5,
      bounds: true,
      boundsPadding: 0.1,
      smoothScroll: false,
      transformOrigin: { x: 0, y: 0 },
    });

    let isTransforming = false;
    panzoomInstance.on('transform', () => {
      if (isTransforming) return;
      isTransforming = true;

      requestAnimationFrame(() => {
        if (heatmapInstance?.renderer) {
          const { scale } = panzoomInstance!.getTransform();
          heatmapInstance.renderer.setDimensions(
            container.offsetWidth,
            container.offsetHeight
          );
          updateHeatmapData();
        }
        isTransforming = false;
      });
    });

    heatmapCanvas.style.cursor = 'grab';
    heatmapCanvas.addEventListener('mousedown', () => {
      heatmapCanvas.style.cursor = 'grabbing';
    });
    heatmapCanvas.addEventListener('mouseup', () => {
      heatmapCanvas.style.cursor = 'grab';
    });
  });
};

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
  overflow: hidden;
}

:deep(canvas) {
  transform-origin: 0 0 !important;
  position: absolute;
  top: 0;
  left: 0;
}
</style>

