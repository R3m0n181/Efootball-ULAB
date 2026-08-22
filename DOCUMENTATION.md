# eFootball Mobile Premier League 2026 — Master Blueprint & Replication Guide

A comprehensive, turnkey guide containing everything required to clone, configure, build, run, deploy, and administer the **eFootball Mobile Premier League 2026** platform from scratch.

---

## Table of Contents
1. [System Architecture & Capabilities](#1-system-architecture--capabilities)
2. [Technology Stack & Key Dependencies](#2-technology-stack--key-dependencies)
3. [Full Project File Structure](#3-full-project-file-structure)
4. [Step-by-Step Local Setup & Replication](#4-step-by-step-local-setup--replication)
5. [Database Architecture & Firestore Schema](#5-database-architecture--firestore-schema)
6. [League Scheduling Engine & Berger Algorithm](#6-league-scheduling-engine--berger-algorithm)
7. [Standings Calculation & Tie-Break Logic](#7-standings-calculation--tie-break-logic)
8. [Admin Authentication & Workflow](#8-admin-authentication--workflow)
9. [Component Architecture & UI Specifications](#9-component-architecture--ui-specifications)
10. [Social Share Card Canvas Generator](#10-social-share-card-canvas-generator)
11. [Deployment Guides (Vercel, Cloud Run, Firebase)](#11-deployment-guides-vercel-cloud-run-firebase)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)

---

## 1. System Architecture & Capabilities

The **eFootball Mobile Premier League 2026** is a high-performance, mobile-first esports tournament manager tailored for 21-club league competitions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Client Browser / PWA                            │
│                                                                             │
│   ┌──────────────────┐  ┌───────────────────┐  ┌────────────────────────┐   │
│   │ Standings Table  │  │  42-Round Schedule│  │ Team Dossiers & Stats  │   │
│   │ (Fixed Index,    │  │  (Berger Rotation,│  │ (Recent Form, History, │   │
│   │  Sort, Zones)    │  │   Auto Bye Teams) │  │  Head-to-Head Records) │   │
│   └─────────┬────────┘  └─────────┬─────────┘  └───────────┬────────────┘   │
│             │                     │                        │                │
│             └─────────────────────┼────────────────────────┘                │
│                                   │                                         │
│                      ┌────────────┴────────────┐                            │
│                      │ React 18 + Vite App Shell│                            │
│                      │  (Admin Mode Auth Guard)│                            │
│                      └────────────┬────────────┘                            │
│                                   │                                         │
│         ┌─────────────────────────┴────────────────────────┐                │
│         ▼                                                  ▼                │
│  ┌───────────────┐                                  ┌───────────────┐       │
│  │ LocalStorage  │                                  │ HTML5 Canvas  │       │
│  │ Offline Cache │                                  │ PNG Generator │       │
│  └───────────────┘                                  └───────────────┘       │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ Real-time Sync & On-Demand Proofs
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Google Cloud Firestore                             │
│                                                                             │
│  📁 /tournaments/efootball_premier_league_2026                              │
│     ├── 📄 metadata, config, teams[21], matches[420] (~60 KB payload)       │
│                                                                             │
│  📁 /match_proofs/{matchId} (Decoupled High-Speed Cloud Proof Store)        │
│     ├── 📄 matchId, screenshotUrl (compressed ~8-20 KB), uploadedAt         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Highlights
* **Decoupled Match Proof Store**: Screenshots are compressed on the client to ~8–20 KB and stored in an independent `/match_proofs/{matchId}` collection. This keeps the primary 420-match tournament document under ~60 KB (well below Firestore's 1 MB limit) for lightning-fast loads.
* **Dual Resilience Engine**: Seamless offline fallback via `localStorage`. If Firestore credentials are not configured or network drops, the application works offline seamlessly without breaking.
* **Fixed Standings Position Index**: The position numbering column (`1` through `21`) stays permanently locked in ordinal order regardless of which column sort or filter is applied.
* **Admin-Specific Action Delegation**: Unplayed fixtures display "Submit" buttons for authenticated admins to enter scores, while standard visitors see a clean "Scheduled" badge.

---

## 2. Technology Stack & Key Dependencies

| Layer | Package / Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime / UI** | `react` & `react-dom` | `^19.0.1` | Declarative UI components & state hooks |
| **Build Tooling** | `vite` | `^6.2.3` | Ultra-fast ES module development & bundling |
| **Type Checking** | `typescript` | `~5.8.2` | Complete type-safety across models and events |
| **CSS Framework** | `@tailwindcss/vite` & `tailwindcss` | `^4.1.14` | Modern CSS styling with dark esports palette |
| **Animations** | `motion` | `^12.23.24` | Smooth modal transitions and tab interactions |
| **Iconography** | `lucide-react` | `^0.546.0` | Comprehensive vector icon set |
| **Cloud Database** | `firebase` | `^12.17.1` | Firestore real-time snapshot listeners & sync |
| **Effects** | `canvas-confetti` | `^1.9.4` | Championship celebration animations |
| **Server Engine** | `express` | `^4.21.2` | Optional Node.js wrapper for container environments |

---

## 3. Full Project File Structure

```text
.
├── .env.example                     # Environment template for Firebase & admin keys
├── .gitignore                       # Git ignore list (node_modules, dist, .env)
├── DOCUMENTATION.md                 # Complete architecture & replication guide
├── firebase-blueprint.json          # Firestore collection definitions
├── firestore.rules                  # Firestore security rules
├── index.html                       # HTML5 entry point with responsive viewport
├── metadata.json                    # Application metadata and capabilities
├── package.json                     # NPM dependencies and run scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── vercel.json                      # Vercel SPA rewrite configuration
├── vite.config.ts                   # Vite bundler configuration with Tailwind plugin
├── public/
│   ├── icon.svg                     # Primary league crest icon
│   └── team-logos/                  # SVG vector club crests
└── src/
    ├── App.tsx                      # Root application shell, tab router & state coordinator
    ├── main.tsx                     # React DOM entry point
    ├── index.css                    # Tailwind CSS imports & custom scrollbar styles
    ├── types.ts                     # TypeScript data contracts (Team, Match, Standings, etc.)
    ├── assets/
    │   ├── league_logo.jpg          # High-resolution branding banner
    │   └── teamLogos.ts             # Embedded vector SVG data URIs for instant offline render
    ├── components/
    │   ├── AdminLoginModal.tsx      # Admin authentication dialog
    │   ├── FixturesView.tsx         # 42-matchday round browser with horizontal carousel
    │   ├── Header.tsx               # Global top navigation, tournament stats, and admin badge
    │   ├── MatchDetailModal.tsx     # Comprehensive match popup (H2H, goals, proof, share)
    │   ├── ShareFixtureCardModal.tsx# HTML5 Canvas social card generator
    │   ├── StandingsTable.tsx       # Live standings table with fixed index & form pills
    │   ├── SubmitResultModal.tsx    # Match score submission & image compression form
    │   ├── TeamDetailModal.tsx      # Club dossier with manager bio, form, and fixture schedule
    │   ├── TeamLogo.tsx             # Universal club crest component with vector fallback
    │   ├── TeamsListView.tsx        # Grid directory of all 21 teams & managers
    │   └── TournamentSettingsModal.tsx # Reset schedule, edit rules, seed test data
    ├── data/
    │   └── initialData.ts           # Roster of 21 participating teams & default tournament config
    ├── lib/
    │   ├── firebase.ts              # Firebase app initialization with offline fallback
    │   └── firestoreLeague.ts       # Cloud Firestore CRUD & snapshot sync handlers
    └── utils/
        ├── auth.ts                  # Admin session verification & token handling
        ├── calculations.ts          # Standings computation, tiebreakers & analytics
        ├── imageCompressor.ts       # Client-side HTML5 canvas image optimizer (~8KB output)
        ├── sampleData.ts            # Demonstration match results for testing
        ├── scheduler.ts             # 42-round double round-robin generator (Berger algorithm)
        └── storage.ts               # LocalStorage fallback persistence manager
```

---

## 4. Step-by-Step Local Setup & Replication

Follow these exact steps to clone, configure, and run the project locally.

### Step 1: Clone or Initialize Workspace
```bash
git clone <your-repository-url> efootball-premier-league
cd efootball-premier-league
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```

Populate the variables:
```env
# Admin Credentials
VITE_ADMIN_DEFAULT_EMAIL="admin@efootball.com"
VITE_ADMIN_DEFAULT_PASSWORD="League987"
VITE_ADMIN_DEFAULT_NAME="League Administrator"

# Firebase Configuration (Optional - runs on LocalStorage if left blank)
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
```

### Step 4: Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### Step 5: Verify Type Checking & Build
```bash
# Run TypeScript compilation checks
npm run lint

# Compile production bundle to /dist
npm run build
```

---

## 5. Database Architecture & Firestore Schema

The database is built on Google Cloud Firestore with two primary collections:

### Collection 1: `/tournaments`
* **Document ID**: `efootball_premier_league_2026`
* **Schema**:
```typescript
{
  id: "efootball_premier_league_2026",
  name: "eFootball Mobile Premier League 2026",
  status: "in_progress", // 'draft' | 'in_progress' | 'completed'
  currentRound: 1,
  totalRounds: 42,
  teams: [
    {
      id: "team-1",
      managerName: "Remon",
      clubName: "Borussia Dortmund",
      shortCode: "BVB",
      logo: "https://...",
      color: "#FDE100",
      secondaryColor: "#000000",
      feePaid: true
    }
    // ... 21 teams
  ],
  matches: [
    {
      id: "match-1-1",
      round: 1,
      matchNumber: 1,
      homeTeamId: "team-1",
      awayTeamId: "team-2",
      homeScore: 2, // null if unplayed
      awayScore: 1, // null if unplayed
      status: "completed", // 'scheduled' | 'in_progress' | 'completed' | 'disputed'
      playedAt: "2026-08-22T10:00:00.000Z",
      screenshotUrl: "proof-stored-in-match-proofs", // Reference key
      submittedBy: "League Administrator"
    }
    // ... 420 matches
  ],
  config: {
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    hasScreenshotsRequirement: true,
    championsLeagueSpots: 4,
    europaLeagueSpots: 4,
    relegationSpots: 4
  },
  updatedAt: "2026-08-22T14:00:00.000Z"
}
```

### Collection 2: `/match_proofs` (Decoupled Store)
* **Document ID**: `{matchId}` (e.g. `match-1-1`)
* **Schema**:
```typescript
{
  matchId: "match-1-1",
  screenshotUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...", // Compressed ~8-20 KB
  updatedAt: "2026-08-22T14:00:00.000Z"
}
```

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tournaments/{tournamentId} {
      allow read, write: if true;
    }
    match /tournaments/{tournamentId}/{document=**} {
      allow read, write: if true;
    }
    match /teams/{teamId} {
      allow read, write: if true;
    }
    match /matches/{matchId} {
      allow read, write: if true;
    }
    match /match_proofs/{matchId} {
      allow read, write: if true;
    }
  }
}
```

---

## 6. League Scheduling Engine & Berger Algorithm

Located at `src/utils/scheduler.ts`, the scheduling engine utilizes the **Berger Polygon Rotation Algorithm** tailored for an odd number of clubs (21 teams):

1. **Dummy / Bye Team Assignment**: With 21 teams ($N = 21$), a virtual 22nd team (`dummy`) is added. In any round where a club is paired against `dummy`, that club receives the official **Bye**.
2. **First Leg (Rounds 1–21)**: Each team plays 20 matches and receives 1 bye. Home and away fixtures alternate per round.
3. **Second Leg (Rounds 22–42)**: The pairings from rounds 1–21 are inverted ($Home \leftrightarrow Away$), ensuring every club plays every other club exactly once at home and once away.
4. **Total Tournament Matches**:
$$\text{Total Matches} = 21 \times 20 = 420 \text{ matches}$$
$$\text{Matches per Matchday} = 10 \text{ matches} + 1 \text{ bye team}$$

---

## 7. Standings Calculation & Tie-Break Logic

Located at `src/utils/calculations.ts`, standings are calculated on every match state change:

### Official Tie-Break Hierarchy
1. **Points (PTS)**: 3 for Win, 1 for Draw, 0 for Loss.
2. **Goal Difference (GD)**: $\text{Goals For (GF)} - \text{Goals Against (GA)}$.
3. **Goals For (GF)**: Total goals scored.
4. **Head-to-Head (H2H)**: Aggregate points and goal difference in direct encounters between tied teams.
5. **Alphabetical Club Code**: Tie-breaker fallback.

### Standings Table Features
* **Dual View Modes (Basic vs Detailed)**:
  * **Detailed View (Laptop & Desktop Default, $\ge$ 768px)**: Complete 11-column statistical breakdown displaying `#`, `Club / Team`, `MP`, `W`, `D`, `L`, `PTS`, `GF`, `GA`, `GD`, `CS`, `Form`, and detail action.
  * **Basic View (Mobile Default, < 768px)**: Streamlined 5-metric focus displaying `#`, `Club / Team`, `MP`, `PTS`, `GD`, `CS`, `Form` (in exact order).
  * **Clean Highlighted Mode Tabs**: Prominently positioned between the search control bar and the standings table with an emerald active highlight border, glowing badge, and smooth switching.
  * **Responsive Viewport Synchronization**: Intelligently initializes to the appropriate layout for the user's device while retaining explicit manual user selections during active sessions.
* **Fixed Index Position**: The `#` column always displays ordinal rank (`1` to `21`) based on row position, regardless of user-selected column sorting (e.g. sorting by GF, GD, or MP keeps row numbers 1, 2, 3, ... sequential).
* **Zone Highlighting**:
  * **Ranks 1–4 (UCL Champions Zone)**: Emerald badge & indicator (`#10b981`).
  * **Ranks 5–8 (Europa League Zone)**: Cyan badge (`#06b6d4`).
  * **Ranks 9–17 (Mid-table)**: Slate neutral tone.
  * **Ranks 18–21 (Relegation Zone)**: Rose badge (`#f43f5e`).
* **Recent Form**: Last 5 matches rendered as outcome pills (`W`, `D`, `L`) with interactive opponent tooltips.

---

## 8. Admin Authentication & Workflow

### Authentication Mechanism
* Admin status is checked via `src/utils/auth.ts` using credentials defined in `.env` (default: `admin@efootball.com` / `League987`).
* Sessions are secured using a local token in `localStorage`.

### Admin-Only Capabilities
1. **Submit & Edit Results**:
   * Direct "Submit" button on unplayed fixtures in both the Fixtures view and the Team Profile modal.
   * Enter scores, record goalscorers/assists, and upload screenshot proof.
2. **Client-Side Image Compression (`src/utils/imageCompressor.ts`)**:
   * Incoming screenshots are drawn to an off-screen HTML5 Canvas.
   * Scaled down to max dimension 800px and JPEG quality 0.55.
   * Typical output size: **~8 KB to ~20 KB** (prevents high cloud egress and quota exhaustion).
3. **Tournament Management**:
   * Reset schedule, seed demonstration results, or clear all match history.

---

## 9. Component Architecture & UI Specifications

```
src/components/
├── Header.tsx                 # Top navigation, live match count, vital stats strip (highlighted League Leader showcase, Attack/Defense leaders), and Admin toggle
├── StandingsTable.tsx         # Main league table with qualification zones and form pills
├── FixturesView.tsx           # 42-round horizontal scroll carousel & fixture list
├── TeamsListView.tsx          # 21-team grid cards with season stats and recent form
├── TeamDetailModal.tsx        # Team profile, manager info, squad statistics, and match schedule
├── MatchDetailModal.tsx       # Match breakdown, goal events, H2H record, and screenshot proof
├── SubmitResultModal.tsx      # Admin score submission with instant image compression
├── ShareFixtureCardModal.tsx  # HTML5 Canvas social card generator
├── TournamentSettingsModal.tsx# Administrative controls and reset tools
├── AdminLoginModal.tsx        # Security login dialog
└── TeamLogo.tsx               # Resilient SVG/URL club crest renderer with fallback
```

---

## 10. Social Share Card Canvas Generator

Located at `src/components/ShareFixtureCardModal.tsx`:
* Renders a broadcast-ready 1080×1080 graphic directly in the browser using the HTML5 Canvas API.
* Features:
  * Team crests, manager names, and short codes.
  * Live score display or matchday badge for upcoming games.
  * "eFootball Mobile Premier League 2026" official branding and watermark.
* One-click download as high-quality `PNG` for instant posting to WhatsApp groups, Discord channels, and Instagram.

---

## 11. Deployment Guides (Vercel, Cloud Run, Firebase)

### Deploying to Vercel (Recommended)
1. Push your project to a GitHub repository.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the repository.
4. Under **Environment Variables**, copy the keys from `.env`.
5. Deploy. The included `vercel.json` ensures all SPA routes route to `/index.html`.

### Deploying to Google Cloud Run / Container
Build and run using Docker:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

---

## 12. Troubleshooting & FAQ

### Q1: The app displays "Offline Mode (LocalStorage)" in the header. Why?
**A**: Firebase environment variables are either missing or the database ID is incorrect. The app automatically falls back to local storage so you can test and use all features without cloud configuration. To connect to Cloud Firestore, fill in valid keys in `.env`.

### Q2: Why are position numbers (#) sequential even when sorted by Goals For?
**A**: The table is intentionally designed to keep the visual row index locked to `1, 2, 3, ...` to provide a clean, readable row reference, while sorting the data rows according to your selected metric.

### Q3: How do I change the default 21 teams?
**A**: Edit `src/data/initialData.ts`. Modify the `INITIAL_TEAMS` array with your custom manager names, club names, short codes, and colors. Then open **Tournament Settings** in the app and click **Reset Schedule**.

---

*eFootball Mobile Premier League 2026 — Master Blueprint Documentation*
