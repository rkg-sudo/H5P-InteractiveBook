import { tocDescriptionDownArrow, tocDescriptionUpArrow } from "./icons";

// Flag set to true when a Hawthorn parent has sent its viewport info message
// let _lastParentDims = false;
// let _lastHeight = 0;
// let hawthornResizeTimer = null;
let _parentMsgHandler = null;
// let _resizeObserver = null;
// let _isObserving = false;

/**
 * Debounce function to limit the rate at which a function can fire
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to trigger on leading edge
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Throttle function to ensure a function is called at most once per specified time period
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function calculateFontSizeAtNewWidth(originalFontSizeRem, originalScreenWidthPx, newScreenWidthPx) {
  // Convert original font size from rem to px
  const originalFontSizePx = originalFontSizeRem * 16;

  // Calculate the scaling factor based on the new screen width
  const scalingFactor = newScreenWidthPx / originalScreenWidthPx;

  // Calculate the new font size in px
  const newFontSizePx = originalFontSizePx * scalingFactor;

  // Convert the new font size from px to rem
  const newFontSizeRem = newFontSizePx / 16;

  return {
    fontSizePx: newFontSizePx,
    fontSizeRem: newFontSizeRem
  };
}

export function generateClampCSS(minFont, preferredFont) {
  const defaultFontSize = 16;
  const originalScreenWidthPx = 1440;
  const newScreenWidthPx = 3560;
  const preferredFontSize = parseFloat(preferredFont);
  //const minFontSize = parseFloat(minFont);

  // Calculate the preferred value based on the max font size and default font size
  const preferredValue = ((preferredFontSize * defaultFontSize) / originalScreenWidthPx) * 100;

  // Calculate the new font size at the new screen width
  const maxFontSize = calculateFontSizeAtNewWidth(preferredFontSize, originalScreenWidthPx, newScreenWidthPx);

  // Return the clamp CSS value
  return `clamp(${minFont}, ${preferredValue}vw, ${maxFontSize.fontSizeRem}rem)`;
}

export function addDynamicStylesOnNode(node, stylesObject, screenView) {  
  // Assign the styles object to the node's style
  Object.assign(node.style, stylesObject);

  // Check if the stylesObject has a fontSize property
  if (stylesObject?.fontSize) {
    // Generate the clamp CSS value based on the mobile font size and the font size
    const clampCSS = generateClampCSS(stylesObject.mobile?.fontSize, stylesObject?.fontSize);

    // Apply the clamp CSS value to the node's font size
    node.style.fontSize = clampCSS;
  }

  // Check if the stylesObject has a fontColor property
  if (stylesObject.fontColor) {
    // Apply the font color to the node
    node.style.color = stylesObject.fontColor;
  }

  // Check if screenView is true and the stylesObject has a mobile fontSize property
  // if (screenView && stylesObject.mobile && stylesObject.mobile.fontSize) {
  //   // Apply the mobile fontSize to the node
  //   node.style.fontSize = stylesObject.mobile.fontSize;
  // }
}

// export function checkDevice() {
//   // Try to get parent dimensions. For same-origin frames we can read directly.
//   // For cross-origin, the parent may proactively send its dimensions via postMessage.
//   let parentWidth = null;
//   let parentHeight = null;
//   let parentSameOrigin = false;

//   // Determine if we're inside an iframe early so we don't reference it before declaration
//   const inIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

//   // ✅ Properly detect if iframe is truly cross-origin
//   let isTrulyCrossOrigin = false;
//   if (inIframe) {
//     try {
//       // Try to access parent location - will throw if cross-origin
//       const test = window.parent.location.href;
//       parentSameOrigin = true;
//     } 
//     catch (e) {
//       // Cross-origin - cannot access parent properties
//       isTrulyCrossOrigin = true;
//       parentSameOrigin = false;
//     }
//   }

//   // If the parent has proactively sent its dimensions via postMessage, prefer those.
//   if (_lastParentDims && typeof _lastParentDims.parentWidth === 'number') {
//     parentWidth = _lastParentDims.parentWidth;
//     parentHeight = _lastParentDims.parentHeight;
//     // Mark as cross-origin if we got dimensions via message (hawthorn iframe)
//     isTrulyCrossOrigin = true;
//     parentSameOrigin = false;
//   }
  
//   // ---- Cross-origin helpers - only for TRULY cross-origin iframes ----
//   const crossOriginIframe = inIframe && isTrulyCrossOrigin;

//   const ua = navigator.userAgent;
//   const isMobile = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
//   const pixelRatio = window.devicePixelRatio || 1;

//   if (crossOriginIframe) {
//     const outerHeight = inIframe
//       ? (typeof parentHeight === 'number' ? parentHeight : window.innerHeight)
//       : window.outerHeight;

//     const browserouterheight = isMobile ? outerHeight : Math.floor(outerHeight / pixelRatio); // check browser outer height
//     const browserHeight = inIframe ? outerHeight : window?.innerHeight; // check browser height

//     const crossOriginEffectiveWidth =
//       crossOriginIframe
//         ? (typeof parentWidth === 'number' ? parentWidth : window.innerWidth)
//         : null;

//     const crossOriginEffectiveHeight =
//       crossOriginIframe
//         ? (typeof parentHeight === 'number' ? parentHeight : window.innerHeight)
//         : null;

//     const safeWidth = crossOriginEffectiveWidth ?? window.innerWidth;
//     const safeHeight = crossOriginEffectiveHeight ?? window.innerHeight;

//     const mobileScreen = safeWidth <= 768;
//     const effectiveHeight = !mobileScreen ? 900 : safeHeight;
//     const effectiveWidth = safeWidth;

//     return {
//       mobile: mobileScreen,
//       height: Math.round(effectiveHeight),
//       browserHeight: Math.round(browserHeight),
//       width: Math.round(effectiveWidth),
//       responsive: isMobile,
//       pixelRatio: `${pixelRatio * 100}%`,
//     };
//   }
//   else {
//     // SAME-ORIGIN (or not in iframe): use original logic
//     const inIframe = window.self !== window.top;
//     // console.log(inIframe, "inIframe");
//     // console.log(window.parent, "window.parent");
//     const outerHeight = inIframe ? window.parent.outerHeight : window.outerHeight;
//     // const outerHeight = window.outerHeight; // For testing of IFrame
//     const browserouterheight = isMobile ? outerHeight : Math.floor(outerHeight / pixelRatio); // check browser outer height
//     const browserHeight = inIframe ? outerHeight : window?.innerHeight; // check browser height
//     const screenWidth = isMobile ? screen?.width : window?.innerWidth;
//     const mobileScreen = screenWidth <= 768;

//     let effectiveHeight = browserHeight;
//     if (inIframe && !mobileScreen) {
//       effectiveHeight = 900;
//     }

//     return {
//       mobile: mobileScreen,
//       height: Math.round(effectiveHeight),
//       browserHeight: Math.round(browserHeight),
//       width: Math.round(screenWidth),
//       responsive: isMobile,
//       pixelRatio: `${pixelRatio * 100}%`,
//     };
//   }
// }
export function checkDevice() {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const pixelRatio = window.devicePixelRatio || 1;
  const inIframe = window.self !== window.top;
  // console.log(inIframe, "inIframe");
  // console.log(window.parent, "window.parent");
  const outerHeight = inIframe ? window.parent.outerHeight : window.outerHeight;
  // const outerHeight = window.outerHeight; // For testing of IFrame
  const browserouterheight = isMobile ? outerHeight : Math.floor(outerHeight / pixelRatio); // check browser outer height
  const browserHeight = inIframe ? outerHeight : window?.innerHeight; // check browser height
  const screenWidth = isMobile ? screen?.width : window?.innerWidth;
  const mobileScreen = screenWidth <= 768;

  let effectiveHeight = browserHeight;
  if (inIframe && !mobileScreen) {
    effectiveHeight = 900;
  }

  return {
    mobile: mobileScreen,
    height: Math.round(effectiveHeight),
    browserHeight: Math.round(browserHeight),
    width: Math.round(screenWidth),
    responsive: isMobile,
    pixelRatio: `${pixelRatio * 100}%`,
  };
}

// Function to position the tooltip dynamically
export const positionTooltip = (tooltipPosition = 'bottom', tooltipElement) => {
  if (!tooltipElement) return;
  const tooltipPsudo = tooltipPosition === 'left' ? 'right' : tooltipPosition === 'right' ? 'left' : tooltipPosition;

  // Reset any existing positioning and classes
  tooltipElement.style.top = '';
  tooltipElement.style.bottom = '';
  tooltipElement.style.left = '';
  tooltipElement.style.right = '';
  tooltipElement.style.transform = '';
  tooltipElement.classList.remove('tooltip-top', 'tooltip-right', 'tooltip-bottom', 'tooltip-left');
  tooltipElement.classList.add(`tooltip-${tooltipPsudo}`);

  // Define spacing between tooltip and container (including arrow size)
  const spacing = 15;

  switch (tooltipPosition) {
    case 'right':
      tooltipElement.style.left = `calc(100% + ${spacing}px)`;
      tooltipElement.style.top = '50%';
      tooltipElement.style.transform = 'translateY(-50%)';
      break;

    case 'left':
      tooltipElement.style.right = `calc(100% + ${spacing}px)`;
      tooltipElement.style.top = '50%';
      tooltipElement.style.transform = 'translateY(-50%)';
      break;

    case 'top':
      tooltipElement.style.bottom = `calc(100% + ${spacing}px)`;
      tooltipElement.style.left = '50%';
      tooltipElement.style.transform = 'translateX(-50%)';
      break;

    case 'bottom':
    default:
      tooltipElement.style.top = `calc(100% + ${spacing}px)`;
      tooltipElement.style.left = '50%';
      tooltipElement.style.transform = 'translateX(-50%)';
      break;
  }

  const viewportAdjustment = adjustToViewport(tooltipElement);
  if (viewportAdjustment) {
    Object.assign(tooltipElement.style, viewportAdjustment);
  }

  return tooltipElement;
};

// Helper function to ensure tooltip stays within viewport
const adjustToViewport = (tooltipElement) => {
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const adjustments = {};

  // Check right edge
  if (tooltipRect.right > window.innerWidth) {
    adjustments.left = 'auto';
    adjustments.right = '0';
    adjustments.transform = 'none';
  }

  // Check left edge
  if (tooltipRect.left < 0) {
    adjustments.left = '0';
    adjustments.right = 'auto';
    adjustments.transform = 'none';
  }

  // Check top edge
  if (tooltipRect.top < 0) {
    adjustments.top = '0';
    adjustments.bottom = 'auto';
    adjustments.transform = 'none';
  }

  // Check bottom edge
  if (tooltipRect.bottom > window.innerHeight) {
    adjustments.top = 'auto';
    adjustments.bottom = '0';
    adjustments.transform = 'none';
  }

  return Object.keys(adjustments).length > 0 ? adjustments : null;
};


export const handleLongTocDescription = (chapterNode, chapterNodeTitle, isMobile = false) => {
  // ✅ CHECK IF DROPDOWN ALREADY EXISTS - PREVENT DUPLICATES
  const existingDropdown = chapterNodeTitle.querySelector('.toc-des-icon-toggle-wrapper');
  if (existingDropdown) {
    return; // Exit early if dropdown already exists
  }

  const itemDescription = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-item-description');
  const descriptionText = itemDescription.innerHTML;
  let isTrunc = false;
  const computedStyle = window.getComputedStyle(itemDescription);
  if (computedStyle.webkitLineClamp && parseInt(computedStyle.webkitLineClamp, 10) > 1) {
    isTrunc = isMultiLineTruncated(itemDescription);
  } 
  else {
    isTrunc = isSingleLineTruncated(itemDescription);
  }
  // Mobile: show dropdown arrow for expand/collapse
  if (isTrunc) {
    if (isMobile) {
      const toggleWrapper = document.createElement('div');
      toggleWrapper.classList.add('toc-des-icon-toggle-wrapper');
      // toggleWrapper.style.marginRight = generateClampCSS("0.625rem", "0.625rem");
      const toggleButton = document.createElement('span');
      toggleButton.classList.add('toggle-description');
      toggleButton.innerHTML = tocDescriptionDownArrow;
      toggleButton.setAttribute('role', 'button');
      toggleButton.setAttribute('aria-label', 'Expand description');
      let expanded = false;
      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        expanded = !expanded;
        if (expanded) {
          itemDescription.classList.add('expanded');
          itemDescription.textContent = decodeHtmlEntities(descriptionText);
          toggleButton.innerHTML = tocDescriptionUpArrow;
          toggleButton.setAttribute('aria-label', 'Collapse description');
        } 
        else {
          itemDescription.classList.remove('expanded');
          itemDescription.textContent = decodeHtmlEntities(descriptionText);
          toggleButton.innerHTML = tocDescriptionDownArrow;
          toggleButton.setAttribute('aria-label', 'Expand description');
        }
      });

      toggleWrapper.appendChild(toggleButton);
      chapterNodeTitle.appendChild(toggleWrapper);
    } 
    else {
      // Desktop: show tooltip on hover/focus
      let tooltip = null;
      const showTooltip = () => {
        if (tooltip) return;
        tooltip = document.createElement('div');
        tooltip.className = 'toc-description-tooltip';
        tooltip.textContent = decodeHtmlEntities(descriptionText);
        document.body.appendChild(tooltip);

        const rect = itemDescription.getBoundingClientRect();
        const topPosition = rect.top + window.scrollY + (rect.height / 2) - (tooltip.offsetHeight / 2);
        const OVERLAP_PX = 8;
        const tooltipWidth = tooltip.offsetWidth;
        const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
        let leftPosition = isRTL
          ? rect.left + window.scrollX - tooltipWidth + OVERLAP_PX
          : rect.right + window.scrollX - OVERLAP_PX;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        if (leftPosition + tooltipWidth > viewportWidth - 4) leftPosition = viewportWidth - tooltipWidth - 4;
        if (leftPosition < 4) leftPosition = 4;
        tooltip.style.left = `${Math.round(leftPosition)}px`;
        tooltip.style.top = `${Math.round(topPosition)}px`;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.setAttribute('aria-hidden', 'false');
        tooltip.style.pointerEvents = 'none';
        tooltip.style.visibility = 'visible';
        tooltip.style.fontSize = generateClampCSS("0.875rem", "0.875rem");
        tooltip.style.paddingTop = generateClampCSS("0.5rem", "0.5rem");
        tooltip.style.paddingRight = generateClampCSS("0.75rem", "0.75rem");
        tooltip.style.paddingBottom = generateClampCSS("0.5rem", "0.5rem");
        tooltip.style.paddingLeft = generateClampCSS("0.75rem", "0.75rem");
        tooltip.style.gap = generateClampCSS("0.625rem", "0.625rem");
        tooltip.style.opacity = '1';
      };
      const hideTooltip = () => {
        if (!tooltip) return;
        document.body.removeChild(tooltip);
        tooltip = null;
      };
      itemDescription.addEventListener('mouseenter', showTooltip);
      itemDescription.addEventListener('mouseleave', hideTooltip);
      itemDescription.setAttribute('tabindex', '0');
      itemDescription.addEventListener('focus', showTooltip);
      itemDescription.addEventListener('blur', hideTooltip);
      itemDescription.addEventListener('touchstart', (e) => {
        if (tooltip) hideTooltip(); else showTooltip();
        e.stopPropagation();
      }, { passive: true });
      window.addEventListener('resize', hideTooltip);
    }
  }
};

const isSingleLineTruncated = (el) => {
  return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
};

const isMultiLineTruncated = (el) => {
  const computedStyle = window.getComputedStyle(el);
  const lineClamp = parseInt(computedStyle.webkitLineClamp || computedStyle.lineClamp || 1, 10);
  const lineHeight = parseFloat(computedStyle.lineHeight);
  const actualHeight = el.offsetHeight;
  const actualLines = Math.round(actualHeight / lineHeight);

  return actualLines >= lineClamp && el.scrollHeight > el.clientHeight;
};

export const decodeHtmlEntities = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/**
 * Send postMessage to parent window/iframe dynamically
 * 
 * @param {string} type - The message type (e.g., 'activity-changed', 'chapter-changed')
 * @param {string} source - The source identifier (default: 'lesson-package')
 * @param {object} data - Optional additional data to include in the message
 * @returns {boolean} - Returns true if message was sent successfully, false otherwise
 */
export const sendPostMessage = (type, source = 'lesson-package', data = null) => {
  console.log(type, data, "Post Msg Data");
  // Check if we're running in an iframe environment
  const isInIframe = window.self !== window.top;
  
  if (!isInIframe) {
    console.warn('sendPostMessage: Not running in iframe, message not sent');
    return false;
  }

  // Additional safety check for parent window
  if (!window.parent || window.parent === window) {
    console.warn('sendPostMessage: No parent window found, message not sent');
    return false;
  }

  // Validate required parameters
  if (!type || typeof type !== 'string') {
    console.error('sendPostMessage: type parameter is required and must be a string');
    return false;
  }

  try {
    // Build the basic message payload
    const messagePayload = {
      type: type,
      source: source
    };

    // Add optional data if provided
    if (data && typeof data === 'object') {
      Object.assign(messagePayload, data);
    }

    // Send the message
    window.parent.postMessage(messagePayload, '*');
    
    console.log('PostMessage sent successfully:', messagePayload);
    return true;
    
  }
  catch (error) {
    console.error('Failed to send postMessage:', error);
    return false;
  }
};

/**
 * Create FOC (Front of Class) button with tooltip
 * @param {Object} options - Configuration options
 * @param {Object} options.themeData - Theme styling data
 * @param {Function} options.onClickHandler - Click event handler function
 * @param {Object} options.positioning - Positioning styles (optional)
 * @param {HTMLElement} options.parentElement - Parent element to append to
 * @param {Object} options.frontOfClassIcon - FOC icon HTML/SVG
 * @returns {HTMLElement} The created FOC container element
 */
export const createFOCButton = (options) => {
  const {
    themeData,
    onClickHandler,
    parentElement,
    frontOfClassIcon,
    isSimpleView = false
  } = options;

  // Create parent container for FOC tooltip with positioning context
  const focTooltipPrtContainer = document.createElement('div');
  focTooltipPrtContainer.classList.add("foc-tooltip-container");

  // Apply custom positioning if provided (for Simple View)
  if (isSimpleView) {
    focTooltipPrtContainer.style.right = generateClampCSS("2rem", "2rem");
  }
  // Create inner container to group icon and tooltip
  const container = document.createElement('div');
  container.classList.add("tooltip-container");
  focTooltipPrtContainer.appendChild(container);

  // Create FOC icon element and set its content
  const focIConElement = document.createElement('div');
  focIConElement.classList.add('front-of-class-icon');
  focIConElement.innerHTML = frontOfClassIcon; // SVG icon from icons.js

  // Apply theme styling if available
  if (themeData?.landingPageIcons?.teacherNotesIcon) {
    focIConElement.style.color = themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
    focIConElement.style.backgroundColor = themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
    
    focIConElement.addEventListener('mouseenter', () => {
      focIConElement.style.color = themeData?.landingPageIcons?.teacherNotesIcon?.hover?.iconColor;
      focIConElement.style.backgroundColor = themeData?.landingPageIcons?.teacherNotesIcon?.hover?.backgroundColor;
    });

    focIConElement.addEventListener('mouseleave', () => {
      focIConElement.style.color = themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
      focIConElement.style.backgroundColor = themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
    });
  }

  // Create tooltip element with text
  let tooltipElement = document.createElement("div"); 
  tooltipElement.classList.add("tooltip-popup");
  tooltipElement.innerText = "Page View";

  // Assemble the component hierarchy
  container.appendChild(focIConElement);
  container.appendChild(tooltipElement);

  // Show tooltip on hover using the utility function from utils.js
  focTooltipPrtContainer.addEventListener("mouseenter", () => {
    tooltipElement = positionTooltip('top', tooltipElement);
  });

  // Handle click event to activate Front of Class mode
  focIConElement.addEventListener('click', onClickHandler);

  // Append to parent element if provided
  if (parentElement) {
    parentElement.appendChild(focTooltipPrtContainer);
  }
};

/**
 * startParentDimensionListener
 * Listens for parent-sent messages of type 'parent-dimensions' and stores the last seen dimensions.
 *
 * @param {Function} cb - function(parentWidth, parentHeight)
 * @param {number} timeoutMs - how long to wait for a reply (default 1000ms)
 */
/**
 * Returns true if a Hawthorn parent has already sent its viewport info message.
 * Safe to call at any time after startParentDimensionListener() has been set up.
 */
// export function isHawthornParent() {
//   return _lastParentDims;
// }

// export function startParentDimensionListener() {
//   if (typeof window === "undefined" || typeof window.addEventListener !== "function") return () => {};

//   // prevent duplicates
//   if (_parentMsgHandler) window.removeEventListener("message", _parentMsgHandler);

//   _parentMsgHandler = (event) => {
//     try {
//       const data = event.data;
//       if (!data || typeof data !== "object") return;

//       // ✅ IMPORTANT: verify source + type (match your parent)
//       if (data.source !== "hawthorn") return;
//       if (data.type !== "HAWTHORN_VIEWPORT_INFO") return;

//       // ✅ parent sends width/height (not parentWidth/parentHeight)
//       // const pw = typeof data.width === "number" ? data.width : null;
//       // const ph = typeof data.height === "number" ? data.height : null;

//       // _lastParentDims = true;
//       // console.log('📨 Received parent dimensions:', _lastParentDims);
//     } 
//     catch (err) {
//       console.error('Error parsing parent message:', err);
//     }
//   };

//   window.addEventListener("message", _parentMsgHandler);

//   // ✅ cleanup
//   return () => {
//     if (_parentMsgHandler) window.removeEventListener("message", _parentMsgHandler);
//     _parentMsgHandler = null;
//     // _lastParentDims = false;
//   };
// }

/**
 * Start observing .h5p-content for size changes and auto-post height.
 * Uses ResizeObserver for accurate, event-driven measurement.
 * @returns {void}
 */
// export function startHeightObserver() {
//   if (_isObserving || typeof ResizeObserver === 'undefined') {
//     return;
//   }

//   const content = document.querySelector('.h5p-container');
//   if (!content) {
//     console.warn('⚠️ .h5p-container not found, will retry...');
//     setTimeout(startHeightObserver, 100);
//     return;
//   }

//   let debounceTimer = null;

//   _resizeObserver = new ResizeObserver((entries) => {
//     // Debounce rapid changes
//     clearTimeout(debounceTimer);
//     debounceTimer = setTimeout(() => {
//       for (const entry of entries) {
//         const height = Math.ceil(entry.contentRect.height);
        
//         // console.log('📐 ResizeObserver detected change:', {
//         //   height,
//         //   element: entry.target.className
//         // });

//         // Only post if parent is ready and height is valid
//         if (_lastParentDims && height >= 100) {
//           if (height !== _lastHeight) {
//             _lastHeight = height;
//             // console.log('✅ Auto-posting height:', height);
//             sendPostMessage("HAWTHORN_CHILD_SIZE", "lesson-package", { height });
//           }
//         } 
//         else if (!_lastParentDims) {
//           // console.log('⏳ Height ready but waiting for parent signal...');
//         }
//       }
//     }, 100); // 100ms debounce
//   });

//   _resizeObserver.observe(content);
//   _isObserving = true;
//   // console.log('👀 Started observing .h5p-container for size changes');
// }

/**
 * Stop observing height changes.
 * @returns {void}
 */
// export function stopHeightObserver() {
//   if (_resizeObserver) {
//     _resizeObserver.disconnect();
//     _resizeObserver = null;
//     _isObserving = false;
//     // console.log('🛑 Stopped height observer');
//   }
// }

/**
 * Manual height post (legacy/fallback method).
 * Use startHeightObserver() for automatic detection instead.
 * @param {Object} opts
 * @param {boolean} opts.force - ignore dedupe and always post
 * @returns {void}
 */
// export function postRootHeight(opts = {}) {
//   const allHeights = getAllH5PHeights();
//   const h = allHeights.h5pContentHeight;
  
//   // console.log('📏 Manual height check:', {
//   //   h5pContent: allHeights.h5pContentHeight,
//   //   h5pIframe: allHeights.h5pIframeHeight,
//   //   h5pContainer: allHeights.h5pContainerHeight,
//   //   selected: h
//   // });

//   // Validate height
//   if (!h || h < 100) {
//     console.warn('⚠️ Invalid height:', h);
//     return;
//   }

//   // Check if parent is ready
//   if (!_lastParentDims) {
//     console.warn('⏳ Parent not ready yet, height:', h);
//     return;
//   }

//   // Skip duplicates unless forced
//   if (!opts.force && h === _lastHeight) {
//     // console.log('⏭️ Height unchanged:', h);
//     return;
//   }

//   _lastHeight = h;
//   // console.log('✅ Posting height:', h);
//   sendPostMessage("HAWTHORN_CHILD_SIZE", "lesson-package", { height: h });
// }

// export function getAllH5PHeights() {
//   const content = document.querySelector('.h5p-content');
//   const iframe = document.querySelector('.h5p-iframe');
//   const container = document.querySelector('.h5p-container');

//   // Helper to measure any element safely with margins
//   const measure = (el) => {
//     if (!el) return 0;
    
//     const rectH = Math.ceil(el.getBoundingClientRect().height || 0);
//     const scrollH = Math.ceil(el.scrollHeight || 0);
//     const offsetH = Math.ceil(el.offsetHeight || 0);

//     // Include vertical margins
//     try {
//       const computedStyle = window.getComputedStyle(el);
//       const marginTop = parseFloat(computedStyle.marginTop) || 0;
//       const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
      
//       return Math.max(rectH, scrollH, offsetH) + marginTop + marginBottom;
//     } 
//     catch {
//       // Fallback if getComputedStyle fails
//       return Math.max(rectH, scrollH, offsetH);
//     }
//   };

//   const heights = {
//     h5pContentHeight: measure(content),
//     h5pIframeHeight: measure(iframe),
//     h5pContainerHeight: measure(container)
//   };

//   // Return the maximum height as the most accurate measurement
//   heights.maxHeight = Math.max(
//     heights.h5pContentHeight,
//     heights.h5pIframeHeight,
//     heights.h5pContainerHeight
//   );

//   return heights;
// }