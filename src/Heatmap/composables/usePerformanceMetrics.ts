import { ref, onMounted, onUnmounted } from 'vue';

export function usePerformanceMetrics() {
  const fps = ref(0);
  const frameTime = ref(0);
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let rafId: number;

  const measure = () => {
    const now = performance.now();

    // Calcula o tempo do frame
    frameTime.value = now - lastFrameTime;
    lastFrameTime = now;

    // Calcula FPS
    frameCount++;
    if (now - lastFpsUpdate >= 1000) { // Atualiza a cada segundo
      fps.value = frameCount;
      frameCount = 0;
      lastFpsUpdate = now;
    }

    rafId = requestAnimationFrame(measure);
  };

  onMounted(() => {
    rafId = requestAnimationFrame(measure);
  });

  onUnmounted(() => {
    cancelAnimationFrame(rafId);
  });

  return {
    fps,
    frameTime
  };
}
