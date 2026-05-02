import React, { useEffect, useState } from 'react';
import { checkDevice } from '../scripts/utils';
import { pearsonLogoIcon, teachingNotesIcon } from '../scripts/icons';

const CoverComponent = ({ params, titleText, startText, contentId, parent, onRead }) => {
  const [deviceHeight, setDeviceHeight] = useState('100vh');

  useEffect(() => {
    const { height } = checkDevice();
    if (height) {
      setDeviceHeight(`${height}px`);
    }
  }, []);

  const title = params?.courseTitle || titleText || "Course Title";
  const tagline = params?.coverTagline || "";
  const subtitle = params?.coverDescription || "Subtitle";

  return (
    <div className="h5p-interactive-book-cover-inner-container" style={{ minHeight: deviceHeight }}>
      {/* Example Header */}
      <div id="h5p-interactive-book-cover-header" className="h5p-interactive-book-cover-header">
        <div className="h5p-interactive-book-cover-header-left-content">
          <div className="h5p-interactive-book-cover-logo" dangerouslySetInnerHTML={{ __html: pearsonLogoIcon }} />
        </div>
        <div className="h5p-interactive-book-header-cover-title hidden">
          <span>{title}</span>
          {tagline && <span className="separator" style={{ borderLeft: '3px solid currentColor', margin: '0 10px' }}></span>}
          {tagline && <span>{tagline}</span>}
        </div>
      </div>

      {/* Main Banner */}
      <div className="h5p-interactive-book-cover-banner">
        <div className="h5p-interactive-book-cover-title-container">
          <h1 className="h5p-interactive-book-cover-title">{title}</h1>
          <p className="h5p-interactive-book-cover-subtitle">{subtitle}</p>
          <button 
            className="h5p-interactive-book-cover-readbutton"
            onClick={onRead}
          >
            {startText || "Read"}
          </button>
        </div>
      </div>
      
      {/* You can gradually port over Table Of Contents, Background Images, etc. */}
    </div>
  );
};

export default CoverComponent;
