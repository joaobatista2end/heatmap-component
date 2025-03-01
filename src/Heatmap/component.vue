<template>
  <div ref="containerRef" class="heatmap-container">
    <!-- Controles do heatmap -->
    <div class="heatmap-controls">
      <div class="radius-control">
        <label for="radius-slider">Área de influência: {{ radius }}</label>
        <input
          id="radius-slider"
          type="range"
          min="5"
          max="100"
          step="5"
          v-model.number="radius"
          @input="debouncedUpdateRadius"
        />
      </div>
    </div>

    <!-- Legenda do heatmap -->
    <div class="heatmap-legend">
      <div class="legend-gradient-container">
        <span class="legend-min">{{ legendMin }}</span>
        <div class="legend-gradient-wrapper">
          <img ref="gradientImg" class="legend-gradient" alt="Gradient" />
        </div>
        <span class="legend-max">{{ legendMax }}</span>
      </div>
    </div>

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

    <!-- Tooltip para mostrar valores -->
    <div
      v-if="showTooltip"
      class="heatmap-tooltip"
      :style="tooltipStyle"
    >
      <strong>{{ typeof tooltipValue === 'number' ? tooltipValue : tooltipValue }}</strong>
    </div>

    <div v-if="devMode" class="performance-metrics">
      <p>FPS: {{ fps }}</p>
      <p>Frame Time: {{ frameTime.toFixed(2) }}ms</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DataPoint } from "heatmap-ts";
import { onMounted, onUnmounted, watch, ref, computed } from "vue";
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
const gradientImg = ref<HTMLImageElement | null>(null);

// Controle de raio
const radius = ref(30); // Valor inicial do raio

// Tooltip state
const showTooltip = ref(false);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipValue = ref(0);

// Legend state
const legendMin = ref(0);
const legendMax = ref(100);
const gradientCfg = ref({});

// Computed para estilo do tooltip
const tooltipStyle = computed(() => {
  return {
    left: `${tooltipX.value}px`,
    top: `${tooltipY.value}px`,
    display: showTooltip.value ? 'block' : 'none'
  };
});

// Função para atualizar o raio do heatmap
const updateHeatmapRadius = () => {
  if (!heatmapInstance.value) return;

  try {
    // Salvar os dados atuais
    const currentData = {
      data: data.value,
      min: legendMin.value,
      max: legendMax.value
    };

    // Limpar a instância atual
    cleanupHeatmap();

    // Obter o container
    const heatmapContainer = containerRef.value?.querySelector('#heatmap') as HTMLElement;
    if (!heatmapContainer) return;

    // Configurar o container
    heatmapContainer.style.width = `${dimensions.value.width}px`;
    heatmapContainer.style.height = `${dimensions.value.height}px`;

    // Criar nova instância com o novo raio
    heatmapInstance.value = new HeatMap({
      container: heatmapContainer,
      ...HEATMAP_DEFAULT_CONFIG,
      ...props.config,
      width: dimensions.value.width,
      height: dimensions.value.height,
      onExtremaChange: updateLegend,
      useValueExtent: true,
      valueExtent: [currentData.min, currentData.max],
      radius: radius.value // Usar o novo valor do raio
    });

    // Definir os mesmos dados
    heatmapInstance.value.setData(currentData);

    // Reconfigurar panzoom e eventos
    setupPanzoom(heatmapContainer);
    setupTooltipEvents(heatmapContainer);

  } catch (error) {
    console.error('Erro ao atualizar o raio do heatmap:', error);
  }
};

// Adicionar um debounce para evitar muitas atualizações durante o arrasto do slider
let debounceTimeout: number | null = null;
const debouncedUpdateRadius = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  debounceTimeout = window.setTimeout(() => {
    updateHeatmapRadius();
    debounceTimeout = null;
  }, 100); // 100ms de debounce
};

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

  // Calcular valores mínimo e máximo reais dos dados
  const { min, max } = calculateDataExtremes(data.value);

  // Atualizar valores da legenda diretamente
  legendMin.value = min;
  legendMax.value = max;

  // Criar nova instância com configuração para valores negativos
  heatmapInstance.value = new HeatMap({
    container: heatmapContainer,
    ...HEATMAP_DEFAULT_CONFIG,
    ...props.config,
    width: dimensions.value.width,
    height: dimensions.value.height,
    // Configurar para usar valores negativos
    onExtremaChange: updateLegend,
    // Estas opções são cruciais para valores negativos
    useValueExtent: true,
    valueExtent: [min, max],
    // Usar o raio definido pelo usuário
    radius: radius.value
  });

  // Definir dados com valores mínimo e máximo reais
  heatmapInstance.value.setData({
    max: max,
    min: min,
    data: data.value
  });

  // Configurar panzoom
  setupPanzoom(heatmapContainer);

  // Configurar eventos para tooltip
  setupTooltipEvents(heatmapContainer);

  isInitialized.value = true;
};

// Função para calcular os valores extremos reais dos dados
const calculateDataExtremes = (points: DataPoint[]) => {
  if (!points || points.length === 0) {
    return { min: 0, max: 100 };
  }

  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }

  return { min, max };
};

// Atualizar a legenda
const updateLegend = (data: any) => {
  legendMin.value = data.min;
  legendMax.value = data.max;

  // Regenerar imagem do gradiente
  if (data.gradient !== gradientCfg.value) {
    gradientCfg.value = data.gradient;

    // Criar canvas para o gradiente
    const legendCanvas = document.createElement('canvas');
    legendCanvas.width = 100;
    legendCanvas.height = 10;
    const legendCtx = legendCanvas.getContext('2d');

    if (legendCtx) {
      const gradient = legendCtx.createLinearGradient(0, 0, 100, 1);

      for (const key in data.gradient) {
        gradient.addColorStop(parseFloat(key), data.gradient[key]);
      }

      legendCtx.fillStyle = gradient;
      legendCtx.fillRect(0, 0, 100, 10);

      if (gradientImg.value) {
        gradientImg.value.src = legendCanvas.toDataURL();
      }
    }
  }
};

// Configurar eventos para tooltip
const setupTooltipEvents = (container: HTMLElement) => {
  // Remover eventos anteriores para evitar duplicação
  if (containerRef.value) {
    containerRef.value.removeEventListener('mousemove', handleMouseMove);
    containerRef.value.removeEventListener('mouseout', handleMouseOut);
  }

  // Adicionar novos eventos
  containerRef.value?.addEventListener('mousemove', handleMouseMove);
  containerRef.value?.addEventListener('mouseout', handleMouseOut);
};

// Handler para movimento do mouse
const handleMouseMove = (ev: MouseEvent) => {
  if (!heatmapInstance.value || !containerRef.value) return;

  // Obter a posição relativa ao container
  const rect = containerRef.value.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;

  // Ajustar coordenadas com base na transformação do panzoom
  const transform = panzoomInstance.value?.getTransform();
  if (transform) {
    // Calcular coordenadas ajustadas para o panzoom
    const adjustedX = (x - transform.x) / transform.scale;
    const adjustedY = (y - transform.y) / transform.scale;

    // Sempre priorizar encontrar o ponto real mais próximo
    const nearestPoint = findNearestPoint(adjustedX, adjustedY);

    if (nearestPoint) {
      // Usar o valor real do ponto de dados
      tooltipX.value = ev.clientX;
      tooltipY.value = ev.clientY;
      tooltipValue.value = nearestPoint.value;
      showTooltip.value = true;
    } else {
      // Se não encontrar um ponto próximo, calcular o valor com base na escala da legenda
      try {
        const rawValue = heatmapInstance.value.getValueAt({
          x: adjustedX,
          y: adjustedY
        });

        if (rawValue !== null && rawValue !== undefined) {
          // Mapear o valor bruto para a escala real usando os valores min/max da legenda
          const normalizedValue = mapValueToRange(
            rawValue,
            0, 100, // Valores padrão do heatmap
            legendMin.value, legendMax.value // Escala real dos dados
          );

          tooltipX.value = ev.clientX;
          tooltipY.value = ev.clientY;
          tooltipValue.value = Math.round(normalizedValue * 10) / 10; // Arredondar para 1 casa decimal
          showTooltip.value = true;
        } else {
          showTooltip.value = false;
        }
      } catch (error) {
        console.error('Erro ao obter valor do heatmap:', error);
        showTooltip.value = false;
      }
    }
  }
};

// Função para mapear um valor de uma escala para outra
const mapValueToRange = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) => {
  // Calcular a proporção do valor na escala original
  const proportion = (value - fromMin) / (fromMax - fromMin);
  // Mapear para a nova escala
  return toMin + proportion * (toMax - toMin);
};

// Função para encontrar o ponto mais próximo
const findNearestPoint = (x: number, y: number) => {
  if (!data.value || data.value.length === 0) return null;

  const threshold = 30; // Distância máxima para considerar um ponto próximo
  let nearestPoint = null;
  let minDistance = Infinity;

  for (const point of data.value) {
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      nearestPoint = point;
    }
  }

  return nearestPoint;
};

// Handler para saída do mouse
const handleMouseOut = () => {
  showTooltip.value = false;
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

    // Esconder tooltip durante transformações
    showTooltip.value = false;
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

  // Esconder tooltip
  showTooltip.value = false;
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

<style>
.heatmap-tooltip {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  font-family: sans-serif;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translate(15px, -30px); /* Deslocamento para não cobrir o cursor */
}

.heatmap-legend {
  position: absolute;
  bottom: 20px;
  left: 18px;
  right: 18px;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 10px 18px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.legend-gradient-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.legend-gradient-wrapper {
  flex: 1;
  margin: 0 15px;
}

.legend-gradient {
  width: 100%;
  height: 20px;
  border: 1px solid #ccc;
  display: block;
}

.legend-min, .legend-max {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
}

.heatmap-controls {
  position: absolute;
  top: 20px;
  left: 18px;
  right: 18px;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 10px 18px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.radius-control {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.radius-control label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.radius-control input[type="range"] {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: #ddd;
  outline: none;
  border-radius: 4px;
}

.radius-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #4CAF50;
  cursor: pointer;
  border-radius: 50%;
}

.radius-control input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #4CAF50;
  cursor: pointer;
  border-radius: 50%;
}
</style>
