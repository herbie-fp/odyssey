# **Running Herbie Binaries in Odyssey**

## **Overview**
Herbie binaries can now be built automatically for Windows, macOS, and Linux using GitHub Actions. The process compiles Herbie into a standalone executable, making it easier to distribute and run without needing to install dependencies manually.

This document explains how to trigger the build process, locate the compiled binaries, and use them.

---

## **Triggering a Build**
Herbie binaries are built using GitHub Actions in the **Odyssey** repository.

### **Manual Trigger (workflow_dispatch)**
To manually trigger a build:
1. Go to the **GitHub repository** for Odyssey.
2. Navigate to the **Actions** tab.
3. Select **"Build Herbie Binaries in Odyssey"** from the workflow list.
4. Click **"Run workflow"**S (at the top of previous results).
5. The workflow will execute, compiling Herbie for Linux, macOS, and Windows.

---

## **Locating the Compiled Binaries**
Once the build is complete:
1. Navigate to the **GitHub Actions tab**.
2. Click on the latest run of **"Build Herbie Binaries in Odyssey"**.
3. Scroll to the **Artifacts** section at the bottom.
4. Download the relevant artifact based on your operating system:
   - `herbie-distribution-linux.tar.gz`
   - `herbie-distribution-macos.tar.gz`
   - `herbie-distribution-windows.zip`

---

## **Running Herbie from the Compiled Binary**
After extracting the downloaded artifact, navigate to the extracted folder and run Herbie as follows:

### **Windows**
1. Extract the `herbie-distribution-windows.zip` file.
2. Open **PowerShell** and navigate to the extracted folder.
3. Run:
   ```powershell
   .\herbie.exe --version
   ```
4. To use Herbie:
   ```powershell
   .\herbie.exe web
   ```

### **Linux/macOS**
1. Extract the `herbie-distribution-linux.tar.gz` or `herbie-distribution-macos.tar.gz` file:
   ```bash
   tar -xvzf herbie-distribution-linux.tar.gz
   ```
   or
   ```bash
   tar -xvzf herbie-distribution-macos.tar.gz
   ```
2. Navigate to the extracted folder:
   ```bash
   cd herbie-compiled
   ```
3. Make the binary executable:
   ```bash
   chmod +x herbie
   ```
4. Run Herbie:
   ```bash
   ./herbie --version
   ```
5. To start the Herbie web interface:
   ```bash
   ./herbie web
   ```

---