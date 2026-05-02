/**
 * The introduction module
 * Constructor function.
 */

// import HomeIcon from './assets/homeIcon.svg';
// import readingIcon from './../assets/toc-icons/readingIcon.svg';


import { tocIcons, customTocIcons, teachingNotesIcon, teachingNotesIconMobileView, previousArrowIcon, nextArrowIcon, closeIcon, playIcon, pearsonLogoIcon, frontOfClassIcon, tocDescriptionDownArrow, tocDescriptionUpArrow, upIcon, pearsonLogoIconMobile } from "./icons";
import { sendPostMessage, createFOCButton, debounce } from "./utils";
import { tableOfContentsData, chaptersData, teachingNotesData } from "./developcontent";
import { addDynamicStylesOnNode, generateClampCSS, checkDevice, positionTooltip, decodeHtmlEntities } from "./utils";
import { getCoverTOCData } from "./utils/getTOCData";
import { GenerateExerciseDiv, getMaxValueCharLength } from "./utils/generalFunction";
import { hasAnyCustomIndex, applyContainerTheme, applyThemeStyles, createHoverEffectHandler, initializeCommonProps, isSvgUrl, cleanUrl } from "./utils/commonHelpers";
import { EventListenerManager } from "./utils/EventListenerManager";
class Cover extends H5P.EventDispatcher {
  constructor(params, titleText, startText, contentId, parent) {
    super();

    this.parent = parent;
    this.segment = parent.segment;
    this.params = params;
    this.contentId = contentId;
    this.startText = startText;
    this.titleText = titleText;
    this.showTableOfContents = this.parent.isSimpleView ? false : true;
    this.tocSelectedItem = null;
    this.coverContainerScrollDown = false;
    
    // Initialize common properties using helper
    const commonProps = initializeCommonProps(params, parent);
    this.customTocIndex = commonProps.customTocIndex;
    this.themeData = commonProps.themeData;
    this.isMobileView = commonProps.isMobileView;

    this.hasAnyCustomIndex = hasAnyCustomIndex(
      this.parent?.params?.tableOfContents || [],
      this.customTocIndex,
      true // include home
    );

    // Initialize event listener manager for cleanup
    this.eventManager = new EventListenerManager();

    // Initialize lazy loading observer
    this.initializeLazyLoadingObserver();

    // this.params.chapters = chaptersData
    
    // Container
    this.container = this.createContainer();
    // Visual header
    /* if (params.coverMedium) {
      this.visuals = this.createVisualsElement(params.coverMedium);
      if (this.visuals) {
        // this.container.appendChild(this.visuals);
      }
    }
    else {
      this.container.classList.add('h5p-cover-nographics');
    } */

    // Title
    this.container.appendChild(this.createCoverHeader());
    this.innerContainer = document.createElement('div');
    this.innerContainer.classList.add('h5p-interactive-book-cover-inner-container');
    this.container.appendChild(this.innerContainer);

    this.coverBanner = this.createcoverBanner();

    if (this.params?.coverMedium?.params?.file?.path) {
      const imgElement = document.createElement('img');
      imgElement.src = H5P.getPath(this.params.coverMedium.params.file.path, this.contentId);
      imgElement.classList.add('h5p-interactive-book-cover-background-image');
      imgElement.id = 'h5p-interactive-book-cover-background-image';
      setTimeout(() => {
        imgElement.classList.add('zoomout');
      }, 1000);
      this.innerContainer.appendChild(imgElement);
    }

    this.innerContainer.appendChild(this.coverBanner);

    if (this.showTableOfContents) {
      this.toc = this.createTableOfContent();
      this.innerContainer.appendChild(this.toc);

      // Add back to top button
      this.innerContainer.appendChild(this.backToTop());

      // Handle long TOC description after all DIV are mounted in DOM.
      this.handleLongTocDescription();
      
      // Add scroll optimization for better positioning
      this.optimizeScrollBehavior();
    }
    
    // Initialize scroll behavior
    this.initializeScrollBehavior();
  }

  initializeScrollBehavior() {
    // Ensure main container can always scroll
    const bookCover = document.querySelector('.h5p-interactive-book-cover');
    if (bookCover) {
      bookCover.style.overflow = "auto";
      
      // Create debounced scroll handler for banner visibility
      this.debouncedScrollHandler = debounce(() => {
        const coverBanner = document.querySelector('.h5p-interactive-book-cover-banner');
        const isBannerHidden = coverBanner?.classList.contains('hidden');
        
        if (bookCover.scrollTop > 100 && !isBannerHidden) {
          this.hideCoverBanner();
        } else if (bookCover.scrollTop === 0 && isBannerHidden) {
          this.showCoverBanner('container');
        }
        
        // Always ensure overflow is auto for continuous scrolling
        if (bookCover.style.overflow !== "auto") {
          bookCover.style.overflow = "auto";
        }
      }, 150);
      
      // Add debounced scroll event listener using event manager
      this.eventManager.add(bookCover, 'scroll', this.debouncedScrollHandler, { passive: true });
    }
  }

  isTruncated(el) {
    return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
  }

  handleLongTocDescription() {
    // Now loop and add tooltips for truncated descriptions
    requestAnimationFrame(() => {
      const descriptions = this.innerContainer.querySelectorAll('.item');
      descriptions.forEach(desc => {
        const itemDescriptionElement = desc.querySelector('.item-description');
        const itemWrapper = desc.querySelector('.item-wrapper');
        const textPlaceHolderElement = desc.querySelector('.text-placeholder');
        let tooltip = null;
        const isMobile = this.isMobileView || window.innerWidth <= 768;
        const isTrunc = this.isTruncated(itemDescriptionElement);
        if (isTrunc) {
          if (isMobile) {
            // Create separate toggle wrapper as third child of item-wrapper
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
              expanded = !expanded;
              if (expanded) {
                itemDescriptionElement.classList.add('expanded');
                toggleButton.innerHTML = tocDescriptionUpArrow;
                toggleButton.setAttribute('aria-label', 'Collapse description');
              } 
              else {
                itemDescriptionElement.classList.remove('expanded');
                toggleButton.innerHTML = tocDescriptionDownArrow;
                toggleButton.setAttribute('aria-label', 'Expand description');
              }
            });
            toggleWrapper.appendChild(toggleButton);
            textPlaceHolderElement.appendChild(itemDescriptionElement);
            itemWrapper.appendChild(textPlaceHolderElement);
            itemWrapper.appendChild(toggleWrapper);
          } 
          else {
            const showTooltip = () => {
              if (tooltip) return;
              // if (tooltip || !detectTruncation()) return;
              tooltip = document.createElement('span');
              tooltip.classList.add('toc-description-tooltip');
              tooltip.textContent = decodeHtmlEntities(itemDescriptionElement.innerHTML);
              document.body.appendChild(tooltip);
              const rect = itemDescriptionElement.getBoundingClientRect();
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
            itemDescriptionElement.addEventListener('mouseenter', showTooltip);
            itemDescriptionElement.addEventListener('mouseleave', hideTooltip);
            // Keyboard accessibility
            itemDescriptionElement.setAttribute('tabindex', '0');
            itemDescriptionElement.addEventListener('focus', showTooltip);
            itemDescriptionElement.addEventListener('blur', hideTooltip);
            // Touch (desktop devices with touch or tablets in desktop width)
            itemDescriptionElement.addEventListener('touchstart', (e) => {
              if (tooltip) {
                hideTooltip();
              } 
              else {
                showTooltip();
              }
              e.stopPropagation();
            });
            document.addEventListener('touchstart', (e) => {
              if (tooltip && !itemDescriptionElement.contains(e.target)) hideTooltip();
            }, { passive: true });
            window.addEventListener('resize', hideTooltip);
          }
        }
      });
    });
  }

  /**
   * Create the top level element.
   *
   * @return {HTMLElement} Cover.
   */
  createContainer() {
    const container = document.createElement('div');
    container.classList.add('h5p-interactive-book-cover');

    // Determine landing page height
    const { browserHeight, height } = checkDevice();
    const landingpageHeight = height;
    if (landingpageHeight) {
      container.style.minHeight = `${landingpageHeight}px`;
    }

    // Apply theme styles using helper
    applyContainerTheme(container, this.themeData);

    return container;
  }

  removeContainer() {
    if (this.container && this.container.parentNode) {
      // this.container.parentNode.removeChild(this.container);
      this.container.classList.add('cover-hidden');
      this.hidden = true;
    }
    
    // Clean up scroll observer
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }
    
    // Clean up lazy loading observer
    if (this.lazyObserver) {
      this.lazyObserver.disconnect();
      this.lazyObserver = null;
    }
    
    // Clean up all event listeners
    if (this.eventManager) {
      this.eventManager.removeAll();
    }
    
    // Clean up debounced scroll handler
    if (this.debouncedScrollHandler) {
      this.debouncedScrollHandler = null;
    }
  }


  createCoverHeader() {
    const coverHeader = document.createElement('div');
    coverHeader.id = 'h5p-interactive-book-cover-header';
    if (this.themeData?.header) {
      coverHeader.style.backgroundColor = this.themeData.header.backgroundColor;
      coverHeader.style.backgroundImage = this.themeData.header.backgroundImage ? `url(${H5P.getPath(this.themeData.header.backgroundImage)})` : 'none';
    }
    coverHeader.classList.add('h5p-interactive-book-cover-header');
    // if (this.isMobileView) {
    //   coverHeader.style.height = generateClampCSS("2.563rem", "2.563rem");
    // } else {
    //   coverHeader.style.height = generateClampCSS("4rem", "4rem");
    // }
    const coverHeaderLeftContent = document.createElement('div');
    coverHeaderLeftContent.classList.add('h5p-interactive-book-cover-header-left-content');
    const displayPearsonLogo = this.themeData?.header?.displayPearsonLogo ? this.themeData?.header?.displayPearsonLogo : true;
    if (displayPearsonLogo) {
      const pearsonLogo = document.createElement('div');
      pearsonLogo.classList.add('h5p-interactive-book-cover-logo');
      pearsonLogo.innerHTML = this.isMobileView ? pearsonLogoIconMobile : pearsonLogoIcon;
      // if (this.isMobileView) {
      //   pearsonLogo.style.width = generateClampCSS("3.795rem", "3.795rem");
      //   pearsonLogo.style.height = generateClampCSS("4rem", "4rem");
      // } else {
      //   pearsonLogo.style.width = generateClampCSS("2.438rem", "2.438rem");
      //   pearsonLogo.style.height = generateClampCSS("2.563rem", "2.563rem");
      // }
      coverHeaderLeftContent.appendChild(pearsonLogo);
    }
    const coverTitleLogo = document.createElement('div');
    coverTitleLogo.classList.add('h5p-interactive-book-cover-title-logo');
    const coverLogoURL = this.themeData?.header?.themeLogo?.logoURL || this.themeData?.header?.levelLogo;
    // const coverLogoWidth = this.isMobileView ? this.themeData?.header?.themeLogo?.mobile?.logoWidth : this.themeData?.header?.themeLogo?.logoWidth;
    const coverLogoWidth = this.themeData?.header?.themeLogo?.logoWidth;
    if (coverLogoURL) {
      coverTitleLogo.style.backgroundImage = `url(${H5P.getPath(coverLogoURL)})`;
      if (coverLogoWidth && !checkDevice().mobile) {
        coverTitleLogo.style.width = coverLogoWidth;
      }
    }

    coverHeaderLeftContent.appendChild(coverTitleLogo);
    coverHeader.appendChild(coverHeaderLeftContent);
    const headerCoverTitle = document.createElement('div');
    headerCoverTitle.classList.add('h5p-interactive-book-header-cover-title', "hidden");
    

    function removeHtmlTags(str) {
      return str.replace(/<\/?[^>]+(>|$)/g, "");
    }

    const title = this.params.courseTitle || "Title";
    const subtitle = this.params.coverDescription || "Subtitle";
    const tagline = this.params.coverTagline;

    const titleElement = document.createElement('span');
    titleElement.textContent = title;

    const separatorElement = document.createElement('span');
    separatorElement.classList.add('separator');
    // separatorElement.textContent = ' | ';
    separatorElement.style.alignSelf = 'stretch';
    separatorElement.style.borderLeft = '3px solid currentColor';
    
    if (this.themeData?.header?.separatorMargin) {
      separatorElement.style.margin = this.themeData.header.separatorMargin;
    }

    const taglineElement = document.createElement('span');
    taglineElement.textContent = tagline;

    if (this.themeData?.header?.title) {
      addDynamicStylesOnNode(titleElement, this.themeData.header.title, this.isMobileView);
      if (this.themeData.header.title?.textTransform) {
        titleElement.style.textTransform = this.themeData.header.title.textTransform;
      }
    }

    if (this.themeData?.header?.tagline) {
      addDynamicStylesOnNode(taglineElement, this.themeData.header.tagline, this.isMobileView);
      addDynamicStylesOnNode(separatorElement, this.themeData.header.tagline, this.isMobileView);
      if (this.themeData.header.tagline?.textTransform) {
        taglineElement.style.textTransform = this.themeData.header.tagline.textTransform;
      }
    }

    headerCoverTitle.appendChild(titleElement);
    if (this.params.coverTagline) {
      headerCoverTitle.appendChild(separatorElement);
      headerCoverTitle.appendChild(taglineElement);
    }
    coverHeader.appendChild(headerCoverTitle);
    this.coverHeaderTitle = headerCoverTitle;
    this.coverHeader = coverHeader;
    return coverHeader;
  }

  closeTeachingNotesModal() {
    const modal = document.querySelector('.teaching-notes-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  hideCoverBanner() {
    // Select elements
    const banner = document.querySelector('.h5p-interactive-book-cover-banner');
    const bannerImage = document.querySelector('.h5p-interactive-book-cover-background-image');
    const backToTop = document.querySelector('.h5p-interactive-book-cover-back-to-top');
    const leftPanel = document.querySelector('.toc-left-panel');
    const bookCover = document.querySelector('.h5p-interactive-book-cover');

    // Toggle classes for visibility and styles
    banner?.classList.add('hidden'); // hide banner (Title, tagline, teaching notes icon, nagivation arrows)
    bannerImage?.classList.add('blur'); // hide background image
    if (this.toc) {
      this.toc.style.top = 'clamp(5rem, 6.9vw, 15rem)'; // adjust top position of toc
    }
    if (leftPanel) {
      leftPanel.style.top = 'clamp(5rem, 6.9vw, 15rem)';
      leftPanel.style.position = 'sticky';
    }

    this.coverHeaderTitle?.classList.remove('hidden'); // display title in header
    backToTop?.classList.remove('hidden'); // display back to top button

    // Ensure scrolling is enabled after banner is hidden
    if (bookCover) {
      bookCover.style.overflow = "auto";
      
      // Prevent excessive upward scrolling for the last item
      setTimeout(() => {
        const rightPanel = document.querySelector('.toc-right-panel');
        if (rightPanel && this.toc) {
          const rightPanelRect = rightPanel.getBoundingClientRect();
          const containerRect = bookCover.getBoundingClientRect();
          
          // If right panel is scrolled too far up, adjust
          if (rightPanelRect.bottom < containerRect.bottom - 100) {
            bookCover.scrollBy({
              top: -50,
              behavior: 'smooth'
            });
          }
        }
      }, 200);
    }

    // Handle active item cleanup
    const previousSelectedItem = document.querySelector('.item-list-header.active');
    if (previousSelectedItem) {
      previousSelectedItem.classList.remove('active');
    }
  }

  optimizeScrollBehavior() {
    // Optimize scroll behavior for better positioning, especially on local environments
    const bookCover = document.querySelector('.h5p-interactive-book-cover');
    if (bookCover && this.showTableOfContents) {
      // Add intersection observer to monitor TOC items
      const options = {
        root: bookCover,
        rootMargin: '-10% 0px -10% 0px',
        threshold: 0.1
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Ensure proper scroll behavior when items come into view
            bookCover.style.overflow = 'auto';
          }
        });
      }, options);

      // Observe all thumbnail containers
      setTimeout(() => {
        const thumbnails = document.querySelectorAll('.thumbnail-overlay-container');
        thumbnails.forEach(thumbnail => {
          observer.observe(thumbnail);
        });
      }, 100);

      // Store observer for cleanup
      this.scrollObserver = observer;
    }
  }

  // Helper to check if the banner is visible
  isBannerElementInViewport(el) {
    const rect = document.querySelector('.h5p-interactive-book-cover-banner').getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  showCoverBanner(type = 'toc') {
    // Select elements
    const banner = document.querySelector('.h5p-interactive-book-cover-banner');
    const bannerImage = document.querySelector('.h5p-interactive-book-cover-background-image');
    const backToTop = document.querySelector('.h5p-interactive-book-cover-back-to-top');
    const leftPanel = document.querySelector('.toc-left-panel');
    const rightPanel = document.querySelector('.toc-right-panel');
    const bookCover = document.querySelector('.h5p-interactive-book-cover');
    
    if (rightPanel) {
      rightPanel.style.marginTop = '0px';
    }
    
    // Toggle classes for visibility and styles
    banner?.classList.remove('hidden'); // show banner (Title, tagline, teaching notes icon, nagivation arrows)
    if (type === 'toc') {
      banner?.scrollIntoView({ behavior: 'smooth' });
    } 
    else if (type === 'container') {
      banner?.scrollIntoView({ behavior: 'instant' });
    }
    bannerImage?.classList.remove('blur'); // show background image
    if (this.toc) {
      this.toc.style.top = '0px'; 
    }    
    this.coverHeaderTitle?.classList.add('hidden'); // hide title in header
    backToTop?.classList.add('hidden'); // hide back to top button

    // Ensure scrolling is enabled when banner is shown
    if (bookCover) {
      bookCover.style.overflow = "auto";
    }

    // Handle active item cleanup
    const previousSelectedItems = document.querySelectorAll('.item.active, .item-list-header.active');

    if (previousSelectedItems.length > 0) {
      previousSelectedItems.forEach((previousSelectedItem) => {
        // Remove previous selected TOC item's background color
        if (this.themeData?.tableOfContent?.tocItems) {
          const { backgroundColor, iconColor, fontColor } = this.themeData.tableOfContent.tocItems;

          previousSelectedItem.classList.remove('active');
          previousSelectedItem.style.backgroundColor = backgroundColor;
          previousSelectedItem.style.color = fontColor;
          // Reset numberAndIconWrapper and itemTitleElement and itemDescriptionElement color for previous item
          const prevNumberAndIconWrapper = previousSelectedItem.querySelector('.number-and-icon-wrapper');
          const prevItemTitleElement = previousSelectedItem.querySelector('.item-title');
          const prevItemDescriptionElement = previousSelectedItem.querySelector('.item-description');
          if (prevNumberAndIconWrapper) prevNumberAndIconWrapper.style.color = iconColor;
          if (prevItemTitleElement) prevItemTitleElement.style.color = fontColor;
          if (prevItemDescriptionElement) prevItemDescriptionElement.style.color = fontColor;
        } 
        else {
          previousSelectedItem.classList.remove('active');
        }
        
        // Reset previous item's icon to default
        const prevIcon = previousSelectedItem.querySelector('.icon-placeholder');
        if (prevIcon) {
          prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
        }
      });
    }
  }

  addWheelEventListenerToAnElement(element, type) {
    // Create wheel event handler
    const wheelHandler = (event) => {
      event.stopPropagation();
      const bookCover = document.querySelector('.h5p-interactive-book-cover');
      const coverBanner = document.querySelector('.h5p-interactive-book-cover-banner');
      const isBannerHidden = coverBanner?.classList.contains('hidden');
      
      if (type === 'container') {
        if (event.deltaY > 0) {
          if (!isBannerHidden) {
            event.preventDefault();
            this.hideCoverBanner();
            // Ensure scrolling is enabled after hiding banner
            setTimeout(() => {
              if (bookCover) bookCover.style.overflow = "auto";
            }, 100);
          }
        } 
        else if (event.deltaY < 0) {
          this.showCoverBanner(type);
          if (bookCover) bookCover.style.overflow = "auto";
        }
      } 
      else if (type === 'coverBanner') {
        if (event.deltaY > 0) {
          event.preventDefault();
          this.hideCoverBanner();
          // Enable scrolling after banner is hidden
          setTimeout(() => {
            if (bookCover) bookCover.style.overflow = "auto";
          }, 100);
        }
      } 
      else if (type === 'toc') {
        if (event.deltaY < 0) {
          this.showCoverBanner();
          if (bookCover) bookCover.style.overflow = "auto";
        } 
        else if (event.deltaY > 0) {
          // hide the cover banner when scrolling from the right toc panel and cover banner is visible
          if (!isBannerHidden) {
            this.hideCoverBanner();
            setTimeout(() => {
              if (bookCover) bookCover.style.overflow = "auto";
            }, 100);
          }
        }
        if (this.isBannerElementInViewport() && event.deltaY > 0) {
          this.hideCoverBanner();
          setTimeout(() => {
            if (bookCover) bookCover.style.overflow = "auto";
          }, 100);
        }
      } 
      else if (type === 'leftPanel-toc') {
        if (event.deltaY > 0 && !isBannerHidden) {
          event.preventDefault();
          this.hideCoverBanner();
          setTimeout(() => {
            if (bookCover) bookCover.style.overflow = "auto";
          }, 100);
        } 
        else {
          // Ensure scrolling is always enabled for left panel
          if (bookCover) bookCover.style.overflow = "auto";
        }
      }
    };
    
    // Add wheel event listener using event manager
    this.eventManager.add(element, 'wheel', wheelHandler, { passive: false });
    
    // Add mouseover handler for rightPanel-toc
    if (type === 'rightPanel-toc') {
      const mouseoverHandler = () => {
        const coverBanner = document.querySelector('.h5p-interactive-book-cover-banner').classList.contains('hidden');
        const bookCover = document.querySelector('.h5p-interactive-book-cover');
        // Always enable scrolling when hovering over right panel
        if (bookCover) bookCover.style.overflow = "auto";
      };
      
      this.eventManager.add(element, 'mouseover', mouseoverHandler, { passive: true });
    }
  }

  createcoverBanner() {
    const coverBanner = document.createElement('div');
    coverBanner.classList.add('h5p-interactive-book-cover-banner');
    /*  if (this.params?.coverMedium?.params?.file?.path) {
       coverBanner.style.backgroundImage = `url(${H5P.getPath(this.params.coverMedium.params.file.path, this.contentId)})`;
     } else {
       coverBanner.style.backgroundColor = '#ffffff';
     } */
    function removeHtmlTags(str) {
      return str.replace(/<\/?[^>]+(>|$)/g, "");
    }

    /* if (this.params?.coverMedium?.params?.file?.path) {
      const imgElement = document.createElement('img');
      imgElement.src = H5P.getPath(this.params.coverMedium.params.file.path, this.contentId);
      imgElement.classList.add('h5p-interactive-book-cover-background-image');
      imgElement.id = 'h5p-interactive-book-cover-background-image';
      setTimeout(() => {
        imgElement.classList.add('zoomout');
      }, 1000);
      coverBanner.appendChild(imgElement);
    } */

    const title = this.params.courseTitle || "Title 4";
    const subTitle = this.params.coverDescription || "Subtitle";
    coverBanner.appendChild(this.createTitleContainer(title));

    const teachingNotesIconElement = document.createElement('div');

    teachingNotesIconElement.addEventListener('click', () => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.classList.add('teaching-notes-modal');

      
      // Create content container
      const content = document.createElement('div');
      content.classList.add('modal-content');
      if (this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal) {
        modal.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal?.backgroundColor;
        modal.style.borderColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal?.fontcolor;
        content.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.teacherNotesModal?.fontcolor;
      }

      // Create closing button
      const closeButton = document.createElement('span');
      closeButton.classList.add('teaching-notes-modal-close');
      closeButton.innerHTML = closeIcon;

      if (this.themeData?.landingPageIcons?.teacherNotesIcon) {
        closeButton.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.closeIcon?.iconColor;
        closeButton.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.closeIcon?.backgroundColor;
      }


      // Append closing button to content container
      content.appendChild(closeButton);

      // Create content body
      const contentBody = document.createElement('div');
      contentBody.classList.add('modal-body');
      contentBody.innerHTML = this.parent.params?.teachingNotes?.content || 'No teaching notes available';

      // Append content body to content container
      content.appendChild(contentBody);

      // Append content container to modal dialog
      modal.appendChild(content);

      if (!document.querySelector('.teaching-notes-modal')) {
        // Append modal dialog to the document body
        document.body.appendChild(modal);
      } 
      else {
        document.querySelector('.teaching-notes-modal').style.display = 'block';
      }

      // Add event listener to close the modal dialog when the closing button is clicked
      closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    });
    teachingNotesIconElement.classList.add('teaching-notes-icon');

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

    // if(this.isMobileView) {
    //   teachingNotesIconElement.innerHTML = teachingNotesIconMobileView;
    // } else {
    teachingNotesIconElement.innerHTML = teachingNotesIcon;
    // }
    if ((H5PIntegration?.role !== 'student') && (this.parent.params?.teachingNotes?.content)) {
      coverBanner.appendChild(teachingNotesIconElement);
    }

    // Check if screen is large enough for FOC (≥1024px) - separate from isMobileView which uses 768px
    const isLargeScreen = (window?.innerWidth || window?.outerWidth || 1024) > 1024;
    if (this.parent.params?.isClassroomPreviewEnabled && isLargeScreen) {
      /*
      // Create parent container for FOC tooltip with positioning context
      const focTooltipPrtContainer = document.createElement('div');
      focTooltipPrtContainer.classList.add("foc-tooltip-container");

      // Create inner container to group icon and tooltip
      const container = document.createElement('div');
      container.classList.add("tooltip-container");

      focTooltipPrtContainer.appendChild(container);

      // Create FOC icon element and set its content
      const focIConElement = document.createElement('div');
      focIConElement.classList.add('front-of-class-icon');
      focIConElement.innerHTML = frontOfClassIcon; // SVG icon from icons.js

      if (this.themeData?.landingPageIcons?.teacherNotesIcon) {
        focIConElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
        focIConElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
        focIConElement.addEventListener('mouseenter', () => {
          focIConElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.hover?.iconColor;
          focIConElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.hover?.backgroundColor;
        });

        focIConElement.addEventListener('mouseleave', () => {
          focIConElement.style.color = this.themeData?.landingPageIcons?.teacherNotesIcon?.iconColor;
          focIConElement.style.backgroundColor = this.themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor;
        });
      }

      // Create tooltip element with text
      let tooltipElement = document.createElement("div");
      tooltipElement.classList.add("tooltip-popup");
      tooltipElement.innerText = "Front of Class mode";

      // Assemble the component hierarchy
      container.appendChild(focIConElement);
      container.appendChild(tooltipElement);
      coverBanner.appendChild(focTooltipPrtContainer);

      // Show tooltip on hover using the utility function from utils.js
      focTooltipPrtContainer.addEventListener("mouseenter", () => {
        tooltipElement = positionTooltip('top', tooltipElement);
      });

      // Handle click event to activate Front of Class mode
      focIConElement.addEventListener('click', () => {
        this.parent.trigger("showFrontOfClass", { visibility: true });
      });
      */

      // Use the common FOC button creation function
      // Hidden on mobile/tablet view (screen width <= 768px)
      createFOCButton({
        themeData: this.themeData,
        onClickHandler: () => {
          this.parent.trigger("showFrontOfClass", { visibility: true });
        },
        parentElement: coverBanner,
        frontOfClassIcon: frontOfClassIcon,
        isSimpleView: this.parent.isSimpleView,
      });
    }


    // Navigation Arrows
    const crossLessonWrapper = document.createElement('div');
    crossLessonWrapper.classList.add('cross-lesson-wrapper-container');
    
    // Navigation Arrow - Create the left lesson element
    const leftLesson = document.createElement('div');
    leftLesson.className = 'cross_Lesson_pages_viewer_left scroll_down';
    leftLesson.id = 'Cross_Lesson1';
    leftLesson.innerHTML = previousArrowIcon;

    if (this.themeData?.banner?.navigationArrow) {
      const { backgroundColor, fontColor, fontSize } = this.themeData.banner.navigationArrow;
      leftLesson.style.backgroundColor = backgroundColor;
      leftLesson.style.color = fontColor;
      leftLesson.style.fontSize = generateClampCSS(fontSize, fontSize);
      leftLesson.addEventListener('mouseover', () => {
        const { backgroundColor, fontColor } = this.themeData.banner.navigationArrow.hoverState;
        leftLesson.style.backgroundColor = backgroundColor;
        leftLesson.style.color = fontColor;
      });
      leftLesson.addEventListener('mouseout', () => {
        leftLesson.style.backgroundColor = backgroundColor;
        leftLesson.style.color = fontColor;
      });
    }

    // Create the inner wrapper for left lesson
    const leftInnerWrapper = document.createElement('div');
    leftInnerWrapper.className = 'cross-lesson-wrapper';

    // Create the text container for left lesson
    const leftText = document.createElement('div');
    leftText.className = 'cross-lesson-text';

    // Append elements
    leftInnerWrapper.appendChild(leftText);
    leftLesson.appendChild(leftInnerWrapper);

    // Navigation Arrow - Create the right lesson element
    const rightLesson = document.createElement('div');
    rightLesson.className = 'cross_Lesson_pages_viewer_right scroll_down';
    rightLesson.id = 'Cross_Lesson2';
    rightLesson.innerHTML = nextArrowIcon;

    if (this.themeData?.banner?.navigationArrow) {
      const { backgroundColor, fontColor, fontSize } = this.themeData.banner.navigationArrow;
      rightLesson.style.backgroundColor = backgroundColor;
      rightLesson.style.color = fontColor;
      rightLesson.style.fontSize = generateClampCSS(fontSize, fontSize);
      rightLesson.addEventListener('mouseover', () => {
        const { backgroundColor, fontColor } = this.themeData.banner.navigationArrow.hoverState;
        rightLesson.style.backgroundColor = backgroundColor;
        rightLesson.style.color = fontColor;
      });
      rightLesson.addEventListener('mouseout', () => {
        rightLesson.style.backgroundColor = backgroundColor;
        rightLesson.style.color = fontColor;
      });
    }

    // Create the inner wrapper for right lesson
    const rightInnerWrapper = document.createElement('div');
    rightInnerWrapper.className = 'cross-lesson-wrapper';

    // Create the text container for right lesson
    const rightText = document.createElement('div');
    rightText.className = 'cross-lesson-text';

    // Append elements
    rightInnerWrapper.appendChild(rightText);
    rightLesson.appendChild(rightInnerWrapper);

    // Append both lessons to the crossLessonWrapper
    // crossLessonWrapper.appendChild(leftLesson);
    // crossLessonWrapper.appendChild(rightLesson);
    // Uncomment the above 2 lines for nav Home page Slider arrows

    coverBanner.appendChild(crossLessonWrapper);
    if (this.showTableOfContents) {
      this.addWheelEventListenerToAnElement(coverBanner, 'coverBanner');
      this.addWheelEventListenerToAnElement(this.innerContainer, 'container');
    }
    return coverBanner;
  }

  createTableOfContent() {
    const toc = document.createElement('div');
    toc.classList.add('h5p-interactive-book-cover-toc');
    const rightPanel = this.createRightPanel();
    rightPanel.style.width = '72.5%';
    this.leftPanel = this.createLeftPanel();
    this.leftPanel.style.width = '27.5%';
    toc.appendChild(this.leftPanel);
    toc.appendChild(rightPanel);
    toc.style.display = 'flex';
    return toc;
  }

  createLeftPanel() {
    const leftPanel = document.createElement('div');
    leftPanel.classList.add('toc-left-panel');
    this.addWheelEventListenerToAnElement(leftPanel, 'leftPanel-toc');
    leftPanel.style.overflowY = 'auto'; // it prevents scrolling
    const itemList = this.createItemList();
    leftPanel.appendChild(itemList);
    if (this.themeData?.tableOfContent) {
      const { backgroundColor, borderRadius, borderColor, fontFamily } = this.themeData.tableOfContent;
      leftPanel.style.backgroundColor = backgroundColor;
      leftPanel.style.borderRadius = borderRadius;
      leftPanel.style.borderColor = borderColor;
      if (fontFamily) {
        leftPanel.style.fontFamily = fontFamily;
      }
    }

    if (this.themeData?.tableOfContent?.tocItems) {
      const {backgroundColor, fontColor } = this.themeData.tableOfContent.tocItems;
      if (backgroundColor) {
        leftPanel.style.backgroundColor = backgroundColor;
      }
    }

    return leftPanel;
  }

  createItemList() {
    const itemList = document.createElement('div');
    itemList.classList.add('item-list');
    itemList.appendChild(this.createItemListHeader());

    this.parent.params.tableOfContents.forEach((item, index) => {
      const listItem = this.createListItem(item, index);
      itemList.appendChild(listItem);
    });
    return itemList;
  }

  resetActiveItem() {
    const activeItem = document.querySelectorAll('.item.active, .item-list-header.active');
    if (activeItem) {
      activeItem.forEach((item) => {
        item.classList.remove('active');
      });
    }
  }

  createItemListHeader() {
    const itemListHeader = document.createElement('div');
    itemListHeader.tabIndex = 0;
    itemListHeader.classList.add('item-list-header');
    itemListHeader.style.gap = generateClampCSS("1.25rem", "1.25rem");
    // if (this.isMobileView) {
    itemListHeader.style.paddingBlock = generateClampCSS("0.375rem", "0.375rem");
    // }
    itemListHeader.style.minHeight = generateClampCSS("4rem", "4rem");
    itemListHeader.style.paddingInline = generateClampCSS("0.75rem", "0.75rem");

    const numberAndIconWrapper = document.createElement('div');
    numberAndIconWrapper.classList.add('number-and-icon-wrapper');
    
    const indexPlaceHolderElement = document.createElement('span');
    indexPlaceHolderElement.classList.add('index-placeholder');
    indexPlaceHolderElement.textContent = (this.customTocIndex && Object.keys('home')?.length > 0 ? String(this.customTocIndex?.['home'] || '')?.trim() || '' : '') || '';
    // Conditional styling for custom index
    // indexPlaceHolderElement.style.fontSize = generateClampCSS("1rem", "1rem");
    if (this.hasAnyCustomIndex) {
      // Right align index and set max width for 7 characters
      let maxCharLength  = getMaxValueCharLength(this.customTocIndex);
      indexPlaceHolderElement.style.justifyContent = 'flex-end';
      indexPlaceHolderElement.style.textAlign = 'left';
      indexPlaceHolderElement.style.maxWidth = `${maxCharLength}ch`;
      indexPlaceHolderElement.style.width = `${maxCharLength}ch`;
      numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    } 
    else {
      indexPlaceHolderElement.style.width = '2ch';
      indexPlaceHolderElement.style.fontSize = generateClampCSS("1rem", "1rem");
      numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    }
    const size = generateClampCSS("1.5rem", "1.5rem");
    numberAndIconWrapper.appendChild(indexPlaceHolderElement);
    const iconPlaceHolderElement = document.createElement('span');
    iconPlaceHolderElement.style.width = size;
    iconPlaceHolderElement.style.height = size;
    iconPlaceHolderElement.style.alignItems = 'center';
    iconPlaceHolderElement.style.justifyContent = 'center';
    iconPlaceHolderElement.classList.add('icon-placeholder');
    iconPlaceHolderElement.classList.add(`home-icon`);

    // Use TOC data with icon states for Home icon
    const homeTocData = getCoverTOCData('home', this.parent?.params?.skillData, this.themeData);
    let homeDefault = '', homeHover = '', homeSelected = '';
    if (homeTocData && homeTocData.icon) {
      if (typeof homeTocData.icon === 'object') {
        const def = homeTocData.icon.default;
        const hov = homeTocData.icon.hoverState || def;
        const sel = homeTocData.icon.selectedState || def;
        homeDefault = isSvgUrl(def) ? `<img src="${cleanUrl(def)}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : def;
        homeHover = isSvgUrl(hov) ? `<img src="${cleanUrl(hov)}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : hov;
        homeSelected = isSvgUrl(sel) ? `<img src="${cleanUrl(sel)}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : sel;
      } 
      else if (typeof homeTocData.icon === 'string') {
        homeDefault = isSvgUrl(homeTocData.icon)
          ? `<img src="${cleanUrl(homeTocData.icon)}" alt="Home Icon" style="width: ${size}; height: ${size}; pointer-events: none;">`
          : homeTocData.icon;
        homeHover = homeDefault;
        homeSelected = homeDefault;
      }
    }
    iconPlaceHolderElement.dataset.iconDefault = homeDefault;
    iconPlaceHolderElement.dataset.iconHover = homeHover || homeDefault;
    iconPlaceHolderElement.dataset.iconSelected = homeSelected || homeDefault;
    iconPlaceHolderElement.innerHTML = iconPlaceHolderElement.dataset.iconDefault;
    numberAndIconWrapper.appendChild(iconPlaceHolderElement);
    
    itemListHeader.appendChild(numberAndIconWrapper);

    const headerTitle = document.createElement('div');
    headerTitle.classList.add('item-title');
    headerTitle.textContent = 'Home';
    headerTitle.setAttribute('aria-label', 'Home');
    itemListHeader.appendChild(headerTitle);

    // itemListHeader.addEventListener('click', () => {
    /* this.coverBanner.style.display = 'flex';
      if (document.querySelector('.h5p-interactive-book-cover-background-image')) {
        document.querySelector('.h5p-interactive-book-cover-background-image').style.display = 'block';
      } */
    // this.showCoverBanner();
    // });

    if (this.themeData?.tableOfContent?.tocItems) {
      const { backgroundColor, iconColor, hover, selected, fontColor, skillHeading, indexNumber} = this.themeData.tableOfContent.tocItems;
      itemListHeader.style.backgroundColor = backgroundColor;
      numberAndIconWrapper.style.color = iconColor;
      let indexPlaceholder = itemListHeader.querySelector('.index-placeholder');
      headerTitle.style.color = fontColor;
      headerTitle.style.fontFamily = skillHeading?.fontFamily || 'inherit';
      headerTitle.style.fontWeight = skillHeading?.fontWeight || 'inherit';
      if (this.isMobileView) {
        headerTitle.style.fontSize = generateClampCSS(skillHeading?.mobile?.fontSize, skillHeading?.mobile?.fontSize) || 'inherit';
      } 
      else {
        headerTitle.style.fontSize = generateClampCSS(skillHeading?.fontSize, skillHeading?.fontSize) || 'inherit';
      }
      if (indexNumber && indexPlaceholder) {
        indexPlaceholder.style.fontFamily = indexNumber?.fontFamily || 'inherit';
        indexPlaceholder.style.fontWeight = indexNumber?.fontWeight || 'inherit';
        indexPlaceholder.style.fontSize = generateClampCSS(indexNumber?.fontSize, indexNumber?.fontSize) || 'inherit';
        if (this.isMobileView) {
          indexPlaceholder.style.fontSize = generateClampCSS(indexNumber?.mobile?.fontSize, indexNumber?.mobile?.fontSize) || 'inherit';
        }
      }

      itemListHeader.addEventListener('mouseover', () => {
        if (!itemListHeader.classList.contains('active')) {
          if (!this.isMobileView) {
            itemListHeader.style.backgroundColor = hover.backgroundColor;
            numberAndIconWrapper.style.color = hover.iconColor;
            headerTitle.style.color = hover.fontColor;
            // switch icon to hover state
            iconPlaceHolderElement.innerHTML = iconPlaceHolderElement.dataset.iconHover || iconPlaceHolderElement.dataset.iconDefault;
          }
        }
      });

      itemListHeader.addEventListener('mouseout', () => {
        if (!itemListHeader.classList.contains('active')) {
          itemListHeader.style.backgroundColor = backgroundColor;
          numberAndIconWrapper.style.color = iconColor;
          headerTitle.style.color = fontColor;
          // revert icon to default
          iconPlaceHolderElement.innerHTML = iconPlaceHolderElement.dataset.iconDefault;
        }
      });

      itemListHeader.addEventListener('click', () => {
        this.coverBanner.style.display = 'flex';
        // Remove previous selected item's background color
        const previousSelectedItem = document.querySelector('.item.active');
        if (previousSelectedItem) {
          previousSelectedItem.classList.remove('active');
          previousSelectedItem.style.backgroundColor = backgroundColor;
          previousSelectedItem.style.color = fontColor; 
          // Reset numberAndIconWrapper and itemTitleElement and itemDescriptionElement color for previous item
          const prevNumberAndIconWrapper = previousSelectedItem.querySelector('.number-and-icon-wrapper');
          const prevItemTitleElement = previousSelectedItem.querySelector('.item-title');
          const prevItemDescriptionElement = previousSelectedItem.querySelector('.item-description'); 
          if (prevNumberAndIconWrapper) prevNumberAndIconWrapper.style.color = iconColor;
          if (prevItemTitleElement) prevItemTitleElement.style.color = fontColor;
          if (prevItemDescriptionElement) prevItemDescriptionElement.style.color = fontColor;
          // reset previous item's icon to default
          const prevIcon = previousSelectedItem.querySelector('.icon-placeholder');
          if (prevIcon) {
            prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
          }
        }

        // Set the background color of the clicked item
        itemListHeader.classList.add('active');
      });
    } 
    else {
      itemListHeader.addEventListener('mouseover', () => {
        if (!itemListHeader.classList.contains('active')) {
          // switch icon to hover state
          iconPlaceHolderElement.innerHTML = iconPlaceHolderElement.dataset.iconHover || iconPlaceHolderElement.dataset.iconDefault;
        }
      });

      itemListHeader.addEventListener('mouseout', () => {
        if (!itemListHeader.classList.contains('active')) {
          // revert icon to default
          iconPlaceHolderElement.innerHTML = iconPlaceHolderElement.dataset.iconDefault;
        }
      });

      itemListHeader.addEventListener('click', () => {
        this.coverBanner.style.display = 'flex';
        // Remove previous selected item's background color
        const previousSelectedItem = document.querySelector('.item.active');
        if (previousSelectedItem) {
          previousSelectedItem.classList.remove('active');
          // reset previous item's icon to default
          const prevIcon = previousSelectedItem.querySelector('.icon-placeholder');
          if (prevIcon) {
            prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
          }
        }
        // Set the background color of the clicked item
        itemListHeader.classList.add('active');
      });
    }

    // if (!this.displayCoverBanner) {
    itemListHeader.addEventListener('click', () => {
      this.showCoverBanner();
      this.container.scrollTo(top);
      this.resetActiveItem();
      // itemListHeader.classList.add('active');
      this.coverHeaderTitle?.classList.add('hidden');
    });

    itemListHeader.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        itemListHeader.click();
      }
    });
    // }
    itemListHeader.appendChild(headerTitle);

    itemListHeader.addEventListener('click', () => {
      // Trigger interacted event with lesson metadata for Home Icon
      this.parent.buildXAPIEventTrigger();
    });

    return itemListHeader;
  }

  createListItem(item, index, nonBranchingIndex) {
    const listItem = document.createElement('div');
    listItem.setAttribute('tabindex', '0');
    listItem.classList.add('item');
    // if (this.isMobileView) {
    listItem.style.paddingBlock = generateClampCSS("0.375rem", "0.375rem");
    // }
    listItem.style.minHeight = generateClampCSS("4rem", "4rem");
    listItem.style.paddingInline = generateClampCSS("0.75rem", "0.75rem");

    const itemWrapper = this.createItemWrapper(item, index, nonBranchingIndex); // item builder
    
    // Get references to inner elements for styling
    const numberAndIconWrapper = itemWrapper.querySelector('.number-and-icon-wrapper');
    const itemTitleElement = itemWrapper.querySelector('.item-title');
    const itemDescriptionElement = itemWrapper.querySelector('.item-description');
    const iconEl = itemWrapper.querySelector('.icon-placeholder');

    if (this.themeData?.tableOfContent?.tocItems) {
      const { backgroundColor, iconColor, hover, selected, fontColor, skillHeading, skillHDescription, indexNumber} = this.themeData.tableOfContent.tocItems;
      listItem.style.backgroundColor = backgroundColor;
      numberAndIconWrapper.style.color = iconColor;
      let indexPlaceholder = itemWrapper.querySelector('.index-placeholder');
      itemTitleElement.style.color = fontColor;
      itemDescriptionElement.style.color = fontColor;
      itemTitleElement.style.fontFamily = skillHeading?.fontFamily || 'inherit';
      itemTitleElement.style.fontWeight = skillHeading?.fontWeight || 'inherit';
      if (this.isMobileView) {
        itemTitleElement.style.fontSize = generateClampCSS(skillHeading?.mobile?.fontSize, skillHeading?.mobile?.fontSize) || 'inherit';
      } 
      else {
        itemTitleElement.style.fontSize = generateClampCSS(skillHeading?.fontSize, skillHeading?.fontSize) || 'inherit';
      }
      itemDescriptionElement.style.fontFamily = skillHDescription?.fontFamily || 'inherit';
      itemDescriptionElement.style.fontWeight = skillHDescription?.fontWeight || 'inherit';
      if ( this.isMobileView) {
        itemDescriptionElement.style.fontSize = generateClampCSS(skillHDescription?.mobile?.fontSize, skillHDescription?.mobile?.fontSize) || 'inherit';
      } 
      else {
        itemDescriptionElement.style.fontSize = generateClampCSS(skillHDescription?.fontSize, skillHDescription?.fontSize) || 'inherit';
      }
      if (indexNumber && indexPlaceholder) {
        indexPlaceholder.style.fontFamily = indexNumber?.fontFamily || 'inherit';
        indexPlaceholder.style.fontWeight = indexNumber?.fontWeight || 'inherit';
        indexPlaceholder.style.fontSize = generateClampCSS(indexNumber?.fontSize, indexNumber?.fontSize) || 'inherit';
        if (this.isMobileView) {
          indexPlaceholder.style.fontSize = generateClampCSS(indexNumber?.mobile?.fontSize, indexNumber?.mobile?.fontSize) || 'inherit';
        }
      }
      
      listItem.addEventListener('mouseover', () => {
        if (!listItem.classList.contains('active')) {
          if (!this.isMobileView) {
            listItem.style.backgroundColor = hover.backgroundColor;
            numberAndIconWrapper.style.color = hover.iconColor;
            itemTitleElement.style.color = hover.fontColor;
            itemDescriptionElement.style.color = hover.fontColor;
            // switch icon to hover state
            if (iconEl) {
              iconEl.innerHTML = iconEl.dataset.iconHover || iconEl.dataset.iconDefault || iconEl.innerHTML;
            }
          }
        }
      });
      listItem.addEventListener('mouseout', () => {
        if (!listItem.classList.contains('active')) {
          listItem.style.backgroundColor = backgroundColor;
          numberAndIconWrapper.style.color = iconColor;
          itemTitleElement.style.color = fontColor;
          itemDescriptionElement.style.color = fontColor;
          // revert icon to default
          if (iconEl) {
            iconEl.innerHTML = iconEl.dataset.iconDefault || iconEl.innerHTML;
          }
        }
      });
      listItem.addEventListener('click', () => {
        this.closeTeachingNotesModal();
        // Remove previous selected item's background color and reset icon/title color
        const previousSelectedItem = document.querySelector('.item.active');
        if (previousSelectedItem) {
          previousSelectedItem.classList.remove('active');
          previousSelectedItem.style.backgroundColor = backgroundColor;
          previousSelectedItem.style.color = fontColor;
          // Reset numberAndIconWrapper and itemTitleElement and itemDescriptionElement color for previous item
          const prevNumberAndIconWrapper = previousSelectedItem.querySelector('.number-and-icon-wrapper');
          const prevItemTitleElement = previousSelectedItem.querySelector('.item-title');
          const prevItemDescriptionElement = previousSelectedItem.querySelector('.item-description');
          if (prevItemDescriptionElement) prevItemDescriptionElement.style.color = fontColor;
          if (prevNumberAndIconWrapper) prevNumberAndIconWrapper.style.color = iconColor;
          if (prevItemTitleElement) prevItemTitleElement.style.color = fontColor;
          const prevIcon = previousSelectedItem.querySelector('.icon-placeholder');
          if (prevIcon) {
            prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
          }
        }

        // Set the background color of the clicked item
        listItem.classList.add('active');
        listItem.style.backgroundColor = selected.backgroundColor;
        numberAndIconWrapper.style.color = selected.iconColor;
        itemTitleElement.style.color = selected.fontColor;
        itemDescriptionElement.style.color = selected.fontColor;
        // switch icon to selected state
        if (iconEl) {
          iconEl.innerHTML = iconEl.dataset.iconSelected || iconEl.dataset.iconDefault || iconEl.innerHTML;
        }
      });
    } 
    else {
      listItem.addEventListener('mouseover', () => {
        if (!listItem.classList.contains('active')) {
          if (iconEl) {
            iconEl.innerHTML = iconEl.dataset.iconHover || iconEl.dataset.iconDefault || iconEl.innerHTML;
          }
        }
      });
      listItem.addEventListener('mouseout', () => {
        if (!listItem.classList.contains('active')) {
          if (iconEl) {
            iconEl.innerHTML = iconEl.dataset.iconDefault || iconEl.innerHTML;
          }
        }
      });
      listItem.addEventListener('click', () => {
        this.closeTeachingNotesModal();
        // Remove previous selected item's background color and reset icon/title color
        const previousSelectedItem = document.querySelector('.item.active');
        if (previousSelectedItem) {
          previousSelectedItem.classList.remove('active');
          const prevIcon = previousSelectedItem.querySelector('.icon-placeholder');
          if (prevIcon) {
            prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
          }
        }

        // Set the background color of the clicked item
        listItem.classList.add('active');
        // switch icon to selected state
        if (iconEl) {
          iconEl.innerHTML = iconEl.dataset.iconSelected || iconEl.dataset.iconDefault || iconEl.innerHTML;
        }
      });
    }

    listItem.appendChild(itemWrapper);

    listItem.addEventListener('click', () => {
      // Trigger interacted event with lesson metadata
      this.parent.buildXAPIEventTrigger();

      if (window.innerWidth <= 768) {
        const adjustMargin = document.querySelector(".h5p-interactive-book-main-header-logo-title").offsetHeight;
        document.querySelector(".h5p-interactive-book-header-cover-title").style.marginTop = adjustMargin < 60 ? 0 : `${adjustMargin - 50}px`;
      }
      // if (this.displayCoverBanner) {
      // this.container.style.height = "auto";


      if (document.documentElement.clientWidth < 800) {
        // this.parent.trigger('newChapter', {
        //   h5pbookid: this.contentId,
        //   chapter: `h5p-interactive-book-chapter-596e763c-b78f-4b67-9c5b-9a67bf237076`,
        //   section: 0
        // });
        // handleThumbnailClick.call(this);
        this.removeContainer();
        this.closeTeachingNotesModal();
        this.parent.hideAllElements(false);

        // Create activity data object for postMessage
        const activityData = {
          activityId: item.activityId || `activity-${item.subContentId}`,
          subContentId: item.subContentId,
          activityName: item.itemTitle || item.skill || `activity-${item.subContentId}`,
          timestamp: new Date().toISOString()
        };
        // Send postMessage when transitioning from cover to activity (mobile)
        sendPostMessage('activity-changed', 'lesson-package', activityData);
        
        this.parent.trigger('newChapter', {
          h5pbookid: this.contentId,
          chapter: `h5p-interactive-book-chapter-${item.subContentId}`,
          section: 0
        });

      }
      else {
        // 1. Check if the banner is currently visible. This determines if it's the "first click".
        const coverBannerIsVisible = !document.querySelector('.h5p-interactive-book-cover-banner').classList.contains('hidden');

        // 2. Hide the banner and prepare the layout (this happens on every click).
        this.resetActiveItem();
        this.hideCoverBanner();
        listItem.classList.add('active');
        document.querySelector('.toc-left-panel').classList.add('hide-menu');
        document.querySelector('.toc-right-panel').classList.add('show-menu');
        this.coverHeaderTitle?.classList.remove('hidden');

        const scrollContainer = this.container;
        // Ensure scrolling is always enabled
        scrollContainer.style.overflow = 'auto';
        
        // Force scroll container to be scrollable with a slight delay to ensure DOM updates
        setTimeout(() => {
          scrollContainer.style.overflow = 'auto';
        }, 50);

        // 3. Define the scroll action as a reusable function.
        // This uses the simple scrollIntoView, with special handling for the last item.
        const performScroll = () => {
          const thumbnails = document.querySelectorAll('.toc-right-panel .thumbnail-overlay-container');
          if (thumbnails.length > index) {
            // Ensure container is scrollable before scrolling
            scrollContainer.style.overflow = 'auto';
            
            // Special handling for the last item to prevent excessive scrolling
            const isLastItem = index === thumbnails.length - 1;
            const scrollOptions = {
              behavior: 'smooth',
              block: isLastItem ? 'nearest' : 'start'
            };
            
            thumbnails[index].scrollIntoView(scrollOptions);
            
            // For the last item, ensure we don't scroll too far up
            if (isLastItem) {
              setTimeout(() => {
                const containerRect = scrollContainer.getBoundingClientRect();
                const thumbnailRect = thumbnails[index].getBoundingClientRect();
                const leftPanel = document.querySelector('.toc-left-panel');
                const leftPanelHeight = leftPanel ? leftPanel.offsetHeight : 0;
                
                // If the thumbnail is too high up and there's space below, adjust
                if (thumbnailRect.top < containerRect.top + 100 && 
                    containerRect.bottom - thumbnailRect.bottom > 50) {
                  scrollContainer.scrollBy({
                    top: -50,
                    behavior: 'smooth'
                  });
                }
              }, 100);
            }
          }
        };

        // 4. Use the timeout ONLY if the banner was visible (the first click).
        if (coverBannerIsVisible) {
          // On the first click, wait for the layout to settle before scrolling.
          setTimeout(() => {
            performScroll();
          }, 500); // The 500ms delay you found works best.
        }
        else {
          // On all subsequent clicks, scroll instantly without any delay.
          performScroll();
        }
      }
    });

    listItem.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        listItem.click();
      }
    });
    return listItem;
  }

  createItemWrapper(item, index) {
    const customNumber = this.customTocIndex?.[item["activityId"]];
    // Check is TOC is branching pathway or not
    const branchingIcon = item?.h5pTemplate?.mainLibraryName?.includes("branching") ? true : null;

    // 🔥 Ensure skillData exists
    if (!this.parent.params.skillData) {
      this.parent.params.skillData = {};
    }

    const itemWrapper = document.createElement('div');
    itemWrapper.classList.add('item-wrapper');
    itemWrapper.style.gap = generateClampCSS("1.25rem", "1.25rem");
    const numberAndIconWrapper = document.createElement('div');
    numberAndIconWrapper.classList.add('number-and-icon-wrapper');

    const size = generateClampCSS("1.5rem", "1.5rem");

    const indexPlaceHolderElement = document.createElement('span');
    indexPlaceHolderElement.classList.add('index-placeholder');
    // indexPlaceHolderElement.style.fontSize = generateClampCSS("1rem", "1rem");
    indexPlaceHolderElement.textContent = (this.customTocIndex && Object.keys(this.customTocIndex)?.length > 0 ? String(customNumber || '')?.trim() : index + 1) || '';
    // Conditional styling for custom index
    if (this.hasAnyCustomIndex) {
      // Right align index and set max width for 7 characters
      let maxCharLength = getMaxValueCharLength(this.customTocIndex);
      indexPlaceHolderElement.style.justifyContent = 'flex-end';
      indexPlaceHolderElement.style.textAlign = 'left';
      indexPlaceHolderElement.style.maxWidth = `${maxCharLength}ch`;
      indexPlaceHolderElement.style.width = `${maxCharLength}ch`;
      numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem"); // 2.5rem is ideal, so we are removing this check.
    } 
    else {
      indexPlaceHolderElement.style.width = '2ch';
      indexPlaceHolderElement.style.fontSize = generateClampCSS("1rem", "1rem");
      numberAndIconWrapper.style.paddingLeft = generateClampCSS("1.5rem", "1.5rem");
    }
    numberAndIconWrapper.appendChild(indexPlaceHolderElement);
    const iconPlaceHolderElement = document.createElement('span');
    iconPlaceHolderElement.style.width = size;
    iconPlaceHolderElement.style.height = size;
    iconPlaceHolderElement.style.alignItems = 'center';
    iconPlaceHolderElement.style.justifyContent = 'center';
    iconPlaceHolderElement.classList.add('icon-placeholder');

    let branchingIconName = '';
    if (branchingIcon) {
      const segment = this.parent.params?.lessonMetadata?.segment;
      branchingIconName = (this.themeData && Object.keys(this.themeData)?.length > 0) ? "branchingIcon" : (["primary", "pre-primary", "prePrimary", "preprimary"].includes(segment) ? 'branchingIconPrimary' : ["secondary", "adult"].includes(segment) ? 'branchingIconSecondary' : 'branchingIcon');
    }

    const tocData = getCoverTOCData(item?.skill, this.parent?.params?.skillData, this.themeData, branchingIconName);
    const iconName = item?.skill?.toLowerCase() || 'default';
    iconPlaceHolderElement.classList.add(`${iconName}-icon`);

    let defIcon = '', hovIcon = '', selIcon = '';
    if (tocData && tocData.icon) {
      if (typeof tocData.icon === 'object') {
        const def = tocData.icon.default;
        const hov = tocData.icon.hoverState || def;
        const sel = tocData.icon.selectedState || def;
        defIcon = isSvgUrl(def) ? `<img src="${cleanUrl(def)}" alt="${iconName} icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : def;
        hovIcon = isSvgUrl(hov) ? `<img src="${cleanUrl(hov)}" alt="${iconName} icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : hov;
        selIcon = isSvgUrl(sel) ? `<img src="${cleanUrl(sel)}" alt="${iconName} icon" style="width: ${size}; height: ${size}; pointer-events: none;">` : sel;
      }
      else if (typeof tocData.icon === 'string') {
        defIcon = isSvgUrl(tocData.icon)
          ? `<img src="${cleanUrl(tocData.icon)}" alt="${iconName} icon" style="width: ${size}; height: ${size}; pointer-events: none;">`
          : tocData.icon;
        hovIcon = defIcon;
        selIcon = defIcon;
      }
    }

    iconPlaceHolderElement.dataset.iconDefault = defIcon;
    iconPlaceHolderElement.dataset.iconHover = hovIcon || defIcon;
    iconPlaceHolderElement.dataset.iconSelected = selIcon || defIcon;
    iconPlaceHolderElement.innerHTML = iconPlaceHolderElement.dataset.iconDefault;

    numberAndIconWrapper.appendChild(iconPlaceHolderElement);
    itemWrapper.appendChild(numberAndIconWrapper);
    const textPlaceHolderElement = document.createElement('div');
    textPlaceHolderElement.classList.add('text-placeholder');
    textPlaceHolderElement.style.display = 'flex';
    textPlaceHolderElement.style.flexDirection = 'column';
    const itemTitleElement = document.createElement('div');
    itemTitleElement.classList.add('item-title');
    itemTitleElement.textContent = decodeHtmlEntities(tocData.label);
    itemTitleElement.setAttribute('aria-label', tocData.label);
    textPlaceHolderElement.appendChild(itemTitleElement);
    const itemDescriptionElement = document.createElement('div');
    itemDescriptionElement.classList.add('item-description');
    itemDescriptionElement.classList.add('toc-description');

    const descriptionText = item.description || '--';
    // Visible single-line truncated text
    itemDescriptionElement.textContent = decodeHtmlEntities(descriptionText);
    // Remove any previously set native tooltip
    itemDescriptionElement.removeAttribute('title');
    textPlaceHolderElement.appendChild(itemDescriptionElement);
    itemWrapper.appendChild(textPlaceHolderElement);
    return itemWrapper;
  }

  createRightPanel() {
    const rightPanel = document.createElement('div');
    rightPanel.classList.add('toc-right-panel');
    this.addWheelEventListenerToAnElement(rightPanel, 'rightPanel-toc');
    this.parent.params.tableOfContents.forEach((item, index) => {
      const thumbnail = this.createThumbnail(item, index);
      if (index === 0) {
        this.addWheelEventListenerToAnElement(thumbnail, 'toc');
      }
      thumbnail.addEventListener('click', () => {
        // Trigger interacted event with lesson metadata
        this.parent.buildXAPIEventTrigger();
        this.closeTeachingNotesModal();
        this.removeContainer();
        this.parent.hideAllElements(false);
        // this.parent.trigger('thumbnailActivityClick', { item });

        // Create activity data object for postMessage
        const activityData = {
          activityId: item.activityId || `activity-${item.subContentId}`,
          subContentId: item.subContentId,
          activityName: item.itemTitle || item.skill || `activity-${item.subContentId}`,
          timestamp: new Date().toISOString()
        };
        // Send postMessage when transitioning from cover to activity
        sendPostMessage('activity-changed', 'lesson-package', activityData);
        
        this.parent.trigger('newChapter', {
          h5pbookid: this.contentId,
          chapter: `h5p-interactive-book-chapter-${item.subContentId}`,
          section: 0
        });

        const previousSelectedItem = document.querySelector('.item.active');
        if (previousSelectedItem) {
          // Remove previous selected TOC item's background color
          if (this.themeData?.tableOfContent?.tocItems) {
            const { backgroundColor, iconColor, fontColor } = this.themeData.tableOfContent.tocItems;

            previousSelectedItem.classList.remove('active');
            previousSelectedItem.style.backgroundColor = backgroundColor;
            previousSelectedItem.style.color = fontColor;
            // Reset numberAndIconWrapper and itemTitleElement and itemDescriptionElement color for previous item
            const prevNumberAndIconWrapper = previousSelectedItem.querySelector('.number-and-icon-wrapper');
            const prevItemTitleElement = previousSelectedItem.querySelector('.item-title');
            const prevItemDescriptionElement = previousSelectedItem.querySelector('.item-description');
            if (prevNumberAndIconWrapper) prevNumberAndIconWrapper.style.color = iconColor;
            if (prevItemTitleElement) prevItemTitleElement.style.color = fontColor;
            if (prevItemDescriptionElement) prevItemDescriptionElement.style.color = fontColor;

          }
          // reset previous item's icon to default
          const prevIcon = previousSelectedItem.querySelector('.icon-placeholder');
          if (prevIcon) {
            prevIcon.innerHTML = prevIcon.dataset.iconDefault || prevIcon.innerHTML;
          }
        }
        // ✅ RESET AFTER NAVIGATION IS TRIGGERED
        this.resetActiveItem();
      });
      rightPanel.appendChild(thumbnail);
    });
    return rightPanel;
  }

  createThumbnail(item, index) {
    const thumbnailOverlayContainer = document.createElement('div');
    thumbnailOverlayContainer.classList.add('thumbnail-overlay-container');
    
    // Add this line. This declaratively tells the browser where to stop scrolling.
    // The value MUST match the 'top' value of the sticky left panel from hideCoverBanner().
    // Adjust scroll margin for better positioning, especially for last items
    const isLastItem = index === this.parent.params.tableOfContents.length - 1;
    const scrollMargin = isLastItem ? 'clamp(3rem, 4.9vw, 12rem)' : 'clamp(5rem, 6.9vw, 15rem)';
    thumbnailOverlayContainer.style.scrollMarginTop = scrollMargin;

    const thumbnailOverlay = document.createElement('div'); // thumbnail overlay
    thumbnailOverlay.classList.add('thumbnail-overlay');
    if (this.themeData?.activity?.activityWrapper) {
      const { backgroundColor, hoverState } = this.themeData.activity.activityWrapper;
      thumbnailOverlay.style.backgroundColor = backgroundColor;
      thumbnailOverlay.addEventListener('mouseover', () => {
        thumbnailOverlay.style.backgroundColor = hoverState.backgroundColor;
      });
      thumbnailOverlay.addEventListener('mouseout', () => {
        thumbnailOverlay.style.backgroundColor = backgroundColor;
      });
    }

    const thumbnailOverlayHeader = document.createElement('div'); // thumbnail overlay header
    thumbnailOverlayHeader.classList.add('thumbnail-overlay-header');
    
    const activityDiv = document.createElement('h6');
    activityDiv.classList.add('activity', 'thumbnail-header');
    activityDiv.textContent = getCoverTOCData(item.skill, this.parent?.params?.skillData, this.themeData).label || '--';
    
    const separatorDiv = document.createElement('span');
    separatorDiv.classList.add('separator');
    separatorDiv.textContent = ' | ';
    
    const exerciseDiv = document.createElement('h6');
    exerciseDiv.classList.add('exercise', 'thumbnail-header');
    let exerciseType = GenerateExerciseDiv(this.segment);
    exerciseDiv.textContent = exerciseType;
    
    const indexDiv = document.createElement('h6');
    indexDiv.classList.add('thumbnail-header');

    if (this.themeData?.activity?.activityTitle?.landingPage?.skillName) {
      const { fontSize, fontFamily, fontColor, fontWeight } = this.themeData.activity.activityTitle.landingPage.skillName;
      if (fontFamily) {
        activityDiv.style.fontFamily = fontFamily;
        separatorDiv.style.fontFamily = fontFamily;
      }
      if (fontColor) {
        activityDiv.style.color = fontColor;
        separatorDiv.style.color = fontColor;
      }
      if (fontSize) {
        activityDiv.style.fontSize = generateClampCSS(fontSize, fontSize);
        separatorDiv.style.fontSize = generateClampCSS(fontSize, fontSize);
      }
      if (fontWeight) {
        activityDiv.style.fontWeight = fontWeight;
        separatorDiv.style.fontWeight = fontWeight;
      }
    }
    if (this.themeData?.activity?.activityTitle?.landingPage?.exercise) {
      const { fontSize, fontFamily, fontColor, fontWeight } = this.themeData.activity.activityTitle.landingPage.exercise;
      if (fontFamily) {
        exerciseDiv.style.fontFamily = fontFamily;
        indexDiv.style.fontFamily = fontFamily;
      }
      if (fontColor) {
        exerciseDiv.style.color = fontColor;
        indexDiv.style.color = fontColor;
      }
      if (fontSize) {
        exerciseDiv.style.fontSize = generateClampCSS(fontSize, fontSize);
        indexDiv.style.fontSize = generateClampCSS(fontSize, fontSize);
      }
      if (fontWeight) {
        exerciseDiv.style.fontWeight = fontWeight;
        indexDiv.style.fontWeight = fontWeight;
      }
    }
    thumbnailOverlayHeader.appendChild(activityDiv);
    if (this.hasAnyCustomIndex) {
      const customNumber = this.customTocIndex?.[item["activityId"]];
      if (customNumber) {
        thumbnailOverlayHeader.appendChild(separatorDiv);
        thumbnailOverlayHeader.appendChild(exerciseDiv);
        indexDiv.textContent = customNumber || '';
        thumbnailOverlayHeader.appendChild(indexDiv);
      }
    } 
    else {
      thumbnailOverlayHeader.appendChild(separatorDiv);
      thumbnailOverlayHeader.appendChild(exerciseDiv);
      indexDiv.textContent = (index + 1);
      thumbnailOverlayHeader.appendChild(indexDiv);
    }
    
    thumbnailOverlay.appendChild(thumbnailOverlayHeader);
    if (this.themeData?.activity?.activityTitle) {
      const { landingPage } = this.themeData.activity.activityTitle;
      if (landingPage) {
        const { fontColor, fontFamily, exercise, skill } = landingPage;
        if (fontFamily) {
          thumbnailOverlayHeader.style.fontFamily = fontFamily;
        }
        if (fontColor) {
          thumbnailOverlayHeader.style.color = fontColor;
          
        }
        if (exercise?.fontWeight) {
          exerciseDiv.style.fontWeight = exercise.fontWeight;
          separatorDiv.style.fontWeight = exercise.fontWeight;
        }

        if (skill?.fontWeight) {
          activityDiv.style.fontWeight = skill.fontWeight;
        }
      }      
    }
    
    const thumbnailImgWrapper = document.createElement('div');  // thumbnail image wrapper
    thumbnailImgWrapper.classList.add('thumbnail-img-wrapper');
    thumbnailImgWrapper.style.position = 'relative';
    // ✅ SET TEMPORARY HEIGHT: Add minimum height during loading phase
    thumbnailImgWrapper.style.minHeight = '30vh'; // Temporary height while loading
    thumbnailOverlay.appendChild(thumbnailImgWrapper);
    
    // Create loader element
    const loader = document.createElement('div');
    loader.classList.add('thumbnail-loader');
    loader.innerHTML = '<div style="border: 3px solid #f3f3f3; border-top: 3px solid #007acc; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>';
    
    // Add CSS animation for loader (only once)
    if (!document.querySelector('#loader-spin-animation')) {
      const style = document.createElement('style');
      style.id = 'loader-spin-animation';
      style.textContent = '@keyframes spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    thumbnailImgWrapper.appendChild(loader);
    
    const thumbnail = document.createElement('img'); // thumbnail image
    thumbnailImgWrapper.appendChild(thumbnail);

    for (let i = 0; i <this.parent.params.tableOfContents.length; i++) {
      const tocItem =this.parent.params.tableOfContents[i];
      const chapterItem =this.parent.params.chapters[i];
      const contentItem = chapterItem.params.content[0];
      if (tocItem.id === contentItem.content.id) {
        this.parent.params.tableOfContents[i].subContentId = chapterItem.subContentId;
      }
    }
    
    // Lazy loading setup
    const fallbackUrl = 'https://component-lib.pearson.com/c2/dbef5d4f-c16c-4bae-bab6-3ca9b76d605e/default_ell_h5p_thumbnail.jpg';
    
    thumbnail.onload = function () {
      // ✅ REMOVE TEMPORARY HEIGHT: Once image loads, let content determine height
      loader.style.display = 'none';
      thumbnailImgWrapper.style.minHeight = ''; // Remove temporary height
      thumbnailImgWrapper.style.height = 'auto'; // Let content determine height
    };
    
    thumbnail.onerror = function () {
      // ✅ FALLBACK IMAGE: Also remove temporary height on error/fallback
      thumbnailImgWrapper.style.minHeight = ''; // Remove temporary height
      thumbnailImgWrapper.style.height = 'auto'; // Let content determine height
      thumbnail.src = fallbackUrl;
    };
    
    thumbnail.style.width = '100%';
    
    // Load first 2 images immediately (visible in viewport)
    if (index < 2) {
      thumbnail.src = item.thumbnailUrl;
    } 
    else {
      // For images 3+, use lazy loading with data-src
      thumbnail.dataset.src = item.thumbnailUrl;
      thumbnail.classList.add('lazy-thumbnail');
      // Add to observer when created
      if (this.lazyObserver) {
        this.lazyObserver.observe(thumbnail);
      }
    }
    thumbnailOverlayContainer.appendChild(thumbnailOverlay);
    return thumbnailOverlayContainer;
  }


  createTocWrapper(leftPanel, rightPanel) {
    const tocWrapper = document.createElement('div');
    tocWrapper.style.display = 'flex';
    tocWrapper.appendChild(leftPanel);
    tocWrapper.appendChild(rightPanel);
    return tocWrapper;
  }

  /**
   * Create an element which contains both the cover image and a background bar.
   * @param {object} coverImage Image object.
   */
  createVisualsElement(params) {
    if (!params || !params.params) {
      return null;
    }

    const visuals = document.createElement('div');
    visuals.classList.add('h5p-interactive-book-cover-graphics');

    return visuals;
  }

  /**
   * Initialize Media.
   * The YouTube handler requires the video wrapper to be attached to the DOM
   * already.
   */
  initMedia() {
    this.showCoverBanner();
    const bannerImage = document.querySelector('#h5p-interactive-book-cover-background-image');
    if (bannerImage) {
      bannerImage.classList.remove('zoomout');
      setTimeout(() => {
        bannerImage.classList.add('zoomout');
      }, 1000);
    }
    if (!this.visuals || !this.params.coverMedium) {
      return;
    }

    const coverMedium = this.params.coverMedium;

    // Preparation
    if ((coverMedium.library || '').split(' ')[0] === 'H5P.Video') {
      coverMedium.params.visuals.fit = false;
    }

    const instance = H5P.newRunnable(coverMedium, this.contentId, H5P.jQuery(this.visuals), false, { metadata: coverMedium.medatata });

    // Resize parent when children resize
    this.bubbleUp(
      instance, 'resize', this.parent
    );

    // Resize children to fit inside parent
    this.bubbleDown(
      this.parent, 'resize', [instance]
    );

    // Postparation
    if ((coverMedium.library || '').split(' ')[0] === 'H5P.Image') {
      const image = this.visuals.querySelector('img') || this.visuals.querySelector('.h5p-placeholder');
      image.style.height = 'auto';
      image.style.width = 'auto';
    }

    this.visuals.appendChild(this.createCoverBar());
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        target.trigger(eventName, event);
      });
    });
  }

  /**
   * Create Image.
   *
   * @param {string} path Relative image path.
   * @param {number} contentId Content id.
   * @param {string|null} altText
   */
  createImage(path, contentId, altText) {
    const img = document.createElement('img');
    img.classList.add('h5p-interactive-book-cover-image');
    img.src = H5P.getPath(path, contentId);
    img.setAttribute('draggable', 'false');
    if (altText) {
      img.alt = altText;
    }

    return img;
  }

  /**
   * Create an element responsible for the bar behind an image.
   *
   * @return {HTMLElement} Horizontal bar in the background.
   */
  createCoverBar() {
    const coverBar = document.createElement('div');
    coverBar.classList.add('h5p-interactive-book-cover-bar');
    return coverBar;
  }

  /**
   * Create cover title container
   * 
   * @param {string} titleText Title text.
   */
  createTitleContainer(title) {
    const titleContainer = document.createElement('div');
    titleContainer.classList.add('h5p-interactive-book-cover-title-container');
    titleContainer.appendChild(this.createTitleElement(title));
    // Tagline text
    if (this.params.coverTagline) {
      titleContainer.appendChild(this.createTaglineElement(this.params.coverTagline));
    }

    // start button for simple view
    if (!this.showTableOfContents) {
      titleContainer.appendChild(this.createStartButton(this.startText));
    }
    return titleContainer;
  }

  /**
   * Create title.
   *
   * @param {string} titleText Text for title element.
   * @return {HTMLElement} Title element.
   */
  createTitleElement(titleText) {

    const title = document.createElement('div');
    title.tabIndex = 0;
    title.classList.add('h5p-interactive-book-cover-title');
    const textNode = document.createTextNode(titleText);
    title.appendChild(textNode);
    title.setAttribute('aria-label', titleText);
    if (this.themeData?.banner?.lessonTitle) {
      addDynamicStylesOnNode(title, this.themeData.banner.lessonTitle, this.isMobileView);
      if (this.themeData.banner.lessonTitle?.textTransform) {
        title.style.textTransform = this.themeData.banner.lessonTitle.textTransform;
      }
    }
    return title;
  }

  /**
   * Create description.
   *
   * @param {string} descriptionText Text for description element.
   * @return {HTMLElement} Description element.
   */
  createTaglineElement(coverTagline) {
    if (!coverTagline) {
      return null;
    }

    const taglineElement = document.createElement('div');
    taglineElement.tabIndex = 0;
    taglineElement.classList.add('h5p-interactive-book-cover-tagline');
    taglineElement.innerHTML = coverTagline || 'Tagline';
    taglineElement.setAttribute('aria-label', coverTagline);
    if (this.themeData?.banner?.tagline) {
      addDynamicStylesOnNode(taglineElement, this.themeData.banner.tagline, this.isMobileView);
      if (this.themeData.banner.tagline?.textTransform) {
        taglineElement.style.textTransform = this.themeData.banner.tagline.textTransform;
      }
    }
    return taglineElement;
  }

  /**
   * Create a button element.
   *
   * @param {string} buttonText Button text.
   * @return {HTMLElement} Read button element.
   */
  createStartButton(buttonText) {
    const button = document.createElement('button');
    button.innerHTML = `<span class="btn_text">${buttonText}</span> <span class="btn_icon">${playIcon}</span>`;
    let startButtonText = button.querySelector('.btn_text');
    if (!this.isMobileView) {
      button.style.width = generateClampCSS("16.25rem", "16.25rem");
    }
    startButtonText.style.width = generateClampCSS("8.438rem", "8.438rem");  
    button.style.height = generateClampCSS("5.188rem", "5.188rem");
    startButtonText.style.height = generateClampCSS("3.625rem", "3.625rem");
    button.onclick = () => {
      // Trigger interacted event with lesson metadata on Start button of Student View
      this.parent.buildXAPIEventTrigger();
      // Trigger activity-changed postMessage for the first chapter
      this.parent.setActiveChapter(0);
      this.removeCover();
    };
    

    // Add theme to button
    if (this.themeData?.simpleView?.startButton) {
      const { backgroundColor, fontColor, fontSize, fontFamily, hoverState } = this.themeData.simpleView.startButton;
      button.style.backgroundColor = backgroundColor || this.themeData?.banner?.tagline?.backgroundColor;
      button.style.color = fontColor;
      button.style.fontSize = generateClampCSS(fontSize, fontSize);
      if (fontFamily) {
        button.style.fontFamily = fontFamily;
      }
      /*  button.addEventListener('mouseover', () => {
        button.style.backgroundColor = hoverState.backgroundColor;
        button.style.color = hoverState.fontColor;
      });
      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = backgroundColor;
        button.style.color = fontColor;
      }); */
    }

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('h5p-interactive-book-cover-start-button');
    buttonWrapper.appendChild(button);

    return buttonWrapper;
  }

  /**
   * Remove cover.
   */
  removeCover() {
    if (this.container.parentElement) {
      this.container.parentElement.classList.remove('covered');
      // this.container.parentElement.removeChild(this.container);
      this.container.classList.add('cover-hidden');
    }

    this.hidden = true;
    this.parent.trigger('coverRemoved');
  }

  initializeLazyLoadingObserver() {
    // Create Intersection Observer for lazy loading
    this.lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // Load the real image
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.classList.remove('lazy-thumbnail');
          
          // Stop observing this image
          this.lazyObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px', // Start loading 50px before entering viewport
      threshold: 0.1
    });
  }

  backToTop() {
    const backToTopElement = document.createElement('div'); // back to top element
    backToTopElement.classList.add('h5p-interactive-book-cover-back-to-top');
    backToTopElement.classList.add('hidden');

    if (this.themeData?.backToTop) {
      const { backgroundColor, fontColor, fontSize, hover, fontFamily } = this.themeData.backToTop;
      backToTopElement.style.backgroundColor = backgroundColor;
      backToTopElement.style.color = fontColor;
      backToTopElement.style.fontSize = fontSize;
      if (fontFamily) {
        backToTopElement.style.fontFamily = fontFamily;
      }
      backToTopElement.addEventListener('mouseover', () => {
        if (hover) {
          if (!this.isMobileView) {
            backToTopElement.style.backgroundColor = hover.backgroundColor;
            backToTopElement.style.color = hover.fontColor;
          }
        }
      });
      backToTopElement.addEventListener('mouseout', () => {
        backToTopElement.style.backgroundColor = backgroundColor;
        backToTopElement.style.color = fontColor;
      });
    }

    const backToTopIcon = document.createElement('span');
    backToTopIcon.innerHTML = upIcon;
    backToTopElement.appendChild(backToTopIcon);
    const backToTopText = document.createElement('span');
    backToTopText.classList.add('back-to-top-text');
    backToTopText.textContent = 'Back to top';
    backToTopElement.appendChild(backToTopText);
    backToTopElement.addEventListener('click', () => {
      this.showCoverBanner();
      // Ensure scrolling is enabled before scrolling to top
      this.container.style.overflow = 'auto';
      this.container.scrollTo({top: 0, behavior: 'smooth'});
      // this.innerContainer.scrollTo(0, 0);
    });
    return backToTopElement;
  }


}

export default Cover;
