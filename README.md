# Chronicle

An AI-powered text editor that continues your writing using Google Gemini AI.

## Features

- Rich text editing with ProseMirror
- AI text continuation (Ctrl + Enter)
- Inline AI preview with accept/reject/regenerate options
- Formatting toolbar (Bold, Bullet List, Undo, Redo)
- Dark mode support

## Tech Stack

- React 19 + TypeScript
- Vite
- ProseMirror (rich text editor)
- XState (state management)
- Google Gemini API

## Project Structure

```
src/
├── components/
│   ├── Editor.tsx              # Main editor with inline AI preview
│   ├── Toolbar.tsx             # Formatting toolbar
│   ├── ContinueWritingButton.tsx
│   └── Toast.tsx               # Notifications
├── hooks/
│   ├── useProsemirror.ts       # ProseMirror integration
│   └── useToast.ts
├── machines/
│   └── editorMachine.ts        # XState state machine
├── services/
│   └── aiService.ts            # Gemini API integration
├── App.tsx
└── main.tsx
```
