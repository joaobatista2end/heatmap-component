<script setup lang="ts">
import { ref } from 'vue';
import { Heatmap } from './Heatmap';
import type { DataPoint } from 'heatmap-ts';
import { mockData } from './assets/mock';

// Dados do heatmap
const heatmapData = ref<DataPoint[]>(mockData);

// Imagem de fundo
const backgroundImage = ref('/src/assets/home.png');
</script>

<template>
  <div class="app-container">
    <Heatmap
      v-model:data="heatmapData"
      :backgroundImage="backgroundImage"
    />
  </div>
</template>

<style>
.app-container {
  width: 900px;
  height: 900px;
  padding: 20px;
  box-sizing: border-box;
}
</style>
