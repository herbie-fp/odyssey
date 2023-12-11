import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Analysis = {
  expressionId: number,
  data: string
}

export type FPTaylorState = {
  analyses: Analysis[],
};

const initialState: FPTaylorState = {
  analyses: [] as Analysis[],
};

const yourSlice = createSlice({
  name: 'fpTaylor',
  initialState,
  reducers: {
    addAnalysis: (state, action: PayloadAction<Analysis>) => {
      state.analyses.push(action.payload);
    },
  },
});

export const reducer = yourSlice.reducer;
export const { addAnalysis } = yourSlice.actions;