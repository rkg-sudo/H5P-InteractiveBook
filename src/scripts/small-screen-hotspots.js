/**
 * Small Screen Hotspot Enhancement Module
 * Provides additional enhancements for hotspots on small screens
 */

import { addResponsiveHotspotScaling } from './hotspot-scaling.js';

/**
 * Initialize small screen enhancements for hotspots
 * 
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - Container element for hotspots
 * @param {HTMLImageElement} options.imgElement - Image element
 * @param {Array} options.hotspots - Array of hotspot data
 * @param {Function} options.updateFunction - Function to update hotspot positions
 * @param {number} options.smallScreenBreakpoint - Breakpoint for small screen in pixels
 * @returns {Function} - Cleanup function to remove event listeners
 */
export function initializeSmallScreenHotspots({
  container,
  imgElement,
  hotspots,
  updateFunction,
  smallScreenBreakpoint = 768
}) {
  if (!container || !imgElement || !hotspots || !updateFunction) {
    console.warn('Missing required parameters for small screen hotspots');
    return () => {};
  }

  // Keep track of whether we're in small screen mode
  let isSmallScreen = window.innerWidth <= smallScreenBreakpoint;
  
  // Function to add small screen specific classes
  const applySmallScreenStyles = () => {
    const hotspotElements = container.querySelectorAll('.hotspot-clickable-area');
    
    hotspotElements.forEach(element => {
      if (isSmallScreen) {
        element.classList.add('small-screen');
        
        // Ensure every hotspot has the indicator for better visibility
        if (!element.querySelector('.hotspot-indicator')) {
          const indicator = document.createElement('div');
          indicator.classList.add('hotspot-indicator');
          element.appendChild(indicator);
        }
        
        // Remove any existing hotspot-label elements
        const existingLabels = element.querySelectorAll('.hotspot-label');
        existingLabels.forEach(label => label.remove());
      }
      else {
        element.classList.remove('small-screen');
        
        // Remove any existing hotspot-label elements regardless of screen size
        const existingLabels = element.querySelectorAll('.hotspot-label');
        existingLabels.forEach(label => label.remove());
      }
    });
  };
  
  // Function to handle screen size changes
  const handleScreenSizeChange = () => {
    const wasSmallScreen = isSmallScreen;
    isSmallScreen = window.innerWidth <= smallScreenBreakpoint;
    
    // Only update if the screen category changed
    if (wasSmallScreen !== isSmallScreen) {
      applySmallScreenStyles();
    }
    
    // Always update positions
    updateFunction();
  };
  
  // Add resize listener for screen size changes
  const cleanup = addResponsiveHotspotScaling(handleScreenSizeChange);
  
  // Apply initial styles
  applySmallScreenStyles();
  
  // Update positions initially
  updateFunction();
  
  // Return cleanup function
  return cleanup;
}

/**
 * Add touch-friendly enhancements to hotspots
 * 
 * @param {HTMLElement} container - Hotspot container
 */
export function enhanceTouchInteractions(container) {
  if (!container) return;
  
  // Get all hotspot elements
  const hotspotElements = container.querySelectorAll('.hotspot-clickable-area');
  
  hotspotElements.forEach(element => {
    // Remove any existing hotspot-label elements on touch
    element.addEventListener('touchstart', () => {
      const existingLabels = element.querySelectorAll('.hotspot-label');
      existingLabels.forEach(label => label.remove());
    });
  });
}
