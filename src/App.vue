<script setup lang="ts">
import { ref } from 'vue';
import Heatmap from './Heatmap/component.vue';
import type { DataPoint } from 'heatmap-ts';

// Gera mais pontos de exemplo
const generatePoints = () => {
  const points: DataPoint[] = [];
  for (let i = 0; i < 200; i++) {
    points.push({
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      value: Math.random() * 100
    });
  }
  return points;
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
