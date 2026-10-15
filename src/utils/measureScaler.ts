/**
 * Smart Culinary Ingredient Measurement Scaler
 * Dynamically scales ingredient portions (e.g., "200g", "2 tbsp", "1/2 cup", "4 cloves")
 * based on selected recipe serving size.
 */

// Parse fractional string like "1/2", "1 1/2", or "0.75" into a float
function parseAmount(val: string): number | null {
  val = val.trim();
  if (!val) return null;

  // Mixed fraction like "1 1/2"
  if (val.includes(' ') && val.includes('/')) {
    const parts = val.split(' ');
    const whole = parseFloat(parts[0]);
    const fracParts = parts[1].split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (den !== 0) return whole + num / den;
    }
  }

  // Simple fraction like "1/2" or "3/4"
  if (val.includes('/')) {
    const fracParts = val.split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (den !== 0) return num / den;
    }
  }

  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

// Format scaled number back to a pleasant cooking measurement
function formatScaledAmount(val: number): string {
  if (val <= 0) return '';

  // Near common fractions
  const whole = Math.floor(val);
  const frac = val - whole;

  if (Math.abs(frac - 0.5) < 0.05) {
    return whole > 0 ? `${whole} ½` : '½';
  }
  if (Math.abs(frac - 0.25) < 0.05) {
    return whole > 0 ? `${whole} ¼` : '¼';
  }
  if (Math.abs(frac - 0.75) < 0.05) {
    return whole > 0 ? `${whole} ¾` : '¾';
  }
  if (Math.abs(frac - 0.33) < 0.05) {
    return whole > 0 ? `${whole} ⅓` : '⅓';
  }
  if (Math.abs(frac - 0.67) < 0.05) {
    return whole > 0 ? `${whole} ⅔` : '⅔';
  }

  // Integer or decimal with at most 1 decimal place
  if (Math.abs(val - Math.round(val)) < 0.05) {
    return Math.round(val).toString();
  }

  return val.toFixed(1).replace(/\.0$/, '');
}

/**
 * Scale an ingredient measurement string according to serving ratio
 * e.g., scaleMeasure("200g", 2, 4) -> "400g"
 * e.g., scaleMeasure("1/2 cup", 2, 4) -> "1 cup"
 * e.g., scaleMeasure("Salt to taste", 2, 4) -> "Salt to taste"
 */
export function scaleMeasure(measure: string, baseServings: number, targetServings: number): string {
  if (!measure || baseServings <= 0 || targetServings <= 0 || baseServings === targetServings) {
    return measure;
  }

  const ratio = targetServings / baseServings;

  // Match leading quantity pattern:
  // e.g. "1 1/2 cups", "200 g", "3.5 tbsp", "1/4 tsp", "2-3 cloves"
  const regex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(.*)$/;
  const match = measure.match(regex);

  if (!match) {
    // Check range like "2-3 cloves"
    const rangeRegex = /^(\d+)\s*[-–]\s*(\d+)(.*)$/;
    const rangeMatch = measure.match(rangeRegex);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]) * ratio;
      const high = parseFloat(rangeMatch[2]) * ratio;
      return `${formatScaledAmount(low)}-${formatScaledAmount(high)}${rangeMatch[3]}`;
    }
    return measure;
  }

  const parsed = parseAmount(match[1]);
  if (parsed === null) return measure;

  const scaled = parsed * ratio;
  return `${formatScaledAmount(scaled)}${match[2]}`;
}
