import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Add global state properties here
  activeChapterId: null,
  isSidebarOpen: false,
  completedActivities: {}, // Stores completion data by sectionUUID
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setActiveChapterId: (state, action) => {
      state.activeChapterId = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    markActivityCompleted: (state, action) => {
      const { id, data } = action.payload;
      const prev = state.completedActivities[id];
      state.completedActivities[id] = {
        ...prev,
        ...data,
        completed: true,
        // Increment version on every completion — allows UI to detect
        // re-submissions and refresh recalled content.
        version: (prev?.version || 0) + 1,
      };
    }
  },
});

export const { setActiveChapterId, toggleSidebar, setSidebarOpen, markActivityCompleted } = appSlice.actions;

export default appSlice.reducer;
