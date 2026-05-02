import URLTools from './urltools';
import { generateClampCSS, checkDevice } from './utils';
import Summary from "./summary";
import { tocIcons } from './icons';
import { getPageContentTOCData } from './utils/getTOCData';
import { GenerateExerciseDiv } from './utils/generalFunction';
import RecallAccordion from '../components/recall/RecallAccordion';

class PageContent extends H5P.EventDispatcher {
  /**
   * @constructor
   *
   * @param {object} config
   * @param {string} contentId
   * @param {object} contentData
   * @param {object} parent
   * @param {object} params
   */
  constructor(config, contentId, contentData, parent, params) {
    super();
    this.parent = parent;
    this.contentId = contentId;
    this.contentData = contentData;
    this.behaviour = config.behaviour;
    this.segment = parent.segment;
    this.params = params;
    this.targetPage = {};
    this.targetPage.redirectFromComponent = false;

    this.columnNodes = [];
    this.chapters = [];
    this.l10n = config.l10n;
    this.sidebarIsOpen = false;
    this.themeData = config.themeData;
    this.isSimpleView = parent.isSimpleView;
    this.customTocIndex = this.parent.params?.custom_toc_index || {};
    this.hasAnyCustom = this.hasAnyCustomIndex();
    this.isMobileView = checkDevice().mobile;

    // Initialize navigation arrows reference
    this.navigationArrows = null;

    // Set up event listeners for navigation arrow updates
    this.setupNavigationListeners();

    // Retrieve previous state
    this.previousState = (contentData.previousState && Object.keys(contentData.previousState).length > 0) ?
      contentData.previousState :
      null;

    if (parent.hasValidChapters()) {
      const startChapter = this.createColumns(config, contentId, contentData);
      
      // Preloading the first two activities is disabled per request.
      // this.preloadChapter(startChapter);
    }

    this.content = this.createPageContent();

    this.container = document.createElement('div');
    this.container.classList.add('h5p-interactive-book-main', 'h5p-interactive-book-navigation-hidden');
    if (!this.isMobileView) {
      this.container.style.paddingInline = generateClampCSS('2.5rem', '2.5rem');
      this.container.style.gap = generateClampCSS('1.25rem', '1.25rem');
    }
   
    if (this.themeData?.backgroundColor) {
      this.container.style.backgroundColor = this.themeData.backgroundColor;
    }
    
    if (this.themeData?.fontFamily) {
      this.container.style.fontFamily = this.themeData.fontFamily;
    }
    
    const activeChapter = this.parent.getActiveChapter();
    const skill = this.chapters?.[activeChapter]?.sections?.[0]?.skill || '--';
    const activityId = this.chapters?.[activeChapter]?.sections?.[0]?.activityId || '--';
    const ordinal = activeChapter + 1;

    this.pageName = document.createElement('div');
    this.pageName.classList.add('h5p-interactive-book-page-name');
    this.pageName.style.paddingBlock = generateClampCSS('1.5625rem', '1.5625rem');
    this.pageName.style.paddingInline = generateClampCSS('2.5rem', '2.5rem');
    
    // ✅ FIX: Apply background color directly to page name since it's now moved outside container
    if (this.themeData?.backgroundColor) {
      this.pageName.style.backgroundColor = this.themeData.backgroundColor;
    }
    
    // ✅ FIX: Apply font family to page name as well
    if (this.themeData?.fontFamily) {
      this.pageName.style.fontFamily = this.themeData.fontFamily;
    }

    this.pageNameInnerWrapper = this.createPageNameInnerWrapper();
    
    const activitySkill = document.createElement('h6');
    activitySkill.id = 'activity-skill-desktop';
    activitySkill.classList.add('activitySkill');
    activitySkill.textContent = getPageContentTOCData(skill, this.parent?.params?.skillData, this.themeData).label || skill;

    const separator = document.createElement('span');
    separator.classList.add('separator');
    separator.textContent = ' | ';

    if (this.themeData?.activity?.activityTitle?.activityPage?.separatorMargin) {
      separator.style.margin = this.themeData.activity.activityTitle.activityPage.separatorMargin;
    }
    
    const activtyExercise = document.createElement('h6');
    activtyExercise.classList.add('excercise');
    let exerciseType = GenerateExerciseDiv(this.segment);
    activtyExercise.textContent = exerciseType;

    const activityOrdinal = document.createElement('span');
    activityOrdinal.id = 'activity-ordinal-desktop';
    activityOrdinal.classList.add('activityOrdinal');

    if (this.themeData?.activity?.activityTitle?.activityPage?.skillName) {
      const { skillName } = this.themeData.activity.activityTitle.activityPage;
      if (skillName?.fontColor) {
        activitySkill.style.color = skillName.fontColor;
        separator.style.color = skillName.fontColor;
      }
      if (skillName?.fontSize) {
        activitySkill.style.fontSize = generateClampCSS(skillName.fontSize, skillName.fontSize);
        separator.style.fontSize = generateClampCSS(skillName.fontSize, skillName.fontSize);
      }
      if (skillName?.fontFamily) {
        activitySkill.style.fontFamily = skillName.fontFamily;
        separator.style.fontFamily = skillName.fontFamily;
      }
      if (skillName?.fontWeight) {
        activitySkill.style.fontWeight = skillName.fontWeight;
        separator.style.fontWeight = skillName.fontWeight;
      }
    }
    if (this.themeData?.activity?.activityTitle?.activityPage?.exercise) {
      const { exercise } = this.themeData.activity.activityTitle.activityPage;
      if (exercise?.fontColor) {
        activtyExercise.style.color = exercise.fontColor;
      }
      if (exercise?.fontSize) {
        activtyExercise.style.fontSize = generateClampCSS(exercise.fontSize, exercise.fontSize);
      }
      if (exercise?.fontFamily) {
        activtyExercise.style.fontFamily = exercise.fontFamily;
      }
      if (exercise?.fontWeight) {
        activtyExercise.style.fontWeight = exercise.fontWeight;
      }
    }

    this.pageNameInnerWrapper.appendChild(activitySkill);

    // Always append separator and exercise container so the DOM structure is stable.
    // We will hide them if a custom numbering scheme is enabled but the current
    // activity does not have a custom number. This prevents the initial-page
    // omission from breaking updates when navigating to other activities.
    const customNumber = this.customTocIndex?.[activityId];

    // Ensure the ordinal element is always placed inside the exercise container
    activtyExercise.appendChild(activityOrdinal);

    // Default to visible
    separator.style.display = 'inline-block';
    activtyExercise.style.display = 'inline-block';

    // Decide what number to show and whether to hide the exercise container
    if (this.hasAnyCustom) {
      // Custom numbering is enabled somewhere in the book. Only show a number
      // for activities that have an explicit custom number.
      if (customNumber !== undefined && customNumber !== null && customNumber !== '') {
        activityOrdinal.textContent = customNumber || '';
        separator.style.display = 'inline-block';
        activtyExercise.style.display = 'inline-block';
      }
      else {
        // Hide exercise container for activities without custom number
        activityOrdinal.textContent = '';
        separator.style.display = 'none';
        activtyExercise.style.display = 'none';
      }
    }
    else {
      // No custom numbering enabled anywhere — fall back to ordinal numbering.
      activityOrdinal.textContent = ordinal;
      separator.style.display = 'inline-block';
      activtyExercise.style.display = 'inline-block';
    }

    // Append separator and exercise container (already contains activityOrdinal)
    this.pageNameInnerWrapper.appendChild(separator);
    this.pageNameInnerWrapper.appendChild(activtyExercise);
    
    
    if (this.themeData?.activity?.activityTitle) {
      const { activityPage } = this.themeData.activity.activityTitle;
      if (activityPage) {
        const { fontColor, fontSize, fontFamily, exercise, skill } = activityPage;
        if (fontColor) {
          this.pageName.style.color = fontColor;
        }
        if (fontSize) {
          this.pageName.style.fontSize = generateClampCSS(fontSize, fontSize);
        }
        if (fontFamily) {
          this.pageName.style.fontFamily = fontFamily;
        }
        if (exercise?.fontWeight) {
          activtyExercise.style.fontWeight = exercise.fontWeight;
          separator.style.fontWeight = exercise.fontWeight;
        }

        if (skill?.fontWeight) {
          activitySkill.style.fontWeight = skill.fontWeight;
        }
      }      
    }

    this.topNavigationButton = this.createTopNavigationWrapper();

    this.pageName.appendChild(this.pageNameInnerWrapper);
    this.pageName.appendChild(this.topNavigationButton);
    this.container.appendChild(this.pageName);
    this.container.appendChild(this.content);
  }

  /**
 * Create the complete page structure with page name outside main container
 * @return {HTMLElement} Complete page wrapper
 */
  createPageNameInnerWrapper() {
    // Create wrapper for the entire page
    const pageNameInnerWrapper = document.createElement('div');
    pageNameInnerWrapper.classList.add('h5p-interactive-book-page-wrapper');

    return pageNameInnerWrapper;
  }

  /**
 * Create navigation arrows (exact copy from StatusBar.addArrows())
 * @return {Object} Object containing arrow elements
 */
  createNavigationArrows() {
    const acm = {};

    // Initialize elements - Remove <a> layer completely
    let height = generateClampCSS("1.5rem", "1.5rem");

    acm.buttonWrapperPrevious = document.createElement('button');
    acm.buttonWrapperPrevious.classList.add('h5p-interactive-book-nav-arrow', 'nav-previous', 'can_pause');
    acm.buttonWrapperPrevious.setAttribute('aria-label', this.l10n?.previousPage || 'Previous Page');
    acm.buttonWrapperPrevious.setAttribute('title', this.l10n?.previousPage || 'Previous Page');

    // Put SVG directly inside the button
    acm.buttonWrapperPrevious.innerHTML = `<div style="height: ${height}; width: ${height}; display: flex; align-items: center; justify-content: center; margin: auto;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" viewBox="0 0 10 16" fill="none">
    <path d="M7.90358 15.9228C7.60395 15.9228 7.30645 15.7925 7.07694 15.5343L1.26919 8.93777C1.05031 8.68925 0.927061 8.35146 0.927061 7.99919C0.927061 7.64693 1.05031 7.30914 1.26919 7.06062L7.07695 0.466458C7.53383 -0.0522923 8.27335 -0.052292 8.73023 0.466459C9.18712 0.985209 9.18712 1.82486 8.73023 2.34361L3.74912 7.99919L8.73023 13.6548C9.18711 14.1735 9.18711 15.0132 8.73023 15.5319C8.50285 15.7901 8.20322 15.9204 7.90358 15.9204L7.90358 15.9228Z" fill="currentColor"/>
    </svg></div>`;

    // ✅ ENHANCED PREVIOUS BUTTON CLICK HANDLER
    acm.buttonWrapperPrevious.onclick = (event) => {
      // Prevent any default behavior and event bubbling
      event.preventDefault();
      event.stopPropagation();
      
      // Check if button is disabled
      if (acm.buttonWrapperPrevious.hasAttribute('disabled')) {
        return;
      }

      const currentChapter = this.parent.getActiveChapter();

      if (currentChapter > 0) {
        const targetChapter = currentChapter - 1;
        
        const navigationData = {
          h5pbookid: this.parent.contentId,
          chapter: `h5p-interactive-book-chapter-${this.parent.chapters[targetChapter].instance.subContentId}`,
          section: 'top'
        };

        // Trigger navigation
        this.parent.trigger('newChapter', navigationData);
        
        // ✅ ADD: Update arrows immediately after navigation
        setTimeout(() => {
          this.updateNavigationArrows();
        }, 50);
      }
    };

    acm.buttonWrapperNext = document.createElement('button');
    acm.buttonWrapperNext.classList.add('h5p-interactive-book-nav-arrow', 'nav-next', 'can_pause');
    acm.buttonWrapperNext.setAttribute('aria-label', this.l10n?.nextPage || 'Next Page');
    acm.buttonWrapperNext.setAttribute('title', this.l10n?.nextPage || 'Next Page');

    // Put SVG directly inside the button
    acm.buttonWrapperNext.innerHTML = `<div style="height: ${height}; width: ${height}; display: flex; align-items: center; justify-content: center; margin: auto;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="18" viewBox="0 0 10 18" fill="currentColor">
    <g clip-path="url(#clip0_7675_24963)">
    <path d="M2.10972 0.957338C2.40796 0.957338 2.70409 1.08962 2.93253 1.35172L8.71341 8.04891C8.93127 8.30122 9.05396 8.64417 9.05396 9.00181C9.05396 9.35945 8.93127 9.70239 8.71341 9.9547L2.93253 16.6494C2.47776 17.1761 1.74167 17.1761 1.28689 16.6494C0.832125 16.1228 0.832125 15.2703 1.2869 14.7437L6.24495 9.0018L1.2869 3.25996C0.832128 2.73329 0.832128 1.88083 1.2869 1.35417C1.51323 1.09206 1.81147 0.959787 2.10972 0.959787L2.10972 0.957338Z" fill="currentColor"/>
    </g>
    <defs>
    <clipPath id="clip0_7675_24963">
    <rect width="8.10761" height="16.0865" fill="currentColor" transform="translate(9.05377 17.0432) rotate(-180)"/>
    </clipPath>
    </defs>
    </svg></div>`;

    // ✅ ENHANCED NEXT BUTTON CLICK HANDLER
    acm.buttonWrapperNext.onclick = (event) => {
      // Prevent any default behavior and event bubbling
      event.preventDefault();
      event.stopPropagation();
      
      // Check if button is disabled
      if (acm.buttonWrapperNext.hasAttribute('disabled')) {
        return;
      }

      const currentChapter = this.parent.getActiveChapter();
      const totalChapters = this.parent.chapters ? this.parent.chapters.length : 0;

      if (currentChapter + 1 < totalChapters) {
        const targetChapter = currentChapter + 1;
        
        const navigationData = {
          h5pbookid: this.parent.contentId,
          chapter: `h5p-interactive-book-chapter-${this.parent.chapters[targetChapter].instance.subContentId}`,
          section: 'top'
        };

        // Trigger navigation
        this.parent.trigger('newChapter', navigationData);
        
        // ✅ ADD: Update arrows immediately after navigation
        setTimeout(() => {
          this.updateNavigationArrows();
        }, 50);
      }
    };

    // ✅ ADD DYNAMIC WIDTH AND HEIGHT TO ARROW BUTTONS
    const buttonWidth = generateClampCSS("2.5rem", "2.5rem");
    const buttonHeight = generateClampCSS("2.5rem", "2.5rem");

    acm.buttonWrapperPrevious.style.width = buttonWidth;
    acm.buttonWrapperPrevious.style.height = buttonHeight;

    acm.buttonWrapperNext.style.width = buttonWidth;
    acm.buttonWrapperNext.style.height = buttonHeight;

    // Apply theming - Desktop theme
    if (this.themeData?.bottomNavButtons && !this.isMobileView) {
      acm.buttonWrapperPrevious.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
      acm.buttonWrapperPrevious.style.color = this.themeData?.bottomNavButtons?.iconColor;

      acm.buttonWrapperNext.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
      acm.buttonWrapperNext.style.color = this.themeData?.bottomNavButtons?.iconColor;

      acm.buttonWrapperPrevious.onmouseover = () => {
        acm.buttonWrapperPrevious.style.backgroundColor = this.themeData?.bottomNavButtons?.hover?.backgroundColor;
        acm.buttonWrapperPrevious.style.color = this.themeData?.bottomNavButtons?.hover?.iconColor;
      };

      acm.buttonWrapperNext.onmouseover = () => {
        acm.buttonWrapperNext.style.backgroundColor = this.themeData?.bottomNavButtons?.hover?.backgroundColor;
        acm.buttonWrapperNext.style.color = this.themeData?.bottomNavButtons?.hover?.iconColor;
      };

      acm.buttonWrapperPrevious.onmouseout = () => {
        acm.buttonWrapperPrevious.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
        acm.buttonWrapperPrevious.style.color = this.themeData?.bottomNavButtons?.iconColor;
      };

      acm.buttonWrapperNext.onmouseout = () => {
        acm.buttonWrapperNext.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
        acm.buttonWrapperNext.style.color = this.themeData?.bottomNavButtons?.iconColor;
      };
    }

    // Apply theming - Mobile theme
    if (this.themeData?.activity?.activityTitle?.mobileExerciseHeader?.buttons && this.isMobileView) {
      const { buttons } = this.themeData.activity.activityTitle.mobileExerciseHeader;
      if (buttons?.backgroundColor) {
        acm.buttonWrapperPrevious.style.backgroundColor = buttons.backgroundColor;
        acm.buttonWrapperNext.style.backgroundColor = buttons.backgroundColor;
      }
      if (buttons?.iconColor) {
        acm.buttonWrapperPrevious.style.color = buttons.iconColor;
        acm.buttonWrapperNext.style.color = buttons.iconColor;
      }
      acm.buttonWrapperPrevious.onmouseover = () => {
        if (buttons?.hover?.backgroundColor) {
          acm.buttonWrapperPrevious.style.backgroundColor = buttons.hover.backgroundColor;
        }
        if (buttons?.hover?.iconColor) {
          acm.buttonWrapperPrevious.style.color = buttons.hover.iconColor;
        }
      };

      acm.buttonWrapperNext.onmouseover = () => {
        if (buttons?.hover?.backgroundColor) {
          acm.buttonWrapperNext.style.backgroundColor = buttons.hover.backgroundColor;
        }
        if (buttons?.hover?.iconColor) {
          acm.buttonWrapperNext.style.color = buttons.hover.iconColor;
        }
      };

      acm.buttonWrapperPrevious.onmouseout = () => {
        if (buttons?.backgroundColor) {
          acm.buttonWrapperPrevious.style.backgroundColor = buttons.backgroundColor;
        }
        if (buttons?.iconColor) {
          acm.buttonWrapperPrevious.style.color = buttons.iconColor;
        }
      };

      acm.buttonWrapperNext.onmouseout = () => {
        if (buttons?.backgroundColor) {
          acm.buttonWrapperNext.style.backgroundColor = buttons.backgroundColor;
        }
        if (buttons?.iconColor) {
          acm.buttonWrapperNext.style.color = buttons.iconColor;
        }
      };
    }

    return acm;
  }

  /**
 * Create the top navigation arrows's wrapper
 * @return {HTMLElement} Complete top navigation wrapper
 */
  createTopNavigationWrapper() {
    // Create a div for the top navigation arrow buttons
    const topNavWrapper = document.createElement('div');
    topNavWrapper.classList.add('h5p-interactive-book-top-navigation-wrapper');
    topNavWrapper.style.gap = generateClampCSS('0.5rem', '0.5rem');

    // Create navigation arrows
    this.navigationArrows = this.createNavigationArrows();

    topNavWrapper.appendChild(this.navigationArrows.buttonWrapperPrevious);
    topNavWrapper.appendChild(this.navigationArrows.buttonWrapperNext);

    // Update navigation arrows state after creation
    setTimeout(() => {
      this.updateNavigationArrows();
    }, 50);

    return topNavWrapper;
  }

  /**
   * Set up event listeners for navigation arrow updates
   */
  setupNavigationListeners() {
    // Listen for chapter changes from the parent to update navigation arrows
    this.parent.on('newChapter', () => {
      // Use setTimeout to ensure navigation arrows are created before updating
      setTimeout(() => {
        this.updateNavigationArrows();
      }, 100);

      // Re-apply chapter height after the chapter transition animation (250ms) completes
      // so the newly active chapter's .header-section-wrapper gets correct height.
      setTimeout(() => {
        this.applyChapterHeight();
      }, 300);
    });
  }

  /**
   * Update navigation arrows based on current chapter position
   */
  updateNavigationArrows() {
    if (!this.navigationArrows) {
      return;
    }

    const currentChapter = this.parent.getActiveChapter();
    const totalChapters = this.parent.chapters ? this.parent.chapters.length : 0;

    // Disable Previous button if on first chapter
    if (currentChapter <= 0) {
      this.setArrowButtonStatus('Previous', true);
    }
    else {
      this.setArrowButtonStatus('Previous', false);
    }

    // Disable Next button if on last chapter
    if ((currentChapter + 1) >= totalChapters) {
      this.setArrowButtonStatus('Next', true);
    }
    else {
      this.setArrowButtonStatus('Next', false);
    }
  }

  /**
   * Set button status for navigation arrows (enhanced version)
   * @param {string} target - 'Previous' or 'Next'
   * @param {boolean} disable - True will disable the target button
   */
  setArrowButtonStatus(target, disable) {
    if (!this.navigationArrows) {
      return;
    }

    const buttonWrapper = this.navigationArrows['buttonWrapper' + target];

    if (disable) {
      buttonWrapper.setAttribute('disabled', 'disabled');
      buttonWrapper.classList.add('disabled');
      
      // ✅ ADD: Visual disabled state (like statusbar.js)
      buttonWrapper.style.opacity = '0.5';
      buttonWrapper.style.cursor = 'not-allowed';
      buttonWrapper.style.pointerEvents = 'none';
    } 
    else {
      buttonWrapper.removeAttribute('disabled');
      buttonWrapper.classList.remove('disabled');
      
      // ✅ ADD: Visual enabled state
      buttonWrapper.style.opacity = '1';
      buttonWrapper.style.cursor = 'pointer';
      buttonWrapper.style.pointerEvents = 'auto';
    }
  }

  /**
   * Get chapters for the page
   *
   * @param {boolean} includeSummary
   * @return {object[]} Chapters.
   */
  hasAnyCustomIndex() {
    const toc = this.parent?.params?.tableOfContents || [];
    const customIndex = this.customTocIndex || {};
    return toc.some(item => customIndex[item.activityId] !== undefined && customIndex[item.activityId] !== null);
  }

  getChapters(includeSummary = true) {
    return this.chapters.filter(chapter => !chapter.isSummary || chapter.isSummary && !!includeSummary);
  }

  /**
   * Reset all the chapters
   */
  resetChapters() {
    if (this.behaviour.progressIndicators && !this.behaviour.progressAuto) {
      this.columnNodes.forEach(columnNode => {
        Array.from(columnNode.querySelectorAll('.h5p-interactive-book-status-progress-marker > input[type=checkbox]'))
          .forEach(element => element.checked = false);
      });
    }
  }

  /**
   * Create page content.
   *
   * @return {HTMLElement} Page content.
   */
  
  
  createPageContent() {
    const content = document.createElement('div');
    content.classList.add('h5p-interactive-book-content');

    this.columnNodes.forEach((element, index) => {
      // ✅ FIX: If this chapter has a wrapper (recall activity), append the wrapper instead of columnNode
      const chapter = this.chapters[index];
      if (chapter && chapter.chapterWrapper) {
        content.appendChild(chapter.chapterWrapper);
      } 
      else {
        content.appendChild(element);
      }
    });

    this.setChapterOrder(this.parent.getActiveChapter());

    return content;
  }

  setChapterOrder(currentId) {
    if (currentId < 0 || currentId > this.columnNodes.length - 1) {
      return;
    }

    this.columnNodes.forEach((element, index) => {
      element.classList.remove('h5p-interactive-book-previous');
      element.classList.remove('h5p-interactive-book-current');
      element.classList.remove('h5p-interactive-book-next');

      if (index === currentId - 1) {
        // element.classList.add('h5p-interactive-book-previous');
      }
      else if (index === currentId) {
        element.classList.add('h5p-interactive-book-current');
      }
      else if (index === currentId + 1) {
        // element.classList.add('h5p-interactive-book-next');
      }
    });
  }

  /**
   * Apply calculated height to a chapter element.
   * Deferred execution to ensure DOM is ready.
   * @param {HTMLElement} element - The chapter element to apply height to
   */
  applyChapterHeight(retryCount = 0) {
    const MAX_RETRIES = 20; // ~2 seconds total (20 × 100ms)
    // Use requestAnimationFrame to wait for DOM to be ready
    requestAnimationFrame(() => {
      // Query inside rAF so we always get the latest DOM state
      const elements = document.querySelectorAll('.h5p-interactive-book-chapter');

      // .h5p-interactive-book-chapter elements not in DOM yet — retry
      if (elements.length === 0) {
        if (retryCount < MAX_RETRIES) setTimeout(() => this.applyChapterHeight(retryCount + 1), 100);
        return;
      }

      // Full window height (in px)
      const windowHeight = checkDevice().height;

      // Height of the status header (in px)
      let headerHeight = 0;
      const statusHeader = document.querySelector('.h5p-interactive-book-status-header');
      if (statusHeader && statusHeader.getBoundingClientRect().height > 0) {
        headerHeight = statusHeader.getBoundingClientRect().height;
      }
      else if (this.parent?.statusBarHeader?.wrapper) {
        // Try to get from parent's wrapper element
        const wrapper = this.parent.statusBarHeader.wrapper;
        headerHeight = wrapper.offsetHeight || wrapper.clientHeight || 0;
      }

      // If still 0, the DOM isn't ready yet - retry after a short delay
      if (headerHeight === 0) {
        if (retryCount < MAX_RETRIES) setTimeout(() => this.applyChapterHeight(retryCount + 1), 100);
        return;
      }

      // Convert 1rem to px (get root font size)
      const remInPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const bottomPadding = 1 * remInPx; // 1rem in px

      // Available height (window minus header minus bottom padding) - all in px
      const availableHeight = windowHeight - headerHeight - (this.isMobileView ? 0 : bottomPadding);

      // Apply available height to chapter element
      // Note: only initialized/attached chapters have .header-section-wrapper.
      // Uninitialized chapters are lazy-loaded and will get styled when navigated to.
      const activeChapterIndex = this.parent.getActiveChapter();
      elements.forEach((el, index) => {
        el.style.minHeight = `${availableHeight}px`;

        // Only apply header-section-wrapper height to the current active chapter
        // if (index === activeChapterIndex) {
        //   const headerSectionWrapper = el.querySelector('.header-section-wrapper');
        //   if (headerSectionWrapper) {
        //     headerSectionWrapper.style.maxHeight = `${availableHeight}px`;
        //     // Use setProperty() for !important - direct style assignment doesn't parse !important flag
        //     headerSectionWrapper.style.setProperty('min-height', `${availableHeight}px`, 'important');
        //   }
        // }
      });

    });
  }

  /**
   * Create page read checkbox.
   *
   * @param {boolean} checked True, if box should be checked.
   * @return {HTMLElement} Checkbox for marking a chapter as read.
   */
  createChapterReadCheckbox(checked) {
    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.checked = checked;
    checkbox.onclick = (event) => {
      this.parent.setChapterRead(undefined, event.target.checked);
    };

    const checkText = document.createElement('p');
    checkText.innerHTML = this.params.l10n.markAsFinished;

    const wrapper = document.createElement('label');
    wrapper.classList.add('h5p-interactive-book-status-progress-marker');
    wrapper.appendChild(checkbox);
    wrapper.appendChild(checkText);

    return wrapper;
  }

  /**
   * Inject section instance UUID into DOM.
   *
   * @param {object[]} sections Sections.
   * @param {HTMLElement} columnNode Column element.
   */
  injectSectionId(sections, columnNode) {
    const columnContent = columnNode.getElementsByClassName('h5p-column-content');

    for (let i = 0; i < sections.length; i++) {
      columnContent[i].id = `h5p-interactive-book-section-${sections[i].instance.subContentId}`;
      
    }
  }

  /**
   * Preload current chapter and the next one
   * @param {number} chapterIndex
   */
  preloadChapter(chapterIndex) {
    this.initializeChapter(chapterIndex);
    this.initializeChapter(chapterIndex + 1);
  }

  /**
   * Initialize chapter
   * @param {number} chapterIndex
   */
  initializeChapter(chapterIndex) {
    
    // Out of bound
    if (chapterIndex < 0 || chapterIndex > this.chapters.length - 1) {
      return;
    }

    const chapter = this.chapters[chapterIndex];
    if ( chapter.isSummary) {
      const columnNode = this.columnNodes[chapterIndex];

      if (chapter.isInitialized) {
        chapter.instance.setChapters(this.getChapters(false));
        columnNode.innerHTML = "";
      }
      // Attach
      chapter.instance.addSummaryPage(H5P.jQuery(columnNode));
      chapter.isInitialized = true;
      return;
    }
    if (!chapter.isInitialized) {
      const columnNode = this.columnNodes[chapterIndex];

      // ── Recall Accordion / Blocking Overlay ───────────────────────────────
      // If the linked (previous) activity is already completed → show the recall
      // accordion so the user can review their answers.
      // If NOT completed → show a blocking overlay that prevents work on this
      // chapter and offers a "Go to Activity" button to navigate back.
      let recallAccordionEl = null;
      let recallBlockOverlayEl = null;
      if (chapter.recallActivityConfig) {
        const { linkedActivityId, linkedActivityTitle } = chapter.recallActivityConfig;

        // Already completed? (e.g. restored from previous state)
        const isAlreadyCompleted =
          this.parent?.childActivityResults?.[linkedActivityId]?.completed === true;

        if (isAlreadyCompleted) {
          // ── Accordion (completed path) ──────────────────────────────────
          const accordion = RecallAccordion({
            linkedActivityId,
            linkedActivityTitle: linkedActivityTitle || linkedActivityId,
            isInitiallyEnabled: true,
            themeData: this.themeData,
            l10n: this.l10n,
            isMobile: this.isMobileView,
            parent: this.parent,
            onExpand: (contentArea) => {
              const prevChapter = this.chapters[chapterIndex - 1];
              this.renderRecallActivity(contentArea, prevChapter);
            },
          });
          chapter.recallAccordionInstance = accordion;
          recallAccordionEl = accordion.getElement();
          
          // ✅ FIX: Ensure interaction is enabled when recall is completed
          columnNode.style.pointerEvents = '';
          columnNode.style.userSelect = '';
        }
        else {
          // ── Blocking overlay (incomplete path) ─────────────────────────
          recallBlockOverlayEl = this.createRecallBlockOverlay(
            linkedActivityId,
            linkedActivityTitle || linkedActivityId,
            chapterIndex
          );
          chapter.recallBlockOverlay = recallBlockOverlayEl;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // Attach
      chapter.instance.attach(H5P.jQuery(columnNode));
      this.injectSectionId(chapter.sections, columnNode);

      // ✅ NEW STRUCTURE: Create wrapper ONLY if this chapter has a recall activity
      // Wrapper contains: [recall element, chapter content, overlay]
      if (recallAccordionEl || recallBlockOverlayEl) {
        // ✅ FIX: Check if columnNode is already in DOM BEFORE creating wrapper structure
        const parent = columnNode.parentNode;
        
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.classList.add('h5p-interactive-book-chapter-wrapper');
        wrapper.style.position = 'relative'; // Always set position relative for absolute children
        
        // Add recall element as FIRST child of wrapper
        if (recallAccordionEl) {
          wrapper.appendChild(recallAccordionEl);
        }
        
        // ✅ CRITICAL: If columnNode is already in DOM, replace it FIRST, then append to wrapper
        if (parent) {
          // Replace columnNode with wrapper in DOM
          parent.replaceChild(wrapper, columnNode);
          // Now append columnNode to wrapper
          wrapper.appendChild(columnNode);
        } 
        else {
          // columnNode not in DOM yet - safe to append directly
          wrapper.appendChild(columnNode);
        }
        
        // If blocking overlay exists, add it LAST so it overlays everything
        if (recallBlockOverlayEl) {
          // Disable interaction with chapter content when overlay is present
          columnNode.style.pointerEvents = 'none';
          columnNode.style.userSelect = 'none';
          
          // Add overlay as last child (will be positioned absolutely over everything)
          wrapper.appendChild(recallBlockOverlayEl);
        }
        
        // Store wrapper reference
        chapter.chapterWrapper = wrapper;
      }

      if (this.behaviour.progressIndicators && !this.behaviour.progressAuto) {
        columnNode.appendChild(this.createChapterReadCheckbox(!!this.previousState?.chapters?.[chapterIndex].completed));
      }

      chapter.isInitialized = true;
    }
  }

  /**
   * Build and inject a recall accordion for an already-initialized chapter
   * whose blocking overlay has just been removed (because the linked activity
   * was just completed).  Called from app.js after overlay removal.
   *
   * @param {number} chapterIndex
   */
  buildRecallAccordionForChapter(chapterIndex) {
    const chapter = this.chapters[chapterIndex];
    if (!chapter || !chapter.recallActivityConfig || chapter.recallAccordionInstance) {
      return;
    }
    const columnNode = this.columnNodes[chapterIndex];
    const { linkedActivityId, linkedActivityTitle } = chapter.recallActivityConfig;

    const accordion = RecallAccordion({
      linkedActivityId,
      linkedActivityTitle: linkedActivityTitle || linkedActivityId,
      isInitiallyEnabled: true,
      themeData: this.themeData,
      l10n: this.l10n,
      isMobile: this.isMobileView,
      parent: this.parent,
      onExpand: (contentArea) => {
        const prevChapter = this.chapters[chapterIndex - 1];
        this.renderRecallActivity(contentArea, prevChapter);
      },
    });

    chapter.recallAccordionInstance = accordion;
    const accordionEl = accordion.getElement();

    // ✅ NEW STRUCTURE: Create wrapper if it doesn't exist yet
    if (!chapter.chapterWrapper) {
      // Create wrapper div
      const wrapper = document.createElement('div');
      wrapper.classList.add('h5p-interactive-book-chapter-wrapper');
      
      // Get the parent (h5p-interactive-book-content) and replace columnNode with wrapper
      const parent = columnNode.parentNode;
      if (parent) {
        parent.replaceChild(wrapper, columnNode);
      }
      
      // Add accordionEl as FIRST child
      wrapper.appendChild(accordionEl);
      
      // Add columnNode as SECOND child
      wrapper.appendChild(columnNode);
      
      // Store wrapper reference
      chapter.chapterWrapper = wrapper;
    } 
    else {
      // Wrapper already exists (blocking overlay was there before)
      // Insert accordion as first child (before columnNode)
      chapter.chapterWrapper.insertBefore(accordionEl, columnNode);
    }

    this.parent?.trigger('resize');
  }

  /**
   * Create a blocking overlay shown over a chapter when its linked recall
   * activity has not been completed yet.
   *
   * @param {string} linkedActivityId - subContentId of the previous chapter.
   * @param {string} linkedActivityTitle - Human-readable title.
   * @param {number} chapterIndex - Index of the current (blocked) chapter.
   * @return {HTMLElement} Overlay element.
   */
  createRecallBlockOverlay(linkedActivityId, linkedActivityTitle, chapterIndex) {
    const overlay = document.createElement('div');
    overlay.classList.add('recall-block-overlay');

    const card = document.createElement('div');
    card.classList.add('recall-block-overlay__card');
    card.style.gap = generateClampCSS('1.25rem', '1.25rem');
    card.style.paddingBlock = generateClampCSS('1.25rem', '1.25rem');
    card.style.paddingInline = '0';
    
    // Apply popup theme font family
    if (this.themeData?.activityRecall?.recallPopup?.fontFamily) {
      card.style.fontFamily = this.themeData.activityRecall.recallPopup.fontFamily;
    }

    // Warning icon
    const iconWrap = document.createElement('div');
    iconWrap.classList.add('recall-block-overlay__icon');
    iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`;

    // Title
    const titleEl = document.createElement('h3');
    titleEl.classList.add('recall-block-overlay__title');
    titleEl.textContent = this.l10n?.recallBlockTitle || 'Previous answers not found';

    // Apply recall popup title theme (supports mobile override)
    const popupTitleTheme = this.themeData?.activityRecall?.recallPopup?.title;
    if (popupTitleTheme) {
      const popupFontSize = this.isMobileView ? popupTitleTheme.mobile?.fontSize || popupTitleTheme.fontSize : popupTitleTheme.fontSize;
      if (popupFontSize) titleEl.style.fontSize = generateClampCSS(popupFontSize, popupFontSize);
      if (popupTitleTheme.fontWeight) titleEl.style.fontWeight = popupTitleTheme.fontWeight;
      if (popupTitleTheme.fontColor) titleEl.style.color = popupTitleTheme.fontColor;
      if (popupTitleTheme.fontFamily) titleEl.style.fontFamily = popupTitleTheme.fontFamily;
    }

    // Description
    const descEl = document.createElement('p');
    descEl.classList.add('recall-block-overlay__desc');
    // linkedActivityTitle now contains formatted string like "Activity 1 - Reading"
    descEl.textContent = this.l10n?.recallBlockDesc
      ? this.l10n.recallBlockDesc.replace('{title}', linkedActivityTitle)
      : `Complete '${linkedActivityTitle}' before continuing.`;

    // Apply recall popup message theme (supports mobile override)
    const popupMessageTheme = this.themeData?.activityRecall?.recallPopup?.message;
    if (popupMessageTheme) {
      const popupMessageFontSize = this.isMobileView ? popupMessageTheme.mobile?.fontSize || popupMessageTheme.fontSize : popupMessageTheme.fontSize;
      if (popupMessageFontSize) descEl.style.fontSize = generateClampCSS(popupMessageFontSize, popupMessageFontSize);
      if (popupMessageTheme.fontWeight) descEl.style.fontWeight = popupMessageTheme.fontWeight;
      if (popupMessageTheme.fontColor) descEl.style.color = popupMessageTheme.fontColor;
      if (popupMessageTheme.fontFamily) descEl.style.fontFamily = popupMessageTheme.fontFamily;
    }

    // CTA button — navigates to the previous chapter (the linked activity)
    const btn = document.createElement('button');
    btn.classList.add('recall-block-overlay__btn');
    btn.setAttribute('type', 'button');
    
    // Wrap text in span for better vertical alignment control
    const btnTextSpan = document.createElement('span');
    btnTextSpan.textContent = this.l10n?.recallBlockBtn || 'Go to Activity';
    btn.appendChild(btnTextSpan);
    
    // Apply theme to "Go to Activity" button
    if (this.themeData?.activityRecall?.recallPopup?.activityButton) {
      const btnTheme = this.themeData.activityRecall.recallPopup.activityButton;
      if (btnTheme.bgColor) btn.style.backgroundColor = btnTheme.bgColor;
      if (btnTheme.fontColor) btn.style.color = btnTheme.fontColor;
      // Use mobile override for fontSize when present
      if (btnTheme.fontSize || (this.isMobileView && btnTheme.mobile?.fontSize)) {
        const btnFontSize = (this.isMobileView && btnTheme.mobile?.fontSize) ? btnTheme.mobile.fontSize : btnTheme.fontSize;
        if (btnFontSize) btn.style.fontSize = generateClampCSS(btnFontSize, btnFontSize);
      }
      if (btnTheme.fontWeight) btn.style.fontWeight = btnTheme.fontWeight;
      if (btnTheme.fontFamily) btn.style.fontFamily = btnTheme.fontFamily;
      
      // Apply hover colors via data attributes for CSS or JS hover handlers
      if (btnTheme.hover?.bgColor) {
        btn.dataset.hoverBgColor = btnTheme.hover.bgColor;
        btn.addEventListener('mouseenter', () => {
          btn.style.backgroundColor = btnTheme.hover.bgColor;
          if (btnTheme.hover.fontColor) btn.style.color = btnTheme.hover.fontColor;
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.backgroundColor = btnTheme.bgColor || '';
          btn.style.color = btnTheme.fontColor || '';
        });
      }
    }
    btn.addEventListener('click', () => {
      const prevChapterIndex = chapterIndex - 1;
      if (prevChapterIndex >= 0 && this.parent.chapters[prevChapterIndex]) {
        const targetInstance = this.parent.chapters[prevChapterIndex].instance;
        this.parent.trigger('newChapter', {
          h5pbookid: this.parent.contentId,
          chapter: `h5p-interactive-book-chapter-${targetInstance.subContentId}`,
          section: 'top',
        });
      }
    });

    card.appendChild(iconWrap);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(btn);
    overlay.appendChild(card);

    return overlay;
  }

  /**
   * Render the previous activity with its live completed state into the
   * recall accordion's content area.
   *
   * @param {HTMLElement} contentArea - The accordion content container.
   * @param {object} prevChapter - The previous chapter object.
   */
  renderRecallActivity(contentArea, prevChapter) {
    const sections = prevChapter?.sections || [];

    if (sections.length === 0 || !prevChapter?.chapterConfig) {
      contentArea.textContent = 'No recalled data available.';
      return;
    }

    // Section header rows (question text only)
    sections.forEach((section, idx) => {
      const params = section.content?.params || {};
      const questionHTML =
        params.taskDescription ||
        params.title ||
        params.description ||
        section.content?.metadata?.title ||
        `Activity ${idx + 1}`;

      const questionText = document.createElement('div');
      questionText.classList.add('recall-accordion__question-text');
      questionText.innerHTML = questionHTML;
      questionText.style.paddingBlock = generateClampCSS('0.75rem', '0.75rem');
      questionText.style.paddingInline = '0';

      // Apply dynamic theme from activityRecall.showHide.rubricText
      const rubricTheme = this.themeData?.activityRecall?.showHide?.rubricText || {};
      // Prefer mobile override when present and we're in mobile view
      const rubricFontSize = (this.isMobileView && rubricTheme.mobile?.fontSize) ? rubricTheme.mobile.fontSize : rubricTheme.fontSize;
      if (rubricFontSize) questionText.style.fontSize = generateClampCSS(rubricFontSize, rubricFontSize);
      if (rubricTheme.fontWeight) questionText.style.fontWeight = rubricTheme.fontWeight;
      if (rubricTheme.fontColor) questionText.style.color = rubricTheme.fontColor;
      if (rubricTheme.fontFamily) questionText.style.fontFamily = rubricTheme.fontFamily;

      contentArea.appendChild(questionText);
    });

    // Capture live answers at expand time — H5P Column restores each
    // sub-instance (MCQ, T/F, etc.) from this state object.
    const liveState = typeof prevChapter.instance.getCurrentState === 'function'
      ? prevChapter.instance.getCurrentState()
      : {};

    // Insert DOM node BEFORE newRunnable so sub-instances can measure dimensions.
    const activityWrapper = document.createElement('div');
    activityWrapper.classList.add('recall-accordion__activity-wrapper');
    const recallColumnNode = document.createElement('div');
    recallColumnNode.classList.add('h5p-interactive-book-chapter');
    activityWrapper.appendChild(recallColumnNode);
    contentArea.appendChild(activityWrapper);

    // Polyfill H5P.isEmpty — some sub-libraries call it in their constructor.
    if (typeof H5P.isEmpty !== 'function') {
      H5P.isEmpty = (obj) => !obj || Object.keys(obj).length === 0;
    }

    const recallInstance = H5P.newRunnable(
      prevChapter.chapterConfig,
      this.contentId,
      H5P.jQuery(recallColumnNode),
      false,
      {
        ...this.contentData,
        metadata: {
          ...(this.contentData?.metadata || {}),
          defaultLanguage: H5PIntegration?.language || 'en',
        },
        previousState: liveState || {},
      }
    );
    recallColumnNode.id = `h5p-interactive-book-chapter-${recallInstance.subContentId}`;
    this.parent.bubbleUp(recallInstance, 'resize', this.parent);

    // Watch for ALL .header-section-wrapper elements to appear in the rendered
    // activity (handles single-activity AND multi-activity Column cases).
    // A Set tracks already-processed wrappers so we never double-apply.
    // The observer disconnects once the DOM has settled (2 s after the last
    // mutation), mirroring the applyChapterHeight retry pattern.
    const processedWrappers = new Set();
    let settleTimer = null;

    const hideRecallChrome = (wrapper) => {
      if (processedWrappers.has(wrapper)) return;
      processedWrappers.add(wrapper);

      wrapper.classList.add('h5p-recall-content', 'readonly-container');

      // Hide header/footer INSIDE the wrapper (children).
      ['header', 'footer'].forEach(selector => {
        wrapper.querySelectorAll(selector).forEach(el => {
          el.style.setProperty('display', 'none', 'important');
        });
      });

      // .draggable-container-ui is a SIBLING of .header-section-wrapper, not a
      // child — so search from the wrapper's parent element instead.
      const parent = wrapper.parentElement;
      if (parent) {
        parent.querySelectorAll('.draggable-container-ui').forEach(el => {
          el.style.setProperty('display', 'none', 'important');
        });
      }
    };

    const observer = new MutationObserver(() => {
      recallColumnNode.querySelectorAll('.header-section-wrapper').forEach(hideRecallChrome);

      // Also catch any .draggable-container-ui that may have been injected
      // without a corresponding .header-section-wrapper mutation.
      recallColumnNode.querySelectorAll('.draggable-container-ui').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });

      if (processedWrappers.size > 0) {
        this.parent?.trigger('resize');
      }

      // Disconnect after no further DOM changes for 2 seconds.
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => observer.disconnect(), 2000);
    });

    observer.observe(recallColumnNode, { childList: true, subtree: true });
  }

  /**
   * Create Column instances.
   *
   * @param {object} config Parameters.
   * @param {number} contentId Content id.
   * @param {object} contentData Content data.
   * @return {number} start chapter
   */
  createColumns(config, contentId, contentData) {
    contentData = Object.assign({}, contentData);

    // Restore previous state
    const previousState = (contentData.previousState && Object.keys(contentData.previousState).length > 0) ?
      contentData.previousState :
      null;
    let urlFragments = URLTools.extractFragmentsFromURL(this.parent.validateFragments, this.parent.hashWindow);
    if (Object.keys(urlFragments).length === 0 && contentData && previousState && previousState.urlFragments) {
      urlFragments = previousState.urlFragments;
    }

    const chapters = [];
    this.chapters = chapters;

    // Go through all columns and initialise them
    for (let i = 0; i < config.chapters.length; i++) {
      const columnNode = document.createElement('div');

      const instanceContentData = {
        ...contentData,
        metadata: {
          ...contentData.metadata, 
          defaultLanguage: H5PIntegration?.ln || 'en'
        },
        previousState: (previousState) ? previousState.chapters[i].state : {},
      };
      const newInstance = H5P.newRunnable(config.chapters[i], contentId, undefined, undefined, instanceContentData);
      this.parent.bubbleUp(newInstance, 'resize', this.parent);
     
      const chapter = {
        isInitialized: false,
        instance: newInstance,
        chapterConfig: config.chapters[i],
        title: config.chapters[i].metadata.title,
        completed: (previousState) ? previousState.chapters[i].completed : false,
        tasksLeft: (previousState) ? previousState.chapters[i].tasksLeft : 0,
        isSummary: false,
        sections: newInstance.getInstances().map((instance, contentIndex) => ({
          content: config.chapters[i].params.content[contentIndex].content,
          instance: instance,
          isTask: false,
          skill : config.chapters[i].params.content[contentIndex].content.params.skill || '--',
          activityId: config.chapters[i].params.content[contentIndex]?.content?.params?.activityMetadata?.activityId || `--`,
          description : config.chapters[i].params.content[contentIndex].content.params.description || 'Add Description',
          contentIndex: contentIndex,
        }))
      };

      columnNode.classList.add('h5p-interactive-book-chapter');
      columnNode.id = `h5p-interactive-book-chapter-${newInstance.subContentId}`;

      chapter.maxTasks = 0;
      chapter.tasksLeft = 0;

      // Find sections with tasks and tracks them
      chapter.sections.forEach((section, index) => {
        if (H5P.Pears_ColumnTest?.isTask(section.instance)) {
          section.isTask = true;
          chapter.maxTasks++;
          chapter.tasksLeft++;

          if (this.behaviour.progressIndicators) {
            section.taskDone = (previousState) ? previousState.chapters[i]?.sections[index]?.taskDone : false;
            if (section.taskDone) {
              chapter.tasksLeft--;
            }
          }
        }
      });

      const columnNodeContainer = document.createElement('div');
      const divElement = document.createElement('div');
      divElement.innerHTML = "test content";
      divElement.classList.add('my-div');
      columnNodeContainer.appendChild(divElement);
      columnNodeContainer.appendChild(columnNode);

      if (i > 0) {
        const prevChapter = chapters[i - 1];
        const prevSkillCode = prevChapter.sections[0]?.skill || '';
        const prevSkillLabel = getPageContentTOCData(prevSkillCode, this.parent?.params?.skillData, this.themeData).label || prevSkillCode || '--';
        
        // Convert skill label to proper case (capitalize first letter of each word)
        const toProperCase = (str) => {
          return str.replace(/\b\w/g, (char) => char.toUpperCase());
        };
        const prevSkillProperCase = toProperCase(prevSkillLabel);
        
        const exerciseType = GenerateExerciseDiv(this.segment); // Returns "Activity " or "Exercise "
        const prevActivityNumber = i; // Previous chapter's 1-based ordinal
        
        // Format: "Activity 1 - Reading" or "Exercise 2 - Writing"
        const formattedTitle = `${exerciseType}${prevActivityNumber} - ${prevSkillProperCase}`;
        
        // 🔥 FIX: Use instance.subContentId (the sectionUUID used in xAPI completion tracking)
        // The xAPI event handler in app.js stores completion using sectionUUID (instance.subContentId).
        // This MUST match to correctly check if the previous activity is completed.
        const prevActivityId = prevChapter.sections[0].instance.subContentId; // ← This is the sectionUUID

        chapter.recallActivityConfig = {
          linkedActivityId: prevActivityId, // Use instance.subContentId (sectionUUID)
          linkedActivityTitle: formattedTitle,
        };
      }
      else {
        chapter.recallActivityConfig = null; // First chapter has nothing to recall
      }

      // Register both the HTML-element and the H5P-element
      chapters.push(chapter);
      this.columnNodes.push(columnNode);
    }

    if (this.parent.hasSummary(chapters)) {
      const columnNode = document.createElement('div');
      const newInstance = new Summary({
        ...config,
      },
      this.parent,
      this.getChapters(false)
      );
      this.parent.bubbleUp(newInstance, 'resize', this.parent);

      const chapter = {
        isInitialized: false,
        instance: newInstance,
        title: this.l10n.summaryHeader,
        isSummary: true,
        sections:[],
      };

      columnNode.classList.add('h5p-interactive-book-chapter');
      columnNode.id = `h5p-interactive-book-chapter-summary`;

      chapter.maxTasks = chapter.tasksLeft;
      chapters.push(chapter);
      this.columnNodes.push(columnNode);
    }

    // First chapter or cover page should be visible, except if the URL of previous state says otherwise.
    if (urlFragments.chapter && urlFragments.h5pbookid == this.parent.contentId) {
      const chapterIndex = this.findChapterIndex(urlFragments.chapter);
      if (chapterIndex === -1) {
        // Chapter requested does not exist - do nothing, so that the cover page or first chapter (0 by default) is displayed.
        return 0;
      }

      this.parent.setActiveChapter(chapterIndex);

      if (urlFragments.section) {
        const headerNumber = urlFragments.headerNumber;
        window.requestAnimationFrame(() => {
          this.redirectSection(urlFragments.section, headerNumber);
          if (this.parent.hasCover()) {
            this.parent.cover.removeCover();
          }
        });
      }

      return chapterIndex;
    }

    return 0;
  }

  /**
   * Redirect section.
   *
   * @param {string} sectionUUID Section UUID or top.
   * @param {number} headerNumber Header index within section
   */
  redirectSection(sectionUUID, headerNumber = null) {
    if (sectionUUID === 'top') {
      this.parent.trigger('scrollToTop');
    }
    else {
      let section = document.getElementById(sectionUUID);

      if (section) {
        if (headerNumber !== null) {
          // find header within section
          const headers = section.querySelectorAll('h2, h3');
          if (headers[headerNumber]) {
            // Set section to the header
            section = headers[headerNumber];
          }
        }

        const focusHandler = document.createElement('div');
        focusHandler.setAttribute('tabindex', '-1');
        section.parentNode.insertBefore(focusHandler, section);
        focusHandler.focus();

        focusHandler.addEventListener('blur', () => {
          focusHandler.parentNode.removeChild(focusHandler);
        });

        this.targetPage.redirectFromComponent = false;
        setTimeout(() => {
          section.scrollIntoView(true);
        }, 100);
      }
    }
  }

  /**
   * Find chapter index.
   *
   * @param {string} chapterUUID Chapter UUID.
   * @return {number} Chapter id.
   */
  findChapterIndex(chapterUUID) {
    let position = -1;
    this.columnNodes.forEach((element, index) => {
      if (position !== -1) {
        return; // Skip
      }
      if (element.id === chapterUUID) {
        position = index;
      }
    });

    return position;
  }

  /**
   * Change chapter.
   *
   * @param {boolean} redirectOnLoad True if should redirect on load.
   * @param {object} target Target.
   */
  changeChapter(redirectOnLoad, target) {
    if (this.columnNodes[this.parent.getActiveChapter()].classList.contains('h5p-interactive-book-animate')) {
      return;
    }
    
    this.targetPage = target;
    const chapterIdOld = this.parent.getActiveChapter();
    const chapterIdNew = this.parent.getChapterId(this.targetPage.chapter);
    const hasChangedChapter = chapterIdOld !== chapterIdNew;
    
    if (hasChangedChapter) {
      document.querySelectorAll('.excercise').forEach(element => {
        let activityOrdinal = element.querySelector('.activityOrdinal');
        const activityId = this.chapters[chapterIdNew]?.sections[0]?.activityId || '';
        const customNumber = this.customTocIndex?.[activityId];
        if ( this.hasAnyCustom) {
          if (customNumber) {
            activityOrdinal.innerHTML = customNumber;
            element.style.display = 'inline-block'; // Make sure it's visible
          } 
          else {
            element.style.display = 'none';
          }
          const separator = element.parentNode.querySelector('.separator');
          if (separator) {
            separator.style.display = customNumber ? 'inline-block' : 'none';
          }
        }
        else {
          activityOrdinal.innerHTML = chapterIdNew + 1;
        }
      });
      const skill = getPageContentTOCData(this.chapters[chapterIdNew]?.sections[0]?.skill, this.parent?.params?.skillData, this.themeData).label || '--';
      document.querySelectorAll('.activitySkill').forEach(element => {
        element.innerHTML = skill;
      });
    }

    if (!redirectOnLoad) {
      this.parent.updateChapterProgress(chapterIdOld, hasChangedChapter);
    }

    this.preloadChapter(chapterIdNew);

    // Always collapse the recall accordion on the target chapter when navigating.
    this.chapters[chapterIdNew]?.recallAccordionInstance?.collapse();

    if (chapterIdNew < this.columnNodes.length) {
      const oldChapter = this.columnNodes[chapterIdOld];
      const targetChapter = this.columnNodes[chapterIdNew];

      if (hasChangedChapter && !redirectOnLoad) {
        this.parent.setActiveChapter(chapterIdNew);

        const direction = (chapterIdOld < chapterIdNew) ? 'next' : 'previous';

        /*
         * Animation done by making the current and the target node
         * visible and then applying the correct translation in x-direction
         */
        targetChapter.classList.add(`h5p-interactive-book-${direction}`);

        // Lock the content container height and hide overflow so the two
        // absolutely-positioned chapters don't cause the container to grow
        // or a scrollbar flash during the slide animation.
        const lockedHeight = this.content.offsetHeight;
        this.content.style.height = `${lockedHeight}px`;
        this.content.style.overflow = 'hidden';

        targetChapter.classList.add('h5p-interactive-book-animate');
        oldChapter.classList.add('h5p-interactive-book-animate');

        // Start the animation
        setTimeout(() => {
          if (direction === 'previous') {
            oldChapter.classList.add('h5p-interactive-book-next');
          }
          else {
            oldChapter.classList.remove('h5p-interactive-book-current');
            oldChapter.classList.add('h5p-interactive-book-previous');
          }
          targetChapter.classList.remove(`h5p-interactive-book-${direction}`);
        }, 1);

        // End the animation
        setTimeout(() => {
          oldChapter.classList.remove('h5p-interactive-book-next');
          oldChapter.classList.remove('h5p-interactive-book-previous');

          oldChapter.classList.remove('h5p-interactive-book-current');
          targetChapter.classList.add('h5p-interactive-book-current');

          targetChapter.classList.remove('h5p-interactive-book-animate');
          oldChapter.classList.remove('h5p-interactive-book-animate');

          // Release the height lock — let the new chapter's natural height take over.
          this.content.style.height = '';
          this.content.style.overflow = '';

          this.redirectSection(this.targetPage.section, this.targetPage.headerNumber);

          // Re-apply chapter height so the newly initialized chapter's
          // .header-section-wrapper gets min/max height set correctly.
          this.applyChapterHeight();

          // On desktop, re-open the recall accordion if the previous activity
          // was already completed (accordion is enabled).
          if (!this.isMobileView) {
            this.chapters[chapterIdNew]?.recallAccordionInstance?.expandIfEnabled();
          }

          this.parent.trigger('resize');
        }, 250);
      }
      else {
        if (this.parent.cover && !this.parent.cover.hidden) {
          this.parent.on('coverRemoved', () => {
            this.redirectSection(this.targetPage.section, this.targetPage.headerNumber);
          });
        }
        else {
          this.redirectSection(this.targetPage.section, this.targetPage.headerNumber);
        }
      }

      if (this.isSimpleView) {
        this.parent.simpleViewSideBar.redirectHandler(chapterIdNew);
        this.parent?.statusBarHeader?.simpleViewToc?.redirectHandler(chapterIdNew);
        
      } 
      else {
        this.parent.sideBar.redirectHandler(chapterIdNew);
      }
    }
  }

  /**
   * Toggle the navigation menu.
   */
  toggleNavigationMenu() {
    const self = this;
    if (!this.sidebarIsOpen) {
      this.container.classList.remove('h5p-interactive-book-navigation-hidden');
      setTimeout(function () {
        self.container.classList.add('h5p-interactive-book-navigation-open');
        if (checkDevice().mobile) {
          const outerHeight = checkDevice().height;
          self.container.style.height = `${outerHeight}px`;
        }

      }, 1);
    }
    else {
      // Wait for the tranistion to end before hiding it completely
      H5P.Transition.onTransitionEnd(H5P.jQuery(this.container), function () {
        self.container.classList.add('h5p-interactive-book-navigation-hidden');
        // Reset the inline height that was locked to the device height when the
        // TOC was opened on mobile, so the activity page returns to natural
        // auto height and the browser-level scroll does not reappear.
        if (checkDevice().mobile) {
          self.container.style.height = '';
        }
      }, 500);
      this.container.classList.remove('h5p-interactive-book-navigation-open');
    }

    this.sidebarIsOpen = !this.sidebarIsOpen;
  }

  /**
   * Update labels when language changes
   * This refreshes navigation button attributes with new l10n values
   * 
   * @param {Object} l10n - New l10n object with translated strings
   */
  updateLabels(l10n) {
    if (l10n) {
      this.l10n = l10n;
    }

    // Update navigation arrows if they exist
    if (this.navigationArrows) {
      if (this.navigationArrows.buttonWrapperPrevious) {
        const prevLabel = this.l10n?.previousPage || 'Previous Page';
        this.navigationArrows.buttonWrapperPrevious.setAttribute('aria-label', prevLabel);
        this.navigationArrows.buttonWrapperPrevious.setAttribute('title', prevLabel);
      }

      if (this.navigationArrows.buttonWrapperNext) {
        const nextLabel = this.l10n?.nextPage || 'Next Page';
        this.navigationArrows.buttonWrapperNext.setAttribute('aria-label', nextLabel);
        this.navigationArrows.buttonWrapperNext.setAttribute('title', nextLabel);
      }
    }
  }
}

export default PageContent;
