/**
 * Hotspot Scaling Module
 * Handles responsive scaling of hotspots across different screen sizes
 */

/**
 * Scale a set of coordinates based on the current image dimensions
 * compared to the original dimensions
 * 
 * @param {Array} coords - Original coordinates [x1, y1, x2, y2]
 * @param {Object} originalDimensions - Original image dimensions {width, height}
 * @param {Object} currentDimensions - Current image dimensions {width, height}
 * @returns {Array} - Scaled coordinates
 */
export function scaleCoordinates(coords, originalDimensions, currentDimensions) {
  if (!coords || !originalDimensions || !currentDimensions) {
    console.warn('Missing parameters for coordinate scaling', { coords, originalDimensions, currentDimensions });
    return coords;
  }

  const widthRatio = currentDimensions.width / originalDimensions.width;
  const heightRatio = currentDimensions.height / originalDimensions.height;

  return coords.map((coord, index) => {
    // Even indices (0, 2, ...) are X coordinates, scale by width ratio
    // Odd indices (1, 3, ...) are Y coordinates, scale by height ratio
    return index % 2 === 0 ? coord * widthRatio : coord * heightRatio;
  });
}

/**
 * Get the current dimensions of an image element
 * 
 * @param {HTMLImageElement} imgElement - Image element
 * @returns {Object} - Current dimensions {width, height}
 */
export function getCurrentImageDimensions(imgElement) {
  if (!imgElement) {
    console.warn('Image element not provided for dimension calculation');
    return { width: 0, height: 0 };
  }

  return {
    width: imgElement.offsetWidth || imgElement.width,
    height: imgElement.offsetHeight || imgElement.height
  };
}

/**
 * Update the position and size of a hotspot element based on scaled coordinates
 * 
 * @param {HTMLElement} hotspotElement - Hotspot element to update
 * @param {Array} scaledCoords - Scaled coordinates [x1, y1, x2, y2]
 */
export function updateHotspotElement(hotspotElement, scaledCoords) {
  if (!hotspotElement || !scaledCoords || scaledCoords.length < 4) {
    console.warn('Missing parameters for hotspot update', { hotspotElement, scaledCoords });
    return;
  }

  const [x1, y1, x2, y2] = scaledCoords;
  
  // Calculate the position and dimensions
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  
  // Apply minimum dimensions for very small hotspots (better for touch devices)
  const minDimension = 30; // px
  const appliedWidth = Math.max(width, minDimension);
  const appliedHeight = Math.max(height, minDimension);
  
  // Center the hotspot if we're using minimum dimensions
  const adjustedLeft = width < minDimension ? left - ((minDimension - width) / 2) : left;
  const adjustedTop = height < minDimension ? top - ((minDimension - height) / 2) : top;
  
  // Update the hotspot element's style
  Object.assign(hotspotElement.style, {
    left: `${Math.max(0, adjustedLeft)}px`, // Prevent negative positioning
    top: `${Math.max(0, adjustedTop)}px`, // Prevent negative positioning
    width: `${appliedWidth}px`,
    height: `${appliedHeight}px`
  });
  
  // Update the area element's coords attribute if it exists
  const hotspotId = hotspotElement.dataset.hotspotId;
  if (hotspotId) {
    const areaElement = document.querySelector(`area[title*="${hotspotId}"]`);
    if (areaElement) {
      areaElement.coords = [x1, y1, x2, y2].join(',');
    }
  }
}

/**
 * Update all hotspots based on current image dimensions
 * 
 * @param {Array} hotspots - Array of hotspot data objects
 * @param {Object} originalDimensions - Original image dimensions
 * @param {HTMLImageElement} imgElement - Image element
 * @param {HTMLElement} container - Container element for hotspots
 */
export function updateAllHotspots(hotspots, originalDimensions, imgElement, container) {
  if (!hotspots || !originalDimensions || !imgElement || !container) {
    console.warn('Missing parameters for updating all hotspots');
    return;
  }
  
  const currentDimensions = getCurrentImageDimensions(imgElement);
  
  // Get all hotspot elements
  const hotspotElements = container.querySelectorAll('.hotspot-clickable-area');
  
  // Match hotspot elements with hotspot data using data-hotspot-id
  hotspotElements.forEach(element => {
    const hotspotId = element.dataset.hotspotId;
    if (hotspotId) {
      const hotspotData = hotspots.find(spot => spot.id === hotspotId);
      if (hotspotData && hotspotData.coords) {
        const scaledCoords = scaleCoordinates(
          hotspotData.coords, 
          originalDimensions,
          currentDimensions
        );
        updateHotspotElement(element, scaledCoords);
      }
    }
  });
}

/**
 * Add a debounced resize event listener for responsive hotspot scaling
 * 
 * @param {Function} updateFunction - Function to call when resize happens
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} - Function to remove the event listener
 */
export function addResponsiveHotspotScaling(updateFunction, delay = 150) {
  let resizeTimeout;
  
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateFunction();
    }, delay);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Return function to remove the listener if needed
  return () => {
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);
  };
}
