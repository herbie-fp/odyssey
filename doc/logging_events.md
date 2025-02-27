# User Event Logging in Herbie

## Overview

We log four types of user interactions in Odyssey to analyze usage patterns and improve user experience. These events are captured with relevant metadata, including session ID, timestamps, and descriptions.

## Logged Events

### 1. Adding an Expression from the Home Page

- Users can add an expression using the **Home Page**.
- This event helps track expressions added from Home Page.
- **Example Log Entry:**
  ```json
  {
    "sessionId":"1732221109342",
    "expression":"sqrt(x + 1) - sqrt(x)",
    "Description":"Added Expression from the home page",
    "timestamp":"11/21/2024, 1:40:33 PM"
  }
  ```

### 2. Adding an Expression from the Add Expression Bar

- Users can manually input an expression via the **Add Expression Bar**.
- This event helps track custom user inputs after reaching Error Plot.
- **Example Log Entry:**
  ```json
  {
    "sessionId":"1732221109342",
    "expression":"1.0 / (sqrt(x) + sqrt(1.0 + x))",
    "Description":"Added Expression by clicking Add button",
    "timestamp":"11/21/2024, 1:41:47 PM"
  }
  ```

### 3. Clicking the "Improve" Button

- Users can generate alternative expressions by clicking **Improve**.
- This event helps track user engagement with expression refinement.
- **Example Log Entry:**
  ```json
  {
    "sessionId":"1732221109342",
    "expression":"((sqrt(x + 1.0) - sqrt(x)) <= 0.05) ? (sqrt(pow(x, -1.0)) * 0.5) : fma(fma(-0.125, x, 0.5), x, 1.0 - sqrt(x))",
    "Description":"Added Expression by clicking improve",
    "timestamp":"11/21/2024, 1:41:48 PM"
  }
  ```

### 4. Clicking a Point in the Error Plot Graph

- Users can click on data points in the **Error Plot Graph** to analyze specific errors.
- This event helps track how users explore numerical errors.
- **Example Log Entry:**
  ```json
  {
    "sessionId":"1732221109342",
    "SelectedPoint":[56210012209.375],
    "SelectedExpression":"sqrt(x + 1) - sqrt(x)",
    "Description":"Selected Point: 56210012209.375 on Expression: sqrt(x + 1) - sqrt(x) in the Error Plot Graph",
    "timestamp":"11/21/2024, 1:40:35 PM"
  }
  ```

## Conclusion

These logs provide valuable insights into how users interact with Odyssey.