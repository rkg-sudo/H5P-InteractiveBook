/**
 * Hotspot Visibility Enhancer
 * Adds dynamic styles and behaviors to improve hotspot visibility
 */

/**
 * Initialize the hotspot visibility enhancer
 * 
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - Container element for hotspots
 * @param {boolean} options.useAnimation - Whether to use animations for hotspots
 * @param {boolean} options.showLabels - Whether to show labels on hover
 * @param {boolean} options.showIndicators - Whether to show indicator dots
 * @returns {Function} - Cleanup function to remove event listeners
 */
export function initHotspotVisibilityEnhancer({
  container,
  useAnimation = false,
  showLabels = true,
  showIndicators = false
}) {
  if (!container) {
    console.warn('Container element required for hotspot visibility enhancer');
    return () => {};
  }
  
  // Get all hotspot elements
  const hotspotElements = container.querySelectorAll('.hotspot-clickable-area');
  
  // Function to add indicator dots
  const addIndicators = () => {
    if (!showIndicators) {
      // Hide existing indicators when not needed
      hotspotElements.forEach(element => {
        const indicator = element.querySelector('.hotspot-indicator');
        if (indicator) {
          indicator.style.display = 'none';
        }
      });
      return;
    }
    
    // Otherwise show indicators
    hotspotElements.forEach(element => {
      const indicator = element.querySelector('.hotspot-indicator');      if (indicator) {
        indicator.style.display = 'block';
      } 
      else {
        const newIndicator = document.createElement('div');
        newIndicator.classList.add('hotspot-indicator');
        element.appendChild(newIndicator);
      }
    });
  };
    // Function to add animation class
  const addAnimations = () => {
    if (!useAnimation) {
      // Remove animation classes when not needed
      hotspotElements.forEach(element => {
        element.classList.remove('animated');
      });
      return;
    }
    
    // Otherwise add animation classes
    hotspotElements.forEach(element => {
      element.classList.add('animated');
    });
  };
  
  // Function to enhance hover behavior
  const enhanceHoverBehavior = () => {
    if (!showLabels) return;
    
    hotspotElements.forEach(element => {
      // Remove any existing hotspot-label elements
      const existingLabels = element.querySelectorAll('.hotspot-label');
      existingLabels.forEach(label => label.remove());
    });
    
    // Return empty cleanup function since we're not adding any listeners
    return () => {};
  };
  
  // Add enhancements
  addIndicators();
  addAnimations();
  const cleanupHover = enhanceHoverBehavior();
  
  // Return cleanup function
  return () => {
    if (cleanupHover) cleanupHover();
    
    // Remove animation classes
    if (useAnimation) {
      hotspotElements.forEach(element => {
        element.classList.remove('animated');
      });
    }
  };
}

/**
 * Add a sequential highlight effect to draw attention to hotspots
 * 
 * @param {HTMLElement} container - Container element for hotspots
 * @param {number} delayBetween - Delay between highlights in ms
 * @param {number} highlightDuration - Duration of highlight in ms
 * @returns {Function} - Function to stop the highlighting
 */
export function addSequentialHotspotHighlight(container, delayBetween = 700, highlightDuration = 500) {
  if (!container) return () => {};
  
  // Get all hotspot elements
  const hotspotElements = Array.from(container.querySelectorAll('.hotspot-clickable-area'));
  if (hotspotElements.length === 0) return () => {};
  
  let currentIndex = 0;
  let isRunning = true;
  
  // Create the highlight class if it doesn't exist
  if (!document.querySelector('#hotspot-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'hotspot-highlight-style';
    style.textContent = `
      .hotspot-highlight {
        animation: hotspot-highlight-pulse ${highlightDuration}ms ease-in-out;
      }
      
      @keyframes hotspot-highlight-pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 rgba(23, 104, 196, 0); }
        50% { transform: scale(1.1); box-shadow: 0 0 15px rgba(23, 104, 196, 0.8); }
        100% { transform: scale(1); box-shadow: 0 0 0 rgba(23, 104, 196, 0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Function to highlight the next hotspot
  const highlightNext = () => {
    if (!isRunning) return;
    
    // Remove highlight from all hotspots
    hotspotElements.forEach(element => {
      element.classList.remove('hotspot-highlight');
    });
    
    // Add highlight to the current hotspot
    hotspotElements[currentIndex].classList.add('hotspot-highlight');
    
    // Move to the next hotspot
    currentIndex = (currentIndex + 1) % hotspotElements.length;
    
    // Schedule the next highlight
    setTimeout(highlightNext, delayBetween);
  };
  
  // Start the highlighting
  highlightNext();
  
  // Return function to stop the highlighting
  return () => {
    isRunning = false;
    hotspotElements.forEach(element => {
      element.classList.remove('hotspot-highlight');
    });
  };
}
