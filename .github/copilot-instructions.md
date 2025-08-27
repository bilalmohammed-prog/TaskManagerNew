# Copilot Instructions for Task Manager Project

## Project Overview
This is a simple web-based Task Manager consisting of three main files:
- `index.html`: Main HTML structure, includes a container with a single input for entering tasks.
- `style.css`: Contains basic styling for the `.task` input element.
- `script.js`: Intended for client-side JavaScript logic (currently empty).

## Architecture & Data Flow
- The application is a single-page web app. All logic runs in the browser; there is no backend or external API integration.
- User interactions (e.g., entering tasks) should be handled via DOM manipulation in `script.js`.
- All state is client-side and ephemeral (no persistence).

## Development Workflow
- No build step or package manager is required; edit files directly and refresh the browser to see changes.
- Debugging is done using browser developer tools (e.g., Chrome DevTools).
- No automated tests or CI/CD are present.

## Project-Specific Patterns & Conventions
- Use vanilla JavaScript for all logic in `script.js`.
- Keep all styling in `style.css`; do not use inline styles in HTML or JS.
- All UI elements should be created or manipulated via DOM APIs, not via frameworks.
- The main entry point for JS is the `<script src="script.js"></script>` tag at the end of `index.html`.
- Use semantic HTML and keep the structure minimal.

## Examples
- To add a new task, listen for the `Enter` key on the input and append a new DOM element to `.container`.
- To style new elements, add classes and update `style.css` accordingly.

## Key Files
- `index.html`: UI structure and script/style includes.
- `style.css`: All CSS rules.
- `script.js`: All JS logic (event listeners, DOM updates).

## External Dependencies
- None. Do not add external libraries or frameworks.

---

For questions about project structure or conventions, review this file and the three main source files. If unclear, ask for clarification before making major changes.
