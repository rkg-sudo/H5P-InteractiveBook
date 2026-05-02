import React from 'react';
import { createRoot } from 'react-dom/client';
import CoverComponent from '../components/CoverReact';

/**
 * The React drop-in replacement for Cover
 */
export default class Cover extends H5P.EventDispatcher {
  constructor(params, titleText, startText, contentId, parent) {
    super();

    this.parent = parent;
    this.container = document.createElement('div');
    this.container.classList.add('h5p-interactive-book-cover');
    this.hidden = false;

    // React initialization
    this.root = createRoot(this.container);
    this.renderReact(params, titleText, startText, contentId, parent);
  }

  renderReact(params, titleText, startText, contentId, parent) {
    this.root.render(
      <CoverComponent 
        params={params} 
        titleText={titleText} 
        startText={startText} 
        contentId={contentId} 
        parent={parent}
        onRead={() => {
          this.trigger('read');
        }}
      />
    );
  }

  initMedia() {
    // Initialize any media like videos or audio if necessary, similar to old Cover.
  }
}
