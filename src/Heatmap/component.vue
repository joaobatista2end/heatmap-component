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

    <!-- Área de logs -->
    <div class="event-logs">
      <div class="logs-header">
        <h4>Event Logs</h4>
        <button class="clear-logs-btn" @click="clearLogs">Clear</button>
      </div>
      <div class="logs-content">
        <div v-for="(log, index) in eventLogs" :key="index" class="log-item">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
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

// Adiciona ref para logs
const eventLogs = ref<Array<{ time: string, message: string }>>([]);

// Função para adicionar logs
const addLog = (message: string) => {
  const time = new Date().toLocaleTimeString();
  eventLogs.value.unshift({ time, message });

  // Mantém apenas os últimos 10 logs
  if (eventLogs.value.length > 10) {
    eventLogs.value.pop();
  }
};

// Função para limpar logs
const clearLogs = () => {
  eventLogs.value = [];
};

// Handler para carregamento da imagem
const handleImageLoad = () => {
  addLog('Image loaded');
  if (backgroundRef.value) {
    const img = backgroundRef.value;
    const { naturalWidth, naturalHeight } = img;

    dimensions.value = {
      width: naturalWidth,
      height: naturalHeight
    };

    addLog(`Image dimensions: ${naturalWidth}x${naturalHeight}`);

    // Inicializa o heatmap após carregar a imagem
    initHeatmap();
  }
};

const updateHeatmapData = () => {
  if (!heatmapInstance) return;

  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  addLog('Updating heatmap data');
  const cachedData = data.value;

  // Usa requestAnimationFrame diretamente para o update do heatmap
  requestAnimationFrame(() => {
    heatmapInstance!.setData({
      max: 100,
      min: 0,
      data: cachedData
    });
    addLog(`Heatmap rendered with ${cachedData.length} points`);
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
  // Calcula a escala inicial baseada nas dimensões da imagem e do container
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

  // Centraliza e ajusta a escala inicial
  const centerX = (containerRect.width - dimensions.value.width * initialScale) / 2;
  const centerY = (containerRect.height - dimensions.value.height * initialScale) / 2;

  // Aplica a transformação inicial
  container.style.transform = `translate(${centerX}px, ${centerY}px) scale(${initialScale})`;

  // Atualiza transformação do canvas e container
  panzoomInstance.on('transform', (e) => {
    const transform = panzoomInstance!.getTransform();

    // Aplica a mesma transformação ao container e ao canvas do heatmap
    if (container && heatmapInstance?.renderer.canvas) {
      const matrix = `matrix(${transform.scale}, 0, 0, ${transform.scale}, ${transform.x}, ${transform.y})`;
      container.style.transform = matrix;
      heatmapInstance.renderer.canvas.style.transform = 'none'; // Remove transformação do canvas
    }
  });

  panzoomInstance.on('panend zoomend', () => {
    const transform = panzoomInstance!.getTransform();
    addLog(`Transform ended (scale: ${transform.scale.toFixed(2)}, x: ${transform.x.toFixed(0)}, y: ${transform.y.toFixed(0)})`);
  });
};

const initHeatmap = () => {
  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  addLog('Initializing heatmap');

  // Define o tamanho exato da imagem
  container.style.width = `${dimensions.value.width}px`;
  container.style.height = `${dimensions.value.height}px`;

  heatmapInstance = new HeatMap({
    container,
    ...HEATMAP_DEFAULT_CONFIG,
    ...props.config,
    width: dimensions.value.width,
    height: dimensions.value.height
  });

  addLog('Heatmap instance created');
  updateHeatmapData();

  nextTick(() => {
    const heatmapCanvas = container.querySelector('canvas');
    if (!heatmapCanvas) return;

    setupPanzoom(container, heatmapCanvas);
    setupCursorEvents(heatmapCanvas);
    addLog('Heatmap setup completed');
  });
};

// Lifecycle hooks
onMounted(() => {
  // Removemos a inicialização aqui, ela será feita após o carregamento da imagem
  addLog('Component mounted');
});

onUnmounted(() => {
  // Limpa os logs
  eventLogs.value = [];

  // Limpa o panzoom
  if (panzoomInstance) {
    panzoomInstance.dispose();
  }
});
</script>

<style>
/* Adicione ao arquivo styles.css */
.event-logs {
  position: fixed;
  bottom: 10px;
  left: 10px;
  width: 300px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  z-index: 1000;
}

.logs-content {
  max-height: 200px;
  overflow-y: auto;
}

.log-item {
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.log-time {
  color: #8af;
  margin-right: 8px;
}

.log-message {
  color: #fff;
}

h4 {
  margin: 0 0 8px 0;
  color: #fff;
  font-size: 14px;
}
</style>

