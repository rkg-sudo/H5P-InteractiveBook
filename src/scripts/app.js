import URLTools from "./urltools";
import SideBar from "./sidebar";
import SimpleViewSideBar from "./simpleviewsidebar";
import StatusBar from "./statusbar";
import Cover from "./cover";
// import Cover from "./coverReact";
import PageContent from "./pagecontent";
import FrontOfClassContent from "./foc";
import "element-scroll-polyfill";

// Redux Integration
import { store } from "../store/store";
import { markActivityCompleted } from "../store/slices/appSlice";
import Colors from "./colors";
import { wonderTheme, sparkTheme, asimovnewTOC, theme1, theme2, theme3 } from "./themes";
import {
  bookCoverData,
  teachingNotesData,
  tableOfContentsData,
  chaptersData,
  courseData,
  frontOfClassData,
  custom_toc_index,
  skillData,
} from "./developcontent";
import { checkDevice, handleLongTocDescription, sendPostMessage } from "./utils";
import { loadDynamicFonts } from "./utils/fontLoader";
import { getAllFOCHotspots, isFOCPreviewEnabled } from "./foc-multipage";
import { logger } from "./utils/logger";
import ReactWrapper from "../components/ReactWrapper";

export default class InteractiveBook extends H5P.EventDispatcher {

  /**
   * @constructor
   *
   * @param {object} config
   * @param {string} contentId
   * @param {object} contentData
   */
  constructor(config, contentId, contentData = {}) {
    super();
    console.log("!!!!! ---- lesson-package-v2.7.1-8---- !!!!!");
    console.log(config, "CONFIG Data");
    console.log(contentData, "CONTENT DATA");

    
    // Mock theme data for recall components (development only)
    // config.theme.theming.activityRecall = {
    //   recallActivityTitle: {
    //     bgColor: "#006D711A",
    //     recallIcon: {
    //       iconColor: "#FFFFFF",
    //       bgColor: "#006D71"
    //     },
    //     previousAnswers: {
    //       fontSize: "20px",
    //       fontWeight: "800",
    //       fontColor: "#151515",
    //       fontFamily: "Open Sans",
    //       mobile: {
    //         fontSize: "20px"
    //       }
    //     },
    //     exercise: {
    //       fontSize: "14px",
    //       fontWeight: "600",
    //       fontColor: "#151515",
    //       fontFamily: "Open Sans",
    //       mobile: {
    //         fontSize: "14px"
    //       }
    //     }
    //   },
    //   recallPopup: {
    //     fontFamily: "Open Sans",
    //     title: {
    //       fontSize: "20px",
    //       fontWeight: "600",
    //       fontColor: "#151515",
    //       mobile: {
    //         fontSize: "20px"
    //       }
    //     },
    //     message: {
    //       fontSize: "16px",
    //       fontWeight: "400",
    //       fontColor: "#151515",
    //       mobile: {
    //         fontSize: "16px"
    //       }
    //     },
    //     activityButton: {
    //       bgColor: "#006D71",
    //       fontSize: "16px",
    //       fontWeight: "400",
    //       fontColor: "#151515",
    //       fontFamily: "Open Sans",
    //       hover: {
    //         fontColor: "#FFFFFF",
    //         bgColor: "#151515"
    //       },
    //       mobile: {
    //         fontSize: "16px"
    //       }
    //     }
    //   },
    //   showHide: {
    //     eyeicon_open: {
    //       iconColor: "#FFFFFF",
    //       bgColor: "#006D71"
    //     },
    //     eyeicon_closed: {
    //       iconColor: "#FFFFFF",
    //       bgColor: "#006D71"
    //     },
    //     showHideText: {
    //       fontSize: "16px",
    //       fontWeight: "600",
    //       fontColor: "#151515",
    //       fontFamily: "Open Sans",
    //       mobile: {
    //         fontSize: "16px"
    //       },
    //       message: {
    //         fontSize: "14px",
    //         fontWeight: "400",
    //         fontColor: "#151515",
    //         fontFamily: "Open Sans",
    //         mobile: {
    //           fontSize: "14px"
    //         }
    //       }
    //     },
    //     rubricText: {
    //       fontSize: "16px",
    //       fontWeight: "800",
    //       fontColor: "#151515",
    //       fontFamily: "Opden Sans",
    //       mobile: {
    //         fontSize: "16px"
    //       }
    //     }
    //   }
    // };

    const self = this;
    this.contentId = contentId;
    this.config = config;
    this.contentData = contentData;
    this.Lesson_MetaData = 'https://pearson.com/xapi/object/extensions';
    this.lessonMetadata = config?.lessonMetadata || {};
    this.previousState = contentData.previousState;
    H5PIntegration.parentData = {
      lessonId: config?.lessonMetadata?.lessonId,
      lessonUrn: config?.lessonMetadata?.lessonUrn,
      lessonTitle: config?.lessonMetadata?.lessonTitle
    };
    // Add this property early in constructor
    this.hasTriggeredInitialized = false;
    this.hasTriggeredInteracted = false; // Add this flag to track the 'interacted' event

    this.lessonInitializedTime = new Date();

    // Apply custom base color
    if (
      config &&
      config.behaviour &&
      config.behaviour.baseColor &&
      !Colors.isBaseColor(config.behaviour.baseColor)
    ) {
      Colors.setBase(config.behaviour.baseColor);

      const style = document.createElement("style");
      if (style.styleSheet) {
        style.styleSheet.cssText = Colors.getCSS();
      } 
      else {
        style.appendChild(document.createTextNode(Colors.getCSS()));
      }
      document.head.appendChild(style);
    }

    this.activeChapter = 0;
    this.newHandler = {};

    this.completed = false;

    this.params = InteractiveBook.sanitizeConfig(config);
    this.l10n = this.params.l10n;
    // this.params.behaviour = this.params.behaviour || {};
    this.params.behaviour.displaySummary =
      this.params.behaviour && this.params.behaviour.displaySummary
        ? false
        : false;
    this.mainWrapper = null;
    this.currentRatio = null;
    this.smallSurface = "h5p-interactive-book-small";
    this.mediumSurface = "h5p-interactive-book-medium";
    this.largeSurface = "h5p-interactive-book-large";

    this.chapters = [];
    this.isInitializing = true;
    this.hasRestoredState = false;

    this.childActivityResults = {};

    this.isSubmitButtonEnabled = false;
    this.isAnswerUpdated = true;
    if (
      contentData.isScoringEnabled !== undefined ||
      contentData.isReportingEnabled !== undefined
    ) {
      this.isSubmitButtonEnabled =
        contentData.isScoringEnabled || contentData.isReportingEnabled;
    } 
    else if (H5PIntegration.reportingIsEnabled !== undefined) {
      // (Never use H5PIntegration directly in a content type. It's only here for backwards compatibility)
      this.isSubmitButtonEnabled = H5PIntegration.reportingIsEnabled;
    }

    this.segment = this.params?.theme?.segment?.toLowerCase() || "";
    this.subSegment = this.params?.theme?.subsegment?.toLowerCase() || "";
    this.component = this.params?.theme?.component || "";
    // this.component = "tests"; // uncomment to activate student preview mode for tests
    this.role = H5PIntegration?.role || "";

    // Determine if the view should be in a simple mode based on component type, segment, role, and sub-segment conditions.
    // 1. If `component` is "test", `isSimpleView` is true.
    // 2. Otherwise, if `role` is "student", check:
    //    a. If `segment` is "primary" or "preprimary".
    //    b. If `segment` is "secondary" and `subSegment` is "secondarylowersecondary".
    this.isSimpleView =
      this.component === "tests" ||
      (this.role === "student" &&
        (["primary", "preprimary"].includes(this.segment) ||
          (this.segment === "secondary" &&
            this.subSegment === "secondarylowersecondary")));

    /*
     * this.params.behaviour.enableSolutionsButton and this.params.behaviour.enableRetry
     * are used by H5P's question type contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */
    this.params.behaviour.enableSolutionsButton = false;
    // this.params.behaviour.enableRetry = this.params.behaviour.enableRetry ?? true;
    this.params.behaviour.enableRetry =
      this.params.behaviour.enableRetry !== undefined
        ? this.params.behaviour.enableRetry
        : true;
    this.params.themeData = this.params?.theme?.theming || {};
    
    // Load dynamic fonts from theme configuration
    if (this.params.themeData?.fontFace) {
      loadDynamicFonts(this.params.themeData.fontFace);
    }

    // this.params.foc = [
    //   {
    //     "focTitle": "Q1",
    //     "focType": "hotspot",
    //     "focId": 1,
    //     "defaultFoc": 1,
    //     "focHotspots": [
    //       {
    //         "shape": "rect",
    //         "index": 1,
    //         "coords": [
    //           13.864168618266978,
    //           153.10370099344684,
    //           153.10370099344684,
    //           13.864168618266978
    //         ],
    //         "tooltip": "Hotspot 1 description",
    //         "id": "3890deef-b8da-401c-b091-ec0c62f4d502",
    //         "linkActivity": {
    //           "itemId": "a1105e4d"
    //         }
    //       },
    //       {
    //         "shape": "rect",
    //         "index": 1,
    //         "coords": [
    //           611.1857844467335,
    //           209.89726238895335,
    //           762.9495016559556,
    //           12.401196709110444
    //         ],
    //         "tooltip": "Hotspot 2 description",
    //         "id": "4c31dc4c-787d-438c-8ee1-b5de5881dcf1",
    //         "linkActivity": {
    //           "itemId": "a1105e4e"
    //         }
    //       }
    //     ],
    //     "focData": {
    //       "params": {
    //         "id": "2bdf7fef-369a-4ac1-81ab-e04bdcf26553",
    //         "type": "image",
    //         "alt": "",
    //         "path": "https://pace-stg.pearson.com/sequoia/use1/cite-media-stg/2bdf7fef-369a-4ac1-81ab-e04bdcf26553/Gen_AI_GeneratedImage_9240ec63-dc0f-48fc-b688-14f7e4a8a25e_1.png",
    //         "height": 864,
    //         "width": 1184,
    //         "size": "1.6 MB",
    //         "alfresco": {
    //           "siteId": "elm-h5p-contents",
    //           "nodeRef": "d6a1ad2a-8f65-48ea-a5e6-bd3cf7fa2499"
    //         },
    //         "imagePreview": false
    //       },
    //       "metadata": {
    //         "contentType": "Image",
    //         "title": "FOC Page"
    //       },
    //       "library": "H5P.Image 1.1",
    //       "subContentId": "023f6faf-3062-4f7b-9f65-79e914891842"
    //     },
    //     "focPreview": false
    //   },
    //   {
    //     "focTitle": "Q2",
    //     "focType": "hotspot",
    //     "focId": 2,
    //     "defaultFoc": 1,
    //     "focHotspots": [
    //       {
    //         "shape": "rect",
    //         "index": 2,
    //         "coords": [
    //           828.5472980982761,
    //           874.7303630641953,
    //           1074.2406443950194,
    //           629.0370167674513
    //         ],
    //         "tooltip": "Hotspot 1 description",
    //         "id": "b0994586-b676-48a5-a672-5d8601090d6c",
    //         "linkActivity": {
    //           "itemId": "a1105d9c"
    //         }
    //       }
    //     ],
    //     "focData": {
    //       "params": {
    //         "id": "1312b589-9004-4da4-8307-fe442bf3cf59",
    //         "type": "image",
    //         "alt": "",
    //         "path": "https://pace-stg.pearson.com/sequoia/use1/cite-media-stg/1312b589-9004-4da4-8307-fe442bf3cf59/sunset_ocean.png",
    //         "height": 896,
    //         "width": 1280,
    //         "size": "1012 KB",
    //         "alfresco": {
    //           "siteId": "elm-h5p-contents",
    //           "nodeRef": "d6a1ad2a-8f65-48ea-a5e6-bd3cf7fa2499"
    //         },
    //         "imagePreview": false
    //       },
    //       "metadata": {
    //         "contentType": "Image",
    //         "title": "FOC Page"
    //       },
    //       "library": "H5P.Image 1.1",
    //       "subContentId": "f1efc0cb-5d37-4fe8-83c3-24ee2bf6b6dc"
    //     },
    //     "focPreview": false
    //   },
    //   {
    //     "focTitle": "Q3",
    //     "focType": "hotspot",
    //     "focId": 3,
    //     "defaultFoc": 1,
    //     "focHotspots": [
    //       {
    //         "shape": "rect",
    //         "index": 3,
    //         "coords": [
    //           828.5472980982761,
    //           874.7303630641953,
    //           1074.2406443950194,
    //           629.0370167674513
    //         ],
    //         "tooltip": "Hotspot 1 description",
    //         "id": "b0994586-b676-48a5-a672-5d8601090d6c",
    //         "linkActivity": {
    //           "itemId": "a1105d9c"
    //         }
    //       }
    //     ],
    //     "focData": {
    //       "params": {
    //         "id": "3f35ed0c-ccb2-48c7-b4c9-b37d0207d744",
    //         "type": "image",
    //         "alt": "",
    //         "path": "https://pace-stg.pearson.com/sequoia/use1/cite-media-stg/3f35ed0c-ccb2-48c7-b4c9-b37d0207d744/Kids.png",
    //         "height": 708,
    //         "width": 758,
    //         "size": "653 KB",
    //         "alfresco": {
    //           "siteId": "elm-h5p-contents",
    //           "nodeRef": "d6a1ad2a-8f65-48ea-a5e6-bd3cf7fa2499"
    //         },
    //         "imagePreview": false
    //       },
    //       "metadata": {
    //         "contentType": "Image",
    //         "title": "FOC Page"
    //       },
    //       "library": "H5P.Image 1.1",
    //       "subContentId": "cbc385c9-c094-4a47-adbb-b04db2c8b923"
    //     },
    //     "focPreview": false
    //   },
    //   {
    //     "focTitle": "Q4",
    //     "focType": "hotspot",
    //     "focId": 4,
    //     "defaultFoc": 1,
    //     "focHotspots": [],
    //     "focData": {
    //       "params": {
    //         "id": "2af434fb-7c32-463f-a84f-52f629903152",
    //         "type": "image",
    //         "alt": "",
    //         "path": "https://pace-stg.pearson.com/sequoia/use1/cite-media-stg/2af434fb-7c32-463f-a84f-52f629903152/Gen_AI_GeneratedImage_91ee873a-f417-4038-b950-e0453e3bf50d_3.png",
    //         "height": 896,
    //         "width": 1280,
    //         "size": "908 KB",
    //         "alfresco": {
    //           "siteId": "elm-h5p-contents",
    //           "nodeRef": "d6a1ad2a-8f65-48ea-a5e6-bd3cf7fa2499"
    //         },
    //         "imagePreview": false
    //       },
    //       "metadata": {
    //         "contentType": "Image",
    //         "title": "FOC Page"
    //       },
    //       "library": "H5P.Image 1.1",
    //       "subContentId": "948f6847-64a8-4c82-9b34-94ec1a20082b"
    //     },
    //     "focPreview": false
    //   },
    //   {
    //     "focTitle": "Q5",
    //     "focType": "hotspot",
    //     "focId": 5,
    //     "defaultFoc": 1,
    //     "focHotspots": [],
    //     "focData": {
    //       "params": {
    //         "id": "b6feb739-4913-443f-8da3-686f78b1973f",
    //         "type": "image",
    //         "alt": "",
    //         "path": "https://pace-stg.pearson.com/sequoia/use1/cite-media-stg/b6feb739-4913-443f-8da3-686f78b1973f/9780137635818_marketingimage%20%2812%29.jpg",
    //         "height": 662,
    //         "width": 500,
    //         "size": "203 KB",
    //         "alfresco": {
    //           "siteId": "elm-h5p-contents",
    //           "nodeRef": "d6a1ad2a-8f65-48ea-a5e6-bd3cf7fa2499"
    //         },
    //         "imagePreview": false
    //       },
    //       "metadata": {
    //         "contentType": "Image",
    //         "title": "FOC Page"
    //       },
    //       "library": "H5P.Image 1.1",
    //       "subContentId": "dd73e984-bfaf-4d7e-9b35-d43650524796"
    //     },
    //     "focPreview": false
    //   },
    //   {
    //     "focTitle": "Q6",
    //     "focType": "hotspot",
    //     "focId": 6,
    //     "defaultFoc": 1,
    //     "focHotspots": [],
    //     "focData": {
    //       "params": {
    //         "id": "626a5c33-bf67-4570-8c87-45a689705dca",
    //         "type": "image",
    //         "alt": "",
    //         "path": "https://pace-stg.pearson.com/sequoia/use1/cite-media-stg/626a5c33-bf67-4570-8c87-45a689705dca/m15app02.jpg",
    //         "height": 323,
    //         "width": 503,
    //         "size": "13 KB",
    //         "alfresco": {
    //           "siteId": "elm-h5p-contents",
    //           "nodeRef": "d6a1ad2a-8f65-48ea-a5e6-bd3cf7fa2499"
    //         },
    //         "imagePreview": false
    //       },
    //       "metadata": {
    //         "contentType": "Image",
    //         "title": "FOC Page"
    //       },
    //       "library": "H5P.Image 1.1",
    //       "subContentId": "49b0f7de-520f-427c-a91c-6e48725f5740"
    //     },
    //     "focPreview": false
    //   }
    // ];
    
    const nodeEnv = process.env.NODE_ENV || "production";
    if (nodeEnv === "development") {
      this.params.themeData = asimovnewTOC;
      this.params.bookCover = bookCoverData;
      this.params.teachingNotes = teachingNotesData;
      this.params.tableOfContents = tableOfContentsData;
      this.params.skillData = skillData;
      this.params.chapters = chaptersData;
      this.params.foc = frontOfClassData;
      this.params.custom_toc_index = custom_toc_index;
      
      // Reload dynamic fonts after dev theme data is set
      if (this.params.themeData?.fontFace) {
        loadDynamicFonts(this.params.themeData.fontFace);
      }
    }
    // Enable classroom preview mode if:
    // 1. User role is "teacher" (any segment), OR
    // 2. User role is "student" with Primary/Preprimary segments (Simple View), OR  
    // 3. User role is "student" with Adult/Secondary segments
    // AND there are hotspots in the front-of-class (FOC) content that contain a "linkActivity" property.
    const isAdultOrSecondarySegment = ["adult", "secondary"].includes(this.segment);
    
    const isPrimaryOrPreprimaryStudent = this.role === "student" && 
      ["primary", "preprimary"].includes(this.segment);
    
    // Get all FOC hotspots (works for both array and object formats)
    const allFocHotspots = getAllFOCHotspots(this.params?.foc);
    
    this.params.isClassroomPreviewEnabled =
      (this.role === "teacher" || isPrimaryOrPreprimaryStudent || (this.role === "student" && isAdultOrSecondarySegment)) &&
      allFocHotspots.length > 0 &&
      allFocHotspots.some((hotspot) => "linkActivity" in hotspot);
    // this.params.isClassroomPreviewEnabled = true;

    this.params.viewType = this.params.foc_view ? "foc" : "default";

    /**
     * Check if result has been submitted or input has been given.
     *
     * @return {boolean} True, if answer was given.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
     */
    this.getAnswerGiven = () =>
      this.chapters.reduce((accu, current) => {
        if (typeof current.instance.getAnswerGiven === "function") {
          return accu && current.instance.getAnswerGiven();
        }
        return accu;
      }, true);

    /**
     * Get latest score.
     *
     * @return {number} Latest score.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
     */
    this.getScore = () => {
      if (Object.values(this.childActivityResults)?.length > 0) {
        // 1. Calculate Raw Score: Sum of scaled scores from all child activities.
        return Object.values(this.childActivityResults)?.reduce((sum, result) => {
          // Add the scaled score if it exists, otherwise add 0.
          return sum + (result?.scaled || 0);
        }, 0);
      }

      return 0;
    };

    /**
     * Get maximum possible score.
     *
     * @return {number} Score necessary for mastering.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
     */
    this.getMaxScore = () => {
      if (this.params?.tableOfContents?.length > 0) {
        const scorableActivities = this.params?.tableOfContents?.filter(tocItem => {
          return tocItem?.activityMetadata?.scoringmode === "autograded";
        }) || [];
        return scorableActivities.length;
      }
      return 0;
    };

    /**
     * Get current duration since lesson initialization.
     *
     * @return {number} Duration in seconds since lesson started.
     */
    this.getDuration = () => {
      if (this.lessonInitializedTime) {
        const currentTime = new Date();
        const durationSeconds = Math.round((currentTime - this.lessonInitializedTime) / 1000);
        const durationISO8601 = this.secondsToISO8601(durationSeconds);
        return durationISO8601;
      }
      return 0;
    };

    /**
     * Show solutions.
     *
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
     */
    this.showSolutions = () => {
      this.chapters.forEach((chapter) => {
        if (typeof chapter.instance.toggleReadSpeaker === "function") {
          chapter.instance.toggleReadSpeaker(true);
        }
        if (typeof chapter.instance.showSolutions === "function") {
          chapter.instance.showSolutions();
        }
        if (typeof chapter.instance.toggleReadSpeaker === "function") {
          chapter.instance.toggleReadSpeaker(false);
        }
      });
    };

    /**
     * Reset task.
     *
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
     */
    this.resetTask = () => {
      if (this.hasValidChapters()) {
        // Clean up resize state first
        this.cleanupResize();
        
        this.chapters.forEach((chapter, index) => {
          if (typeof chapter.instance.resetTask === "function") {
            chapter.instance.resetTask();
          }
          chapter.completed = false;
          chapter.tasksLeft = chapter.maxTasks;
          chapter.sections.forEach((section) => (section.taskDone = false));
          this.setChapterRead(index, false);
        });

        // Clean up previous state to avoid fallback in getCurrentState()
        for (const state in this.previousState) {
          delete this.previousState[state];
        }

        /** Prevent auto-redirecting after starting over. */
        this.hashWindow.location.hash = "";

        const activeChapter = this.getActiveChapter();
        this.redirectChapter({
          h5pbookid: this.contentId,
          chapter: this.pageContent.columnNodes[0].id,
          section: "top",
        });
        this.chapters[activeChapter].completed = false; // Cleanup after redirect in case of autoprogress

        if (this.hasCover()) {
          this.displayCover(this.mainWrapper);
        }
        this.isAnswerUpdated = false;

        // Force reset activity start time
        this.setActivityStarted(true);
        this.pageContent.resetChapters();
        // this.sideBar.resetIndicators();
      }
    };

    /**
     * Get xAPI data.
     *
     * @return {object} xAPI statement.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
     */
    // this.getXAPIData = () => {
    //   const xAPIEvent = this.createXAPIEventTemplate("answered");
    //   this.addQuestionToXAPI(xAPIEvent);
    //   xAPIEvent.setScoredResult(
    //     this.getScore(),
    //     this.getMaxScore(),
    //     this,
    //     true,
    //     this.getScore() === this.getMaxScore()
    //   );
    //   return {
    //     statement: xAPIEvent.data.statement,
    //     children: []
    //     // children: this.getXAPIDataFromChildren(
    //     //   this.chapters.map((chapter) => chapter.instance)
    //     // ),
    //   };
    // };

    /**
     * Get xAPI data from sub content types.
     *
     * @param {object[]} instances H5P instances.
     * @return {object[]} xAPI data objects used to build a report.
     */
    // this.getXAPIDataFromChildren = (instances) => {
    //   return instances
    //     .map((instance) => {
    //       if (typeof instance.getXAPIData === "function") {
    //         return instance.getXAPIData();
    //       }
    //     })
    //     .filter((data) => !!data);
    // };

    /**
     * Add question itself to the definition part of an xAPIEvent.
     *
     * @param {H5P.XAPIEvent} xAPIEvent.
     */
    this.addQuestionToXAPI = (xAPIEvent) => {
      const definition = xAPIEvent.getVerifiedStatementValue([
        "object",
        "definition",
      ]);
      Object.assign(definition, this.getxAPIDefinition());
    };

    /**
     * Generate xAPI object definition used in xAPI statements.
     *
     * @return {object} xAPI definition.
     */
    this.getxAPIDefinition = () => ({
      interactionType: "compound",
      type: "http://adlnet.gov/expapi/activities/cmi.interaction",
      description: { "en-US": "" },
    });

    this.secondsToISO8601 = (seconds) => {
      seconds = Math.round(seconds);
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      let duration = 'PT';
      if (hours > 0) duration += hours + 'H';
      if (mins > 0) duration += mins + 'M';
      if (secs > 0) duration += secs + 'S';
      if (duration === 'PT') duration += '0S'; // default fallback
      return duration;
    };

    /**
     * Generate lesson metadata object with lesson information for xapi triggers
     *
     * @return {object} Lesson metadata object
     */
    this.buildExtensionsData = (eventType, completionResults) => {

      // Calculate estimated duration
      const estimatedDuration = config?.lessonMetadata?.estimatedDuration ? this.secondsToISO8601(config?.lessonMetadata?.estimatedDuration) : '';

      // Check if any activities are scorable from tableOfContents
      const scorableActivities = this.params?.tableOfContents?.filter(tocItem => {
        return tocItem?.activityMetadata?.scoringmode === "autograded";
      }) || [];

      const isScorable = scorableActivities.length > 0;
      const numberOfScorable = scorableActivities.length;

      let finalData = {
        [`${this.Lesson_MetaData}/estimated-duration`]: estimatedDuration,
        [`${this.Lesson_MetaData}/scorable`]: isScorable,
        [`${this.Lesson_MetaData}/number-of-scorable`]: numberOfScorable,
        [`${this.Lesson_MetaData}/total-activities`]: this.chapters.length,
        [`${this.Lesson_MetaData}/template`]: "lesson"
      };
      if (eventType === 'completed') {
        finalData[`${this.Lesson_MetaData}/lesson-progress`] = this.chapters.filter(chapter => chapter.completed)?.length;
      }
      return finalData;
    };

    /**
     * Answer call to return the current state.
     * @return {object} Current state.
     */
    this.getCurrentState = () => {
      // Get relevant state information from non-summary chapters
      const chapters = this.chapters
        .filter((chapter) => !chapter.isSummary)
        .map((chapter) => ({
          completed: chapter.completed || null,
          sections: chapter.sections.map((section) => ({
            taskDone: section.taskDone || null,
          })),
          state: chapter.instance.getCurrentState() || null
        }));

      const currentState = {
        urlFragments:
          !this.hashWindow.location.hash && this.previousState?.urlFragments
            ? this.previousState.urlFragments
            : URLTools.extractFragmentsFromURL(
              this.validateFragments,
              this.hashWindow
            ),
        chapters: chapters,
        activeChapter: this.activeChapter,
        individualScore: this.childActivityResults
      };
      if (this.activeChapter >= 0 && this.chapters.length > 0) {
        currentState.score = this.getScore();
        currentState.maxScore = this.getMaxScore();
      }
      return currentState;
    };

    /*
     * Get context data.
     * Contract used for confusion report.
     *
     * @return {object}
     */
    this.getContext = () => {
      if (this.cover && !this.cover.hidden) {
        return {};
      }

      return {
        type: "page",
        value: this.activeChapter + 1,
      };
    };

    /**
     * Check if there's a cover.
     *
     * @return {boolean} True, if there's a cover.
     */
    this.hasCover = () => this.cover && this.cover.container;

    /**
     * Check if the configs are set to use summary
     * @param chapters
     * @return {*|boolean}
     */
    this.hasSummary = (chapters = this.chapters) =>
      this.hasChaptersTasks(chapters) &&
      this.params.behaviour.displaySummary &&
      this.params.behaviour.displaySummary === true;

    /**
     * Check if chapters has tasks
     *
     * @param {Array} chapters
     * @return {boolean}
     */
    this.hasChaptersTasks = (chapters) =>
      chapters.filter(
        (chapter) =>
          chapter.sections.filter((section) => section?.isTask === true)
            .length > 0
      ).length > 0;

    /**
     * Check if there are valid chapters.
     *
     * @return {boolean} True, if there are valid(not empty) chapters.
     */
    this.hasValidChapters = () => this.params.chapters.length > 0;

    /**
     * Get number of active chapter.
     *
     * @return {number} Number of active chapter.
     */
    this.getActiveChapter = (getActualChapter = false) =>
      !getActualChapter
        ? this.activeChapter
        : this.chapters[this.activeChapter];

    /**
     * Set number of active chapter.
     *
     * @param {number} chapterId Number of active chapter.
     */
    this.setActiveChapter = (chapterId) => {
      // Normalize chapterId to integer and ensure it's a valid index
      chapterId = parseInt(chapterId);
      if (isNaN(chapterId)) {
        return;
      }

      // Prevent duplicate calls - if already processing this chapter, skip
      if (this.isPostingActivity) {
        logger.debug('Activity posting already in progress, skipping duplicate call');
        return;
      }

      const previousChapter = this.activeChapter;
      this.activeChapter = chapterId;

      // Set flag to prevent duplicate simultaneous calls
      this.isPostingActivity = true;

      // Helper: try to get chapter data, retry a few times before giving up.
      const postActivityWhenReady = (attempt = 0) => {
        // If chapterId is falsy or out of range, do not send anything.
        if (chapterId === null || chapterId === undefined) {
          console.warn('activity-changed not sent: invalid chapterId');
          return;
        }

        const currentChapter = this.chapters && this.chapters[chapterId];

        // If we don't have chapter data yet, retry a few times.
        if (!currentChapter) {
          if (attempt < 10) {
            setTimeout(() => postActivityWhenReady(attempt + 1), 100);
            return;
          }

          // Do NOT send activity-changed if chapter data never became available.
          // This avoids posting incomplete messages when we don't have a valid chapter.
          /* eslint-disable no-console */
          console.warn(`activity-changed not sent: chapter ${chapterId} data unavailable`);
          /* eslint-enable no-console */
          return;
        }

        // Build and send activity data when chapter is ready
        const activityId = currentChapter.sections?.[0]?.activityId || `chapter-${chapterId}`;

        const activityData = {
          activityId: activityId,
          subContentId: currentChapter?.instance?.subContentId || ``,
          activityName: currentChapter?.title || `Chapter ${chapterId + 1}`,
          timestamp: new Date().toISOString(),
        };

        sendPostMessage('activity-changed', 'lesson-package', activityData);
        
        // Reset flag after posting completes
        setTimeout(() => {
          self.isPostingActivity = false;
        }, 100);
      };

      postActivityWhenReady();
    };

    /**
     * Validate fragments.
     *
     * @param {object} fragments Fragments object from URL.
     * @return {boolean} True, if fragments are valid.
     */
    this.validateFragments = (fragments) => {
      return (
        fragments.chapter !== undefined &&
        String(fragments.h5pbookid) === String(self.contentId)
      );
    };

    /**
     * Bubble events from child to parent
     *
     * @param {object} origin Origin of the Event
     * @param {string} eventName Name of the Event
     * @param {object} target Target to trigger event on
     */
    this.bubbleUp = (origin, eventName, target) => {
      origin.on(eventName, function (event) {
        // Prevent target from sending event back down
        target.bubblingUpwards = true;

        // Trigger event
        target.trigger(eventName, event);

        // Reset
        target.bubblingUpwards = false;
      });
    };

    /**
     * Check if menu is open
     * @return {boolean}
     */
    this.isMenuOpen = () => this.statusBarHeader.isMenuOpen();

    /**
     * Detect if wrapper is a small surface
     * @return {*}
     */
    this.isSmallSurface = () =>
      this.mainWrapper && this.mainWrapper.hasClass(this.smallSurface);

    /**
     * Get the ratio of the wrapper
     *
     * @return {number}
     */
    this.getRatio = () => window.innerWidth;

    /**
     * Add/remove classname based on the ratio
     * @param {jQuery} wrapper
     * @param {number} ratio
     */
    this.setWrapperClassFromRatio = (wrapper, ratio = this.getRatio()) => {
      if (ratio === this.currentRatio) {
        return;
      }
      this.breakpoints().forEach((item) => {
        if (item.shouldAdd(ratio)) {
          this.mainWrapper.addClass(item.className);
        } 
        else {
          this.mainWrapper.removeClass(item.className);
        }
      });
      this.currentRatio = ratio;
    };

    /**
     * Handle resizing of the content with proper debouncing
     */
    this.resize = () => {
      // Prevent multiple simultaneous resize operations
      if (this.isResizing) {
        return;
      }

      // Clear any pending resize operations
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      // Debounce resize operations
      this.resizeTimeout = setTimeout(() => {
        this.performResize();
      }, 150); // 150ms debounce delay
    };

    /**
     * Perform the actual resize operation
     */
    this.performResize = () => {
      this.isResizing = true;

      try {
        // Skip if bubbling events are active or essential components are missing
        if (
          this.isBubblingUpToCore ||
          this.isBubblingUpToCoreNo2 ||
          !this.pageContent ||
          !this.hasValidChapters() ||
          !this.mainWrapper
        ) {
          return;
        }

        // Helper to update height if difference exceeds threshold
        const updateHeightIfNeeded = (element, newHeight, threshold = 20) => {
          if (!element) return;
          const currentHeight = parseInt(element.style.height || element.style.minHeight) || 0;
          if (Math.abs(newHeight - currentHeight) > threshold) {
            if (element.style.height !== undefined) {
              element.style.height = `${newHeight}px`;
            }
          }
        };

        // Update cover height
        if (this.cover?.container?.classList.contains("h5p-interactive-book-cover")) {
          const { browserHeight, height } = checkDevice();
          // const landingpageHeight = this.isSimpleView ? height : browserHeight;
          updateHeightIfNeeded(this.cover.container, height);
        }

        // Update activity-rendering-container height
        // const activityLandingPageElement = this.mainWrapper[0]?.querySelector('.activity-rendering-container');
        // if (activityLandingPageElement) {
        //   const { height } = checkDevice();
        //   updateHeightIfNeeded(activityLandingPageElement, height);
        // }

        // Set wrapper class based on ratio
        this.setWrapperClassFromRatio(this.mainWrapper);


      } 
      catch (error) {
        console.error('Error during resize operation:', error);
      } 
      finally {
        setTimeout(() => {
          this.isResizing = false;
        }, 50);
      }
    };



    /**
     * Clean up resize-related timeouts and flags
     */
    this.cleanupResize = () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = null;
      }
      
      this.isResizing = false;
      this.menuToggleListenerActive = false;
    };

    /*
     * Establish all triggers
     */
    this.on("resize", this.resize, this);

    this.on("toggleMenu", (event) => {
      // Use a flag to prevent multiple event listeners
      if (this.menuToggleListenerActive) {
        return;
      }
      
      this.menuToggleListenerActive = true;

      // Resize content when we are done changing the sidebar + pagecontent width.
      if (this.isSimpleView) {
        this.simpleViewSideBar.container.addEventListener(
          "transitionend",
          () => {
            this.isBubblingUpToCoreNo2 = true;
            this.trigger('resize');
            this.isBubblingUpToCoreNo2 = false;
            this.menuToggleListenerActive = false; // Reset flag
          },
          { once: true } // Use once: true to automatically remove listener
        );
      } 
      else {
        this.sideBar.container.addEventListener(
          "transitionend", 
          () => {
            this.trigger("resize");
            this.menuToggleListenerActive = false; // Reset flag
          },
          { once: true } // Use once: true to automatically remove listener
        );
      }

      // Set nav focus flag to avoid auto-scroll in content list page
      const focusNav = !event.data?.shouldNotFocusNav;
      this.pageContent.toggleNavigationMenu();

      // Update the menu button
      this.statusBarHeader.menuToggleButton.setAttribute(
        "aria-expanded",
        this.statusBarHeader.menuToggleButton.classList.toggle(
          "h5p-interactive-book-status-menu-active"
        )
          ? "true"
          : "false"
      );

      // Set focus on first element in menu
      if (this.pageContent.sidebarIsOpen && focusNav) {
        if (this.isSimpleView) {
          this.simpleViewSideBar.focus();
        }
        else {
          this.sideBar.focus();

          // Add this block for mobile dropdown/truncation logic
          // Run truncation/dropdown logic after sidebar transition ends
          // this.sideBar.container.addEventListener("transitionend", () => {
          if (this.sideBar.isMobileView || window.innerWidth <= 768) {
            requestAnimationFrame(() => {
              this.sideBar.chapterNodes.forEach(chapterNode => {
                requestAnimationFrame(() => {
                  const chapterNodeTitle = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
                  const chapterTitleText = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-title-text');
                  // Handle long description for Mobile view
                  handleLongTocDescription(chapterTitleText, chapterNodeTitle, true);
                });
              });
            });
          }
          // }, { once: true });
        }
      }
    });

    this.on("scrollToTop", () => {
      if (H5P.isFullscreen === true) {
        const container = this.pageContent.container;
        container.scrollBy(0, -container.scrollHeight);
      } 
      else {
        // this.statusBarHeader.wrapper.scrollIntoView(true);
        // scroll to top of the page. commenting the above line since status bar is fixed position element it will be always visible in the viewport
        window.scrollTo({
          top: 0,
        });
      }
    });

    this.on("newChapter", (event) => {
      if (
        this.pageContent.columnNodes[
          this.getActiveChapter()
        ].classList.contains("h5p-interactive-book-animate")
      ) {
        return;
      }

      this.newHandler = event.data;

      // Create the new hash
      event.data.newHash = URLTools.createFragmentsString(this.newHandler);

      // Assert that the module itself is asking for a redirect
      this.newHandler.redirectFromComponent = true;

      if (this.getChapterId(event.data.chapter) === this.activeChapter) {
        const fragmentsEqual = URLTools.areFragmentsEqual(
          event.data,
          URLTools.extractFragmentsFromURL(
            this.validateFragments,
            this.hashWindow
          ),
          ["h5pbookid", "chapter", "section", "headerNumber"]
        );

        if (fragmentsEqual) {
          // only trigger section redirect without changing hash
          this.pageContent.changeChapter(false, event.data);
          return;
        }
      }

      /*
       * Set final chapter read on entering automatically if it doesn't
       * contain tasks and if all other chapters have been completed
       */
      if (this.params.behaviour.progressAuto) {
        const id = this.getChapterId(this.newHandler.chapter);
        if (this.isFinalChapterWithoutTask(id)) {
          this.setChapterRead(id);
        }
      }

      H5P.trigger(this, "changeHash", event.data);
      H5P.trigger(this, "scrollToTop");
    });

    this.on("thumbnailActivityClick", (event) => {
      this.sideBar.animateTocWidth();
    });

    this.on('lessonInitiated', (event) => {
    });

    this.on('lessonCompleted', (event) => {
      if (event.data.completed && event.data.results) {
        const results = event.data.results;
      }
    });

    /**
     * Check if the current chapter is read.
     *
     * @returns {boolean} True, if current chapter was read.
     */
    this.isCurrentChapterRead = () =>
      this.isChapterRead(
        this.chapters[this.activeChapter],
        this.params.behaviour.progressAuto
      );

    /**
     * Checks if a chapter is read
     *
     * @param chapter
     * @param {boolean} autoProgress
     * @returns {boolean}
     */
    this.isChapterRead = (
      chapter,
      autoProgress = this.params.behaviour.progressAuto
    ) => chapter.completed || (autoProgress && chapter.tasksLeft === 0);

    /**
     * Check if chapter is final one, has no tasks and all other chapters are done.
     *
     * @param {number} chapterId Chapter id.
     * @return {boolean} True, if final chapter without tasks and other chapters done.
     */
    this.isFinalChapterWithoutTask = (chapterId) => {
      return (
        this.chapters[chapterId].maxTasks === 0 &&
        this.chapters
          .slice(0, chapterId)
          .concat(this.chapters.slice(chapterId + 1))
          .every((chapter) => chapter.tasksLeft === 0)
      );
    };

    /**
     * Set the current chapter as completed.
     *
     * @param {number} [chapterId] Chapter Id, defaults to current chapter.
     * @param {boolean} [read=true] True for chapter read, false for not read.
     */
    this.setChapterRead = (chapterId = this.activeChapter, read = true) => {
      this.handleChapterCompletion(chapterId, read);
      // this.sideBar.updateChapterProgressIndicator(chapterId, read ? 'DONE' : this.hasChapterStartedTasks(this.chapters[chapterId]) ? 'STARTED' : 'BLANK');
    };

    /**
     * Checks if chapter has started on any of the sections
     *
     * @param chapter
     * @return {boolean}
     */
    this.hasChapterStartedTasks = (chapter) =>
      chapter.sections.filter((section) => section.taskDone).length > 0;

    /**
     * Get textual status for chapter
     *
     * @param chapter
     * @param {boolean} progressAuto
     * @return {string}
     */
    this.getChapterStatus = (
      chapter,
      progressAuto = this.params.behaviour.progressAuto
    ) => {
      let status = "BLANK";

      if (this.isChapterRead(chapter, progressAuto)) {
        status = "DONE";
      } 
      else if (this.hasChapterStartedTasks(chapter)) {
        status = "STARTED";
      }

      return status;
    };

    /**
     * Update statistics on the main chapter.
     *
     * @param {number} chapterId Chapter Id.
     * @param {boolean} hasChangedChapter
     */
    this.updateChapterProgress = (chapterId, hasChangedChapter = false) => {
      if (!this.params.behaviour.progressIndicators) {
        return;
      }

      const chapter = this.chapters[chapterId];
      let status;
      if (chapter.maxTasks) {
        status = this.getChapterStatus(chapter);
      } 
      else {
        if (this.isChapterRead(chapter) && hasChangedChapter) {
          status = "DONE";
        } 
        else {
          status = "BLANK";
        }
      }

      if (status === "DONE") {
        this.handleChapterCompletion(chapterId);
      }

      // this.sideBar.updateChapterProgressIndicator(chapterId, status);
    };

    /**
     * Get id of chapter.
     *
     * @param {string} chapterUUID ChapterUUID.
     * @return {number} Chapter Id.
     */
    this.getChapterId = (chapterUUID) => {
      chapterUUID = chapterUUID.replace("h5p-interactive-book-chapter-", "");
      const chapterId = this.chapters
        .map((chapter) => chapter.instance.subContentId)
        .indexOf(chapterUUID);
      return chapterId === -1 ? 0 : chapterId;
    };

    /**
     * Checks if all chapters are completed and triggers the final completion event if they are.
     * This should be called after a chapter's state changes.
     * @param {boolean} [force=false] - If true, triggers completion even if not all chapters are done.
     */
    this.checkForBookCompletion = (force = false) => {
      // Prevent this from running more than once or during initialization

      if (this.completed || this.isInitializing) {
        return;
      }
      const allContentChapters = this.chapters.filter((chapter) => !chapter.isSummary);
      const totalChaptersInParams = this.params.chapters.length;

      // Robustness Check: Ensure all chapters defined in the H5P editor are loaded and ready.
      if (allContentChapters.length < totalChaptersInParams) {
        return;
      }

      const allChaptersAreCompleted = allContentChapters.every((chapter) => chapter.completed);

      if (allChaptersAreCompleted || force) {
        this.completed = true;

        // 🔥 FIX: Calculate lesson score based on your mentor's logic.
        // 1. Calculate Raw Score: Sum of scaled scores from all child activities.
        const rawScore = Object.values(this.childActivityResults).reduce((sum, result) => {
          // Add the scaled score if it exists, otherwise add 0.
          return sum + (result?.scaled || 0);
        }, 0);

        // 2. Calculate Max Score: Total number of scorable activities.
        const scorableActivities = this.params?.tableOfContents?.filter(tocItem => {
          return tocItem?.activityMetadata?.scoringmode === "autograded";
        }) || [];
        const maxScore = scorableActivities.length;

        // 3. Calculate the final scaled score for the lesson (0 to 1).
        const scaledScore = (maxScore > 0) ? (rawScore / maxScore) : 0;
        // Ensure the scaled score does not exceed 1.
        const finalScaledScore = Math.min(Number(scaledScore.toFixed(2)), 1);

        // Create a results object with the new scoring logic.
        const lessonCompletionResults = {
          score: rawScore,
          maxScore: maxScore,
          scaled: finalScaledScore,
          completed: this.completed,
          timestamp: new Date().toISOString()
        };

        // Get lesson title from content metadata
        const lessonTitle = this.lessonMetadata?.lessonTitle || this.params?.bookCover?.courseTitle || "Untitled Lesson";

        // 🔥 START: This is the new code to add.
        // 1. Get the most up-to-date state of the book.
        const finalState = this.getCurrentState();
 
        // 2. Manually and immediately save the state using H5P's core function.
        // This bypasses the 5-second delay without creating a new xAPI event.
        if (H5P && typeof H5P.setUserData === 'function') {
          // The 'state' key is standard for H5P state data.
          // The subContentId is 0 for the main content.
          H5P.setUserData(this.contentId, 'state', finalState, { subContentId: 0 });
        }

        // Adding a small delay so that we can have refine view on Prizm
        setTimeout(() => {
          // Your existing xAPI completion code (keep as is)
          try {
            const xAPIEvent = new H5P.XAPIEvent();
            const eventType = 'completed';
            xAPIEvent.setVerb(eventType);
            xAPIEvent.setActor();
            // xAPIEvent.setObject(this);

            const statement = xAPIEvent.data.statement;
            statement.object = {};
            statement.object.objectType = 'Activity';
            statement.object.definition = statement.object.definition || {};
            statement.object.definition.name = {
              "en-US": lessonTitle
            };
            statement.object.definition.extensions = this.buildExtensionsData(eventType, lessonCompletionResults);
            statement.object.definition.interactionType = 'other';

            // Calculate duration
            const lessonCompletedTime = new Date();
            const durationSeconds = Math.round((lessonCompletedTime - this.lessonInitializedTime) / 1000);
            const durationISO8601 = this.secondsToISO8601(durationSeconds);

            statement.result = {
              score: {
                scaled: finalScaledScore,
                raw: rawScore,
                max: maxScore,
                min: 0
              },
              completion: true,
              success: true,
              duration: durationISO8601
            };

            // 6. Override the object's ID if a custom URN is provided.
            if (config?.lessonMetadata?.lessonUrn || config?.lessonMetadata?.lessonId) {
              statement.object.id = config?.lessonMetadata?.lessonUrn || config?.lessonMetadata?.lessonId;
            }

            H5P.externalDispatcher.trigger(xAPIEvent);
          } 
          catch (error) {
            console.error("Error creating final book completion xAPI event:", error);
          }
        }, 300);
      }
    };

    /**
     * Handle chapter completion, e.g. trigger xAPI statements
     *
     * @param {number} chapterId Id of the chapter that was completed.
     * @param {boolean} [completed=true] True for completed, false for uncompleted.
     * @param {boolean} [force=false] - If true, forces a check for lesson completion.
     */
    this.handleChapterCompletion = (chapterId, completed = false, force = false) => {
      const chapter = this.chapters[chapterId];

      if (!chapter || chapter.isSummary === true) {
        return; // Exit if chapter doesn't exist or is the summary
      }

      // If marking as incomplete, reset the main 'completed' flag
      if (!completed) {
        this.completed = false;
        return;
      }

      // 🔥 PRIMARY JOB: Mark this single chapter as complete
      chapter.completed = true;

      // 🔥 SECONDARY JOB: Now, check if the whole book is done.
      this.checkForBookCompletion(force);
    };

    /**
     * Check if the content height exceeds the window.
     */
    // this.shouldFooterBeHidden = () => {
    //   // Always show except for in fullscreen
    //   // Ideally we'd check on the top window size but we can't always get it.
    //   return this.isFullscreen;
    // };

    /**
     * Get content container width.
     * @return {number} Container width or 0.
     */
    this.getContainerWidth = () => {
      return this.pageContent && this.pageContent.container
        ? this.pageContent.container.offsetWidth
        : 0;
    };

    /**
     * Change the current active chapter.
     *
     * @param {boolean} redirectOnLoad Is this a redirect which happens immediately?
     */
    this.changeChapter = (redirectOnLoad) => {
      this.pageContent.changeChapter(redirectOnLoad, this.newHandler);
      this.statusBarHeader.updateStatusBar();
      // this.statusBarFooter.updateStatusBar();
      this.newHandler.redirectFromComponent = false;
    };

    /**
     * Get list of classname and conditions for when to add the classname to the content type
     *
     * @return {[{className: string, shouldAdd: (function(*): boolean)}, {className: string, shouldAdd: (function(*): boolean|boolean)}, {className: string, shouldAdd: (function(*): boolean)}]}
     */
    this.breakpoints = () => {
      return [
        {
          className: this.smallSurface,
          shouldAdd: (ratio) => ratio < 769,
        },
        {
          className: this.mediumSurface,
          shouldAdd: (ratio) => ratio >= 769 && ratio <= 1023,
        },
        {
          className: this.largeSurface,
          shouldAdd: (ratio) => ratio > 1023,
        },
      ];
    };

    /**
     * Triggers whenever the hash changes, indicating that a chapter redirect is happening
     */
    H5P.on(this, "respondChangeHash", (event) => {
      // Try the live hash first (normal flow)
      let payload = URLTools.extractFragmentsFromURL(
        self.validateFragments,
        this.hashWindow
      );

      // Fallback: when a parent frame (e.g. Hawthorn / React Router) intercepts the
      // hashchange in its capture phase and restores the URL to protect its own router,
      // the live hash no longer contains the H5P chapter data.  Recover it from the
      // DOM hashchange event's `newURL`, which is snapshotted BEFORE the parent's
      // replaceState restoration.
      if (!payload.h5pbookid && event?.data?.newURL) {
        const rawHash = event.data.newURL.split('#')[1];
        if (rawHash) {
          const fakeWindow = { location: { hash: '#' + rawHash } };
          payload = URLTools.extractFragmentsFromURL(self.validateFragments, fakeWindow);
        }
      }

      if (
        payload.h5pbookid &&
        String(payload.h5pbookid) === String(self.contentId)
      ) {
        this.redirectChapter(payload);
      }
    });

    H5P.on(this, "changeHash", (event) => {
      if (String(event.data.h5pbookid) === String(this.contentId)) {
        this.hashWindow.location.hash = event.data.newHash;
      }
    });

    H5P.externalDispatcher.on("xAPI", function (event) {
      logger.debug("🚨 H5P.externalDispatcher - EVENT RECEIVED", event);
      console.log("🚨 H5P.externalDispatcher - EVENT RECEIVED", event);

      // 🔥 ROBUST: Handle both event.data and event.data.data structures
      let statement = null;
      let verb = null;

      // Try direct structure first (event.data.statement)
      if (event?.data?.statement) {
        statement = event.data.statement;
      }
      // Fallback to nested structure (event.data.data.statement)
      else if (event?.data?.data?.statement) {
        statement = event.data.data.statement;
      }
      // Last resort: check if event itself is the statement
      else if (event?.statement) {
        statement = event.statement;
      }

      // Extract verb from whichever structure we found
      if (statement?.verb?.id) {
        verb = statement.verb.id.split('/').pop();
      } 
      else {
        return; // Exit if we can't get the verb
      }

      const actionVerbs = ["initialized", "answered", "completed", "interacted", "attempted"];
      const isActionVerb = actionVerbs.indexOf(verb) > -1;
      const isInitialized = self.chapters.length;

      if (self !== this && isActionVerb && isInitialized) {
        const sectionUUID = statement?.object?.definition?.extensions?.[`${self.Lesson_MetaData}/contentId`] || statement?.activityMetadata?.contentId || self.subContentId || self.contentData?.subContentId;

        if (!sectionUUID) {
          return;
        }

        // 🔥 NEW: Log individual activity completion immediately
        // Pass the normalized statement instead of the full event
        // if (verb === "completed" || verb === "answered") {
        //   self.logIndividualActivityResult({ data: { statement } }, sectionUUID, this);
        // }

        // Instead of section id use activity's content id to match which chapter is completed

        // If activity is completed, mark the parent chapter as completed
        if (verb === 'completed' && statement?.result?.completion === true) {
          const chapterResult = self.findChapterByContentId(sectionUUID);
          if (chapterResult) {
            const scoreData = statement?.result?.score || {};
            // Use the unique sectionUUID as the key for the activity's result.
            // self.childActivityResults[sectionUUID] = statement?.result?.score || {};
            self.childActivityResults[sectionUUID] = {
              ...self.childActivityResults[sectionUUID], // Keep existing data
              ...scoreData,                             // Overwrite with new score
              completed: true                           // Explicitly mark as completed
            };

            // Dispatch to Redux Store
            store.dispatch(markActivityCompleted({ id: sectionUUID, data: scoreData }));

            const chapterId = self.getChapterId(chapterResult?.instance?.subContentId);

            // Check if this was the last activity in the book.
            const isLast = self.isLastActivity(sectionUUID);

            self.setSectionStatusByID(sectionUUID);
            self.handleChapterCompletion(chapterId, true, isLast);

            // When this activity completes, unblock the NEXT chapter:
            // - Remove the blocking overlay (if present)
            // - Build and inject the recall accordion in its place
            const completedChapterIdx = self.chapters.indexOf(chapterResult);
            const nextPageChapter = self.pageContent?.chapters?.[completedChapterIdx + 1];
            if (nextPageChapter) {
              if (nextPageChapter.recallAccordionInstance) {
                // Accordion already exists — enable it and refresh the rendered
                // content so any updated answers from the activity page are shown.
                nextPageChapter.recallAccordionInstance.enable();
                nextPageChapter.recallAccordionInstance.refresh();
              }
              else if (nextPageChapter.recallBlockOverlay) {
                // ✅ NEW CODE: Parent is now wrapper
                // Overlay is showing — remove it and create the accordion.
                const overlay = nextPageChapter.recallBlockOverlay;
                const wrapper = overlay.parentElement; // Parent is now the wrapper, not columnNode
                if (wrapper) {
                  wrapper.removeChild(overlay);
                  
                  // Re-enable interaction with chapter content
                  const columnNode = self.pageContent?.columnNodes?.[completedChapterIdx + 1];
                  if (columnNode) {
                    columnNode.style.pointerEvents = '';
                    columnNode.style.userSelect = '';
                  }
                }
                nextPageChapter.recallBlockOverlay = null;
                // Delegate accordion creation to PageContent so it reuses the
                // same renderRecallActivity logic.
                self.pageContent?.buildRecallAccordionForChapter(completedChapterIdx + 1);
              }
            }

            // (Replaced by direct call above — no event bus needed)
            // self.trigger('recallActivityCompleted', { activityId: sectionUUID });
          }
        }
      }
    });

    /**
     * Find chapter that a section belongs to.
     *
     * @param {string} sectionUUID Section UUID.
     * @returns {object|null} Chapter object or null if not found.
     */
    this.findChapterByContentId = (contentId) => {
      for (const chapter of this.chapters) {
        for (const section of chapter.sections) {
          if (section?.content?.id === contentId) {
            return chapter;
          }
        }
      }
    };

    /**
     * Redirect chapter.
     *
     * @param {object} target Target data.
     * @param {string} target.h5pbookid Book id.
     * @param {string} target.chapter Chapter UUID.
     * @param {string} target.section Section UUID.
     */
    this.redirectChapter = (target) => {
      /**
       * If true, we already have information regarding redirect in newHandler
       * When using browser history, a convert is neccecary
       */
      if (!this.newHandler.redirectFromComponent) {
        // Assert that the handler actually is from this content type.
        if (
          target.h5pbookid &&
          String(target.h5pbookid) === String(self.contentId)
        ) {
          self.newHandler = target;
          /**
           * H5p-context switch on no newhash = history backwards
           * Redirect to first chapter
           */
        } 
        else {
          self.newHandler = {
            chapter: `h5p-interactive-book-chapter-${self.chapters[0].instance.subContentId}`,
            h5pbookid: self.h5pbookid,
          };
        }
      }
      self.changeChapter(false);
    };

    /**
     * Set a section progress indicator by searching through all chapters.
     *
     * @param {string} sectionUUID UUID of target section.
     */
    this.setSectionStatusByID = (sectionUUID) => {
      this.chapters.forEach((chapter, chapterId) => {
        chapter.sections.forEach((section, sectionIndex) => {
          const sectionInstance = section.instance;

          // Match by contentId instead of subContentId
          if (section?.content?.id === sectionUUID && !section.taskDone) {
            // Check if instance has given an answer
            section.taskDone = sectionInstance.getAnswerGiven
              ? sectionInstance.getAnswerGiven()
              : true;

            if (section.taskDone) {
              if (this.isSimpleView) {
                this.simpleViewSideBar.setSectionMarker(chapterId, sectionIndex);
              }
              else {
                this.sideBar.setSectionMarker(chapterId, sectionIndex);
              }
              this.chapters[chapterId].tasksLeft -= 1;
              this.updateChapterProgress(chapterId);
            }
          }
        });
      });
    };

    /**
     * Add listener for hash changes to specified window
     */
    this.addHashListener = (hashWindow) => {
      hashWindow.addEventListener("hashchange", (event) => {
        H5P.trigger(this, "respondChangeHash", event);
      });
      this.hashWindow = hashWindow;
    };

    try {
      this.addHashListener(top);
    } 
    catch (e) {
      if (e instanceof DOMException) {
        // Use iframe window to store book location hash
        this.addHashListener(window);
      } 
      else {
        throw e;
      }
    }

    /**
     * Display book cover
     *
     * @param wrapper
     */
    this.displayCover = (wrapper) => {
      this.hideAllElements(true);
      if (this.cover?.hidden) {
        this.cover.container.classList.remove("cover-hidden");
        this.cover.hidden = false;
      } 
      else {
        wrapper.append(this.cover.container);
      }
      /* if(wrapper) {
        wrapper.classList.add('covered');
      } */
      this.cover.initMedia();
    };

    /**
     * Attach library to wrapper
     * @param {jQuery} $wrapper
     */
    this.attach = ($wrapper) => {
      this.mainWrapper = $wrapper;
      // Needed to enable scrolling in fullscreen
      $wrapper.addClass("h5p-interactive-book h5p-scrollable-fullscreen");

      if (this.isEdge18orEarlier()) {
        $wrapper.addClass("edge-18");
      }

      // Initialize React wrapper demo
      // ReactWrapper.render($wrapper[0], this.contentId, this.contentData, this.config);

      this.setWrapperClassFromRatio(this.mainWrapper);

      if (
        this.cover &&
        this.shouldShowCover &&
        !isFOCPreviewEnabled(this.params?.foc)
      ) {
        this.displayCover($wrapper);

        // Send lesson-home-page postMessage only for initial page load (no URL fragments).
        // This avoids firing when navigating back to cover from inside the app.
        try {
          const initialFragments = URLTools.extractFragmentsFromURL(this.validateFragments, this.hashWindow);
          if (initialFragments && Object.keys(initialFragments).length === 0) {
            sendPostMessage('lesson-home-page', 'lesson-package');
          }
        }
        catch (e) {
          // Fail silently if URL parsing fails for any reason
          console.warn('Could not determine initial URL fragments for lesson-home-page message', e);
        }
      }
      else {
        this.trigger("showFrontOfClass", { visibility: true, $wrapper });
      }

      // Create activity landing page container
      const activityLandingPage = document.createElement('div');
      activityLandingPage.className = 'activity-rendering-container';

      // Append all components to the activity landing page container
      activityLandingPage.appendChild(this.statusBarHeader.wrapper);

      // ✅ MOVE: Extract page name element and move it to status header
      const pageNameElement = this.pageContent.container.querySelector('.h5p-interactive-book-page-name');
      if (pageNameElement) {
        // Remove page name from pageContent container
        pageNameElement.remove();

        // Add page name as child of status header
        this.statusBarHeader.wrapper.appendChild(pageNameElement);

        // ✅ ADD: Apply theme background color to status header if available
        if (this.params.themeData?.backgroundColor) {
          this.statusBarHeader.wrapper.style.backgroundColor = this.params.themeData.backgroundColor;
        }
      }
      
      // Add sidebar as first flex sibling to the existing main container
      if (this.isSimpleView) {
        this.pageContent.container.insertBefore(this.simpleViewSideBar.container, this.pageContent.container.firstChild);
      } 
      else {
        this.pageContent.container.insertBefore(this.sideBar.container, this.pageContent.container.firstChild);
      }
      
      activityLandingPage.appendChild(this.pageContent.container);
      // activityLandingPage.appendChild(this.statusBarFooter.wrapper);
      
      // Append the complete activity landing page to wrapper
      $wrapper.append(activityLandingPage);
      
      // Apply any pending hide state that was set before mainWrapper was available
      if (this.pendingHideState !== undefined) {
        this.hideAllElements(this.pendingHideState);
      }
      
      /*
      const outerHeight = window.parent !== window 
              ? window.parent.outerHeight 
              : window.outerHeight;
      $wrapper[0].style.height = `${outerHeight * 0.95}px`;*/
      $wrapper[0].style.backgroundColor =
        this.params.themeData.backgroundColor || "#D9D9D9";

      this.$wrapper = $wrapper;

      if (
        this.params.behaviour.defaultTableOfContents &&
        !this.isSmallSurface()
      ) {
        this.trigger("toggleMenu", { shouldNotFocusNav: true });
      }

      // this.pageContent.updateFooter();
    };

    /**
     * Checks if browser is IE Edge version 18 or earlier
     */
    this.isEdge18orEarlier = function () {
      const ua = window.navigator.userAgent;
      const edgeIndex = ua.indexOf("Edge/");
      if (edgeIndex < 0) {
        return false;
      }
      const edgeVersion = ua.substring(
        edgeIndex + 5,
        ua.indexOf(".", edgeIndex)
      );
      return parseInt(edgeVersion) <= 18;
    };

    /**
     * Hide all elements.
     *
     * @param {boolean} hide True to hide elements.
     */
    this.hideAllElements = function (hide) {
      // Store the hide state for later use if mainWrapper is not ready
      this.pendingHideState = hide;
      
      // If mainWrapper is not initialized yet, store the state and return
      if (!this.mainWrapper || !this.mainWrapper[0]) {
        return;
      }
      
      const activityLandingPageElement = this.mainWrapper[0].querySelector('.activity-rendering-container');
      
      if (activityLandingPageElement) {
        if (hide) {
          activityLandingPageElement.style.display = "none";
        } 
        else {
          activityLandingPageElement.style.display = "flex";
          activityLandingPageElement.style.flexDirection = "column";
        }
        
        // Clear pending state since we've applied it
        this.pendingHideState = undefined;
      }
      
    };

    this.frontOfClassVisibility = function (obj) {
      if (obj.data.visibility) {
        this.hideAllElements(true);
        if (this.cover && !this.cover.hidden) {
          this.cover.container.classList.add("cover-hidden");
          this.cover.hidden = true;
        }
        if (this.$wrapper) {
          this.$wrapper.append(this.focContent.container);
        } 
        else {
          obj?.data?.$wrapper.append(this.focContent.container);
        }

        // Initialize FOC when it becomes visible to ensure proper hotspot positioning
        setTimeout(() => {
          this.focContent.initializeWhenVisible();
          // Trigger resize to ensure proper image dimensions and layout
          this.trigger('resize');
        }, 10);
      } 
      else {
        this.focContent.container.remove();
        this.cover.container.classList.remove("cover-hidden");
        this.cover.hidden = false;
        this.displayCover(this.mainWrapper);
      }
    };

    this.on("showFrontOfClass", (obj) => {
      this.frontOfClassVisibility(obj);
    });

    /*
     * Cover page shound not be shown if the previous state provides a chapter
     * that was previously opened or if user provided a chapter in URL
     */
    const urlFragments = URLTools.extractFragmentsFromURL(
      this.validateFragments,
      this.hashWindow
    );

    this.shouldShowCover = this.params.showCoverPage;

    // Initialize the support components
    if (this.params.showCoverPage) {
      this.cover = new Cover(
        this.params.bookCover,
        contentData.metadata.title,
        this.l10n.start,
        contentId,
        this
      );

      this.on('xAPI', (event) => {
        // console.log("📊 InteractiveBook received xAPI event: Parent", event);
        // This ensures the event is properly formatted for H5P.externalDispatcher
      });
    }

    const childContentData = {
      ...contentData,
      parent: this,
    };
    this.pageContent = new PageContent(
      this.params,
      contentId,
      childContentData,
      this,
      {
        l10n: {
          markAsFinished: this.l10n.markAsFinished,
        },
        behaviour: this.params.behaviour,
      }
    );

    this.focContent = new FrontOfClassContent(
      this.params,
      contentId,
      childContentData,
      this,
      {
        l10n: {
          markAsFinished: this.l10n.markAsFinished,
        },
        behaviour: this.params.behaviour,
      }
    );

    this.chapters = this.pageContent.getChapters();

    // 🔥 NEW: Pre-populate childActivityResults for all scorable activities with a default score of 0.
    const scorableActivities = this.params?.tableOfContents?.filter(tocItem => {
      return tocItem?.activityMetadata?.scoringmode === "autograded";
    }) || [];

    scorableActivities.forEach(activity => {
      const activityId = activity?.id;
      if (activityId && !this.childActivityResults[activityId]) {
        // This ensures every scorable activity is in the results object from the start.
        this.childActivityResults[activityId] = {
          scaled: 0,
          raw: 0,
          max: 0,
          min: 0,
          completed: false,
        };

        // 🔥 NEW: Check if there's matching data in previousState
        if (this.previousState?.individualScore && Object.keys(this.previousState.individualScore || {}).length > 0) {
          // const matchingChapter = Object.keys(this.previousState?.individualScore).find(chapter => chapter.id === activityId);
          const matchingChapter = (this.previousState?.individualScore && Object.hasOwn(this.previousState.individualScore, activityId) && this.previousState.individualScore[activityId]?.completed === true)
            ? this.previousState.individualScore[activityId]
            : null;
          if (matchingChapter) {
            // Update the childActivityResults with previousState data
            // This ensures every scorable activity is in the results object from the start.
            const { completed, max, min, raw, scaled } = matchingChapter;
            this.childActivityResults[activityId] = {
              scaled: scaled || 0,
              raw: raw || 0,
              max: max || 0,
              min: min || 0,
              completed: completed || false,
            };
            // TODO: Map the specific fields from matchingChapter to childActivityResults
          }
        }
      }
    });

    this.sideBar = new SideBar(
      this.params,
      contentId,
      contentData.metadata.title,
      this
    );
    this.simpleViewSideBar = new SimpleViewSideBar(
      this.params,
      contentId,
      contentData.metadata.title,
      this
    );

    // Set progress (from previous state);
    if (!this.hasRestoredState) {
      this.chapters.forEach((chapter, index) => {
        const isChapterCompleted = this.getPersistedChapterCompletion(chapter);
        this.setChapterRead(index, isChapterCompleted);
      });
      this.hasRestoredState = true;
    }

    // Mark initialization as complete
    this.isInitializing = false;

    // Get lesson title from content metadata
    const lessonTitle = this.lessonMetadata?.lessonTitle || this.params?.bookCover?.courseTitle || "Untitled Lesson";

    // Fire xAPI initialized with lesson metadata
    if (!this.hasTriggeredInitialized) {
      try {
        // Create a proper H5P xAPI event using the constructor
        const xAPIEvent = new H5P.XAPIEvent();
        const eventType = "initialized";
        xAPIEvent.setVerb(eventType);
        xAPIEvent.setActor();
        // xAPIEvent.setObject(this);

        // Add lesson metadata
        const statement = xAPIEvent.data.statement;
        statement.object = {};
        statement.object.objectType = 'Activity';
        statement.object.id = config?.lessonMetadata?.lessonUrn || config?.lessonMetadata?.lessonId || "1";
        statement.object.definition = statement.object.definition || {};
        statement.object.definition.name = {
          "en-US": lessonTitle
        };
        statement.object.definition.extensions = statement.object.definition.extensions || {};
        statement.object.definition.extensions = this.buildExtensionsData(eventType);
        statement.object.definition.interactionType = 'other';

        this.hasTriggeredInitialized = true;
        this.trigger("lessonInitiated", { initiated: this.hasTriggeredInitialized });
        H5P.externalDispatcher.trigger(xAPIEvent);
      } 
      catch (error) {
        console.error("Error creating xAPI event:", error);
      }
    }

    // Continue with status bar initialization...
    this.statusBarHeader = new StatusBar(
      contentId,
      this.chapters.length,
      this,
      {
        l10n: this.l10n,
        a11y: this.params.a11y,
        behaviour: this.params.behaviour,
        displayFullScreenButton: true,
        displayMenuToggleButton: true,
        mainTitle: contentData.metadata.title,
        bookCover: this.params.bookCover,
        showCoverPage: this.params.showCoverPage,
        themeData: this.params.themeData,
      },
      "h5p-interactive-book-status-header",
      false,
      this.params
    );

    // Ensure page content heights are calculated after the status header exists.
    // The StatusBar is created here (so the header is now in DOM when attached later),
    requestAnimationFrame(() => {
      try {
        if (this.pageContent && typeof this.pageContent.applyChapterHeight === 'function') {
          this.pageContent.applyChapterHeight();
        }
      }
      catch (e) {
        // Non-fatal: if applyChapterHeight fails here we'll fallback to its internal retry logic
        console.warn('Deferred applyChapterHeight invocation failed', e);
      }
    });

    // this.statusBarFooter = new StatusBar(
    //   contentId,
    //   this.chapters.length,
    //   this,
    //   {
    //     l10n: this.l10n,
    //     a11y: this.params.a11y,
    //     behaviour: this.params.behaviour,
    //     displayToTopButton: false,
    //     mainTitle: contentData.metadata.title,
    //     bookCover: this.params.bookCover,
    //     themeData: this.params.themeData,
    //   },
    //   "h5p-interactive-book-status-footer",
    //   true,
    //   this.params
    // );

    if (this.hasCover()) {
      this.hideAllElements(true);

      this.on("coverRemoved", () => {
        this.hideAllElements(false);

        // Ensure that URL is updated, so getCurrentState will resume without showing cover
        if (this.params.chapters[this.activeChapter]?.subContentId) {
          this.trigger("newChapter", {
            h5pbookid: this.contentId,
            chapter: `h5p-interactive-book-chapter-${this.params.chapters[this.activeChapter].subContentId}`,
            section: 0,
          });
        }

        this.trigger("resize");

        // Focus header progress bar when cover is removed
        this.statusBarHeader.progressBar.progress.focus();
      });
    }

    if (this.hasValidChapters()) {
      // Kickstart the statusbar
      this.statusBarHeader.updateStatusBar();
      // this.statusBarFooter.updateStatusBar();
    }

    // Notify parent window that interactive book has loaded successfully
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'lesson-preview-loaded',
        source: 'lesson-preview',
        contentId: this.contentId,
        lessonId: this.lessonMetadata?.lessonId,
        lessonUrn: this.lessonMetadata?.lessonUrn,
        timestamp: new Date().toISOString()
      }, '*');
      logger.debug('📤 Sent lesson-preview-loaded message to parent');
    }

    // Add window resize listener with proper debouncing
    window.addEventListener('resize', () => {
      // Only trigger resize if not already in progress
      if (!this.isResizing) {
        this.resize();
      }
    }, { passive: true });
  }


  /**
   * Make sure that the config used is in a good state. This includes default values for all language strings
   *
   * @param originalConfig
   * @return {*}
   */
  static sanitizeConfig(originalConfig) {
    const {
      start = "Start",
      displayTOC = "Display &#039;Table of contents&#039;",
      hideTOC = "Hide &#039;Table of contents&#039;",
      nextPage = "Next page",
      previousPage = "Previous page",
      chapterCompleted = "Page completed!",
      partCompleted = "@pages of @total completed",
      incompleteChapter = "Incomplete page",
      navigateToTop = "Navigate to the top",
      markAsFinished = "I have finished this page",
      fullscreen = "Fullscreen",
      exitFullscreen = "Exit fullscreen",
      bookProgressSubtext = "@count of @total pages",
      interactionsProgressSubtext = "@count of @total interactions",
      submitReport = "Submit Report",
      restartLabel = "Restart",
      summaryHeader = "Summary",
      allInteractions = "All interactions",
      unansweredInteractions = "Unanswered interactions",
      scoreText = "@score / @maxscore",
      leftOutOfTotalCompleted = "@left of @max interactinos completed",
      noInteractions = "No interactions",
      score = "Score",
      summaryAndSubmit = "Summary & submit",
      noChapterInteractionBoldText = "You have not interacted with any pages.",
      noChapterInteractionText = "You have to interact with at least one page before you can see the summary.",
      yourAnswersAreSubmittedForReview = "Your answers are submitted for review!",
      bookProgress = "Book progress",
      interactionsProgress = "Interactions progress",
      totalScoreLabel = "Total score",
      ...config
    } = originalConfig;

    config.chapters = config.chapters
      .map((chapter) => {
        chapter.params.content = chapter.params.content.filter(
          (content) => content.content
        );
        return chapter;
      })
      .filter(
        (chapter) => chapter.params.content && chapter.params.content.length > 0
      );

    config.behaviour.displaySummary =
      config.behaviour.displaySummary === undefined ||
      config.behaviour.displaySummary;

    config.l10n = {
      start,
      displayTOC,
      hideTOC,
      nextPage,
      previousPage,
      chapterCompleted,
      partCompleted,
      incompleteChapter,
      navigateToTop,
      markAsFinished,
      fullscreen,
      exitFullscreen,
      bookProgressSubtext,
      interactionsProgressSubtext,
      submitReport,
      restartLabel,
      summaryHeader,
      allInteractions,
      unansweredInteractions,
      scoreText,
      leftOutOfTotalCompleted,
      noInteractions,
      score,
      summaryAndSubmit,
      noChapterInteractionBoldText,
      noChapterInteractionText,
      yourAnswersAreSubmittedForReview,
      bookProgress,
      interactionsProgress,
      totalScoreLabel,
    };

    return config;
  }

  buildXAPIEventTrigger() {
    // If this event has already been triggered once, do nothing.
    if (this.hasTriggeredInteracted) {
      return;
    }

    try {
      // Get lesson title from content metadata
      const lessonTitle = this.lessonMetadata?.lessonTitle || this.params?.bookCover?.courseTitle || "Untitled Lesson";

      // Ensure the external dispatcher is available before trying to use it
      if (H5P && H5P.externalDispatcher) {
        const xAPIEvent = new H5P.XAPIEvent();
        const eventType = 'interacted';
        xAPIEvent.setVerb(eventType);
        xAPIEvent.setActor();

        // Get the statement to modify its definition, just like in app.js
        const statement = xAPIEvent.data.statement;
        statement.object = {};
        statement.object.objectType = 'Activity';
        statement.object.id = this.config?.lessonMetadata?.lessonUrn || this.config?.lessonMetadata?.lessonId || "1";
        statement.object.definition = statement.object.definition || {};
        statement.object.definition.name = {
          "en-US": lessonTitle
        };
        statement.object.definition.extensions = statement.object.definition.extensions || {};
        statement.object.definition.extensions = this.buildExtensionsData(eventType);
        statement.object.definition.interactionType = 'other';

        H5P.externalDispatcher.trigger(xAPIEvent);

        // Set the flag to true so this event doesn't fire again.
        this.hasTriggeredInteracted = true;
      }
    } 
    catch (error) {
      console.error("Error creating xAPI event for TOC interaction:", error);
    }
  }

  getPersistedChapterCompletion(chapter) {
    const chapterActivities = chapter.sections || [];

    // Check completion status from your tracking system
    const completedActivities = chapterActivities.filter(section => {
      const activityId = section?.content?.id;
      return this.childActivityResults[activityId]?.completed === true;
    });

    const allActivitiesCompleted = completedActivities.length === chapterActivities.length;

    // 🔥 NEW: Also restore tasksLeft based on completed activities
    const tasksLeft = Math.max(0, chapterActivities.length - completedActivities.length);
    chapter.tasksLeft = tasksLeft;

    // 🔥 NEW: Also restore section.taskDone flags
    chapterActivities.forEach(section => {
      const activityId = section?.content?.id;
      section.taskDone = this.childActivityResults[activityId]?.completed === true;
    });

    return allActivitiesCompleted || chapter.completed || false;
  }


  /**
   * Checks if a given activity is the final content activity in the book.
   * @param {string} sectionUUID - The UUID of the section/activity to check.
   * @returns {boolean} True if it's the last activity, false otherwise.
   */
  isLastActivity(sectionUUID) {
    if (!this.chapters || this.chapters?.length === 0) {
      return false;
    }

    // Get all chapters that are not the summary page
    const contentChapters = this.chapters?.filter(c => !c.isSummary);
    if (contentChapters?.length === 0) {
      return false;
    }

    // Get the very last chapter
    const lastChapter = contentChapters?.[contentChapters.length - 1];
    if (!lastChapter?.sections || lastChapter?.sections?.length === 0) {
      return false;
    }

    // Get the very last section (activity) in that chapter
    const lastSection = lastChapter?.sections[lastChapter?.sections?.length - 1];

    // The UUID is stored in section.content.id
    const lastSectionUUID = lastSection?.content?.id;

    // Compare the given UUID with the last activity's UUID
    // return sectionUUID === lastSectionUUID; // Paused the partial lesson complete feature.
    return false;
  }
}
