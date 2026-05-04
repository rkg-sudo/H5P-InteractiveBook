import React, { useState } from 'react';
import { generateClampCSS } from '../../../scripts/utils';

/**
 * RecallBlockOverlayReact
 * 
 * View component for the blocking overlay shown over a chapter when its 
 * linked recall activity has not been completed yet.
 */
const RecallBlockOverlayReact = ({
  linkedActivityId,
  linkedActivityTitle,
  themeData,
  l10n,
  isMobile,
  parent,
  chapterIndex
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Apply popup theme font family
  const fontFamily = themeData?.activityRecall?.recallPopup?.fontFamily || 'inherit';

  // Apply recall popup title theme
  const popupTitleTheme = themeData?.activityRecall?.recallPopup?.title;
  const titleFontSize = popupTitleTheme ? 
    (isMobile ? popupTitleTheme.mobile?.fontSize || popupTitleTheme.fontSize : popupTitleTheme.fontSize) 
    : undefined;

  // Apply recall popup message theme
  const popupMessageTheme = themeData?.activityRecall?.recallPopup?.message;
  const messageFontSize = popupMessageTheme ? 
    (isMobile ? popupMessageTheme.mobile?.fontSize || popupMessageTheme.fontSize : popupMessageTheme.fontSize) 
    : undefined;

  // Apply theme to "Go to Activity" button
  const btnTheme = themeData?.activityRecall?.recallPopup?.activityButton;
  const btnFontSize = btnTheme ? 
    (isMobile && btnTheme.mobile?.fontSize ? btnTheme.mobile.fontSize : btnTheme.fontSize) 
    : undefined;

  const btnBgColor = isHovered && btnTheme?.hover?.bgColor ? btnTheme.hover.bgColor : btnTheme?.bgColor;
  const btnFontColor = isHovered && btnTheme?.hover?.fontColor ? btnTheme.hover.fontColor : btnTheme?.fontColor;

  const handleGoToActivity = () => {
    const prevChapterIndex = chapterIndex - 1;
    if (prevChapterIndex >= 0 && parent?.chapters?.[prevChapterIndex]) {
      // If inside a FOC modal, close it first — the hidden.bs.modal handler
      // will restore the borrowed DOM node before we navigate.
      const focModal = document.querySelector('.modal.show');
      if (focModal) {
        // Import Bootstrap Modal to properly close it
        const bsModal = window.bootstrap?.Modal?.getInstance(focModal);
        if (bsModal) {
          // Navigate after modal is fully hidden
          focModal.addEventListener('hidden.bs.modal', () => {
            const targetInstance = parent.chapters[prevChapterIndex].instance;
            parent.trigger('newChapter', {
              h5pbookid: parent.contentId,
              chapter: `h5p-interactive-book-chapter-${targetInstance.subContentId}`,
              section: 'top',
            });
          }, { once: true });
          bsModal.hide();
          return;
        }
      }

      // Not inside a modal — navigate directly (activity page context)
      const targetInstance = parent.chapters[prevChapterIndex].instance;
      parent.trigger('newChapter', {
        h5pbookid: parent.contentId,
        chapter: `h5p-interactive-book-chapter-${targetInstance.subContentId}`,
        section: 'top',
      });
    }
  };

  return (
    <div className="recall-block-overlay">
      <div 
        className="recall-block-overlay__card" 
        style={{
          gap: generateClampCSS('1.25rem', '1.25rem'),
          paddingBlock: generateClampCSS('1.25rem', '1.25rem'),
          paddingInline: '0',
          fontFamily
        }}
      >
        <div className="recall-block-overlay__icon">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="40" 
            height="40"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h3 
          className="recall-block-overlay__title"
          style={{
            fontSize: titleFontSize ? generateClampCSS(titleFontSize, titleFontSize) : undefined,
            fontWeight: popupTitleTheme?.fontWeight,
            color: popupTitleTheme?.fontColor,
            fontFamily: popupTitleTheme?.fontFamily
          }}
        >
          {l10n?.recallBlockTitle || 'Previous answers not found'}
        </h3>

        <p 
          className="recall-block-overlay__desc"
          style={{
            fontSize: messageFontSize ? generateClampCSS(messageFontSize, messageFontSize) : undefined,
            fontWeight: popupMessageTheme?.fontWeight,
            color: popupMessageTheme?.fontColor,
            fontFamily: popupMessageTheme?.fontFamily
          }}
        >
          {l10n?.recallBlockDesc
            ? l10n.recallBlockDesc.replace('{title}', linkedActivityTitle)
            : `Complete '${linkedActivityTitle}' before continuing.`}
        </p>

        <button
          className="recall-block-overlay__btn"
          type="button"
          onClick={handleGoToActivity}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            backgroundColor: btnBgColor,
            color: btnFontColor,
            fontSize: btnFontSize ? generateClampCSS(btnFontSize, btnFontSize) : undefined,
            fontWeight: btnTheme?.fontWeight,
            fontFamily: btnTheme?.fontFamily
          }}
        >
          <span>{l10n?.recallBlockBtn || 'Go to Activity'}</span>
        </button>
      </div>
    </div>
  );
};

export default RecallBlockOverlayReact;
