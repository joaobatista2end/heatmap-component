<template>
  <div class="heatmap-container">
    <div id="heatmap"></div>
  </div>
</template>

<script setup lang="ts">
import HeatMap from "heatmap-ts";
import type { DataPoint } from "heatmap-ts";
import { computed, onMounted } from "vue";
import { HEATMAP_DEFAULT_CONFIG } from "./conts";
import type { HeatmapProps } from "./types";
import "./style.css";

const props = withDefaults(defineProps<Omit<HeatmapProps, "dataValue">>(), {
  config: () => HEATMAP_DEFAULT_CONFIG,
});

const data = defineModel("data", {
  type: Array<DataPoint>,
  default: () => [],
});

const max = computed(() => Math.max(...data.value.map((d) => d.value)));
const min = computed(() => Math.min(...data.value.map((d) => d.value)));

onMounted(() => {
  const container = document.getElementById("heatmap");
  if (container == null) return;

  const heatMap = new HeatMap({
    container,
    ...props.config,
  });

  heatMap.setData({
    max: max.value,
    min: min.value,
    data: data.value,
  });
});
</script>

