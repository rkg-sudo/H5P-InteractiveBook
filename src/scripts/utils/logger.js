/**
 * Logger utility for development and production environments
 * Automatically disables debug logs in production
 */

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Logger object with conditional logging based on environment
 */
export const logger = {
  /**
   * Log general information (only in development)
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (IS_DEVELOPMENT) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in development)
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (IS_DEVELOPMENT) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logged, even in production)
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Log info messages (only in development)
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    if (IS_DEVELOPMENT) {
      console.info(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (IS_DEVELOPMENT) {
      console.debug(...args);
    }
  },

  /**
   * Start a console group (only in development)
   * @param {...any} args - Group label and arguments
   */
  group: (...args) => {
    if (IS_DEVELOPMENT && console.group) {
      console.group(...args);
    }
  },

  /**
   * End a console group (only in development)
   */
  groupEnd: () => {
    if (IS_DEVELOPMENT && console.groupEnd) {
      console.groupEnd();
    }
  },

  /**
   * Create a collapsed console group (only in development)
   * @param {...any} args - Group label and arguments
   */
  groupCollapsed: (...args) => {
    if (IS_DEVELOPMENT && console.groupCollapsed) {
      console.groupCollapsed(...args);
    }
  },

  /**
   * Log a table (only in development)
   * @param {any} data - Tabular data
   */
  table: (data) => {
    if (IS_DEVELOPMENT && console.table) {
      console.table(data);
    }
  },

  /**
   * Start a timer (only in development)
   * @param {string} label - Timer label
   */
  time: (label) => {
    if (IS_DEVELOPMENT && console.time) {
      console.time(label);
    }
  },

  /**
   * End a timer (only in development)
   * @param {string} label - Timer label
   */
  timeEnd: (label) => {
    if (IS_DEVELOPMENT && console.timeEnd) {
      console.timeEnd(label);
    }
  },

  /**
   * Log current execution time for a timer (only in development)
   * @param {string} label - Timer label
   */
  timeLog: (label) => {
    if (IS_DEVELOPMENT && console.timeLog) {
      console.timeLog(label);
    }
  }
};

export default logger;
