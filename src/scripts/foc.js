import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Modal } from "bootstrap";
import { addDynamicStylesOnNode, checkDevice, generateClampCSS, positionTooltip } from "./utils.js";
import {
  pearsonLogoIcon,
  backToCoverIcon,
  teachingNotesIcon,
  closeIcon,
  pearsonLogoIconMobile,
} from "./icons.js";

// Multi-page FOC support
import {
  normalizeFOCData,
  MultiPageFOCManager,
  createFOCNavigationUI,
  getAllFOCHotspots,
} from "./foc-multipage.js";
import { sendPostMessage } from "./utils.js";

/**
 * Front of Class module for Interactive Book
 * Handles the display of a full-screen teaching view with interactive hotspots
 */

// Constants
const FOC_SELECTORS = {
  MODAL: '.foc-teaching-notes-modal',
  HEADER: '.foc-main-header',
  HOTSPOT_BORDER: '.hotspot-border',
  CHAPTER: '.h5p-interactive-book-chapter',
  MODAL_BODY: '.foc-modal-body'
};

/**
 * Add global CSS rule to display chapter content in FOC modal
 */
function addFOCModalStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
      .foc-modal-body .h5p-interactive-book-chapter {
          display: block !important;
      }
      /* Force chapter wrapper visible inside FOC modal (normally hidden
         until :has(.h5p-interactive-book-current) matches, which doesn't
         apply inside the modal context). */
      .foc-modal-body .h5p-interactive-book-chapter-wrapper {
          display: flex !important;
          flex-direction: column;
          position: relative;
          min-height: 100%;
      }
      .foc-modal-body .recall-react-root {
          display: block !important;
      }
      /* Ensure the recall accordion and its overflow work inside modal */
      .foc-modal-body .recall-accordion {
          overflow: visible;
      }
      .foc-modal-body .recall-accordion__content-wrapper {
          overflow: visible;
      }
      /* Ensure the blocking overlay covers the entire modal content area */
      .foc-modal-body .recall-block-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
      }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Calculate header height and set it as a CSS variable
 * This ensures the content area is positioned correctly below the dynamic-sized header
 */
function calculateHeaderHeight() {
  const header = document.querySelector(FOC_SELECTORS.HEADER);
  if (header) {
    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty(
      "--header-height",
      `${headerHeight}px`
    );
  }
}

/**
 * Creates the main header for the front of class view
 *
 * @param {Object} params - Parameters containing titles and descriptions
 * @param {Object} themeData - Theme data for styling
 * @return {HTMLElement} The created header element
 */
export function createFOCHeader(params, themeData, isMobileView) {
  const header = document.createElement("div");
  header.classList.add("h5p-interactive-book-main-header", "foc-main-header");
  header.setAttribute("tabindex", "-1");

  // Apply theme styling
  if (themeData?.header?.backgroundColor) {
    header.style.backgroundColor = themeData.header.backgroundColor;
  }
  if (themeData?.header?.backgroundImage) {
    header.style.backgroundImage = `url(${H5P.getPath(
      themeData.header.backgroundImage
    )})`;
  }

  // Create header left content
  const headerLeftContent = createHeaderLeftContent(themeData, isMobileView);
  header.appendChild(headerLeftContent);

  // Create and add title/tagline section
  const title = params?.bookCover?.courseTitle || "Front of Class";
  const tagline = params?.bookCover?.coverTagline || "Interactive Learning";
  const logoTitle = createLogoTitleSection(title, tagline, themeData);
  header.appendChild(logoTitle);

  return header;
}

/**
 * Creates the left content section of the header
 * 
 * @param {Object} themeData - Theme data for styling
 * @return {HTMLElement} The header left content element
 */
function createHeaderLeftContent(themeData, isMobileView) {
  const headerleftContent = document.createElement("div");
  headerleftContent.classList.add(
    "h5p-interactive-book-main-header-left-content"
  );
  // if (isMobileView) {
  //   headerleftContent.style.height = generateClampCSS("2.563rem", "2.563rem");
  // } else {
  //   headerleftContent.style.height = generateClampCSS("4rem", "4rem");
  // }

  // Logo
  const logoElement = document.createElement("div");
  logoElement.classList.add("h5p-interactive-book-main-header-logo");
  logoElement.innerHTML = isMobileView ? pearsonLogoIconMobile : pearsonLogoIcon;
  // if (isMobileView) {
  //   logoElement.style.width = generateClampCSS("3.795rem", "3.795rem");
  //   logoElement.style.height = generateClampCSS("4rem", "4rem");
  // } else {
  //   logoElement.style.width = generateClampCSS("2.438rem", "2.438rem");
  //   logoElement.style.height = generateClampCSS("2.563rem", "2.563rem");
  // }

  const titleLogo = document.createElement("div");
  titleLogo.classList.add("h5p-interactive-book-main-title-logo");

  const displayPearsonLogo = themeData?.header?.displayPearsonLogo ?? true;

  if (displayPearsonLogo) {
    headerleftContent.appendChild(logoElement);
  }
  headerleftContent.appendChild(titleLogo);

  const focLogoURL = themeData?.header?.themeLogo?.logoURL || themeData?.header?.levelLogo;
  // const focLogoWidth = isMobileView
  //   ? themeData?.header?.themeLogo?.mobile?.logoWidth
  //   : themeData?.header?.themeLogo?.logoWidth;
  const focLogoWidth = themeData?.header?.themeLogo?.logoWidth;
  if (focLogoURL) {
    titleLogo.style.backgroundImage = `url(${H5P.getPath(focLogoURL)})`;
    if (focLogoWidth && !isMobileView) {
      titleLogo.style.width = focLogoWidth;
    }
  }

  return headerleftContent;
}

/**
 * Creates the logo title section with title and tagline
 * 
 * @param {string} title - The title text
 * @param {string} tagline - The tagline text
 * @param {Object} themeData - Theme data for styling
 * @return {HTMLElement} The logo title element
 */
function createLogoTitleSection(title, tagline, themeData) {
  const logoTitle = document.createElement("div");
  logoTitle.classList.add("h5p-interactive-book-main-header-logo-title");

  const titleElement = document.createElement("span");
  titleElement.textContent = title;

  const separatorElement = document.createElement("span");
  separatorElement.classList.add("separator");
  separatorElement.textContent = " | ";
  
  if (themeData?.header?.separatorMargin) {
    separatorElement.style.margin = themeData.header.separatorMargin;
  }

  const taglineElement = document.createElement("span");
  taglineElement.textContent = tagline;

  logoTitle.appendChild(titleElement);

  if (tagline) {
    logoTitle.appendChild(separatorElement);
    logoTitle.appendChild(taglineElement);
  }

  // Apply theme styling
  if (themeData?.header?.title) {
    addDynamicStylesOnNode(titleElement, themeData.header.title);
    if (themeData.header.title?.textTransform) {
      titleElement.style.textTransform = themeData.header.title.textTransform;
    }
  }

  if (themeData?.header?.tagline) {
    addDynamicStylesOnNode(taglineElement, themeData.header.tagline);
    addDynamicStylesOnNode(separatorElement, themeData.header.tagline);
    if (themeData.header.tagline?.textTransform) {
      taglineElement.style.textTransform =
        themeData.header.tagline.textTransform;
    }
  }

  return logoTitle;
}

/**
 * FrontOfClassContent class
 * Main class responsible for managing the Front of Class feature
 */
class FrontOfClassContent extends H5P.EventDispatcher {
  /**
   * @constructor
   * 
   * @param {Object} config - Configuration object
   * @param {number} contentId - Content ID
   * @param {Object} contentData - Content data
   * @param {Object} parent - Parent object
   */
  constructor(config, contentId, contentData, parent) {
    super();
    
    // Initialize properties
    this.parent = parent;
    this.contentId = contentId;
    this.config = config;
    this.contentData = contentData;
    this.themeData = parent.params.themeData;
    this.columnNodes = [];
    this.chapters = [];
    this.imageWrapper = null; // Store reference to image wrapper
    this.isInitialized = false; // Track initialization state
    this.isMobileView = checkDevice().mobile;

    // Initialize multi-page FOC support
    this.initializeMultiPageFOC();

    // Create container and initialize UI
    this.container = this.createContainer();
    this.initUI();
    
    // Initialize event handlers
    this.initEventHandlers();
    
    // Add CSS for modal chapter display
    addFOCModalStyles();
    
    // Initialize header height calculation
    this.initializeHeaderHeight();
    
    // Initialize zoom detection for consistent scrollbar height
    this.initializeZoomDetection();
  }
  
  /**
   * Initialize UI elements
   */
  initUI() {
    // Create loading overlay
    this.createLoadingOverlay();
    
    // Create the main content container
    const focContent = document.createElement("div");
    focContent.classList.add("foc-content");
    
    // Store reference to foc-content for sticky scrollbar
    window.addEventListener('resize', () => {
      const zoomLevel = window.devicePixelRatio;
      let stickyScrollbar = document.querySelector('.foc-sticky-scrollbar-container');
      if (zoomLevel <= 1.5) {
        focContent.style.overflowX = 'hidden';
        // Auto scroll to left when returning to normal zoom level
        focContent.scrollLeft = 0;   
        if (stickyScrollbar) {
          stickyScrollbar.style.display = 'none';
          stickyScrollbar.scrollLeft = 0; // Reset scrollbar position too
        }
      } 
      else {
        focContent.style.overflowX = 'auto';
        if (stickyScrollbar) {
          stickyScrollbar.style.display = 'block';
        }
      }
    });
    this.focContentElement = focContent;

    const leftPlaceholder = document.createElement("div");
    leftPlaceholder.style.flex = "1";
    leftPlaceholder.style.width = checkDevice().width * 0.1 + "px";
    leftPlaceholder.style.minWidth = checkDevice().width * 0.1 + "px";

    focContent.appendChild(leftPlaceholder);
    
    try {
      // Create a center wrapper for image and navigation (stacked vertically)
      const centerWrapper = document.createElement("div");
      centerWrapper.classList.add("foc-center-wrapper");
      
      // Add image wrapper with hotspot image
      const imageWrapper = this.createImageWrapper();
      this.imageWrapper = imageWrapper; // Store the reference for later use
      
      if (imageWrapper) {
        centerWrapper.appendChild(imageWrapper);
      }
      
      // Multi-page FOC: Add navigation UI if multiple pages exist
      // Add as sibling to imageWrapper inside centerWrapper
      if (this.pageManager && this.pageManager.isMultiPage()) {
        const navigationUI = createFOCNavigationUI(this.pageManager, this.themeData);
        if (navigationUI) {
          // Create parent wrapper for navigation with margin
          const navigationWrapper = document.createElement('div');
          navigationWrapper.classList.add('foc-navigation-wrapper');
          navigationWrapper.appendChild(navigationUI);
          
          // Append to centerWrapper (below imageWrapper)
          centerWrapper.appendChild(navigationWrapper);
          // Initially hide - will be shown when FOC becomes visible
          navigationUI.style.display = 'none';
          // Store reference for cleanup and visibility toggling
          this.focNavigationUI = navigationUI;
          // console.log('📍 Multi-page FOC navigation UI added as sibling to imageWrapper');
        }
      }
      
      // Add the center wrapper to focContent
      focContent.appendChild(centerWrapper);
      
      // Add icons wrapper with control buttons
      const iconsWrapper = this.createIconsWrapper();
      focContent.appendChild(iconsWrapper);
      
      // Add content to container
      this.container.appendChild(focContent);
      
      // Initialize sticky scrollbar after DOM is ready
      this.initializeStickyScrollbar();
    }
    catch (error) {
      console.error("Error initializing FOC UI:", error);
    }
  }
  
  /**
   * Initialize multi-page FOC support
   * Normalizes FOC data and creates page manager for navigation
   */
  initializeMultiPageFOC() {
    // console.log('🔧 initializeMultiPageFOC called');
    
    // Normalize FOC data to handle both legacy single-page and new multi-page formats
    const focPages = normalizeFOCData(this.parent.params.foc);
    
    // console.log('  → Normalized pages:', focPages.length, focPages);
    
    if (focPages.length > 0) {
      // Create page manager with callback for page changes
      this.pageManager = new MultiPageFOCManager(focPages, {
        defaultPage: 0,
        onPageChange: (changeData) => this.handleFOCPageChange(changeData)
      });
      
      // console.log('📚 FOC initialized with', this.pageManager.getTotalPages(), 'page(s)');
      // console.log('  → Current page image:', this.pageManager.getCurrentImageData());
      // console.log('  → Current page hotspots:', this.pageManager.getCurrentHotspots());
      
      // Log multi-page status
      // if (this.pageManager.isMultiPage()) {
      //   console.log('🔄 Multi-page mode enabled - Navigation UI will be shown');
      // } 
      // else {
      //   console.log('📄 Single-page mode - Using legacy behavior');
      // }
    } 
    else {
      console.warn('⚠️ No valid FOC pages found');
      this.pageManager = null;
    }
  }
  
  /**
   * Handle FOC page change event
   * Called when user navigates between pages in multi-page FOC
   * 
   * @param {Object} changeData - Page change event data
   * @param {number} changeData.oldPage - Previous page index
   * @param {number} changeData.newPage - New page index
   * @param {Object} changeData.pageData - Data for the new page
   */
  handleFOCPageChange(changeData) {
    // console.log('🔄 FOC page changed:', changeData.oldPage, '→', changeData.newPage);
    
    // Show loading overlay
    this.showLoader();
    
    // Disable navigation during transition
    this.disableNavigation(true);
    
    // Step 1: Clear existing hotspots
    if (this.hotspotContainer) {
      this.hotspotContainer.innerHTML = '';
      // console.log('  ✓ Cleared old hotspots');
    }
    
    // Step 1.5: Temporarily remove min-height to get accurate content dimensions
    // This allows Fit to Screen mode to receive actual image height
    if (this.focContentElement) {
      this.focContentElement.style.minHeight = '0';
    }
    
    // Step 2: Update image source for new page (with lazy loading)
    const newImageData = this.pageManager.getCurrentImageData();
    if (this.imgElement && newImageData?.params?.path) {
      const newImagePath = H5P.getPath(newImageData.params.path, this.contentId);
      
      // Use lazy loading - wait for image to load before proceeding
      this.loadImage(newImagePath).then(() => {
        // console.log('  ✓ Image loaded successfully');
        
        // Update stored dimensions
        this.originalImageDimensions = {
          width: newImageData?.width || newImageData?.params?.width || 0,
          height: newImageData?.height || newImageData?.params?.height || 0
        };
        
        // Step 3: Add new hotspots for current page
        const newHotspots = this.pageManager.getCurrentHotspots();
        if (newHotspots.length > 0 && this.hotspotContainer) {
          newHotspots.forEach(hotSpot => {
            if (hotSpot) {
              this.addHotspot(hotSpot, this.hotspotContainer);
            }
          });
          // console.log('  ✓ Added', newHotspots.length, 'hotspots for new page');
        }
        
        // Update stored reference
        this.focHotspots = newHotspots;
        
        // Step 4: Recalculate positions after DOM update
        requestAnimationFrame(() => {
          this.ensureImageWrapperPositioning();
          this.updateHotspotPositions();
          this.updateStickyScrollbar();
          // console.log('  ✓ Recalculated hotspot positions');
          
          // Hide loader after everything is ready
          setTimeout(() => {
            this.hideLoader();
            this.disableNavigation(false);
            
            // Update navigation indicator after page change completes
            this.updateNavigationIndicator();
            
            // Step 5: Send height to parent after all DOM updates complete
            // This ensures parent receives accurate height after image loads and layout stabilizes
            // postRootHeight({ force: true });
            
            // Step 6: Apply adaptive min-height based on content size and mode
            this.applyAdaptiveMinHeight();
          }, 100);
        });
        
        // console.log('✅ Page change complete');
      }).catch(err => {
        console.error('Failed to load image:', err);
        this.hideLoader();
        this.disableNavigation(false);
        this.updateNavigationIndicator(); // Update navigation even on error
      });
    } 
    else {
      // No image to load, hide loader immediately and update navigation
      this.hideLoader();
      this.disableNavigation(false);
      this.updateNavigationIndicator();
    }
  }
  
  /**
   * Update the navigation indicator UI (page number display and button states)
   * Called when page is reset to first page on FOC re-entry
   */
  updateNavigationIndicator() {
    if (this.focNavigationUI && typeof this.focNavigationUI.updateIndicator === 'function') {
      this.focNavigationUI.updateIndicator();
      // console.log('📍 Navigation indicator updated');
    }
  }
  
  /**
   * Create loading overlay element
   */
  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.classList.add('foc-loading-overlay');
    
    const loader = document.createElement('div');
    loader.classList.add('foc-loader');
    
    const spinner = document.createElement('div');
    spinner.classList.add('foc-spinner');
    // Pre-compute once and reuse for both width and height (48px at 1440px viewport)
    const spinnerSize = generateClampCSS('3rem', '3rem');
    spinner.style.width  = spinnerSize;
    spinner.style.height = spinnerSize;
    
    const loadingText = document.createElement('div');
    loadingText.classList.add('foc-loading-text');
    loadingText.textContent = 'Loading...';
    // Apply responsive font size via generateClampCSS (14px at 1440px viewport)
    loadingText.style.fontSize = generateClampCSS('0.875rem', '0.875rem');
    
    loader.appendChild(spinner);
    loader.appendChild(loadingText);
    overlay.appendChild(loader);
    
    this.loadingOverlay = overlay;
    document.body.appendChild(overlay);
  }
  
  /**
   * Show loading overlay
   */
  showLoader() {
    if (this.loadingOverlay) {
      requestAnimationFrame(() => {
        this.loadingOverlay.classList.add('visible');
      });
    }
  }
  
  /**
   * Hide loading overlay
   */
  hideLoader() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('visible');
    }
  }
  
  /**
   * Lazy load image with promise
   * @param {string} imagePath - Path to the image
   * @returns {Promise} - Resolves when image is loaded
   */
  loadImage(imagePath) {
    return new Promise((resolve, reject) => {
      if (!this.imgElement) {
        reject(new Error('Image element not found'));
        return;
      }
      
      // If image is already loaded and it's the same path, resolve immediately
      if (this.imgElement.src === imagePath && this.imgElement.complete) {
        resolve();
        return;
      }
      
      const onLoad = () => {
        this.imgElement.removeEventListener('load', onLoad);
        this.imgElement.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = (err) => {
        this.imgElement.removeEventListener('load', onLoad);
        this.imgElement.removeEventListener('error', onError);
        reject(err);
      };
      
      this.imgElement.addEventListener('load', onLoad);
      this.imgElement.addEventListener('error', onError);
      
      // Set the new image source
      this.imgElement.src = imagePath;
    });
  }
  
  /**
   * Disable or enable navigation controls
   * @param {boolean} disabled - Whether to disable navigation
   */
  disableNavigation(disabled) {
    if (this.focNavigationUI) {
      if (disabled) {
        this.focNavigationUI.classList.add('disabled');
      } 
      else {
        this.focNavigationUI.classList.remove('disabled');
      }
    }
  }

  /**
   * Get the first FOC data object (focData) from params.foc
   * Handles both legacy object format and new array format
   * 
   * @returns {Object|null} - First focData object or null
   */
  getFirstFOCData() {
    const foc = this.parent?.params?.foc;
    if (!foc) return null;
    
    // Array format (multi-page) - return first page's focData
    if (Array.isArray(foc)) {
      return foc.length > 0 ? foc[0]?.focData : null;
    }
    
    // Wrapper object with pages array
    if (foc.pages && Array.isArray(foc.pages)) {
      return foc.pages.length > 0 ? foc.pages[0]?.focData : null;
    }
    
    // Legacy object format
    return foc?.focData || null;
  }

  /**
   * Initialize event handlers
   */
  initEventHandlers() {
    this.on("hotspotClicked", (obj) => this.handleHotspotClick(obj.data));
    
    // Initialize sticky scrollbar event handlers
    this.initializeStickyScrollbarEvents();
  }
  
  /**
   * Initialize sticky scrollbar functionality
   */
  initializeStickyScrollbar() {
    // Create sticky scrollbar container
    this.stickyScrollbarContainer = document.createElement("div");
    this.stickyScrollbarContainer.classList.add("foc-sticky-scrollbar-container");
    
    // Create the content div that will determine scrollbar width
    this.stickyScrollbarContent = document.createElement("div");
    this.stickyScrollbarContent.classList.add("foc-sticky-scrollbar-content");
    
    this.stickyScrollbarContainer.appendChild(this.stickyScrollbarContent);
    document.body.appendChild(this.stickyScrollbarContainer);
    
    // Set up initial state
    this.updateStickyScrollbar();
  }
  
  /**
   * Initialize sticky scrollbar event handlers
   */
  initializeStickyScrollbarEvents() {
    if (!this.focContentElement) return;
    
    // Sync scrolling between main content and sticky scrollbar
    this.focContentElement.addEventListener('scroll', () => {
      if (this.stickyScrollbarContainer && !this.isScrollingSticky) {
        this.isScrollingMain = true;
        this.stickyScrollbarContainer.scrollLeft = this.focContentElement.scrollLeft;
        setTimeout(() => {
          this.isScrollingMain = false;
        }, 10);
      }
    });
    
    // Sync scrolling from sticky scrollbar to main content
    if (this.stickyScrollbarContainer) {
      this.stickyScrollbarContainer.addEventListener('scroll', () => {
        if (this.focContentElement && !this.isScrollingMain) {
          this.isScrollingSticky = true;
          this.focContentElement.scrollLeft = this.stickyScrollbarContainer.scrollLeft;
          setTimeout(() => {
            this.isScrollingSticky = false;
          }, 10);
        }
      });
    }
    
    // Update sticky scrollbar on window resize
    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.updateStickyScrollbar();
      }, 100);
    });
    
    // Update sticky scrollbar when content changes
    const resizeObserver = new ResizeObserver(() => {
      this.updateStickyScrollbar();
    });
    
    if (this.focContentElement) {
      resizeObserver.observe(this.focContentElement);
    }
  }
  
  /**
   * Update sticky scrollbar visibility and width
   */
  updateStickyScrollbar() {
    if (!this.focContentElement || !this.stickyScrollbarContainer || !this.stickyScrollbarContent) {
      return;
    }

    // Check if horizontal scrolling is needed by measuring actual content width
    // Look for the actual image or fallback div (when image fails)
    const imageElement = this.focContentElement.querySelector('.h5p-interactive-book-front-of-class-image')
      || this.focContentElement.querySelector('.foc-image-error-fallback');

    const centerWrapper = this.focContentElement.querySelector('.foc-center-wrapper');
    const containerWidth = this.focContentElement.clientWidth;

    let hasHorizontalScroll = false;

    if (imageElement && centerWrapper) {
      // Measure the actual content width (image + wrappers)
      const imageWidth = imageElement.offsetWidth || imageElement.clientWidth;
      const centerWrapperWidth = centerWrapper.offsetWidth || centerWrapper.clientWidth;

      // Check if content actually exceeds container
      // Use the larger of image or wrapper width
      const actualContentWidth = Math.max(imageWidth, centerWrapperWidth);
      hasHorizontalScroll = actualContentWidth > containerWidth;
    } 
    else {
      // Fallback to scroll measurement if elements not found
      // Use Math.ceil to handle sub-pixel rendering issues without affecting zoom
      hasHorizontalScroll = Math.ceil(this.focContentElement.scrollWidth) > Math.ceil(containerWidth);
    }

    if (hasHorizontalScroll) {
      // Show sticky scrollbar
      this.stickyScrollbarContainer.classList.add('visible');

      // Set the content width to match the scrollable content
      this.stickyScrollbarContent.style.width = `${this.focContentElement.scrollWidth}px`;
      
      // Sync scroll position
      this.stickyScrollbarContainer.scrollLeft = this.focContentElement.scrollLeft;
    } 
    else {
      // Hide sticky scrollbar
      this.stickyScrollbarContainer.classList.remove('visible');
    }
  }
  
  /**
   * Handle hotspot click event
   * 
   * @param {string} hotspotId - ID of the clicked hotspot
   */
  handleHotspotClick(hotspotId) {
    // Create a modal for displaying the activity
    const modalElement = this.createActivityModal();
    document.body.appendChild(modalElement);
    
    // Initialize and show the Bootstrap Modal
    const modal = new Modal(modalElement);
    modal.show();
    
    // Render columns in the modal with the specified hotspot ID
    this.renderColumnsInModal(modalElement, hotspotId);

    // Trigger message to parent iframe once the modal is completely open
    modalElement.addEventListener("shown.bs.modal", () => {
      sendPostMessage('scrollToActivityModal', 'lesson-package');
    });

    // Restore live pageContent column node and remove modal when hidden
    modalElement.addEventListener("hidden.bs.modal", () => {
      if (this._activeModalChapter) {
        const { columnNode, originalParent, nextSibling, tocIndex } = this._activeModalChapter;
        if (originalParent) {
          if (nextSibling && nextSibling.parentNode === originalParent) {
            originalParent.insertBefore(columnNode, nextSibling);
          }
          else {
            originalParent.appendChild(columnNode);
          }
        }

        // Refresh the recall accordion on the NEXT chapter so it shows the
        // updated state from any answers given inside the FOC modal.
        const nextChapter = this.parent?.pageContent?.chapters?.[tocIndex + 1];
        if (nextChapter?.recallAccordionInstance) {
          nextChapter.recallAccordionInstance.refresh();
        }

        this._activeModalChapter = null;
      }
      modalElement.remove();
    });
  }
  
  /**
   * Create activity modal for displaying chapter content
   * 
   * @return {HTMLElement} Modal element
   */
  createActivityModal() {
    const modalElement = document.createElement("div");
    modalElement.classList.add("modal", "fade");    modalElement.innerHTML = `
      <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <button type="button" class="modal-close-btn can_stop_reset" data-bs-dismiss="modal" aria-label="Close"></button>
        <div class="foc-modal-body">
        <!-- Activity content will be rendered here -->
        </div>
      </div>
      </div>
    `;
    return modalElement;
  }
  
  /**
   * Create image wrapper with hotspot image
   * 
   * @return {HTMLElement} Image wrapper element
   */
  createImageWrapper() {
    const imageWrapper = document.createElement("div");
    // imageWrapper.classList.add("foc-image-wrapper", "foc-content-left-pane");
    imageWrapper.appendChild(this.createImageElement());
    return imageWrapper;
  }
  
  /**
   * Create icons wrapper with control buttons
   * 
   * @return {HTMLElement} Icons wrapper element
   */
  createIconsWrapper() {
    const iconsWrapper = document.createElement("div");
    iconsWrapper.classList.add("foc-icons-wrapper", "foc-content-right-pane");
    // Ensure icons wrapper is the positioning context for absolute children
    iconsWrapper.style.position = 'relative';
    iconsWrapper.style.width = checkDevice().width * 0.1 + "px";
    iconsWrapper.style.minWidth = checkDevice().width * 0.1 + "px";

    // Add back to cover button
    const backToCoverElement = this.createBackToCoverButton("Default mode");
    iconsWrapper.appendChild(backToCoverElement);
    
    // Add teaching notes button if available and user is not a student
    // Same logic as in cover.js to ensure consistency across views
    if ((H5PIntegration?.role !== 'student') && (this.parent.params?.teachingNotes?.content)) {
      const teachingNotesIconElement = this.createTeachingNotesButton();
      iconsWrapper.appendChild(teachingNotesIconElement);
    }
    return iconsWrapper;
  }

  /**
   * Create back to cover button
   *
   * @return {HTMLElement} Back to cover button element
   */
  createBackToCoverButton(tooltipText) {
    // Create container for proper tooltip positioning
    const container = document.createElement("div");
    container.classList.add("tooltip-container");

    // Create the back button element with icon
    const backToCoverElement = document.createElement("div");
    backToCoverElement.classList.add("foc-icon", "foc-back-to-cover");
    backToCoverElement.innerHTML = backToCoverIcon; // SVG icon from icons.js

    if (this.themeData?.landingPageIcons?.teacherNotesIcon) {
      backToCoverElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
      backToCoverElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;

      backToCoverElement.addEventListener('mouseenter', () => {
        backToCoverElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.hover?.iconColor;
        backToCoverElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.hover?.backgroundColor;
      });

      backToCoverElement.addEventListener('mouseleave', () => {
        backToCoverElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
        backToCoverElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
      });
    }

    // Create tooltip element with text
    let tooltipElement = document.createElement("div");
    tooltipElement.classList.add("tooltip-popup");
    tooltipElement.innerText = tooltipText;

    // Position tooltip on hover using utility function from utils.js
    container.addEventListener("mouseenter", () => {
      tooltipElement = positionTooltip('left', tooltipElement);
    });

    // Assemble the component hierarchy
    container.appendChild(backToCoverElement);
    container.appendChild(tooltipElement);

    // Handle click event to exit Front of Class mode
    backToCoverElement.addEventListener("click", () => {
      if (this.themeData?.landingPageIcons?.teacherNotesIcon) {
        backToCoverElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
        backToCoverElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
      }
      
      // DISABLED: Reset multi-page FOC to first page before exiting
      // Requirement: FOC should remember the last visited page when user returns.
      // Keeping this commented in case the behaviour needs to be reverted in the future.
      // if (this.pageManager && this.pageManager.isMultiPage()) {
      //   this.pageManager.goToPage(0);
      // }
      
      // Trigger event to switch back to cover view
      this.parent.trigger("showFrontOfClass", { visibility: false });

      // Clean up: close and remove any open teaching notes modal
      const modal = document.querySelector(FOC_SELECTORS.MODAL);
      if (modal) {
        modal.style.display = "none";
        modal.remove();
      }
      
      // Hide multi-page navigation UI when leaving FOC (keep element for re-entry)
      if (this.focNavigationUI) {
        this.focNavigationUI.style.display = 'none';
        // console.log('🧹 Multi-page FOC navigation UI hidden');
      }
    });

    return container;
  }
  
  /**
   * Create teaching notes button
   * 
   * @return {HTMLElement} Teaching notes button element
   */
  createTeachingNotesButton() {
    const teachingNotesIconElement = document.createElement("div");
    teachingNotesIconElement.classList.add("foc-icon", "foc-teaching-notes");
    teachingNotesIconElement.innerHTML = teachingNotesIcon;
    
    teachingNotesIconElement.addEventListener("click", () => {
      this.showTeachingNotesModal();
    });

    if (this.themeData?.landingPageIcons?.teacherNotesIcon) {
      teachingNotesIconElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
      teachingNotesIconElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
      
      teachingNotesIconElement.addEventListener('mouseenter', () => {
        teachingNotesIconElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.hover?.iconColor;
        teachingNotesIconElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.hover?.backgroundColor;
      });

      teachingNotesIconElement.addEventListener('mouseleave', () => {
        teachingNotesIconElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
        teachingNotesIconElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
      });
    }
    
    return teachingNotesIconElement;
  }
  
  /**
   * Show teaching notes modal
   */
  showTeachingNotesModal() {
    // Check if modal already exists
    let modal = document.querySelector(FOC_SELECTORS.MODAL);

    // Helper to compute & apply position (align top-right of modal to button)
    const positionModalFixed = (modalEl, buttonEl) => {
      const btnRect = buttonEl.getBoundingClientRect();

      // Ensure modal is measured
      const measuredWidth = modalEl.getBoundingClientRect().width || modalEl.offsetWidth;

      // Compute left so modal's right edge == button's right edge
      let left = Math.round(btnRect.right - measuredWidth);

      // Apply optional overlap (positive moves modal to the right)
      const defaultOverlap = 10; // px
      const overlapFromTheme = this.themeData?.landingPageIcons?.teacherNotesIcon?.modalOverlap;
      const overlap = Number.isFinite(Number(overlapFromTheme)) ? Number(overlapFromTheme) : defaultOverlap;
      left = left + overlap;

      // Clamp to viewport with a small gutter
      const gutter = 8;
      left = Math.max(gutter, Math.min(left, Math.max(gutter, window.innerWidth - measuredWidth - gutter)));

      // Apply optional top offset (positive moves modal upward)
      const defaultTopOffset = 8; // px
      const topOffsetFromTheme = this.themeData?.landingPageIcons?.teacherNotesIcon?.modalTopOffset;
      const topOffset = Number.isFinite(Number(topOffsetFromTheme)) ? Number(topOffsetFromTheme) : defaultTopOffset;

      const top = Math.round(btnRect.top - topOffset);

      modalEl.style.left = `${left}px`;
      modalEl.style.top = `${top}px`;
      modalEl.style.right = 'auto';
    };

    if (!modal) {
      // Create new modal if it doesn't exist
      modal = document.createElement("div");
      modal.classList.add("foc-teaching-notes-modal");

      // Allow the modal to be wide and span viewport; position fixed to attach to viewport
      Object.assign(modal.style, {
        position: 'fixed',
        margin: '0',
        zIndex: '2000',
        boxSizing: 'border-box',
        maxWidth: 'calc(100% - 40px)',
        // visibility will be toggled during measurement
      });

      const content = document.createElement("div");
      content.classList.add("modal-content");
      const closeButton = document.createElement("span");

      if (this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal) {
        modal.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal?.backgroundColor;
        modal.style.borderColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal?.fontcolor;
        content.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal?.fontcolor;
      }

      closeButton.classList.add("foc-teaching-notes-modal-close");
      closeButton.innerHTML = closeIcon;

      if (this.themeData?.landingPageIcons?.teacherNotesIcon) {
        closeButton.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.closeIcon?.iconColor;
        closeButton.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.closeIcon?.backgroundColor;
      }

      const contentBody = document.createElement("div");
      contentBody.classList.add("modal-body");
      contentBody.innerHTML = this.parent.params?.teachingNotes?.content || "No teaching notes available";

      content.appendChild(closeButton);
      content.appendChild(contentBody);
      modal.appendChild(content);

      // Append to body and measure while hidden so modal can size freely across viewport
      modal.style.visibility = 'hidden';
      document.body.appendChild(modal);

      // Position relative to the teaching notes button (viewport coordinates)
      const focButton = document.querySelector('.foc-teaching-notes');
      if (focButton && this.container && this.container.classList.contains('foc-container')) {
        // Force reflow/measurement
        // Read width so the browser lays out the element
        const _ = modal.getBoundingClientRect().width;

        positionModalFixed(modal, focButton);
      } 
      else {
        // Fallback: center modal
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
      }

      modal.style.visibility = 'visible';

      // Close handler removes modal to avoid stale nodes
      closeButton.addEventListener("click", () => {
        modal.remove();
      });
    } 
    else {
      // Re-align existing modal to the button each time it's shown
      const focButton = document.querySelector('.foc-teaching-notes');
      if (focButton) {
        // Make sure modal is visible for measurement
        modal.style.visibility = 'hidden';
        // Force reflow
        const _ = modal.getBoundingClientRect().width;
        positionModalFixed(modal, focButton);
        modal.style.visibility = 'visible';
      }
      modal.classList.add("foc-teaching-notes-modal");
      modal.style.display = "block";
    }
  }
  
  /**
   * Initialize header height calculation
   */
  initializeHeaderHeight() {
    setTimeout(() => {
      calculateHeaderHeight();
      
      // Listen for window resize events
      window.addEventListener("resize", calculateHeaderHeight);
      
      // Recalculate after a delay to catch any layout changes
      setTimeout(calculateHeaderHeight, 500);
    }, 100);
  }

  /**
   * Initialize zoom detection for consistent scrollbar height
   */
  initializeZoomDetection() {
    const updateZoomLevel = () => {
      const zoomLevel = window.devicePixelRatio || 1;
      document.documentElement.style.setProperty('--browser-zoom', zoomLevel);
    };
    
    // Set initial zoom level
    updateZoomLevel();

    // Listen for zoom changes via resize events
    let zoomTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(updateZoomLevel, 50);
    });

    // Additional detection using visual viewport API if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateZoomLevel);
    }
  }

  /**
   * Create main container
   * 
   * @return {HTMLElement} Container element
   */
  createContainer() {
    const container = document.createElement("div");
    container.classList.add("foc-container");
    container.style.display = "flex";
    container.style.flex = "1";

    // Create and add the header
    const headerContainer = document.createElement("div");
    headerContainer.classList.add("foc-header");

    // Use the createFOCHeader function to create the header
    const header = createFOCHeader(this.parent.params, this.themeData, this.isMobileView);
    headerContainer.appendChild(header);

    container.appendChild(headerContainer);

    return container;
  }

  /**
   * Create image element with hotspot map
   * 
   * @return {HTMLElement} Image element with hotspot map
   */
  createImageElement() {
    const imgElement = document.createElement("img");
    
    // Multi-page FOC: Get image from current page (falls back to legacy single-page)
    // Use getFirstFOCData() for fallback to handle both array and object formats
    const focData = this.pageManager 
      ? this.pageManager.getCurrentImageData() 
      : this.getFirstFOCData();
    const imagePath = focData?.params?.path || '';
    
    // console.log('🖼️ createImageElement:');
    // console.log('  → pageManager exists:', !!this.pageManager);
    // console.log('  → focData:', focData);
    // console.log('  → imagePath:', imagePath);
    
    if (imagePath) {
      const fullPath = H5P.getPath(imagePath, this.contentId);
      // console.log('  → Full image path:', fullPath);
      imgElement.src = fullPath;
    }
    else {
      // Set a placeholder or default image if no path is available
      console.warn('  ⚠️ No image path found!');
      imgElement.src = '';
    }
    
    // Add error handler for image loading
    imgElement.addEventListener('error', (e) => {
      console.error('  ❌ Image failed to load:', imgElement.src, e);
    });
    
    // Store original image dimensions from the params for proper scaling
    this.originalImageDimensions = {
      width: focData?.width || 0,
      height: focData?.height || 0
    };
    
    // Add load event to capture actual dimensions if not in params
    imgElement.addEventListener('load', () => {
      // console.log('  ✅ Image loaded successfully');
      // If dimensions weren't in params, use the natural dimensions
      if (!this.originalImageDimensions.width || !this.originalImageDimensions.height) {
        this.originalImageDimensions = {
          width: imgElement.naturalWidth,
          height: imgElement.naturalHeight
        };
      }
      
      // Ensure proper positioning context
      this.ensureImageWrapperPositioning();
      
      // Initialize hotspot positions after image is loaded
      this.updateHotspotPositions();

      // This is the critical fix - ensures container heights are recalculated
      requestAnimationFrame(() => {
        // First resize in next frame
        this.parent.trigger('resize');
      });
      
      // Update sticky scrollbar after image loads
      setTimeout(() => {
        this.updateStickyScrollbar();
      }, 100);
    });
    
    // Handle case where image is already loaded (cached)
    if (imgElement.complete && imgElement.naturalWidth > 0) {
      // If dimensions weren't in params, use the natural dimensions
      if (!this.originalImageDimensions.width || !this.originalImageDimensions.height) {
        this.originalImageDimensions = {
          width: imgElement.naturalWidth,
          height: imgElement.naturalHeight
        };
      }
      
      // Trigger positioning update for already loaded images
      setTimeout(() => {
        this.ensureImageWrapperPositioning();
        this.updateHotspotPositions();
        this.updateStickyScrollbar();
      }, 10);
    }
    
    imgElement.classList.add("h5p-interactive-book-front-of-class-image");
    imgElement.id = "h5p-interactive-book-front-of-class-image";
  
    // Create a wrapper for the image and hotspot container
    const imageAndHotspotsWrapper = document.createElement('div');
    imageAndHotspotsWrapper.classList.add('foc-image-wrapper');
    imageAndHotspotsWrapper.style.position = 'relative';
    imageAndHotspotsWrapper.style.width = '100%';
    imageAndHotspotsWrapper.style.display = 'flex';
    imageAndHotspotsWrapper.style.justifyContent = 'center';
    imageAndHotspotsWrapper.style.alignItems = 'center';
  
    // Create inner wrapper that will match the actual image dimensions
    const imageInnerWrapper = document.createElement('div');
    imageInnerWrapper.classList.add('foc-image-inner-wrapper');
    imageInnerWrapper.style.position = 'relative';
    imageInnerWrapper.style.display = 'inline-block';
    imageInnerWrapper.style.overflow = "overlay";
    // imageInnerWrapper.style.width = generateClampCSS("70rem", "70rem");
    // imageInnerWrapper.style.scrollbarWidth = "none"; 
    // imageInnerWrapper.style.paddingBottom = "10px"; // Add padding to avoid scrollbar overlap

    // Create hotspot container and add it to the inner wrapper
    const hotspotContainer = document.createElement('div');
    hotspotContainer.classList.add('hotspot-container');
    hotspotContainer.id = 'foc-hotspot-container';
  
    // Multi-page FOC: Get hotspots for current page only (falls back to legacy)
    // Use getAllFOCHotspots() for fallback to handle both array and object formats
    const focHotspots = this.pageManager 
      ? this.pageManager.getCurrentHotspots() 
      : getAllFOCHotspots(this.config?.foc);
    if (focHotspots.length > 0) {
      focHotspots.forEach(hotSpot => {
        if (hotSpot) {
          this.addHotspot(hotSpot, hotspotContainer);
        }
      });
    }
    // Add elements to DOM in the correct order
    imageInnerWrapper.appendChild(imgElement);
    imageInnerWrapper.appendChild(hotspotContainer);
    imageAndHotspotsWrapper.appendChild(imageInnerWrapper);
    
    // Store references for later use
    this.hotspotContainer = hotspotContainer;
    this.imageWrapper = imageAndHotspotsWrapper;
    this.imageInnerWrapper = imageInnerWrapper;
    this.imgElement = imgElement;
    
    // Store the hotspot data for responsive scaling
    this.focHotspots = focHotspots;
    
    // Add window resize listener for responsive scaling
    this.addResizeListener();
    
    return imageAndHotspotsWrapper;
  }
  /**
   * Add a hotspot visual indicator to the container
   * 
   * @param {Object} hotSpot - Hotspot data
   * @param {HTMLElement} hotspotContainer - Container to add visual indicators to
   */
  addHotspot(hotSpot, hotspotContainer) {
    // Create visual indicator only if container is provided
    if (hotspotContainer) {
      this.createHotspotVisualIndicator(hotSpot, hotspotContainer);
    }
  }
  /**
   * Create visual indicator for a hotspot
   * 
   * @param {Object} hotSpot - Hotspot data
   * @param {HTMLElement} container - Container to add visual indicators to
   */
  createHotspotVisualIndicator(hotSpot, container) {
    if (!hotSpot || !container) {
      console.error("Missing hotspot or container", { hotSpot, container });
      return;
    }
    
    // Ensure container has proper positioning styles
    this.ensureContainerPositioning(container);
    
    // Get coordinates from the hotspot (these are in original image coordinates)
    const [x1, y1, x2, y2] = hotSpot.coords;
    
    // Calculate the correct position and dimensions in original image space
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    
    // Create a transparent clickable area with the same position and dimensions
    const clickableArea = document.createElement("div");
    clickableArea.dataset.hotspotId = hotSpot.id;
    clickableArea.classList.add("hotspot-clickable-area");
    
    // Apply minimum dimensions for better touch support
    const minDimension = 30; // px in original coordinates
    const effectiveWidth = Math.max(width, minDimension);
    const effectiveHeight = Math.max(height, minDimension);
    
    // Center the hotspot if we're using minimum dimensions
    const adjustedLeft = width < minDimension ? left - ((minDimension - width) / 2) : left;
    const adjustedTop = height < minDimension ? top - ((minDimension - height) / 2) : top;
    
    // Style the clickable area with original coordinates (will be scaled later)
    Object.assign(clickableArea.style, {
      position: 'absolute',
      left: `${Math.max(0, adjustedLeft)}px`,
      top: `${Math.max(0, adjustedTop)}px`,
      width: `${effectiveWidth}px`,
      height: `${effectiveHeight}px`,
      zIndex: '999',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      pointerEvents: 'auto',
      // Add debug styling to make hotspots visible during development
      // border: '2px solid rgba(255, 0, 0, 0.3)',
      // backgroundColor: 'rgba(255, 0, 0, 0.1)'
    });
    
    // Only add click handler if hotspot has a linked activity
    if (hotSpot.linkActivity && hotSpot.linkActivity.itemId) {
      clickableArea.addEventListener('click', () => {
        this.trigger("hotspotClicked", hotSpot.id);
      });
    }
    
    container.appendChild(clickableArea);
  }

  /**
   * Ensure the hotspot container has proper positioning styles
   * 
   * @param {HTMLElement} container - The hotspot container
   */
  ensureContainerPositioning(container) {
    if (!container) return;
    
    // Ensure the container has proper positioning and dimensions
    Object.assign(container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none', // Allow clicks to pass through container
      zIndex: '10'
    });
  }

  /**
   * Ensure hotspot container exists and is properly rendered
   */
  ensureHotspotContainerExists() {
    // Check if the hotspot container exists
    let hotspotContainer = document.getElementById('foc-hotspot-container');
    
    if (!hotspotContainer) {      
      // Get the image wrapper using our stored reference
      const imageWrapper = this.imageWrapper;
      if (!imageWrapper) {
        console.error('Image wrapper not found, cannot create hotspot container');
        return;
      }
      
      // Find the inner wrapper where the hotspot container should be added
      const imageInnerWrapper = this.imageInnerWrapper || 
                               imageWrapper.querySelector('.foc-image-inner-wrapper');
      
      if (!imageInnerWrapper) {
        console.error('Image inner wrapper not found, cannot create hotspot container');
        return;
      }
      
      // Create the hotspot container
      hotspotContainer = document.createElement('div');
      hotspotContainer.id = 'foc-hotspot-container';
      hotspotContainer.classList.add('hotspot-container');
      
      // Ensure proper positioning for the container
      this.ensureContainerPositioning(hotspotContainer);
      
      // Add the container to the inner wrapper (not the outer wrapper)
      imageInnerWrapper.appendChild(hotspotContainer);
      
      // Store the container reference
      this.hotspotContainer = hotspotContainer;
      
      
      // Initialize the visibility enhancers
      this.initializeHotspotEnhancers();
    }
    else {
      // If container exists, ensure it has proper positioning
      this.ensureContainerPositioning(hotspotContainer);
      
      // If container exists but enhancers not initialized, initialize them
      if (!this.hotspotEnhancersInitialized) {
        this.initializeHotspotEnhancers();
      }
      
      // Always ensure hotspots are positioned correctly
      this.updateHotspotPositions();
    }
    
    // Force a layout recalculation to ensure proper positioning
    setTimeout(() => {
      this.updateHotspotPositions();
    }, 50);
  }
  /**
   * Initialize hotspot enhancers for better visibility and responsiveness
   */
  initializeHotspotEnhancers() {
    if (!this.hotspotContainer || !this.imgElement || !this.focHotspots) {
      return;
    }
    
    // Initialize small screen specific enhancements
    import('./small-screen-hotspots.js').then(module => {
      this.smallScreenCleanup = module.initializeSmallScreenHotspots({
        container: this.hotspotContainer,
        imgElement: this.imgElement,
        hotspots: this.focHotspots,
        originalDimensions: this.originalImageDimensions,
        updateFunction: () => this.updateHotspotPositions()
      });
      
      // Add touch-friendly interactions
      module.enhanceTouchInteractions(this.hotspotContainer);
    }).catch(error => {
      console.error('Error importing small-screen-hotspots module:', error);
    });
    
    // Mark as initialized to avoid duplicate initialization
    this.hotspotEnhancersInitialized = true;
  }

  /**
   * Create columns dynamically based on data
   * 
   * @param {Object} config - Configuration object
   * @param {number} contentId - Content ID
   * @param {Object} contentData - Content data
   * @return {number} Number of columns created
   */
  createColumns(config, contentId, contentData) {
    contentData = Object.assign({}, contentData);
    const chapters = [];
    this.chapters = chapters;

    // Initialize columns
    for (let i = 0; i < config.chapters.length; i++) {
      const columnNode = document.createElement("div");
      
      // Carry over the completed state from the live pageContent chapter instance
      // so the FOC modal always shows pre-filled (completed) answers, even on
      // repeated opens.
      let chapPreviousState = {};
      const pageContentChapter = this.parent?.pageContent?.chapters?.[i];
      if (pageContentChapter?.isInitialized && typeof pageContentChapter.instance?.getCurrentState === 'function') {
        try { 
          chapPreviousState = pageContentChapter.instance.getCurrentState() || {}; 
        } 
        catch (_) {
          // If getCurrentState fails for any reason, we can safely ignore and just show an unfilled chapter in the modal
        }
      }

      // Create instance content data
      const instanceContentData = {
        ...contentData,
        metadata: {
          ...contentData.metadata,
        },
        previousState: chapPreviousState,
      };
      
      // Create new instance
      const newInstance = H5P.newRunnable(
        config.chapters[i],
        contentId,
        undefined,
        undefined,
        instanceContentData
      );
      
      // Bubble up resize events
      this.parent.bubbleUp(newInstance, "resize", this.parent);

      // Create chapter object
      const chapter = this.createChapterObject(config.chapters[i], newInstance);

      // Set up column node
      columnNode.classList.add("h5p-interactive-book-chapter");
      columnNode.id = `h5p-interactive-book-chapter-${newInstance.subContentId}`;

      // Register both the HTML element and H5P element
      chapters.push(chapter);
      this.columnNodes.push(columnNode);
    }

    return chapters.length;
  }
  
  /**
   * Create chapter object with metadata and sections
   * 
   * @param {Object} chapterConfig - Chapter configuration
   * @param {Object} instance - Chapter instance
   * @return {Object} Chapter object
   */
  createChapterObject(chapterConfig, instance) {
    const chapter = {
      isInitialized: false,
      instance: instance,
      title: chapterConfig.metadata.title,
      isSummary: false,
      maxTasks: 0,
      tasksLeft: 0,
      sections: instance.getInstances().map((sectionInstance, contentIndex) => ({
        content: chapterConfig.params.content[contentIndex].content,
        instance: sectionInstance,
        isTask: false,
        skill: chapterConfig.params.content[contentIndex].content.params.skill || "--",
        description: chapterConfig.params.content[contentIndex].content.params.description || 
                    "Add Description",
        contentIndex: contentIndex,
      })),
    };

    // Find sections with tasks and track them
    chapter.sections.forEach((section) => {
      if (H5P.Pears_ColumnTest?.isTask(section.instance)) {
        section.isTask = true;
        chapter.maxTasks++;
        chapter.tasksLeft++;
      }
    });

    return chapter;
  }

  /**
   * Render columns inside the modal body
   * 
   * @param {HTMLElement} modalElement - The modal element
   * @param {string} hotspotId - ID of the clicked hotspot
   */
  renderColumnsInModal(modalElement, hotspotId) {
    const modalBody = modalElement.querySelector(FOC_SELECTORS.MODAL_BODY);
    if (!modalBody) {
      return;
    }

    modalBody.innerHTML = "";

    // Get all FOC hotspots (handles both array and object formats)
    const allFocHotspots = getAllFOCHotspots(this.config?.foc);

    // Find the hotspot and validate it has a linked activity
    if (!hotspotId || allFocHotspots.length === 0) {
      return;
    }

    const hotspot = allFocHotspots.find(
      (hotSpot) => hotSpot.id === hotspotId
    );

    // Return early if hotspot doesn't have linkActivity
    if (!hotspot || !hotspot.linkActivity || !hotspot.linkActivity.itemId) {
      return;
    }

    // Find the matching table of contents entry
    const activityId = hotspot.linkActivity.itemId;
    const tocIndex = this.parent.params.tableOfContents.findIndex(
      (tocItem) => tocItem.activityId === activityId
    );

    if (tocIndex === -1) {
      return;
    }

    // ─── Borrow the LIVE pageContent instance (true shared state) ────────────
    // Instead of a separate FOC clone, move the real pageContent column node
    // into the modal.  Any interaction in the modal updates the SAME H5P
    // instance the activity page uses — state is shared automatically.
    // The node is returned to its original position when the modal closes
    // (see hidden.bs.modal handler in handleHotspotClick).
    const pageContent = this.parent?.pageContent;
    if (!pageContent) return;

    const pageChapter = pageContent.chapters?.[tocIndex];
    const pageColumnNode = pageContent.columnNodes?.[tocIndex];
    if (!pageChapter || !pageColumnNode) return;

    // Ensure the chapter is initialised (H5P Column attached to node).
    if (!pageChapter.isInitialized) {
      pageContent.initializeChapter(tocIndex);
    }

    // Determine what to move: prefer the chapter wrapper (includes recall root),
    // fall back to the raw column node if no wrapper exists.
    const chapterWrapper = pageChapter.chapterWrapper || null;
    const nodeToMove = chapterWrapper || pageColumnNode;

    console.log("🔍 renderColumnsInModal DEBUG:", {
      tocIndex,
      isInitialized: pageChapter.isInitialized,
      hasWrapper: !!chapterWrapper,
      hasRecallConfig: !!pageChapter.recallActivityConfig,
      nodeToMove: nodeToMove.className,
      childCount: pageColumnNode.childNodes.length,
    });

    // Remember original DOM position for restore on modal close.
    this._activeModalChapter = {
      columnNode: nodeToMove,
      originalParent: nodeToMove.parentNode,
      nextSibling: nodeToMove.nextSibling,
      tocIndex,
    };

    // Move the live node into the modal.
    // CSS in .foc-modal-body already forces display:block on .h5p-interactive-book-chapter.
    modalBody.appendChild(nodeToMove);

    // Update the modal title with the chapter title
    const modalTitle = modalElement.querySelector('.modal-title');
    if (modalTitle && pageChapter.title) {
      modalTitle.textContent = pageChapter.title;
    }

    this.parent.trigger('resize');
  }

  /**
   * Inject section instance UUID into DOM
   * 
   * @param {Object[]} sections - Sections
   * @param {HTMLElement} columnNode - Column element
   */
  injectSectionId(sections, columnNode) {
    const columnContent = columnNode.getElementsByClassName("h5p-column-content");

    for (let i = 0; i < sections.length; i++) {
      if (columnContent[i] && sections[i].instance.subContentId) {
        columnContent[i].id = `h5p-interactive-book-section-${sections[i].instance.subContentId}`;
      }
    }
  }
  /**
   * Add resize listener to update hotspot positions when window is resized
   */
  addResizeListener() {
    // Import the responsive scaling utility function
    import('./hotspot-scaling.js').then(module => {
      // Create and store the cleanup function for the resize handler
      this.cleanupResizeHandler = module.addResponsiveHotspotScaling(() => {
        this.updateHotspotPositions();
        this.updateStickyScrollbar();
      });
    }).catch(error => {
      console.error('Error importing hotspot-scaling module:', error);
      // Fallback to simple resize handler if import fails
      const handleResize = () => {
        this.updateHotspotPositions();
        this.updateStickyScrollbar();
      };
      
      window.addEventListener('resize', handleResize);
      this.resizeHandler = handleResize;
    });
    
  }
  
  /**
   * Calculate the current scaling factor and offset for the centered image
   * 
   * @returns {Object} - Scaling factors and offsets {widthRatio, heightRatio, offsetX, offsetY}
   */
  getImageScalingAndOffset() {
    if (!this.imgElement || !this.originalImageDimensions || !this.imageInnerWrapper) {
      return { widthRatio: 1, heightRatio: 1, offsetX: 0, offsetY: 0 };
    }
    
    // Get the current image dimensions
    const currentWidth = this.imgElement.offsetWidth || this.imgElement.width;
    const currentHeight = this.imgElement.offsetHeight || this.imgElement.height;
    
    // Get the image position relative to its container
    const imgRect = this.imgElement.getBoundingClientRect();
    const wrapperRect = this.imageInnerWrapper.getBoundingClientRect();
    
    // Calculate the scaling ratios
    const widthRatio = currentWidth / this.originalImageDimensions.width;
    const heightRatio = currentHeight / this.originalImageDimensions.height;
    
    // Calculate offsets (should be 0 if image fills the inner wrapper)
    const offsetX = imgRect.left - wrapperRect.left;
    const offsetY = imgRect.top - wrapperRect.top;
    
    return {
      widthRatio,
      heightRatio,
      offsetX,
      offsetY
    };
  }
  /**
   * Update the positions of all hotspots based on current image size
   */
  updateHotspotPositions() {
    if (!this.focHotspots || !this.hotspotContainer || !this.imgElement || !this.imageInnerWrapper) {
      return;
    }
    
    // Get current image dimensions
    let currentWidth = this.imgElement.offsetWidth || this.imgElement.width;
    let currentHeight = this.imgElement.offsetHeight || this.imgElement.height;
    
    // If dimensions are still 0, try getting computed style dimensions
    if ((currentWidth === 0 || currentHeight === 0)) {
      const computedStyle = window.getComputedStyle(this.imgElement);
      currentWidth = parseInt(computedStyle.width) || this.imgElement.naturalWidth;
      currentHeight = parseInt(computedStyle.height) || this.imgElement.naturalHeight;
    }
    
    // Don't update if image doesn't have valid dimensions yet
    if (currentWidth === 0 || currentHeight === 0) {
      console.warn('Image dimensions not ready, skipping hotspot position update');
      // Retry after a short delay - but with exponential backoff to avoid infinite loops
      if (!this.retryCount) this.retryCount = 0;
      if (this.retryCount < 5) {
        this.retryCount++;
        setTimeout(() => this.updateHotspotPositions(), Math.min(100 * this.retryCount, 500));
      }
      return;
    }
    
    // Reset retry count on successful update
    this.retryCount = 0;
    
    // Update the inner wrapper dimensions to match the image
    // this.imageInnerWrapper.style.width = `${currentWidth}px`;
    // this.imageInnerWrapper.style.height = `${currentHeight}px`;
    
    // Update hotspot container to match the inner wrapper
    this.hotspotContainer.style.width = '100%';
    this.hotspotContainer.style.height = '100%';
    
    // Import the hotspot scaling utility functions
    import('./hotspot-scaling.js').then(module => {
      module.updateAllHotspots(
        this.focHotspots,
        this.originalImageDimensions,
        this.imgElement,
        this.hotspotContainer
      );
    }).catch(error => {
      console.error('Error importing hotspot-scaling module:', error);
      
      // Fallback to manually updating hotspots if import fails
      const { widthRatio, heightRatio } = this.getImageScalingAndOffset();
      
      // Update each hotspot visual indicator
      this.focHotspots.forEach(hotSpot => {
        if (!hotSpot || !hotSpot.coords) return;
        
        // Find the hotspot's visual indicator
        const indicator = this.hotspotContainer.querySelector(`.hotspot-clickable-area[data-hotspot-id="${hotSpot.id}"]`);
        if (!indicator) return;
        
        // Scale the coordinates
        const originalCoords = hotSpot.coords;
        const scaledCoords = originalCoords.map((coord, index) => {
          // Even indices (0, 2, ...) are X coordinates, scale by width ratio
          // Odd indices (1, 3, ...) are Y coordinates, scale by height ratio
          return index % 2 === 0 ? coord * widthRatio : coord * heightRatio;
        });
        
        // Calculate new position and dimensions
        const [x1, y1, x2, y2] = scaledCoords;
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        // Apply minimum dimensions for better touch support
        const minDimension = 30; // px
        const effectiveWidth = Math.max(width, minDimension);
        const effectiveHeight = Math.max(height, minDimension);
        
        // Center the hotspot if we're using minimum dimensions
        const adjustedLeft = width < minDimension ? left - ((minDimension - width) / 2) : left;
        const adjustedTop = height < minDimension ? top - ((minDimension - height) / 2) : top;
        
        // Update the indicator's position and size
        Object.assign(indicator.style, {
          left: `${Math.max(0, adjustedLeft)}px`,
          top: `${Math.max(0, adjustedTop)}px`,
          width: `${effectiveWidth}px`,
          height: `${effectiveHeight}px`
        });
      });
    });
  }
  /**
   * Clean up event listeners and resources when component is destroyed
   */
  cleanup() {
    // Clean up resize handler
    if (this.cleanupResizeHandler) {
      this.cleanupResizeHandler();
      this.cleanupResizeHandler = null;
    }
    else if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    
    // Clean up resize observer if it exists
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Remove sticky scrollbar
    if (this.stickyScrollbarContainer) {
      this.stickyScrollbarContainer.remove();
      this.stickyScrollbarContainer = null;
    }
    
    // Remove loading overlay
    if (this.loadingOverlay) {
      this.loadingOverlay.remove();
      this.loadingOverlay = null;
    }
    
    // Clean up small screen enhancements
    if (this.smallScreenCleanup) {
      this.smallScreenCleanup();
      this.smallScreenCleanup = null;
    }
    
    // Clean up sticky scrollbar content reference
    if (this.stickyScrollbarContent) {
      this.stickyScrollbarContent = null;
    }
    
    // Clear any pending timeouts
    // Note: You may want to track timeout IDs for proper cleanup
  }

  /**
   * Initialize FOC when container is attached to DOM
   * This method should be called when the FOC container is actually displayed
   */
  initializeWhenVisible() {
    if (this.isInitialized) {
      // DISABLED: Reset to first page when returning to FOC
      // Requirement: FOC should remember the last visited page when user returns.
      // Keeping this commented in case the behaviour needs to be reverted in the future.
      // if (this.pageManager && this.pageManager.isMultiPage()) {
      //   const wasReset = this.pageManager.resetToFirstPage();
      //   if (wasReset) {
      //     // Re-render first page content (image and hotspots)
      //     this.handleFOCPageChange({
      //       oldPage: -1, // Indicates a reset, not a normal navigation
      //       newPage: 0,
      //       pageData: this.pageManager.getCurrentPage()
      //     });
      //     // Navigation UI will be updated inside handleFOCPageChange after completion
      //   } 
      //   else {
      //     // Already on first page, just update navigation indicator
      //     this.updateNavigationIndicator();
      //   }
      // }

      // Just update the navigation indicator to reflect the current (remembered) page
      // and make the navigation UI visible again
      if (this.pageManager && this.pageManager.isMultiPage()) {
        this.updateNavigationIndicator();
      }

      // Show navigation when FOC becomes visible
      if (this.focNavigationUI) {
        this.focNavigationUI.style.display = 'flex';
      }
      return;
    }

    // Show multi-page navigation UI when FOC becomes visible
    if (this.focNavigationUI) {
      this.focNavigationUI.style.display = 'flex';
      // console.log('📍 Multi-page FOC navigation UI now visible');
    }

    // Ensure all positioning contexts are properly set up
    this.ensureImageWrapperPositioning();

    // Ensure hotspots are created and positioned correctly
    this.ensureHotspotContainerExists();
    
    // Force immediate positioning calculation
    this.recalculateImageAndHotspots();
    
    // Update sticky scrollbar
    setTimeout(() => {
      this.updateStickyScrollbar();
    }, 50);
    
    // Additional checks with staggered delays to handle different timing scenarios
    setTimeout(() => {
      this.recalculateImageAndHotspots();
      this.updateStickyScrollbar();
    }, 10);
    
    setTimeout(() => {
      this.recalculateImageAndHotspots();
      this.updateStickyScrollbar();
      this.isInitialized = true;
      
      // Apply min-height for Default mode if content is smaller than viewport
      this.applyAdaptiveMinHeight();
    }, 100);
    
    // Final check with longer delay for complex layouts
    setTimeout(() => {
      this.recalculateImageAndHotspots();
      this.updateStickyScrollbar();
      
      // Final min-height adjustment after layout stabilizes
      this.applyAdaptiveMinHeight();
    }, 300);
  }
  
  /**
   * Apply min-height adaptively based on content size
   * Small content gets min-height to fill viewport (Default mode)
   * Large content keeps natural height (works for both modes)
   */
  applyAdaptiveMinHeight() {
    if (!this.focContentElement) return;
    
    const contentHeight = this.focContentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const headerEl = document.querySelector('.foc-header');
    const headerHeight = headerEl ? headerEl.offsetHeight : 0;
    const minRequiredHeight = viewportHeight - headerHeight;
    
    // Only apply min-height if content is smaller than viewport
    // This prevents white space in Default mode while keeping actual size for Fit to Screen
    if (contentHeight < minRequiredHeight) {
      this.focContentElement.style.minHeight = `calc(100vh - var(--header-height, 5vh) - 1vh)`;
    } 
    else {
      this.focContentElement.style.minHeight = '0';
    }
  }

  /**
   * Force recalculation of image dimensions and hotspot positions
   */
  recalculateImageAndHotspots() {
    if (!this.imgElement || !this.hotspotContainer) {
      return;
    }

    // First, ensure the image wrapper and container have proper positioning
    this.ensureImageWrapperPositioning();

    // Force image dimension recalculation
    let currentWidth = this.imgElement.offsetWidth || this.imgElement.clientWidth;
    let currentHeight = this.imgElement.offsetHeight || this.imgElement.clientHeight;
    
    // If dimensions are still 0, try getting computed style dimensions
    if ((currentWidth === 0 || currentHeight === 0)) {
      const computedStyle = window.getComputedStyle(this.imgElement);
      currentWidth = parseInt(computedStyle.width) || this.imgElement.naturalWidth;
      currentHeight = parseInt(computedStyle.height) || this.imgElement.naturalHeight;
    }
    
    // If image still doesn't have proper dimensions, wait for it to load
    if ((currentWidth === 0 || currentHeight === 0) && this.imgElement.complete) {
      if (this.imgElement.naturalWidth > 0 && this.imgElement.naturalHeight > 0) {
        // Update original dimensions if they weren't set properly
        if (!this.originalImageDimensions || 
            this.originalImageDimensions.width === 0 || 
            this.originalImageDimensions.height === 0) {
          this.originalImageDimensions = {
            width: this.imgElement.naturalWidth,
            height: this.imgElement.naturalHeight
          };
        }
        
        // Use natural dimensions for current size calculation
        currentWidth = this.imgElement.naturalWidth;
        currentHeight = this.imgElement.naturalHeight;
      }
    }

    // Update the inner wrapper dimensions to match the image
    // if (this.imageInnerWrapper && currentWidth > 0 && currentHeight > 0) {
    //   this.imageInnerWrapper.style.width = `${currentWidth}px`;
    //   this.imageInnerWrapper.style.height = `${currentHeight}px`;
    // }

    // Update header height which affects layout
    calculateHeaderHeight();
    
    // Ensure hotspot container has proper positioning
    this.ensureContainerPositioning(this.hotspotContainer);
    
    // Update hotspot positions
    this.updateHotspotPositions();
    
    // If image still doesn't have proper dimensions, retry
    if (currentWidth === 0 || currentHeight === 0) {
      setTimeout(() => {
        this.recalculateImageAndHotspots();
      }, 100);
    }
  }

  /**
   * Ensure image wrapper and related containers have proper positioning
   */
  ensureImageWrapperPositioning() {
    // Ensure outer wrapper has proper positioning
    if (this.imageWrapper) {
      Object.assign(this.imageWrapper.style, {
        position: 'relative',
        // minWidth: '80%', option 2
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 'auto'
      });
    }

    // Ensure inner wrapper has proper positioning
    if (this.imageInnerWrapper) {
      Object.assign(this.imageInnerWrapper.style, {
        position: 'relative',
        display: 'inline-block'
      });
    }

    // Ensure image has proper display
    if (this.imgElement) {
      Object.assign(this.imgElement.style, {
        display: 'block',
        height: 'auto',
        width: checkDevice().width * 0.8 + "px"
        // width: generateClampCSS("70rem", "70rem")
      });
    }
  }
}

export default FrontOfClassContent;
