import {
  recallLayersIcon,
  recallEyeOnIcon,
  recallEyeOffIcon,
  recallInfoIcon,
  recallChevronDownIcon,
  recallTitleBarChevronIcon
} from '../../scripts/icons';
import { generateClampCSS } from '../../scripts/utils';

/**
 * RecallAccordion — factory function (functional style)
 *
 * Displays a collapsible panel just above an activity card.  The panel shows
 * the completed answer state recalled from a linked activity.
 *
 * Two-flag design
 * ───────────────
 *  SHOW flag    → per-activity:  content.params.recallActivity.enabled = true
 *                 Decides whether this accordion element is rendered at all.
 *                 Set on the activity that SHOWS recalled content.
 *
 *  ENABLE flag  → driven by recallMapping.js:
 *                 A separate { activityId → linkedActivityId } map defines
 *                 which source activity must be COMPLETED before this accordion
 *                 becomes clickable.  The map is maintained in one place and
 *                 is independent of individual activity params.
 *
 * Lifecycle:
 *  1. Created by PageContent during chapter initialisation (when SHOW flag is true).
 *  2. Starts disabled; linkedActivityId is resolved from recallMapping.js.
 *  3. Becomes enabled when the parent InteractiveBook fires the
 *     'recallActivityCompleted' event carrying the matching linkedActivityId.
 *  4. When enabled and expanded, `onExpand` callback is called so the caller
 *     can inject the actual recalled content into the panel.
 *
 * @param {object}   options
 * @param {string}   options.linkedActivityId      - activityId of the source
 * @param {string}   [options.linkedActivityTitle] - Human-readable label
 * @param {boolean}  [options.isInitiallyEnabled]  - true if already completed
 * @param {Function} [options.onExpand]            - Called when panel opens;
 *                   receives a container HTMLElement, should inject content
 * @param {object}   [options.themeData]           - Book theme config
 * @param {boolean}  [options.isMobile]            - true on mobile/small screen
 * @param {object}   options.parent                - InteractiveBook instance
 *
 * @returns {{ getElement: () => HTMLElement, enable: () => void, disable: () => void }}
 */
const RecallAccordion = ({
  linkedActivityId,
  linkedActivityTitle,
  isInitiallyEnabled = false,
  onExpand = null,
  themeData = {},
  l10n = {},
  isMobile = false,
  parent,
}) => {
  // ─── Closed-over state ─────────────────────────────────────────────────────
  let isEnabled = isInitiallyEnabled;
  let isExpanded = false;
  let contentPopulated = false;
  let isViewMore = false; // false = collapsed to MAX_PANEL_HEIGHT, true = fully expanded

  // ✅ MOBILE RESPONSIVE: No fixed height on mobile (content-driven), 600px max on desktop
  const MAX_PANEL_HEIGHT = isMobile ? null : 600; // px — panel is clamped to this on desktop; "View more" reveals the rest

  // ─── Build DOM ─────────────────────────────────────────────────────────────
  const title = linkedActivityTitle || linkedActivityId;
  const panelId = `recall-panel-${linkedActivityId}`;

  const wrapper = document.createElement('div');
  wrapper.classList.add('recall-accordion');
  wrapper.dataset.linkedActivityId = linkedActivityId;

  // ── Always-visible title bar (static, never hidden) ───────────────────────
  const titleBar = document.createElement('div');
  titleBar.classList.add('recall-accordion__title-bar');
  titleBar.style.paddingBlock = generateClampCSS('0.75rem', '0.75rem');
  titleBar.style.paddingInline = generateClampCSS('1rem', '1rem');
  titleBar.style.gap = generateClampCSS('0.5rem', '0.5rem');
  
  // Local alias for activity recall title theming
  const recallTitleTheme = themeData?.activityRecall?.recallActivityTitle || {};

  // Apply theme background color to title bar
  if (recallTitleTheme.bgColor) {
    titleBar.style.backgroundColor = recallTitleTheme.bgColor;
  }

  // Left: layers icon
  const titleBarIcon = document.createElement('span');
  titleBarIcon.classList.add('recall-accordion__icon');
  titleBarIcon.setAttribute('aria-hidden', 'true');
  titleBarIcon.innerHTML = recallLayersIcon;
  
  // Apply theme to recall icon
  if (recallTitleTheme?.recallIcon) {
    const iconTheme = recallTitleTheme.recallIcon;
    if (iconTheme.iconColor) titleBarIcon.style.color = iconTheme.iconColor;
    if (iconTheme.bgColor) titleBarIcon.style.backgroundColor = iconTheme.bgColor;
  }

  // Center: title + subtitle
  const titleBarText = document.createElement('span');
  titleBarText.classList.add('recall-accordion__header-text');
  titleBarText.style.gap = generateClampCSS('0.5rem', '0.5rem');

  const titleEl = document.createElement('span');
  titleEl.classList.add('recall-accordion__title');
  titleEl.textContent = l10n?.recallTitle || 'Previous answers';
  
  // Apply theme to previousAnswers (title)
  if (recallTitleTheme?.previousAnswers) {
    const prevAnswersTheme = recallTitleTheme.previousAnswers;
    if (isMobile && prevAnswersTheme.mobile?.fontSize) titleEl.style.fontSize = generateClampCSS(prevAnswersTheme.mobile.fontSize, prevAnswersTheme.mobile.fontSize);
    else if (prevAnswersTheme.fontSize) titleEl.style.fontSize = generateClampCSS(prevAnswersTheme.fontSize, prevAnswersTheme.fontSize);
    if (prevAnswersTheme.fontWeight) titleEl.style.fontWeight = prevAnswersTheme.fontWeight;
    if (prevAnswersTheme.fontColor) titleEl.style.color = prevAnswersTheme.fontColor;
    if (prevAnswersTheme.fontFamily) titleEl.style.fontFamily = prevAnswersTheme.fontFamily;
  }

  const subtitleEl = document.createElement('span');
  subtitleEl.classList.add('recall-accordion__subtitle');
  // title now contains formatted string like "Activity 1 - Reading"
  subtitleEl.textContent = title;
  
  // Apply theme to exercise (subtitle)
  if (recallTitleTheme?.exercise) {
    const exerciseTheme = recallTitleTheme.exercise;
    if (isMobile && exerciseTheme.mobile?.fontSize) subtitleEl.style.fontSize = generateClampCSS(exerciseTheme.mobile.fontSize, exerciseTheme.mobile.fontSize);
    else if (exerciseTheme.fontSize) subtitleEl.style.fontSize = generateClampCSS(exerciseTheme.fontSize, exerciseTheme.fontSize);
    if (exerciseTheme.fontWeight) subtitleEl.style.fontWeight = exerciseTheme.fontWeight;
    if (exerciseTheme.fontColor) subtitleEl.style.color = exerciseTheme.fontColor;
    if (exerciseTheme.fontFamily) subtitleEl.style.fontFamily = exerciseTheme.fontFamily;
  }

  titleBarText.appendChild(titleEl);
  titleBarText.appendChild(subtitleEl);

  // Right: Show/Hide toggle group (always visible trigger)
  const toggleGroup = document.createElement('span');
  toggleGroup.classList.add('recall-accordion__toggle-group');
  toggleGroup.style.paddingBlock = generateClampCSS('0.75rem', '0.75rem');
  toggleGroup.style.paddingInline = '0';
  toggleGroup.style.gap = generateClampCSS('0.5rem', '0.5rem');

  // Eye icon references (imported from icons.js)
  const toggleEyeIcon = document.createElement('span');
  toggleEyeIcon.classList.add('recall-accordion__toggle-eye');
  toggleEyeIcon.setAttribute('aria-hidden', 'true');
  toggleEyeIcon.innerHTML = recallEyeOnIcon; // starts as Show (eye-on)
  
  // The theme structure was reworked: eye icon settings now live under `showHide`.
  const showHideIcons = themeData?.activityRecall?.showHide || {};
  const openIconTheme = showHideIcons?.eyeicon_open || {};
  const closedIconTheme = showHideIcons?.eyeicon_closed || {};

  if (openIconTheme.bgColor) {
    toggleEyeIcon.style.backgroundColor = openIconTheme.bgColor;
  }
  if (openIconTheme.iconColor) {
    toggleEyeIcon.style.color = openIconTheme.iconColor;
  }

  // Store theme colors for toggling between open/closed states
  toggleEyeIcon.dataset.openBgColor = openIconTheme.bgColor || '';
  toggleEyeIcon.dataset.openIconColor = openIconTheme.iconColor || '';
  toggleEyeIcon.dataset.closedBgColor = closedIconTheme.bgColor || '';
  toggleEyeIcon.dataset.closedIconColor = closedIconTheme.iconColor || '';

  // Store hover colors for both states
  toggleEyeIcon.dataset.openHoverBgColor = openIconTheme?.hover?.bgColor || '';
  toggleEyeIcon.dataset.openHoverIconColor = openIconTheme?.hover?.iconColor || '';
  toggleEyeIcon.dataset.closedHoverBgColor = closedIconTheme?.hover?.bgColor || '';
  toggleEyeIcon.dataset.closedHoverIconColor = closedIconTheme?.hover?.iconColor || '';
  
  // Track current state for hover handling
  toggleEyeIcon.dataset.currentState = 'open'; // starts as open (Show state)
  
  // Apply hover effects
  toggleEyeIcon.addEventListener('mouseenter', () => {
    const isOpen = toggleEyeIcon.dataset.currentState === 'open';
    const hoverBgColor = isOpen ? toggleEyeIcon.dataset.openHoverBgColor : toggleEyeIcon.dataset.closedHoverBgColor;
    const hoverIconColor = isOpen ? toggleEyeIcon.dataset.openHoverIconColor : toggleEyeIcon.dataset.closedHoverIconColor;
    
    if (hoverBgColor) toggleEyeIcon.style.backgroundColor = hoverBgColor;
    if (hoverIconColor) toggleEyeIcon.style.color = hoverIconColor;
  });
  
  toggleEyeIcon.addEventListener('mouseleave', () => {
    const isOpen = toggleEyeIcon.dataset.currentState === 'open';
    const normalBgColor = isOpen ? toggleEyeIcon.dataset.openBgColor : toggleEyeIcon.dataset.closedBgColor;
    const normalIconColor = isOpen ? toggleEyeIcon.dataset.openIconColor : toggleEyeIcon.dataset.closedIconColor;
    
    if (normalBgColor) {
      toggleEyeIcon.style.backgroundColor = normalBgColor;
    } 
    else {
      toggleEyeIcon.style.backgroundColor = '';
    }
    
    if (normalIconColor) {
      toggleEyeIcon.style.color = normalIconColor;
    } 
    else {
      toggleEyeIcon.style.color = '';
    }
  });

  const toggleLabel = document.createElement('span');
  toggleLabel.classList.add('recall-accordion__toggle-label');
  toggleLabel.textContent = l10n?.recallShow || 'Show';

  // Apply typography theme for the Show/Hide label (supports mobile override)
  const showHideTextTheme = themeData?.activityRecall?.showHide?.showHideText;
  if (showHideTextTheme) {
    const showHideFontSize = isMobile ? showHideTextTheme.mobile?.fontSize || showHideTextTheme.fontSize : showHideTextTheme.fontSize;
    if (showHideFontSize) toggleLabel.style.fontSize = generateClampCSS(showHideFontSize, showHideFontSize);
    if (showHideTextTheme.fontWeight) toggleLabel.style.fontWeight = showHideTextTheme.fontWeight;
    if (showHideTextTheme.fontColor) toggleLabel.style.color = showHideTextTheme.fontColor;
    if (showHideTextTheme.fontFamily) toggleLabel.style.fontFamily = showHideTextTheme.fontFamily;
  }

  const chevron = document.createElement('span');
  chevron.classList.add('recall-accordion__chevron');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = recallTitleBarChevronIcon;

  toggleGroup.appendChild(toggleEyeIcon);
  toggleGroup.appendChild(toggleLabel);
  toggleGroup.appendChild(chevron);

  titleBar.appendChild(titleBarIcon);
  titleBar.appendChild(titleBarText);

  // ── Panel / body ──────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.classList.add('recall-accordion__panel');
  panel.setAttribute('role', 'region');
  panel.id = panelId;
  panel.style.paddingBlock = generateClampCSS('0.75rem', '0.75rem');
  panel.style.paddingInline = generateClampCSS('1.25rem', '1.25rem');

  // Content area (recalled content injected here via onExpand)
  const contentArea = document.createElement('div');
  contentArea.classList.add('recall-accordion__content');

  // Read-only note — small info line at the top of the content wrapper
  const readonlyNote = document.createElement('div');
  readonlyNote.classList.add('recall-accordion__readonly-note');
  readonlyNote.style.paddingBlock = generateClampCSS('0.5rem', '0.5rem');
  readonlyNote.style.paddingInline = '0';
  readonlyNote.style.gap = generateClampCSS('0.625rem', '0.625rem');
  const readonlyNoteIcon = document.createElement('span');
  readonlyNoteIcon.classList.add('recall-accordion__readonly-icon');
  readonlyNoteIcon.setAttribute('aria-hidden', 'true');
  readonlyNoteIcon.innerHTML = recallInfoIcon;
  const readonlyNoteText = document.createElement('span');
  readonlyNoteText.textContent = l10n?.recallReadonlyNote || 'This is a read-only view of your completed work';
  readonlyNote.appendChild(readonlyNoteIcon);
  readonlyNote.appendChild(readonlyNoteText);

  // Apply show/hide message
  const messageTheme = showHideTextTheme?.message || {};

  // Override with more specific show/hide message styles when present
  if (isMobile && messageTheme.mobile?.fontSize) readonlyNote.style.fontSize = generateClampCSS(messageTheme.mobile.fontSize, messageTheme.mobile.fontSize);
  else if (messageTheme.fontSize) readonlyNote.style.fontSize = generateClampCSS(messageTheme.fontSize, messageTheme.fontSize);
  if (messageTheme.fontWeight) readonlyNote.style.fontWeight = messageTheme.fontWeight;
  if (messageTheme.fontColor) readonlyNote.style.color = messageTheme.fontColor;
  if (messageTheme.fontFamily) readonlyNote.style.fontFamily = messageTheme.fontFamily;

  // Content wrapper — the visual bordered box, always visible
  const contentWrapper = document.createElement('div');
  contentWrapper.classList.add('recall-accordion__content-wrapper');
  contentWrapper.style.paddingBlock = '0';
  contentWrapper.style.paddingInline = generateClampCSS('1.25rem', '1.25rem');
  contentArea.insertBefore(readonlyNote, contentArea.firstChild);
  // toggleGroup is first child inside the border; contentArea collapses/expands below it
  contentWrapper.appendChild(toggleGroup);
  contentWrapper.appendChild(contentArea);
  contentArea.setAttribute('hidden', ''); // starts collapsed
  // viewToggleBtn will be appended to contentWrapper after its definition below

  panel.appendChild(contentWrapper);

  // ── View more / View less button ──────────────────────────────────────────
  const viewToggleBtn = document.createElement('button');
  viewToggleBtn.classList.add('recall-accordion__view-toggle');
  viewToggleBtn.setAttribute('type', 'button');
  viewToggleBtn.setAttribute('hidden', ''); // shown only when content overflows MAX_PANEL_HEIGHT
  viewToggleBtn.style.padding = generateClampCSS('0.75rem', '0.75rem');
  viewToggleBtn.innerHTML = `
    <span class="recall-accordion__view-toggle-label">${l10n?.recallViewMore || 'View more'}</span>
    <span class="recall-accordion__view-toggle-chevron" aria-hidden="true">
      ${recallChevronDownIcon}
    </span>`;

  // viewToggleBtn is appended to contentWrapper after its definition below

  wrapper.appendChild(titleBar);
  wrapper.appendChild(panel); // panel always shown — never hidden

  contentWrapper.appendChild(viewToggleBtn);

  // ─── View more / less helpers ──────────────────────────────────────────────
  const applyViewMoreState = () => {
    const label = viewToggleBtn.querySelector('.recall-accordion__view-toggle-label');
    const chevronEl = viewToggleBtn.querySelector('.recall-accordion__view-toggle-chevron');
    if (isViewMore) {
      // Fully expanded — remove height cap
      contentArea.style.maxHeight = '';
      panel.classList.add('recall-accordion__panel--view-more');
      if (label) label.textContent = l10n?.recallViewLess || 'View less';
      if (chevronEl) chevronEl.classList.add('recall-accordion__view-toggle-chevron--up');
    }
    else {
      // ✅ MOBILE: No max-height on mobile (content-driven), clamped to 600px on desktop
      if (MAX_PANEL_HEIGHT) {
        contentArea.style.maxHeight = `${MAX_PANEL_HEIGHT}px`;
      } 
      else {
        contentArea.style.maxHeight = ''; // Mobile: fully expanded by default
      }
      panel.classList.remove('recall-accordion__panel--view-more');
      if (label) label.textContent = l10n?.recallViewMore || 'View more';
      if (chevronEl) chevronEl.classList.remove('recall-accordion__view-toggle-chevron--up');
    }
    parent?.trigger('resize');
  };

  const checkOverflow = () => {
    // ✅ MOBILE: Skip overflow check on mobile (no View More/Less needed - content is fully expanded)
    if (!MAX_PANEL_HEIGHT) {
      viewToggleBtn.setAttribute('hidden', '');
      contentArea.style.maxHeight = '';
      return;
    }
    
    // Desktop: Show the view-toggle button only when content actually overflows the cap.
    requestAnimationFrame(() => {
      const scrollH = contentArea.scrollHeight;
      if (scrollH > MAX_PANEL_HEIGHT) {
        viewToggleBtn.removeAttribute('hidden');
        if (!isViewMore) {
          contentArea.style.maxHeight = `${MAX_PANEL_HEIGHT}px`;
        }
      }
      else {
        viewToggleBtn.setAttribute('hidden', '');
        contentArea.style.maxHeight = '';
      }
    });
  };

  viewToggleBtn.addEventListener('click', () => {
    isViewMore = !isViewMore;
    applyViewMoreState();
  });

  // ─── Internal actions ──────────────────────────────────────────────────────
  const expand = () => {
    isExpanded = true;
    panel.removeAttribute('hidden'); // keep for aria compat
    contentArea.removeAttribute('hidden');
    viewToggleBtn.removeAttribute('hidden'); // restore view-toggle visibility (checkOverflow may re-hide)
    wrapper.classList.add('recall-accordion--expanded');
    toggleLabel.textContent = l10n?.recallHide || 'Hide';
    toggleEyeIcon.innerHTML = recallEyeOffIcon;
    
    // Update current state for hover handling
    toggleEyeIcon.dataset.currentState = 'closed';
    
    // Apply closed eye theme colors
    if (toggleEyeIcon.dataset.closedBgColor) {
      toggleEyeIcon.style.backgroundColor = toggleEyeIcon.dataset.closedBgColor;
    }
    if (toggleEyeIcon.dataset.closedIconColor) {
      toggleEyeIcon.style.color = toggleEyeIcon.dataset.closedIconColor;
    }

    if (!contentPopulated && typeof onExpand === 'function') {
      onExpand(contentArea);
      contentPopulated = true;
    }

    // Reset view-more to collapsed state each time the accordion opens.
    isViewMore = false;
    applyViewMoreState();
    checkOverflow();

    // Let the H5P iframe resize to accommodate the expanded accordion.
    parent?.trigger('resize');
  };

  const collapse = () => {
    isExpanded = false;
    // header.setAttribute('aria-expanded', 'false');
    contentArea.setAttribute('hidden', '');
    viewToggleBtn.setAttribute('hidden', '');
    wrapper.classList.remove('recall-accordion--expanded');
    toggleLabel.textContent = l10n?.recallShow || 'Show';
    toggleEyeIcon.innerHTML = recallEyeOnIcon;
    
    // Update current state for hover handling
    toggleEyeIcon.dataset.currentState = 'open';
    
    // Apply open eye theme colors
    if (toggleEyeIcon.dataset.openBgColor) {
      toggleEyeIcon.style.backgroundColor = toggleEyeIcon.dataset.openBgColor;
    }
    if (toggleEyeIcon.dataset.openIconColor) {
      toggleEyeIcon.style.color = toggleEyeIcon.dataset.openIconColor;
    }

    // Reset view-more so next open always starts collapsed.
    isViewMore = false;

    // Restore the iframe to its compact height after collapsing.
    parent?.trigger('resize');
  };

  const setEnabled = (enabled) => {
    isEnabled = enabled;
    if (enabled) {
      // header.removeAttribute('disabled');
      wrapper.classList.remove('recall-accordion--disabled');
      wrapper.classList.add('recall-accordion--enabled');

      // Auto-open on desktop when accordion first becomes enabled.
      if (!isMobile && !isExpanded) {
        expand();
      }
    }
    else {
      // header.setAttribute('disabled', 'disabled');
      wrapper.classList.add('recall-accordion--disabled');
      wrapper.classList.remove('recall-accordion--enabled');
      if (isExpanded) collapse();
    }
  };

  // ─── Theme ─────────────────────────────────────────────────────────────────
  // Apply the book's common font family to the whole accordion so header text
  // and panel content match the surrounding lesson typography.
  const bodyFont = themeData?.fontFamily || 'Open Sans, sans-serif';
  wrapper.style.fontFamily = bodyFont;

  // ─── Toggle: only the toggleGroup button triggers expand/collapse ──────────────────
  toggleGroup.addEventListener('click', () => {
    if (!isEnabled) return;
    isExpanded ? collapse() : expand();
  });

  // ─── Apply initial enabled state ───────────────────────────────────────────
  if (isEnabled) {
    setEnabled(true);
  }

  // ─── Listen for linked-activity completion ─────────────────────────────────
  // (Replaced by a direct .enable() call from app.js — no event listener needed)
  // if (parent && typeof parent.on === 'function') {
  //   parent.on('recallActivityCompleted', (event) => {
  //     if (event?.data?.activityId === linkedActivityId) {
  //       setEnabled(true);
  //     }
  //   });
  // }

  // ─── Public API ────────────────────────────────────────────────────────────
  return {
    /** Returns the root DOM element. Inject this into the chapter node. */
    getElement: () => wrapper,
    /** Programmatically enable the accordion (linked activity completed). */
    enable: () => setEnabled(true),
    /** Programmatically disable the accordion. */
    disable: () => setEnabled(false),
    /** Collapse the accordion (e.g. when navigating away and back). */
    collapse: () => { 
      if (isExpanded) collapse(); 
    },
    /** Expand the accordion if it is currently enabled and not already expanded (desktop only). */
    expandIfEnabled: () => { 
      if (isEnabled && !isExpanded && !isMobile) expand(); 
    },
    /**
     * Re-render the recalled content (e.g. after the source activity state changed).
     * Clears the content area and calls onExpand again if the accordion is expanded.
     */
    refresh: () => {
      contentPopulated = false;
      contentArea.innerHTML = '';
      if (isExpanded && typeof onExpand === 'function') {
        onExpand(contentArea);
        contentPopulated = true;
        checkOverflow();
        parent?.trigger('resize');
      }
    },
  };
};

export default RecallAccordion;

