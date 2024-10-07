# Adding Component To Odyssey Documentation

This documents my personal experience with adding a React component to Odyssey. 

**Task:** Building a front end component for Herbie's **translate** API endpoint. Given a user expression and a target language, we want to request the translated expression from Herbie's backend to display it in Odyssey.

- Create `ExpressionExport.tsx` in `Odyssey/src/herbie`
- Add it to `ExpressionTable.tsx` components (line 225)
  - **Note:** Fix `react-tooltip` error
- Fill out component with CoPilot
  - Add import statements, props, `useEffects`, returns
  - Write comments before coding
  - Don’t say "please" to the AI, be RUDE
- **Bug:** Error with calling Herbie server, sending JS instead of FPCore
  - **Fix:** In fetch call, import `fpcorejs` and use `mathjsToFPCore()`
- **Bug:** Displays work but not on the first time
  - **Looking for fix:**
    - Placed API call into `callTranslate` variable
    - Call `useEffect(callTranslate, [expressionText, language])` after API call
    - `setTimeout` for 300 milliseconds
  - **Fix:** First element was Python but is supposed to be lowercase `python`
    - Also leads to a future TODO of creating a list and not hard coding
    - We thought it was something wrong with our API call since we were getting an arity mismatch but in reality, it was an unsupported language error (“Python” vs “python”), hence the importance of good error handling on the backend.
- **Frontend TODOS:**
  - Do not hard code “python” in the `useState` or the languages, create a list of all the languages ✅
  - Check line 48, try to remove it, we might not need to `setTimeout`. Try also reverting the `callTranslate` variable, might not need it since the error was in the naming and not the API call. ✅

Expression translated into python:
![image](https://github.com/herbie-fp/odyssey/assets/112049313/a4996235-21cc-48fc-83e6-3210bfade97b)

Dropdown with language options:
![image](https://github.com/herbie-fp/odyssey/assets/112049313/1dff45fe-1956-457b-a76a-f2109830bfce)

