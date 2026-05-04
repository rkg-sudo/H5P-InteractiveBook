import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import RecallAccordionReact from '../views/RecallAccordionReact';
import RecallBlockOverlayReact from '../views/RecallBlockOverlayReact';

/**
 * RecallContainer
 * 
 * The Controller component for the Recall Activity feature.
 * It connects to Redux to determine if the linked activity is completed,
 * and renders either the Block Overlay or the Accordion View.
 */
const RecallContainer = ({ 
  linkedActivityId, 
  linkedActivityTitle, 
  themeData, 
  l10n, 
  isMobile, 
  parent, 
  prevChapter,
  chapterIndex,
  columnNode
}) => {
  // Model: Select completion state from Redux
  const completedActivities = useSelector(state => state.app?.completedActivities);
  const activityState = completedActivities?.[linkedActivityId];
  const isCompleted = activityState?.completed || false;
  const completionVersion = activityState?.version || 0;

  // Manage columnNode pointer events based on completion state
  useEffect(() => {
    if (columnNode) {
      if (isCompleted) {
        columnNode.style.pointerEvents = '';
        columnNode.style.userSelect = '';
      } else {
        columnNode.style.pointerEvents = 'none';
        columnNode.style.userSelect = 'none';
      }
    }
  }, [isCompleted, columnNode]);

  // View Selection
  if (isCompleted) {
    return (
      <RecallAccordionReact
        linkedActivityId={linkedActivityId}
        linkedActivityTitle={linkedActivityTitle}
        themeData={themeData}
        l10n={l10n}
        isMobile={isMobile}
        parent={parent}
        prevChapter={prevChapter}
        completionVersion={completionVersion}
      />
    );
  }

  return (
    <RecallBlockOverlayReact
      linkedActivityId={linkedActivityId}
      linkedActivityTitle={linkedActivityTitle}
      themeData={themeData}
      l10n={l10n}
      isMobile={isMobile}
      parent={parent}
      chapterIndex={chapterIndex}
    />
  );
};

export default RecallContainer;
