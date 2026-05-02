/**
 * Get maximum character length among all (stringified) values of an object.
 * Ignores null/undefined (treats as empty string).
 * @param {Object} obj Key/value map like custom_toc_index.
 * @returns {number} Max length (0 if none).
 */
export function getMaxValueCharLength(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  let max = 0;
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const val = obj[key];
    if (val === null || val === undefined) continue;
    const len = String(val)?.trim()?.length;
    if (len > max) max = len;
  }
  if (max == 0) {
    return 0;
  }
  return max + 2;
}

/**
 * Generate exercise div value based on input.
 * Returns "Activity" for "primary" or "preprimary", otherwise "Exercise".
 * @param {string} value - The input value to check.
 * @returns {string} "Activity" or "Exercise".
 */
export function GenerateExerciseDiv(value) {
  if (!value || typeof value !== 'string') return 'Exercise ';
  
  const lowerValue = value.toLowerCase().trim();
  
  if (lowerValue === 'primary' || lowerValue === 'preprimary') {
    return 'Activity ';
  }
  
  return 'Exercise ';
}