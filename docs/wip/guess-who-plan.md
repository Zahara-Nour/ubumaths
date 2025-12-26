# Plan d'implémentation : Guess Who Mathématique

## Statut : EN COURS

---

## Phase 0 : Spécification TDD ✅

Comportements validés par l'utilisateur - voir conversation.

---

## Phase 1 : Base de données

### 1.1 Migration Supabase

**Agent** : `supabase-expert` (Opus)

**Tâches** :
- Créer la migration `guess_who_games` :
  - `id` (UUID)
  - `player1_id`, `player2_id` (UUID, FK students)
  - `status` ('waiting', 'choosing', 'in_progress', 'completed', 'abandoned')
  - `grid_numbers` (INTEGER[24])
  - `player1_secret`, `player2_secret` (INTEGER)
  - `current_turn` (UUID)
  - `bonus_turns_remaining` (INTEGER, default 0, max 3)
  - `winner_id` (UUID, nullable)
  - `share_token` (VARCHAR(16), unique)
  - `created_at`, `updated_at`

- Créer la table `guess_who_moves` :
  - `id` (UUID)
  - `game_id` (UUID, FK)
  - `player_id` (UUID, FK)
  - `move_type` ('question', 'answer', 'guess')
  - `question_type` (VARCHAR) - ex: 'is_even', 'divisible_by', 'greater_than'
  - `question_param` (INTEGER, nullable) - ex: 7 pour "divisible par 7"
  - `answer` (BOOLEAN, nullable)
  - `is_correct` (BOOLEAN, nullable)
  - `guessed_number` (INTEGER, nullable)
  - `created_at`

- Créer la table `guess_who_eliminated` :
  - `game_id` (UUID)
  - `player_id` (UUID)
  - `eliminated_numbers` (INTEGER[])
  - PRIMARY KEY (game_id, player_id)

- Fonction `generate_guess_who_token()` (réutiliser pattern existant)
- Politiques RLS appropriées
- Index sur `share_token`, `status`

**Livrables** :
- `supabase/migrations/YYYYMMDD_guess_who_game.sql`
- Types TypeScript mis à jour

**Validation** : Code review

---

## Phase 2 : Logique métier

### 2.1 Utilitaires mathématiques

**Agent** : `backend-developer` (Sonnet)

**Tâches** :
- Créer `src/lib/utils/guess-who/math-properties.ts` :
  - `isPrime(n: number): boolean`
  - `isEven(n: number): boolean`
  - `isDivisibleBy(n: number, divisor: number): boolean`
  - `getUnitsDigit(n: number): number`
  - `checkProperty(n: number, question: QuestionType, param?: number): boolean`

- Créer `src/lib/utils/guess-who/grid-generator.ts` :
  - `generateGrid(): number[]` - 24 nombres uniques entre 2-99
  - `assignSecretNumbers(grid: number[]): [number, number]` - 2 nombres différents

**Tests** : TDD - écrire les tests d'abord

**Validation** : Code review + tests passent

---

### 2.2 Types et schémas Zod

**Agent** : `typescript-expert` (Sonnet)

**Tâches** :
- Créer `src/lib/types/guess-who.ts` :
  - `QuestionType` (enum)
  - `GameStatus` (enum)
  - `MoveType` (enum)
  - `GuessWhoGame` (interface)
  - `GuessWhoMove` (interface)

- Créer `src/lib/server/validation/guess-who.ts` :
  - Schémas Zod pour toutes les requêtes API

**Validation** : Code review

---

### 2.3 Store Realtime

**Agent** : `frontend-developer` (Opus)

**Pattern à suivre** : `src/lib/stores/multiplayer.svelte.ts` (direct channel, pas central manager)

**Tâches** :
- Créer `src/lib/stores/guessWhoGame.svelte.ts` :

  **Constants** (comme multiplayer.svelte.ts) :
  ```typescript
  const TURN_TIMEOUT_MS = 60000;        // 60s par action
  const GRACE_PERIOD_MS = 30000;        // 30s tolérance déconnexion
  const MAX_BONUS_TURNS = 3;            // Max tours bonus consécutifs
  ```

  **État réactif** (Svelte 5 runes) :
  ```typescript
  game = $state<GameState>({ status: 'idle', ... });
  mySecretNumber = $state<number | null>(null);
  eliminatedNumbers = $state<Set<number>>(new Set());
  moves = $state<Move[]>([]);
  timer = $state<number>(60);
  bonusTurnsRemaining = $state<number>(0);
  isMyTurn = $derived(...);
  mustAnswer = $derived(...);
  ```

  **Hybrid Realtime** :
  - **Broadcast** (~50ms) : `question_asked`, `answer_given`, `guess_made`, `timer_sync`
  - **postgres_changes** (~300ms) : `guess_who_games` UPDATE, `guess_who_moves` INSERT

  **Channel** : `supabase.channel(\`guess-who:\${gameId}\`)`

  **Méthodes** :
  - `init(supabase, userId)` / `reset()` / `cleanup()`
  - `createGame()` → API call + subscribe channel
  - `joinGame(token)` → API call + subscribe channel
  - `askQuestion(type, param?)` → Broadcast + API persist
  - `answerQuestion(answer)` → Broadcast + API persist + auto-validate
  - `guess(number)` → Broadcast + API persist
  - `eliminateNumber(n)` / `restoreNumber(n)` → local state + API sync
  - `handleTimeout()` → auto-pass or auto-error

  **Cleanup** : Via `$effect` return (timers, channel unsubscribe)

**Validation** : Code review

---

## Phase 3 : API Endpoints

### 3.1 Endpoints REST

**Agent** : `backend-developer` (Sonnet)

**Tâches** :
- `POST /api/games/guess-who/create` → Créer partie + retourner lien
- `POST /api/games/guess-who/join` → Rejoindre via token
- `GET /api/games/guess-who/[id]` → État actuel
- `POST /api/games/guess-who/[id]/question` → Poser question
- `POST /api/games/guess-who/[id]/answer` → Répondre Oui/Non
- `POST /api/games/guess-who/[id]/guess` → Tenter devinette
- `PATCH /api/games/guess-who/[id]/eliminate` → Mettre à jour nombres éliminés
- `POST /api/games/guess-who/[id]/abandon` → Abandonner

**Validation** :
- Zod sur toutes les entrées
- Vérification auth
- Vérification participation au jeu
- Vérification tour du joueur

**Validation** : Code review + Security audit (Opus)

---

## Phase 4 : Interface utilisateur

### 4.1 Composants de base

**Agent** : `frontend-developer` (Sonnet)

**Tâches** :
- `src/lib/components/guess-who/NumberCard.svelte` :
  - Affiche un nombre
  - État : normal, eliminated (grisé/rabattu), secret (surligné)
  - Animation de rabattement

- `src/lib/components/guess-who/NumberGrid.svelte` :
  - Grille 6x4 de NumberCard
  - Clic pour éliminer/restaurer

- `src/lib/components/guess-who/QuestionSelector.svelte` :
  - Dropdown avec toutes les questions possibles
  - Sous-options pour paramètres (divisible par X, etc.)

- `src/lib/components/guess-who/MoveHistory.svelte` :
  - Liste des questions/réponses
  - Indication des erreurs

- `src/lib/components/guess-who/Timer.svelte` :
  - Countdown 60s
  - Alerte visuelle < 10s

- `src/lib/components/guess-who/GameStatus.svelte` :
  - Affiche tour actuel
  - Bonus turns restants
  - Score/état

**Validation** : Code review

---

### 4.2 Écrans de jeu

**Agent** : `frontend-developer` (Opus)

**Tâches** :
- `src/lib/components/guess-who/WaitingScreen.svelte` :
  - Affiche lien partageable (copier)
  - Attente adversaire

- `src/lib/components/guess-who/GameScreen.svelte` :
  - Layout principal du jeu
  - Intègre tous les composants
  - Gestion des états (mon tour, tour adverse, répondre)

- `src/lib/components/guess-who/AnswerPrompt.svelte` :
  - Modal pour répondre Oui/Non
  - Timer visible
  - Question affichée clairement

- `src/lib/components/guess-who/GuessPrompt.svelte` :
  - Modal pour deviner
  - Sélection d'un nombre dans la grille

- `src/lib/components/guess-who/ResultScreen.svelte` :
  - Affiche gagnant/perdant
  - Révèle les 2 nombres secrets
  - Bouton Rejouer

**Validation** : Code review

---

### 4.3 Pages et routing

**Agent** : `fullstack-developer` (Sonnet)

**Tâches** :
- `src/routes/(public)/games/guess-who/+page.svelte` :
  - Page d'accueil du jeu
  - Bouton "Créer une partie"
  - Explication des règles

- `src/routes/(public)/games/guess-who/[token]/+page.svelte` :
  - Rejoindre via lien
  - Redirection vers jeu si auth

- `src/routes/(protected)/games/guess-who/[id]/+page.svelte` :
  - Page de jeu principale
  - Orchestration des écrans

- `src/routes/(protected)/games/guess-who/[id]/+page.server.ts` :
  - Load game data
  - Vérification accès

**Validation** : Code review

---

## Phase 5 : Intégration Realtime

### 5.1 Synchronisation temps réel

**Agent** : `supabase-expert` (Opus)

**Référence** : `docs/ref/realtime/` (architecture, best-practices, stores-reference)

**Tâches** :

1. **Configuration postgres_changes** :
   ```typescript
   channel.on('postgres_changes', {
     event: 'UPDATE',
     schema: 'public',
     table: 'guess_who_games',
     filter: `id=eq.${gameId}`
   }, handleGameUpdate);

   channel.on('postgres_changes', {
     event: 'INSERT',
     schema: 'public',
     table: 'guess_who_moves',
     filter: `game_id=eq.${gameId}`
   }, handleNewMove);
   ```

2. **Broadcast events** (FREE, ~50ms) :
   - `question_asked` : { questionType, param, playerId }
   - `answer_given` : { answer, isCorrect, correctAnswer, playerId }
   - `guess_made` : { number, isCorrect, playerId }
   - `timer_sync` : { remainingSeconds }
   - `player_reconnected` : { playerId }

3. **Gestion reconnexion** (pattern de multiplayer.svelte.ts) :
   ```typescript
   channel.on('system', { event: 'disconnect' }, handleDisconnect);
   channel.on('system', { event: 'reconnect' }, handleReconnect);
   ```
   - Grace period 30s avant forfait
   - Exponential backoff (5s, 10s, 20s, 40s, 80s max)
   - Max 5 tentatives

4. **Timer sync** :
   - Le serveur est source de vérité
   - Broadcast timer toutes les 10s pour sync
   - Client affiche countdown local entre syncs

5. **Validation payload runtime** (pattern de achievementsRealtime) :
   ```typescript
   private isValidMovePayload(payload: unknown): boolean { ... }
   ```

**Validation** : Code review + tests de latence manuels

---

## Phase 6 : Tests

### 6.1 Tests unitaires

**Agent** : `test-automator` (Sonnet)

**Tâches** :
- Tests `math-properties.ts` (isPrime, isDivisibleBy, etc.)
- Tests `grid-generator.ts`
- Tests logique de jeu (validation réponses, bonus turns)
- Tests composants Svelte (états, interactions)

**Objectif** : Couverture > 80%

**Validation** : Tous les tests passent

---

### 6.2 Tests d'intégration

**Agent** : `test-automator` (Opus)

**Tâches** :
- Test flow complet : création → rejoindre → jouer → fin
- Test déconnexion/reconnexion
- Test timeout
- Test erreurs de réponse + bonus

**Validation** : Tous les tests passent

---

## Phase 7 : Finalisation

### 7.1 Quality Checks

**Exécution directe** (pas d'agent) :
```bash
pnpm lint
pnpm check
pnpm test:unit -- --run
```

**Objectif** : 0 errors

---

### 7.2 Security Audit

**Agent** : `security-auditor` (Opus)

**Tâches** :
- Audit RLS policies
- Audit API endpoints
- Vérification validation Zod complète
- Vérification anti-triche (réponses côté serveur)

---

### 7.3 Accessibility Audit

**Agent** : `accessibility-tester` (Sonnet)

**Tâches** :
- Navigation clavier
- Screen reader
- Contraste couleurs
- Focus management

---

### 7.4 Documentation

**Agent** : `documentation-writer` (Haiku)

**Tâches** :
- Mettre à jour `docs/architecture/database-schema.md`
- Créer `docs/games/guess-who.md` (règles, architecture)

---

### 7.5 Commit final

**Agent** : `commit-manager` (Sonnet)

**Tâches** :
- Commit structuré avec message conventionnel
- Push vers branche

---

## Résumé des agents par phase

| Phase | Agent | Modèle |
|-------|-------|--------|
| 1.1 | supabase-expert | Opus |
| 2.1 | backend-developer | Sonnet |
| 2.2 | typescript-expert | Sonnet |
| 2.3 | frontend-developer | Opus |
| 3.1 | backend-developer + security-auditor | Sonnet + Opus |
| 4.1 | frontend-developer | Sonnet |
| 4.2 | frontend-developer | Opus |
| 4.3 | fullstack-developer | Sonnet |
| 5.1 | supabase-expert | Opus |
| 6.1 | test-automator | Sonnet |
| 6.2 | test-automator | Opus |
| 7.2 | security-auditor | Opus |
| 7.3 | accessibility-tester | Sonnet |
| 7.4 | documentation-writer | Haiku |
| 7.5 | commit-manager | Sonnet |

---

## Fichiers de progression

À mettre à jour après chaque phase :
- `docs/wip/guess-who-progress.md`

---

## Estimation

- **Phases 1-2** : Fondations (DB + logique)
- **Phases 3-4** : API + UI
- **Phases 5-6** : Realtime + Tests
- **Phase 7** : Qualité + Finalisation

---

## Notes importantes

1. **PAS de lint/check pendant les phases** - uniquement à la fin (Phase 7.1)
2. **Code review après chaque phase** - obligatoire
3. **Commits intermédiaires** après phases majeures (1, 3, 4, 6)
4. **Documentation de progression** mise à jour régulièrement
