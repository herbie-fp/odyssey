# Odyssey Test Suite
The test suite runs off a Node.js scripts that automate end-to-end testing. It uses Puppeteer for browser automation, Express to serve the test files, and Assert for validation. The script tests the functionality by running automated tests with input data from a CSV file and then ensuring Odyssey correctly evaluates expressions, fetches optimizations and other results from backend tools, and provides expected results.

## Starting the Web Server
The test suite starts by launching a simple Express server, serving the Odyssey web application on a specific port (PORT = 6500). The server serves files from the parent directory and provides an index of available files.

The function startServer(app) sets up the server using Express. The Odyssey application is served from the parent directory and runs on http://localhost:6500.

## Loading test data from CSV file

Then, the test data, which includes different sets of input expressions and their expected outputs, is read from a CSV file. Each row contains a test case with the following columns:

- trueSpec: The expected input expression for Odyssey.
- trueAnalysis: The expected analysis result after processing the input.
- trueSpeedup: The expected speedup result after optimization.
- herbieTimeout: The time (in ms) to wait for Herbie to perform optimizations.
- bestHerbieAnalysisExpr: The expected optimized expression.
- bestHerbieAnalysis: The expected optimization accuracy from Herbie.

All of this is called from the main function, which will process this information in from the specified CSV file.


## Running Tests
For each row in the CSV file, a test is executed using the runTest(rowData) function. This function simulates user interaction with the Odyssey web page, filling in the test expression, triggering exploration, and checking the results. The process for this is as follows: 

- Launch browser, navigating to Odyssey
    - A new browser instance is launched with Puppeteer, and the Odyssey page is loaded (http://127.0.0.1:6500/index.html#).

- Input expression into Odyssey
    - The trueSpec value from the test data is filled into the text area of the Odyssey page. Then, the "Explore" button is clicked to start the analysis of the expression.
    
- Validate expression
    - The test checks that the expression input into Odyssey matches the expected input (trueSpec).

- Wait for Analysis Results
    - The script waits for the analysis and speedup values to be updated and verifies that these values match the expected results (trueAnalysis and trueSpeedup).

- Herbie test
    - The script clicks on the Herbie button to apply optimizations and waits for the optimization to complete (using herbieTimeout).

- Validate Herbie Optimizations
    - The script checks which optimization had the best accuracy and compares it with the expected values (bestHerbieAnalysisExpr and bestHerbieAnalysis).

After all tests are completed, the server is shut down to clean up resources.

## Failing Tests
If any assertion fails or if an error occurs during the test execution, an error message will be logged. After completing the tests, the browser instance is closed, and the server is stopped.