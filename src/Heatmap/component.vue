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

    <div
      v-if="heatmapInstance"
      :class="['heatmap-overlay', { 'is-transforming': isTransforming }]"
    >
      <div v-if="isTransforming" class="loading-spinner"></div>
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

// Adiciona ref para controlar visibilidade
const isTransforming = ref(false);

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

  scheduleRender(() => {
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
  panzoomInstance = panzoom(container, PANZOOM_DEFAULT_CONFIG);

  let transformTimeout: number;
  let isActive = false;

  panzoomInstance.on('transform', () => {
    if (!isActive) {
      addLog('Transform started');
      isActive = true;
    }

    isTransforming.value = true;

    if (transformTimeout) {
      clearTimeout(transformTimeout);
    }

    transformTimeout = window.setTimeout(() => {
      if (heatmapInstance?.renderer && backgroundRef.value) {
        const { naturalWidth, naturalHeight } = backgroundRef.value;
        heatmapInstance.renderer.setDimensions(naturalWidth, naturalHeight);
        updateHeatmapData();
        isTransforming.value = false;
        isActive = false;
        addLog('Transform ended');
      }
    }, 150);
  });
};

const initHeatmap = () => {
  const container = containerRef.value?.querySelector('#heatmap') as HTMLElement;
  if (!container) return;

  addLog('Initializing heatmap');

  // Define o tamanho do container para corresponder à imagem
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

