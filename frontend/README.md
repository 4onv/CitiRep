# CitiRep frontend

React + TypeScript + Vite. Screens follow the supplied editable wireframe; example decisions, votes, deadlines and distances are not used as live data.

## Development

Run the FastAPI backend on port 8000, then:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to FastAPI. `npm run build` produces `dist/`, which FastAPI serves after a restart. Hash routes work without server rewrites.

## Organization

```text
src/
  App.tsx            Route selection and application state
  api.ts             HTTP request helper and date formatting
  styles.css         Shared tokens, controls, utilities and print rules
  pages/             One component and stylesheet per screen
  components/        Layout, cards, tabs, source reader, history and review
  hooks/             Routing, preferences and reusable data fetching
  lib/               Document labels, navigation and preference defaults
  types/             Backend response contracts
tests/               Browser workflow tests
```

Page and component styles are imported by their owner. Shared controls belong in `styles.css`; avoid importing a page stylesheet from another page. Archive intentionally reuses the search screen. Update `App.tsx` to register a route. Real API data should remain separate from visual prototype examples.

## Implemented

- Welcome and Update Board, search/filtering/pagination, archive, item lookup, document overview, source text, related bylaws, captured versions and browser printing.
- Keyboard-operable document tabs, persisted large-text preference and offline help.
- Browser-local bookmarks, place/topic preferences, and latest captured updates for saved items. Saved streets use the backend's text filter, not a distance calculation.
- Upload → review extracted text → explicitly publish. `POST /api/documents/preview` extracts without storing anything; publication uses the existing upload endpoint. Returning to editing retains the selected file during this visit.
- Save/restore upload title and location in this browser. File contents are **not** saved in drafts; choose the file again after leaving the page.
- Participation screen links to the real source and does not assume comments are open.

## What is still needed

| Wireframe feature | Current limitation / requirement |
| --- | --- |
| Municipal login and resident accounts | An identity provider, sessions, role checks and record ownership; no credentials are collected now. |
| Staff drafts, corrections and approvals | Protected staff APIs, draft/version schema, assignment and an audit trail. Public uploads do not constitute staff review. |
| Generated and citation-checked summaries | The backend only extracts source passages. It has no summarization or claim-verification pipeline. |
| Community comments, issue reporting and comment exports | Persistence, moderation, reporting/ownership rules and staff handling. No submissions are collected or claimed to be delivered. |
| Real event map and distance filters | A verified event feed, coordinates and geocoding. Existing location mentions can include administrative addresses. |
| Open-input filters, process timelines, outcomes and votes | Reliable structured project IDs, process types, deadlines and official decision/vote data. Capture history is not a project timeline. |
| Email/SMS alerts | Delivery providers, verified destinations, consent/unsubscribe handling and a background notification worker. Updates here are loaded when visited/refreshed. |
| Cross-device preferences | Authentication and user-owned backend storage. Current preferences stay in this browser. |
| French interface | Reviewed translations for all screens and a translation/i18n layer. EN is a language indicator, not a simulated language selector. |
| Nearest library | A branch dataset and geocoding. The current help page links to official locations. |
| Original uploaded file downloads / accessible PDF exports | Original uploads are not retained. Browser printing is available but does not produce a verified tagged PDF. |

These can be implemented with additional backend contracts, data or service configuration. The current screens state their limits rather than simulating success.

## Checks

```sh
npm run build
npm test
npm run format:check
```

Browser tests use the installed Chrome channel, start Vite on port 5175 and intercept API requests with deterministic fixtures. They exercise navigation, saving, updates, keyboard tabs, version reading, place/preferences persistence, review-before-publish and 320px layouts. They do not validate live city sources or backend parsing. The Python suite in the repository tests the real upload/preview and storage contracts.

Use `npm run format` to format source, tests and TypeScript configuration.
