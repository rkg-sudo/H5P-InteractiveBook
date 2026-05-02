import React, { useEffect, useState, useRef, useCallback } from 'react';
import { checkDevice, debounce, sendPostMessage, createFOCButton } from '../scripts/utils';
import { getCoverTOCData } from '../scripts/utils/getTOCData';
import { hasAnyCustomIndex, initializeCommonProps, isSvgUrl, cleanUrl } from '../scripts/utils/commonHelpers';
import { getMaxValueCharLength } from '../scripts/utils/generalFunction';
import { pearsonLogoIconMobile, pearsonLogoIcon, closeIcon, teachingNotesIcon, frontOfClassIcon, previousArrowIcon, nextArrowIcon, tocDescriptionDownArrow, tocDescriptionUpArrow, upIcon } from '../scripts/icons';

const CoverComponent = ({ params, titleText, startText, contentId, parent, onRead }) => {
  const [deviceHeight, setDeviceHeight] = useState('100vh');
  const [isBannerHidden, setIsBannerHidden] = useState(false);
  const [isTeachingNotesOpen, setIsTeachingNotesOpen] = useState(false);
  const [activeTocIndex, setActiveTocIndex] = useState(-1); // -1 is Home
  const coverContainerRef = useRef(null);

  const showTableOfContents = !parent?.isSimpleView;
  const commonProps = initializeCommonProps(params, parent);
  const themeData = commonProps.themeData;
  const isMobileView = commonProps.isMobileView;
  const customTocIndex = commonProps.customTocIndex;

  const hasAnyCustom = hasAnyCustomIndex(
    parent?.params?.tableOfContents || [],
    customTocIndex,
    true
  );

  useEffect(() => {
    const { height } = checkDevice();
    if (height) {
      setDeviceHeight(`${height}px`);
    }

    // Scroll listener for banner visibility
    const handleScroll = debounce(() => {
      if (coverContainerRef.current) {
        const scrollTop = coverContainerRef.current.scrollTop;
        if (scrollTop > 100 && !isBannerHidden) {
          setIsBannerHidden(true);
        } else if (scrollTop === 0 && isBannerHidden) {
          setIsBannerHidden(false);
        }
      }
    }, 150);

    const container = coverContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isBannerHidden]);

  // Handle TOC Click
  const handleTocClick = (item, index) => {
    setActiveTocIndex(index);
    setIsBannerHidden(true);
    setIsTeachingNotesOpen(false);

    if (window.innerWidth <= 768) {
      // Mobile handling
      const activityData = {
        activityId: item.activityId || `activity-${item.subContentId}`,
        subContentId: item.subContentId,
        activityName: item.itemTitle || item.skill || `activity-${item.subContentId}`,
        timestamp: new Date().toISOString()
      };
      sendPostMessage('activity-changed', 'lesson-package', activityData);
      
      parent.trigger('newChapter', {
        h5pbookid: contentId,
        chapter: `h5p-interactive-book-chapter-${item.subContentId}`,
        section: 0
      });
    } else {
      // Desktop scrolling logic
      setTimeout(() => {
        const thumbnails = document.querySelectorAll('.toc-right-panel .thumbnail-overlay-container');
        if (thumbnails.length > index) {
          thumbnails[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleHomeClick = () => {
    setActiveTocIndex(-1);
    setIsBannerHidden(false);
    if (coverContainerRef.current) {
      coverContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    parent.buildXAPIEventTrigger();
  };

  const title = params?.courseTitle || titleText || "Title";
  const subtitle = params?.coverDescription || "Subtitle";
  const tagline = params?.coverTagline || "";
  
  const displayPearsonLogo = themeData?.header?.displayPearsonLogo !== false;
  const coverLogoURL = themeData?.header?.themeLogo?.logoURL || themeData?.header?.levelLogo;

  return (
    <div 
      className="h5p-interactive-book-cover" 
      ref={coverContainerRef}
      style={{ minHeight: deviceHeight, overflow: 'auto', backgroundColor: themeData?.backgroundColor }}
    >
      {/* Header */}
      <div 
        id="h5p-interactive-book-cover-header" 
        className="h5p-interactive-book-cover-header"
        style={{
          backgroundColor: themeData?.header?.backgroundColor,
          backgroundImage: themeData?.header?.backgroundImage ? `url(${window.H5P?.getPath(themeData.header.backgroundImage)})` : 'none'
        }}
      >
        <div className="h5p-interactive-book-cover-header-left-content">
          {displayPearsonLogo && (
            <div 
              className="h5p-interactive-book-cover-logo" 
              dangerouslySetInnerHTML={{ __html: isMobileView ? pearsonLogoIconMobile : pearsonLogoIcon }} 
            />
          )}
          <div 
            className="h5p-interactive-book-cover-title-logo"
            style={{
              backgroundImage: coverLogoURL ? `url(${window.H5P?.getPath(coverLogoURL)})` : 'none',
              width: !isMobileView ? themeData?.header?.themeLogo?.logoWidth : undefined
            }}
          ></div>
        </div>
        <div className={`h5p-interactive-book-header-cover-title ${!isBannerHidden ? 'hidden' : ''}`}>
          <span>{title}</span>
          {tagline && <span className="separator" style={{ borderLeft: '3px solid currentColor', margin: themeData?.header?.separatorMargin || '0 10px' }}></span>}
          {tagline && <span>{tagline}</span>}
        </div>
      </div>

      {/* Inner Container */}
      <div className="h5p-interactive-book-cover-inner-container">
        {params?.coverMedium?.params?.file?.path && (
          <img 
            src={window.H5P?.getPath(params.coverMedium.params.file.path, contentId)} 
            className={`h5p-interactive-book-cover-background-image zoomout ${isBannerHidden ? 'blur' : ''}`}
            id="h5p-interactive-book-cover-background-image"
            alt="Cover background"
          />
        )}

        {/* Cover Banner */}
        <div className={`h5p-interactive-book-cover-banner ${isBannerHidden ? 'hidden' : ''}`}>
          <div className="h5p-interactive-book-cover-title-container">
            <h1 className="title">{title}</h1>
            {tagline && <p className="tagline">{tagline}</p>}
            <p className="subtitle">{subtitle}</p>
            <button className="h5p-interactive-book-cover-readbutton" onClick={onRead}>
              {startText || "Read"}
            </button>
          </div>

          {/* Teaching Notes */}
          {window.H5PIntegration?.role !== 'student' && parent?.params?.teachingNotes?.content && (
            <div 
              className="teaching-notes-icon"
              style={{
                color: themeData?.landingPageIcons?.teacherNotesIcon?.iconColor,
                backgroundColor: themeData?.landingPageIcons?.teacherNotesIcon?.backgroundColor
              }}
              onClick={() => setIsTeachingNotesOpen(true)}
              dangerouslySetInnerHTML={{ __html: teachingNotesIcon }}
            />
          )}

          {/* FOC Button Placeholder - normally created via createFOCButton utility */}
          {parent?.params?.isClassroomPreviewEnabled && (window.innerWidth > 1024) && (
            <div 
              className="front-of-class-icon"
              onClick={() => parent.trigger("showFrontOfClass", { visibility: true })}
              dangerouslySetInnerHTML={{ __html: frontOfClassIcon }}
            />
          )}

          {/* Navigation Arrows */}
          <div className="cross-lesson-wrapper-container">
            <div className="cross_Lesson_pages_viewer_left scroll_down" dangerouslySetInnerHTML={{ __html: previousArrowIcon }} />
            <div className="cross_Lesson_pages_viewer_right scroll_down" dangerouslySetInnerHTML={{ __html: nextArrowIcon }} />
          </div>
        </div>

        {/* Teaching Notes Modal */}
        {isTeachingNotesOpen && (
          <div className="teaching-notes-modal" style={{ display: 'block' }}>
            <div className="modal-content">
              <span className="teaching-notes-modal-close" onClick={() => setIsTeachingNotesOpen(false)} dangerouslySetInnerHTML={{ __html: closeIcon }} />
              <div className="modal-body" dangerouslySetInnerHTML={{ __html: parent.params?.teachingNotes?.content || 'No teaching notes available' }} />
            </div>
          </div>
        )}

        {/* Table of Contents */}
        {showTableOfContents && (
          <div className="h5p-interactive-book-cover-toc" style={{ display: 'flex', top: isBannerHidden ? 'clamp(5rem, 6.9vw, 15rem)' : '0px' }}>
            {/* Left Panel */}
            <div className="toc-left-panel" style={{ width: '27.5%', overflowY: 'auto' }}>
              <div className="item-list">
                <div className={`item-list-header ${activeTocIndex === -1 ? 'active' : ''}`} onClick={handleHomeClick} tabIndex={0}>
                  <div className="number-and-icon-wrapper">
                    <span className="icon-placeholder home-icon" dangerouslySetInnerHTML={{ __html: getCoverTOCData('home', parent?.params?.skillData, themeData)?.icon?.default || '' }}></span>
                  </div>
                  <div className="item-title">Home</div>
                </div>
                
                {parent?.params?.tableOfContents?.map((item, index) => {
                  const tocData = getCoverTOCData(item?.skill, parent?.params?.skillData, themeData);
                  return (
                    <div 
                      key={index} 
                      className={`item ${activeTocIndex === index ? 'active' : ''}`} 
                      onClick={() => handleTocClick(item, index)}
                      tabIndex={0}
                    >
                      <div className="item-wrapper">
                        <div className="number-and-icon-wrapper">
                          <span className="index-placeholder">{hasAnyCustom ? (customTocIndex?.[item.activityId] || '') : index + 1}</span>
                          <span className="icon-placeholder" dangerouslySetInnerHTML={{ __html: tocData?.icon?.default || '' }}></span>
                        </div>
                        <div className="text-placeholder">
                          <div className="item-title">{tocData?.label || item.skill}</div>
                          <div className="item-description">{item.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel (Thumbnails Placeholder) */}
            <div className="toc-right-panel" style={{ width: '72.5%' }}>
               {/* Note: Full thumbnail creation logic can be added here */}
               <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Thumbnails are rendered here for each TOC item.
               </div>
            </div>
          </div>
        )}

        {/* Back to Top */}
        <button 
          className={`h5p-interactive-book-cover-back-to-top ${!isBannerHidden ? 'hidden' : ''}`}
          onClick={handleHomeClick}
          aria-label="Back to Top"
        >
           <span className="navigation-button" dangerouslySetInnerHTML={{ __html: upIcon }} />
        </button>

      </div>
    </div>
  );
};

export default CoverComponent;
