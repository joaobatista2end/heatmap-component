<script setup lang="ts">
import { ref } from 'vue';
import Heatmap from './Heatmap/component.vue';
import type { DataPoint } from 'heatmap-ts';
import { points } from './assets/mock';

// Função para normalizar os pontos
const generatePoints = () => {
  const maxX = Math.max(...points.map(p => p.posicao[0]));
  const maxY = Math.max(...points.map(p => p.posicao[1]));
  const maxValue = Math.max(...points.map(p => p.quantidade));

  const scaleX = 1200 / maxX;
  const scaleY = 1200 / maxY;

  return points.map(point => ({
    x: Math.floor(point.posicao[0] * scaleX),
    y: Math.floor(point.posicao[1] * scaleY),
    value: Math.floor((point.quantidade / maxValue) * 100)
  }));
};

const heatmapData = ref<DataPoint[]>(generatePoints());
</script>

<template>
  <div class="app-container">
    <Heatmap
      v-model:data="heatmapData"
      class="heatmap-demo"
    />
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
}

.heatmap-demo {
  width: 600px;
  height: 600px;
  margin: 0 auto;
}
</style>
