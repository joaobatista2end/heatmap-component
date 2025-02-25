import { onUnmounted } from 'vue';

export function useRequestAnimationFrame() {
  let rafId: number | null = null;
  let isScheduled = false;

  const schedule = (callback: () => void) => {
    if (isScheduled) return;

    isScheduled = true;
    rafId = requestAnimationFrame(() => {
      callback();
      isScheduled = false;
      rafId = null;
    });
  };

  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      isScheduled = false;
      rafId = null;
    }
  };

  onUnmounted(() => {
    cancel();
  });

  return {
    schedule,
    cancel
  };
}
