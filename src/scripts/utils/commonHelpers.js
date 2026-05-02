/**
 * Common helper functions shared across multiple components
 */

import { generateClampCSS } from "../utils";

/**
 * Check if any custom index exists in the table of contents
 * @param {Array} toc - Table of contents array
 * @param {Object} customTocIndex - Custom TOC index object
 * @param {boolean} includeHome - Whether to include home in the check
 * @returns {boolean}
 */
export function hasAnyCustomIndex(toc = [], customTocIndex = {}, includeHome = true) {
  const hasItemCustomIndex = toc.some(item => 
    customTocIndex[item.activityId] !== undefined && 
    customTocIndex[item.activityId] !== null
  );
  
  const hasHomeCustomIndex = includeHome && 
    customTocIndex['home'] !== undefined && 
    customTocIndex['home'] !== null;
    
  return hasItemCustomIndex || hasHomeCustomIndex;
}

/**
 * Check if custom numbering object exists but all values are empty
 * @param {Object} customTocIndex - Custom TOC index object
 * @returns {boolean}
 */
export function hasEmptyCustomIndex(customTocIndex = {}) {
  if (Object.keys(customTocIndex).length === 0) return false;
  
  return Object.values(customTocIndex).every(value => 
    value === null || value === undefined || value === ''
  );
}

/**
 * Apply theme styles to an element
 * @param {HTMLElement} element - Target element
 * @param {Object} themeConfig - Theme configuration
 * @param {Object} options - Additional options
 */
export function applyThemeStyles(element, themeConfig = {}, options = {}) {
  if (!element || !themeConfig) return;

  const {
    backgroundColor,
    fontColor,
    fontSize,
    fontFamily,
    fontWeight,
    borderColor
  } = themeConfig;

  if (backgroundColor) {
    element.style.backgroundColor = backgroundColor;
  }
  
  if (fontColor) {
    element.style.color = fontColor;
  }
  
  if (fontSize) {
    element.style.fontSize = options.useClamp ? 
      generateClampCSS(fontSize, fontSize) : fontSize;
  }
  
  if (fontFamily) {
    element.style.fontFamily = fontFamily;
  }
  
  if (fontWeight) {
    element.style.fontWeight = fontWeight;
  }
  
  if (borderColor) {
    element.style.borderColor = borderColor;
  }
}

/**
 * Apply container theme styles (background, font family)
 * @param {HTMLElement} container - Container element
 * @param {Object} themeData - Theme data object
 */
export function applyContainerTheme(container, themeData = {}) {
  if (!container) return;

  const { backgroundColor, fontColor, fontFamily } = themeData;
  
  if (backgroundColor) {
    container.style.backgroundColor = backgroundColor;
  }
  
  if (fontColor) {
    container.style.color = fontColor;
  }
  
  if (fontFamily) {
    container.style.fontFamily = fontFamily;
  }
}

/**
 * Check if content is SVG URL
 * @param {string} content - Content to check
 * @returns {boolean} True if content is SVG URL
 */
export function isSvgUrl(content) {
  return (
    typeof content === "string" &&
    content.includes(".svg") &&
    (content.startsWith("http") || content.startsWith("url("))
  );
}

/**
 * Clean URL from CSS url() wrapper
 * @param {string} url - URL that might be wrapped in url()
 * @returns {string} Clean URL
 */
export function cleanUrl(url) {
  if (typeof url === 'string' && url.startsWith("url(") && url.endsWith(")")) {
    return url.slice(4, -1).replace(/['"]/g, "");
  }
  return url;
}

/**
 * Create hover effect handlers for theme-based styling
 * @param {HTMLElement} element - Target element
 * @param {Object} normalTheme - Normal state theme
 * @param {Object} hoverTheme - Hover state theme
 * @returns {Object} Object with addHoverEffect and removeHoverEffect methods
 */
export function createHoverEffectHandler(element, normalTheme, hoverTheme) {
  const addHoverEffect = () => {
    if (hoverTheme?.backgroundColor) {
      element.style.backgroundColor = hoverTheme.backgroundColor;
    }
  };

  const removeHoverEffect = () => {
    if (normalTheme?.backgroundColor) {
      element.style.backgroundColor = normalTheme.backgroundColor;
    }
  };

  return { addHoverEffect, removeHoverEffect };
}

/**
 * Initialize common properties for component classes
 * @param {Object} config - Configuration object
 * @param {Object} parent - Parent component
 * @returns {Object} Common properties object
 */
export function initializeCommonProps(config, parent) {
  const themeData = config?.themeData || parent?.params?.themeData || {};
  const customTocIndex = config?.custom_toc_index || parent?.params?.custom_toc_index || {};
  const isMobileView = parent?.isMobileView;
  const isSimpleView = parent?.isSimpleView;
  
  return {
    themeData,
    customTocIndex,
    isMobileView,
    isSimpleView,
    segment: parent?.segment
  };
}

/**
 * Analyze character composition for width estimation
 * @param {string} text - Text to analyze
 * @returns {number} Estimated width factor
 */
export function analyzeCharacterWidth(text) {
  if (!text) return 0;
  
  let totalWidth = 0;
  const weights = {
    upperCase: 1.0,
    lowerCase: 0.7,
    digit: 0.9,
    punctuation: 0.4,
    alphanumeric: 0.8
  };
  
  let lowerCaseCount = 0;
  let upperCaseCount = 0;
  const totalChars = text.length;
  
  for (const char of text) {
    if (/[A-Z]/.test(char)) {
      totalWidth += weights.upperCase;
      upperCaseCount++;
    } else if (/[a-z]/.test(char)) {
      totalWidth += weights.lowerCase;
      lowerCaseCount++;
    } else if (/[0-9]/.test(char)) {
      totalWidth += weights.digit;
    } else if (/[A-Za-z0-9]/.test(char)) {
      totalWidth += weights.alphanumeric;
    } else {
      totalWidth += weights.punctuation;
    }
  }
  
  // Adjust for predominantly lowercase text
  if (lowerCaseCount > upperCaseCount && lowerCaseCount > totalChars * 0.6) {
    totalWidth *= 0.95;
  }
  
  return totalWidth;
}

/**
 * Calculate dynamic width for navigation elements
 * @param {Object} customTocIndex - Custom TOC index object
 * @param {number} minWidth - Minimum width in rem
 * @param {number} maxWidth - Maximum width in rem
 * @returns {Object} Width configuration
 */
export function calculateDynamicWidth(customTocIndex = {}, minWidth = 5.6875, maxWidth = 10.5) {
  // Check if no custom index or all values are empty
  const hasCustom = Object.keys(customTocIndex).length > 0 && 
    Object.values(customTocIndex).some(value => 
      value !== null && value !== undefined && value !== ''
    );

  if (!hasCustom) {
    return { width: `${minWidth}rem`, useAutoWidth: false };
  }

  let maxEffectiveWidth = 0;
  Object.entries(customTocIndex)
    .filter(([, value]) => value !== null && value !== undefined)
    .forEach(([, value]) => {
      const strValue = String(value).trim();
      if (strValue.length > 0) {
        const effectiveWidth = analyzeCharacterWidth(strValue);
        maxEffectiveWidth = Math.max(maxEffectiveWidth, effectiveWidth);
      }
    });

  if (maxEffectiveWidth === 0) {
    return { width: `${minWidth}rem`, useAutoWidth: false };
  }

  // Add space for icon and padding
  const calculatedWidth = Math.max(minWidth, maxEffectiveWidth * 0.65 + 4.0);
  const clampedWidth = Math.min(maxWidth, calculatedWidth);

  return {
    width: `${clampedWidth}rem`,
    useAutoWidth: true,
    calculatedWidth: clampedWidth
  };
}
