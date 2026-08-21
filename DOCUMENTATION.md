# eFootball Mobile Premier League 2026 — Project Documentation

Comprehensive documentation covering the architecture, website structure, user flows, feature specifications, design system, data models, and deployment configurations for the **eFootball Mobile Premier League 2026** platform.

---

## 1. Overview & Project Purpose

The **eFootball Mobile Premier League 2026** is a full-stack, mobile-first tournament management and live statistics platform purpose-built for competitive eFootball mobile esports leagues. It automates league scheduling, real-time standings calculations, match verification with screenshot uploads, team performance analytics, and dynamic social media fixture graphics.

### Core Objectives
* **Automated League Operations**: Generate complete 42-round double round-robin tournament schedules with mathematically balanced home/away pairings and odd-team bye distributions.
* **Instant Real-Time Synchronization**: Live sync across all participating managers and spectators using Firebase Cloud Firestore with automatic offline local storage fallback.
* **Integrity & Proof of Play**: Admin-authenticated score entry with integrated client-side screenshot compression to record official in-game match result screens.
* **Broadcast-Quality Visuals**: Built-in HTML5 Canvas graphic engine to export high-resolution shareable fixture and match result cards for WhatsApp, Discord, and Instagram.

---

## 2. Technology Stack & Dependencies

| Layer | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Framework** | **React 18 + Vite** | High-performance SPA with client-side rendering |
| **Language** | **TypeScript 5.8+** | Strict type safety across match events and standings calculations |
| **Styling** | **Tailwind CSS v4** | Modern utility-first dark esports aesthetic with responsive breakpoints |
| **Icons** | **lucide-react** | Consistent iconography for status badges, arrows, tabs, and actions |
| **Database & Realtime** | **Google Cloud Firestore** | Multi-device cloud state persistence and real-time snapshot listeners |
| **Auth & Security** | **Custom Admin Auth** | SHA-256 password hash verification and environment credential pairing |
| **Image Compression** | **HTML5 Canvas API** | In-browser JPEG/WebP compression (down to ~30KB) before cloud upload |
| **Deployment** | **Vercel / Cloud Run** | Zero-config static SPA deployment with `vercel.json` rewrites |

---

## 3. Directory & File Structure

```text
├── .env.example                     # Environment variables template for Firebase & Admin credentials
├── firebase-blueprint.json          # Firestore schema definition for cloud collections
├── firestore.rules                  # Firestore security rules enforcing read/write permissions
├── index.html                       # HTML entry point with viewport tags & font preloads
├── metadata.json                    # Application metadata and server-side capability declarations
├── package.json                     # Project manifest, dependencies, and build scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── vercel.json                      # Vercel deployment rewrite rules for SPA client routing
├── public/
│   ├── icon.svg                     # Official league crest icon
│   └── team-logos/                  # Standalone SVG vector files for all 21 clubs
└── src/
    ├── App.tsx                      # Primary application shell, tab routing & state manager
    ├── main.tsx                     # React DOM root bootstrapping
    ├── index.css                    # Tailwind CSS imports and custom scrollbar styles
    ├── types.ts                     # Global TypeScript interfaces, types, and enums
    ├── assets/
    │   ├── league_logo.jpg          # High-resolution tournament banner / branding
    │   └── teamLogos.ts             # Compiled vector SVG data URIs for offline logo loading
    ├── components/
    │   ├── AdminLoginModal.tsx      # Admin authentication dialog with credential validation
    │   ├── FixturesView.tsx         # 42-matchday schedule browser with horizontal round scroll
    │   ├── Header.tsx               # Global top navigation bar, status indicators, and quick stats
    │   ├── MatchDetailModal.tsx     # Comprehensive match dossier (H2H, goals, screenshot, share)
    │   ├── ShareFixtureCardModal.tsx# Canvas-based social graphic generator for fixture cards
    │   ├── StandingsTable.tsx       # Live league table with qualification zones and form pills
    │   ├── SubmitResultModal.tsx    # Score entry form with goal events & screenshot compressor
    │   ├── TeamDetailModal.tsx      # Club dossier with manager bio, squad records, and match history
    │   ├── TeamLogo.tsx             # Universal club crest component with vector fallback
    │   ├── TeamsListView.tsx        # Directory view of all 21 participating teams & managers
    │   └── TournamentSettingsModal.tsx # Tournament configuration and schedule reset controls
    ├── data/
    │   └── initialData.ts           # Default roster of 21 teams, initial config, and seed state
    ├── lib/
    │   ├── firebase.ts              # Firebase SDK initialization with silent offline fallback
    │   └── firestoreLeague.ts       # Cloud Firestore CRUD operations, real-time snapshot sync
    └── utils/
        ├── auth.ts                  # Admin session verification, local token storage
        ├── calculations.ts          # League standings, tiebreaks, H2H, and attack/defense stats
        ├── imageCompressor.ts       # Client-side image resizer and optimizer
        ├── sampleData.ts            # Demonstration sample matches and goal records
        ├── scheduler.ts             # Double round-robin fixture generator with Berger algorithm
        └── storage.ts               # LocalStorage backup engine for offline resilience
```

---

## 4. Core Features & Specifications

### 4.1. Live Standings & Dynamic Table
* **Automatic Metric Computation**: Calculates Matches Played (MP), Wins (W), Draws (D), Losses (L), Goals For (GF), Goals Against (GA), Goal Difference (GD), Points (PTS), and Clean Sheets (CS).
* **Multi-Column Interactive Sorting**: Default sorting by **PTS (Points, descending)** with official tiebreaker fallbacks (GD > GF > Rank). Every column (`#`, `Club / Team`, `MP`, `W`, `D`, `L`, `PTS`, `GF`, `GA`, `GD`, `CS`) is clickable to sort in ascending or descending order, complete with an instant "Reset Sort" action.
* **Official Tiebreak Hierarchy**:
  1. Points
  2. Goal Difference (GD)
  3. Goals Scored (GF)
  4. Head-to-Head record between tied teams
  5. Alphabetical club code
* **Visual Qualification Zones**:
  * **UCL / Championship Zone (Ranks 1–4)**: Highlighting in vivid emerald green (`#10b981`).
  * **Europa League Zone (Ranks 5–8)**: Outlined in bright cyan/blue (`#06b6d4`).
  * **Mid-Table (Ranks 9–17)**: Neutral slate tone.
  * **Relegation / Drop Zone (Ranks 18–21)**: Framed in rose/red (`#f43f5e`).
* **Recent Form Sequence**: Interactive last-5 match pills (`W`, `D`, `L`) showing score tooltips and home/away opponents.

### 4.2. 42-Matchday Double Round-Robin Fixtures
* **Mathematical Scheduling Algorithm**: Employs the Berger polygon rotation method to generate 42 matchdays for 21 clubs (21 home rounds + 21 return legs).
* **Automatic Bye Management**: Because 21 is an odd number, exactly 1 team receives an official bye each matchday. The active bye team is prominently displayed at the top of each matchday.
* **Horizontally Scrollable Round Carousel**:
  * Clean, touch-pan enabled carousel spanning `MD1` to `MD42`.
  * Visual status dots: **Green dot** for fully completed rounds, **Amber dot** for in-progress rounds.
  * Auto-centering feature: Switching matchdays smoothly scrolls the active round pill into the middle of the viewport.
* **Filters**: Quick toggles for *All Matches*, *Completed*, *Scheduled*, or filtering by a specific club.

### 4.3. Proof of Play & Score Submission
* **Admin Verification**: Only authenticated league administrators can submit, modify, or overturn match scores.
* **Score & Event Recording**: Input home and away scorelines, goal events (scorer name, assist, minute, penalty, own goal), and referee notes.
* **Decoupled High-Speed Cloud Proof Store (Option 1 Architecture)**:
  * Upload screenshots directly from mobile device or desktop browser.
  * Screenshots are compressed into lightweight ~8KB payloads and stored independently in the `/match_proofs/{matchId}` collection.
  * The primary tournament record (`/tournaments/efootball_premier_league_2026`) is completely decoupled from screenshot payload size, keeping the entire 420-fixture league schedule at a minimal ~60KB footprint (vastly below Firestore's 1MB single-document limit).
  * Proofs are loaded on-demand with instant LRU caching and real-time subscription when a user views a match dossier.

### 4.4. Team Profiles & Head-to-Head Dossiers
* **Club Detail Modal**: Displays manager name, squad colors, total matches, win rate, goals per game, clean sheets, and full historical match timeline.
* **Head-to-Head Analysis**: Comparing any two teams computes lifetime H2H aggregate scores, total meetings, goal averages, and past encounter outcomes.

### 4.5. League Analytics & Leaderboards
* **Top Attacking Units**: Teams ranked by total goals scored and goals per match average.
* **Defensive Resilience**: Teams ranked by fewest goals conceded and clean sheet percentage.
* **High-Scoring Thrillers**: Chronological log of the highest-scoring matches across the entire tournament.

### 4.6. Social Media Graphic Generator (Canvas)
* Renders 1080×1080 or 1200×630 shareable graphics directly inside the browser using HTML5 Canvas.
* Features team crests, club names, manager tags, official scorelines, matchday badges, and tournament watermarks.
* One-click download button (`PNG`) formatted for WhatsApp groups, Discord announcements, and Instagram stories.

---

## 5. User Flows & Interaction Models

### 5.1. Spectator & Player Flow

```mermaid
graph TD
    A[Visitor Opens Web App] --> B[Browse Standings Table]
    B --> C{Select Interaction}
    C -->|Click Team| D[Open Team Profile & Records]
    C -->|Click Matchday Tab| E[Browse MD1-MD42 Fixtures]
    C -->|Click Match Card| F[Open Match Detail Dossier]
    F --> G[Inspect H2H & Proof Screenshot]
    F --> H[Export Shareable Matchday Card PNG]
```

1. **Viewing Standings**: The spectator sees the live leaderboard, qualification cutoffs, and recent form.
2. **Reviewing Matchdays**: The user navigates to the **Fixtures** tab, scrolls through matchday pills (e.g. `MD12`), and filters by their preferred team.
3. **Checking Proof**: Clicking any completed fixture opens the match dossier displaying the official screenshot submitted by the manager.
4. **Sharing**: Clicking "Share Card" renders a custom branded image ready for saving to camera roll.

---

### 5.2. League Administrator Flow

```mermaid
graph TD
    A[Admin Click 'Admin Login' in Header] --> B[Enter Admin Password]
    B --> C[Admin Mode Enabled: Amber Crown Badge]
    C --> D{Admin Operations}
    D -->|Submit Result| E[Open Submit Result Modal]
    E --> F[Select Match, Enter Score & Goals]
    F --> G[Upload Match Screenshot - Auto-Compress]
    G --> H[Save to Cloud Firestore]
    H --> I[Live Broadcast to All Spectators]
    D -->|Tournament Settings| J[Change Tournament Rules / Reset Schedule]
```

1. **Authentication**: Admin clicks the padlock icon in the header and inputs the master administrator password (`League987` or environment default).
2. **Result Entry**: Admin clicks the "Submit Result" button in the header or the pen icon on any fixture card.
3. **Score & Screenshot**: Admin inputs final score (e.g., `3 - 1`), uploads the victory screenshot, and clicks **Save Match Result**.
4. **Live Synchronization**: The match status transitions to `completed`, points and standings are instantly recalculated, and the update is pushed to all connected clients via Firestore.

---

## 6. Design System & Aesthetic Archetype

The visual design follows a **Precision Dark Esports** archetype tailored for competitive gaming:

### Color Palette
* **Deep Obsidian Surface (`#0a0c10` / `#0f172a`)**: Primary backdrop minimizing eye strain while providing high contrast for team colors.
* **Emerald Glow (`#10b981`)**: Primary accent used for UCL qualification spots, active matchday tabs, victories, and positive goal difference.
* **Electric Cyan (`#06b6d4`)**: Secondary accent denoting Europa League positions and interactive links.
* **Amber / Trophy Gold (`#f59e0b`)**: Highlight color for admin crown badges, high-scoring matches, and in-progress matchday dots.
* **Rose / Red (`#f43f5e`)**: Danger indicator for relegation zones, match losses, and reset confirmations.

### Typographic Hierarchy
* **Display & Numerals**: Monospace styling (`font-mono`) for scores, matchday badges, points, and table metrics to prevent jitter and maintain numerical alignment.
* **Club & Manager Names**: Medium to bold tracking (`font-semibold`) with uppercase short codes (e.g. `BVB`, `RMA`, `FCB`).
* **Micro-labels**: High-contrast muted slate (`text-slate-400` / `text-slate-300`) with generous spacing.

---

## 7. Data Models & TypeScript Interfaces

### `Team`
```typescript
export interface Team {
  id: string;              // Unique identifier (e.g., 'team-1')
  managerName: string;     // Manager / player display name
  clubName: string;        // Official club name (e.g., 'Real Madrid')
  shortCode: string;       // 3-letter acronym (e.g., 'RMA')
  logo: string;            // Vector SVG or Data URL
  color: string;           // Primary hex color
  secondaryColor: string;  // Secondary hex color
  feePaid?: boolean;       // Registration fee status
}
```

### `Match`
```typescript
export interface Match {
  id: string;              // Match identifier (e.g., 'match-1-1')
  round: number;           // Matchday round (1 to 42)
  matchNumber: number;     // Sequential match number within round
  homeTeamId: string;      // Reference to Team.id
  awayTeamId: string;      // Reference to Team.id
  homeScore: number | null;// Null until completed
  awayScore: number | null;// Null until completed
  status: 'scheduled' | 'in_progress' | 'completed' | 'disputed';
  playedAt?: string;       // ISO 8601 timestamp
  goals?: GoalEvent[];     // Optional breakdown of goal events
  notes?: string;          // Admin notes or penalties
  screenshotUrl?: string;  // Compressed image Data URI
  submittedBy?: string;    // Submitter name or admin ID
}
```

### `StandingsRow`
```typescript
export interface StandingsRow {
  team: Team;
  rank: number;
  previousRank?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
  recentMatches: {
    matchId: string;
    opponentShortCode: string;
    result: 'W' | 'D' | 'L';
    score: string;
    isHome: boolean;
  }[];
  cleanSheets: number;
}
```

---

## 8. Deployment & Environment Setup

### 8.1. Environment Variables (`.env`)
To run the project with real-time cloud synchronization, create a `.env` file in the root directory:

```env
# Admin Credentials
VITE_ADMIN_DEFAULT_EMAIL="admin@efootball.com"
VITE_ADMIN_DEFAULT_PASSWORD="League987"
VITE_ADMIN_DEFAULT_NAME="League Administrator"

# Firebase Cloud Firestore Configuration
VITE_FIREBASE_API_KEY="AIzaSyDMNIYIrGuk-DxsOZFy9RD8PEWDAjIGghQ"
VITE_FIREBASE_AUTH_DOMAIN="refreshing-continuum-85fd2.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="refreshing-continuum-85fd2"
VITE_FIREBASE_STORAGE_BUCKET="refreshing-continuum-85fd2.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="790544091942"
VITE_FIREBASE_APP_ID="1:790544091942:web:2f860dd55ef4b744c2cfe7"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="ai-studio-efootballmobilel-a8caeed4-3cad-466b-9f02-3612288b173d"
```

### 8.2. Deploying to Vercel
1. Push the repository to GitHub.
2. In the Vercel dashboard, click **Import Project**.
3. Under **Project Settings → Environment Variables**, add the variables from `.env`.
4. Deploy — the included `vercel.json` ensures all SPA routes route smoothly without 404 errors:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

*Document compiled for the eFootball Mobile Premier League 2026 Season.*
