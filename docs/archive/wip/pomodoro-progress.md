# Pomodoro Timer — Progress

Outil minuteur d'étude (cycles travail/pause) ajouté dans `/organisation/`.

## Décisions verrouillées (v1)

| #                      | Décision                                           |
| ---------------------- | -------------------------------------------------- |
| Persistance            | localStorage uniquement, pas de DB                 |
| Multi-onglets          | "Dernier qui écrit gagne", pas de BroadcastChannel |
| Timer hors page        | Singleton réactif, survit à la navigation SPA      |
| Reload                 | Replay 1 transition de phase max si manquée        |
| Son                    | 1 MP3 court libre de droits dans `static/sounds/`  |
| Sous-navigation        | Onglets `Kanban / Pomodoro` dans `+layout.svelte`  |
| Index `/organisation/` | Redirige vers `/organisation/kanban`               |
| Historique             | Reporté en v2 (juste compteur du jour en v1)       |
| Tests                  | Unit tests sur logique pure extraite               |

## Architecture

```
src/lib/stores/pomodoro/
├── logic.ts                 # Pure functions (state machine, transitions, serialization)
├── logic.test.ts            # Vitest sur logic.ts
└── pomodoro.svelte.ts       # Singleton réactif Svelte 5

src/routes/(protected)/organisation/
├── +layout.svelte           # + onglets Kanban/Pomodoro
├── +page.server.ts          # Nouveau : redirect vers /kanban
└── pomodoro/
    ├── +page.svelte
    ├── PomodoroDisplay.svelte
    ├── PomodoroControls.svelte
    └── PomodoroSettings.svelte

static/sounds/pomodoro-bell.mp3
```

## Phases

- [x] **Phase 0** — Setup (cette section)
- [x] **Phase 1** — Pure logic + tests TDD (commit `5f24639d3`, 51 tests)
- [x] **Phase 2** — Reactive singleton store (commit `b79d3e56c`)
- [x] **Phase 3** — UI + navigation (commit `3aad57570`) - Build by `frontend-developer` agent - Reviewed in parallel by `code-reviewer` + `accessibility-tester` - Fixes applied: focus-preserving Play/Pause toggle, dropped redundant
      `aria-label` on number inputs (WCAG 2.5.3), `aria-controls` on
      settings panel, robustified active-tool detection, removed stuttering
      progress-ring transition
- [x] **Phase 4** — Sound + browser notifications (commit `c6da65808`) - WebAudio-synthesised bell (no MP3 shipped) - `unlockAudio()` from Play handler for Safari autoplay policies - Notification permission flow with toaster fallback on refusal - Limitation v1 documented: side effects only fire on /pomodoro page
- [x] **Phase 5** — Quality checks finaux - `svelte-autofixer` clean on all 4 modified `.svelte` files - `npx eslint` clean on the 9 modified files - `pnpm check:incremental`: 9E/46W — **identique à la baseline** (zéro régression) - 51 tests `logic.test.ts` passent

## Fichiers livrés

### Nouveaux

- `src/lib/stores/pomodoro/logic.ts` — pure state machine
- `src/lib/stores/pomodoro/logic.test.ts` — 51 tests vitest
- `src/lib/stores/pomodoro/pomodoro.svelte.ts` — reactive singleton
- `src/lib/stores/pomodoro/effects.ts` — WebAudio bell + Notification API
- `src/routes/(protected)/organisation/+page.server.ts` — redirect → /kanban
- `src/routes/(protected)/organisation/pomodoro/+page.svelte`
- `src/routes/(protected)/organisation/pomodoro/PomodoroDisplay.svelte`
- `src/routes/(protected)/organisation/pomodoro/PomodoroControls.svelte`
- `src/routes/(protected)/organisation/pomodoro/PomodoroSettings.svelte`
- `docs/wip/pomodoro-progress.md` (ce fichier)

### Modifiés

- `src/routes/(protected)/organisation/+layout.svelte` (ajout sous-nav)

## Vérification manuelle restante (utilisateur)

Pas de test e2e en v1 (décision). À vérifier manuellement dans un navigateur
(port 5175) :

1. Cycle nominal 25/5/15 sur 4 pomodoros (durées réduites en réglages pour
   accélérer le test).
2. Reload pendant un cycle running : la restauration depuis localStorage
   reprend correctement.
3. Navigation /pomodoro → /kanban → /pomodoro : le timer continue en arrière-plan,
   l'état affiché à la reprise est correct.
4. Toggle "Notifications du navigateur" : permission flow Chrome + Firefox + Safari.
5. Son sur Safari après premier clic Play (autoplay unlock).
6. Tab d'onglet inactif pendant >10 min : la transition de phase a eu lieu
   au retour.

## Commits

| Phase | SHA         | Description                        |
| ----- | ----------- | ---------------------------------- |
| 1     | `5f24639d3` | Pure state machine + 51 tests      |
| 2     | `b79d3e56c` | Reactive singleton store           |
| 3     | `3aad57570` | Page UI + organisation sub-nav     |
| 4     | `c6da65808` | Bell sound + browser notifications |
| 5     | (this)      | Progress doc finalisé              |

## v1.5 — Tier 1 (livré)

Items hors-scope v1 promus en v1.5 pour faire sentir l'expérience plus complète :

| #   | Item                           | SHA         | Description                                                                                                                                                       |
| --- | ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Side-effects globaux           | `87697bd9d` | `<PomodoroEffects />` mounté dans `(protected)/+layout.svelte` — son + notif + aria-live fire depuis n'importe quelle page protégée                               |
| 2   | BroadcastChannel multi-onglets | `562fb455d` | `broadcast.ts` wrappe BC + tabId stable. Store sync state/settings entre onglets, `isRemote` flag évite N dings concurrents. Fallback localStorage si BC indispo. |
| 3   | Quality checks finaux          | (this)      | ESLint clean, `check:incremental` 9E/46W baseline inchangée, 51 tests passent                                                                                     |

### Limitation v1.5 connue

Si 2 onglets ticks dans une fenêtre <5ms simultanée, chacun joue son propre bell avant de recevoir le broadcast du peer. Cas rare en pratique (intervalles `setInterval` offset par onglet). Documenté dans `broadcast.ts` et le code-review.

### Tests automatisés sur BroadcastChannel

Non — jsdom ne polyfille pas l'API. Vérification manuelle :

1. Ouvrir 2 onglets sur `/organisation/pomodoro`, hit Play sur l'un, l'autre reflète l'état.
2. Laisser une transition se faire → **un seul** ding.
3. Modifier un réglage sur un onglet → propagation immédiate à l'autre.

## Hors scope v1 (backlog v2)

- Table DB / migration / API / RLS
- Historique persistant des sessions
- Lien Kanban ↔ Pomodoro
- Widget flottant global
- Synchro multi-onglets via BroadcastChannel
- Tests e2e Playwright
- Service worker pour timer en background
- Son personnalisable

## Notes d'implémentation

(à compléter au fil des phases)
