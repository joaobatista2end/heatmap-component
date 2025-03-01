<template>
  <div class="w-full max-w-[500px]">
    <div class="flex flex-col gap-2">
      <div class="relative h-6 py-2">
        <div
          class="absolute top-1/2 left-0 right-0 h-2 rounded overflow-hidden -translate-y-1/2"
          :style="{ background: gradientBackground }"
        >
          <div
            class="absolute h-full bg-white/35"
            :style="{
              left: `${getPositionPercentage(modelValue[0])}%`,
              width: `${getPositionPercentage(modelValue[1]) - getPositionPercentage(modelValue[0])}%`
            }"
          ></div>
        </div>

        <template v-for="(handle, index) in ['min', 'max'] as const" :key="handle">
          <div
            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full cursor-pointer shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-105 group"
            :style="{ left: `${getPositionPercentage(modelValue[index])}%` }"
            @mousedown="startDrag(handle, $event)"
          >
            <div class="absolute bottom-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 transition-opacity group-hover:opacity-100">
              {{ modelValue[index].toFixed(1) }}
            </div>
          </div>
        </template>
      </div>

      <div class="flex justify-between items-center px-0.5">
        <span class="text-xs text-gray-600">{{ min.toFixed(1) }}</span>
        <button
          class="p-1 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="resetValues"
          :disabled="modelValue[0] === min && modelValue[1] === max"
        >↺</button>
        <span class="text-xs text-gray-600">{{ max.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: [number, number];
  min: number;
  max: number;
  step?: number;
  gradient: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: [number, number]): void;
  (e: 'change', value: [number, number]): void;
}>();

const gradientBackground = computed(() => {
  const sortedStops = Object.entries(props.gradient)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([offset, color]) => `${color} ${Math.round(Number(offset) * 100)}%`);
  return `linear-gradient(to right, ${sortedStops.join(', ')})`;
});

let isDragging = false;
let currentHandle: 'min' | 'max' | null = null;

const getPositionPercentage = (value: number) => {
  return ((value - props.min) / (props.max - props.min)) * 100;
};

const startDrag = (handle: 'min' | 'max', event: MouseEvent) => {
  event.preventDefault();
  isDragging = true;
  currentHandle = handle;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
};

const handleDrag = (event: MouseEvent) => {
  if (!isDragging || !currentHandle) return;

  const container = (event.target as HTMLElement).closest('.slider-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  let percentage = (event.clientX - rect.left) / rect.width;
  percentage = Math.max(0, Math.min(1, percentage));

  const value = props.min + (props.max - props.min) * percentage;
  const stepValue = props.step ? Math.round(value / props.step) * props.step : value;

  const newValue: [number, number] = [...props.modelValue];
  if (currentHandle === 'min') {
    newValue[0] = Math.min(Math.max(props.min, stepValue), newValue[1] - (props.step || 0));
  } else {
    newValue[1] = Math.max(Math.min(props.max, stepValue), newValue[0] + (props.step || 0));
  }

  emit('update:modelValue', newValue);
};

const stopDrag = () => {
  if (isDragging) {
    isDragging = false;
    currentHandle = null;
    emit('change', props.modelValue);
  }
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const resetValues = () => {
  emit('update:modelValue', [props.min, props.max]);
  emit('change', [props.min, props.max]);
};
</script>
