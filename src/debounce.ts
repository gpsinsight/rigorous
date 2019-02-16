export function debounce(
  func: Function,
  wait: number,
  immediate?: boolean,
): () => void {
  let timeout;

  return function executedFunction() {
    /* tslint:disable */
    const context = this;
    /* tslint:enable */
    const args = arguments;

    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}
