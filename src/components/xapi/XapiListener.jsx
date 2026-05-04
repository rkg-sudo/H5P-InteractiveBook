import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { markActivityCompleted } from '../../store/slices/appSlice';
import { logger } from '../../scripts/utils/logger';

/**
 * XapiListener
 * 
 * Component responsible for listening to H5P's global xAPI events.
 * It parses the statement to extract the section UUID and verb, and if an
 * activity is completed, it dispatches the status to the Redux store.
 * 
 * @param {object} props
 * @param {object} props.interactiveBookInstance - The main InteractiveBook class instance (`self` in app.js)
 */
const XapiListener = ({ interactiveBookInstance }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!interactiveBookInstance) {
      return;
    }

    const self = interactiveBookInstance;

    const handleXAPI = (event) => {
      logger.debug("🚨 InteractiveBook - xAPI EVENT RECEIVED IN REACT", event);
      console.log("🚨 H5P.externalDispatcher - EVENT RECEIVED", event);

      let statement = null;
      let verb = null;

      if (event?.data?.statement) {
        statement = event.data.statement;
      } else if (event?.data?.data?.statement) {
        statement = event.data.data.statement;
      } else if (event?.statement) {
        statement = event.statement;
      }

      if (statement?.verb?.id) {
        verb = statement.verb.id.split('/').pop();
      } else {
        return;
      }

      const actionVerbs = ["initialized", "answered", "completed", "interacted", "attempted"];
      const isActionVerb = actionVerbs.indexOf(verb) > -1;
      const isInitialized = self.chapters && self.chapters.length;

      // Note: `self !== this` check from app.js is omitted since `this` context is different here.
      // Assuming we just want to listen to events triggered.
      if (isActionVerb && isInitialized) {
        const sectionUUID = statement?.object?.definition?.extensions?.[`${self.Lesson_MetaData}/contentId`] || 
                            statement?.activityMetadata?.contentId || 
                            self.subContentId || 
                            self.contentData?.subContentId;

        if (!sectionUUID) {
          return;
        }

        if (verb === 'completed' && statement?.result?.completion === true) {
          const chapterResult = self.findChapterByContentId(sectionUUID);
          if (chapterResult) {
            const scoreData = statement?.result?.score || {};
            
            // Dispatch to Redux Store immediately
            dispatch(markActivityCompleted({ id: sectionUUID, data: scoreData }));
            
            // Update the legacy vanilla JS state for backward compatibility
            self.childActivityResults[sectionUUID] = {
              ...self.childActivityResults[sectionUUID], 
              ...scoreData,                             
              completed: true                           
            };

            const chapterId = self.getChapterId(chapterResult?.instance?.subContentId);
            const isLast = self.isLastActivity ? self.isLastActivity(sectionUUID) : false;

            self.setSectionStatusByID(sectionUUID);
            self.handleChapterCompletion(chapterId, true, isLast);

            // Handle unblocking the next chapter's Recall Accordion
            const completedChapterIdx = self.chapters.indexOf(chapterResult);
            const nextPageChapter = self.pageContent?.chapters?.[completedChapterIdx + 1];
            
            if (nextPageChapter) {
              if (nextPageChapter.recallAccordionInstance) {
                nextPageChapter.recallAccordionInstance.enable();
                nextPageChapter.recallAccordionInstance.refresh();
              } else if (nextPageChapter.recallBlockOverlay) {
                // Remove overlay and create accordion
                const overlay = nextPageChapter.recallBlockOverlay;
                const wrapper = overlay.parentElement;
                if (wrapper) {
                  wrapper.removeChild(overlay);
                  
                  const columnNode = self.pageContent?.columnNodes?.[completedChapterIdx + 1];
                  if (columnNode) {
                    columnNode.style.pointerEvents = '';
                    columnNode.style.userSelect = '';
                  }
                }
                nextPageChapter.recallBlockOverlay = null;
                self.pageContent?.buildRecallAccordionForChapter(completedChapterIdx + 1);
              }
            }
          }
        }
      }
    };

    // Attach listener directly to the InteractiveBook instance
    interactiveBookInstance.on("xAPI", handleXAPI);

    // Cleanup listener on unmount
    return () => {
      if (interactiveBookInstance.off) {
        interactiveBookInstance.off("xAPI", handleXAPI);
      }
    };
  }, [dispatch, interactiveBookInstance]);

  return null; // This component doesn't render anything
};

export default XapiListener;
