# OSshakles

OSshakles is a strict productivity application designed to force you to stay focused. It monitors your active window and aggressively blocks you if you attempt to open an application that is not on your approved whitelist during a focus session. 

The only way to exit a session early is to complete the **Walk of Shame**—a grueling, un-copy-pasteable transcription task to prove you are willing to waste your time.

## Features

- 🔒 **Whitelist System**: Select exactly which applications you need for work. Everything else is blocked.
- 🚨 **Aggressive Interruption**: A fullscreen, always-on-top overlay blocks unapproved applications the second you open them.
- ✍️ **The Walk of Shame**: To exit a session early, you must accurately transcribe a specific "Walk of Shame" essay without typos. Copy-pasting is strictly disabled.

## Technology Stack

- Electron
- React (with TypeScript)
- Vite
- TailwindCSS

## Getting Started

Follow these instructions to get the application running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (comes with Node.js)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd OSshakles
   ```

2. Navigate into the application directory:
   ```bash
   cd app
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the application in development mode with hot-reloading:

```bash
npm run dev
```

### Building for Production

To build the executable for your operating system:

```bash
npm run build
```

This will output the compiled binaries in the `app/release` folder.

## Usage

1. Open OSshakles.
2. Set your desired focus duration in minutes.
3. Choose the number of words for your early exit penalty (minimum 10).
4. Select the applications you need to remain productive.
5. Click **Start Focus Session**.
6. Do the work. If you try to open Discord, a game, or anything else, you will be blocked.

## Developer Debugging Notes: The Great Windows Crash

If you are modifying the Electron packaging process, beware of a notoriously difficult Chromium bug we encountered:

**The Symptom:**
When loading the packaged portable executable (`.exe`), the app opens to a white screen and crashes instantly. If debugged, you will see `ERR_FAILED (-2)` loading the local assets.

**The Cause:**
`electron-builder`'s `portable` target uses NSIS to silently extract the entire application into the Windows `AppData\Local\Temp` folder before executing it. However, the Chromium engine inside modern Electron (v28+) has an incredibly strict **Sandbox** that expressly forbids spawning renderer child-processes from within certain restricted Windows Temp directories. 
Because the Sandbox fails to initialize due to Windows ACLs, the renderer crashes instantly (`Renderer gone: crashed`). Since the renderer is dead, the main process abandons the URL load, throwing `ERR_FAILED (-2)`.

**The Solution:**
We bypass this Windows-specific issue by globally disabling the sandbox on startup:
```typescript
app.commandLine.appendSwitch('no-sandbox');
```
We also replaced the standard `file://` and `app://` protocol loading with an **embedded Node.js HTTP server** that serves the `dist/` folder over a random local port (e.g. `http://127.0.0.1:54321/`). This guarantees absolute immunity against Chromium CORS issues, protocol handlers, and `.asar` pathing bugs.

## How to Publish to GitHub

1. Ensure you are in the root directory (`e:\_project_work\OSshakles`).
2. Initialize a git repository if you haven't already:
   ```bash
   git init
   git add .
   git commit -m "Initial release of OSshakles"
   ```
3. Go to GitHub and create a new repository (do not add a README or .gitignore since we already have them).
4. Follow the instructions to push an existing repository from the command line:
   ```bash
   git remote add origin https://github.com/<your-username>/OSshakles.git
   git branch -M main
   git push -u origin main
   ```

## Sharing With Friends

Sharing OSshakles is extremely simple for the "laziest people on planet earth":
1. Navigate to your `app/release/` folder after running `npm run build`.
2. Find the file named `OSshakles 1.0.0.exe` (this is the Portable version).
3. Send this single `.exe` file to your friends!

They do not need to install anything, they do not need Node.js, and they do not need to open a terminal. They simply double-click the `.exe` file, and the application opens instantly, ready to lock them into their productivity session!

*(Note: If you prefer a traditional installation that adds the app to their Start Menu, send them `OSshakles Setup 1.0.0.exe` instead).*
