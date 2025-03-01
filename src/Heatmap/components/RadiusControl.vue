<template>
  <div class="w-full max-w-[300px]">
    <div class="relative h-6 py-2">
      <div class="absolute top-1/2 left-0 right-0 h-2 rounded bg-gray-200 -translate-y-1/2">
        <div
          class="absolute h-full bg-green-400/35"
          :style="{ width: `${getPositionPercentage(modelValue)}%` }"
        ></div>
      </div>
      <div
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full cursor-pointer shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-105"
        :style="{ left: `${getPositionPercentage(modelValue)}%` }"
        @mousedown="startDrag"
      >
        <div class="absolute bottom-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 transition-opacity group-hover:opacity-100">
          {{ modelValue }}
        </div>
      </div>
    </div>

    <div class="flex justify-between text-xs text-gray-600 mt-2">
      <span>{{ min }}</span>
      <span>{{ max }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, defineExpose } from 'vue';

const props = defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
  (e: 'change', value: number): void;
}>();

const getPositionPercentage = (value: number) => {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  return ((value - min) / (max - min)) * 100;
};

let isDragging = false;

const startDrag = (event: MouseEvent) => {
  event.preventDefault();
  isDragging = true;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
};

const handleDrag = (event: MouseEvent) => {
  if (!isDragging) return;

  const container = (event.target as HTMLElement).closest('.slider-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  let percentage = 1 - ((event.clientY - rect.top) / rect.height);
  percentage = Math.max(0, Math.min(1, percentage));

  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const value = min + (max - min) * percentage;
  const stepValue = props.step ? Math.round(value / props.step) * props.step : value;

  emit('update:modelValue', Math.min(Math.max(min, stepValue), max));
};

const stopDrag = () => {
  if (isDragging) {
    isDragging = false;
    emit('change', props.modelValue);
  }
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};
</script>
