import { configureStore } from '@reduxjs/toolkit';
import { reducer } from './slice';

const store = configureStore({
  reducer: {
    // Add your reducer from slice.ts here
    slice: reducer,
  },
});

export default store;
