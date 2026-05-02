/**
 * A component which helps in navigation
 * Constructor function.
 *
 */

// import { chaptersData, custom_toc_index } from "./developcontent";
import { frontOfClassIcon } from "./icons";
import { generateClampCSS, sendPostMessage, positionTooltip, createFOCButton } from "./utils";
import { getSimpleViewSidebarTOCData } from "./utils/getTOCData";
class SimpleViewSideBar extends H5P.EventDispatcher {
  constructor(config, contentId, mainTitle, parent) {
    super();
    // config.chapters = chaptersData;
    // config.custom_toc_index = custom_toc_index
    this.themeData = config.themeData;
    this.id = contentId;
    this.parent = parent;
    this.behaviour = config.behaviour;
    
    // Create wrapper div for ul
    this.ulWrapper = document.createElement("div");
    this.ulWrapper.classList.add("parent-ul");
    
    this.content = document.createElement("ul");
    this.content.classList.add("navigation-list");
    // this.content.classList.add('navigation-list-animation');
    this.content.classList.add("simple-view-navigation-list");
    this.container = this.addSideBar();
    this.l10n = config.l10n;
    this.config = config;

    this.customTocIndex = config?.custom_toc_index || {};
    this.chapters = this.findAllChapters(config.chapters);
    this.hasCustomIndex = this.hasAnyCustomIndex();

    // Calculate dynamic width based on maximum custom numbering length (font-size independent)
    this.calculateDynamicTOCWidth = () => {
      const autoNumberingWidth = 4.6875; // default width for auto numbering

      // If no custom index mode, use auto width
      if (!this.hasCustomIndex) {
        return generateClampCSS(`${autoNumberingWidth}rem`, `${autoNumberingWidth}rem`);
      }

      // Determine max character length, excluding the 'home' key
      const maxCharLength = Math.max(
        ...Object.entries(this.customTocIndex)
          .filter(([key, value]) => key !== 'home' && value !== null && value !== undefined)
          .map(([, value]) => String(value).trim().length),
        0
      );

      // If nothing usable, fall back to auto width
      if (maxCharLength === 0) {
        return generateClampCSS(`${autoNumberingWidth}rem`, `${autoNumberingWidth}rem`);
      }

      // Per-character width approximation in rem and a padding buffer
      let perCharRem = 0.8; // rem per character (tuned empirically)
      const paddingRem = 2; // rem padding to account for icons/margins

      // If theme provides a fontSize and it's larger than 16px, scale perCharRem
      // try {
      //   // const themeFontSizeRaw = this.themeData?.simpleView?.toc?.fontSize;
      //   const themeFontSizeRaw = "1.125rem";
      //   if (themeFontSizeRaw) {
      //     // Try to extract px value from strings like '16px', '1rem', 'clamp( ... )'
      //     let pxValue = null;

      //     if (typeof themeFontSizeRaw === 'string') {
      //       // Prefer rem values (most themes provide rem)
      //       const remMatch = themeFontSizeRaw.match(/([0-9]+(?:\.[0-9]+)?)rem/);
      //       if (remMatch) {
      //         // Convert rem -> px using the document root font-size when available
      //         try {
      //           const rootFontSize = getComputedStyle(document.documentElement).fontSize;
      //           const rootPx = parseFloat(rootFontSize) || 16;
      //           pxValue = parseFloat(remMatch[1]) * rootPx;
      //         } 
      //         catch (err) {
      //           // Fallback to 16px if document or computed style isn't available
      //           pxValue = parseFloat(remMatch[1]) * 16;
      //         }
      //       }
      //     }

      //     // If parsed pxValue is greater than 16, scale perCharRem proportionally
      //     if (pxValue && pxValue > 16) {
      //       const scale = pxValue / 16; // e.g., 24px -> scale 1.5
      //       perCharRem = perCharRem * scale;
      //     }
      //   }
      // } 
      // catch (e) {
      //   // Parsing failed - keep defaults
      // }

      let calculatedWidth = (maxCharLength * perCharRem) + paddingRem;

      // Clamp to sensible bounds (min = autoNumberingWidth, max = 24rem)
      const minRem = autoNumberingWidth;
      const maxRem = 24;
      calculatedWidth = Math.max(minRem, Math.min(maxRem, calculatedWidth));

      return generateClampCSS(`${calculatedWidth}rem`, `${calculatedWidth}rem`);
    };

    this.chapterNodes = this.getChapterNodes();

    this.chapterNodes.forEach((element) => {
      this.content.appendChild(element);
    });

    // Add home button
    const homeButtonElement = document.createElement("li");
    homeButtonElement.classList.add(
      "h5p-interactive-book-navigation-chapter",
      "h5p-interactive-book-navigation-closed"
    );
    // if (this.chapterNodes.length < 6) {
    //   homeButtonElement.style.marginTop = "0.75rem";
    // }
    // Get home icon through getTOCData method
    const homeTocData = getSimpleViewSidebarTOCData("home", this.parent?.params?.skillData, this.themeData);
    let homeIconContent = "";
    let size = generateClampCSS("1.5rem", "1.5rem");
    // Handle different icon types for home icon
    if (typeof homeTocData.icon === "string") {
      // Check if it's SVG URL
      if (this.isSvgUrl(homeTocData.icon)) {
        const cleanUrl = this.cleanUrl(homeTocData.icon);
        homeIconContent = `<img src="${cleanUrl}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none;">`;
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
        homeIconContent = `<img src="${cleanUrl}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none;">`;
      } 
      else {
        homeIconContent = homeTocData.icon.default;
      }
    } 
    else {
      // Fallback - use text
      homeIconContent = "Home";
    }
    let width = generateClampCSS("4.6875rem", "4.6875rem");
    let height = generateClampCSS("3.875rem", "3.875rem");
  
    // Use calculated dynamic width for consistent sizing across all TOC buttons
    let dynamicWidth = this.calculateDynamicTOCWidth();
  
    homeButtonElement.innerHTML = `<button tabindex="-1" style="height: ${height}; width: ${dynamicWidth}; min-width: ${width};" class="h5p-interactive-book-navigation-chapter-button" aria-expanded="false" aria-controls="h5p-interactive-book-sectionlist-0"><div class="h5p-interactive-book-navigation-chapter-home-icon" style="align-items: center;justify-content: center; width: ${size}; height: ${size};">${homeIconContent}</div></button>`;
    this.content.prepend(homeButtonElement);
    homeButtonElement.addEventListener('click', () => {
      // Trigger interacted event with lesson metadata on Home TOC icon
      this.parent.buildXAPIEventTrigger();
      const homeUrl = window.location.href.split('#')[0];
      history.pushState({}, document.title, homeUrl);

      // Send postMessage when redirecting to cover page
      sendPostMessage('landing-page', 'lesson-package');

      this.parent.displayCover(document.querySelector('.h5p-interactive-book'));
      this.content.classList.remove('navigation-list-animation');
      
      // Trigger resize to ensure cover height is properly set
      setTimeout(() => {
        this.parent.trigger('resize');
      }, 10); // Small delay to allow DOM updates
    });

    if (this.chapters.length > 20) {
      this.content.classList.add("large-navigation-list");
    }

    // Add theme data to home button
    if (this.themeData?.simpleView?.toc) {
      const homeButton = homeButtonElement.querySelector(
        ".h5p-interactive-book-navigation-chapter-button"
      );
      const {
        fontFamily,
        fontSize,
        backgroundColor,
        fontColor,
        hoverState,
        selectedState,
      } = this.themeData.simpleView.toc;
      homeButton.style.backgroundColor = backgroundColor;
      homeButton.style.color = fontColor;
      /* homeButton.addEventListener('mouseover', () => {
          homeButton.style.backgroundColor = hoverState.backgroundColor;
          homeButton.style.color = hoverState.fontColor;
        });
        homeButton.addEventListener('mouseout', () => {
          homeButton.style.backgroundColor = backgroundColor;
          homeButton.style.color = fontColor;
        });  */
    }

    // Append ul to wrapper div, then wrapper to container
    this.ulWrapper.appendChild(this.content);
    this.container.appendChild(this.ulWrapper);

    // Add FOC (Front of Class) functionality for Simple View
    // this.addFOCToSimpleView();

    // Setup overflow detection when element becomes visible
    this.setupOverflowDetection();

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
      UP: 38,
      DOWN: 40,
    });

    this.chapterNodes.forEach((chapter, i) => {
      const chapterButton = chapter.querySelector(
        ".h5p-interactive-book-navigation-chapter-button"
      );
      chapterButton.addEventListener("keydown", (e) => {
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

      const sections = chapter.querySelectorAll(
        ".h5p-interactive-book-navigation-section"
      );
      for (
        let sectionIndex = 0;
        sectionIndex < sections.length;
        sectionIndex++
      ) {
        const section = sections[sectionIndex];
        const sectionButton = section.querySelector(".section-button");
        sectionButton.addEventListener("keydown", (e) => {
          switch (e.keyCode) {
            case keyCodes.UP:
              this.setFocusToSectionItem(i, sectionIndex, -1);
              e.preventDefault();
              break;

            case keyCodes.DOWN:
              this.setFocusToSectionItem(i, sectionIndex, 1);
              e.preventDefault();
              break;
          }
        });
      }
    });
  }

  /**
   * Set focus on the first meny entry
   */
  focus() {
    this.content.querySelector("button").focus();
  }

  setFocusToChapterItem(index, direction = 0) {
    let nextIndex = index + direction;
    if (nextIndex < 0) {
      nextIndex = this.chapterNodes.length - 1;
    } 
    else if (nextIndex > this.chapterNodes.length - 1) {
      nextIndex = 0;
    }

    // Check if we should navigate to a section
    if (direction) {
      const chapterIndex = direction > 0 ? index : nextIndex;
      const chapter = this.chapterNodes[chapterIndex];
      if (
        !chapter.classList.contains("h5p-interactive-book-navigation-closed")
      ) {
        const sections = chapter.querySelectorAll(
          ".h5p-interactive-book-navigation-section"
        );
        if (sections.length) {
          const sectionItemIndex = direction > 0 ? 0 : sections.length - 1;
          this.setFocusToSectionItem(chapterIndex, sectionItemIndex);
          return;
        }
      }
    }

    const nextChapter = this.chapterNodes[nextIndex];
    const chapterButton = nextChapter.querySelector(
      ".h5p-interactive-book-navigation-chapter-button"
    );
    this.setFocusToItem(chapterButton, nextIndex);
  }

  setFocusToSectionItem(chapterIndex, index, direction = 0) {
    const chapter = this.chapterNodes[chapterIndex];
    const sections = chapter.querySelectorAll(
      ".h5p-interactive-book-navigation-section"
    );

    // Navigate chapter if outside of section bounds
    const nextIndex = index + direction;
    if (nextIndex > sections.length - 1) {
      this.setFocusToChapterItem(chapterIndex + 1);
      return;
    } 
    else if (nextIndex < 0) {
      this.setFocusToChapterItem(chapterIndex);
      return;
    }

    const section = sections[nextIndex];
    const sectionButton = section.querySelector(".section-button");
    this.setFocusToItem(sectionButton, chapterIndex);
  }

  // setFocusToItem(element, chapterIndex, skipFocusing = false) {
  //   // Remove focus from all other elements
  //   this.chapterNodes.forEach((chapter, index) => {
  //     const chapterButton = chapter.querySelector(
  //       ".h5p-interactive-book-navigation-chapter-button"
  //     );
  //     if (index === chapterIndex) {
  //       chapterButton.classList.add("h5p-interactive-book-navigation-current");
  //       if (this.themeData?.simpleView?.toc) {
  //         const { backgroundColor, fontColor, hoverState, selectedState } =
  //           this.themeData.simpleView.toc;
  //         chapterButton.style.backgroundColor = selectedState.backgroundColor;
  //         chapterButton.style.color = selectedState.fontColor;
  //       }
  //     } 
  //     else {
  //       chapterButton.classList.remove(
  //         "h5p-interactive-book-navigation-current"
  //       );
  //       if (this.themeData?.simpleView?.toc) {
  //         const { backgroundColor, fontColor, hoverState, selectedState } =
  //           this.themeData.simpleView.toc;
  //         chapterButton.style.backgroundColor = backgroundColor;
  //         chapterButton.style.color = fontColor;
  //       }
  //     }

  //     chapterButton.setAttribute("tabindex", "-1");

  //     const sections = chapter.querySelectorAll(
  //       ".h5p-interactive-book-navigation-section"
  //     );
  //     for (let i = 0; i < sections.length; i++) {
  //       const section = sections[i];
  //       const sectionButton = section.querySelector(".section-button");
  //       sectionButton.setAttribute("tabindex", "-1");
  //     }
  //   });

  //   element.setAttribute("tabindex", "0");
  //   this.focusedChapter = chapterIndex;
  //   if (!skipFocusing) {
  //     element.focus();
  //   }
  // }


  /**
   * Get sidebar DOM.
   *
   * @return {HTMLElement} DOM for sidebar.
   */
  addSideBar() {
    const container = document.createElement("div");
    container.id = "h5p-interactive-book-navigation-menu";
    container.classList.add("h5p-interactive-book-navigation");
    container.style.position = "relative";

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
    const sections = columnData?.params?.content;
    for (let j = 0; j < sections.length; j++) {
      const content = sections[j]?.content;

      let title,
        skill,
        description = "";
      switch (content.library.split(" ")[0]) {
        case "H5P.Link":
          if (content.params.title) {
            title = content.params.title;
          } 
          else {
            title = "New link";
          }
          break;
        default:
          title = content.metadata.title;
          skill = content.params.skill || "--";
          description = content.params.description || "--";
      }

      sectionsData.push({
        title: title,
        id: content.subContentId
          ? `h5p-interactive-book-section-${content.subContentId}`
          : undefined,
        skill: skill,
        description: description,
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
      const chapterTitle = columnsData[i]?.metadata?.title;
      const activitieID =
        columnsData[i]?.params?.content[0]?.content?.params?.activityMetadata
          ?.activityId;
      // columnsData[i].params.skill = columnsData[i]?.params?.skill || 'Add Skill';
      // const skill = columnsData[i].params.skill;
      // // columnsData[i].params.description = columnsData[i]?.params?.description || "Add Description";
      // const description = columnsData[i].params.description;
      const id = `h5p-interactive-book-chapter-${columnsData[i]?.subContentId}`;
      chapters.push({
        sections: sections,
        title: chapterTitle,
        id: id,
        isSummary: false,
        skill: sections[0]?.skill,
        description: sections[0]?.description,
        packageId: sections[0]?.packageId || false,
        activityId: activitieID,
      });
    }

    if (this.parent?.hasSummary()) {
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
   * Toggle chapter menu.
   *
   * @param {HTMLElement} chapterNode Chapter.
   * @param {boolean} collapse If true, will collapse chapter.
   */
  toggleChapter(chapterNode, collapse) {
    collapse =
      collapse !== undefined
        ? collapse
        : !chapterNode.classList.contains(
          "h5p-interactive-book-navigation-closed"
        );

    const childNav = chapterNode.querySelector(
      ".h5p-interactive-book-navigation-sectionlist"
    );
    const arrow = chapterNode.getElementsByClassName(
      "h5p-interactive-book-navigation-chapter-accordion"
    )[0];
    const chapterButton = chapterNode.querySelector(
      ".h5p-interactive-book-navigation-chapter-button"
    );
    chapterButton.setAttribute("aria-expanded", (!collapse).toString());

    if (collapse === true) {
      chapterNode.classList.add("h5p-interactive-book-navigation-closed");
      if (arrow) {
        arrow.classList.remove("icon-expanded");
        arrow.classList.add("icon-collapsed");
        if (childNav) {
          childNav.setAttribute("aria-hidden", true);
          childNav.setAttribute("tabindex", "-1");
        }
      }
    } 
    else {
      chapterNode.classList.remove("h5p-interactive-book-navigation-closed");
      if (arrow) {
        arrow.classList.remove("icon-collapsed");
        arrow.classList.add("icon-expanded");
        if (childNav) {
          childNav.removeAttribute("aria-hidden");
          childNav.removeAttribute("tabindex");
        }
      }
    }
  }

  /**
   * Fires whenever a redirect is happening in parent
   * All chapters will be collapsed except for the active
   *
   * @param {number} chapterId The chapter that should stay open in the menu.
   */
  redirectHandler(chapterId) {
    this.chapterNodes.forEach((node, index) => {
      this.toggleChapter(node, index !== chapterId);
    });
    // Trigger resize after toggling all chapters
    this.parent.trigger("resize");

    // Focus new chapter button if active chapter was closed
    if (chapterId !== this.focusedChapter) {
      const chapterButton = this.chapterNodes[chapterId].querySelector(
        ".h5p-interactive-book-navigation-chapter-button"
      );
      this.setFocusToItem(chapterButton, chapterId, true);
    }
  }

  /**
   * Reset indicators.
   */
  resetIndicators() {
    this.chapterNodes.forEach((node, index) => {
      // Reset chapter
      // this.updateChapterProgressIndicator(index, 'BLANK');

      // Reset sections
      const sections = node.getElementsByClassName(
        "h5p-interactive-book-navigation-section"
      );
      for (let section of sections) {
        const icon = section.querySelector(
          ".h5p-interactive-book-navigation-section-icon"
        );
        if (icon) {
          icon.classList.remove("icon-question-answered");
          icon.classList.add("icon-chapter-blank");
        }
      }
    });
  }

  /**
   * Update the indicator on a specific chapter.
   *
   * @param {number} chapterId The chapter that should be updated.
   * @param {string} status Status.
   */
  updateChapterProgressIndicator(chapterId, status) {
    if (!this.behaviour.progressIndicators) {
      return;
    }

    const chapter = this.chapters[chapterId];
    if (chapter.isSummary) {
      return;
    }

    const progressIndicator = this.chapterNodes[
      chapterId
    ].getElementsByClassName(
      "h5p-interactive-book-navigation-chapter-progress"
    )[0];

    if (status === "BLANK") {
      progressIndicator.classList.remove("icon-chapter-started");
      progressIndicator.classList.remove("icon-chapter-done");
      progressIndicator.classList.add("icon-chapter-blank");
    } 
    else if (status === "DONE") {
      progressIndicator.classList.remove("icon-chapter-blank");
      progressIndicator.classList.remove("icon-chapter-started");
      progressIndicator.classList.add("icon-chapter-done");
    } 
    else if (status === "STARTED") {
      progressIndicator.classList.remove("icon-chapter-blank");
      progressIndicator.classList.remove("icon-chapter-done");
      progressIndicator.classList.add("icon-chapter-started");
    }
  }

  /**
   * Set section marker.
   *
   * @param {number} chapterId Chapter Id.
   * @param {number} sectionId Section Id.
   */
  setSectionMarker(chapterId, sectionId) {
    const icon = this.chapterNodes[chapterId].querySelector(
      ".h5p-interactive-book-navigation-section-" +
        sectionId +
        " .h5p-interactive-book-navigation-section-icon"
    );

    if (icon) {
      icon.classList.remove("icon-chapter-blank");
      icon.classList.add("icon-question-answered");
    }
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

  // Add helper method to reset all icon states
  resetAllIconStates() {
    this.chapterNodes.forEach((node, idx) => {
      const chapterIndex = node.querySelector(
        ".h5p-interactive-book-navigation-chapter-index"
      );
      if (chapterIndex) {
        const defaultIcon = chapterIndex.getAttribute("data-icon-default");
        if (defaultIcon) {
          chapterIndex.innerHTML = defaultIcon;
        }
      }
    });
  }

  // Update the setFocusToItem method to handle icon state reset
  setFocusToItem(element, chapterIndex, skipFocusing = false) {
    // Remove focus from all other elements
    this.chapterNodes.forEach((chapter, index) => {
      const chapterButton = chapter.querySelector(
        ".h5p-interactive-book-navigation-chapter-button"
      );
      if (index === chapterIndex) {
        chapterButton.classList.add("h5p-interactive-book-navigation-current");
        if (this.themeData?.simpleView?.toc) {
          const { backgroundColor, fontColor, hoverState, selectedState } =
            this.themeData.simpleView.toc;
          chapterButton.style.backgroundColor = selectedState.backgroundColor;
          chapterButton.style.color = selectedState.fontColor;
        }

        // Set selected icon state for current chapter
        const currentChapterIndex = chapter.querySelector(
          ".h5p-interactive-book-navigation-chapter-index"
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
        chapterButton.classList.remove(
          "h5p-interactive-book-navigation-current"
        );
        if (this.themeData?.simpleView?.toc) {
          const { backgroundColor, fontColor, hoverState, selectedState } =
            this.themeData.simpleView.toc;
          chapterButton.style.backgroundColor = backgroundColor;
          chapterButton.style.color = fontColor;
        }

        // Reset icon state for other chapters
        const otherChapterIndex = chapter.querySelector(
          ".h5p-interactive-book-navigation-chapter-index"
        );
        if (otherChapterIndex) {
          const defaultIcon =
            otherChapterIndex.getAttribute("data-icon-default");
          if (defaultIcon) {
            otherChapterIndex.innerHTML = defaultIcon;
          }
        }
      }

      chapterButton.setAttribute("tabindex", "-1");

      const sections = chapter.querySelectorAll(
        ".h5p-interactive-book-navigation-section"
      );
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionButton = section.querySelector(".section-button");
        sectionButton.setAttribute("tabindex", "-1");
      }
    });

    element.setAttribute("tabindex", "0");
    this.focusedChapter = chapterIndex;
    if (!skipFocusing) {
      element.focus();
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
    const chapterNode = document.createElement("li");
    const sectionsDivId = "h5p-interactive-book-sectionlist-" + chapterId;
    chapterNode.classList.add("h5p-interactive-book-navigation-chapter");
    if (chapter.isSummary) {
      chapterNode.classList.add(
        "h5p-interactive-book-navigation-summary-button"
      );
      const summaryChapterObject = this.parent.chapters[chapterId];
      // Check if the button exists before trying to clone it
      if (
        summaryChapterObject &&
        summaryChapterObject.instance &&
        summaryChapterObject.instance.summaryMenuButton
      ) {
        const originalButton = summaryChapterObject.instance.summaryMenuButton;
        // FIX: Clone the button instead of moving it.
        // The 'true' argument ensures a deep clone (copies all children).
        const summaryButtonClone = originalButton.cloneNode(true);
        // The cloned button needs its own event listener to trigger the original.
        summaryButtonClone.onclick = () => {
          originalButton.click();
        };
        summaryButtonClone.classList.add(
          "h5p-interactive-book-navigation-chapter-button"
        );
        chapterNode.appendChild(summaryButtonClone);
      } 
      else {
        // This is a fallback in case the summary button wasn't created correctly
        console.error(
          "Summary button could not be found. The sidebar entry will be empty."
        );
        chapterNode.innerHTML = `<button class="h5p-interactive-book-navigation-chapter-button">Summary (Error)</button>`;
      }
      return chapterNode;
    }

    // TODO: Clean this up. Will require to receive chapter info from parent instead of building itself
    const chapterCollapseIcon = document.createElement("div");
    chapterCollapseIcon.classList.add(
      "h5p-interactive-book-navigation-chapter-accordion"
    );

    const chapterCompletionIcon = document.createElement("div");
    if (this.behaviour.progressIndicators) {
      chapterCompletionIcon.classList.add("icon-chapter-blank");
      chapterCompletionIcon.classList.add(
        "h5p-interactive-book-navigation-chapter-progress"
      );
    }

    const chapterNodeTitle = document.createElement("button");
    chapterNodeTitle.setAttribute("tabindex", chapterId === 0 ? "0" : "-1");
    chapterNodeTitle.classList.add(
      "h5p-interactive-book-navigation-chapter-button",
      "can_pause"
    );

    // Determine font size based on numbering mode to calculate width accordingly
    let dynamicWidth = this.calculateDynamicTOCWidth();
    let width = generateClampCSS("4.6875rem", "4.6875rem");
    let height = generateClampCSS("3.875rem", "3.875rem");
    chapterNodeTitle.style.width = dynamicWidth;
    chapterNodeTitle.style.minWidth = width;
    chapterNodeTitle.style.height = height;
    chapterNodeTitle.style.padding = "1.25rem";
    if (this.parent.activeChapter !== chapterId) {
      chapterCollapseIcon.classList.add("icon-collapsed");
      chapterNodeTitle.setAttribute("aria-expanded", "false");
    } 
    else {
      chapterCollapseIcon.classList.add("icon-expanded");
      chapterNodeTitle.setAttribute("aria-expanded", "true");
    }
    chapterNodeTitle.setAttribute("aria-controls", sectionsDivId);
    chapterNodeTitle.onclick = (event) => {
      // Prevent event bubbling and multiple selection
      event.preventDefault();
      event.stopPropagation();
      const accordion = event.currentTarget.querySelector(
        ".h5p-interactive-book-navigation-chapter-accordion"
      );

      const isExpandable = !accordion?.classList?.contains("hidden");
      const isExpanded =
        event.currentTarget.getAttribute("aria-expanded") === "true";

      if (this.isOpenOnMobile()) {
        this.parent.trigger("toggleMenu");
      }

      const newChapter = {
        h5pbookid: this.parent.contentId,
        chapter: this.chapters[chapterId].id,
        section: 0,
      };

      this.parent.trigger("newChapter", newChapter);

      // Reset all icon states when changing chapters
      this.resetAllIconStates();

      // Set selected icon for current chapter
      const currentChapterIndex = event.currentTarget.querySelector(".h5p-interactive-book-navigation-chapter-index");
      if (currentChapterIndex) {
        const selectedIcon = currentChapterIndex.getAttribute("data-icon-selected");
        if (selectedIcon) {
          currentChapterIndex.innerHTML = selectedIcon;
        }
      }

      // Expand chapter in menu
      if (isExpandable) {
        this.toggleChapter(event.currentTarget.parentElement);
        this.parent.trigger("resize");
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
      const {
        fontFamily,
        fontSize,
        backgroundColor,
        fontColor,
        hoverState,
        selectedState,
      } = this.themeData.simpleView.toc;

      const chapterNodeTitleStyle = chapterNodeTitle.style;
      chapterNodeTitleStyle.fontFamily = fontFamily;
      chapterNodeTitleStyle.fontSize = generateClampCSS(fontSize, fontSize);
      chapterNodeTitleStyle.backgroundColor = backgroundColor;
      chapterNodeTitleStyle.color = fontColor;

      chapterNodeTitle.addEventListener("mouseover", () => {
        if (
          !chapterNodeTitle.classList.contains(
            "h5p-interactive-book-navigation-current"
          )
        ) {
          chapterNodeTitle.style.backgroundColor = hoverState.backgroundColor;
          chapterNodeTitle.style.color = hoverState.fontColor;
        }
      });

      chapterNodeTitle.addEventListener("mouseout", () => {
        if (
          !chapterNodeTitle.classList.contains(
            "h5p-interactive-book-navigation-current"
          )
        ) {
          chapterNodeTitle.style.backgroundColor = backgroundColor;
          chapterNodeTitle.style.color = fontColor;
        }
      });

      chapterNodeTitle.addEventListener("click", () => {
        // Remove previous selected chapter's background color
        const previousSelectedChapter = document.querySelector(
          ".h5p-interactive-book-navigation-current"
        );
        if (previousSelectedChapter) {
          previousSelectedChapter.classList.remove(
            "h5p-interactive-book-navigation-current"
          );
          previousSelectedChapter.style.backgroundColor = backgroundColor;
          previousSelectedChapter.style.color = fontColor;
        }

        // Set the background color of the clicked chapter
        chapterNodeTitle.classList.add(
          "h5p-interactive-book-navigation-current"
        );
        chapterNodeTitle.style.backgroundColor = selectedState.backgroundColor;
        chapterNodeTitle.style.color = selectedState.fontColor;
      });
    }

    // Add chapter index
    const chapterIndex = document.createElement('div');
    chapterIndex.classList.add('h5p-interactive-book-navigation-chapter-index');

    // 🔥 Ensure skillData exists
    if (!this.parent.params.skillData) {
      this.parent.params.skillData = {};
    }

    const originalTocItem = this.config?.tableOfContents?.find(
      tocItem => tocItem.activityId === chapter.activityId
    );
    const isBranching = originalTocItem?.h5pTemplate?.mainLibraryName?.includes("branching");

    if (!this.hasCustomIndex) {
      chapterIndex.style.fontSize = generateClampCSS("1.5rem", "1.5rem");
    }
    if (this.themeData?.simpleView?.toc) {
      chapterIndex.style.fontWeight =
        this?.themeData?.simpleView?.toc?.fontWeight;
    }

    const isCustomNumberingMode = this.customTocIndex && Object.keys(this.customTocIndex)?.length > 0;

    // Rule 2: If not branching, are we in Custom Numbering mode?
    if (isCustomNumberingMode) {
      const customNumber = this.customTocIndex?.[chapter?.activityId];
      // Rule 2.1: Does this specific chapter have a custom number?
      if (customNumber) {
        chapterIndex.textContent = customNumber;
      }
      // Rule 2.2: No custom number for this item, so show its skill icon.
      else {
        let branchingIconName = "";
        // Rule 1: Highest priority - Is it a Branching Pathway?
        if (isBranching) {
          const segment = this.parent.params?.lessonMetadata?.segment;
          branchingIconName = (this.themeData && Object.keys(this.themeData)?.length > 0) ? "branchingIcon" : (["primary", "pre-primary", "prePrimary", "preprimary"].includes(segment) ? 'branchingIconPrimary' : ["secondary", "adult"].includes(segment) ? 'branchingIconSecondary' : 'branchingIcon');
        }
        // chapterIndex.style.fontSize = generateClampCSS("2.25rem", "2.25rem");
        const tocData = getSimpleViewSidebarTOCData(chapter?.skill, this.parent?.params?.skillData, this.themeData, branchingIconName);
        this.setIcon(chapterIndex, chapterNodeTitle, tocData, chapterId);
      }
    }
    // Rule 3: If nothing else, we are in Auto Numbering mode.
    else {
      chapterIndex.textContent = chapterId + 1;
    }

    chapterNodeTitle.appendChild(chapterIndex);
    chapterNode.appendChild(chapterNodeTitle);

    // Collapse all but current chapters in menu and highlight current
    if (this.parent.activeChapter === chapterId) {
      chapterNode
        .querySelector(".h5p-interactive-book-navigation-chapter-button")
        .classList.add("h5p-interactive-book-navigation-current");
    } 
    else {
      this.toggleChapter(chapterNode, true);
    }

    const sectionsWrapper = document.createElement("ul");
    sectionsWrapper.classList.add(
      "h5p-interactive-book-navigation-sectionlist"
    );
    sectionsWrapper.id = sectionsDivId;

    const sectionLinks = [];
    // Add sections to the chapter
    if (this.chapters[chapterId]?.sections?.length) {
      for (let i = 0; i < this.chapters[chapterId].sections.length; i++) {
        // Non-tasks will only get section links if they have headers
        if (!this.parent?.chapters[chapterId]?.sections[i]?.isTask) {
          // Check text content for headers
          const chapterParams = this.parent.params.chapters[chapterId];
          const sectionParams = chapterParams.params.content[i].content;
          const isText =
            sectionParams.library.split(" ")[0] === "H5P.AdvancedText";

          if (isText) {
            const text = document.createElement("div");
            text.innerHTML = sectionParams.params.text;
            const headers = text.querySelectorAll("h2, h3");
            for (let j = 0; j < headers.length; j++) {
              const header = headers[j];
              const sectionNode = this.createSectionLink(
                chapterId,
                i,
                header.textContent,
                j
              );
              sectionLinks.push(sectionNode);
              // sectionsWrapper.appendChild(sectionNode);
            }
          }
        } 
        else {
          const sectionNode = this.createSectionLink(chapterId, i);
          sectionLinks.push(sectionNode);
          // sectionsWrapper.appendChild(sectionNode);
        }
      }
    }

    if (chapter.tasksLeft) {
      chapter.maxTasks = chapter.tasksLeft;
    }

    // Don't show collapse arrow if there are no sections or on mobile
    if (sectionLinks.length === 0) {
      const arrowIconElement = chapterNode.querySelector(
        ".h5p-interactive-book-navigation-chapter-accordion"
      );
      if (arrowIconElement) {
        arrowIconElement.classList.add("hidden");
      }
    }

    chapterNode.appendChild(sectionsWrapper);

    chapterNodeTitle.addEventListener('click', () => {
      // Trigger interacted event with lesson metadata on normal TOC click
      this.parent.buildXAPIEventTrigger();
    });

    return chapterNode;
  }

  /**
   * Create a section link
   * @param chapterId
   * @param i Index of section
   * @param [title] Force title
   * @param [headerNumber] Set header index within section to link to.
   * @returns {Element} Section node containing the link
   */
  createSectionLink(chapterId, i, title = null, headerNumber = null) {
    const section = this.chapters[chapterId].sections[i];

    const sectionTitleText = document.createElement("div");
    sectionTitleText.innerHTML = title || section.title;
    sectionTitleText.setAttribute("title", title || section.title);
    sectionTitleText.classList.add(
      "h5p-interactive-book-navigation-section-title"
    );

    const sectionCompletionIcon = document.createElement("div");
    sectionCompletionIcon.classList.add(
      "h5p-interactive-book-navigation-section-icon"
    );
    sectionCompletionIcon.classList.add("icon-chapter-blank");
    if (this.parent?.chapters[chapterId]?.sections[i]?.isTask) {
      sectionCompletionIcon.classList.add(
        "h5p-interactive-book-navigation-section-task"
      );
    }
    const sectionLink = document.createElement("button");
    sectionLink.classList.add("section-button");
    sectionLink.setAttribute("tabindex", "-1");
    sectionLink.onclick = (event) => {
      const newChapter = {
        h5pbookid: this.parent.contentId,
        chapter: this.chapters[chapterId].id,
        section: section.id,
      };
      if (headerNumber !== null) {
        newChapter.headerNumber = headerNumber;
      }

      this.parent.trigger("newChapter", newChapter);

      if (this.isOpenOnMobile()) {
        this.parent.trigger("toggleMenu");
      }

      event.preventDefault();
    };
    sectionLink.appendChild(sectionCompletionIcon);
    sectionLink.appendChild(sectionTitleText);

    const sectionNode = document.createElement("li");
    // sectionNode.classList.add('h5p-interactive-book-navigation-section');
    // sectionNode.classList.add('h5p-interactive-book-navigation-section-' + i);
    // sectionNode.appendChild(sectionLink);

    return sectionNode;
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
   * Detect whether navigation is open on a small surface(pc or mobile).
   * @return {boolean} True, if navigation is open on mobile view.
   */
  isOpenOnMobile() {
    return this.parent.isMenuOpen() && this.parent.isSmallSurface();
  }

  /**
   * Add transform listener.
   */
  addTransformListener() {
    this.container.addEventListener("transitionend", (event) => {
      // propertyName is used trigger once, not for every property that has transitionend
      if (event.propertyName === "flex-basis") {
        this.parent.trigger("resize");
      }
    });
  }

  
  /**
   * Helper function to set an icon and its states.
   * (This is a new helper function to avoid repeating code)
   * @param {HTMLElement} chapterIndex The element to put the icon in.
   * @param {HTMLElement} chapterNodeTitle The button element for events.
   * @param {object} tocData The icon data from getSimpleViewSidebarTOCData.
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
        chapterIndex.innerHTML = `<img src="${cleanUrl}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none;">`;
      } 
      else {
        chapterIndex.innerHTML = tocData.icon;
        chapterIndex.style.fontSize = size;
      }
    } 
    else if (typeof tocData.icon === "object" && tocData.icon !== null) {
      const processedIcon = {
        default: this.isSvgUrl(tocData.icon.default) ? `<img src="${this.cleanUrl(tocData.icon.default)}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : tocData.icon.default,
        hoverState: this.isSvgUrl(tocData.icon.hoverState) ? `<img src="${this.cleanUrl(tocData.icon.hoverState)}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : tocData.icon.hoverState,
        selectedState: this.isSvgUrl(tocData.icon.selectedState) ? `<img src="${this.cleanUrl(tocData.icon.selectedState)}" alt="Chapter Icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : tocData.icon.selectedState,
      };

      chapterIndex.innerHTML = processedIcon.default;
      chapterIndex.setAttribute("data-icon-default", processedIcon.default || "");
      chapterIndex.setAttribute("data-icon-hover", processedIcon.hoverState || "");
      chapterIndex.setAttribute("data-icon-selected", processedIcon.selectedState || "");

      // ✅ ENSURE NON-IMAGE CONTENT ALSO RESPECTS SIZE
      if (!this.isSvgUrl(tocData.icon.default)) {
        chapterIndex.style.fontSize = size;
      }

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
            const otherIndex = node.querySelector(".h5p-interactive-book-navigation-chapter-index");
            const otherDefaultIcon = otherIndex?.getAttribute("data-icon-default");
            if (otherDefaultIcon) otherIndex.innerHTML = otherDefaultIcon;
          }
        });
        const selectedIcon = chapterIndex.getAttribute("data-icon-selected");
        if (selectedIcon) chapterIndex.innerHTML = selectedIcon;
      });
    }
  }

  /**
   * Check if navigation content is overflowing and apply appropriate styling
   */
  checkAndHandleOverflow(retryCount = 0, maxRetries = 15) {
    // Prevent infinite loops - max 5 seconds of retries (50 * 100ms)
    if (retryCount >= maxRetries) {
      return;
    }

    // Check if element is in DOM and has dimensions
    if (!this.content.isConnected) {
      setTimeout(() => this.checkAndHandleOverflow(retryCount + 1, maxRetries), 100);
      return;
    }

    // Force layout calculation
    this.content.offsetHeight;
    
    const isOverflowingVertically = this.content.scrollHeight > this.content.clientHeight;
    
    // If dimensions are still 0, wait a bit more and retry
    if (this.content.clientHeight === 0 && this.content.scrollHeight === 0) {
      setTimeout(() => this.checkAndHandleOverflow(retryCount + 1, maxRetries), 100);
      return;
    }

    if (isOverflowingVertically) {
      this.content.classList.add("overflowing");
      this.ulWrapper.style.borderColor = "#DFE1E1";
      this.ulWrapper.style.borderWidth = generateClampCSS("0.063rem", "0.063rem");
      this.ulWrapper.style.borderRadius = generateClampCSS("1.25rem", "1.25rem");
      this.ulWrapper.style.borderStyle = "solid";
      this.ulWrapper.style.paddingRight = generateClampCSS("0.25rem", "0.25rem"); 
      this.content.style.overflowY = "auto"; // Add scroll for overflow
      this.content.style.scrollMarginRight = "10px"; // Prevent double padding with scrollbar
      let HorizontalPadding = generateClampCSS("0.5rem", "0.5rem");
      let VerticalPadding = generateClampCSS("0.75rem", "0.75rem");
      this.content.style.padding = `${VerticalPadding} ${HorizontalPadding}`;
      this.content.style.paddingRight = generateClampCSS("0.25rem", "0.25rem"); // Reset right padding to avoid double padding
    } 
    else {
      this.content.classList.remove("overflowing");
      // Reset padding if not overflowing
      this.content.style.paddingTop = "0px";
      this.content.style.paddingBottom = "0px";
      this.content.style.overflow = "hidden";
    }
  }

  /**
   * Public method to check overflow after sidebar is fully rendered
   * Call this after the sidebar is added to DOM and visible
   */
  checkOverflowWhenReady() {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      this.checkAndHandleOverflow();
    });
  }

  /**
   * Alternative method using Intersection Observer to detect when element is visible
   */
  setupOverflowDetection() {
    if ('IntersectionObserver' in window) {
      let hasDetected = false;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0 && !hasDetected) {
            hasDetected = true;
            // Wait a bit for layout to stabilize
            setTimeout(() => {
              this.checkAndHandleOverflow();
            }, 50);
            // Disconnect observer after first detection
            observer.disconnect();
          }
        });
      }, {
        threshold: 0.1
      });

      observer.observe(this.content);

      // Fallback timeout in case Intersection Observer doesn't trigger
      setTimeout(() => {
        if (!hasDetected) {
          observer.disconnect();
          this.checkAndHandleOverflow();
        }
      }, 2000); // 2 seconds fallback
    } 
    else {
      // Fallback for browsers without Intersection Observer
      setTimeout(() => {
        this.checkAndHandleOverflow();
      }, 500);
    }
  }

  /**
   * Add FOC (Front of Class) functionality to Simple View
   * Uses the common createFOCButton function from utils.js
   */
  // addFOCToSimpleView() {
  //   // Only add FOC if classroom preview is enabled and screen is large enough (≥1024px)
  //   // Note: This is separate from isMobileView which still uses 768px for other functionality
  //   const isLargeScreen = (window?.innerWidth || window?.outerWidth || 1024) >= 1024;
  //   if (!this.parent.params?.isClassroomPreviewEnabled || !isLargeScreen) {
  //     return;
  //   }

  //   // Use the common FOC button creation function
  //   // Position to right side in Simple View since no teaching notes
  //   createFOCButton({
  //     themeData: this.themeData,
  //     onClickHandler: () => {
  //       this.parent.trigger("showFrontOfClass", { visibility: true });
  //     },
  //     parentElement: this.container,
  //     frontOfClassIcon: frontOfClassIcon,
  //     isSimpleview: this.parent.isSimpleView,
  //   });
  // }

}
export default SimpleViewSideBar;
