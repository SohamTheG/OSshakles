# OSshakles Agents Context

## Project Overview
OSshakles is a strict productivity application built using Electron, React, Vite, and TypeScript. Its primary feature is a "Watchdog Overlay" that monitors the active foreground window. If a user tries to use an application that is not on their approved list during a focus session, OSshakles intercepts and displays a full-screen block. The only way to exit the session early is to write a 400-word justification essay.

## Standard Operating Procedures (SOPs)
1. **Tech Stack Constraints**: 
   - UI must be written in React (TypeScript) and styled with TailwindCSS.
   - Main process logic (Electron) handles native OS integrations.
2. **System Level Integration**: 
   - We rely on `active-win` to poll the active window. Avoid polling too frequently (e.g., stay around 500ms - 1000ms) to reduce CPU overhead.
   - We rely on native PowerShell commands (`Get-Process`) rather than external Node modules like `ps-list` to ensure compatibility across compiled Electron environments.
3. **Security/Bypassing**:
   - The intervention overlay must be "alwaysOnTop" and "fullscreen" to prevent easy bypass.
4. **Code Quality**:
   - Keep Main process and Renderer process logic strictly separated using `preload.ts` and IPC bridges. Do not enable `nodeIntegration` in the renderer for security reasons.
5. **Packaging and Deployment**:
   - When running on Windows, the portable executable extracts to the Temp folder. Chromium's strict sandbox will instantly crash the renderer if not disabled. We MUST maintain `app.commandLine.appendSwitch('no-sandbox');` in the main process to ensure the portable version boots.
   - We use an embedded native Node.js HTTP server instead of Chromium's custom file/app protocols to serve the `app.asar` contents reliably and bypass strict security/CORS/buffer parsing bugs.
