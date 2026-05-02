import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store/store';

const ReactApp = ({ contentId, contentData, config }) => {
  useEffect(() => {
    console.log("ReactWrapper initialized with contentId:", contentId);
  }, [contentId]);

  return (
    <div className="react-wrapper-content">
      <h2>Welcome to the React Wrapper</h2>
      <p>This is a React component running inside an H5P module!</p>
      {/* You can start building your React features here */}
      <div className="react-feature">
        <strong>Content ID:</strong> {contentId}
      </div>
    </div>
  );
};

export default class ReactWrapper {
  /**
   * Initializes the React Wrapper
   * @param {HTMLElement} container The container where the React app should be mounted
   * @param {string} contentId The H5P content ID
   * @param {object} contentData The H5P content data
   * @param {object} config Additional configuration
   */
  static render(container, contentId, contentData, config) {
    if (!container) return;

    // Create a new div inside the container to mount the React app
    const reactMountPoint = document.createElement('div');
    reactMountPoint.className = 'h5p-react-mount-point';
    container.appendChild(reactMountPoint);

    // Initialize React Root and render
    const root = createRoot(reactMountPoint);
    root.render(
      <Provider store={store}>
        <ReactApp 
          contentId={contentId} 
          contentData={contentData} 
          config={config} 
        />
      </Provider>
    );

    return root;
  }
}
