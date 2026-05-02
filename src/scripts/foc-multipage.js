/**
 * Multi-Page FOC Proof of Concept
 * 
 * This module demonstrates how to handle both:
 * - Legacy single FOC object
 * - New multi-page FOC array
 * 
 * Key Features:
 * 1. Backward compatibility with existing single-page FOC
 * 2. Page navigation (prev/next buttons, page indicators)
 * 3. Isolated hotspot rendering per page
 * 4. Optimized rendering (only active page renders)
 */

import { backFOCNavIcon, nextFOCNavIcon } from './icons.js';
import { generateClampCSS } from './utils.js';

/**
 * Normalize FOC data to unified array format
 * Handles both legacy single object and new array structures
 * 
 * @param {Object|Array} focData - FOC data from params
 * @returns {Array} - Normalized array of FOC pages
 */
export function normalizeFOCData(focData) {
  // Handle null/undefined
  if (!focData) {
    console.warn('FOC data is null or undefined');
    return [];
  }

  // Case 1: Already an array (new format)
  if (Array.isArray(focData)) {
    // console.log('✅ Multi-page FOC detected (array format)', focData.length, 'pages');
    return focData.map((page, index) => ({
      ...page,
      pageIndex: index,
      pageId: page.pageId || `foc-page-${index}`,
      focTitle: page.focTitle || `Page ${index + 1}`
    }));
  }

  // Case 2: Wrapper object with pages array
  if (focData.pages && Array.isArray(focData.pages)) {
    // console.log('✅ Multi-page FOC detected (wrapper format)', focData.pages.length, 'pages');
    return focData.pages.map((page, index) => ({
      ...page,
      pageIndex: index,
      pageId: page.pageId || `foc-page-${index}`,
      focTitle: page.focTitle || `Page ${index + 1}`
    }));
  }

  // Case 3: Legacy single object (backward compatibility)
  if (focData.focData || focData.focHotspots) {
    // console.log('✅ Legacy single-page FOC detected');
    return [{
      ...focData,
      pageIndex: 0,
      pageId: focData.pageId || 'foc-page-0',
      focTitle: focData.focTitle || 'Page 1'
    }];
  }

  // console.error('❌ Invalid FOC data structure', focData);
  return [];
}

/**
 * Helper function to get all FOC hotspots from params.foc
 * Handles both legacy object format and new array format
 * 
 * @param {Object|Array} foc - FOC data from params
 * @returns {Array} - All hotspots from all FOC pages
 */
export function getAllFOCHotspots(foc) {
  if (!foc) return [];
  
  // Array format (multi-page) - combine all hotspots from all pages
  if (Array.isArray(foc)) {
    return foc.flatMap(page => page?.focHotspots || []);
  }
  
  // Wrapper object with pages array
  if (foc.pages && Array.isArray(foc.pages)) {
    return foc.pages.flatMap(page => page?.focHotspots || []);
  }
  
  // Legacy object format
  return foc?.focHotspots || [];
}

/**
 * Helper function to check if FOC has focPreview enabled
 * Handles both legacy object format and new array format
 * Returns true if ANY object in the array has focPreview === true
 * 
 * @param {Object|Array} foc - FOC data from params
 * @returns {boolean} - True if focPreview is enabled in any FOC object
 */
export function isFOCPreviewEnabled(foc) {
  if (!foc) return false;
  
  // Array format (multi-page) - check if ANY object has focPreview === true
  if (Array.isArray(foc)) {
    return foc.some(page => page?.focPreview === true);
  }
  
  // Wrapper object with pages array - check if ANY page has focPreview === true
  if (foc.pages && Array.isArray(foc.pages)) {
    return foc.pages.some(page => page?.focPreview === true);
  }
  
  // Legacy object format
  return foc?.focPreview === true;
}

/**
 * Multi-Page FOC Manager Class
 * Handles page state, navigation, and rendering coordination
 */
export class MultiPageFOCManager {
  /**
   * @param {Array} pages - Normalized array of FOC pages
   * @param {Object} options - Configuration options
   */
  constructor(pages, options = {}) {
    this.pages = pages;
    this.currentPageIndex = options.defaultPage || 0;
    this.enableNavigation = options.enableNavigation !== false;
    this.onPageChange = options.onPageChange || (() => {});
    
    // Validate
    if (!this.pages || this.pages.length === 0) {
      throw new Error('No FOC pages provided to manager');
    }

    // console.log('📚 Multi-Page FOC Manager initialized:', {
    //   totalPages: this.pages.length,
    //   currentPage: this.currentPageIndex,
    //   navigationEnabled: this.enableNavigation
    // });
  }

  /**
   * Get current page data
   * @returns {Object} - Current FOC page object
   */
  getCurrentPage() {
    return this.pages[this.currentPageIndex];
  }

  /**
   * Get hotspots for current page only
   * @returns {Array} - Hotspots array for current page
   */
  getCurrentHotspots() {
    const currentPage = this.getCurrentPage();
    return currentPage?.focHotspots || [];
  }

  /**
   * Get image data for current page
   * @returns {Object} - Image data object
   */
  getCurrentImageData() {
    const currentPage = this.getCurrentPage();
    return currentPage?.focData || null;
  }

  /**
   * Navigate to specific page
   * @param {number} pageIndex - Target page index
   * @returns {boolean} - Success status
   */
  goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= this.pages.length) {
      console.warn('Invalid page index:', pageIndex);
      return false;
    }

    if (pageIndex === this.currentPageIndex) {
      // console.log('Already on page', pageIndex);
      return false;
    }

    const oldPage = this.currentPageIndex;
    this.currentPageIndex = pageIndex;

    // console.log('📄 Page changed:', oldPage, '→', pageIndex);
    
    // Trigger callback with page change data
    this.onPageChange({
      oldPage,
      newPage: pageIndex,
      pageData: this.getCurrentPage()
    });

    return true;
  }

  /**
   * Navigate to next page
   * @returns {boolean} - Success status
   */
  nextPage() {
    if (!this.hasNextPage()) {
      // console.log('Already on last page');
      return false;
    }
    return this.goToPage(this.currentPageIndex + 1);
  }

  /**
   * Navigate to previous page
   * @returns {boolean} - Success status
   */
  prevPage() {
    if (!this.hasPrevPage()) {
      // console.log('Already on first page');
      return false;
    }
    return this.goToPage(this.currentPageIndex - 1);
  }

  /**
   * Check if next page exists
   * @returns {boolean}
   */
  hasNextPage() {
    return this.currentPageIndex < this.pages.length - 1;
  }

  /**
   * Check if previous page exists
   * @returns {boolean}
   */
  hasPrevPage() {
    return this.currentPageIndex > 0;
  }

  /**
   * Get total page count
   * @returns {number}
   */
  getTotalPages() {
    return this.pages.length;
  }

  /**
   * Check if multi-page mode (more than one page)
   * @returns {boolean}
   */
  isMultiPage() {
    return this.pages.length > 1;
  }

  /**
   * Reset to first page (without triggering onPageChange callback)
   * Used when re-entering FOC to start from page 1
   * @returns {boolean} - True if reset occurred, false if already on first page
   */
  resetToFirstPage() {
    if (this.currentPageIndex === 0) {
      // console.log('📄 Already on first page, no reset needed');
      return false;
    }
    
    const oldPage = this.currentPageIndex;
    this.currentPageIndex = 0;
    // console.log('📄 Reset to first page:', oldPage, '→', 0);
    return true;
  }

  /**
   * Get page navigation state
   * @returns {Object} - Navigation state object
   */
  getNavigationState() {
    return {
      currentPage: this.currentPageIndex + 1, // 1-indexed for display
      totalPages: this.getTotalPages(),
      hasNext: this.hasNextPage(),
      hasPrev: this.hasPrevPage(),
      isMultiPage: this.isMultiPage(),
      pageTitle: this.getCurrentPage()?.focTitle || ''
    };
  }
}

/**
 * Create page navigation UI controls
 * 
 * @param {MultiPageFOCManager} manager - FOC page manager instance
 * @param {Object} themeData - Theme styling data
 * @returns {HTMLElement} - Navigation controls container
 */
export function createFOCNavigationUI(manager, themeData = {}) {
  // Don't show navigation for single-page FOC
  if (!manager.isMultiPage()) {
    // console.log('Single-page FOC - navigation not needed');
    return null;
  }

  return createPaginationUI(manager, themeData);
}

/**
 * ========================================
 * PAGINATION UI
 * ========================================
 * Sliding window pagination with clickable page numbers
 * Features: 
 * - Maximum 5 page buttons visible at a time
 * - Arrow buttons shift the visible window (not FOC navigation)
 * - Page number clicks navigate to FOC pages
 * - Active page highlighting
 */
function createPaginationUI(manager, themeData = {}) {
  const MAX_VISIBLE_PAGES = 5; // Maximum page buttons visible at once
  const totalPages = manager.getTotalPages();
  
  // Pre-compute all clamp values once — reused across multiple elements
  const NAV_CONTAINER_WIDTH  = generateClampCSS('16.5625rem',   '16.5625rem'); // 265px at 1440px
  const NAV_CONTAINER_HEIGHT = generateClampCSS('3.125rem',  '3.125rem');  // 50px  at 1440px
  const NAV_BTN_SIZE         = generateClampCSS('1.875rem',  '1.875rem');  // 30px  at 1440px (shared by prev & next, width/height/min-width/min-height)
  const PAGE_BTN_SIZE        = generateClampCSS('1.5625rem', '1.5625rem'); // 25px  at 1440px (shared by width & height of every page button)

  // Track the starting index of the visible window (0-indexed)
  let windowStartIndex = 0;

  const navContainer = document.createElement('div');
  navContainer.classList.add('foc-page-navigation', 'foc-pagination');
  navContainer.style.width  = NAV_CONTAINER_WIDTH;
  navContainer.style.height = NAV_CONTAINER_HEIGHT;

  // Previous button (shifts window left)
  const prevButton = document.createElement('button');
  prevButton.classList.add('foc-nav-btn', 'foc-nav-prev');
  prevButton.innerHTML = backFOCNavIcon;
  prevButton.setAttribute('aria-label', 'Show previous pages');
  prevButton.style.width     = NAV_BTN_SIZE;
  prevButton.style.height    = NAV_BTN_SIZE;
  prevButton.style.minWidth  = NAV_BTN_SIZE;
  prevButton.style.minHeight = NAV_BTN_SIZE;

  // Pages container (holds page number buttons)
  const pagesContainer = document.createElement('div');
  pagesContainer.classList.add('foc-pages-container');

  // Next button (shifts window right)
  const nextButton = document.createElement('button');
  nextButton.classList.add('foc-nav-btn', 'foc-nav-next');
  nextButton.innerHTML = nextFOCNavIcon;
  nextButton.setAttribute('aria-label', 'Show next pages');
  nextButton.style.width     = NAV_BTN_SIZE;
  nextButton.style.height    = NAV_BTN_SIZE;
  nextButton.style.minWidth  = NAV_BTN_SIZE;
  nextButton.style.minHeight = NAV_BTN_SIZE;

  /**
   * Check if we can shift window left (show previous pages)
   */
  function canShiftLeft() {
    return windowStartIndex > 0;
  }

  /**
   * Check if we can shift window right (show next pages)
   * Returns true if there are more pages beyond current window
   */
  function canShiftRight() {
    return windowStartIndex + MAX_VISIBLE_PAGES < totalPages;
  }

  /**
   * Shift the visible window left by MAX_VISIBLE_PAGES
   */
  function shiftWindowLeft() {
    if (canShiftLeft()) {
      windowStartIndex = Math.max(0, windowStartIndex - MAX_VISIBLE_PAGES);
      renderPagination();
    }
  }

  /**
   * Shift the visible window right by MAX_VISIBLE_PAGES
   * Always ensures exactly MAX_VISIBLE_PAGES are shown.
   * If the next batch has fewer than MAX_VISIBLE_PAGES remaining,
   * backtrack so the last MAX_VISIBLE_PAGES pages are shown.
   * (e.g., 8 pages: [1-5] → [4-8])
   */
  function shiftWindowRight() {
    if (canShiftRight()) {
      const newStart = windowStartIndex + MAX_VISIBLE_PAGES;
      // If remaining pages from newStart are fewer than MAX_VISIBLE_PAGES,
      // anchor the window so the last MAX_VISIBLE_PAGES pages are always shown
      if (totalPages - newStart < MAX_VISIBLE_PAGES) {
        windowStartIndex = Math.max(0, totalPages - MAX_VISIBLE_PAGES);
      } else {
        windowStartIndex = newStart;
      }
      renderPagination();
    }
  }

  /**
   * Create a page number button
   */
  function createPageButton(pageNum, isActive = false) {
    const button = document.createElement('div');
    button.classList.add('foc-page-btn');
    button.textContent = pageNum;
    button.setAttribute('aria-label', `Go to page ${pageNum}`);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
    // Reuse pre-computed PAGE_BTN_SIZE constant (calculated once at createPaginationUI scope)
    button.style.width  = PAGE_BTN_SIZE;
    button.style.height = PAGE_BTN_SIZE;
    
    if (isActive) {
      button.classList.add('active');
    } 
    else {
      // Click navigates to FOC page (only for non-active buttons)
      button.addEventListener('click', () => {
        manager.goToPage(pageNum - 1); // Convert to 0-indexed
        renderPagination(); // Re-render to update active state
      });
    }
    
    return button;
  }

  /**
   * Update arrow button states based on window position
   */
  function updateArrowStates() {
    // Left arrow - disabled when at start
    prevButton.disabled = !canShiftLeft();
    
    // Right arrow - disabled when at end
    nextButton.disabled = !canShiftRight();
  }

  /**
   * Render the pagination UI
   */
  function renderPagination() {
    const currentPage = manager.getNavigationState().currentPage; // 1-indexed
    
    // Clear existing page buttons
    pagesContainer.innerHTML = '';
    
    // Calculate visible page range
    const endIndex = Math.min(windowStartIndex + MAX_VISIBLE_PAGES, totalPages);
    
    // Create buttons for visible pages
    for (let i = windowStartIndex; i < endIndex; i++) {
      const pageNum = i + 1; // Convert to 1-indexed for display
      const isActive = pageNum === currentPage;
      pagesContainer.appendChild(createPageButton(pageNum, isActive));
    }
    
    // Update arrow states
    updateArrowStates();
  }

  // Initial render
  renderPagination();

  // Event handlers for arrows (shift window, NOT navigate FOC)
  prevButton.addEventListener('click', () => {
    shiftWindowLeft();
  });

  nextButton.addEventListener('click', () => {
    shiftWindowRight();
  });

  // Assemble UI
  navContainer.appendChild(prevButton);
  navContainer.appendChild(pagesContainer);
  navContainer.appendChild(nextButton);

  // Expose update function for external calls (e.g., when FOC page changes externally)
  navContainer.updateIndicator = renderPagination;

  return navContainer;
}

/**
 * Integration example - how to use in FrontOfClassContent
 * 
 * This shows the minimal changes needed in foc.js constructor
 */
export function integrateMultiPageFOC(focData, onPageChange) {
  // Step 1: Normalize data (handles both old and new formats)
  const pages = normalizeFOCData(focData);
  
  if (pages.length === 0) {
    console.error('No valid FOC pages found');
    return null;
  }

  // Step 2: Create manager
  const manager = new MultiPageFOCManager(pages, {
    defaultPage: 0,
    enableNavigation: true,
    onPageChange: (changeData) => {
      // console.log('Page changed:', changeData);
      
      // Re-render image and hotspots for new page
      if (typeof onPageChange === 'function') {
        onPageChange(changeData);
      }
    }
  });

  return manager;
}

/**
 * Helper: Filter hotspots by page
 * Useful if backend sends all hotspots and we need to filter by page
 * 
 * @param {Array} allHotspots - All hotspots from all pages
 * @param {string} pageId - Page identifier
 * @returns {Array} - Filtered hotspots for specific page
 */
export function filterHotspotsByPage(allHotspots, pageId) {
  if (!Array.isArray(allHotspots)) {
    return [];
  }

  return allHotspots.filter(hotspot => {
    // Hotspot must have pageId property matching current page
    return hotspot.pageId === pageId;
  });
}

/**
 * POC Usage Example
 */
export function demonstratePOC() {
  // console.log('\n=== Multi-Page FOC POC Demo ===\n');

  // Example 1: Legacy single-page data
  const legacyData = {
    focData: { params: { path: 'image1.png' } },
    focHotspots: [{ id: 'h1', coords: [10, 20, 30, 40] }],
    focTitle: 'Q1'
  };

  // console.log('Test 1: Legacy Data');
  const pages1 = normalizeFOCData(legacyData);
  // console.log('Result:', pages1.length, 'page(s)');

  // Example 2: New multi-page array
  const multiPageData = [
    {
      focData: { params: { path: 'image1.png' } },
      focHotspots: [{ id: 'h1', coords: [10, 20, 30, 40] }],
      focTitle: 'Page 1',
      pageId: 'page-1'
    },
    {
      focData: { params: { path: 'image2.png' } },
      focHotspots: [{ id: 'h2', coords: [50, 60, 70, 80] }],
      focTitle: 'Page 2',
      pageId: 'page-2'
    }
  ];

  // console.log('\nTest 2: Multi-Page Array');
  const pages2 = normalizeFOCData(multiPageData);
  // console.log('Result:', pages2.length, 'page(s)');

  // Example 3: Manager usage
  // console.log('\nTest 3: Manager Navigation');
  const manager = new MultiPageFOCManager(pages2, {
    onPageChange: (data) => {
      // console.log('→ Page changed to:', data.newPage + 1);
      // console.log('→ Hotspots for this page:', manager.getCurrentHotspots().length);
    }
  });

  // console.log('Initial page:', manager.getCurrentPage().focTitle);
  manager.nextPage();
  // console.log('After next:', manager.getCurrentPage().focTitle);
  manager.prevPage();
  // console.log('After prev:', manager.getCurrentPage().focTitle);

  // console.log('\n=== POC Demo Complete ===\n');
}
