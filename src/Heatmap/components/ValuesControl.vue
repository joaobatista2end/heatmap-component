<template>
  <div class="w-full max-w-[500px]">
    <div class="flex flex-col gap-2">
      <div
        class="relative h-6 py-2"
        ref="containerRef"
      >
        <!-- Trilha do slider com gradiente -->
        <div
          class="absolute top-1/2 left-0 right-0 h-2 rounded overflow-hidden -translate-y-1/2"
          :style="{ background: gradientBackground }"
          @mousedown="handleTrackClick"
        >
          <!-- Área selecionada -->
          <div
            class="absolute h-full bg-white/35"
            :style="{
              left: `${getPositionPercentage(modelValue[0])}%`,
              width: `${getPositionPercentage(modelValue[1]) - getPositionPercentage(modelValue[0])}%`
            }"
          ></div>
        </div>

        <!-- Handle Mínimo -->
        <div
          class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full cursor-grab active:cursor-grabbing shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-105 group z-10"
          :class="{ 'z-20': currentHandle === 'min' }"
          :style="{ left: `${getPositionPercentage(modelValue[0])}%` }"
          @mousedown="startDrag('min', $event)"
        >
          <div class="absolute bottom-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none whitespace-nowrap">
            {{ modelValue[0].toFixed(1) }}
          </div>
        </div>

        <!-- Handle Máximo -->
        <div
          class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full cursor-grab active:cursor-grabbing shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-105 group z-10"
          :class="{ 'z-20': currentHandle === 'max' }"
          :style="{ left: `${getPositionPercentage(modelValue[1])}%` }"
          @mousedown="startDrag('max', $event)"
        >
          <div class="absolute bottom-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none whitespace-nowrap">
            {{ modelValue[1].toFixed(1) }}
          </div>
        </div>
      </div>

      <!-- Controles e labels -->
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
import { computed, ref } from 'vue';

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

const containerRef = ref<HTMLElement | null>(null);
const currentHandle = ref<'min' | 'max' | null>(null);

const gradientBackground = computed(() => {
  const sortedStops = Object.entries(props.gradient)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([offset, color]) => `${color} ${Math.round(Number(offset) * 100)}%`);
  return `linear-gradient(to right, ${sortedStops.join(', ')})`;
});

const getPositionPercentage = (value: number) => {
  return ((value - props.min) / (props.max - props.min)) * 100;
};

const calculateValue = (clientX: number): number => {
  if (!containerRef.value) return props.min;

  const rect = containerRef.value.getBoundingClientRect();
  const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const rawValue = props.min + (props.max - props.min) * percentage;

  if (props.step) {
    return Math.round(rawValue / props.step) * props.step;
  }
  return Number(rawValue.toFixed(1));
};

const handleTrackClick = (event: MouseEvent) => {
  if (!containerRef.value) return;

  const clickX = event.clientX;
  const rect = containerRef.value.getBoundingClientRect();
  const clickValue = calculateValue(clickX);

  // Determina qual handle mover baseado na proximidade
  const distToMin = Math.abs(clickValue - props.modelValue[0]);
  const distToMax = Math.abs(clickValue - props.modelValue[1]);

  currentHandle.value = distToMin < distToMax ? 'min' : 'max';
  updateValue(clickX);
  emit('change', props.modelValue);
};

const updateValue = (clientX: number) => {
  if (!currentHandle.value) return;

  const newValue = calculateValue(clientX);
  const values: [number, number] = [...props.modelValue];

  if (currentHandle.value === 'min') {
    values[0] = Math.min(Math.max(props.min, newValue), values[1] - (props.step || 0.1));
  } else {
    values[1] = Math.max(Math.min(props.max, newValue), values[0] + (props.step || 0.1));
  }

  emit('update:modelValue', values);
  emit('change', values);
};

const startDrag = (handle: 'min' | 'max', event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  currentHandle.value = handle;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
};

const handleDrag = (event: MouseEvent) => {
  if (!currentHandle.value) return;
  updateValue(event.clientX);
};

const stopDrag = () => {
  if (currentHandle.value) {
    const values = [...props.modelValue] as [number, number];
    emit('change', values);
    currentHandle.value = null;
  }
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const resetValues = () => {
  emit('update:modelValue', [props.min, props.max]);
  emit('change', [props.min, props.max]);
};
</script>
