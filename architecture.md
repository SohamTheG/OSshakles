# OSshakles Architecture

## High-Level Architecture
OSshakles uses the standard Electron architecture:
- **Main Process (Node.js)**: Responsible for OS-level interactions, managing windows, and running the background watchdog service.
- **Renderer Process (React + Vite)**: Responsible for the UI (Dashboard, Exit Screen, Intervention Overlay). Runs from an embedded Node.js HTTP server natively served by the Main process.
- **Preload Bridge**: Exposes safe, isolated APIs from the Main process to the Renderer process via Context Bridge.

## Components

### 1. Watchdog Service (Main Process)
- Polls the active foreground window using `active-win`.
- Maintains the state of the active "focus session" (timer duration, allowed apps whitelist).
- If the active window is not on the whitelist, it triggers the **Intervention Overlay**.

### 2. Dashboard UI (Renderer)
- Queries running processes via PowerShell's `Get-Process` (through IPC) to display a list of active applications.
- Allows the user to select multiple apps to whitelist.
- Starts the timer by sending an IPC message to the Main process.

### 3. Intervention Overlay (Main + Renderer)
- A dedicated Electron window that is initialized on startup but kept hidden.
- When triggered, it is maximized, set to full screen, and brought to the very front using `setAlwaysOnTop(true, 'screen-saver')`.
- Displays a strict message telling the user to return to their allowed apps.

### 4. "Walk of Shame" Exit Modal (Renderer)
- If the user attempts to stop the timer from the dashboard, this modal is shown.
- Contains a text area that tracks word count.
- The user must transcribe a very specific, humiliating essay exactly without typos to successfully send the "stop session" command to the Main process. Copy-pasting is disabled.

## Key Dependencies
- `electron`
- `react`, `react-dom`
- `vite`, `@vitejs/plugin-react`
- `tailwindcss`
- `active-win` (for foreground window detection)
