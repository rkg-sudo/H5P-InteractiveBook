import { addDynamicStylesOnNode, checkDevice, generateClampCSS } from './utils.js';
import SimpleViewTOCMobile from './simpleviewtocmobile.js';
import { pearsonLogoIcon, pearsonLogoIconMobile, menuIcon, backButtonIcon, nextButtonIcon } from './icons.js';
import { getPageContentTOCData } from './utils/getTOCData.js';
import { GenerateExerciseDiv } from './utils/generalFunction.js';
/**
 * Constructor function.
 */

class StatusBar extends H5P.EventDispatcher {
  constructor(contentId, totalChapters, parent, params, styleClassName, isFooter=false, params1) {

    super();
    this.id = contentId;
    this.parent = parent;
    this.segment = parent.segment;
    this.params = params || {};
    this.params1 = params1 || {};

    this.params.l10n = params.l10n;

    this.totalPages = totalChapters - 1;
    this.currentPage = 1;

    this.params.a11y = Object.assign({
      progress: 'Page @page of @total',
      menu: 'Toggle navigation menu',
    }, this.params.a11y || {});

    this.params.coverDescription = "GRAMMAR";

    this.themeData = this.params.themeData;
    this.isMobileView = checkDevice().mobile;
    this.totalChapters = totalChapters;
    this.arrows = this.addArrows();
    this.isFooter = isFooter;
    this.customTocIndex = this.parent.params?.custom_toc_index || {};
    this.hasAnyCustom = this.hasAnyCustomIndex();
    /**
     * Top row initializer
     */
    this.paginationNumber = this.createPaginationNumber();
    this.mainHeader = this.createMainHeader();
    this.progressBar = this.createProgressBar();
    this.progressIndicator = this.createProgressIndicator();
    this.chapterTitle = this.createChapterTitle();
    this.menuToggleButton = this.createMenuToggleButton();

    
    const wrapperInfo = document.createElement('div');
    wrapperInfo.classList.add('h5p-interactive-book-status');

    const wrapperSimpleViewInfo = document.createElement('div');
    wrapperSimpleViewInfo.classList.add('h5p-interactive-book-status-simpleview-toc');
    //this.simpleViewToc = this.createSimpleViewToc();
    

    const activeChapter = this.parent.getActiveChapter();
    const skill = getPageContentTOCData(this.parent?.chapters?.[activeChapter]?.sections?.[0]?.skill, this.parent?.params?.skillData, this.themeData).label || '--';
    const activityId = this.parent?.chapters?.[activeChapter]?.sections?.[0]?.activityId || '--';
    const ordinal = activeChapter + 1;

    
    const activityTitleElement = document.createElement('div');
    activityTitleElement.classList.add('h5p-interactive-book-activity-title-mobile-view');
    const activitySkill = document.createElement('div');
    activitySkill.classList.add('activitySkill');
    activitySkill.textContent = skill;

    const exerciseContent = document.createElement('div');
    exerciseContent.classList.add('excercise');
    let exerciseType = GenerateExerciseDiv(this.segment);
    exerciseContent.textContent = exerciseType;

    if (this.themeData?.activity?.activityTitle?.mobileExerciseHeader?.skillName) {
      const { skillName } = this.themeData.activity.activityTitle.mobileExerciseHeader;
      if (skillName?.fontColor) {
        activitySkill.style.color = skillName.fontColor;
      }
      if (skillName?.fontSize) {
        activitySkill.style.fontSize = generateClampCSS(skillName.fontSize, skillName.fontSize);
      } 
      if (skillName?.fontFamily) {
        activitySkill.style.fontFamily = skillName.fontFamily;
      }
      if (skillName?.fontWeight) {
        activitySkill.style.fontWeight = skillName.fontWeight;
      }
    }

    if (this.themeData?.activity?.activityTitle?.mobileExerciseHeader?.exercise) {
      const { exercise } = this.themeData.activity.activityTitle.mobileExerciseHeader;
      if (exercise?.fontColor) { 
        exerciseContent.style.color = exercise.fontColor;
      }
      if (exercise?.fontSize) {
        exerciseContent.style.fontSize = generateClampCSS(exercise.fontSize, exercise.fontSize);
      }
      if (exercise?.fontFamily) {
        exerciseContent.style.fontFamily = exercise.fontFamily;
      }
      if (exercise?.fontWeight) {
        exerciseContent.style.fontWeight = exercise.fontWeight;
      }
    }

    const activityOrdinal = document.createElement('span');
    activityOrdinal.classList.add('activityOrdinal');
    if (this.hasAnyCustom) {
      const customNumber = this.customTocIndex?.[activityId];
      if (customNumber) {
        activityOrdinal.textContent = customNumber || '';
        exerciseContent.appendChild(activityOrdinal);
        activityTitleElement.appendChild(activitySkill);
        activityTitleElement.appendChild(exerciseContent);
      }
    }
    else {
      activityOrdinal.textContent = ordinal;
      exerciseContent.appendChild(activityOrdinal);
      activityTitleElement.appendChild(activitySkill);
      activityTitleElement.appendChild(exerciseContent);
    }

    if (this.themeData?.activity?.activityTitle?.activityPage && !this.isMobileView) {
      const { activityPage } = this.themeData.activity.activityTitle;
      const { fontColor, fontSize, fontFamily, exercise, skill } = activityPage;
      if (fontColor) {
        activityTitleElement.style.color = fontColor;
      }
      // if (fontSize) {
      //   activityTitleElement.style.fontSize =fontSize;
      // }
      if (fontFamily) {
        activityTitleElement.style.fontFamily = fontFamily;
      }
      if (exercise?.fontWeight) {
        exerciseContent.style.fontWeight = exercise.fontWeight;
        activityOrdinal.style.fontWeight = exercise.fontWeight;
      }

      if (skill?.fontWeight) {
        activitySkill.style.fontWeight = skill.fontWeight;
      }
    }

    wrapperInfo.appendChild(activityTitleElement);
    if (this.themeData?.backgroundColor) {
      wrapperInfo.style.backgroundColor = this.themeData.backgroundColor;
    } 
    
    if (this.themeData?.activity?.activityTitle?.mobileExerciseHeader?.backgroundColor && this.isMobileView) {
      wrapperInfo.style.backgroundColor = this.themeData?.activity?.activityTitle?.mobileExerciseHeader?.backgroundColor;
    }

    // theme image will impact here

    const statusHeaderRightContent = document.createElement('div');
    statusHeaderRightContent.classList.add('h5p-interactive-book-status-header-right-content');

    if (this.params.displayToTopButton) {
      statusHeaderRightContent.appendChild(this.createToTopButton());
    }

    statusHeaderRightContent.appendChild(this.arrows.buttonWrapperNext);
    statusHeaderRightContent.appendChild(this.arrows.buttonWrapperPrevious);
    
    if (this.params.displayMenuToggleButton) {
      statusHeaderRightContent.appendChild(this.menuToggleButton);
    }

    wrapperInfo.appendChild(statusHeaderRightContent);

    
    // wrapperInfo.appendChild(this.progressIndicator.wrapper);
    // wrapperInfo.appendChild(this.chapterTitle.wrapper);
    // wrapperInfo.appendChild(this.paginationNumber);
    // wrapperInfo.appendChild(this.progressBar.wrapper);
    


    this.wrapper = document.createElement('div');
    this.wrapper.classList.add(styleClassName);
    this.wrapper.setAttribute('tabindex', '-1');
    if (!this.isFooter) {
      this.wrapper.appendChild(this.mainHeader);
    } 
    else {
      if (this.themeData?.backgroundColor) {
        this.wrapper.style.backgroundColor = this.themeData.backgroundColor;
      }
    }
    // this.wrapper.appendChild(this.settingButton);
    // this.wrapper.appendChild(this.progressBar.wrapper);
    if (this.parent.isSimpleView && !this.isFooter) {
      this.simpleViewToc = new SimpleViewTOCMobile(this.params, this.id, '', this.parent, this.params1);
      wrapperSimpleViewInfo.appendChild(this.simpleViewToc.container);
      if (this.themeData?.backgroundColor) {
        wrapperSimpleViewInfo.style.backgroundColor = this.themeData.backgroundColor;
      }
      this.wrapper.appendChild(wrapperSimpleViewInfo);
    }
    else {
      this.wrapper.appendChild(wrapperInfo);
    }
    // this.wrapper.appendChild(wrapperInfo);

    this.on('updateStatusBar', this.updateStatusBar);

    /**
     * Sequential traversal of chapters
     * Event should be either 'next' or 'prev'
     */
    this.on('seqChapter', (event) => {
      const eventInput = {
        h5pbookid: this.parent.contentId
      };
      if (event.data.toTop) {
        eventInput.section = 'top';
      }

      if (event.data.direction === 'next') {
        // if (this.parent.activeChapter + 1 < this.parent.chapters.length - 1) {
        if (this.parent.activeChapter + 1 < this.parent.chapters.length) {
          eventInput.chapter = `h5p-interactive-book-chapter-${this.parent.chapters[this.parent.activeChapter + 1].instance.subContentId}`;
          this.currentPage += 1;
          this.updatePagination(this.currentPage);
        }
        // else if (this.parent.hasSummary() && this.parent.activeChapter + 1 === this.parent.chapters.length) {
        //   this.parent.trigger('viewSummary', eventInput);
        // }
      }
      else if (event.data.direction === 'prev') {
        if (this.parent.activeChapter > 0) {
          eventInput.chapter = `h5p-interactive-book-chapter-${this.parent.chapters[this.parent.activeChapter - 1].instance.subContentId}`;
          this.currentPage -= 1;
          this.updatePagination(this.currentPage);
        }
      }
      if (eventInput.chapter) {
        this.parent.trigger('newChapter', eventInput);
      }
    });
  }

  /**
   * Update progress bar.
   *
   * @param {number} chapterId Chapter Id.
   */
  updateProgressBar(chapter) {
    const barWidth = `${chapter / this.totalChapters * 100}%`;

    this.progressBar.progress.style.width = barWidth;
    const title = this.params.a11y.progress
      .replace('@page', chapter)
      .replace('@total', this.totalChapters);
    this.progressBar.progress.title = title;
  }

  /**
   * Update aria label of progress text
   * @param {number} chapterId Index of chapter
   */
  updateA11yProgress(chapterId) {
    this.progressIndicator.hiddenButRead.innerHTML = this.params.a11y.progress
      .replace('@page', chapterId)
      .replace('@total', this.totalChapters);
  }

  /**
   * Update status bar.
   */
  updateStatusBar() {
    const currentChapter = this.parent.getActiveChapter() + 1;
    this.updatePagination(currentChapter);

    this.progressIndicator.current.innerHTML = currentChapter;

    this.updateA11yProgress(currentChapter);
    this.updateProgressBar(currentChapter);

    // this.paginationNumber;
    this.updatePaginationHighlight(currentChapter);


    this.chapterTitle.text.innerHTML = this.parent.chapters[this.parent.activeChapter].title;

    this.chapterTitle.text.setAttribute('title', this.parent.chapters[this.parent.activeChapter].title);

    //assure that the buttons are valid in terms of chapter edges
    if (this.parent.activeChapter <= 0) {
      this.setButtonStatus('Previous', true);
    }
    else {
      this.setButtonStatus('Previous', false);
    }
    // if ((this.parent.activeChapter + 1) >= this.totalChapters) {
    if ((this.parent.activeChapter + 1) >= this.totalChapters) {
      this.setButtonStatus('Next', true);
    }
    else {
      this.setButtonStatus('Next', false);
    }
  }
  // createSimpleViewToc() {
  //   const simpleViewNavigationTocMobile = new SimpleViewTOCMobile(this.params, this.id, '', this.parent, this.params1);
  //   wrapperSimpleViewInfo.appendChild(simpleViewNavigationTocMobile.container);
  //   return wrapperSimpleViewInfo
  // }
  /**
   * Add traversal buttons for sequential travel (next and previous chapter)
   */
  addArrows() {
    const acm = {};

    // Initialize elements
    let height = generateClampCSS("1.5rem", "1.5rem");
    acm.buttonPrevious = document.createElement('a');
    acm.buttonPrevious.classList.add('navigation-button', 'icon-menu');
    acm.buttonPrevious.innerHTML = `<div style="height: ${height}; width: ${height};">${backButtonIcon}</div>`;
    acm.buttonPrevious.setAttribute('title', this.params.l10n.previousPage);

    acm.buttonWrapperPrevious = document.createElement('button');
    acm.buttonWrapperPrevious.classList.add('h5p-interactive-book-status-arrow', 'h5p-interactive-book-status-button', 'previous', 'interactive-navigation-previous');
    acm.buttonWrapperPrevious.setAttribute('aria-label', this.params.l10n.previousPage);
    acm.buttonWrapperPrevious.setAttribute('title', this.params.l10n.previousPage);
    acm.buttonWrapperPrevious.onclick = () => {
      this.trigger('seqChapter', {
        direction: 'prev',
        toTop: true
      });
    };
    
    acm.buttonWrapperPrevious.appendChild(acm.buttonPrevious);
    
    acm.buttonNext = document.createElement('a');
    acm.buttonNext.classList.add('navigation-button', 'icon-menu');
    acm.buttonNext.innerHTML = `<div style="height: ${height}; width: ${height};">${nextButtonIcon}</div>`;
    acm.buttonNext.setAttribute('title', this.params.l10n.nextPage);
    
    acm.buttonWrapperNext = document.createElement('button');
    acm.buttonWrapperNext.classList.add('h5p-interactive-book-status-arrow', 'h5p-interactive-book-status-button', 'next', 'interactive-navigation-next');
    acm.buttonWrapperNext.setAttribute('aria-label', this.params.l10n.nextPage);
    acm.buttonWrapperNext.setAttribute('title', this.params.l10n.nextPage);
    acm.buttonWrapperNext.onclick = () => {
      this.trigger('seqChapter', {
        direction: 'next',
        toTop: true
      });
    };

    acm.buttonWrapperPrevious.style.border = 'none';
    acm.buttonWrapperNext.style.border = 'none';

    acm.buttonWrapperNext.appendChild(acm.buttonNext);
    if (this.themeData?.bottomNavButtons && !this.isMobileView) {
      acm.buttonWrapperPrevious.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
      acm.buttonPrevious.style.color = this.themeData?.bottomNavButtons?.iconColor;
      
      acm.buttonWrapperNext.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
      acm.buttonNext.style.color = this.themeData?.bottomNavButtons?.iconColor;

      acm.buttonWrapperPrevious.onmouseover = () => {
        acm.buttonWrapperPrevious.style.backgroundColor = this.themeData?.bottomNavButtons?.hover?.backgroundColor;
        acm.buttonPrevious.style.color = this.themeData?.bottomNavButtons?.hover?.iconColor;
      };

      acm.buttonWrapperNext.onmouseover = () => {
        acm.buttonWrapperNext.style.backgroundColor = this.themeData?.bottomNavButtons?.hover?.backgroundColor;
        acm.buttonNext.style.color = this.themeData?.bottomNavButtons?.hover?.iconColor;
      };

      acm.buttonWrapperPrevious.onmouseout = () => {
        acm.buttonWrapperPrevious.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
        acm.buttonPrevious.style.color = this.themeData?.bottomNavButtons?.iconColor;
      };

      acm.buttonWrapperNext.onmouseout = () => {
        acm.buttonWrapperNext.style.backgroundColor = this.themeData?.bottomNavButtons?.backgroundColor;
        acm.buttonNext.style.color = this.themeData?.bottomNavButtons?.iconColor;
      };
    }

    if (this.themeData?.activity?.activityTitle?.mobileExerciseHeader?.buttons && this.isMobileView) {
      const { buttons } = this.themeData.activity.activityTitle.mobileExerciseHeader;
      if (buttons?.backgroundColor) {
        acm.buttonWrapperPrevious.style.backgroundColor = buttons.backgroundColor;
        acm.buttonWrapperNext.style.backgroundColor = buttons.backgroundColor;
      }
      if (buttons?.iconColor) {
        acm.buttonPrevious.style.color = buttons.iconColor;
        acm.buttonNext.style.color = buttons.iconColor;
      }
      acm.buttonWrapperPrevious.onmouseover = () => {
        if (buttons?.hover?.backgroundColor) {
          acm.buttonWrapperPrevious.style.backgroundColor = buttons.hover.backgroundColor;
        }
        if (buttons?.hover?.iconColor) {
          acm.buttonPrevious.style.color = buttons.hover.iconColor;
        }
      };

      acm.buttonWrapperNext.onmouseover = () => {
        if (buttons?.hover?.backgroundColor) {
          acm.buttonWrapperNext.style.backgroundColor = buttons.hover.backgroundColor;
        }
        if (buttons?.hover?.iconColor) {
          acm.buttonNext.style.color = buttons.hover.iconColor;
        }
      };

      acm.buttonWrapperPrevious.onmouseout = () => {
        if (buttons?.backgroundColor) {
          acm.buttonWrapperPrevious.style.backgroundColor = buttons.backgroundColor;
        }
        if (buttons?.iconColor) {
          acm.buttonPrevious.style.color = buttons.iconColor;
        }
      };

      acm.buttonWrapperNext.onmouseout = () => {
        if (buttons?.backgroundColor) {
          acm.buttonWrapperNext.style.backgroundColor = buttons.backgroundColor;
        }
        if (buttons?.iconColor) {
          acm.buttonNext.style.color = buttons.iconColor;
        }
      };
    }

    return acm;
  }

  hasAnyCustomIndex() {
    const toc = this.parent?.params?.tableOfContents || [];
    const customIndex = this.customTocIndex || {};
    return toc.some(item => customIndex[item.activityId] !== undefined && customIndex[item.activityId] !== null);
  }

  /**
   * Add a menu button which hides and shows the navigation bar.
   *
   * @return {HTMLElement} Button node.
   */
  createMenuToggleButton() {
    const button = document.createElement('a');
    button.classList.add('icon-menu');
    let height = generateClampCSS("1.5rem", "1.5rem");
    button.innerHTML = `<div style="height: ${height}; width: ${height};">${menuIcon}</div>`;

    const buttonWrapperMenu = document.createElement('button');
    buttonWrapperMenu.classList.add('h5p-interactive-book-status-menu');
    buttonWrapperMenu.classList.add('h5p-interactive-book-status-button');
    // buttonWrapperMenu.setAttribute('aria-label', this.params.a11y.menu);
    buttonWrapperMenu.setAttribute('aria-expanded', 'false');
    buttonWrapperMenu.setAttribute('aria-controls', 'h5p-interactive-book-navigation-menu');
    buttonWrapperMenu.onclick = () => {
      this.parent.trigger('toggleMenu');
    };

    buttonWrapperMenu.style.border = 'none';
    
    if (this.themeData?.activity?.activityTitle?.mobileExerciseHeader?.buttons && this.isMobileView) {
      const { buttons } = this.themeData.activity.activityTitle.mobileExerciseHeader;
      if (buttons?.backgroundColor) {
        buttonWrapperMenu.style.backgroundColor = buttons.backgroundColor;
      }
      if (buttons?.iconColor) {
        button.style.color = buttons.iconColor;
      }
      buttonWrapperMenu.onmouseover = () => {
        if (buttons?.hover?.backgroundColor) {
          buttonWrapperMenu.style.backgroundColor = buttons.hover.backgroundColor;
        }
        if (buttons?.hover?.iconColor) {
          button.style.color = buttons.hover.iconColor;
        }
      };

      buttonWrapperMenu.onmouseout = () => {
        if (buttons?.backgroundColor) {
          buttonWrapperMenu.style.backgroundColor = buttons.backgroundColor;
        }
        if (buttons?.iconColor) {
          button.style.color = buttons.iconColor;
        }
      };
      
    }

    buttonWrapperMenu.appendChild(button);
    return buttonWrapperMenu;
  }

  /**
   * Check if menu is active/open
   *
   * @return {boolean}
   */
  isMenuOpen() {
    return this.menuToggleButton.classList.contains('h5p-interactive-book-status-menu-active');
  }


  createMainHeader() {
    const header = document.createElement('div');
    header.classList.add('h5p-interactive-book-main-header');
    header.setAttribute('tabindex', '-1');

    if (this.themeData?.header?.backgroundColor) {
      header.style.backgroundColor = this.themeData.header.backgroundColor;
    }
    if (this.themeData?.header?.backgroundImage) {
      header.style.backgroundImage = `url(${H5P.getPath(this.themeData.header.backgroundImage)})`;
    }
    const headerleftContent = document.createElement('div');
    headerleftContent.classList.add('h5p-interactive-book-main-header-left-content');
    // if (this.isMobileView) {
    //   headerleftContent.style.height = generateClampCSS("2.563rem", "2.563rem");
    // } else {
    //   headerleftContent.style.height = generateClampCSS("4rem", "4rem");
    // }

    // Logo
    const logoElement = document.createElement('div');
    logoElement.classList.add('h5p-interactive-book-main-header-logo');
    logoElement.innerHTML = this.isMobileView ? pearsonLogoIconMobile : pearsonLogoIcon;
    // if (this.isMobileView) {
    //   logoElement.style.width = generateClampCSS("3.795rem", "3.795rem");
    //   logoElement.style.height = generateClampCSS("4rem", "4rem");
    // } else {
    //   logoElement.style.width = generateClampCSS("2.438rem", "2.438rem");
    //   logoElement.style.height = generateClampCSS("2.563rem", "2.563rem");
    // }

    const titleLogo = document.createElement('div');
    titleLogo.classList.add('h5p-interactive-book-main-title-logo');


    const logoTitle = document.createElement('div');
    logoTitle.classList.add('h5p-interactive-book-main-header-logo-title');

    /* if (this.params?.bookCover?.coverDescription) {
      const getDescription = this.params?.bookCover?.coverDescription || "Add Description";
      const extractDescription = document.createElement('div');
      extractDescription.innerHTML = getDescription;
      logoTitle.innerHTML = `${this.params.mainTitle} <span class="separator"> | </span> ${extractDescription.textContent}`;
      header.appendChild(logoTitle);
    } */


    // header.appendChild(logoElement);
    // header.appendChild(titleLogo);

    const displayPearsonLogo = this.themeData?.header?.displayPearsonLogo ? this.themeData.header.displayPearsonLogo : true;

    if (displayPearsonLogo) {
      headerleftContent.appendChild(logoElement);
    }
    headerleftContent.appendChild(titleLogo);
    const statusLogoURL = this.themeData?.header?.themeLogo?.logoURL || this.themeData?.header?.levelLogo;
    // const statusLogoWidth = this.isMobileView
    //   ? this.themeData?.header?.themeLogo?.mobile?.logoWidth
    //   : this.themeData?.header?.themeLogo?.logoWidth;
    const statusLogoWidth = this.themeData?.header?.themeLogo?.logoWidth;
    if (statusLogoURL) {
      titleLogo.style.backgroundImage = `url(${H5P.getPath(statusLogoURL)})`;
      if (statusLogoWidth && !this.isMobileView) {
        titleLogo.style.width = statusLogoWidth;
      }
    }
    header.appendChild(headerleftContent);
    
   
    const title = this.params?.bookCover?.courseTitle || "Title";
    const subtitle = this.params?.bookCover?.coverDescription || "Subtitle";
    const tagline = this.params?.bookCover?.coverTagline || "";
    // logoTitle.innerHTML = `${title} <span class="separator"> | </span> ${tagline}`;

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

    logoTitle.appendChild(titleElement);
    if (tagline) {
      logoTitle.appendChild(separatorElement);
      logoTitle.appendChild(taglineElement);
    }

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

    header.appendChild(logoTitle);
    return header;

  }

  createPaginationNumber() {
    const createBoxParentElement = document.createElement('div');
    createBoxParentElement.classList.add('h5p-interactive-book-pagination-box-parent');
    this.PagesContainer = document.createElement('div');
    this.PagesContainer.classList.add('h5p-interactive-book-pagination-box');
    createBoxParentElement.appendChild(this.PagesContainer);

    const homeButton = document.createElement('div');
    homeButton.classList.add('h5p-interactive-book-home-button');
    homeButton.setAttribute('aria-label', 'Home');
    homeButton.innerHTML = '<i class="fa fa-home"></i>';
    homeButton.onclick = () => {
      window.location.hash = '';
      window.location.reload();
    };
    createBoxParentElement.insertBefore(homeButton, createBoxParentElement.firstChild);


    this.updatePagination();
    return createBoxParentElement;
  }

  updatePagination(currentChapter) {
    this.updatePaginationHighlight(getCurrentPaginationNumber);
    this.PagesContainer.innerHTML = '';

    let startPage = Math.max(currentChapter - 2, 1);
    let endPage = Math.min(startPage + 4, this.totalPages);

    if (startPage > 1) {
      const PageElement = document.createElement('div');
      PageElement.classList.add('h5p-interactive-book-pagination-box-number');
      PageElement.textContent = '1';
      PageElement.onclick = () => this.selectPage(1);
      this.PagesContainer.appendChild(PageElement);

      if (startPage > 2) {
        const dots = document.createElement('span');
        dots.classList.add('h5p-interactive-book-pagination-box-number-dots');
        dots.textContent = '...';
        this.PagesContainer.appendChild(dots);
      }
    }

    const getCurrentPaginationNumber = this.parent.getActiveChapter() + 1;

    for (let i = startPage; i <= endPage; i++) {
      const PageElement = document.createElement('div');
      PageElement.classList.add('h5p-interactive-book-pagination-box-number');
      PageElement.id = `h5p-interactive-book-pagination-box-number-${i}`;
      PageElement.textContent = i;
      PageElement.onclick = () => this.selectPage(i);
      if (getCurrentPaginationNumber === PageElement.textContent) { // active pagination number for current chapter
        PageElement.classList.add('pagination-box-number-active');
      }
      else {
        PageElement.classList.remove('pagination-box-number-active');
      }

      this.PagesContainer.appendChild(PageElement);
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        const dots = document.createElement('span');
        dots.classList.add('h5p-interactive-book-pagination-box-number-dots');
        dots.textContent = '...';
        this.PagesContainer.appendChild(dots);
      }
      const PageElement = document.createElement('div');
      PageElement.classList.add('h5p-interactive-book-pagination-box-number');
      PageElement.textContent = this.totalPages;
      PageElement.onclick = () => this.selectPage(this.totalPages);
      this.PagesContainer.appendChild(PageElement);
    }

    this.updatePaginationHighlight(getCurrentPaginationNumber);
  }

  selectPage(pageNumber) {
    this.currentPage = pageNumber;
    this.parent.trigger('newChapter', {
      h5pbookid: this.parent.contentId,
      chapter: `h5p-interactive-book-chapter-${this.parent.chapters[pageNumber - 1].instance.subContentId}`,
      section: 'top'
    });
    const getCurrentPaginationNumber = this.parent.getActiveChapter() + 1;
    this.updatePaginationHighlight(getCurrentPaginationNumber);
  }

  updatePaginationHighlight(currentChapter) {
    const boxes = document.querySelectorAll('.h5p-interactive-book-pagination-box-number');
    boxes && boxes.forEach((box, index) => {
      if (parseInt(box.textContent) === currentChapter) {
        box.classList.add('pagination-box-number-active');
      }
      else {
        box.classList.remove('pagination-box-number-active');
      }
    });
  }

  /**
   * Add progress bar.
   *
   * @return {object} Progress bar elements.
   */
  createProgressBar() {
    const progress = document.createElement('div');
    progress.classList.add('h5p-interactive-book-status-progressbar-front');
    progress.setAttribute('tabindex', '-1');

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-status-progressbar-back');
    wrapper.appendChild(progress);

    return {
      wrapper,
      progress
    };
  }

  /**
   * Add a paragraph which indicates which chapter is active.
   *
   * @return {object} Chapter title elements.
   */
  createChapterTitle() {
    const text = document.createElement('h1');
    text.classList.add('title');

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-status-chapter');
    wrapper.appendChild(text);
    return {
      wrapper,
      text
    };
  }

  /**
   * Add a button which scrolls to the top of the page.
   *
   * @return {HTMLElement} Button.
   */
  createToTopButton() {
    const button = document.createElement('a');
    let height = generateClampCSS("1.5rem", "1.5rem");
    button.innerHTML = `<div style="height: ${height}; width: ${height};"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="9" viewBox="0 0 14 9" fill="none">
    <g clip-path="url(#clip0_8812_6841)">
    <path d="M0.343269 7.04184C0.343269 6.75148 0.453608 6.46319 0.672243 6.24078L6.25866 0.612793C6.46912 0.400688 6.75518 0.28125 7.0535 0.28125C7.35183 0.28125 7.63789 0.400688 7.84835 0.612793L13.4327 6.24079C13.872 6.68353 13.872 7.40016 13.4327 7.8429C12.9934 8.28564 12.2823 8.28564 11.843 7.8429L7.0535 3.01596L2.26398 7.8429C1.82467 8.28564 1.1136 8.28564 0.674285 7.8429C0.455651 7.62256 0.345312 7.3322 0.345312 7.04184L0.343269 7.04184Z" fill="currentColor"/>
    </g>
    <defs>
    <clipPath id="clip0_8812_6841">
    <rect width="7.89319" height="13.4184" fill="currentColor" transform="translate(13.7612 0.28125) rotate(90)"/>
    </clipPath>
    </defs>
    </svg></div>`;
    button.classList.add('navigation-button');

    const wrapper = document.createElement('button');
    wrapper.classList.add('h5p-interactive-book-status-to-top');
    wrapper.classList.add('h5p-interactive-book-status-button');
    wrapper.classList.add('h5p-interactive-book-status-arrow');
    wrapper.setAttribute('aria-label', this.params.l10n.navigateToTop);
    wrapper.addEventListener('click', () => {
      this.parent.trigger('scrollToTop');
      document.querySelector('.h5p-interactive-book-status-menu').focus();
    });

    wrapper.appendChild(button);

    return wrapper;
  }

  /**
   * Set the visibility.
   *
   * @param {boolean} hide True will hide the bar.
   */
  setVisibility(hide) {
    if (hide) {
      this.wrapper.classList.add('footer-hidden');
    }
    else {
      this.wrapper.classList.remove('footer-hidden');
    }
  }

  /**
   * Add a status-button which shows current and total chapters.
   *
   * @return {object} Progress elements.
   */
  createProgressIndicator() {
    const current = document.createElement('span');
    current.classList.add('h5p-interactive-book-status-progress-number');
    current.setAttribute('aria-hidden', 'true');

    const divider = document.createElement('span');
    divider.classList.add('h5p-interactive-book-status-progress-divider');
    divider.innerHTML = ' / ';
    divider.setAttribute('aria-hidden', 'true');

    const total = document.createElement('span');
    total.classList.add('h5p-interactive-book-status-progress-number');
    total.innerHTML = this.totalChapters - 1;
    total.setAttribute('aria-hidden', 'true');

    const hiddenButRead = document.createElement('p');
    hiddenButRead.classList.add('hidden-but-read');

    const progressText = document.createElement('p');
    progressText.classList.add('h5p-interactive-book-status-progress');
    progressText.appendChild(current);
    progressText.appendChild(divider);
    progressText.appendChild(total);
    progressText.appendChild(hiddenButRead);

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-status-progress-wrapper');
    wrapper.appendChild(progressText);
    return {
      wrapper,
      current,
      total,
      divider,
      progressText,
      hiddenButRead
    };
  }

  /**
   * Edit button state on both the top and bottom bar.
   *
   * @param {string} target Prev or Next.
   * @param {boolean} disable True will disable the target button.
   */
  setButtonStatus(target, disable) {
    if (disable) {
      this.arrows['buttonWrapper' + target].setAttribute('disabled', 'disabled');
      this.arrows['button' + target].classList.add('disabled');
    }
    else {
      this.arrows['buttonWrapper' + target].removeAttribute('disabled');
      this.arrows['button' + target].classList.remove('disabled');
    }
  }

  /**
   * Update labels when language changes
   * This refreshes button attributes with new l10n values
   * 
   * @param {Object} l10n - New l10n object with translated strings
   */
  updateLabels(l10n) {
    if (l10n) {
      this.params.l10n = l10n;
    }

    // Update navigation arrows if they exist
    if (this.arrows) {
      if (this.arrows.buttonWrapperPrevious) {
        const prevLabel = this.params.l10n?.previousPage || 'Previous Page';
        this.arrows.buttonWrapperPrevious.setAttribute('aria-label', prevLabel);
        this.arrows.buttonWrapperPrevious.setAttribute('title', prevLabel);
      }

      if (this.arrows.buttonWrapperNext) {
        const nextLabel = this.params.l10n?.nextPage || 'Next Page';
        this.arrows.buttonWrapperNext.setAttribute('aria-label', nextLabel);
        this.arrows.buttonWrapperNext.setAttribute('title', nextLabel);
      }
    }

    // console.log('[StatusBar] Labels updated with new l10n:', this.params.l10n?.nextPage);
  }

}
export default StatusBar;
