import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import RecallContainer from './recall/controllers/RecallContainer';

export default class ReactWrapper {
  /**
   * Initializes the React Wrapper
   * Mounts a minimal React root with the Redux Provider.
   * xAPI dispatching is handled directly in app.js via store.dispatch().
   * This root exists so that renderRecallContainer sub-roots share the same store.
   *
   * @param {HTMLElement} container
   * @param {string} contentId
   * @param {object} contentData
   * @param {object} config
   * @param {object} interactiveBookInstance
   */
  static render(container, contentId, contentData, config, interactiveBookInstance) {
    if (!container) return;

    // Create a hidden div — no visible UI
    const reactMountPoint = document.createElement('div');
    reactMountPoint.className = 'h5p-react-mount-point';
    reactMountPoint.style.display = 'none';
    container.appendChild(reactMountPoint);

    const root = createRoot(reactMountPoint);
    root.render(
      <Provider store={store} />
    );

    return root;
  }

  /**
   * Renders the Recall Container in a specific DOM element.
   */
  static renderRecallContainer(container, props) {
    if (!container) return;
    
    const root = createRoot(container);
    root.render(
      <Provider store={store}>
        <RecallContainer {...props} />
      </Provider>
    );
    
    // Return a cleanup/update interface if needed
    return {
      root,
      update: (newProps) => root.render(
        <Provider store={store}>
          <RecallContainer {...newProps} />
        </Provider>
      ),
      unmount: () => root.unmount()
    };
  }
}
