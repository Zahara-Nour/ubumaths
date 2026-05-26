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
- [ ] **Phase 1** — Pure logic + tests TDD
- [ ] **Phase 2** — Reactive singleton store
- [ ] **Phase 3** — UI + navigation (frontend-developer agent)
- [ ] **Phase 4** — Sound + browser notifications + polish
- [ ] **Phase 5** — Quality checks finaux

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
