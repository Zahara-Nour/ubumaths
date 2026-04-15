# 2048 VIP Cards - Document de progression

## Date : 2026-04-15

## Objectif

Ajouter 3 types de cartes VIP au jeu 2048 (5 templates au total) :

- **Undo** (1 carte) : annuler le dernier coup
- **Bombe** (3 tiers) : supprimer une tuile selon sa valeur max
- **Gel de Spawn** (1 carte) : prochain coup sans nouvelle tuile

## Decisions prises

| Decision                | Choix                        | Raison                                                             |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Architecture            | Client-side only             | Le 2048 n'a pas de session serveur (contrairement au demineur)     |
| Bombes                  | 3 niveaux (<=4, <=16, <=64)  | Progression common/rare/epic, plus strategique                     |
| Fallback gidouilles     | Oui                          | Comme le demineur, pouvoir payer en gidouilles si pas de carte VIP |
| Penalite sur recompense | Aucune                       | Les cartes sont deja rares/couteuses                               |
| Images                  | Placeholders colores + emoji | Remplaces plus tard par de vraies images                           |
| Contexte VIP            | `'2048': async () => true`   | Pas de session serveur a valider                                   |

## Toutes les cartes proposees (7 types)

### Vague 1 — Implementation immediate

| ID                  | Nom               | Rarete | Effet                                  | Max/partie  | Cout gidouilles |
| ------------------- | ----------------- | ------ | -------------------------------------- | ----------- | --------------- |
| `2048-undo`         | Retour en Arriere | rare   | Annule le dernier coup                 | 2           | 5g              |
| `2048-bomb`         | Bombe (1)         | common | Supprime une tuile <= 4                | 3 (partage) | 3g              |
| `2048-bomb-2`       | Bombe (2)         | rare   | Supprime une tuile <= 16               | 3 (partage) | 8g              |
| `2048-bomb-3`       | Bombe (3)         | epic   | Supprime une tuile <= 64               | 3 (partage) | 15g             |
| `2048-freeze-spawn` | Gel de Spawn      | common | Pas de nouvelle tuile au prochain coup | 2           | 3g              |

### Vague 2 — Implementation future

| ID (propose)        | Nom                   | Rarete    | Effet                                                               | Max/partie | Cout gidouilles |
| ------------------- | --------------------- | --------- | ------------------------------------------------------------------- | ---------- | --------------- |
| `2048-merge`        | Fusion Forcee         | epic      | Fusionne 2 tuiles identiques adjacentes sans mouvement global       | 1          | 15g             |
| `2048-joker`        | Joker / Transmutation | rare      | Change la valeur d'une tuile pour matcher une voisine               | 1          | 10g             |
| `2048-vision`       | Vision                | common    | Montre ou et quelle valeur aura la prochaine tuile, pendant 3 coups | 2          | 3g              |
| `2048-multiplier`   | Multiplicateur x1.5   | epic      | Score final x1.5                                                    | 1          | 20g             |
| `2048-multiplier-2` | Multiplicateur x2     | legendary | Score final x2                                                      | 1          | 40g             |

## Analyse technique

### Etat actuel du 2048

- **Game logic** : Pure functions dans `game-logic.ts`, pas d'effets de bord
- **State** : `GameState` = board (4x4 matrix) + score + gameOver + won + canUndo
- **Persistence** : localStorage uniquement, score final envoye au serveur via POST `/api/games/2048/scores`
- **Pas de game session** cote serveur (contrairement au demineur qui a `minesweeper_games`)
- **Pas d'historique** de mouvements (le champ `canUndo` existe mais toujours `false`)
- **Interface `Move`** definie dans `types.ts` (l.60-68) mais jamais utilisee

### Pattern du demineur a repliquer

1. **Store** : Variables d'etat pour chaque type de carte (count, usage, loading)
2. **Fetch** : `countAvailableConsumableUses(vipCards, cardIds)` pour compter les cartes dispo
3. **Consommation** : POST `/api/vip-cards/use-card` pour marquer une carte comme utilisee
4. **UI** : Boutons avec tooltip, badge count, bordure coloree (vert=VIP, ambre=gidouilles)
5. **Contexte** : Validateur dans `vip-card-context.ts`

### Fichiers a modifier/creer

| Fichier                                                  | Action                                   | Phase |
| -------------------------------------------------------- | ---------------------------------------- | ----- |
| `src/routes/(public)/games/2048/types.ts`                | Modifier (ajouter VipCardUsage)          | 1     |
| `src/routes/(public)/games/2048/game-logic.ts`           | Modifier (3 fonctions pures)             | 1     |
| `src/lib/types/vip-card.ts`                              | Modifier (BombAction, FreezeSpawnAction) | 1     |
| `supabase/migrations/..._add_2048_vip_cards.sql`         | Creer                                    | 2     |
| `src/lib/server/vip-card-context.ts`                     | Modifier (+2 lignes)                     | 2     |
| `src/lib/utils/vip-cards.ts`                             | Modifier (descriptions)                  | 2     |
| `src/routes/api/games/2048/use-power/+server.ts`         | Creer                                    | 3     |
| `src/routes/(public)/games/2048/Game2048Controls.svelte` | Creer                                    | 4     |
| `src/routes/(public)/games/2048/Game2048.svelte`         | Modifier (majeur)                        | 5     |
| `src/routes/(public)/games/2048/Tile2048.svelte`         | Modifier (bomb mode)                     | 5     |
| `src/routes/(public)/games/2048/+page.svelte`            | Modifier                                 | 5     |
| `src/routes/(public)/games/2048/+page.server.ts`         | Modifier (charger VIP cards)             | 5     |

### Utilitaires existants a reutiliser

- `countAvailableConsumableUses()` — `src/lib/utils/vip-cards.ts`
- `/api/vip-cards/use-card` endpoint — consommation carte VIP existant
- `update_student_gidouilles` RPC — debit gidouilles existant
- Pattern `GameControls.svelte` — UI boutons de pouvoir
- Pattern `UndoConfirmModal.svelte` — modal confirmation (optionnel)

## Plan d'implementation

### Phase 1 : Types et logique de jeu pure

- Ajouter types TypeScript (VipCardUsage, BombAction, FreezeSpawnAction)
- Ajouter 3 fonctions pures dans game-logic.ts
- Tests unitaires

### Phase 2 : Migration DB + contexte serveur

- Migration SQL : INSERT 5 templates
- Contexte '2048' dans vip-card-context.ts
- Descriptions dans vip-cards.ts

### Phase 3 : Endpoint gidouilles fallback

- Creer `/api/games/2048/use-power/+server.ts`
- Validation Zod, debit gidouilles, logging

### Phase 4 : UI — Game2048Controls

- Creer le composant barre de pouvoirs
- 3 groupes de boutons avec tooltips et badges
- Mode bombe (overlay + clic sur tuile)

### Phase 5 : Integration Game2048.svelte

- State VIP cards, handlers, bomb mode, undo history, freeze spawn
- Modifier Tile2048.svelte pour bomb mode
- Modifier page.server.ts pour charger VIP card counts

### Phase 6 : Tests + Quality checks

- Tests unitaires game-logic
- Svelte autofixer, TypeScript check, ESLint
- Code review

## Progression

| Phase   | Statut | Notes                                                      |
| ------- | ------ | ---------------------------------------------------------- |
| Phase 1 | Fait   | Types + 3 fonctions pures + 12 tests                       |
| Phase 2 | Fait   | Migration SQL + contexte '2048' + descriptions             |
| Phase 3 | Fait   | Endpoint /api/games/2048/use-power + requireConsent        |
| Phase 4 | Fait   | Game2048Controls.svelte cree                               |
| Phase 5 | Fait   | Integration complete dans Game2048.svelte                  |
| Phase 6 | Fait   | 46 tests passent                                           |
| Phase 7 | Fait   | ESLint 0 errors, autofixer OK, code review fixes appliques |

## Corrections post-review

1. **requireConsent** ajoute dans use-power endpoint (security fix)
2. **hasBombTargets** utilise bestBombMaxValue au lieu de bombMaxValue (bug fix)
3. **BOMB_CARD_BY_TIER** map extracte pour DRY (code quality)
4. **pendingBombCard** capture le bomb card au handleBomb pour eviter race condition
5. **bombMode** reset au game over (UX fix)
6. **BOMB_CARD_IDS** unused var supprimee (ESLint fix)

## Vague 2 — Progression

| Phase   | Statut  | Notes                                                                                                                 |
| ------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | Fait    | 8 fonctions pures + 20 tests (66 total). Review fixes: adjacency check, occupied cell guard, stale animation metadata |
| Phase 2 | A faire | Types + Migration DB + endpoint                                                                                       |
| Phase 3 | A faire | Integration Game2048.svelte                                                                                           |
| Phase 4 | A faire | UI Controls + Tile2048                                                                                                |
| Phase 5 | A faire | Tests + Quality checks + review finale                                                                                |

## Risques identifies

1. **Undo + localStorage** : Si le joueur recharge la page, previousState est perdu. Acceptable (les cartes ne sont pas consommees si undo pas utilise).
2. **Bomb mode + animations** : Le mode bombe doit coexister avec les animations de tiles existantes. A tester soigneusement.
3. **Freeze spawn edge case** : Si le joueur utilise freeze spawn mais le mouvement ne change rien (moved=false), le flag ne doit pas etre consomme.
