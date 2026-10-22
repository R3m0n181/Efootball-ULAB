# Double Forfeit & Abandoned Match Result Submission

Enables administrators to mark match fixtures as **Abandoned (Double Forfeit)**. Both teams are awarded **0 points**, the match is recorded with a **0–0 scoreline** with **zero goal difference impact**, both teams have their **Matches Played (MP) incremented by +1**, and the match is visually badged as **ABANDONED** across all public and admin views.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following specifications were confirmed during interactive clarification and form the foundation of this implementation:

- **Standings Impact (Confirmed)**: Double forfeit matches will count as Played (+1 MP) for both teams, awarding **0 points** to both teams without awarding wins, draws, or goals.
- **Score Representation (Confirmed)**: The match will be recorded with a **0–0** scoreline and **zero goal difference impact**.
- **Admin Access Points (Confirmed)**: Accessible via both the **Submit / Edit Result modal** (via a prominent "Submit as Double Forfeit" action) and directly from the **Pending Fixtures Queue** in Admin Hub (via a quick-action "Double Forfeit" button with confirmation).

---

## 1. Overview & Core Concept

In competitive league management, when both clubs fail to arrange or play their scheduled fixture by the deadline, league administrators need the ability to enforce a double forfeit. 

### Key Capabilities
1. **Administrative Result Submission**: Admins can submit or convert any pending or scheduled fixture into an **Abandoned (Double Forfeit)** match.
2. **Strict Standings Rules**:
   - Matches Played (MP): +1 for Home Team, +1 for Away Team.
   - Points (Pts): +0 for Home Team, +0 for Away Team.
   - Won / Drawn / Lost: Neither team gets a Win or Draw. Both teams receive 0 points.
   - Goals & GD: Recorded as 0–0, ensuring no artificial goal differential inflation or deflation.
3. **Queue Clearance**: Once submitted as Abandoned, the match is removed from the active pending backlog queue and marked completed in round pacing calculations.
4. **Distinctive Visual Status**: Rendered with an amber/rose **ABANDONED** badge with tooltip *"Double Forfeit • 0 pts awarded"* across Fixtures, Results, Team Detail, Manager Log, and Admin views.

---

## 2. User Experience & Visual Design

### Key User Flows

#### Flow A: Submit Result Modal (Admin Hub / Fixtures View)
1. Admin clicks **"Edit Match"** or **"Submit Result"** for any match fixture.
2. In the modal, alongside standard score entry steppers, an **"Abandon Match (Double Forfeit)"** button is available.
3. Clicking it toggles the modal into **Double Forfeit Mode**:
   - Scores lock to `0 – 0`.
   - A warning alert explains: *"Both clubs will receive 0 points and +1 Match Played. Goal difference will not be affected."*
   - Pre-fills/appends the match notes with *"Double Forfeit: Match abandoned by league administrator."*
4. Admin clicks **"Confirm Double Forfeit"** to save.

#### Flow B: Quick Action in Pending Fixtures Queue (Admin Hub)
1. Admin navigates to **Admin Hub -> Pending Fixtures**.
2. Each match card displays a quick **"Double Forfeit"** button (shield/ban icon) next to the "Edit Match" button.
3. Clicking it prompts a concise confirmation popover: *"Mark MD {round} ({home} vs {away}) as Abandoned Double Forfeit (0 pts to both)?"*
4. Confirming immediately marks the fixture abandoned, clears it from the pending backlog, updates standings, and refreshes the pacing gauge.

### Visual Badging & Theming
- **Badge Style**: `bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono font-bold text-[9px] uppercase tracking-wider`
- **Scoreboard Indicator**: Displays `0 : 0` with a subtle `ABANDONED` subtitle chip instead of a standard `Completed` badge.
- **Match Card Background**: Muted dark slate styling with a subtle warning border to distinguish abandoned fixtures from standard victories and draws.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Standings Formula for Abandoned Fixtures**
  - *Chosen Approach*: `homeStats.played += 1; awayStats.played += 1; homeStats.points += 0; awayStats.points += 0;` Goals remain 0–0.
  - *Why*: Perfectly aligns with the user's explicit preference while ensuring the total matches played tally equals the scheduled matchday progression without distorting goal difference rankings.
- **Decision 2: Queue Removal Behavior**
  - *Chosen Approach*: Abandoned matches are treated as resolved/non-pending in `AdminPacingTab`.
  - *Why*: A double forfeit is an administrative resolution that closes out the matchday backlog.
- **Decision 3: Reversibility**
  - *Chosen Approach*: Admins can re-open or edit an abandoned match at any time via the standard Edit Match modal to revert it to a normal played result if appeals are accepted.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                        Admin Actions                        │
│   ┌─────────────────────────┐   ┌────────────────────────┐  │
│   │   SubmitResultModal     │   │   AdminPacingTab       │  │
│   │   (Double Forfeit Mode) │   │   (Quick Action)       │  │
│   └────────────┬────────────┘   └───────────┬────────────┘  │
└────────────────┼────────────────────────────┼───────────────┘
                 │                            │
                 ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Match State Mutation                      │
│   Match {                                                   │
│     status: 'abandoned',                                    │
│     homeScore: 0,                                           │
│     awayScore: 0,                                           │
│     notes: 'Double Forfeit: 0 pts awarded',                 │
│     playedAt: ISOString                                     │
│   }                                                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────┐
│   calculateStandings()    │         │  UI Badges & Views    │
│   • Played += 1           │         │  • Fixtures & Results │
│   • Points += 0           │         │  • MatchDetailModal   │
│   • GD delta = 0          │         │  • AdminPacingTab     │
│   • Excluded from Win/Draw│         │  • TeamDetailModal    │
└───────────────────────────┘         └───────────────────────┘
```

### Component & File Changes
1. **`src/types.ts`**:
   - Update `MatchStatus` to include `'abandoned'`:
     ```ts
     export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'disputed' | 'abandoned';
     ```
2. **`src/utils/calculations.ts`**:
   - Update `calculateStandings` to process `m.status === 'completed' || m.status === 'abandoned'`.
   - When `m.status === 'abandoned'`: increment `played += 1` for both clubs, award 0 points, and omit from win/draw/loss counters.
3. **`src/components/SubmitResultModal.tsx`**:
   - Add Double Forfeit toggle state and dedicated submit action.
   - When active, lock score inputs to 0–0, display warning alert, and save with `status: 'abandoned'`.
4. **`src/components/admin/AdminPacingTab.tsx`**:
   - Add quick "Double Forfeit" action button to pending match cards.
   - Update pending matches filter (`m.status !== 'completed' && m.status !== 'abandoned'`) so abandoned games count as resolved.
5. **`src/components/FixturesView.tsx` & `MatchDetailModal.tsx`**:
   - Add visual badge for `status === 'abandoned'` (`ABANDONED - 0 PTS`).
