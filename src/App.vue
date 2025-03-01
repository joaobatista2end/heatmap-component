<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { Heatmap, RadiusControl, ValuesControl } from './Heatmap';
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

const handleDatasetChange = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  selectedDatasetId.value = select.value;
  heatmapData.value = datasets[select.value];
};

// Estados dos controles
const radius = ref(30);
const valueFilter = ref<[number, number]>([0, 100]);
const minValue = ref(0);
const maxValue = ref(100);

// Referência ao componente Heatmap
const heatmapRef = ref();

// Handler para mudanças nos valores extremos
const handleExtremaChange = (min: number, max: number) => {
  minValue.value = min;
  maxValue.value = max;
  valueFilter.value = [min, max];
};

// Novo handler para mudanças no filtro de valores
const handleValueFilterChange = (values: [number, number]) => {
  valueFilter.value = values;
  // Força a atualização do heatmap
  if (heatmapRef.value) {
    heatmapRef.value.updateValueFilter(values);
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-5">
    <div class="flex flex-col items-center gap-5">
      <!-- Container principal do heatmap -->
      <div class="w-[1000px] h-[1000px] bg-white rounded-lg shadow-lg overflow-hidden">
        <Heatmap
          v-model:radius="radius"
          v-model:valueFilter="valueFilter"
          :data="heatmapData.data"
          :backgroundImage="heatmapData.image"
          ref="heatmapRef"
          @extremaChange="handleExtremaChange"
        />
      </div>

      <!-- Container dos controles -->
      <div class="w-full max-w-[940px] bg-white rounded-lg shadow-lg p-8 space-y-8">
        <!-- Dataset selector -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-700">Dataset</h3>
          <div class="flex items-center gap-4">
            <select
              v-model="selectedDatasetId"
              @change="handleDatasetChange"
              class="px-3 py-2 border border-gray-300 rounded text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option v-for="(dataset, id) in datasets" :key="id" :value="id">
                {{ dataset.name }}
              </option>
            </select>
            <span class="text-sm text-gray-500">{{ heatmapData.data.length }} points</span>
          </div>
        </div>

        <!-- Radius control -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-700">Raio de Influência</h3>
          <RadiusControl
            v-model="radius"
            :min="5"
            :max="100"
            :step="5"
          />
        </div>

        <!-- Values control -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-700">Filtro de Valores</h3>
          <ValuesControl
            v-model="valueFilter"
            :min="minValue"
            :max="maxValue"
            :gradient="heatmapRef?.gradientCfg"
            @change="handleValueFilterChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
