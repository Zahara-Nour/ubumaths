---
couvre:
  - 'src/lib/games/**'
  - 'src/lib/server/achievements/**'
  - 'src/lib/server/games/**'
  - 'src/lib/server/marketplace/**'
  - src/lib/server/reward-journal-balance.ts
  - 'src/lib/server/riddle-*.ts'
  - 'src/lib/server/vip-card-*.ts'
  - 'src/lib/server/validation/{achievements,choose-cards,draw-vip-cards,exchange-cards,games,marketplace-rpc,minesweeper,minesweeper-multiplayer,minesweeper-rpc,minesweeper-tournament,navadra,reward-journal,rewards,riddles,vip-card-admin,vip-card-rpc,vip-cards}.ts'
  - 'src/lib/stores/game/**'
  - 'src/lib/stores/{marketplace,minesweeper,multiplayer,rewardJournal,vipCardTemplates,holo-card,achievements}.svelte.ts'
  - 'src/lib/utils/{riddle-validator,riddle-badges,vip-cards,vip-card-modals,bonus-modals,holo-math}.ts'
  - 'src/lib/utils/game/**'
  - src/lib/client/validation/multiplayer-responses.ts
  - 'src/lib/components/teacher/{BonusReasonModal,VipCardUseDialog}.svelte'
  - 'src/lib/data/game/**'
  - 'src/lib/validation/{shop,marketplace}.ts'
  - src/lib/constants/vip-card-ui.ts
  - 'src/lib/types/{vip-card,vip-card-admin,marketplace,minesweeper,riddle,reward-journal,achievements,game}.ts'
  - 'src/lib/components/{vip-cards,marketplace,minesweeper,riddles,game,rewards,achievements}/**'
  - 'src/lib/components/{VipCard*,Gidouille*,BonusHistoryModal,StudentVipCardsModal,RewardsBlock}.svelte'
  - 'src/routes/(protected)/dashboard/navadra/**'
  - 'src/routes/(protected)/dashboard/student/{inventory,marketplace,minesweeper,riddles,vip-cards}/**'
  - 'src/routes/(protected)/dashboard/teacher/{gamification,minesweeper}/**'
  - 'src/routes/(protected)/dashboard/teacher/contenu/enigmes/**'
  - 'src/routes/(protected)/dashboard/admin/vip-cards/**'
  - 'src/routes/(protected)/games/**'
  - 'src/routes/(public)/games/**'
  - 'src/routes/(public)/demo/vip-cards-demo/**'
  - 'src/routes/api/{vip-cards,games,marketplace,riddles,rewards,achievements}/**'
  - 'src/routes/api/teacher/rewards/**'
  - 'src/routes/api/admin/vip-cards/**'
  - 'src/routes/api/student/{bonus-history,gidouilles-activity,rewards}/**'
  - 'src/routes/api/students/*/vip-cards/**'
  - 'src/routes/api/classes/*/gidouilles/**'
  - scripts/simulate-vip-economy.ts
---

# Jeux et économie (gidouilles, cartes VIP, marché, classements)

> Remplace `vips/economy.md` (mars 2026), qui décrivait l'économie sans le code des jeux et citait
> huit migrations antérieures au baseline `20260616220000`. Les catalogues de prix, les estimations
> de revenu et la simulation Monte-Carlo de cette version sont **jetés** : les prix vivent en base
> (`vip_card_templates`, modifiés en prod), pas dans le code.
> Vérifié contre le code le 2026-10-10.

## À quoi ça sert

Motiver les élèves par le jeu sans sortir des mathématiques : des **jeux** (démineur, 2048,
Mathémo, Trio, énigmes) rapportent des **gidouilles** (monnaie virtuelle, `profiles.gidouilles`),
dépensées en **cartes VIP** (privilèges et pouvoirs accordés en classe par le prof) ou en
pouvoirs de jeu. Les cartes s'échangent sur le **marché** entre élèves d'une même école. Le
prof distribue aussi gidouilles et cartes à la main.

Le compagnon virtuel (Palotins) a sa propre doc : [buddy-palotins.md](buddy-palotins.md).
Les tables, une par une : [base-de-donnees-tables.md](base-de-donnees-tables.md) (sections
« Jeux, défis et récompenses » et « Marché »).

## Carte du code

### Les jeux branchés

Catalogue : `src/routes/(public)/games/+page.svelte` (Trio, Mathémo, Démineur, 2048 ; Navadra
commenté).

| Jeu                  | Page                                                            | API / logique                                                                                                                         | Gidouilles                                    |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Démineur**         | `src/routes/(public)/games/minesweeper/+page.svelte`            | `src/routes/api/games/minesweeper/` (start, `[id]/complete`, hint, detect, undo, loss) ; store `src/lib/stores/minesweeper.svelte.ts` | oui, par `complete_minesweeper_game`          |
| **2048**             | `src/routes/(public)/games/2048/+page.svelte`                   | logique pure `src/routes/(public)/games/2048/game-logic.ts` ; `src/routes/api/games/2048/scores/+server.ts`                           | oui, `src/lib/server/games/reward-2048.ts`    |
| **Mathémo** (mot)    | `src/routes/(public)/games/mathemo/+page.svelte`                | `src/routes/(public)/games/mathemo/game.svelte.ts` ; `src/routes/api/games/mathemo/scores/+server.ts`                                 | oui, `src/lib/server/games/reward-mathemo.ts` |
| **Trio** (a × b ± c) | `src/routes/(public)/games/trio/+page.svelte`                   | tout dans `src/routes/(public)/games/trio/Trio.svelte`                                                                                | non                                           |
| **Énigmes**          | `src/routes/(protected)/dashboard/student/riddles/+page.svelte` | `src/routes/api/riddles/[id]/submit/+server.ts` ; validation `src/lib/utils/riddle-validator.ts`                                      | oui, par `submit_riddle_attempt`              |

Côté prof, les énigmes se gèrent sous `src/routes/(protected)/dashboard/teacher/contenu/enigmes/`
(création, énigme du jour, validation des réponses libres, stats). L'énigme du jour est choisie
par `src/lib/server/riddle-auto-select.ts` via `src/routes/api/riddles/auto-select-daily/+server.ts`
(appelable par l'admin ; `vercel.json` n'a aucun cron).

### Démineur : tournois et multijoueur

- **Tournois** — créés par le prof (`src/routes/(protected)/dashboard/teacher/minesweeper/tournaments/`),
  joués par l'élève (`src/routes/(protected)/dashboard/student/minesweeper/tournaments/`), API sous
  `src/routes/api/games/minesweeper/tournaments/`. Validation : `src/lib/server/validation/minesweeper-tournament.ts`
  (`podium_rewards` : 0 à 100 gidouilles par place). Ciblés par classe
  (`minesweeper_tournament_classes`, `can_participate_in_tournament`) ; score par
  `calculate_tournament_score` ; podium versé par `finalize_tournament`.
- **Multijoueur** — `src/routes/(protected)/games/minesweeper/multiplayer/+page.svelte`, store
  `src/lib/stores/multiplayer.svelte.ts`, API sous `src/routes/api/games/minesweeper/multiplayer/`,
  file d'attente `join_multiplayer_queue` (même difficulté, ±200 de classement, saison = mois).
  Réparé par `supabase/migrations/20261003211000_rpc_lot4_multijoueur_vues.sql` : il n'avait
  jamais pu démarrer. **Aucun lien de l'interface ne mène à cette page** (URL directe seulement).
- **Succès** du démineur : `minesweeper_achievements`, pages `stats/` et `achievements/` sous
  `src/routes/(protected)/dashboard/student/minesweeper/`.
- **Temps de référence** par cycle : `minesweeper_reference_times`, lus par
  `get_minesweeper_reference_time`, recalculés par `run_recalculate_minesweeper_ref_times`.

### Jeux présents mais pas au catalogue

- **Navadra** (combats de monstres, sorts) : routes `src/routes/(protected)/dashboard/navadra/`
  (hub, `combat/`, `spells/`), tables `game_players`, `game_spells`, `game_combats`,
  `game_monsters`…, stores `src/lib/stores/game/`. Retiré du catalogue (entrée commentée). Le hub
  renvoie vers `achievements`, `leaderboard`, `profile` et `tutorial`, **routes inexistantes**.
  Le trigger `trigger_award_gidouilles_on_combat_victory` (fonction `award_gidouilles_on_victory`,
  `xp_gained / 10 + 5`) crédite sans écrire `gidouilles_activity`.
- **Evoland** (moteur d'aventure, `src/lib/games/evoland/`) : page `src/routes/(public)/games/evoland/+page.svelte`,
  aucun lien vers elle.

### Économie

| Rôle                                  | Où                                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Récompense de partie (cap journalier) | `record_game_reward` (SQL)                                                                                                                                                                                   |
| Bonus hebdomadaires                   | `run_weekly_best_bonuses` → `award_weekly_best_bonuses` ; `run_weekly_rewards` (pg_cron, hors dépôt)                                                                                                         |
| Gestes du prof                        | `src/routes/api/teacher/rewards/` (`update-student`, `update-class`, `grant-specific-vip-card`, `use-vip-card`) ; écran `src/routes/(protected)/dashboard/teacher/gamification/rewards/GidouillesTab.svelte` |
| Journal des gains                     | `gidouilles_activity` → trigger `trigger_log_gidouilles_to_events` → `reward_events` ; `src/routes/api/rewards/journal/+server.ts`, `src/lib/server/reward-journal-balance.ts`                               |
| Succès (achievements)                 | `src/lib/server/achievements/service.ts`, `process_achievement_event` ; versement `src/lib/server/achievements/credit-gidouilles.ts`                                                                         |
| Cartes VIP : boutique, vente          | `src/routes/api/vip-cards/shop/+server.ts`, `purchase/`, `sell/` → `purchase_vip_card`, `sell_vip_card`                                                                                                      |
| Cartes VIP : tirages                  | `src/routes/api/rewards/draw-vip-cards/+server.ts` → `draw_multiple_vip_cards` ; prix `VIP_CARD_COST` dans `src/lib/utils/vip-cards.ts`                                                                      |
| Cartes VIP : activation par le prof   | `request_vip_card_activation`, `approve_vip_card`, `reject_vip_card`, `use_vip_card` ; onglet `ActivationRequestsTab.svelte`                                                                                 |
| Cartes VIP : admin                    | `src/routes/(protected)/dashboard/admin/vip-cards/+page.svelte`, `src/routes/api/admin/vip-cards/` ; Zod `src/lib/server/validation/vip-card-admin.ts`                                                       |
| Inventaire élève                      | `src/routes/(protected)/dashboard/student/inventory/+page.svelte` (`vip-cards/collection` y redirige)                                                                                                        |
| Marché                                | `src/routes/(protected)/dashboard/student/marketplace/`, `src/routes/api/marketplace/`, `src/lib/server/marketplace/`, `src/lib/stores/marketplace.svelte.ts`                                                |
| Marché (prof)                         | `src/routes/(protected)/dashboard/teacher/gamification/marketplace/+page.svelte`                                                                                                                             |

Les cartes possédées vivent dans `profiles.vip_cards` (jsonb), le catalogue dans
`vip_card_templates`, les probabilités de tirage dans `vip_card_config`, le journal dans
`vip_cards_activity`.

### Classements

| Classement                                        | Où                                                                                                                                                              | Bornage                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Classements unifiés** (2048, Mathémo, Démineur) | `src/routes/(protected)/games/leaderboards/+page.server.ts` → `game_leaderboard`, `minesweeper_scoped_leaderboard` ; constantes `src/lib/games/leaderboards.ts` | portée `class` / `grade` / `school`, toutes bornées par `my_school()` |
| Tournoi                                           | `src/routes/api/games/minesweeper/tournaments/[id]/standings/+server.ts`                                                                                        | classes du tournoi                                                    |
| Énigmes                                           | `src/routes/(protected)/dashboard/student/riddles/leaderboard/+page.server.ts` (vue `riddle_progress`)                                                          | voir Doutes                                                           |
| Succès                                            | `src/routes/api/achievements/leaderboard/+server.ts` → `get_achievement_leaderboard`                                                                            | —                                                                     |
| 2048 (ancien)                                     | `src/routes/api/games/2048/leaderboard/+server.ts`                                                                                                              | voir Doutes                                                           |

Les RPC de classement unifié sont dans `supabase/migrations/20260616230000_fix_leaderboard_union_order_by.sql`.

## Invariants

### Gidouilles : sources et plafonds

1. **Une gidouille par jour et par type de jeu.** `record_game_reward` (baseline) n'accepte que
   `minesweeper`, `riddle`, `2048`, `mathemo`, et verse `1` à la première victoire du jour **de ce
   type de jeu** (`daily_game_rewards.is_first_win_of_day`), `0` ensuite. ⚠️ L'ancienne doc disait
   le cap « partagé entre jeux » : c'est faux depuis l'ajout de 2048 et Mathémo (commentaire de la
   fonction : « 1 gidouille/day PER GAME TYPE »). Elle n'accepte que l'élève lui-même
   (`auth.uid() = p_student_id`, rôle `student`) et une récompense théorique entre 0 et 1000. La
   date et la semaine sont celles du fuseau et de la `week_config` de l'école
   (`calculate_week_boundaries`).
2. **La récompense théorique ne sert qu'au bonus hebdomadaire.** Chaque partie gagnée met à jour
   `weekly_best_rewards` (meilleure récompense théorique de la semaine, **par type de jeu**).
   Calcul par jeu :
   - **Démineur** (`complete_minesweeper_game`, baseline) : base 1 / 3 / 6 (débutant /
     intermédiaire / expert) × `GREATEST(0.7, 1.3 − 0.3 × temps / temps_de_référence)` ×
     (1 − pénalité d'indices), bornée à [0,30 ; 8,00]. Pénalités cumulées : `0,10 / 0,22 / 0,35`
     (indices payés en gidouilles) et `0,05 / 0,11 / 0,17` (indices par carte VIP), plafond 0,50.
     Temps de référence par défaut 180 / 600 / 1200 s si la table n'a rien.
   - **Énigmes** : `calculate_riddle_gidouilles` = difficulté × 3 / 2 / 1 (1ᵉʳ, 2ᵉ, 3ᵉ+ essai).
   - **2048** : `calculate2048TheoreticalReward`, interpolation entre `[1000, 0,5]` et
     `[50000, 8]` ; rien sous `REWARD_2048_MIN_SCORE` (1000).
   - **Mathémo** : `calculateMathemoTheoreticalReward`, longueur du mot × efficacité
     (1,5 au 1ᵉʳ essai → 0,8 au dernier), bornée par `REWARD_MATHEMO_MIN` / `REWARD_MATHEMO_MAX`
     (0,3 / 8).
3. **Bonus hebdomadaire « meilleur jeu »** : `award_weekly_best_bonuses` verse, pour chaque type
   de jeu joué, la meilleure récompense théorique de la semaine (`weekly_best_game_bonus:<jeu>`
   dans `gidouilles_activity`). `run_weekly_best_bonuses` le déclenche école par école le
   6ᵉ jour de la semaine scolaire, après 12 h (fuseau de l'école).
4. **Bonus hebdomadaire « sans avertissement »** : `run_weekly_rewards` verse **1** gidouille
   (`weekly_no_warning`, ligne dans `weekly_rewards`) à chaque membre actif d'une classe sans
   avertissement, retrait de gidouilles ou retrait de carte pour avertissement dans la semaine.
   Serveur seul depuis `supabase/migrations/20261003150000_vip_cartes_verrou.sql`. L'écran admin
   `src/routes/(protected)/dashboard/admin/cron/+page.svelte` peut le relancer. Les crons
   eux-mêmes (pg_cron) ne sont dans aucune migration.
5. **Gestes du prof** : ±1000 par geste (`src/lib/server/validation/rewards.ts`), via
   `update_student_gidouilles` et `update_class_gidouilles`. Podium de tournoi : 0 à 100 par place.
6. **Succès** : les gidouilles d'un succès-jalon (2048, Mathémo) passent par
   `update_student_gidouilles` à 5 arguments (`credit-gidouilles.ts`) — le bug « jamais crédités »
   de l'ancienne doc est corrigé (test `tests/integration/succes-gidouilles.test.ts`).
7. **Toute écriture de gidouilles passe par `gidouilles_activity`**, d'où le journal
   (`reward_events`) — sauf Navadra (voir plus haut) et les fonctions citées dans Doutes.

### Dépenses

- **Achat** (`purchase_vip_card`) : refuse si `is_purchasable = false`, si le solde est inférieur
  à `base_price`, ou si l'élève a déjà `max_owned_per_student` exemplaires (défaut 5, borné 1 à
  100 par contrainte).
- **Tirage** (`draw_multiple_vip_cards`) : par gidouilles ou par carte de tirage. Un élève paie
  `count × VIP_CARD_COST` (3), calculé **côté serveur** par la route ; la fonction garde un
  plancher de 1 par carte et réserve `p_force_rarity` / `p_min_rarity` au prof
  (`supabase/migrations/20260902096000_security_draw_vip_internal_guard.sql`). Le tirage **ne
  consulte pas** `max_owned_per_student`.
- **Probabilités** : la ligne active de `vip_card_config` (somme = 100 par contrainte ;
  60 / 25 / 12 / 3 proposés par défaut dans `src/lib/components/vip-cards/VipCardConfigEditor.svelte`).
- **Vente** (`sell_vip_card`) : au `sell_price` du modèle (proratisé pour un consommable
  entamé) ; refusée si la carte est utilisée, en demande d'activation, en délai, ou engagée sur
  le marché.
- **Pouvoirs de jeu** : indice démineur 5 (`use_hint`), détecteur 10 (`use_detector`) — une
  carte VIP adaptée est consommée d'abord ; `use_minesweeper_undo` exige une carte (pas de
  repli en gidouilles). 2048 (`use_2048_power`) : 3 à 40 selon le pouvoir ; Mathémo
  (`use_mathemo_power`) : 5 à 15.
- **Cartes réservées au serveur** : personne ne modifie directement `profiles.vip_cards` (garde
  `guard_profile_reserved_fields`, migration `20261003150000_vip_cartes_verrou.sql`) ; seules les
  fonctions SECURITY DEFINER le font.

### Marché

- Config par école ou par classe (`marketplace_config`) : `max_listings_per_student` 5,
  `max_trades_per_day` 10, `listing_duration_days` 7 par défaut (repli
  `DEFAULT_MAX_TRADES_PER_DAY` dans `src/lib/server/marketplace/helpers.ts`, garde SQL
  `check_daily_trade_limit`).
- Annonces → propositions (`marketplace_proposals`) → `accept_proposal_atomic` ; échange direct
  entre amis → `marketplace_trades` → confirmation → `execute_trade`. Cartes engagées verrouillées
  (`marketplace_locked_cards`, `lock_cards` / `unlock_cards`, serveur seul).
- **`execute_trade` exige les quatre drapeaux** (validation et confirmation des deux côtés) ;
  chaque élève n'écrit que **sa** moitié de l'offre. Faille du 2026-10-04 (vol de cartes et de
  gidouilles) fermée par `supabase/migrations/20261004190000_echanges_garde_base.sql`.

### L'école est la frontière sociale ([ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md))

Tout ce qui met deux élèves en relation est borné par `my_school()` / `same_school()` :

- **marché** : annonces filtrées par `school_id` (`src/routes/api/marketplace/listings/+server.ts`) ;
  échange direct seulement entre **amis de la même école** (garde en base, migration
  `20261004190000`) ; participants résolus par `src/lib/server/marketplace/participants.ts` ;
- **classements unifiés** : les trois portées passent par `my_school()` ;
- **tournois** : bornés aux classes ciblées.

⚠️ Exceptions constatées, voir Doutes : file multijoueur, classements énigmes et 2048 ancien.

## Comment étendre

- **Nouveau jeu qui rapporte** : ajouter son type à la liste blanche de `record_game_reward`
  (migration), calculer la récompense théorique côté serveur (modèle :
  `src/lib/server/games/reward-2048.ts` + son test), appeler `record_game_reward` depuis la route
  de score, l'ajouter au libellé de `award_weekly_best_bonuses`. Pour le classement : la liste
  blanche de `game_leaderboard` **et** `GAME_LEADERBOARD_GAMES` (`src/lib/games/leaderboards.ts`).
- **Nouvelle carte** : par l'admin (`vip_card_templates`), pas par migration — la prod fait foi.
- **Tout ce qui relie deux élèves** : borner par `same_school()`, avec un test d'intégration
  qui prouve qu'un élève d'une autre école est refusé.
- Toute écriture de gidouilles : `.select()` et vérifier les lignes (la RLS échoue en silence),
  et écrire `gidouilles_activity`.

## Tests

- Unitaires : `src/lib/server/games/__tests__/reward-2048.test.ts`,
  `src/lib/server/games/__tests__/reward-mathemo.test.ts`,
  `src/routes/(public)/games/2048/__tests__/game-logic.test.ts`,
  `src/routes/(public)/games/mathemo/__tests__/dictionary-words.test.ts`,
  `src/lib/stores/__tests__/minesweeper.svelte.test.ts`,
  `src/routes/api/games/minesweeper/__tests__/minesweeper-authorization.test.ts`,
  `src/lib/server/__tests__/vip-card-purchase.test.ts`,
  `src/lib/server/validation/__tests__/draw-vip-cards.test.ts`,
  `src/lib/server/marketplace/__tests__/security.test.ts`,
  `src/lib/utils/__tests__/riddle-validator.test.ts`, `src/lib/games/evoland/logic/__tests__/`.
- Intégration (Supabase local) : `tests/integration/game-leaderboards.test.ts`,
  `tests/integration/minesweeper-rpc.test.ts`, `tests/integration/rpc-lot4-hygiene.test.ts`,
  `tests/integration/succes-gidouilles.test.ts`, `tests/integration/vip-cartes-verrou.test.ts`,
  `tests/integration/vip-card-rarity-distribution.test.ts`,
  `tests/integration/draw-vip-cards-race-conditions.test.ts`,
  `tests/integration/marketplace-trades-garde.test.ts`, `tests/integration/marche-verrou.test.ts`,
  `tests/integration/participants-du-marche.test.ts`.

## Décisions

- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) — école = frontière sociale.
- Q131 à Q134 (2026-10-03) : cartes, verrous et bonus hebdomadaire réservés au serveur
  (en-tête de `20261003150000_vip_cartes_verrou.sql`).
- 2026-10-04 : garde des échanges en base (en-tête de `20261004190000_echanges_garde_base.sql`).
- Q160 : réparer le multijoueur (`20261003211000_rpc_lot4_multijoueur_vues.sql`).

## Doutes (constatés le 2026-10-10, non corrigés)

- ✅ **`gidouilles_history` (corrigé le 2026-10-10, migration `20261014120000_gidouilles_history_e19`)** :
  `finalize_tournament`, `redistribute_tournament_rewards`, `complete_multiplayer_match` et
  `abandon_multiplayer_match` écrivent dans `gidouilles_activity` ; les deux matchs créditent aussi
  le solde (ils n'écrivaient qu'un journal aux colonnes inexistantes) et ne plantent plus sans
  statistiques de saison (`ROW(1500)` perdait le champ `rank`). Mesuré en prod : aucun tournoi
  finalisé depuis le renommage, aucun match joué — personne lésé. Test :
  `tests/integration/gidouilles-tournois-multijoueur.test.ts`. **Restent** `process_weekly_rewards` et
  `purchase_shop_item`, sans aucun appelant (ni code, ni cron) : suppression à décider.
- **Lecture seule** (2026-10-10) : `run_weekly_rewards` et `award_weekly_best_bonuses` sautent les
  élèves sans consentement (`has_full_access`) ; le prof peut toujours en donner à la main.
- **File multijoueur non bornée par l'école** : `join_multiplayer_queue` apparie sur difficulté
  et classement seulement — contraire à l'ADR 0002 (page sans lien, donc peu exposée).
- **Classement des énigmes** : la route lit la vue `riddle_progress` sans filtre d'école.
- **`src/routes/api/games/2048/leaderboard/+server.ts`** : top global sur `game_2048_scores`
  (policy `USING (true)` pour tout authentifié), sans appelant dans `src/`.
- **Sans appelant applicatif** : `process_weekly_rewards`, `award_weekly_reward`,
  `purchase_shop_item`, `calculate_daily_challenge_gidouilles` (défis quotidiens supprimés).
- **Navadra** : routes vivantes mais hors catalogue, quatre liens morts dans le hub, gains de combat
  hors journal. **Evoland** : page sans lien.
- `scripts/simulate-vip-economy.ts` simule l'ancienne économie (cap partagé) : périmé.

---

Vérifié contre le code le 2026-10-10.
