/**
 * A component which helps in navigation
 * Constructor function.
 * 
 */

// import { chaptersData, custom_toc_index } from "./developcontent";
import { tocIcons } from "./icons";
import { checkDevice, generateClampCSS, handleLongTocDescription, sendPostMessage } from "./utils";
import { getMaxValueCharLength } from "./utils/generalFunction";
import { getSidebarTOCData } from "./utils/getTOCData";
import { hasAnyCustomIndex, hasEmptyCustomIndex, calculateDynamicWidth, analyzeCharacterWidth, initializeCommonProps, isSvgUrl, cleanUrl } from "./utils/commonHelpers";

class SideBar extends H5P.EventDispatcher {
  constructor(config, contentId, mainTitle, parent) {
    super();
    // config.chapters = chaptersData;
    // config.custom_toc_index = custom_toc_index;
    this.id = contentId;
    this.parent = parent;
    this.behaviour = config.behaviour;
    this.content = document.createElement('ul');
    this.content.classList.add('navigation-list');
    this.content.classList.add('navigation-list-sidebar');
    this.content.classList.add('navigation-list-animation');

    this.container = this.addSideBar();
    this.l10n = config.l10n;

    this.isMobileView = checkDevice().mobile;
    this.customTocIndex = config?.custom_toc_index || {};

    this.chapters = this.findAllChapters(config.chapters);
    this.hasCustomIndex = hasAnyCustomIndex(this.chapters, this.customTocIndex, true);
    this.config = config;

    // Calculate dynamic navigation width bounds for automatic content-based sizing
    this.calculateDynamicNavWidth = () => {
      const minWidth = 5.6875; // Auto numbering width in rem
      const maxWidth = 10.5; // Maximum width constraint in rem
      
      if (!this.hasCustomIndex) {
        return { width: `${minWidth}rem`, useAutoWidth: false };
      }

      // Check if custom numbering object exists but all values are empty
      if (this.hasEmptyCustomIndex()) {
        return { width: `${minWidth}rem`, useAutoWidth: false };
      }

      // ✅ CALCULATE ACTUAL DYNAMIC WIDTH: Use DOM measurement like calculateDynamicIndexWidth
      try {
        // Create a temporary container that matches TOC styling
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.whiteSpace = 'nowrap';
        tempContainer.style.padding = '0';
        tempContainer.style.margin = '0';
        
        document.body.appendChild(tempContainer);
        
        // Calculate index width (similar to calculateDynamicIndexWidth)
        const indexWidth = parseFloat(this.calculateDynamicIndexWidth());
        
        // Add space for icon (1.5rem), gaps (0.5rem + 1.25rem), and padding (0.5rem * 2)
        // Normalize to 16px base to match auto numbering behavior
        const iconSpace = 1.5; // Icon width
        const gapSpace = 0.5 + 1.25; // numberAndIconWrapper gap + button gap
        const paddingSpace = 0.5 * 2; // Left and right padding
        
        const calculatedWidth = indexWidth + iconSpace + gapSpace + paddingSpace;
        
        // Clean up temporary container
        document.body.removeChild(tempContainer);
        
        // Clamp between reasonable bounds: min(maxWidth, max(minWidth, calculatedWidth))
        const clampedWidth = Math.min(maxWidth, Math.max(minWidth, calculatedWidth));
        
        return { 
          width: `${clampedWidth}rem`,
          useAutoWidth: true,
          calculatedWidth: clampedWidth
        };
        
      } 
      catch (error) {
        console.warn('Dynamic width calculation failed, using fallback:', error);
        
        // Fallback: use character analysis approach
        let maxEffectiveWidth = 0;
        Object.entries(this.customTocIndex)
          .filter(([key, value]) => value !== null && value !== undefined)
          .forEach(([, value]) => {
            const strValue = String(value).trim();
            if (strValue.length > 0) {
              const effectiveWidth = this.analyzeCharacterWidth(strValue);
              maxEffectiveWidth = Math.max(maxEffectiveWidth, effectiveWidth);
            }
          });
          
        if (maxEffectiveWidth === 0) {
          return { width: `${minWidth}rem`, useAutoWidth: false };
        }
        
        // Add space for icon and padding
        const calculatedWidth = Math.max(minWidth, maxEffectiveWidth * 0.65 + 4.0); // 4.0rem for icon + padding + gaps
        const clampedWidth = Math.min(maxWidth, calculatedWidth);
        
        return { 
          width: `${clampedWidth}rem`,
          useAutoWidth: true,
          calculatedWidth: clampedWidth
        };
      }
    };
    
    // Helper function to analyze character composition for better width estimation
    this.analyzeCharacterWidth = (text) => {
      let totalWidth = 0;
      const upperCaseWeight = 1.0;      // Full width for uppercase letters
      const lowerCaseWeight = 0.7;      // More reduced width for lowercase letters
      const digitWeight = 0.9;          // Slightly less than uppercase for digits
      const punctuationWeight = 0.4;    // Much less for punctuation, spaces, etc.
      const alphanumericWeight = 0.8;   // For mixed alphanumeric characters
      
      // Count character types for additional adjustments
      let lowerCaseCount = 0;
      let upperCaseCount = 0;
      let totalChars = text.length;
      
      for (let char of text) {
        if (/[A-Z]/.test(char)) {
          totalWidth += upperCaseWeight;
          upperCaseCount++;
        } 
        else if (/[a-z]/.test(char)) {
          totalWidth += lowerCaseWeight;
          lowerCaseCount++;
        } 
        else if (/[0-9]/.test(char)) {
          totalWidth += digitWeight;
        }
        else if (/[A-Za-z0-9]/.test(char)) {
          // Fallback for alphanumeric that might not match above
          totalWidth += alphanumericWeight;
        }
        else {
          totalWidth += punctuationWeight; // punctuation, spaces, special chars
        }
      }
      
      // Additional adjustment for predominantly lowercase text
      if (lowerCaseCount > upperCaseCount && lowerCaseCount > totalChars * 0.6) {
        totalWidth *= 0.95; // Slightly reduce total width for mostly lowercase
      }
      
      return totalWidth;
      // return calculateDynamicWidth(this.customTocIndex, 5.6875, 10.5);
    };

    // Calculate dynamic index width using simplified approach
    this.calculateDynamicIndexWidth = () => {
      const autoNumberingWidth = 1.5; // default width for auto numbering in rem

      // If no custom index mode, use auto width
      if (!this.hasCustomIndex) {
        return `${autoNumberingWidth}rem`;
      }

      // Check if custom numbering object exists but all values are empty
      if (hasEmptyCustomIndex(this.customTocIndex)) {
        return '0rem'; // No width for empty custom numbering
      }

      // Create temporary DOM elements to measure actual rendered width
      try {
        // Create a temporary container that matches TOC styling
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.whiteSpace = 'nowrap';
        
        // Apply same styling as actual index elements
        const existingIndex = this.content.querySelector('.h5p-interactive-book-navigation-chapter-index');
        if (existingIndex) {
          const computedStyle = window.getComputedStyle(existingIndex);
          tempContainer.style.fontFamily = computedStyle.fontFamily;
          tempContainer.style.fontSize = computedStyle.fontSize;
          tempContainer.style.fontWeight = computedStyle.fontWeight;
          tempContainer.style.letterSpacing = computedStyle.letterSpacing;
          tempContainer.style.paddingLeft = computedStyle.paddingLeft;
          tempContainer.style.paddingRight = computedStyle.paddingRight;
        }
        
        document.body.appendChild(tempContainer);
        
        let maxNaturalWidth = 0;
        
        // Measure all custom index values to find the widest
        Object.entries(this.customTocIndex)
          .filter(([key, value]) => value !== null && value !== undefined)
          .forEach(([, value]) => {
            const strValue = String(value).trim();
            if (strValue.length > 0) {
              // Create temp element with the exact content
              const tempElement = document.createElement('div');
              tempElement.textContent = strValue;
              tempElement.style.display = 'inline-block';
              
              tempContainer.appendChild(tempElement);
              
              // Measure natural width
              const naturalWidth = tempElement.getBoundingClientRect().width;
              maxNaturalWidth = Math.max(maxNaturalWidth, naturalWidth);
              
              tempContainer.removeChild(tempElement);
            }
          });
          
        // Clean up temporary container
        document.body.removeChild(tempContainer);
        
        // Convert px to rem (assuming 16px = 1rem, or use actual root font size)
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const maxWidthInRem = maxNaturalWidth / rootFontSize;
        
        // Add small buffer for safety (0.2rem)
        const finalWidthInRem = maxWidthInRem + 0.2;
        
        // Ensure reasonable bounds
        const minRem = autoNumberingWidth;
        const maxRem = 8.0; // Reasonable maximum
        const clampedWidth = Math.max(minRem, Math.min(maxRem, finalWidthInRem));
        
        return `${clampedWidth.toFixed(2)}rem`;
        
      } 
      catch (error) {
        // Fallback to simplified calculation if DOM measurement fails
        console.warn('Natural width measurement failed, using fallback:', error);
        
        let maxEffectiveWidth = 0;
        Object.entries(this.customTocIndex)
          .filter(([key, value]) => value !== null && value !== undefined)
          .forEach(([, value]) => {
            const strValue = String(value).trim();
            if (strValue.length > 0) {
              const effectiveWidth = this.analyzeCharacterWidth(strValue);
              maxEffectiveWidth = Math.max(maxEffectiveWidth, effectiveWidth);
            }
          });
          
        if (maxEffectiveWidth === 0) {
          return `${autoNumberingWidth}rem`;
        }
        
        // Simple fallback calculation
        const calculatedWidth = Math.max(autoNumberingWidth, maxEffectiveWidth * 0.65 + 0.8);
        return `${Math.min(8.0, calculatedWidth).toFixed(2)}rem`;
      }

      // Use shared calculation helper
      // const widthConfig = calculateDynamicWidth(this.customTocIndex, 1.5, 8.0);
      // return widthConfig.width;
    };

    // Apply expanded width of TOC in desktop view dynamically and send it in scss
    this.content.style.setProperty('--navigation-expanded-width', generateClampCSS("24.375rem", "24.375rem"));
    
    this.themeData = config.themeData;
    this.chapterNodes = this.getChapterNodes();

    this.chapterNodes.forEach(element => {
      this.content.appendChild(element);
    });

    if (this.isMobileView) {
      this.container.style.width = "100%";
    }
    else {
      if (this.hasCustomIndex && getMaxValueCharLength(this.customTocIndex) != 0) {
        // Apply automatic width sizing with bounds for custom numbering
        const widthConfig = this.calculateDynamicNavWidth();
        if (widthConfig.useAutoWidth) {
          // ✅ CALCULATED DYNAMIC WIDTH: Use actual measured width instead of fit-content
          this.container.style.width = generateClampCSS(widthConfig.width, widthConfig.width);
        }
      }
      else {
        this.container.style.width = generateClampCSS('5.6875rem', '5.6875rem');
      }
    }

    // ✅ IMMEDIATE HOVER HANDLING: Apply style changes on mouseenter/mouseleave for smooth sync
    // Mobile stays in default collapsed state
    if (!this.isMobileView) {
      // Only add hover functionality on desktop
      this.content.addEventListener('mouseenter', () => {
        this.applyExpandedStyles();
      });

      this.content.addEventListener('mouseleave', () => {
        this.hideAllChapterTitles();
        this.applyCollapsedStyles();
      });

      // ✅ MEASURE TRUNCATION AFTER WIDTH TRANSITION COMPLETES
      this.content.addEventListener('transitionend', (event) => {
        if (event.propertyName === 'width') {
          const currentWidth = this.content.offsetWidth;
          // Only measure when expanded (width > collapsed threshold)
          if (currentWidth > 200) {
            this.chapterNodes.forEach(chapterNode => {
              const chapterTitleText = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
              const chapterNodeTitle = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
              if (chapterTitleText && chapterTitleText.style.display !== 'none') {
                handleLongTocDescription(chapterTitleText, chapterNodeTitle);
              }
            });
          }
        }
      });
    }

    // this.content.addEventListener('transitionstart', (event) => {
    //   if (event.propertyName === 'width') {
    //     const currentWidth = this.content.offsetWidth;
    //     if (currentWidth > 200) {
    //       this.hideAllChapterTitles();
    //     }
    //   }
    // });

    // this.content.addEventListener('transitionend', (event) => {
    //   if (event.propertyName === 'width') {
    //     // ✅ SIMPLIFIED: Only handle description function after transition completes
    //     const currentWidth = this.content.offsetWidth;
    //     this.chapterNodes.forEach(chapterNode => {
    //       const numberAndIconWrapper = chapterNode.querySelector('.number-and-icon-wrapper');
    //       if (numberAndIconWrapper) {
    //         if (currentWidth > 200) {
    //           // Expanded: add padding for both mobile and desktop
    //           numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    //         } 
    //         else {
    //           // Collapsed: different logic for mobile vs desktop
    //           if (this.isMobileView) {
    //             // Mobile collapsed: keep padding
    //             numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    //           } 
    //           else {
    //             // Desktop collapsed: different padding based on custom index
    //             if (this.hasCustomIndex) {
    //               numberAndIconWrapper.style.paddingLeft = "0";
    //             } 
    //             else {
    //               numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
    //             }
    //           }
    //         }
    //       }

    //       const chapterNodeTitle = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
    //       const chapterTitleText = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-title-text');

    //       // ✅ Handle justifyContent for chapter nodes
    //       if (currentWidth > 200) {
    //         // Expanded: remove center justification
    //         if (chapterNodeTitle) {
    //           chapterNodeTitle.style.justifyContent = "";
    //         }
    //       } 
    //       else {
    //         // Collapsed: apply center justification if conditions met
    //         if (chapterNodeTitle && (getMaxValueCharLength(this.customTocIndex) == 0 || this.hasCustomIndex)) {
    //           chapterNodeTitle.style.justifyContent = "center";
    //         }
    //       }

    //       // requestAnimationFrame(() => {
    //       //   handleLongTocDescription(chapterTitleText, chapterNodeTitle);
    //       // });
    //       if (currentWidth > 200) { // Adjust threshold as per collapsed width
    //         if (chapterTitleText) {
    //           chapterTitleText.style.display = 'block';
    //           // chapterTitleText.style.maxWidth = '50%';
    //         }
    //       }
    //     });

    //     // Toggle title text for home button
    //     const homeTitleText = this.content.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
    //     if (homeTitleText) {
    //       if (currentWidth > 200) {
    //         homeTitleText.style.display = 'block';
    //         // homeTitleText.style.maxWidth = '50%';
    //       }
    //     }

    //     const numberAndIconWrapper = this.content.querySelector('.number-and-icon-wrapper');
    //     if (numberAndIconWrapper) {
    //       if (currentWidth > 200) {
    //         numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    //       } 
    //       else {
    //         if (this.isMobileView) {
    //           numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    //         } 
    //         else {
    //           if (this.hasCustomIndex) {
    //             numberAndIconWrapper.style.paddingLeft = "0";
    //           } 
    //           else {
    //             numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
    //           }
    //         }
    //       }
    //     }

    //     // ✅ Handle justifyContent for home button
    //     const homeButton = this.content.querySelector('.h5p-interactive-book-navigation-chapter-button');
    //     if (homeButton) {
    //       if (currentWidth > 200) {
    //         // Expanded: remove center justification
    //         homeButton.style.justifyContent = "";
    //       } 
    //       else {
    //         // Collapsed: apply center justification if conditions met
    //         if (getMaxValueCharLength(this.customTocIndex) == 0 || this.hasCustomIndex) {
    //           homeButton.style.justifyContent = "center";
    //         }
    //       }
    //     }

    //     if (currentWidth > 200) {
    //       this.chapterNodes.forEach(chapterNode => {
    //         const chapterTitleText = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
    //         const chapterNodeTitle = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
    //         if (chapterTitleText) {
    //           requestAnimationFrame(() => {
    //             handleLongTocDescription(chapterTitleText, chapterNodeTitle);
    //           });
    //         }
    //       });
    //     }
    //   }
    // });

    this.animateTocWidth = () => {
      // this.content.classList.add('navigation-list-animation');
      this.content.classList.remove("navigation-list-animation");
      // Force a reflow to reset the animation
      void this.content.offsetWidth; // This reads the width, forcing reflow

      // Re-add the animation class
      this.content.classList.add("navigation-list-animation");
    };

    // Add home button

    // Create home button using createElement
    const homeButtonElement = document.createElement('li');
    homeButtonElement.classList.add('h5p-interactive-book-navigation-chapter', 'h5p-interactive-book-navigation-closed');

    const numberAndIconWrapper = document.createElement('div');
    numberAndIconWrapper.classList.add('number-and-icon-wrapper');
    // ✅ APPLY DEFAULT/COLLAPSED STYLES: Full width and center justify
    // numberAndIconWrapper.style.width = '100%';
    // numberAndIconWrapper.style.justifyContent = 'center';
    
    if (getMaxValueCharLength(this.customTocIndex) != 0 || !this.hasCustomIndex) {
      numberAndIconWrapper.style.gap = generateClampCSS("0.5rem", "0.5rem");
    }
    if (this.isMobileView) {
      if (this.hasCustomIndex) {
        if (this.hasEmptyCustomIndex()) {
          numberAndIconWrapper.style.paddingLeft = generateClampCSS("2.5rem", "2.5rem");
        }
        else {
          // ✅ MOBILE: Use 0.5rem for length >= 4, otherwise 1rem
          const maxLength = getMaxValueCharLength(this.customTocIndex);
          const padding = (maxLength - 2) <= 4 ? "1rem" : "0.5rem";
          numberAndIconWrapper.style.paddingLeft = generateClampCSS(padding, padding);
        }
      }
      else {
        numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
      }
    }
    else {
      if (!this.hasCustomIndex) {
        // numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
      }
    }

    const homeButton = document.createElement('button');
    homeButton.setAttribute('tabindex', '-1');
    homeButton.classList.add('h5p-interactive-book-navigation-chapter-button', 'can_pause');
    homeButton.style.gap = generateClampCSS("1.25rem", "1.25rem");
    // if (getMaxValueCharLength(this.customTocIndex) == 0 || !this.hasCustomIndex) {
    // homeButton.style.justifyContent = "end";
    if (this.isMobileView) {
      homeButton.style.justifyContent = "";
      homeButton.style.paddingInline = generateClampCSS("0.75rem", "0.75rem");
    }
    else {
      // Desktop logic
      // if (this.hasCustomIndex) {
      //   if (getMaxValueCharLength(this.customTocIndex) <= 4) {
      //     homeButton.style.justifyContent = "center";
      //   }
      //   else {
      //     homeButton.style.justifyContent = "end";
      //   }
      // }
      // else {
      //   homeButton.style.justifyContent = "center";
      // }
      homeButton.style.justifyContent = "center";
      homeButton.style.paddingInline = generateClampCSS("0.5rem", "0.5rem");
    }
    // }
    // if (this.isMobileView) {
    homeButton.style.paddingBlock = generateClampCSS("0.375rem", "0.375rem");
    // }
    homeButton.style.minHeight = generateClampCSS("4rem", "4rem");
    homeButton.setAttribute('aria-expanded', 'false');
    homeButton.setAttribute('aria-controls', 'h5p-interactive-book-sectionlist-0');

    // Add chapter index
    const homeIndex = document.createElement('div');
    homeIndex.classList.add('h5p-interactive-book-navigation-chapter-index');
    // homeIndex.style.fontSize = generateClampCSS("1rem", "1rem");
    homeIndex.classList.add('item-index');
    homeIndex.innerHTML = (this.customTocIndex && Object.keys('home')?.length > 0 ? String(this.customTocIndex?.['home'] || '')?.trim() || '' : '') || '';

    // Conditional UI for custom indexing
    if (this.hasCustomIndex) {
      // let maxCharLength = getMaxValueCharLength(this.customTocIndex);
      const maxCharLength = this.calculateDynamicIndexWidth();
      // homeIndex.style.justifyContent = 'flex-end';
      homeIndex.style.display = 'flex';
      // homeIndex.style.textAlign = 'right';
      // homeIndex.style.maxWidth = `${maxCharLength}ch`;
      // homeIndex.style.width = `${maxCharLength <= 4 ? (maxCharLength - 2) : maxCharLength}ch`;
      homeIndex.style.width = maxCharLength;
      homeIndex.style.whiteSpace = 'nowrap';
      
      // Apply dynamic margin for alignment when not mobile
      // if (maxCharLength) {
      // const dynamicMargin = this.calculateDynamicMargin();
      // homeIndex.style.marginLeft = dynamicMargin;
      // }
      // homeIndex.style.marginLeft = '0.4rem'; // Adjust margin for better alignment
      // If collapsed, still show both icon and index (default behavior)
      // No need to hide either element
    } 
    else {
      homeIndex.style.width = '2ch';
      homeIndex.style.textAlign = 'center';
      homeIndex.style.fontSize = generateClampCSS("1rem", "1rem");
      // homeIndex.style.marginLeft = '0';
      // homeButton.style.paddingLeft = generateClampCSS("0.7rem", "0.7rem");
    }

    const homeIconDiv = document.createElement('div');
    const homeSize = generateClampCSS('1.5rem', '1.5rem');
    homeIconDiv.style.width = homeSize;
    homeIconDiv.style.height = homeSize;
    homeIconDiv.style.alignItems = 'center';
    homeIconDiv.style.justifyContent = 'center';
    homeIconDiv.classList.add('item-icon');
    homeIconDiv.classList.add('h5p-interactive-book-navigation-chapter-home-icon');
    // Stateful icon handling for Home
    const homeTocData = getSidebarTOCData('home', this.parent?.params?.skillData, this.themeData);
    let homeDef = '', homeHov = '', homeSel = '';
    if (homeTocData?.icon) {
      if (typeof homeTocData.icon === 'object') {
        const d = homeTocData.icon.default;
        const h = homeTocData.icon.hoverState || d;
        const s = homeTocData.icon.selectedState || d;
        homeDef = isSvgUrl(d) ? `<img src="${cleanUrl(d)}" alt="Home" style="width:${homeSize};height:${homeSize}; pointer-events: none;">` : d;
        homeHov = isSvgUrl(h) ? `<img src="${cleanUrl(h)}" alt="Home" style="width:${homeSize};height:${homeSize}; pointer-events: none;">` : h;
        homeSel = isSvgUrl(s) ? `<img src="${cleanUrl(s)}" alt="Home" style="width:${homeSize};height:${homeSize}; pointer-events: none;">` : s;
      } 
      else if (typeof homeTocData.icon === 'string') {
        homeDef = isSvgUrl(homeTocData.icon) ? `<img src="${cleanUrl(homeTocData.icon)}" alt="Home" style="width:${homeSize};height:${homeSize}; pointer-events: none;">` : homeTocData.icon;
        homeHov = homeDef; homeSel = homeDef;
      }
    } 
    else { 
      homeDef = tocIcons.home; homeHov = homeDef; homeSel = homeDef; 
    }
    homeIconDiv.dataset.iconDefault = homeDef; homeIconDiv.dataset.iconHover = homeHov; homeIconDiv.dataset.iconSelected = homeSel; homeIconDiv.innerHTML = homeDef;

    const titleTextDiv = document.createElement('div');
    titleTextDiv.classList.add('h5p-interactive-book-navigation-chapter-title-text');
    titleTextDiv.style.display = 'none'; // Hide by default for collapsed view
    titleTextDiv.style.fontWeight = 'bold';
    titleTextDiv.setAttribute('title', 'Home');

    const itemTitleTextDiv = document.createElement('div');
    itemTitleTextDiv.classList.add('h5p-interactive-book-navigation-chapter-item-title-text');
    itemTitleTextDiv.textContent = 'Home';

    titleTextDiv.appendChild(itemTitleTextDiv);
    // homeButton.appendChild(homeIndex);
    // homeButton.appendChild(homeIconDiv);
    numberAndIconWrapper.appendChild(homeIndex);
    numberAndIconWrapper.appendChild(homeIconDiv);
    homeButton.appendChild(numberAndIconWrapper);
    homeButton.appendChild(titleTextDiv);
    homeButtonElement.appendChild(homeButton);

    this.content.prepend(homeButtonElement);

    if (this.themeData?.tableOfContent?.tocItems) {
      const { backgroundColor, iconColor, hover, fontColor, skillHeading, indexNumber } = this.themeData.tableOfContent.tocItems;
      homeButton.style.backgroundColor = backgroundColor;
      homeIconDiv.style.color = iconColor;
      homeIndex.style.color = iconColor;
      titleTextDiv.style.color = fontColor;
      titleTextDiv.style.fontFamily = skillHeading?.fontFamily || 'inherit';
      titleTextDiv.style.fontWeight = skillHeading?.fontWeight || 'inherit';
      itemTitleTextDiv.style.color = fontColor;
      itemTitleTextDiv.style.fontFamily = skillHeading?.fontFamily || 'inherit';
      itemTitleTextDiv.style.fontWeight = skillHeading?.fontWeight || 'inherit';
      if (this.isMobileView) {
        titleTextDiv.style.fontSize = generateClampCSS(skillHeading?.mobile?.fontSize, skillHeading?.mobile?.fontSize) || 'inherit';
        itemTitleTextDiv.style.fontSize = generateClampCSS(skillHeading?.mobile?.fontSize, skillHeading?.mobile?.fontSize) || 'inherit';
      } 
      else {
        titleTextDiv.style.fontSize = generateClampCSS(skillHeading?.fontSize, skillHeading?.fontSize) || 'inherit';
        itemTitleTextDiv.style.fontSize = generateClampCSS(skillHeading?.fontSize, skillHeading?.fontSize) || 'inherit';
      }


      if (indexNumber && homeIndex) {
        homeIndex.style.fontFamily = indexNumber?.fontFamily || 'inherit';
        homeIndex.style.fontWeight = indexNumber?.fontWeight || 'inherit';
        homeIndex.style.fontSize = generateClampCSS(indexNumber?.fontSize, indexNumber?.fontSize) || 'inherit';
        if (this.isMobileView) {
          homeIndex.style.fontSize = generateClampCSS(indexNumber?.mobile?.fontSize, indexNumber?.mobile?.fontSize) || 'inherit';
        }
      }

      homeButton.addEventListener('mouseover', () => {
        if (!homeButton.classList.contains('h5p-interactive-book-navigation-current')) {
          if (!this.isMobileView) {
            homeButton.style.backgroundColor = hover.backgroundColor;
            homeIconDiv.style.color = hover.iconColor;
            homeIndex.style.color = hover.iconColor;
            titleTextDiv.style.color = hover.fontColor;
            homeIconDiv.innerHTML = homeIconDiv.dataset.iconHover || homeIconDiv.dataset.iconDefault;
          }
        }
      });
      homeButton.addEventListener('mouseout', () => {
        if (!homeButton.classList.contains('h5p-interactive-book-navigation-current')) {
          homeButton.style.backgroundColor = backgroundColor;
          // ...existing revert colors...
          homeIconDiv.style.color = iconColor;
          homeIndex.style.color = iconColor;
          titleTextDiv.style.color = fontColor;
          homeIconDiv.innerHTML = homeIconDiv.dataset.iconDefault;
        }
      });

      homeButton.addEventListener('click', () => {
        // this.coverBanner.style.display = 'flex';
        // Remove previous selected item's background color
        const previousSelectedChapter = document.querySelector('.h5p-interactive-book-navigation-current');
        const prev = document.querySelector('.h5p-interactive-book-navigation-current');
        if (prev && prev !== homeButton) {
          const prevIcon = prev.querySelector('.item-icon, .h5p-interactive-book-navigation-chapter-home-icon');
          if (prevIcon) prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
        }
        homeIconDiv.innerHTML = homeIconDiv.dataset.iconSelected || homeIconDiv.dataset.iconDefault;
        if (previousSelectedChapter) {
          previousSelectedChapter.classList.remove('h5p-interactive-book-navigation-current');
          previousSelectedChapter.style.backgroundColor = backgroundColor;
          previousSelectedChapter.style.color = fontColor;
          // Reset numberAndIconWrapper and itemTitleElement and itemDescriptionElement color for previous item
          let previousItemIndex = previousSelectedChapter.querySelector('.item-index');
          let previousItemTitle = previousSelectedChapter.querySelector('.item-title');
          let previousItemDescription = previousSelectedChapter.querySelector('.item-description');
          let previousItemToggleDescriptionIcon = previousSelectedChapter.querySelector('.toggle-description');
          let previousItemIcon = previousSelectedChapter.querySelector('.item-icon');
          if (previousItemIndex) previousItemIndex.style.color = iconColor;
          if (previousItemTitle) previousItemTitle.style.color = fontColor;
          if (previousItemDescription) previousItemDescription.style.color = fontColor;
          if (previousItemToggleDescriptionIcon) previousItemToggleDescriptionIcon.style.color = fontColor;
          if (previousItemIcon) previousItemIcon.style.color = iconColor;
        }
      });
    } 
    else {
      homeButton.addEventListener('mouseover', () => {
        if (!homeButton.classList.contains('h5p-interactive-book-navigation-current')) {
          homeIconDiv.innerHTML = homeIconDiv.dataset.iconHover || homeIconDiv.dataset.iconDefault;
        }
      });
      homeButton.addEventListener('mouseout', () => {
        if (!homeButton.classList.contains('h5p-interactive-book-navigation-current')) {
          homeIconDiv.innerHTML = homeIconDiv.dataset.iconDefault;
        }
      });

      homeButton.addEventListener('click', () => {
        // this.coverBanner.style.display = 'flex';
        // Remove previous selected item's background color
        const previousSelectedChapter = document.querySelector('.h5p-interactive-book-navigation-current');
        const prev = document.querySelector('.h5p-interactive-book-navigation-current');
        if (prev && prev !== homeButton) {
          const prevIcon = prev.querySelector('.item-icon, .h5p-interactive-book-navigation-chapter-home-icon');
          if (prevIcon) prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
        }
        homeIconDiv.innerHTML = homeIconDiv.dataset.iconSelected || homeIconDiv.dataset.iconDefault;
        if (previousSelectedChapter) {
          previousSelectedChapter.classList.remove('h5p-interactive-book-navigation-current');
        }
      });
    }

    homeButtonElement.addEventListener('click', () => {
      // ✅ RESET PADDING BEFORE NAVIGATING TO COVER
      this.resetPaddingStyles();

      // Trigger interacted event with lesson metadata
      this.parent.buildXAPIEventTrigger();
      this.hideAllChapterTitles();
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

      if (this.isOpenOnMobile()) {
        this.parent.trigger('toggleMenu');
      }
    });


    if (this.themeData?.tableOfContent?.tocItems) {
      const { backgroundColor, hoverState, selectedState } = this.themeData.tableOfContent.tocItems;

      homeButtonElement.style.backgroundColor = backgroundColor;

      homeButtonElement.addEventListener('mouseover', () => {
        homeButtonElement.style.backgroundColor = hoverState.backgroundColor;
      });

      homeButtonElement.addEventListener('mouseout', () => {
        homeButtonElement.style.backgroundColor = backgroundColor;
      });
    }

    if (this.chapters.length > 20) {
      this.content.classList.add('large-navigation-list');
    }

    this.container.appendChild(this.content);

    this.addTransformListener();
    this.initializeNavigationControls();

    // Remove the animation from the menu once it's in the DOM to apply the hover effect
    const observer = new MutationObserver((mutationsList) => {
      const menu = document.querySelector('.navigation-list');
      if (menu) {
        menu.addEventListener('animationend', () => {
          menu.style.animation = 'none'; // Re-enable the animation 
        });

        // Perform actions specific to the menu
        observer.disconnect(); // Stop observing once the element is found
      }
    });

    observer.observe(document.body, {
      childList: true, // Watch for additions/removals of child elements
      subtree: true   // Include all levels of the DOM
    });
  }

  // ✅ SMOOTH STYLE APPLICATION: Apply expanded styles immediately on hover
  applyExpandedStyles() {
    this.chapterNodes.forEach(chapterNode => {
      const numberAndIconWrapper = chapterNode.querySelector('.number-and-icon-wrapper');
      const chapterNodeTitle = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
      const chapterTitleText = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
      // const chapterIndex = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-index');
      
      if (numberAndIconWrapper) {
        if (this.hasCustomIndex) {
          if (this.hasEmptyCustomIndex()) {
            numberAndIconWrapper.style.paddingLeft = generateClampCSS("2.5rem", "2.5rem");
          }
          else {
            // ✅ EXPANDED: Use 0.5rem for length >= 4, otherwise 1rem
            const maxLength = getMaxValueCharLength(this.customTocIndex);
            const padding = (maxLength - 2) <= 4 ? "1rem" : "0.5rem";
            numberAndIconWrapper.style.paddingLeft = generateClampCSS(padding, padding);
          }
        }
        else {
          numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
        }
      }
      
      // ✅ APPLY CHARACTER-BASED WIDTH: Only in expanded view for custom indexing
      // if (chapterIndex && this.hasCustomIndex) {
      //   const dynamicWidth = this.calculateDynamicIndexWidth();
      //   // chapterIndex.style.width = `${maxCharLength <= 4 ? (maxCharLength - 2) : maxCharLength}ch`;
      //   chapterIndex.style.width = dynamicWidth;
      // }
      
      if (chapterNodeTitle) {
        // Apply justifyContent for expanded mode - center for all cases
        chapterNodeTitle.style.justifyContent = "";
        chapterNodeTitle.style.paddingInline = generateClampCSS("0.75rem", "0.75rem");
      }
      
      if (chapterTitleText) {
        chapterTitleText.style.display = 'block';
      }
    });

    // Handle home button styles
    const homeNumberAndIconWrapper = this.content.querySelector('.number-and-icon-wrapper');
    const homeButton = this.content.querySelector('.h5p-interactive-book-navigation-chapter-button');
    const homeTitleText = this.content.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
    // const homeIndex = this.content.querySelector('.h5p-interactive-book-navigation-chapter-index');
    
    if (homeNumberAndIconWrapper) {
      if (this.hasCustomIndex) {
        if (this.hasEmptyCustomIndex()) {
          homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS("2.5rem", "2.5rem");
        }
        else {
          // ✅ EXPANDED: Use 0.5rem for length >= 4, otherwise 1rem
          const maxLength = getMaxValueCharLength(this.customTocIndex);
          const padding = (maxLength - 2) <= 4 ? "1rem" : "0.5rem";
          homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS(padding, padding);
        }
      }
      else {
        homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
      }
    }
    
    // ✅ APPLY CHARACTER-BASED WIDTH: Only in expanded view for custom indexing
    // if (homeIndex && this.hasCustomIndex) {
    //   const dynamicWidth = this.calculateDynamicIndexWidth();
    //   // homeIndex.style.width = `${maxCharLength <= 4 ? (maxCharLength - 2) : maxCharLength}ch`;
    //   homeIndex.style.width = dynamicWidth;
    // }
    
    if (homeButton) {
      // Apply justifyContent for expanded mode - center for all cases
      homeButton.style.justifyContent = "";
      homeButton.style.paddingInline = generateClampCSS("0.75rem", "0.75rem");
    }
    
    if (homeTitleText) {
      homeTitleText.style.display = 'block';
    }
  }

  // ✅ SMOOTH STYLE APPLICATION: Apply collapsed styles immediately on hover leave
  applyCollapsedStyles() {
    this.chapterNodes.forEach(chapterNode => {
      const numberAndIconWrapper = chapterNode.querySelector('.number-and-icon-wrapper');
      const chapterNodeTitle = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
      // const chapterIndex = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-index');
      
      if (numberAndIconWrapper) {
        if (this.isMobileView) {
          if (this.hasCustomIndex) {
            // numberAndIconWrapper.style.paddingLeft = generateClampCSS("2.5rem", "2.5rem");
          }
          else {
            // numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
          }
        }
        else {
          if (this.hasCustomIndex) {
            // numberAndIconWrapper.style.paddingLeft = "0";
          }
          else {
            // numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
          }
          numberAndIconWrapper.style.paddingLeft = "0";
        }
      }
      
      // ✅ RESET WIDTH: Remove character-based width in collapsed view (desktop only)
      // if (chapterIndex && this.hasCustomIndex && !this.isMobileView) {
      //   chapterIndex.style.width = "";
      // }
      
      if (chapterNodeTitle) {
        // if (getMaxValueCharLength(this.customTocIndex) == 0 || this.hasCustomIndex) {
        //   chapterNodeTitle.style.justifyContent = "end";
        // }
        if (this.isMobileView) {
          chapterNodeTitle.style.justifyContent = "";
        }
        else {
          // Desktop logic
          // if (this.hasCustomIndex) {
          //   if (getMaxValueCharLength(this.customTocIndex) <= 4) {
          //     chapterNodeTitle.style.justifyContent = "center";
          //   }
          //   else {
          //     chapterNodeTitle.style.justifyContent = "end";
          //   }
          // }
          // else {
          chapterNodeTitle.style.justifyContent = "center";
          // }
        }
        chapterNodeTitle.style.paddingInline = generateClampCSS("0.5rem", "0.5rem");
      }
    });

    // Handle home button collapsed styles
    const homeNumberAndIconWrapper = this.content.querySelector('.number-and-icon-wrapper');
    const homeButton = this.content.querySelector('.h5p-interactive-book-navigation-chapter-button');
    // const homeIndex = this.content.querySelector('.h5p-interactive-book-navigation-chapter-index');
    
    if (homeNumberAndIconWrapper) {
      if (this.isMobileView) {
        if (this.hasCustomIndex) {
          // homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS("2.5rem", "2.5rem");
        }
        else {
          // homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
        }
      }
      else {
        if (this.hasCustomIndex) {
          // homeNumberAndIconWrapper.style.paddingLeft = "0";
        } 
        else {
          // homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
        }
        homeNumberAndIconWrapper.style.paddingLeft = "0";
        // homeNumberAndIconWrapper.style.justifyContent = 'center';
        // homeNumberAndIconWrapper.style.width = '100%';
      }
    }
    
    // ✅ RESET WIDTH: Remove character-based width in collapsed view (desktop only)
    // if (homeIndex && this.hasCustomIndex && !this.isMobileView) {
    //   homeIndex.style.width = "";
    // }
    
    if (homeButton) {
      // if (getMaxValueCharLength(this.customTocIndex) == 0 || this.hasCustomIndex) {
      //   homeButton.style.justifyContent = "end";
      // }
      if (this.isMobileView) {
        homeButton.style.justifyContent = "";
      }
      else {
        // Desktop logic
        // if (this.hasCustomIndex) {
        //   if (getMaxValueCharLength(this.customTocIndex) <= 4) {
        //     homeButton.style.justifyContent = "center";
        //   } 
        //   else {
        //     homeButton.style.justifyContent = "end";
        //   }
        // }
        // else {
        //   homeButton.style.justifyContent = "center";
        // }
        homeButton.style.justifyContent = "center";
      }
      homeButton.style.paddingInline = generateClampCSS("0.5rem", "0.5rem");
    }
  }

  resetPaddingStyles() {
    // ✅ UPDATED: Reset both chapter nodes AND home button with new threshold logic
    this.chapterNodes.forEach(chapterNode => {
      // const numberAndIconWrapper = chapterNode.querySelector('.number-and-icon-wrapper');
      // if (numberAndIconWrapper) {
      //   // FORCE remove all inline padding styles first
      //   numberAndIconWrapper.style.removeProperty('padding-left');

      //   // Then apply correct collapsed view padding (using same logic as transitionend)
      //   if (this.isMobileView) {
      //     numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
      //   } 
      //   else {
      //     if (this.hasCustomIndex) {
      //       // numberAndIconWrapper.style.paddingLeft = "0";
      //     } 
      //     else {
      //       // numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
      //     }
      //   }
      // }
      const chapterNodeTitle = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
      // ✅ Handle justifyContent for chapter nodes (collapsed state logic)
      // if (chapterNodeTitle && (getMaxValueCharLength(this.customTocIndex) == 0 || this.hasCustomIndex)) {
      //   chapterNodeTitle.style.justifyContent = "end";
      // } 
      // else if (chapterNodeTitle) {
      //   chapterNodeTitle.style.justifyContent = "";
      // }
      if (this.isMobileView) {
        chapterNodeTitle.style.justifyContent = "";
      }
      else {
        // Desktop logic
        // if (this.hasCustomIndex) {
        //   if (getMaxValueCharLength(this.customTocIndex) <= 4) {
        //     chapterNodeTitle.style.justifyContent = "center";
        //   } 
        //   else {
        //     chapterNodeTitle.style.justifyContent = "end";
        //   }
        // }
        // else {
        //   chapterNodeTitle.style.justifyContent = "center";
        // }
        chapterNodeTitle.style.justifyContent = "center";
      }
    });

    // ✅ Reset home button padding (with force removal)
    // const homeNumberAndIconWrapper = this.content.querySelector('.number-and-icon-wrapper');
    // if (homeNumberAndIconWrapper) {
    //   // FORCE remove all inline padding styles first
    //   homeNumberAndIconWrapper.style.removeProperty('padding-left');

    //   // Then apply correct collapsed view padding (using same logic as transitionend)
    //   if (this.isMobileView) {
    //     homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    //   } 
    //   else {
    //     if (this.hasCustomIndex) {
    //       // homeNumberAndIconWrapper.style.paddingLeft = "0";
    //     } 
    //     else {
    //       // homeNumberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
    //     }
    //   }
    // }

    // ✅ Handle justifyContent for home button (collapsed state logic)
    const homeButton = this.content.querySelector('.h5p-interactive-book-navigation-chapter-button');
    if (homeButton) {
      // Collapsed: apply center justification if conditions met
      if (this.isMobileView) {
        homeButton.style.justifyContent = "";
      }
      else {
        // Desktop logic
        // if (this.hasCustomIndex) {
        //   if (getMaxValueCharLength(this.customTocIndex) <= 4) {
        //     homeButton.style.justifyContent = "center";
        //   } 
        //   else {
        //     homeButton.style.justifyContent = "end";
        //   }
        // }
        // else {
        //   homeButton.style.justifyContent = "center";
        // }
        homeButton.style.justifyContent = "center";
      }
      // Reset paddingInline based on mobile/desktop - restore original values
      // if (this.isMobileView) {
      //   homeButton.style.paddingInline = generateClampCSS("0.75rem", "0.75rem");
      // } 
      // else {
      //   homeButton.style.paddingInline = generateClampCSS("0.5rem", "0.5rem");
      // }
    }
  }

  hasAnyCustomIndex() {
    const toc = this.chapters || [];
    const customIndex = this.customTocIndex || {};
    return toc.some(item => customIndex[item.activityId] !== undefined && customIndex[item.activityId] !== null) || customIndex['home'] !== undefined && customIndex['home'] !== null;
  }

  // Check if custom numbering object exists but all values are empty/null
  hasEmptyCustomIndex() {
    const customIndex = this.customTocIndex || {};
    return Object.keys(customIndex).length > 0 && getMaxValueCharLength(customIndex) === 0;
  }

  initializeNavigationControls() {
    const keyCodes = Object.freeze({
      'UP': 38,
      'DOWN': 40,
    });

    this.chapterNodes.forEach((chapter, i) => {
      const chapterButton = chapter.querySelector('.h5p-interactive-book-navigation-chapter-button');
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

      const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];
        const sectionButton = section.querySelector('.section-button');
        sectionButton.addEventListener('keydown', e => {
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

    // Check if we should navigate to a section
    if (direction) {
      const chapterIndex = direction > 0 ? index : nextIndex;
      const chapter = this.chapterNodes[chapterIndex];
      if (!chapter.classList.contains('h5p-interactive-book-navigation-closed')) {
        const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');
        if (sections.length) {
          const sectionItemIndex = direction > 0 ? 0 : sections.length - 1;
          this.setFocusToSectionItem(chapterIndex, sectionItemIndex);
          return;
        }
      }
    }

    const nextChapter = this.chapterNodes[nextIndex];
    const chapterButton = nextChapter.querySelector('.h5p-interactive-book-navigation-chapter-button');
    this.setFocusToItem(chapterButton, nextIndex);
  }

  setFocusToSectionItem(chapterIndex, index, direction = 0) {
    const chapter = this.chapterNodes[chapterIndex];
    const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');

    // Navigate chapter if outside of section bounds
    const nextIndex = index + direction;
    if (nextIndex > sections.length - 1) {
      this.setFocusToChapterItem(chapterIndex + 1);
      return;
    }
    else  if (nextIndex < 0) {
      this.setFocusToChapterItem(chapterIndex);
      return;
    }

    const section = sections[nextIndex];
    const sectionButton = section.querySelector('.section-button');
    this.setFocusToItem(sectionButton, chapterIndex);
  }

  setFocusToItem(element, chapterIndex, skipFocusing = false) {
    // Remove focus from all other elements
    this.chapterNodes.forEach((chapter, index) => {
      const chapterButton = chapter.querySelector('.h5p-interactive-book-navigation-chapter-button');

      if (index === chapterIndex) {
        chapterButton.classList.add('h5p-interactive-book-navigation-current');

        if (this.themeData?.tableOfContent?.tocItems) {
          const { selected } = this.themeData.tableOfContent.tocItems;

          // ✅ CHECK IF ELEMENTS EXIST BEFORE ACCESSING PROPERTIES
          let itemTitleText = chapterButton.querySelector('.item-title');
          let itemDescriptionText = chapterButton.querySelector('.item-description');
          let itemToggleDescriptionIcon = chapterButton.querySelector('.toggle-description');
          let itemIcon = chapterButton.querySelector('.item-icon');
          let itemIndex = chapterButton.querySelector('.item-index');

          chapterButton.style.backgroundColor = selected.backgroundColor;

          // ✅ SAFE PROPERTY ACCESS
          if (itemTitleText) itemTitleText.style.color = selected.fontColor;
          if (itemDescriptionText) itemDescriptionText.style.color = selected.fontColor;
          if (itemToggleDescriptionIcon) itemToggleDescriptionIcon.style.color = selected.fontColor;
          if (itemIcon) {
            itemIcon.style.color = selected.iconColor;
            itemIcon.innerHTML = itemIcon.dataset.iconSelected || itemIcon.dataset.iconDefault || itemIcon.innerHTML;
          }
          if (itemIndex) itemIndex.style.color = selected.iconColor;
        } 
        else {
          // ✅ FALLBACK WHEN NO THEME
          let itemIcon = chapterButton.querySelector('.item-icon');
          if (itemIcon) {
            itemIcon.innerHTML = itemIcon.dataset.iconSelected || itemIcon.dataset.iconDefault || itemIcon.innerHTML;
          }
        }
      } 
      else {
        chapterButton.classList.remove('h5p-interactive-book-navigation-current');

        if (this.themeData?.tableOfContent?.tocItems) {
          const { backgroundColor, fontColor, iconColor } = this.themeData.tableOfContent.tocItems;

          // ✅ SAFE PROPERTY ACCESS FOR NON-SELECTED ITEMS
          let itemTitleText = chapterButton.querySelector('.item-title');
          let itemDescriptionText = chapterButton.querySelector('.item-description');
          let itemToggleDescriptionIcon = chapterButton.querySelector('.toggle-description');
          let itemIcon = chapterButton.querySelector('.item-icon');
          let itemIndex = chapterButton.querySelector('.item-index');

          chapterButton.style.backgroundColor = backgroundColor;

          if (itemTitleText) itemTitleText.style.color = fontColor;
          if (itemDescriptionText) itemDescriptionText.style.color = fontColor;
          if (itemToggleDescriptionIcon) itemToggleDescriptionIcon.style.color = fontColor;
          if (itemIcon) {
            itemIcon.style.color = iconColor;
            itemIcon.innerHTML = itemIcon.dataset.iconDefault || itemIcon.innerHTML;
          }
          if (itemIndex) itemIndex.style.color = iconColor;
        } 
        else {
          // ✅ FALLBACK WHEN NO THEME
          let itemIcon = chapterButton.querySelector('.item-icon');
          if (itemIcon) {
            itemIcon.innerHTML = itemIcon.dataset.iconDefault || itemIcon.innerHTML;
          }
        }
      }


      chapterButton.setAttribute('tabindex', '-1');

      const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionButton = section.querySelector('.section-button');
        sectionButton.setAttribute('tabindex', '-1');
      }
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
    container.classList.add('h5p-interactive-book-navigation');

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

      let title, skill, description, packageId = '';
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
          title = content?.metadata.title;
          skill = content?.params?.skill || '--';
          description = content?.params?.description || '--';
          packageId = content?.params?.packageId || '';

      }

      sectionsData.push({
        title: title,
        id: content?.subContentId ? `h5p-interactive-book-section-${content?.subContentId}` : undefined,
        skill: skill,
        description: description,
        packageId: packageId,
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
        activityId : activitieID,
      });
    }

    if (this.parent.hasSummary()) {
      chapters.push({
        sections: [],
        title: this.l10n.summaryHeader,
        id: `h5p-interactive-book-chapter-summary`,
        isSummary: true,
      });
    }
    return chapters;
  }

  hideAllChapterTitles() {
    // Hide all chapter title texts
    this.chapterNodes.forEach(chapterNode => {
      const chapterTitleText = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
      if (chapterTitleText) {
        chapterTitleText.style.display = 'none';
      }
    });
    // Hide home button title text
    const homeTitleText = this.content.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
    if (homeTitleText) homeTitleText.style.display = 'none';
  }

  /**
   * Toggle chapter menu.
   *
   * @param {HTMLElement} chapterNode Chapter.
   * @param {boolean} collapse If true, will collapse chapter.
   */
  toggleChapter(chapterNode, collapse) {
    collapse = (collapse !== undefined) ? collapse : !(chapterNode.classList.contains('h5p-interactive-book-navigation-closed'));

    const childNav = chapterNode.querySelector('.h5p-interactive-book-navigation-sectionlist');
    const arrow = chapterNode.getElementsByClassName('h5p-interactive-book-navigation-chapter-accordion')[0];
    const chapterButton = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
    chapterButton?.setAttribute('aria-expanded', (!collapse).toString());

    if (collapse === true) {
      chapterNode.classList.add('h5p-interactive-book-navigation-closed');
      if (arrow) {
        arrow.classList.remove('icon-expanded');
        arrow.classList.add('icon-collapsed');
        if (childNav) {
          childNav.setAttribute('aria-hidden', true);
          childNav.setAttribute('tabindex', '-1');
        }
      }
    }
    else {
      chapterNode.classList.remove('h5p-interactive-book-navigation-closed');
      if (arrow) {
        arrow.classList.remove('icon-collapsed');
        arrow.classList.add('icon-expanded');
        if (childNav) {
          childNav.removeAttribute('aria-hidden');
          childNav.removeAttribute('tabindex');
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
    this.parent.trigger('resize');


    // Always re-apply selected styles for the active chapter.
    // The guard `chapterId !== this.focusedChapter` was preventing re-selection when the
    // user navigated Home (which cleared the visual state) and then returned to the same
    // chapter, because focusedChapter still held the old value. skipFocusing=true ensures
    // no unwanted scrolling side-effect.
    const chapterButton = this.chapterNodes?.[chapterId]?.querySelector('.h5p-interactive-book-navigation-chapter-button');
    this.setFocusToItem(chapterButton, chapterId, true);
  }

  /**
   * Reset indicators.
   */
  resetIndicators() {
    this.chapterNodes.forEach((node, index) => {
      // Reset chapter
      // this.updateChapterProgressIndicator(index, 'BLANK');

      // Reset sections
      const sections = node.getElementsByClassName('h5p-interactive-book-navigation-section');
      for (let section of sections) {
        const icon = section.querySelector('.h5p-interactive-book-navigation-section-icon');
        if (icon) {
          icon.classList.remove('icon-question-answered');
          icon.classList.add('icon-chapter-blank');
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
    if ( chapter.isSummary ) {
      return;
    }

    const progressIndicator = this.chapterNodes[chapterId]
      .getElementsByClassName('h5p-interactive-book-navigation-chapter-progress')[0];

    if (status === 'BLANK') {
      progressIndicator?.classList?.remove('icon-chapter-started');
      progressIndicator?.classList?.remove('icon-chapter-done');
      progressIndicator?.classList?.add('icon-chapter-blank');
    }
    else if (status === 'DONE') {
      progressIndicator?.classList?.remove('icon-chapter-blank');
      progressIndicator?.classList?.remove('icon-chapter-started');
      progressIndicator?.classList?.add('icon-chapter-done');
    }
    else if (status === 'STARTED') {
      progressIndicator?.classList?.remove('icon-chapter-blank');
      progressIndicator?.classList?.remove('icon-chapter-done');
      progressIndicator?.classList?.add('icon-chapter-started');
    }
  }

  /**
   * Set section marker.
   *
   * @param {number} chapterId Chapter Id.
   * @param {number} sectionId Section Id.
   */
  setSectionMarker(chapterId, sectionId) {
    const icon = this.chapterNodes[chapterId]
      .querySelector('.h5p-interactive-book-navigation-section-' + sectionId + ' .h5p-interactive-book-navigation-section-icon');

    if (icon) {
      icon.classList.remove('icon-chapter-blank');
      icon.classList.add('icon-question-answered');
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
    const sectionsDivId = 'h5p-interactive-book-sectionlist-' + chapterId;
    chapterNode.classList.add('h5p-interactive-book-navigation-chapter');

    // Add package id to chapter node (activity page toc li element)
    if (chapter.packageId) {
      chapterNode.classList.add((`packageId-${chapter.packageId}`).replace(/[^a-zA-Z0-9-]/g, '-'));
    }

    if (chapter.isSummary) {
      chapterNode.classList.add('h5p-interactive-book-navigation-summary-button');

      // This is the chapter object that holds the original Summary instance
      const summaryChapterObject = this.parent.chapters[chapterId];
      // Check if the button exists on the instance before trying to use it
      if (summaryChapterObject && summaryChapterObject.instance && summaryChapterObject.instance.summaryMenuButton) {
        // This is the original button, which has isConnected: false
        const originalButton = summaryChapterObject.instance.summaryMenuButton;
        // 🔥 FIX: Create a clone. The clone is also disconnected initially.
        const summaryButtonClone = originalButton.cloneNode(true);
        // The clone needs its own click event to trigger the original's logic
        summaryButtonClone.onclick = () => {
          originalButton.click();
        };
        summaryButtonClone.classList.add('h5p-interactive-book-navigation-chapter-button');

        // 👇 THIS IS THE MOMENT `isConnected` BECOMES TRUE 👇
        // When chapterNode is appended to the sidebar, the clone becomes connected to the document.
        chapterNode.appendChild(summaryButtonClone);
      }
      else {
        // This is a fallback in case the summary button wasn't created correctly
        console.error("Summary button could not be found. The sidebar entry will be empty.");
        chapterNode.innerHTML = `<button class="h5p-interactive-book-navigation-chapter-button">Summary (Error)</button>`;
      }

      return chapterNode;
    }

    // TODO: Clean this up. Will require to receive chapter info from parent instead of building itself
    const chapterCollapseIcon = document.createElement('div');
    chapterCollapseIcon.classList.add('h5p-interactive-book-navigation-chapter-accordion');

    const chapterCompletionIcon = document.createElement('div');
    if (this.behaviour.progressIndicators) {
      chapterCompletionIcon.classList.add('icon-chapter-blank');
      chapterCompletionIcon.classList.add('h5p-interactive-book-navigation-chapter-progress');
    }

    const numberAndIconWrapper = document.createElement('div');
    numberAndIconWrapper.classList.add('number-and-icon-wrapper');
    if (getMaxValueCharLength(this.customTocIndex) != 0 || !this.hasCustomIndex) {
      numberAndIconWrapper.style.gap = generateClampCSS("0.5rem", "0.5rem");
    }
    if (this.isMobileView) {
      if (this.hasCustomIndex) {
        if (this.hasEmptyCustomIndex()) {
          numberAndIconWrapper.style.paddingLeft = generateClampCSS("2.5rem", "2.5rem");
        }
        else {
          // ✅ MOBILE: Use 0.5rem for length >= 4, otherwise 1rem
          const maxLength = getMaxValueCharLength(this.customTocIndex);
          const padding = (maxLength - 2) <= 4 ? "1rem" : "0.5rem";
          numberAndIconWrapper.style.paddingLeft = generateClampCSS(padding, padding);
        }
      }
      else {
        numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
      }
    }
    else {
      if (!this.hasCustomIndex) {
        // numberAndIconWrapper.style.paddingLeft = generateClampCSS("0.5rem", "0.5rem");
      }
    }

    const chapterNodeTitle = document.createElement('button');
    chapterNodeTitle.setAttribute('tabindex', chapterId === 0 ? '0' : '-1');
    chapterNodeTitle.classList.add('h5p-interactive-book-navigation-chapter-button', 'can_pause');
    chapterNodeTitle.style.gap = generateClampCSS("1.25rem", "1.25rem");
    // if (this.hasCustomIndex) {
    //   chapterNodeTitle.style.justifyContent = "end";
    // }
    // else {
    //   chapterNodeTitle.style.justifyContent = "center";
    // }
    if (this.isMobileView) {
      chapterNodeTitle.style.justifyContent = "";
      chapterNodeTitle.style.paddingInline = generateClampCSS("0.75rem", "0.75rem");
    }
    else {
      // Desktop logic
      // if (this.hasCustomIndex) {
      //   if (getMaxValueCharLength(this.customTocIndex) <= 4) {
      //     chapterNodeTitle.style.justifyContent = "center";
      //   }
      //   else {
      //     chapterNodeTitle.style.justifyContent = "end";
      //   }
      // }
      // else {
      //   chapterNodeTitle.style.justifyContent = "center";
      // }
      chapterNodeTitle.style.justifyContent = "center";
      chapterNodeTitle.style.paddingInline = generateClampCSS("0.5rem", "0.5rem");
    }
    // if (this.isMobileView) {
    chapterNodeTitle.style.paddingBlock = generateClampCSS("0.375rem", "0.375rem");
    // }
    chapterNodeTitle.style.minHeight = generateClampCSS("4rem", "4rem");
    // chapterNodeTitle.style.paddingRight = generateClampCSS("0.75rem", "0.75rem");

    if (this.parent.activeChapter !== chapterId) {
      chapterCollapseIcon.classList.add('icon-collapsed');
      chapterNodeTitle.setAttribute('aria-expanded', 'false');
    }
    else {
      chapterCollapseIcon.classList.add('icon-expanded');
      chapterNodeTitle.setAttribute('aria-expanded', 'true');
    }
    chapterNodeTitle.setAttribute('aria-controls', sectionsDivId);
    chapterNodeTitle.addEventListener('click', (event) => {
      // chapterNodeTitle.onclick = (event) => {
      if (
        event.target.classList.contains('toggle-description') ||
        event.target.closest('.toggle-description') ||
        event.target.classList.contains('toc-des-icon-toggle-wrapper') ||
        event.target.closest('.toc-des-icon-toggle-wrapper')
      ) {
        return;
      }
      const accordion = event.currentTarget.querySelector('.h5p-interactive-book-navigation-chapter-accordion');

      const isExpandable = !accordion.classList.contains('hidden');
      const isExpanded = event.currentTarget.getAttribute('aria-expanded') === 'true';

      if (this.isOpenOnMobile()) {
        this.parent.trigger('toggleMenu');
      }

      // Open chapter in main content
      if (this.isOpenOnMobile() || !isExpandable || !isExpanded) {
        const newChapter = {
          h5pbookid: this.parent.contentId,
          chapter: this.chapters[chapterId].id,
          section: 0,
        };

        this.parent.trigger('newChapter', newChapter);
      }

      // Expand chapter in menu
      if (isExpandable) {
        this.toggleChapter(event.currentTarget.parentElement);
        this.parent.trigger('resize');
      }
    });

    const chapterTitleText = document.createElement('div');
    chapterTitleText.classList.add('h5p-interactive-book-navigation-chapter-title-text');
    chapterTitleText.style.display = 'none';
    // chapterTitleText.innerHTML = chapter.title + "hello";
    // chapterTitleText.setAttribute('title', chapter.title);

    const itemTitle = document.createElement('div');
    itemTitle.classList.add('item-title');
    itemTitle.classList.add('h5p-interactive-book-navigation-chapter-item-title-text');
    itemTitle.innerHTML = getSidebarTOCData(chapter.skill, this.parent?.params?.skillData).label;

    const itemDescription = document.createElement('div');
    itemDescription.classList.add('item-description');
    itemDescription.classList.add('h5p-interactive-book-navigation-chapter-item-description');
    itemDescription.classList.add('toc-description');
    itemDescription.innerHTML = `${chapter.description}`;

    // Insert description into DOM before measuring truncation
    chapterTitleText.appendChild(itemTitle);
    chapterTitleText.appendChild(itemDescription);
    chapterNodeTitle.appendChild(chapterCollapseIcon);
    // chapterNodeTitle.appendChild(chapterCompletionIcon);

    const size = generateClampCSS('1.5rem', '1.5rem');
    // Add chapter Icon
    const chapterIcon = document.createElement('div');
    chapterIcon.style.width = size;
    chapterIcon.style.height = size;
    chapterIcon.style.alignItems = 'center';
    chapterIcon.style.justifyContent = 'center';
    chapterIcon.classList.add('item-icon');
    chapterIcon.classList.add('h5p-interactive-book-navigation-chapter-icon');
    const chapterSkillIcon = chapter.skill == "--" ? 'reading' : `${chapter.skill.toLowerCase()}`;
    chapterIcon.classList.add(chapterSkillIcon);

    // 🔥 Ensure skillData exists
    if (!this.parent.params.skillData) {
      this.parent.params.skillData = {};
    }

    // Check is TOC is branching pathway or not
    const originalTocItem = this.config?.tableOfContents?.find(
      tocItem => tocItem.activityId === chapter.activityId
    );

    let branchingIconName = '';
    const branchingIcon = originalTocItem?.h5pTemplate?.mainLibraryName?.includes("branching") ? true : null;
    if (branchingIcon) {
      const segment = this.parent.params?.lessonMetadata?.segment;
      branchingIconName = (this.themeData && Object.keys(this.themeData)?.length > 0) ? "branchingIcon" : (["primary", "pre-primary", "prePrimary", "preprimary"].includes(segment) ? 'branchingIconPrimary' : ["secondary", "adult"].includes(segment) ? 'branchingIconSecondary' : 'branchingIcon');
    }

    const chapterTocData = getSidebarTOCData(chapter.skill, this.parent?.params?.skillData, this.themeData, branchingIconName);
    let defI = '', hovI = '', selI = '';
    if (chapterTocData?.icon) {
      if (typeof chapterTocData.icon === 'object') {
        const d = chapterTocData.icon.default; const h = chapterTocData.icon.hoverState || d; const s = chapterTocData.icon.selectedState || d;
        defI = isSvgUrl(d) ? `<img src="${cleanUrl(d)}" alt="${chapter.skill}" style="width:${size};height:${size}; pointer-events: none;">` : d;
        hovI = isSvgUrl(h) ? `<img src="${cleanUrl(h)}" alt="${chapter.skill}" style="width:${size};height:${size}; pointer-events: none;">` : h;
        selI = isSvgUrl(s) ? `<img src="${cleanUrl(s)}" alt="${chapter.skill}" style="width:${size};height:${size}; pointer-events: none;">` : s;
      } 
      else if (typeof chapterTocData.icon === 'string') {
        defI = isSvgUrl(chapterTocData.icon) ? `<img src="${cleanUrl(chapterTocData.icon)}" alt="${chapter.skill}" style="width:${size};height:${size}; pointer-events: none;">` : chapterTocData.icon;
        hovI = defI; selI = defI;
      }
    }
    chapterIcon.dataset.iconDefault = defI; chapterIcon.dataset.iconHover = hovI || defI; chapterIcon.dataset.iconSelected = selI || defI; chapterIcon.innerHTML = defI;
    // chapterTitleText.parentNode.insertBefore(chapterIcon, chapterTitleText);

    // Add chapter index
    const chapterIndex = document.createElement('div');
    chapterIndex.classList.add('h5p-interactive-book-navigation-chapter-index');
    // chapterIndex.style.fontSize = generateClampCSS("1rem", "1rem");
    chapterIndex.classList.add('item-index');
    chapterIndex.innerHTML = (this.customTocIndex && Object.keys(this.customTocIndex)?.length > 0 ? String(this.customTocIndex?.[chapter.activityId] || '')?.trim() : chapterId + 1) || '';
    // Conditional UI for custom indexing
    if (this.hasCustomIndex) {
      // let maxCharLength = getMaxValueCharLength(this.customTocIndex);
      let maxCharLength = this.calculateDynamicIndexWidth();
      // chapterIndex.style.justifyContent = 'flex-end';
      chapterIndex.style.display = 'flex';
      // chapterIndex.style.textAlign = 'right';
      // chapterIndex.style.maxWidth = `${maxCharLength}ch`;
      // chapterIndex.style.width = `${maxCharLength <= 4 ? (maxCharLength - 2) : maxCharLength}ch`;
      chapterIndex.style.width = maxCharLength;
      chapterIndex.style.whiteSpace = 'nowrap';
      
      // Apply dynamic margin for alignment when not mobile
      // if (maxCharLength) {
      // const dynamicMargin = this.calculateDynamicMargin();
      // chapterIndex.style.marginLeft = dynamicMargin;
      // }
      // chapterIndex.style.marginLeft = '0.4rem';
      // If collapsed, still show both icon and index (default behavior)
      // No need to hide either element
    } 
    else {
      chapterIndex.style.width = '2ch';
      chapterIndex.style.textAlign = 'center';
      chapterIndex.style.fontSize = generateClampCSS("1rem", "1rem");
      // chapterIndex.style.marginLeft = '0';
      // chapterNodeTitle.style.paddingLeft = generateClampCSS("0.75rem", "0.75rem");
    }

    // chapterIcon.parentNode.insertBefore(chapterIndex, chapterIcon);
    numberAndIconWrapper.appendChild(chapterIndex);
    numberAndIconWrapper.appendChild(chapterIcon);
    chapterNodeTitle.appendChild(numberAndIconWrapper);
    chapterNodeTitle.appendChild(chapterTitleText);
    chapterNode.appendChild(chapterNodeTitle);

    if (this.themeData?.tableOfContent?.tocItems) {
      const { backgroundColor, iconColor, hover, selected, fontColor, skillHeading, skillHDescription, indexNumber } = this.themeData.tableOfContent.tocItems;

      chapterNodeTitle.style.backgroundColor = backgroundColor;

      let itemTitleText = chapterTitleText.querySelector('.item-title');
      let itemDescriptionText = chapterTitleText.querySelector('.item-description');
      let itemToggleDescriptionIcon = chapterTitleText.querySelector('.toggle-description');
      
      let itemIcon = chapterNodeTitle.querySelector('.item-icon');
      let itemIndex = chapterNodeTitle.querySelector('.item-index');

      if (itemTitleText) {
        itemTitleText.style.color = fontColor;
        itemTitleText.style.fontFamily = skillHeading?.fontFamily || 'inherit';
        itemTitleText.style.fontWeight = skillHeading?.fontWeight || 'inherit';

        if (this.isMobileView) {
          itemTitleText.style.fontSize = generateClampCSS(skillHeading?.mobile?.fontSize, skillHeading?.mobile?.fontSize) || 'inherit';
        } 
        else {
          itemTitleText.style.fontSize = generateClampCSS(skillHeading?.fontSize, skillHeading?.fontSize) || 'inherit';
        }
      }
      if (itemDescriptionText) {
        itemDescriptionText.style.color = fontColor;
        itemDescriptionText.style.fontFamily = skillHDescription?.fontFamily || 'inherit';
        itemDescriptionText.style.fontWeight = skillHDescription?.fontWeight || 'inherit';

        if (this.isMobileView) {
          itemDescriptionText.style.fontSize = generateClampCSS(skillHDescription?.mobile?.fontSize, skillHDescription?.mobile?.fontSize) || 'inherit';
        } 
        else {
          itemDescriptionText.style.fontSize = generateClampCSS(skillHDescription?.fontSize, skillHDescription?.fontSize) || 'inherit';
        }
      }
      if (itemToggleDescriptionIcon) itemToggleDescriptionIcon.style.color = fontColor;
      if (itemIcon) itemIcon.style.color = iconColor;
      if (itemIndex) itemIndex.style.color = iconColor;
      if (indexNumber && itemIndex) {
        itemIndex.style.fontFamily = indexNumber?.fontFamily || 'inherit';
        itemIndex.style.fontWeight = indexNumber?.fontWeight || 'inherit';
        itemIndex.style.fontSize = generateClampCSS(indexNumber?.fontSize, indexNumber?.fontSize) || 'inherit';
        if (this.isMobileView) {
          itemIndex.style.fontSize = generateClampCSS(indexNumber?.mobile?.fontSize, indexNumber?.mobile?.fontSize) || 'inherit';
        }
      }

      chapterNodeTitle.addEventListener('mouseover', () => {
        if (!chapterNodeTitle.classList.contains('h5p-interactive-book-navigation-current')) {
          if (!this.isMobileView) {
            chapterNodeTitle.style.backgroundColor = hover.backgroundColor;
            if (itemTitleText) itemTitleText.style.color = hover.fontColor;
            if (itemDescriptionText) itemDescriptionText.style.color = hover.fontColor;
            if (itemIcon) itemIcon.style.color = hover.iconColor;
            if (itemIndex) itemIndex.style.color = hover.iconColor;
            // NEW: switch icon to hover state
            if (itemIcon && itemIcon.dataset) {
              itemIcon.innerHTML = itemIcon.dataset.iconHover || itemIcon.dataset.iconDefault || itemIcon.innerHTML;
            }
          }
        }
      });

      chapterNodeTitle.addEventListener('mouseout', () => {
        if (!chapterNodeTitle.classList.contains('h5p-interactive-book-navigation-current')) {
          chapterNodeTitle.style.backgroundColor = backgroundColor;
          if (itemTitleText) itemTitleText.style.color = fontColor;
          if (itemDescriptionText) itemDescriptionText.style.color = fontColor;
          if (itemIcon) itemIcon.style.color = iconColor;
          if (itemIndex) itemIndex.style.color = iconColor;
          // NEW: revert icon to default state
          if (itemIcon && itemIcon.dataset) {
            itemIcon.innerHTML = itemIcon.dataset.iconDefault || itemIcon.innerHTML;
          }
        }
      });

      chapterNodeTitle.addEventListener('click', (event) => {
        event.stopPropagation();
        if (
          event.target.classList.contains('toggle-description') ||
          event.target.closest('.toggle-description') ||
          event.target.classList.contains('toc-des-icon-toggle-wrapper') ||
          event.target.closest('.toc-des-icon-toggle-wrapper')
        ) {
          return;
        }
        // Trigger interacted event with lesson metadata
        this.parent.buildXAPIEventTrigger();
        // Remove previous selected chapter's background color
        const previousSelectedChapter = document.querySelector('.h5p-interactive-book-navigation-current');
        if (previousSelectedChapter && previousSelectedChapter !== chapterNodeTitle) {
          previousSelectedChapter.classList.remove('h5p-interactive-book-navigation-current');
          previousSelectedChapter.style.backgroundColor = backgroundColor;
          previousSelectedChapter.style.color = fontColor;
          // Reset numberAndIconWrapper and itemTitleElement and itemDescriptionElement color for previous item
          let previousItemIndex = previousSelectedChapter.querySelector('.item-index');
          let previousItemTitle = previousSelectedChapter.querySelector('.item-title');
          let previousItemDescription = previousSelectedChapter.querySelector('.item-description');
          let previousItemIcon = previousSelectedChapter.querySelector('.item-icon');
          let previousItemToggleDescriptionIcon = previousSelectedChapter.querySelector('.toggle-description');
          if (previousItemIndex) previousItemIndex.style.color = iconColor;
          if (previousItemTitle) previousItemTitle.style.color = fontColor;
          if (previousItemToggleDescriptionIcon) previousItemToggleDescriptionIcon.style.color = fontColor;
          if (previousItemDescription) previousItemDescription.style.color = fontColor;
          if (previousItemIcon) {
            previousItemIcon.style.color = iconColor;
            // NEW: reset previous icon to default
            previousItemIcon.innerHTML = previousItemIcon.dataset?.iconDefault || previousItemIcon.innerHTML;
          }
        }

        // Set the background color of the clicked chapter
        chapterNodeTitle.classList.add('h5p-interactive-book-navigation-current');
        chapterNodeTitle.style.backgroundColor = selected.backgroundColor;
        if (itemTitleText) itemTitleText.style.color = selected.fontColor;
        if (itemDescriptionText) itemDescriptionText.style.color = selected.fontColor;
        if (itemIcon) itemIcon.style.color = selected.iconColor;
        if (itemIndex) itemIndex.style.color = selected.iconColor;
        // NEW: switch icon to selected state
        if (itemIcon && itemIcon.dataset) {
          itemIcon.innerHTML = itemIcon.dataset.iconSelected || itemIcon.dataset.iconHover || itemIcon.dataset.iconDefault || itemIcon.innerHTML;
        }
      });
    } 
    else {
      let itemIcon = chapterNodeTitle.querySelector('.item-icon');

      chapterNodeTitle.addEventListener('mouseover', () => {
        if (!chapterNodeTitle.classList.contains('h5p-interactive-book-navigation-current')) {
          if (itemIcon && itemIcon.dataset) {
            itemIcon.innerHTML = itemIcon.dataset.iconHover || itemIcon.dataset.iconDefault || itemIcon.innerHTML;
          }
        }
      });

      chapterNodeTitle.addEventListener('mouseout', () => {
        if (!chapterNodeTitle.classList.contains('h5p-interactive-book-navigation-current')) {
          if (itemIcon && itemIcon.dataset) {
            itemIcon.innerHTML = itemIcon.dataset.iconDefault || itemIcon.innerHTML;
          }
        }
      });

      chapterNodeTitle.addEventListener('click', (event) => {
        event.stopPropagation();
        // Prevent selection logic if click was on dropdown arrow or its wrapper
        if (
          event.target.classList.contains('toggle-description') ||
          event.target.closest('.toggle-description') ||
          event.target.classList.contains('toc-des-icon-toggle-wrapper') ||
          event.target.closest('.toc-des-icon-toggle-wrapper')
        ) {
          return;
        }
        // Trigger interacted event with lesson metadata
        this.parent.buildXAPIEventTrigger();
        // Remove previous selected chapter's background color
        const previousSelectedChapter = document.querySelector('.h5p-interactive-book-navigation-current');
        if (previousSelectedChapter) {
          previousSelectedChapter.classList.remove('h5p-interactive-book-navigation-current');
          // Reset numberAndIconWrapper and itemTitleElement and itemDescriptionElement color for previous item
          let previousItemIcon = previousSelectedChapter.querySelector('.item-icon');
          if (previousItemIcon) {
            // NEW: reset previous icon to default
            previousItemIcon.innerHTML = previousItemIcon.dataset?.iconDefault || previousItemIcon.innerHTML;
          }
        }

        // Set the background color of the clicked chapter
        chapterNodeTitle.classList.add('h5p-interactive-book-navigation-current');
        // NEW: switch icon to selected state
        if (itemIcon && itemIcon.dataset) {
          itemIcon.innerHTML = itemIcon.dataset.iconSelected || itemIcon.dataset.iconHover || itemIcon.dataset.iconDefault || itemIcon.innerHTML;
        }
      });
    }

    // Collapse all but current chapters in menu and highlight current
    if (this.parent.activeChapter === chapterId) {
      chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button').classList.add('h5p-interactive-book-navigation-current');
      if (this.themeData?.tableOfContent?.tocItems) {
        const { selected } = this.themeData.tableOfContent.tocItems;
        let button = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
        let itemTitleText = chapterNode.querySelector('.item-title');
        let itemDescriptionText = chapterNode.querySelector('.item-description');
        let itemToggleDescriptionIcon = chapterNode.querySelector('.toggle-description');
        let itemIcon = chapterNode.querySelector('.item-icon');
        let itemIndex = chapterNode.querySelector('.item-index');

        if (button) button.style.backgroundColor = selected.backgroundColor;
        if (itemTitleText) itemTitleText.style.color = selected.fontColor;
        if (itemDescriptionText) itemDescriptionText.style.color = selected.fontColor;
        if (itemToggleDescriptionIcon) itemToggleDescriptionIcon.style.color = selected.fontColor;
        if (itemIcon) itemIcon.style.color = selected.iconColor;
        if (itemIndex) itemIndex.style.color = selected.iconColor;
      } 
      else {
        let itemIcon = chapterNodeTitle.querySelector('.item-icon');
        if (itemIcon && itemIcon.dataset) {
          itemIcon.innerHTML = itemIcon.dataset.iconSelected || itemIcon.dataset.iconDefault || itemIcon.innerHTML;
        }
      }
    }
    else {
      this.toggleChapter(chapterNode, true);
    }

    const sectionsWrapper = document.createElement('ul');
    sectionsWrapper.classList.add('h5p-interactive-book-navigation-sectionlist');
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
          const isText = sectionParams.library.split(' ')[0] === 'H5P.AdvancedText';

          if (isText) {
            const text = document.createElement('div');
            text.innerHTML = sectionParams.params.text;
            const headers = text.querySelectorAll('h2, h3');
            for (let j = 0; j < headers.length; j++) {
              const header = headers[j];
              const sectionNode = this.createSectionLink(chapterId, i, header.textContent, j);
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
      const arrowIconElement = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-accordion');
      if (arrowIconElement) {
        arrowIconElement.classList.add('hidden');
      }
    }

    chapterNode.appendChild(sectionsWrapper);

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

    const sectionTitleText = document.createElement('div');
    sectionTitleText.innerHTML = title || section.title;
    sectionTitleText.setAttribute('title', title || section.title);
    sectionTitleText.classList.add('h5p-interactive-book-navigation-section-title');

    const sectionCompletionIcon = document.createElement('div');
    sectionCompletionIcon.classList.add('h5p-interactive-book-navigation-section-icon');
    sectionCompletionIcon.classList.add('icon-chapter-blank');
    if (this.parent?.chapters[chapterId]?.sections[i]?.isTask) {
      sectionCompletionIcon.classList.add('h5p-interactive-book-navigation-section-task');
    }
    const sectionLink = document.createElement('button');
    sectionLink.classList.add('section-button');
    sectionLink.setAttribute('tabindex', '-1');
    sectionLink.onclick = (event) => {
      const newChapter = {
        h5pbookid: this.parent.contentId,
        chapter: this.chapters[chapterId].id,
        section: section.id,
      };
      if (headerNumber !== null) {
        newChapter.headerNumber = headerNumber;
      }

      this.parent.trigger('newChapter', newChapter);

      if (this.isOpenOnMobile()) {
        this.parent.trigger('toggleMenu');
      }

      event.preventDefault();
    };
    sectionLink.appendChild(sectionCompletionIcon);
    sectionLink.appendChild(sectionTitleText);

    const sectionNode = document.createElement('li');
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
    this.container.addEventListener('transitionend', (event) => {
      // propertyName is used trigger once, not for every property that has transitionend
      if (event.propertyName === 'flex-basis') {
        this.parent.trigger('resize');
      }
    });
  }
}
export default SideBar;
