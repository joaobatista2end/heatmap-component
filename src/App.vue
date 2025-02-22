<template>
  <div class="container">
    <heatmap v-model:data="heatmapData"></heatmap>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Heatmap } from './Heatmap';
import { points } from './assets/mock';
import type { DataPoint } from 'heatmap-ts';

const data = points.map((val ): DataPoint => {
  return {
    value: val.quantidade,
    x: val.posicao[1],
    y: val.posicao[0],
  }
})
const heatmapData = ref(data);
</script>

<style>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 800px;
  width: 800px;
}
</style>
