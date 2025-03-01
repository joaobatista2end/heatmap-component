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

    <!-- Tooltip para mostrar valores -->
    <div
      v-if="showTooltip"
      class="heatmap-tooltip"
      :style="tooltipStyle"
    >
      <strong>{{ tooltipValue }}</strong>
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
import type { Config, HeatmapProps } from "./types";
import "./styles.css";
import { usePerformanceMetrics } from "./composables/usePerformanceMetrics";
import HeatMap from "heatmap-ts";
import panzoom from "panzoom";
import { CURSOR_DEFAULT_STYLES, PANZOOM_DEFAULT_CONFIG } from "./conts";

// Importar os componentes
import RadiusControl from './components/RadiusControl.vue';
import ValuesControl from './components/ValuesControl.vue';

const props = withDefaults(defineProps<{
  config?: Config;
  backgroundImage?: string | null;
  devMode?: boolean;
  data: DataPoint[];
  radius: number;
  valueFilter: [number, number];
}>(), {
  config: () => HEATMAP_DEFAULT_CONFIG,
  backgroundImage: null,
  devMode: true,
});

const emit = defineEmits<{
  (e: 'update:radius', value: number): void;
  (e: 'update:valueFilter', value: [number, number]): void;
  (e: 'extremaChange', min: number, max: number): void;
}>();

const { fps, frameTime } = usePerformanceMetrics();

// Refs
const containerRef = ref<HTMLElement | null>(null);
const backgroundRef = ref<HTMLImageElement | null>(null);
const heatmapInstance = ref<HeatMap | null>(null);
const panzoomInstance = ref<ReturnType<typeof panzoom> | null>(null);
const dimensions = ref({ width: 0, height: 0 });
const isInitialized = ref(false);
const gradientImg = ref<HTMLImageElement | null>(null);

// Tooltip state
const showTooltip = ref(false);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipValue = ref(0);

// Legend state
const legendMinValue = ref(0);
const legendMaxValue = ref(100);
const gradientConfig = ref({});

// Filtro de valores
const valueFilter = ref<[number, number]>([0, 100]);
const filteredData = computed(() => {
  return props.data.filter(point =>
    point.value >= valueFilter.value[0] &&
    point.value <= valueFilter.value[1]
  );
});

// Computed para estilo do tooltip
const tooltipStyle = computed(() => {
  return {
    left: `${tooltipX.value}px`,
    top: `${tooltipY.value}px`,
    display: showTooltip.value ? 'block' : 'none'
  };
});

// Calcular o passo apropriado para o slider
const calculateStep = () => {
  const range = Math.abs(legendMaxValue.value - legendMinValue.value);
  // Usar um passo maior para intervalos maiores
  return Math.max(range / 100, 0.1);
};

// Atualizar o valor mínimo do filtro
const updateMinFilter = (event: Event) => {
  event.stopPropagation();

  // Garantir que o valor mínimo não seja maior que o máximo
  if (valueFilter.value[0] > valueFilter.value[1]) {
    valueFilter.value[0] = valueFilter.value[1];
  }

  // Usar setTimeout para evitar problemas de concorrência
  setTimeout(() => {
    updateFilteredData();
  }, 0);
};

// Atualizar o valor máximo do filtro
const updateMaxFilter = (event: Event) => {
  event.stopPropagation();

  // Garantir que o valor máximo não seja menor que o mínimo
  if (valueFilter.value[1] < valueFilter.value[0]) {
    valueFilter.value[1] = valueFilter.value[0];
  }

  // Usar setTimeout para evitar problemas de concorrência
  setTimeout(() => {
    updateFilteredData();
  }, 0);
};

// Atualizar os dados filtrados
const updateFilteredData = () => {
  // Atualizar o heatmap com os dados filtrados
  if (heatmapInstance.value) {
    const filteredPoints = props.data.filter(point =>
      point.value >= valueFilter.value[0] &&
      point.value <= valueFilter.value[1]
    );

    // Se não houver pontos após a filtragem, não atualizar
    if (filteredPoints.length === 0) {
      console.warn('Nenhum ponto encontrado no intervalo selecionado');
      return;
    }

    // Usar os valores originais min/max para manter a escala de cores consistente
    heatmapInstance.value.setData({
      min: legendMinValue.value,
      max: legendMaxValue.value,
      data: filteredPoints
    });
  }
};

// Função para atualizar o raio do heatmap
const updateHeatmapRadius = () => {
  if (!heatmapInstance.value) return;

  try {
    // Salvar os dados atuais
    const currentData = {
      data: filteredData.value,
      min: legendMinValue.value,
      max: legendMaxValue.value
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
      radius: props.radius // Usar o novo valor do raio
    } as Config);

    // Definir os mesmos dados
    heatmapInstance.value.setData(currentData);

    // Reconfigurar panzoom e eventos
    setupPanzoom(heatmapContainer);
    setupTooltipEvents(heatmapContainer);

  } catch (error) {
    console.error('Erro ao atualizar o raio do heatmap:', error);
  }
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
  const { min, max } = calculateDataExtremes(props.data);

  // Atualizar valores da legenda diretamente
  legendMinValue.value = min;
  legendMaxValue.value = max;

  // Inicializar o filtro de valores com o intervalo completo
  valueFilter.value = [min, max];

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
    radius: props.radius
  } as Config);

  // Definir dados com valores mínimo e máximo reais
  heatmapInstance.value.setData({
    max: max,
    min: min,
    data: filteredData.value
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
  legendMinValue.value = data.min;
  legendMaxValue.value = data.max;

  // Regenerar imagem do gradiente
  if (data.gradient !== gradientConfig.value) {
    gradientConfig.value = data.gradient;

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
            legendMinValue.value, legendMaxValue.value // Escala real dos dados
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
  if (!props.data || props.data.length === 0) return null;

  const threshold = 30; // Distância máxima para considerar um ponto próximo
  let nearestPoint = null;
  let minDistance = Infinity;

  // Filtrar apenas os pontos dentro do intervalo selecionado
  const visiblePoints = props.data.filter(point =>
    point.value >= valueFilter.value[0] &&
    point.value <= valueFilter.value[1]
  );

  // Buscar o ponto mais próximo apenas entre os pontos visíveis
  for (const point of visiblePoints) {
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
watch(() => props.data, () => {
  if (isInitialized.value) {
    initHeatmap(); // Recriar completamente o heatmap quando os dados mudarem
  }
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  if (props.data.length > 0) {
    initHeatmap();
  }
});

onUnmounted(() => {
  cleanupHeatmap();
});

// Expor valores úteis para os controles externos
defineExpose({
  legendMin: legendMinValue,
  legendMax: legendMaxValue,
  gradientCfg: gradientConfig,
});

// Atualizar quando as props mudarem
watch(() => props.radius, updateHeatmapRadius);
watch(() => props.valueFilter, updateFilteredData);
</script>

<style scoped>
.heatmap-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.heatmap-content {
  width: 100%;
  height: 100%;
}

.heatmap-background {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.heatmap-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 1000;
}

.performance-metrics {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 1000;
}
</style>
