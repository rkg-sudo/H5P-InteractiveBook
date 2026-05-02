/**
 * EventListenerManager - Manages event listeners with automatic cleanup
 * Prevents memory leaks by tracking and removing all registered listeners
 */
export class EventListenerManager {
  constructor() {
    this.listeners = new Map();
    this.idCounter = 0;
  }
  
  /**
   * Add an event listener and track it for cleanup
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event name (e.g., 'click', 'wheel')
   * @param {Function} handler - Event handler function
   * @param {Object} options - Event listener options
   * @returns {string} Unique identifier for this listener
   */
  add(element, event, handler, options = {}) {
    if (!element || !event || !handler) {
      console.warn('[EventListenerManager] Missing required parameters');
      return null;
    }
    
    const id = `listener-${this.idCounter++}`;
    const key = `${element.id || id}-${event}`;
    
    // Remove existing listener with same key to prevent duplicates
    if (this.listeners.has(key)) {
      this.remove(key);
    }
    
    element.addEventListener(event, handler, options);
    
    this.listeners.set(key, {
      id,
      element,
      event,
      handler,
      options
    });
    
    return key;
  }
  
  /**
   * Remove a specific event listener
   * @param {string} key - Listener key returned by add()
   */
  remove(key) {
    const listener = this.listeners.get(key);
    if (listener) {
      const { element, event, handler, options } = listener;
      element.removeEventListener(event, handler, options);
      this.listeners.delete(key);
    }
  }
  
  /**
   * Remove all event listeners managed by this instance
   */
  removeAll() {
    this.listeners.forEach(({ element, event, handler, options }) => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (e) {
        console.warn('[EventListenerManager] Error removing listener:', e);
      }
    });
    this.listeners.clear();
  }
  
  /**
   * Get count of active listeners
   * @returns {number}
   */
  getCount() {
    return this.listeners.size;
  }
  
  /**
   * Check if a specific listener exists
   * @param {string} key - Listener key
   * @returns {boolean}
   */
  has(key) {
    return this.listeners.has(key);
  }
}

export default EventListenerManager;
