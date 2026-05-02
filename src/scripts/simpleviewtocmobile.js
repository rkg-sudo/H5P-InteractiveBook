/**
 * A component which helps in navigation
 * Constructor function.
 * 
 */

import { generateClampCSS, sendPostMessage } from "./utils";
import { getSimpleViewTOCMobileTOCData } from "./utils/getTOCData";

class SimpleViewTOCMobile extends H5P.EventDispatcher {
  constructor(config, contentId, mainTitle, parent, config1) {
    super();
    this.themeData = config.themeData;
    this.id = contentId;
    this.parent = parent;
    this.behaviour = config.behaviour;
    this.content = document.createElement('ul');
    this.content.classList.add('simple-view-navigation-list-toc');
    this.container = this.addSideBar();
    this.l10n = config.l10n;
    this.config = config1;

    this.customTocIndex = config1?.custom_toc_index || {};
    this.chapters = this.findAllChapters(config1.chapters);
    this.hasCustomIndex = this.hasAnyCustomIndex();
    this.chapterNodes = this.getChapterNodes();

    this.chapterNodes.forEach(element => {
      this.content.appendChild(element);
    });

    // Add home button
    const homeButtonElement = document.createElement('li');
    homeButtonElement.classList.add('h5p-interactive-book-navigation-chapter-toc', 'h5p-interactive-book-navigation-closed');
    
    const homeTocData = getSimpleViewTOCMobileTOCData("home", this.parent?.params?.skillData, this.themeData);
    let homeIconContent = "";
    let size = generateClampCSS("1.5rem", "1.5rem");
    // Handle different icon types for home icon
    if (typeof homeTocData.icon === "string") {
      // Check if it's SVG URL
      if (this.isSvgUrl(homeTocData.icon)) {
        const cleanUrl = this.cleanUrl(homeTocData.icon);
        homeIconContent = `<img src="${cleanUrl}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none; display: block; vertical-align: middle; margin: 0 auto;">`;
      } 
      else {
        // Simple HTML element - use as is
        homeIconContent = homeTocData.icon;
      }
    } 
    else if (
      typeof homeTocData.icon === "object" &&
      homeTocData.icon !== null
    ) {
      // Object with states - use default for home button
      if (this.isSvgUrl(homeTocData.icon.default)) {
        const cleanUrl = this.cleanUrl(homeTocData.icon.default);
        homeIconContent = `<img src="${cleanUrl}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none; display: block; vertical-align: middle; margin: 0 auto;">`;
      } 
      else {
        homeIconContent = homeTocData.icon.default;
      }
    } 
    else {
      // Fallback - use text
      homeIconContent = "Home";
    }

    homeButtonElement.innerHTML = `<button tabindex="-1" class="h5p-interactive-book-navigation-chapter-tocbutton toc-button-home" aria-expanded="false" aria-controls="h5p-interactive-book-sectionlist-0"><div class="h5p-interactive-book-navigation-chapter-toc-index">${homeIconContent}</div></button>`;
    this.content.prepend(homeButtonElement);
    homeButtonElement.addEventListener('click', () => {
      const homeUrl = window.location.href.split('#')[0];
      history.pushState({}, document.title, homeUrl);

      // Send postMessage when redirecting to cover page
      sendPostMessage('landing-page', 'lesson-package');

      this.parent.displayCover(document.querySelector('.h5p-interactive-book'));
      this.content.classList.remove('navigation-list-animation');
    });

    // Add theme data to home button
    const homeButton = homeButtonElement.querySelector('.h5p-interactive-book-navigation-chapter-tocbutton');
    homeButton.style.height = generateClampCSS('2.5rem', '2.5rem');
    homeButton.style.width = generateClampCSS("3rem", "3rem");
    homeButton.style.fontSize = generateClampCSS('1rem', '1rem');
    homeButton.style.paddingTop = generateClampCSS('0.5rem', '0.5rem');
    homeButton.style.paddingBottom = generateClampCSS('0.5rem', '0.5rem');
    homeButton.style.paddingLeft = generateClampCSS('0.75rem', '0.75rem');
    homeButton.style.paddingRight = generateClampCSS('0.75rem', '0.75rem');

    if (this.themeData?.simpleView?.toc) {
      const { fontFamily, fontSize, backgroundColor, fontColor, hoverState, selectedState } = this.themeData.simpleView.toc;
      homeButton.style.backgroundColor = backgroundColor;
      homeButton.style.color = fontColor;
    }

    this.container.appendChild(this.content);

    this.addTransformListener();
    this.initializeNavigationControls();
  }

  hasAnyCustomIndex() {
    const toc = this.chapters || [];
    const customIndex = this.customTocIndex || {};
    return toc.some(item => customIndex[item.activityId] !== undefined && customIndex[item.activityId] !== null) || customIndex['home'] !== undefined && customIndex['home'] !== null;
  }

  initializeNavigationControls() {
    const keyCodes = Object.freeze({
      'UP': 38,
      'DOWN': 40,
    });

    this.chapterNodes.forEach((chapter, i) => {
      const chapterButton = chapter.querySelector('.h5p-interactive-book-navigation-chapter-tocbutton');
      chapterButton.addEventListener('keydown', (e) => {
        switch (e.keyCode) {
          case keyCodes.UP:
            this.setFocusToChapterItem(i, -1);
            e.preventDefault();
            break;

          case keyCodes.DOWN:
            this.setFocusToChapterItem(i, 1);
            e.preventDefault();
            break;
        }
      });

    });
  }

  /**
   * Check if content is SVG URL
   * @param {string} content - Content to check
   * @returns {boolean} True if content is SVG URL
   */
  isSvgUrl(content) {
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
  cleanUrl(url) {
    if (url.startsWith("url(") && url.endsWith(")")) {
      return url.slice(4, -1).replace(/['"]/g, "");
    }
    return url;
  }

  resetAllIconStates() {
    this.chapterNodes.forEach((node, idx) => {
      const chapterIndex = node.querySelector(
        ".h5p-interactive-book-navigation-chapter-toc-index"
      );
      if (chapterIndex) {
        const defaultIcon = chapterIndex.getAttribute("data-icon-default");
        if (defaultIcon) {
          chapterIndex.innerHTML = defaultIcon;
        }
      }
    });
  }

  /**
   * Set focus on the first meny entry
   */
  focus() {
    this.content.querySelector('button').focus();
  }

  setFocusToChapterItem(index, direction = 0) {
    let nextIndex = index + direction;
    if (nextIndex < 0) {
      nextIndex = this.chapterNodes.length - 1;
    }
    else if (nextIndex > this.chapterNodes.length - 1) {
      nextIndex = 0;
    }


    const nextChapter = this.chapterNodes[nextIndex];
    const chapterButton = nextChapter.querySelector('.h5p-interactive-book-navigation-chapter-tocbutton');
    this.setFocusToItem(chapterButton, nextIndex);
  }

  setFocusToItem(element, chapterIndex, skipFocusing = false) {
    // Remove focus from all other elements
    this.chapterNodes.forEach((chapter, index) => {
      const chapterButton = chapter.querySelector('.h5p-interactive-book-navigation-chapter-tocbutton');
      if (index === chapterIndex) {
        chapterButton.classList.add('h5p-interactive-book-navigation-current');
        if (this.themeData?.simpleView?.toc) {
          const { backgroundColor, fontColor, hoverState, selectedState } = this.themeData.simpleView.toc;
          chapterButton.style.backgroundColor = selectedState.backgroundColor;
          chapterButton.style.color = selectedState.fontColor;
        }

        // Set selected icon state for current chapter
        const currentChapterIndex = chapter.querySelector(
          ".h5p-interactive-book-navigation-chapter-toc-index"
        );
        if (currentChapterIndex) {
          const selectedIcon =
            currentChapterIndex.getAttribute("data-icon-selected");
          if (selectedIcon) {
            currentChapterIndex.innerHTML = selectedIcon;
          }
        }
      }
      else {
        chapterButton.classList.remove('h5p-interactive-book-navigation-current');
        if (this.themeData?.simpleView?.toc) {
          const { backgroundColor, fontColor, hoverState, selectedState } = this.themeData.simpleView.toc;
          chapterButton.style.backgroundColor = backgroundColor;
          chapterButton.style.color = fontColor;
        }

        // Reset icon state for other chapters
        const otherChapterIndex = chapter.querySelector(
          ".h5p-interactive-book-navigation-chapter-toc-index"
        );
        if (otherChapterIndex) {
          const defaultIcon =
            otherChapterIndex.getAttribute("data-icon-default");
          if (defaultIcon) {
            otherChapterIndex.innerHTML = defaultIcon;
          }
        }
      }


      chapterButton.setAttribute('tabindex', '-1');
    });

    element.setAttribute('tabindex', '0');
    this.focusedChapter = chapterIndex;
    if (!skipFocusing) {
      element.focus();
    }
  }

  /**
   * Get sidebar DOM.
   *
   * @return {HTMLElement} DOM for sidebar.
   */
  addSideBar() {
    const container = document.createElement('div');
    container.id = 'h5p-interactive-book-navigation-menu';
    container.classList.add('h5p-interactive-book-navigation-tocsimpleview');
    container.style.position = 'relative';

    return container;
  }

  /**
   * Find sections in chapter.
   *
   * @param {object} columnData Column data.
   * @return {object[]} Sections data.
   */
  findSectionsInChapter(columnData) {
    const sectionsData = [];
    const sections = columnData.params.content;
    for (let j = 0; j < sections.length; j++) {
      const content = sections[j].content;

      let title, skill, description = '';
      switch (content.library.split(' ')[0]) {
        case 'H5P.Link':
          if (content.params.title) {
            title = content.params.title;
          }
          else {
            title = 'New link';
          }
          break;
        default:
          title = content.metadata.title;
          skill = content.params.skill || '--';
          description = content.params.description || '--';
      }

      sectionsData.push({
        title: title,
        id: content.subContentId ? `h5p-interactive-book-section-${content.subContentId}` : undefined,
        skill: skill,
        description: description
      });
    }

    return sectionsData;
  }

  /**
   * Find all chapters.
   *
   * @param {object[]} columnsData Columns data.
   * @return {object[]} Chapters data.
   */
  findAllChapters(columnsData) {
    const chapters = [];
    for (let i = 0; i < columnsData.length; i++) {
      const sections = this.findSectionsInChapter(columnsData[i]);
      const chapterTitle = columnsData[i].metadata.title;
      const activitieID = columnsData[i]?.params?.content[0]?.content?.params?.activityMetadata?.activityId;
      const id = `h5p-interactive-book-chapter-${columnsData[i].subContentId}`;
      chapters.push({
        sections: sections,
        title: chapterTitle,
        id: id,
        isSummary: false,
        skill: sections[0]?.skill,
        description: sections[0]?.description,
        packageId: sections[0]?.packageId || false,
        activityId : activitieID
      });
    }

    if ( this.parent.hasSummary()) {
      chapters.push({
        sections: [],
        title: this.l10n.summaryHeader,
        id: `h5p-interactive-book-chapter-summary`,
        isSummary: true,
      });
    }
    return chapters;
  }

  /**
   * Fires whenever a redirect is happening in parent
   * All chapters will be collapsed except for the active
   *
   * @param {number} chapterId The chapter that should stay open in the menu.
   */
  redirectHandler(chapterId) {

    // Focus new chapter button if active chapter was closed
    if (chapterId !== this.focusedChapter) {
      const chapterButton = this.chapterNodes[chapterId].querySelector('.h5p-interactive-book-navigation-chapter-tocbutton');
      this.setFocusToItem(chapterButton, chapterId, true);
    }
  }
  /**
   * Create chapter.
   *
   * @param {object} chapter Chapter data.
   * @param {number} chapterId Chapter Id.
   * @return {HTMLElement} Chapter node.
   */
  getNodesFromChapter(chapter, chapterId) {
    const chapterNode = document.createElement('li');
    chapterNode.classList.add('h5p-interactive-book-navigation-chapter-toc');


    // TODO: Clean this up. Will require to receive chapter info from parent instead of building itself
    const chapterNodeTitle = document.createElement('button');
    chapterNodeTitle.setAttribute('tabindex', chapterId === 0 ? '0' : '-1');
    chapterNodeTitle.classList.add('h5p-interactive-book-navigation-chapter-tocbutton', 'can_pause');

    chapterNodeTitle.style.height = generateClampCSS('2.5rem', '2.5rem');
    chapterNodeTitle.style.fontSize = generateClampCSS('1rem', '1rem');
    chapterNodeTitle.style.paddingTop = generateClampCSS('0.5rem', '0.5rem');
    chapterNodeTitle.style.paddingBottom = generateClampCSS('0.5rem', '0.5rem');
    chapterNodeTitle.style.paddingLeft = generateClampCSS('0.75rem', '0.75rem');
    chapterNodeTitle.style.paddingRight = generateClampCSS('0.75rem', '0.75rem');

    chapterNodeTitle.onclick = (event) => {
      // Prevent event bubbling and multiple selection
      event.preventDefault();
      event.stopPropagation();

      const newChapter = {
        h5pbookid: this.parent.contentId,
        chapter: this.chapters[chapterId].id,
        section: 0,
      };

      this.parent.trigger('newChapter', newChapter);

      // Reset all icon states when changing chapters
      this.resetAllIconStates();

      // Set selected icon for current chapter
      const currentChapterIndex = event.currentTarget.querySelector(".h5p-interactive-book-navigation-chapter-toc-index");
      if (currentChapterIndex) {
        const selectedIcon = currentChapterIndex.getAttribute("data-icon-selected");
        if (selectedIcon) {
          currentChapterIndex.innerHTML = selectedIcon;
        }
      }
    };

    // Update the chapter click event listener in getNodesFromChapter method
    chapterNodeTitle.addEventListener("click", () => {
      // Remove previous selected chapter's background color
      const previousSelectedChapter = document.querySelector(
        ".h5p-interactive-book-navigation-current"
      );
      if (previousSelectedChapter) {
        previousSelectedChapter.classList.remove(
          "h5p-interactive-book-navigation-current"
        );
        // previousSelectedChapter.style.backgroundColor = backgroundColor;
        // previousSelectedChapter.style.color = fontColor;
      }

      // Reset all icon states first
      this.resetAllIconStates();

      // Set the background color of the clicked chapter
      chapterNodeTitle.classList.add("h5p-interactive-book-navigation-current");
      // chapterNodeTitle.style.backgroundColor = selectedState.backgroundColor;
      // chapterNodeTitle.style.color = selectedState.fontColor;

      // Set selected icon state for current chapter
      const selectedIcon = chapterIndex.getAttribute("data-icon-selected");
      if (selectedIcon) {
        chapterIndex.innerHTML = selectedIcon;
      }
    });

    if (this.themeData?.simpleView?.toc) {
      const { fontFamily, fontSize, backgroundColor, fontColor, hoverState, selectedState, mobile, fontWeight } = this.themeData.simpleView.toc;
      
      const chapterNodeTitleStyle = chapterNodeTitle.style;
      chapterNodeTitleStyle.fontFamily = fontFamily;
      chapterNodeTitleStyle.fontWeight = fontWeight;
      chapterNodeTitleStyle.fontSize = mobile?.fontSize ? generateClampCSS(mobile?.fontSize, mobile?.fontSize) : 'inherit';
      chapterNodeTitleStyle.backgroundColor = backgroundColor;
      chapterNodeTitleStyle.color = fontColor;

      chapterNodeTitle.addEventListener('mouseover', () => {
        if (!chapterNodeTitle.classList.contains('h5p-interactive-book-navigation-current')) {
          chapterNodeTitle.style.backgroundColor = hoverState.backgroundColor;
          chapterNodeTitle.style.color = hoverState.fontColor;
        }
      });

      chapterNodeTitle.addEventListener('mouseout', () => {
        if (!chapterNodeTitle.classList.contains('h5p-interactive-book-navigation-current')) {
          chapterNodeTitle.style.backgroundColor = backgroundColor;
          chapterNodeTitle.style.color = fontColor;
        }
      });

      chapterNodeTitle.addEventListener('click', () => {
        // Remove previous selected chapter's background color
        const previousSelectedChapter = document.querySelector('.h5p-interactive-book-navigation-current');
        if (previousSelectedChapter) {
          previousSelectedChapter.classList.remove('h5p-interactive-book-navigation-current');
          previousSelectedChapter.style.backgroundColor = backgroundColor;
          previousSelectedChapter.style.color = fontColor;
        }

        // Set the background color of the clicked chapter
        chapterNodeTitle.classList.add('h5p-interactive-book-navigation-current');
        chapterNodeTitle.style.backgroundColor = selectedState.backgroundColor;
        chapterNodeTitle.style.color = selectedState.fontColor;
      });
    }


    // Add chapter index
    const chapterIndex = document.createElement('div');
    chapterIndex.classList.add('h5p-interactive-book-navigation-chapter-toc-index');

    // 🔥 Ensure skillData exists
    if (!this.parent.params.skillData) {
      this.parent.params.skillData = {};
    }

    // Check is TOC is branching pathway or not
    const originalTocItem = this.config?.tableOfContents?.find(
      tocItem => tocItem.activityId === chapter.activityId
    );
    const isBranching = originalTocItem?.h5pTemplate?.mainLibraryName?.includes("branching");

    if (!this.hasCustomIndex) {
      chapterIndex.style.fontSize = generateClampCSS("1rem", "1rem");
    }

    if (this.themeData?.simpleView?.toc) {
      chapterIndex.style.fontWeight = this?.themeData?.simpleView?.toc?.fontWeight;
    }

    const isCustomNumberingMode = this.customTocIndex && Object.keys(this.customTocIndex)?.length > 0;

    // Rule 2: If not branching, are we in Custom Numbering mode?
    if (isCustomNumberingMode) {
      const customNumber = this.customTocIndex?.[chapter?.activityId];
      // Rule 2.1: Does this specific chapter have a custom number?
      if (customNumber) {
        chapterNodeTitle.classList.add('toc-button-custom-number');
        chapterNodeTitle.style.minWidth = generateClampCSS("2.5rem", "2.5rem");
        chapterIndex.textContent = customNumber;
      }
      // Rule 2.2: No custom number for this item, so show its skill icon.
      else {
        let branchingIconName = "";
        // Rule 1: Highest priority - Is it a Branching Pathway?
        if (isBranching) {
          // chapterNodeTitle.classList.add('toc-button-branching');
          const segment = this.parent.params?.lessonMetadata?.segment;
          branchingIconName = (this.themeData && Object.keys(this.themeData)?.length > 0) ? "branchingIcon" : (["primary", "pre-primary", "prePrimary", "preprimary"].includes(segment) ? 'branchingIconPrimary' : ["secondary", "adult"].includes(segment) ? 'branchingIconSecondary' : 'branchingIcon');
        }

        // chapterNodeTitle.classList.add('toc-button-skill-icon');
        chapterNodeTitle.style.width = generateClampCSS("3rem", "3rem");
        const tocData = getSimpleViewTOCMobileTOCData(chapter?.skill, this.parent?.params?.skillData, this.themeData, branchingIconName);
        this.setIcon(chapterIndex, chapterNodeTitle, tocData, chapterId);
      }
    }
    // Rule 3: If nothing else, we are in Auto Numbering mode.
    else {
      // chapterNodeTitle.classList.add('toc-button-auto-number');
      chapterNodeTitle.style.width = generateClampCSS("2.5rem", "2.5rem");
      chapterIndex.textContent = chapterId + 1;
    }

    chapterNodeTitle.appendChild(chapterIndex);
    chapterNode.appendChild(chapterNodeTitle);

    return chapterNode;
  }

  /**
   * Get chapter elements.
   *
   * @return {HTMLElement[]} Chapter elements.
   */
  getChapterNodes() {
    return this.chapters.map((chapter, index) => this.getNodesFromChapter(chapter, index));
  }

  /**
   * Add transform listener.
   */
  addTransformListener() {
    this.container.addEventListener('transitionend', (event) => {
      // propertyName is used trigger once, not for every property that has transitionend
      if (event.propertyName === 'flex-basis') {
        this.parent.trigger('resize');
      }
    });
  }

  /**
   * Helper function to set an icon and its states.
   * (This is a new helper function to avoid repeating code)
   * @param {HTMLElement} chapterIndex The element to put the icon in.
   * @param {HTMLElement} chapterNodeTitle The button element for events.
   * @param {object} tocData The icon data from getSimpleViewTOCMobileTOCData.
   * @param {number} chapterId The ID of the current chapter.
   */
  setIcon(chapterIndex, chapterNodeTitle, tocData, chapterId) {
    const size = generateClampCSS("1.5rem", "1.5rem");

    chapterIndex.style.width = size;
    chapterIndex.style.height = size;
    chapterIndex.style.display = "flex";
    chapterIndex.style.alignItems = "center";
    chapterIndex.style.justifyContent = "center";

    if (typeof tocData.icon === "string") {
      if (this.isSvgUrl(tocData.icon)) {
        const cleanUrl = this.cleanUrl(tocData.icon);
        chapterIndex.innerHTML = `<img src="${cleanUrl}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none; display: block; vertical-align: middle; margin: 0 auto;">`;
      } 
      else {
        chapterIndex.innerHTML = tocData.icon;
        chapterIndex.style.fontSize = size;
      }
    } 
    else if (typeof tocData.icon === "object" && tocData.icon !== null) {
      const processedIcon = {
        default: this.isSvgUrl(tocData.icon.default) ? `<img src="${this.cleanUrl(tocData.icon.default)}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none; display: block; vertical-align: middle; margin: 0 auto;">` : tocData.icon.default,
        hoverState: this.isSvgUrl(tocData.icon.hoverState) ? `<img src="${this.cleanUrl(tocData.icon.hoverState)}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none; display: block; vertical-align: middle; margin: 0 auto;">` : tocData.icon.hoverState,
        selectedState: this.isSvgUrl(tocData.icon.selectedState) ? `<img src="${this.cleanUrl(tocData.icon.selectedState)}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none; display: block; vertical-align: middle; margin: 0 auto;">` : tocData.icon.selectedState,
      };

      chapterIndex.innerHTML = processedIcon.default;
      chapterIndex.setAttribute("data-icon-default", processedIcon.default || "");
      chapterIndex.setAttribute("data-icon-hover", processedIcon.hoverState || "");
      chapterIndex.setAttribute("data-icon-selected", processedIcon.selectedState || "");

      chapterNodeTitle.addEventListener("mouseenter", () => {
        if (!chapterNodeTitle.classList.contains("h5p-interactive-book-navigation-current")) {
          const hoverIcon = chapterIndex.getAttribute("data-icon-hover");
          if (hoverIcon) chapterIndex.innerHTML = hoverIcon;
        }
      });
      chapterNodeTitle.addEventListener("mouseleave", () => {
        if (!chapterNodeTitle.classList.contains("h5p-interactive-book-navigation-current")) {
          const defaultIcon = chapterIndex.getAttribute("data-icon-default");
          if (defaultIcon) chapterIndex.innerHTML = defaultIcon;
        }
      });
      chapterNodeTitle.addEventListener("click", () => {
        this.chapterNodes.forEach((node, idx) => {
          if (idx !== chapterId) {
            const otherIndex = node.querySelector(".h5p-interactive-book-navigation-chapter-toc-index");
            const otherDefaultIcon = otherIndex?.getAttribute("data-icon-default");
            if (otherDefaultIcon) otherIndex.innerHTML = otherDefaultIcon;
          }
        });
        const selectedIcon = chapterIndex.getAttribute("data-icon-selected");
        if (selectedIcon) chapterIndex.innerHTML = selectedIcon;
      });
    }
  }
}
export default SimpleViewTOCMobile;
