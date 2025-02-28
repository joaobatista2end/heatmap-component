import HeatMap from "heatmap-ts";
import type { DataPoint } from "heatmap-ts";
import { ref, nextTick } from "vue";
import panzoom from "panzoom";
import {
  CURSOR_DEFAULT_STYLES,
  HEATMAP_DEFAULT_CONFIG,
  PANZOOM_DEFAULT_CONFIG,
} from "../conts";
import type { HeatmapProps } from "../types";

export function useHeatmap(props: Omit<HeatmapProps, "dataValue">, initialData: DataPoint[]) {
  const containerRef = ref<HTMLElement | null>(null);
  const backgroundRef = ref<HTMLImageElement | null>(null);
  let heatmapInstance: HeatMap | null = null;
  let panzoomInstance: ReturnType<typeof panzoom> | null = null;

  const dimensions = ref({ width: 0, height: 0 });

  const updateHeatmapData = () => {
    if (!heatmapInstance) return;

    const container = containerRef.value?.querySelector("#heatmap") as HTMLElement;
    if (!container) return;

    const cachedData = initialData;

    requestAnimationFrame(() => {
      heatmapInstance!.setData({
        max: 100,
        min: 0,
        data: cachedData,
      });
    });
  };

  const updateData = (newData: DataPoint[]) => {
    // Obter o container principal
    const mainContainer = containerRef.value;
    if (!mainContainer) return;

    // Obter o container do heatmap
    let container = mainContainer.querySelector("#heatmap") as HTMLElement;
    if (!container) return;

    // Limpar completamente o container do heatmap
    // Primeiro, remover o panzoom
    if (panzoomInstance) {
      panzoomInstance.dispose();
      panzoomInstance = null;
    }

    // Remover a instância do heatmap
    if (heatmapInstance) {
      heatmapInstance = null;
    }

    // Criar um novo container para o heatmap
    const newContainer = document.createElement('div');
    newContainer.id = 'heatmap';
    newContainer.className = 'heatmap-content';

    // Adicionar a imagem de fundo ao novo container
    if (backgroundRef.value) {
      const img = document.createElement('img');
      img.src = backgroundRef.value.src;
      img.alt = 'Background';
      img.className = 'heatmap-background';
      newContainer.appendChild(img);
    }

    // Substituir o container antigo pelo novo
    container.parentNode?.replaceChild(newContainer, container);

    // Definir as dimensões do novo container
    newContainer.style.width = `${dimensions.value.width}px`;
    newContainer.style.height = `${dimensions.value.height}px`;

    // Criar uma nova instância do heatmap
    heatmapInstance = new HeatMap({
      container: newContainer,
      ...HEATMAP_DEFAULT_CONFIG,
      ...props.config,
      width: dimensions.value.width,
      height: dimensions.value.height
    });

    // Configurar o novo heatmap
    nextTick(() => {
      const heatmapCanvas = newContainer.querySelector('canvas');
      if (heatmapCanvas) {
        setupPanzoom(newContainer);
        setupCursorEvents(heatmapCanvas as HTMLElement);
      }

      // Definir os novos dados
      heatmapInstance!.setData({
        max: 100,
        min: 0,
        data: newData
      });
    });
  };

  const setupCursorEvents = (canvas: HTMLElement) => {
    canvas.style.cursor = CURSOR_DEFAULT_STYLES.default;
    canvas.addEventListener("mousedown", () => {
      canvas.style.cursor = CURSOR_DEFAULT_STYLES.dragging;
    });
    canvas.addEventListener("mouseup", () => {
      canvas.style.cursor = CURSOR_DEFAULT_STYLES.default;
    });
  };

  const setupPanzoom = (container: HTMLElement) => {
    const containerRect = container.getBoundingClientRect();
    const scaleX = containerRect.width / dimensions.value.width;
    const scaleY = containerRect.height / dimensions.value.height;
    const initialScale = Math.min(scaleX, scaleY);

    panzoomInstance = panzoom(container, {
      ...PANZOOM_DEFAULT_CONFIG,
      minZoom: initialScale * 0.1,
      maxZoom: initialScale * 4,
      bounds: false,
      boundsPadding: 1,
    });

    const centerX =
      (containerRect.width - dimensions.value.width * initialScale) / 2;
    const centerY =
      (containerRect.height - dimensions.value.height * initialScale) / 2;

    container.style.transform = `translate(${centerX}px, ${centerY}px) scale(${initialScale})`;

    panzoomInstance.on("transform", (e) => {
      const transform = panzoomInstance!.getTransform();

      if (container && heatmapInstance?.renderer.canvas) {
        const matrix = `matrix(${transform.scale}, 0, 0, ${transform.scale}, ${transform.x}, ${transform.y})`;
        container.style.transform = matrix;
        heatmapInstance.renderer.canvas.style.transform = "none";
      }
    });

    panzoomInstance.on("panend zoomend", () => panzoomInstance!.getTransform());
  };

  const initHeatmap = () => {
    const container = containerRef.value?.querySelector("#heatmap") as HTMLElement;
    if (!container) return;

    container.style.width = `${dimensions.value.width}px`;
    container.style.height = `${dimensions.value.height}px`;

    heatmapInstance = new HeatMap({
      container,
      ...HEATMAP_DEFAULT_CONFIG,
      ...props.config,
      width: dimensions.value.width,
      height: dimensions.value.height
    });

    updateHeatmapData();

    nextTick(() => {
      const heatmapCanvas = container.querySelector("canvas");
      if (!heatmapCanvas) return;

      setupPanzoom(container);
      setupCursorEvents(heatmapCanvas);
    });
  };

  const handleImageLoad = () => {
    if (backgroundRef.value) {
      const img = backgroundRef.value;
      const { naturalWidth, naturalHeight } = img;

      dimensions.value = {
        width: naturalWidth,
        height: naturalHeight,
      };

      initHeatmap();
    }
  };

  const cleanup = () => {
    if (panzoomInstance) {
      panzoomInstance.dispose();
    }
  };

  return {
    containerRef,
    backgroundRef,
    handleImageLoad,
    cleanup,
    updateData,
  };
}
