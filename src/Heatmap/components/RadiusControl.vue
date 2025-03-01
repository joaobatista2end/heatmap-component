<template>
  <div class="w-full max-w-[300px]">
    <div
      class="relative h-6 py-2"
      ref="containerRef"
      @mousedown="handleTrackClick"
    >
      <!-- Trilha do slider -->
      <div class="absolute top-1/2 left-0 right-0 h-2 rounded bg-gray-200 -translate-y-1/2 cursor-pointer">
        <!-- Área preenchida -->
        <div
          class="absolute h-full bg-green-400/35"
          :style="{ width: `${getPositionPercentage(modelValue)}%` }"
        ></div>
      </div>

      <!-- Handle do slider -->
      <div
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full cursor-grab active:cursor-grabbing shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-105 group"
        :style="{ left: `${getPositionPercentage(modelValue)}%` }"
        @mousedown.stop="startDrag"
      >
        <!-- Tooltip -->
        <div class="absolute bottom-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          {{ modelValue }}
        </div>
      </div>
    </div>

    <!-- Labels -->
    <div class="flex justify-between text-xs text-gray-600 mt-2">
      <span>{{ min }}</span>
      <span>{{ max }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

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

const containerRef = ref<HTMLElement | null>(null);

const getPositionPercentage = (value: number) => {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  return ((value - min) / (max - min)) * 100;
};

const calculateValue = (clientX: number) => {
  if (!containerRef.value) return props.modelValue;

  const rect = containerRef.value.getBoundingClientRect();
  let percentage = (clientX - rect.left) / rect.width;
  percentage = Math.max(0, Math.min(1, percentage));

  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const value = min + (max - min) * percentage;

  if (props.step) {
    return Math.round(value / props.step) * props.step;
  }
  return value;
};

const updateValue = (clientX: number) => {
  const newValue = calculateValue(clientX);
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const clampedValue = Math.min(Math.max(min, newValue), max);

  emit('update:modelValue', clampedValue);
};

const handleTrackClick = (event: MouseEvent) => {
  updateValue(event.clientX);
  emit('change', props.modelValue);
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
  updateValue(event.clientX);
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
