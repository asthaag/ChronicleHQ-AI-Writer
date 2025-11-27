# ChronicleHQ

An AI-powered text editor that helps you write by continuing your text using Google Gemini AI.

## Features

- **Rich Text Editing** - Built with ProseMirror for a smooth editing experience
- **AI Text Continuation** - Press `Ctrl + Enter` to let AI continue your writing
- **Controlled AI Flow** - Preview AI suggestions before accepting them
- **Formatting Toolbar** - Bold, Italic, Undo, Redo with keyboard shortcuts
- **State Management** - XState for predictable, robust state handling
- **Responsive Design** - Works on desktop and mobile
- **Dark Mode** - Automatic dark mode based on system preference

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast development and build
- **ProseMirror** - Rich text editor
- **XState** - State machine for editor logic
- **Google Gemini API** - AI text generation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Clone the repository
   ```bash
   git clone <your-repo-url>
   cd ai-editor
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## Usage

1. Start typing in the editor
2. Press `Ctrl + Enter` or click "Continue Writing" to generate AI suggestions
3. Review the AI suggestion in the preview panel
4. Click "Use this text" to accept, "Generate again" for a new suggestion, or "Discard" to reject

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Generate AI continuation |
| `Ctrl + B` | Toggle bold |
| `Ctrl + I` | Toggle italic |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Escape` | Cancel generation / Reject suggestion |
| `Enter` | Accept suggestion (when reviewing) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
ai-editor/
├── src/
│   ├── components/       # React components
│   │   ├── Editor.tsx    # Main ProseMirror editor
│   │   ├── Toolbar.tsx   # Formatting toolbar
│   │   ├── SuggestionPreview.tsx  # AI suggestion panel
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── useProsemirror.ts  # ProseMirror integration
│   │   └── useToast.ts   # Toast notifications
│   ├── machines/         # XState machines
│   │   └── editorMachine.ts  # Editor state logic
│   ├── services/         # External services
│   │   └── aiService.ts  # Gemini API integration
│   ├── types/            # TypeScript types
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── .env.example          # Environment template
├── package.json
└── vite.config.ts
```
