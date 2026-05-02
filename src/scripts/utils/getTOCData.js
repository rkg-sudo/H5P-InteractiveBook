import { newTocIcons, tocIcons } from "../icons";
import { generateClampCSS } from "../utils";

/**
 * Unified TOC Data utility function
 * @param {string} iconName - The skill/icon name to get data for
 * @param {Object} options - Configuration options
 * @param {Object} options.skillData - Skill data from parent params
 * @param {Object} options.themeData - Theme data for custom icons
 * @param {string} options.mode - Output mode: 'full', 'labelOnly', 'withStates'
 * @param {string} options.icons - Output TOC icon set, defaults to tocIcons or newTocIcons
 * @returns {Object} TOC data with label and icon
 */
export function getTOCData(iconName, options = {}) {
  const {
    skillData = {},
    themeData = null,
    mode = "full", // 'full', 'labelOnly', 'withStates'
    icons = "newTocIcons", // Custom TOC icons
    branchingIconName = "", // Flag for branching TOC context
    fromSimpleView = false, // Flag for simpleview context
  } = options;

  // Determine which icon set to use
  let iconSet = icons === "newTocIcons" ? newTocIcons : tocIcons;
  if (themeData?.tableOfContent?.skillIcons) {
    iconSet = themeData.tableOfContent.skillIcons;
  }
  if (fromSimpleView && themeData?.simpleView?.toc?.skillIcons) {
    iconSet = themeData.simpleView.toc.skillIcons;
  }

  // Normalize uppercase and mixed case keys to lowercase, preserve camelCase and numbers
  const normalizeKeysToLowercase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const normalized = {};
    Object.keys(obj).forEach(key => {
      // Check if key is camelCase (starts with lowercase letter and has uppercase letters)
      const isCamelCase = /^[a-z][a-zA-Z0-9_]*$/.test(key) && /[A-Z]/.test(key);
      
      // Convert only letters to lowercase, preserve numbers and special chars
      const normalizedKey = isCamelCase ? key : key.replace(/[A-Z]/g, (match) => match.toLowerCase());
      const value = obj[key];
      
      // If value is an object, recursively normalize its keys too
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        normalized[normalizedKey] = normalizeKeysToLowercase(value);
      } 
      else {
        normalized[normalizedKey] = value;
      }
    });
    return normalized;
  };

  // Apply normalization to iconSet if it's from theming
  if (themeData && iconSet) {
    iconSet = normalizeKeysToLowercase(iconSet);
  }
  

  // Handle vocabulary normalization
  if (iconName === "Vocab" || iconName === "vocab") {
    iconName = "vocabulary";
  }

  // Handle skill data present case
  if (branchingIconName) {
    let branchingLabel = "--";
    let branchingIcon = iconSet?.warningIcon;
    let branchingHover = iconSet?.hover?.warningIcon;
    let branchingSelected = iconSet?.selected?.warningIcon;

    if (iconName && Object.prototype.hasOwnProperty.call(skillData, iconName)) {
      branchingLabel = skillData[iconName]?.label || "--";
    } 
    else {
      // Handle skill data not present case
      branchingLabel = iconName?.toLowerCase() || "--";
    }

    if (iconSet && Object.prototype.hasOwnProperty.call(iconSet, branchingIconName)) {
      branchingIcon = iconSet[branchingIconName];
      branchingHover = iconSet.hover[branchingIconName];
      branchingSelected = iconSet.selected[branchingIconName];
    }

    return {
      label: branchingLabel,
      icon: {
        default: branchingIcon,
        hoverState: branchingHover,
        selectedState: branchingSelected,
      },
    };
  }

  // If mode is labelOnly, return just the label
  if (mode === "labelOnly") {
    if (iconName && Object.prototype.hasOwnProperty.call(skillData, iconName)) {
      return {
        label: skillData[iconName].label || iconName,
      };
    } 
    else {
      if (!Object.prototype.hasOwnProperty.call(iconSet, iconName)) {
        return {
          label: "--"
        };
      }
      return {
        label: iconName || "--",
      };
    }
  }

  // Handle skill data present case
  if (iconName && Object.prototype.hasOwnProperty.call(skillData, iconName)) {
    const skillIcon = skillData[iconName].skillIcon || "";
    const skillLabel = skillData[iconName].label || iconName;
    const normalizedLabelName = skillLabel.toLowerCase();

    // Generate icon text from skill icon
    const iconText = skillIcon
      .split("_")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("");

    // Check if custom icon exists in icon set
    if (iconSet && Object.prototype.hasOwnProperty.call(iconSet, normalizedLabelName)) {
      // Handle different modes for icon output
      if (mode === "withStates" && iconSet.hover && iconSet.selected) {
        return {
          label: skillData[iconName].label || iconName,
          icon: {
            default: iconSet[normalizedLabelName],
            hoverState: iconSet.hover[normalizedLabelName],
            selectedState: iconSet.selected[normalizedLabelName],
          },
        };
      } 
      else {
        // Simple icon mode
        return {
          label: skillData[iconName].label || iconName,
          icon: iconSet[normalizedLabelName],
        };
      }
    }

    // Fallback to generated icon text
    let iconHtml = `<span class="toc-skill-icon" style="pointer-events: none;">${iconText}</span>`;

    // Add CSS clamp styling if function provided (for simpleviewsidebar)
    const size = generateClampCSS("1.5rem", "1.5rem");
    const fontSize = generateClampCSS("1.2rem", "1.2rem");
    iconHtml = `<span class="toc-skill-icon" style="width: ${size}; height: ${size}; pointer-events: none; font-size: ${fontSize};">${iconText}</span>`;

    return {
      label: skillData[iconName].label || iconName,
      icon: iconHtml,
    };
  } 
  else {
    // Handle skill data not present case
    const iconLabel = iconName?.toLowerCase() || "default";

    // Handle withStates mode
    if (mode === "withStates" && iconSet.hover && iconSet.selected) {
      // Check if specific icon exists
      if (!Object.prototype.hasOwnProperty.call(iconSet, iconLabel)) {
        // Return warning icon or default
        const fallbackIcon = iconSet.warningIcon || iconSet["default"];
        const fallbackHover =
          iconSet.hover?.warningIcon || iconSet.hover?.["default"];
        const fallbackSelected =
          iconSet.selected?.warningIcon || iconSet.selected?.["default"];

        return {
          label: "--",
          icon: {
            default: fallbackIcon,
            hoverState: fallbackHover,
            selectedState: fallbackSelected,
          },
        };
      }

      const normalizedLabelName = iconName.toLowerCase();
      return {
        label: iconName || "--",
        icon: {
          default: iconSet[normalizedLabelName],
          hoverState: iconSet.hover[normalizedLabelName],
          selectedState: iconSet.selected[normalizedLabelName],
        },
      };
    } 
    else {
      // Simple mode - return default or specific icon
      if (!Object.prototype.hasOwnProperty.call(iconSet, iconLabel)) {
        return {
          label: "--",
          icon: iconSet.warningIcon, // Fallback to default icon
        };
      }

      return {
        label: iconName || "--",
        icon: iconSet[iconLabel],
      };
    }
  }
}

/**
 * Convenience wrapper for cover.js usage
 */
export function getCoverTOCData(iconName, skillData, themeData, branchingIconName = "") {
  return getTOCData(iconName, {
    skillData,
    icons: "newTocIcons",
    mode: "withStates",
    themeData,
    branchingIconName
  });
}

/**
 * Convenience wrapper for pagecontent.js usage
 */
export function getPageContentTOCData(iconName, skillData, themeData) {
  return getTOCData(iconName, {
    skillData,
    mode: "labelOnly",
    themeData,
  });
}

/**
 * Convenience wrapper for sidebar.js usage
 */
export function getSidebarTOCData(iconName, skillData, themeData, branchingIconName = "") {
  return getTOCData(iconName, {
    skillData,
    icons: "newTocIcons",
    mode: "withStates",
    themeData,
    branchingIconName
  });
}

/**
 * Convenience wrapper for simpleviewsidebar.js usage
 */
export function getSimpleViewSidebarTOCData(iconName, skillData, themeData, branchingIconName = "") {
  return getTOCData(iconName, {
    skillData,
    themeData,
    mode: "withStates",
    icons: "newTocIcons",
    branchingIconName,
    fromSimpleView: true, 
  });
}

/**
 * Convenience wrapper for simpleviewtocmobile.js usage
 */
export function getSimpleViewTOCMobileTOCData(iconName, skillData, themeData, branchingIconName = "") {
  return getTOCData(iconName, {
    skillData,
    themeData,
    mode: "withStates",
    icons: "newTocIcons",
    branchingIconName,
    fromSimpleView: true, 
  });
}
