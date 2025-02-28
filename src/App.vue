<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { Heatmap } from './Heatmap';
import type { DataPoint } from 'heatmap-ts';
import { mapMockData, mapMockData2 } from './assets/mock';

// Dados do heatmap
interface DataSet {
  name: string;
  data: DataPoint[];
  image: Ref<string>
}

interface DatasetMap {
  [key: string]: DataSet
}

const datasets: DatasetMap = {
  'dataset1': {
    name: 'Dataset 1',
    data: mapMockData,
    image: ref('/src/assets/map.jpg')

  },
  'dataset2': {
    name: 'Dataset 2',
    data: mapMockData2,
    image: ref('/src/assets/map2.jpg')
  }
};

const selectedDatasetId = ref('dataset1');
const heatmapData = ref<DataSet>(datasets[selectedDatasetId.value]);


// Handler para mudança de dataset
const handleDatasetChange = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  heatmapData.value = datasets[select.value];
};
</script>

<template>
  <div class="app-container">
    <div class="controls">
      <select :value="selectedDatasetId" @change="handleDatasetChange" class="dataset-select">
        <option v-for="(dataset, id) in datasets" :key="id" :value="id">
          {{ dataset.name }}
        </option>
      </select>
      <span class="dataset-info">{{ heatmapData.data.length }} points</span>
    </div>

    <Heatmap
      v-model:data="heatmapData.data"
      :backgroundImage="heatmapData.image"
    />
  </div>
</template>

<style>
.app-container {
  width: 1200px;
  height: 1200px;
  padding: 20px;
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
}

.controls {
  position: absolute;
  top: 30px;
  left: 30px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dataset-select {
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  min-width: 150px;
}

.dataset-info {
  font-size: 14px;
  color: #666;
}
</style>
