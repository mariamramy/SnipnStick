# SnipNStick

SnipNStick is a browser-based sticker organization and editing app. It helps you collect images into folders, upload new stickers, remove backgrounds, refine edges with a touch-up brush, and apply custom die-cut style effects with padding and outlines.

The app is designed to be simple, visual, and local-first: your data is stored in the browser, so there is no separate backend or account system required.

## Main features

- Folder-based organization
  - Create and manage folders for different sticker collections.
  - A default folder is created automatically for first-time use.

- Sticker upload and browsing
  - Add one or multiple images at a time from your device.
  - View stickers inside each folder with a simple card-based interface.

- Background removal
  - Remove the background from an uploaded sticker image with a one-click action.
  - The edited result is saved locally for later use.

- Touch-up editing
  - Refine the result with an erase/restore brush.
  - Adjust brush size and opacity for more precise control.

- Die-cut styling
  - Apply custom padding and outline styling that follows the sticker silhouette.
  - Choose padding color, outline color, and outline width.
  - The styling engine is built to create a more polished die-cut look rather than a simple rectangular border.

- Undo support
  - Revert recent sticker edits using the undo action.

- Local persistence
  - Sticker and folder data are stored in IndexedDB, so your workspace stays available in the same browser.

## How it should be run

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

From the project root, run:

```bash
cd snipnstick
npm install
```

### Development mode

Start the local development server:

```bash
npm run dev
```

Then open the URL shown in the terminal, usually http://localhost:5173.

### Production build

Build the app for production:

```bash
npm run build
```

### Preview build locally

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## Technologies used

- React 19 for the UI
- TypeScript for type-safe application logic
- Vite for development and build tooling
- React Router for page navigation between home, folder, and editor views
- Dexie for IndexedDB storage
- UUID for generating unique IDs
- ESLint and TypeScript tooling for code quality

## Project structure

```text
src/
  components/      UI pages and reusable interface components
  services/        Folder, sticker, and styling logic
  db/              IndexedDB database setup
  types/           Shared TypeScript types
  utils/           Utility helpers
```

## Notes

This project is currently a client-side application with no backend service. That makes it easy to run locally, but it also means data is stored only in the browser where the app is used.

