import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';

// Create a singleton store instance to be shared across all React roots in the H5P application
export const store = configureStore({
  reducer: {
    app: appReducer,
  },
  // Adding middleware or devtools setup can go here
});
