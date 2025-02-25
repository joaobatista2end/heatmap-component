export function usePerformanceTest() {
  const startMark = 'heatmap-start';
  const endMark = 'heatmap-end';

  const startMeasure = () => {
    performance.mark(startMark);
  };

  const endMeasure = () => {
    performance.mark(endMark);
    performance.measure('heatmap-update', startMark, endMark);

    const measures = performance.getEntriesByName('heatmap-update');
    const lastMeasure = measures[measures.length - 1];

    console.log(`Heatmap update took: ${lastMeasure.duration.toFixed(2)}ms`);

    // Limpa as entradas para não acumular
    performance.clearMarks();
    performance.clearMeasures();
  };

  return {
    startMeasure,
    endMeasure
  };
}
