/**
 * Extract font format from source URL
 * @param {string} srcUrl - Font source URL
 * @returns {string} Font format identifier
 */
const getFontFormat = (srcUrl) => {
  const cleanUrl = srcUrl.replace(/^url\(['"]?|['"]?\)$/g, '');
  
  if (cleanUrl.endsWith('.woff2')) return 'woff2';
  if (cleanUrl.endsWith('.woff')) return 'woff';
  if (cleanUrl.endsWith('.ttf')) return 'truetype';
  if (cleanUrl.endsWith('.otf')) return 'opentype';
  if (cleanUrl.endsWith('.eot')) return 'embedded-opentype';
  if (cleanUrl.endsWith('.svg')) return 'svg';
  
  return 'woff'; // default fallback
};

/**
 * Generate CSS @font-face rules from theme data
 * @param {Array} fontDefinitions - Array of font configurations
 * @returns {string} CSS font-face rules
 */
const generateFontFaceCSS = (fontDefinitions) => {
  if (!Array.isArray(fontDefinitions) || fontDefinitions.length === 0) {
    return '';
  }
  // console.log(fontDefinitions, "Font Definitions");

  return fontDefinitions
    .filter(font => font.fontFamily && font.src)
    .map(font => {
      const format = getFontFormat(font.src);
      const weight = font.fontWeight || 'normal';
      const style = font.fontStyle || 'normal';
      // console.log(font.src, "Font Source");
      return `
@font-face {
  font-family: "${font.fontFamily}";
  src: ${font.src} format('${format}'); // need to check what will happen here if the format is not present
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}`.trim();
    })
    .join('\n\n');
};

/**
 * Inject dynamic fonts into document
 * @param {Array} fontFaceArray - Font definitions from themeData
 */
export const loadDynamicFonts = (fontFaceArray) => {
  if (!Array.isArray(fontFaceArray) || fontFaceArray.length === 0) {
    console.log('No fonts to load dynamically');
    return;
  }

  const styleId = 'h5p-interactive-book-dynamic-fonts';
  let styleEl = document.getElementById(styleId);
  
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.type = 'text/css';
    document.head.prepend(styleEl);
  }

  const cssRules = generateFontFaceCSS(fontFaceArray);
  
  if (styleEl.styleSheet) {
    // IE support
    styleEl.styleSheet.cssText = cssRules;
  }
  else {
    styleEl.textContent = cssRules;
  }
};

/**
 * Clean up dynamically loaded fonts
 */
export const removeDynamicFonts = () => {
  const styleEl = document.getElementById('h5p-interactive-book-dynamic-fonts');
  if (styleEl) {
    styleEl.remove();
  }
};
