import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  recallLayersIcon,
  recallEyeOnIcon,
  recallEyeOffIcon,
  recallInfoIcon,
  recallChevronDownIcon,
  recallTitleBarChevronIcon
} from '../../../scripts/icons';
import { generateClampCSS } from '../../../scripts/utils';

/**
 * RecallAccordionReact
 * 
 * React view for the Recall Accordion.
 * DOM structure matches the vanilla RecallAccordion.js exactly:
 *
 * wrapper (.recall-accordion)
 * ├── titleBar (.recall-accordion__title-bar)
 * │   ├── titleBarIcon (.recall-accordion__icon)
 * │   └── titleBarText (.recall-accordion__header-text)
 * │       ├── titleEl (.recall-accordion__title)
 * │       └── subtitleEl (.recall-accordion__subtitle)
 * └── panel (.recall-accordion__panel)
 *     └── contentWrapper (.recall-accordion__content-wrapper)
 *         ├── toggleGroup (.recall-accordion__toggle-group)   ← INSIDE contentWrapper
 *         ├── contentArea (.recall-accordion__content)
 *         │   ├── readonlyNote (.recall-accordion__readonly-note)  ← INSIDE contentArea
 *         │   └── ... recalled content ...
 *         └── viewToggleBtn (.recall-accordion__view-toggle)
 */
const RecallAccordionReact = ({
  linkedActivityId,
  linkedActivityTitle,
  themeData,
  l10n,
  isMobile,
  parent,
  prevChapter
}) => {
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [isViewMore, setIsViewMore] = useState(false);
  const [showViewToggle, setShowViewToggle] = useState(false);
  const [isEyeHovered, setIsEyeHovered] = useState(false);
  const contentAreaRef = useRef(null);
  const contentPopulatedRef = useRef(false);

  const MAX_PANEL_HEIGHT = isMobile ? null : 600;

  // Render the recall activity into the content area using the vanilla JS method
  useEffect(() => {
    if (isExpanded && contentAreaRef.current && !contentPopulatedRef.current && parent?.pageContent?.renderRecallActivity) {
      contentAreaRef.current.innerHTML = '';
      parent.pageContent.renderRecallActivity(contentAreaRef.current, prevChapter);
      contentPopulatedRef.current = true;
      parent?.trigger('resize');
    }
  }, [isExpanded, prevChapter, parent]);

  const checkOverflow = useCallback(() => {
    if (!MAX_PANEL_HEIGHT || !contentAreaRef.current) {
      setShowViewToggle(false);
      return;
    }
    requestAnimationFrame(() => {
      if (!contentAreaRef.current) return;
      const scrollH = contentAreaRef.current.scrollHeight;
      setShowViewToggle(scrollH > MAX_PANEL_HEIGHT);
    });
  }, [MAX_PANEL_HEIGHT]);

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(checkOverflow, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, checkOverflow]);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
    setIsViewMore(false);
    setTimeout(() => parent?.trigger('resize'), 50);
  };

  const toggleViewMore = () => {
    setIsViewMore(prev => !prev);
    setTimeout(() => parent?.trigger('resize'), 50);
  };

  // ─── Theme Extraction ───────────────────────────────────────────────────
  const bodyFont = themeData?.fontFamily || 'Open Sans, sans-serif';
  const recallTitleTheme = themeData?.activityRecall?.recallActivityTitle || {};
  const showHideIcons = themeData?.activityRecall?.showHide || {};
  const showHideTextTheme = themeData?.activityRecall?.showHide?.showHideText;
  const messageTheme = showHideTextTheme?.message || {};

  // Title Bar
  const titleBarBgColor = recallTitleTheme.bgColor || undefined;
  const iconTheme = recallTitleTheme.recallIcon || {};

  // Title Text
  const prevAnswersTheme = recallTitleTheme.previousAnswers || {};
  const titleFontSize = isMobile && prevAnswersTheme.mobile?.fontSize
    ? prevAnswersTheme.mobile.fontSize : prevAnswersTheme.fontSize;

  // Subtitle Text
  const exerciseTheme = recallTitleTheme.exercise || {};
  const subtitleFontSize = isMobile && exerciseTheme.mobile?.fontSize
    ? exerciseTheme.mobile.fontSize : exerciseTheme.fontSize;

  // Eye Icon — open vs closed theme
  const openIconTheme = showHideIcons?.eyeicon_open || {};
  const closedIconTheme = showHideIcons?.eyeicon_closed || {};
  const currentEyeTheme = isExpanded ? closedIconTheme : openIconTheme;

  let eyeBgColor = currentEyeTheme.bgColor;
  let eyeIconColor = currentEyeTheme.iconColor;
  if (isEyeHovered && currentEyeTheme.hover) {
    eyeBgColor = currentEyeTheme.hover.bgColor || eyeBgColor;
    eyeIconColor = currentEyeTheme.hover.iconColor || eyeIconColor;
  }

  // Show/Hide Label
  const showHideFontSize = isMobile && showHideTextTheme?.mobile?.fontSize
    ? showHideTextTheme.mobile.fontSize : showHideTextTheme?.fontSize;

  // Readonly Note
  const readonlyFontSize = isMobile && messageTheme.mobile?.fontSize
    ? messageTheme.mobile.fontSize : messageTheme.fontSize;

  // Content max height
  let contentMaxHeight = undefined;
  if (!isViewMore && MAX_PANEL_HEIGHT && isExpanded) {
    contentMaxHeight = `${MAX_PANEL_HEIGHT}px`;
  }

  return (
    <div
      className={`recall-accordion recall-accordion--enabled ${isExpanded ? 'recall-accordion--expanded' : ''}`}
      data-linked-activity-id={linkedActivityId}
      style={{ fontFamily: bodyFont }}
    >
      {/* ── Title Bar ── (icon + text only, NO toggleGroup here) */}
      <div
        className="recall-accordion__title-bar"
        style={{
          paddingBlock: generateClampCSS('0.75rem', '0.75rem'),
          paddingInline: generateClampCSS('1rem', '1rem'),
          gap: generateClampCSS('0.5rem', '0.5rem'),
          backgroundColor: titleBarBgColor
        }}
      >
        <span
          className="recall-accordion__icon"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: recallLayersIcon }}
          style={{ color: iconTheme.iconColor, backgroundColor: iconTheme.bgColor }}
        />
        <span
          className="recall-accordion__header-text"
          style={{ gap: generateClampCSS('0.5rem', '0.5rem') }}
        >
          <span
            className="recall-accordion__title"
            style={{
              fontSize: titleFontSize ? generateClampCSS(titleFontSize, titleFontSize) : undefined,
              fontWeight: prevAnswersTheme.fontWeight,
              color: prevAnswersTheme.fontColor,
              fontFamily: prevAnswersTheme.fontFamily
            }}
          >
            {l10n?.recallTitle || 'Previous answers'}
          </span>
          <span
            className="recall-accordion__subtitle"
            style={{
              fontSize: subtitleFontSize ? generateClampCSS(subtitleFontSize, subtitleFontSize) : undefined,
              fontWeight: exerciseTheme.fontWeight,
              color: exerciseTheme.fontColor,
              fontFamily: exerciseTheme.fontFamily
            }}
          >
            {linkedActivityTitle || linkedActivityId}
          </span>
        </span>
      </div>

      {/* ── Panel ── (always visible, never hidden) */}
      <div
        className={`recall-accordion__panel ${isViewMore ? 'recall-accordion__panel--view-more' : ''}`}
        role="region"
        id={`recall-panel-${linkedActivityId}`}
        style={{
          paddingBlock: generateClampCSS('0.75rem', '0.75rem'),
          paddingInline: generateClampCSS('1.25rem', '1.25rem')
        }}
      >
        {/* ── Content Wrapper ── (bordered box) */}
        <div
          className="recall-accordion__content-wrapper"
          style={{
            paddingBlock: '0',
            paddingInline: generateClampCSS('1.25rem', '1.25rem')
          }}
        >
          {/* ── Toggle Group ── FIRST child inside contentWrapper */}
          <span
            className="recall-accordion__toggle-group"
            onClick={toggleExpand}
            style={{
              paddingBlock: generateClampCSS('0.75rem', '0.75rem'),
              paddingInline: '0',
              gap: generateClampCSS('0.5rem', '0.5rem')
            }}
          >
            <span
              className="recall-accordion__toggle-eye"
              aria-hidden="true"
              onMouseEnter={() => setIsEyeHovered(true)}
              onMouseLeave={() => setIsEyeHovered(false)}
              dangerouslySetInnerHTML={{ __html: isExpanded ? recallEyeOffIcon : recallEyeOnIcon }}
              style={{ backgroundColor: eyeBgColor, color: eyeIconColor }}
            />
            <span
              className="recall-accordion__toggle-label"
              style={{
                fontSize: showHideFontSize ? generateClampCSS(showHideFontSize, showHideFontSize) : undefined,
                fontWeight: showHideTextTheme?.fontWeight,
                color: showHideTextTheme?.fontColor,
                fontFamily: showHideTextTheme?.fontFamily
              }}
            >
              {isExpanded ? (l10n?.recallHide || 'Hide') : (l10n?.recallShow || 'Show')}
            </span>
            <span
              className="recall-accordion__chevron"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: recallTitleBarChevronIcon }}
            />
          </span>

          {/* ── Content Area ── (collapses/expands; readonlyNote is INSIDE) */}
          <div
            className="recall-accordion__content"
            ref={contentAreaRef}
            hidden={!isExpanded}
            style={{ maxHeight: contentMaxHeight, overflow: contentMaxHeight ? 'hidden' : undefined }}
          >
            {/* readonlyNote is first child inside contentArea */}
            <div
              className="recall-accordion__readonly-note"
              style={{
                paddingBlock: generateClampCSS('0.5rem', '0.5rem'),
                paddingInline: '0',
                gap: generateClampCSS('0.625rem', '0.625rem'),
                fontSize: readonlyFontSize ? generateClampCSS(readonlyFontSize, readonlyFontSize) : undefined,
                fontWeight: messageTheme.fontWeight,
                color: messageTheme.fontColor,
                fontFamily: messageTheme.fontFamily
              }}
            >
              <span
                className="recall-accordion__readonly-icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: recallInfoIcon }}
              />
              <span>{l10n?.recallReadonlyNote || 'This is a read-only view of your completed work'}</span>
            </div>
            {/* recalled H5P content gets injected here by useEffect via ref */}
          </div>

          {/* ── View More/Less Button ── last child of contentWrapper */}
          {showViewToggle && isExpanded && (
            <button
              className="recall-accordion__view-toggle"
              type="button"
              onClick={toggleViewMore}
              style={{ padding: generateClampCSS('0.75rem', '0.75rem') }}
            >
              <span className="recall-accordion__view-toggle-label">
                {isViewMore ? (l10n?.recallViewLess || 'View less') : (l10n?.recallViewMore || 'View more')}
              </span>
              <span
                className={`recall-accordion__view-toggle-chevron ${isViewMore ? 'recall-accordion__view-toggle-chevron--up' : ''}`}
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: recallChevronDownIcon }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecallAccordionReact;
