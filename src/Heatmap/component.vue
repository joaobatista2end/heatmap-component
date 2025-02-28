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
import type { DataPoint } from "heatmap-ts";
import { onMounted, onUnmounted, watch, ref } from "vue";
import { HEATMAP_DEFAULT_CONFIG } from "./conts";
import type { HeatmapProps } from "./types";
import "./styles.css";
import { usePerformanceMetrics } from "./composables/usePerformanceMetrics";
import HeatMap from "heatmap-ts";
import panzoom from "panzoom";
import { CURSOR_DEFAULT_STYLES, PANZOOM_DEFAULT_CONFIG } from "./conts";

const props = withDefaults(defineProps<Omit<HeatmapProps, "dataValue">>(), {
  config: () => HEATMAP_DEFAULT_CONFIG,
  backgroundImage: null,
  devMode: true,
});

const data = defineModel("data", {
  type: Array<DataPoint>,
  default: () => [],
});

const { fps, frameTime } = usePerformanceMetrics();

// Refs
const containerRef = ref<HTMLElement | null>(null);
const backgroundRef = ref<HTMLImageElement | null>(null);
const heatmapInstance = ref<HeatMap | null>(null);
const panzoomInstance = ref<ReturnType<typeof panzoom> | null>(null);
const dimensions = ref({ width: 0, height: 0 });
const isInitialized = ref(false);

// Função para inicializar o heatmap
const initHeatmap = () => {
  if (!containerRef.value) return;

  // Limpar qualquer instância existente
  cleanupHeatmap();

  const heatmapContainer = containerRef.value.querySelector('#heatmap') as HTMLElement;
  if (!heatmapContainer) return;

  // Configurar o container
  heatmapContainer.style.width = `${dimensions.value.width}px`;
  heatmapContainer.style.height = `${dimensions.value.height}px`;

  // Criar nova instância
  heatmapInstance.value = new HeatMap({
    container: heatmapContainer,
    ...HEATMAP_DEFAULT_CONFIG,
    ...props.config,
    width: dimensions.value.width,
    height: dimensions.value.height
  });

  // Definir dados
  heatmapInstance.value.setData({
    max: 100,
    min: 0,
    data: data.value
  });

  // Configurar panzoom
  setupPanzoom(heatmapContainer);

  isInitialized.value = true;
};

// Configurar panzoom
const setupPanzoom = (container: HTMLElement) => {
  if (panzoomInstance.value) {
    panzoomInstance.value.dispose();
  }

  const containerRect = container.getBoundingClientRect();
  const scaleX = containerRect.width / dimensions.value.width;
  const scaleY = containerRect.height / dimensions.value.height;
  const initialScale = Math.min(scaleX, scaleY);

  panzoomInstance.value = panzoom(container, {
    ...PANZOOM_DEFAULT_CONFIG,
    minZoom: initialScale * 0.1,
    maxZoom: initialScale * 4,
    bounds: false,
    boundsPadding: 1
  });

  // Centralizar
  const centerX = (containerRect.width - dimensions.value.width * initialScale) / 2;
  const centerY = (containerRect.height - dimensions.value.height * initialScale) / 2;
  container.style.transform = `translate(${centerX}px, ${centerY}px) scale(${initialScale})`;

  // Configurar eventos
  panzoomInstance.value.on('transform', (e) => {
    const transform = panzoomInstance.value!.getTransform();
    if (container && heatmapInstance.value?.renderer.canvas) {
      const matrix = `matrix(${transform.scale}, 0, 0, ${transform.scale}, ${transform.x}, ${transform.y})`;
      container.style.transform = matrix;
      heatmapInstance.value.renderer.canvas.style.transform = 'none';
    }
  });
};

// Limpar heatmap
const cleanupHeatmap = () => {
  if (panzoomInstance.value) {
    panzoomInstance.value.dispose();
    panzoomInstance.value = null;
  }

  if (heatmapInstance.value) {
    // Limpar dados
    heatmapInstance.value.setData({
      max: 0,
      min: 0,
      data: []
    });
    heatmapInstance.value = null;
  }

  // Limpar o container
  if (containerRef.value) {
    const heatmapContainer = containerRef.value.querySelector('#heatmap');
    if (heatmapContainer) {
      // Remover todos os canvas
      const canvases = heatmapContainer.querySelectorAll('canvas');
      canvases.forEach(canvas => canvas.remove());

      // Manter apenas a imagem de fundo
      const content = Array.from(heatmapContainer.children).filter(
        child => child.tagName === 'IMG'
      );
      heatmapContainer.innerHTML = '';
      content.forEach(child => heatmapContainer.appendChild(child));
    }
  }
};

// Handler para carregamento da imagem
const handleImageLoad = () => {
  if (backgroundRef.value) {
    const img = backgroundRef.value;
    dimensions.value = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };

    initHeatmap();
  }
};

// Observar mudanças nos dados
watch(data, () => {
  if (isInitialized.value) {
    initHeatmap(); // Recriar completamente o heatmap quando os dados mudarem
  }
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  // Inicialização será feita após o carregamento da imagem
});

onUnmounted(() => {
  cleanupHeatmap();
});
</script>
