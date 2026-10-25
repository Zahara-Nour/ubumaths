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
  - 'src/routes/(protected)/dev/cartes/**'
  - 'src/routes/api/{vip-cards,games,marketplace,riddles,rewards,achievements}/**'
  - 'src/routes/api/cron/riddle-of-the-day/**'
  - 'src/routes/api/teacher/rewards/**'
  - 'src/routes/api/admin/vip-cards/**'
  - 'src/routes/api/student/{bonus-history,gidouilles-activity,rewards}/**'
  - 'src/routes/api/students/*/vip-cards/**'
  - 'src/routes/api/classes/*/gidouilles/**'
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

Le compagnon virtuel (Palotins) a sa propre doc : [buddy-palotins.md](buddy-palotins.md). Le
tableau des Palotins du prof (`teacher/gamification/buddies`) affiche la Constance Royale en
semaines tenues d'affilée, telle que l'élève la voit (`displayedConstance`). L'onglet voisin
« Mathoux » (`teacher/gamification/mathoux`) montre les Mathoux des élèves par classe : voir
[mathoux.md § Vue du professeur](mathoux.md#vue-du-professeur).
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
(création, énigme du jour, validation des réponses libres, stats). L'énigme du jour, quand le prof n'en
a pas programmé, est choisie par `src/lib/server/riddle-auto-select.ts` (énigme publiée, absente
des 30 derniers jours, difficulté tournante) via `src/routes/api/cron/riddle-of-the-day/+server.ts` :
cron Vercel chaque jour à 00:05 UTC, ou bouton admin. Elle écrit avec le client service (la
policy d'INSERT de `riddle_of_the_day` exige `selected_by = auth.uid()`) et ne remplace jamais
une énigme choisie à la main. `api/riddles/auto-select-daily` ne garde que le GET de statut.

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

Navadra et Evoland sont **en pause de développement** (décision de David, 2026-10-13) : gardés
dans le code, hors catalogue, sans travaux tant qu'ils ne reprennent pas.

- **Navadra** (combats de monstres, sorts) : routes `src/routes/(protected)/dashboard/navadra/`
  (hub, `combat/`, `spells/`), tables `game_players`, `game_spells`, `game_combats`,
  `game_monsters`…, stores `src/lib/stores/game/`. Retiré du catalogue (entrée commentée). Le hub
  ne mène qu'à `combat/` et `spells/` : ses quatre liens vers des routes inexistantes
  (`achievements`, `leaderboard`, `profile`, `tutorial`) ont été retirés le 2026-10-13.
  Le trigger `trigger_award_gidouilles_on_combat_victory` (fonction `award_gidouilles_on_victory`,
  `xp_gained / 10 + 5`) crédite sans écrire `gidouilles_activity`. Les défis du combat
  (`game_challenges`, écrits par le prof seul) passent par `src/lib/utils/game/challenge-variables.ts` :
  une expression n'y est évaluée que si elle est purement arithmétique (T5, 2026-10-13), sinon
  `NaN`.
- **Evoland** (moteur d'aventure, `src/lib/games/evoland/`) : page `src/routes/(public)/games/evoland/+page.svelte`,
  aucun lien vers elle ; exclue du plan du site (`src/lib/seo/sitemap-pages.ts`).

### Économie

| Rôle                                  | Où                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Récompense de partie (cap journalier) | `record_game_reward` (SQL)                                                                                                                                                                                                                                                                                                   |
| Bonus hebdomadaires                   | `run_weekly_best_bonuses` → `award_weekly_best_bonuses` ; `run_weekly_rewards` (pg_cron, hors dépôt)                                                                                                                                                                                                                         |
| Gestes du prof                        | `src/routes/api/teacher/rewards/` (`update-student`, `update-class`, `grant-specific-vip-card`, `use-vip-card`) ; écran `src/routes/(protected)/dashboard/teacher/gamification/rewards/GidouillesTab.svelte`                                                                                                                 |
| Journal des gains                     | `gidouilles_activity` → trigger `trigger_log_gidouilles_to_events` → `reward_events` ; `src/routes/api/rewards/journal/+server.ts`, `src/lib/server/reward-journal-balance.ts` ; lu par `rewardJournalStore` (fenêtre `StudentJournalModal` de l'accueil élève, page prof `/dashboard/teacher/students/[studentId]/journal`) |
| Succès (achievements)                 | `src/lib/server/achievements/service.ts`, `process_achievement_event` ; versement `src/lib/server/achievements/credit-gidouilles.ts`                                                                                                                                                                                         |
| Cartes VIP : boutique, vente          | `src/routes/api/vip-cards/shop/+server.ts`, `purchase/`, `sell/` → `purchase_vip_card`, `sell_vip_card`                                                                                                                                                                                                                      |
| Cartes VIP : tirages                  | `src/routes/api/rewards/draw-vip-cards/+server.ts` → `draw_multiple_vip_cards` ; prix `VIP_CARD_COST` dans `src/lib/utils/vip-cards.ts`                                                                                                                                                                                      |
| Cartes VIP : activation par le prof   | `request_vip_card_activation`, `approve_vip_card`, `reject_vip_card`, `use_vip_card` ; onglet `ActivationRequestsTab.svelte`                                                                                                                                                                                                 |
| Cartes VIP : admin                    | `src/routes/(protected)/dashboard/admin/vip-cards/+page.svelte`, `src/routes/api/admin/vip-cards/` ; Zod `src/lib/server/validation/vip-card-admin.ts`                                                                                                                                                                       |
| Inventaire élève                      | `src/routes/(protected)/dashboard/student/inventory/+page.svelte` (`vip-cards/collection` y redirige)                                                                                                                                                                                                                        |
| Marché                                | `src/routes/(protected)/dashboard/student/marketplace/`, `src/routes/api/marketplace/`, `src/lib/server/marketplace/`, `src/lib/stores/marketplace.svelte.ts`                                                                                                                                                                |
| Marché (prof)                         | `src/routes/(protected)/dashboard/teacher/gamification/marketplace/+page.svelte`                                                                                                                                                                                                                                             |

Les cartes possédées vivent dans `profiles.vip_cards` (jsonb), le catalogue dans
`vip_card_templates`, les probabilités de tirage dans `vip_card_config`, le journal dans
`vip_cards_activity`.

### Classements

| Classement                                        | Où                                                                                                                                                              | Bornage                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Classements unifiés** (2048, Mathémo, Démineur) | `src/routes/(protected)/games/leaderboards/+page.server.ts` → `game_leaderboard`, `minesweeper_scoped_leaderboard` ; constantes `src/lib/games/leaderboards.ts` | portée `class` / `grade` / `school`, toutes bornées par `my_school()` |
| Tournoi                                           | `src/routes/api/games/minesweeper/tournaments/[id]/standings/+server.ts`                                                                                        | classes du tournoi                                                    |
| Énigmes                                           | `src/routes/(protected)/dashboard/student/riddles/leaderboard/+page.server.ts` (`riddle_school_leaderboard`)                                                    | voir Doutes                                                           |
| Succès                                            | `src/routes/api/achievements/leaderboard/+server.ts` → `get_achievement_leaderboard`                                                                            | —                                                                     |

Les scores qui nourrissent ces classements s'écrivent **par le serveur** : `upsert_2048_score`
(lot 3, Q141) et `upsert_mathemo_score` (client service depuis `20261016100400` ; garde : client
service seul : EXECUTE retiré à `authenticated` par `20261016100700` — la fonction
ajoute `p_score` au total sans borne, seule la route le calcule et le borne). Le score reste
déclaré par le navigateur, puisque le jeu tourne côté client.

Les RPC de classement unifié sont dans `supabase/migrations/20260616230000_fix_leaderboard_union_order_by.sql`.

## Invariants

### Gidouilles : sources et plafonds

1. **Une gidouille par jour et par type de jeu.** `record_game_reward` (baseline) n'accepte que
   `minesweeper`, `riddle`, `2048`, `mathemo`, et verse `1` à la première victoire du jour **de ce
   type de jeu** (`daily_game_rewards.is_first_win_of_day`), `0` ensuite. ⚠️ L'ancienne doc disait
   le cap « partagé entre jeux » : c'est faux depuis l'ajout de 2048 et Mathémo (commentaire de la
   fonction : « 1 gidouille/day PER GAME TYPE »). Elle n'accepte que le **serveur** (client
   service : routes 2048 et Mathémo ; appels imbriqués par `complete_minesweeper_game` et
   `submit_riddle_attempt`, SECURITY DEFINER), refuse l'appel sans identité (`20261016100200`), exige le rôle `student` et une
   récompense théorique entre 0 et 1000. L'EXECUTE est retiré à `authenticated`
   (`20261016100700`) : un élève ne s'attribue plus la gidouille du jour de chaque type sans
   jouer. La
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
7. **Le travail mathématique** (décisions de David du 2026-10-24) : jusque-là, il ne rapportait
   aucune gidouille (seulement l'XP du Palotin). Deux sources :
   - **étapes de la Chatterie** : naissance +3, matou +5, grand matou +10, étoile +5, une fois
     chacune, **20 au plus sur 24 heures glissantes** (les réussites peuvent être forgées par
     l'élève : le plafond rend l'abus lent et visible), libellés « Chatterie : … », par
     `pay_mathou_milestones` (voir [mathoux.md § Mémoire](mathoux.md)) ;
   - **révision du jour** : +2 quand la séance de révision du jour est terminée (règle du forfait :
     10 cartes du jour, ou paquet vidé après 3), au plus une fois par jour, **avec ou sans
     Palotin**, plafond d'XP atteint ou non (`rewardFinishedReviewSession`,
     `src/lib/server/srs/review-session-reward.ts`) ; élèves seulement ; `creditStudentGidouilles`
     (`credit-gidouilles.ts`), libellé « Révision du jour terminée », rendues par
     `POST /api/srs/review/submit` sous `review_gidouilles`. La séance réclamée n'est relâchée que
     si rien n'a été donné (ni XP ni gidouilles).
8. **Toute écriture de gidouilles passe par `gidouilles_activity`**, d'où le journal
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
- **Décorations de panse des Mathoux** (lot B des accessoires, 2026-10-24) : six, de 10 à 40,
  achetées une fois dans la Chatterie par `buy_mathou_decoration` (solde vérifié, débit, ligne
  « Chatterie : cocarde achetée » au journal, sous verrou) ; consentement exigé comme pour la
  boutique VIP. L'onglet Boutique du Marché les montre (`MathouDecorationsShowcase`) sans les
  vendre. Voir [mathoux.md § Décorations de panse](mathoux.md#décorations-de-panse).
- **Colliers des Mathoux** (lot C, 2026-10-25) : quatre, de 10 à 40, achetés de la même façon
  (même fonction, même journal : « Chatterie : collier de cuir acheté ») et montrés dans la même
  vitrine. Voir [mathoux.md § Colliers](mathoux.md#colliers).
- **Lunettes et chapeaux des Mathoux** (lot D, 2026-10-26) : cinq lunettes et cinq chapeaux, de 10
  à 40, achetés de la même façon (« Chatterie : monocle acheté ») et montrés dans la même vitrine.
  Voir [mathoux.md § Lunettes et chapeaux](mathoux.md#lunettes-et-chapeaux).
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
- **Validation dans le navigateur** : le store (`src/lib/stores/marketplace.svelte.ts`) et
  `MarketplaceSettings.svelte` valident avec `src/lib/validation/marketplace.ts` et affichent
  `issues[0].message` dans une notification. Zod y parle anglais (`src/lib/zod-locale.ts` ne
  règle que le serveur) : chaque schéma porte ses messages, **messages de type compris** (champ
  vidé → `NaN`). Garde : `src/lib/validation/__tests__/marketplace-messages.test.ts`.

### L'école est la frontière sociale ([ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md))

Tout ce qui met deux élèves en relation est borné par `my_school()` / `same_school()` :

- **marché** : annonces filtrées par `school_id` (`src/routes/api/marketplace/listings/+server.ts`) ;
  échange direct seulement entre **amis de la même école** (garde en base, migration
  `20261004190000`) ; participants résolus par `src/lib/server/marketplace/participants.ts` ;
- **classements unifiés** : les trois portées passent par `my_school()` ;
- **tournois** : bornés aux classes ciblées.
- **parties de démineur** : privées depuis le 2026-10-10 (D16) — chacun ne lit que les siennes ; le
  rang et le tableau de la page de stats viennent de `minesweeper_scoped_leaderboard('school')` (borné à l'école, prénom seul).
  Auparavant, `anon` et tout compte lisaient toutes les parties terminées.

- **scores 2048** : privés depuis le 2026-10-10 (D18) — chacun ne lit que le sien ; le classement
  passe par `game_leaderboard` ; la route `/api/games/2048/leaderboard` (top global, sans appelant)
  est supprimée ;
- **démineur multijoueur** : `join_multiplayer_queue` n'apparie que deux élèves de la même école
  (`same_school`, D18).

⚠️ Classement des énigmes (`riddle_progress`, vue invoker) : pas de fuite — un élève ne voit que les
profils de ses camarades/amis et ses propres tentatives —, mais le classement est **faux** (les
autres à 0). Correction décidée par David (2026-10-11) : `riddle_school_leaderboard(p_limit)`,
SECURITY DEFINER bornée à `my_school()`, hors comptes de test, ne rend que prénom, gidouilles
des énigmes, énigmes réussies, rang et `is_me` (migration `20261015090800`, test
`tests/integration/classement-enigmes-ecole.test.ts`). La page du classement la lit ; seuls les
élèves qui ont tenté une énigme apparaissent, sans nom ni photo. La vue `riddle_progress` n'a
plus de lecteur : fermée à anon et `authenticated` (migration `20261016090200`), pas supprimée.

⚠️ **Tentatives d'énigme écrites par le serveur seulement** (audit de #1077, décision de David du
2026-10-11) : la justesse est calculée par `api/riddles/[id]/submit` (`validateRiddleAnswer`), qui
appelle `submit_riddle_attempt` par le client service — la RPC prend `p_is_correct` de son
appelant, un élève qui l'appelait lui-même pouvait se déclarer juste. La policy d'insertion
directe de l'élève est supprimée (`20261016090200`) ; EXECUTE est retiré à `authenticated`
(`20261016100700`, après le `deploy:prod` de v0.25.0). Test :
`tests/integration/enigmes-tentatives-par-le-serveur.test.ts`.

⚠️ **La page élève ne reçoit ni la réponse attendue ni la correction** (constat du 2026-10-12) :
les pages `dashboard/student/riddles/**` passent l'énigme par `toStudentRiddle`
(`src/lib/types/riddle.ts`), qui ne garde de `answer` que le type de saisie et, pour un QCM, les
choix. `RiddleCard` ne corrige donc plus dans le navigateur : le verdict vient de la route de
soumission. Si l'envoi échoue, `onSubmit` rend `false` et la carte revient à la saisie. Test : `src/routes/(protected)/dashboard/student/riddles/__tests__/`.

⚠️ **Réponse attendue et correction : `riddle_solutions`, plus `riddles`** (étape B, 2026-10-12).
`riddles.answer` / `riddles.correction` n'existent plus (étape C, `20261016100800`) : les requêtes sur
`riddles` nomment leurs colonnes (`RIDDLE_COLUMNS`, `src/lib/types/riddle.ts` ; jamais `*` ni
`riddles(*)`), et `toDbRiddle(ligne, solution)` assemble l'énigme. Le module
`src/lib/server/riddle-solutions.ts` lit les solutions d'une liste d'énigmes
(`fetchRiddleSolutions`) et en écrit une (`saveRiddleSolution`, upsert tenu pour échoué si
`.select()` ne rend aucune ligne). Côté prof, le client de la session suffit (RLS : auteur et
admin) ; la création insère l'énigme puis sa solution, et **supprime l'énigme** si la solution
n'est pas écrite ; l'édition vérifie les lignes rendues des deux écritures. Côté élève, qui ne lit
pas `riddle_solutions`, les pages `dashboard/student/riddles/+page.server.ts` et `[id]/` et la
route de soumission lisent l'énigme avec le client de l'élève (sa RLS décide de l'accès), puis la
solution de **ces seules énigmes** par le client service (`ALLOWED_SERVICE_ROLE_PATHS`) : la
soumission juge avec elle, les pages n'en gardent que ce que `toStudentRiddle` laisse. Tests :
`src/routes/(protected)/dashboard/teacher/contenu/enigmes/__tests__/solutions-ecriture.test.ts`,
`src/routes/api/riddles/__tests__/api-routes.test.ts`.

**Réponse attendue validée avant toute écriture** (2026-10-12). Création et édition passent par
`riddleFormSchema` puis `parseRiddleAnswerField` (`src/lib/server/validation/riddles.ts`) : nombre
fini, texte ou expression non vides, QCM d'au moins deux choix dont la bonne réponse est l'un
des indices. Une réponse refusée rend `fail(400, { message })` et rien n'est écrit. C'est la
valeur **validée** qui est enregistrée : clés inconnues retirées, indices de QCM en nombres
(l'éditeur ne relit que des nombres). Les pages envoient le formulaire par
`src/lib/components/riddles/submit-riddle-form.ts`, qui le construit (`answer` à `null` pour une
validation à la main, jamais la chaîne `"undefined"`) et lit la réponse de l'action avec
`deserialize` (format SvelteKit `{ type, data }` : lu brut, un enregistrement réussi
s'affichait en erreur).

## Comment étendre

- **Nouveau jeu qui rapporte** : ajouter son type à la liste blanche de `record_game_reward`
  (migration), calculer la récompense théorique côté serveur (modèle :
  `src/lib/server/games/reward-2048.ts` + son test), appeler `record_game_reward` depuis la route
  de score **avec le client service**, l'ajouter au libellé de `award_weekly_best_bonuses`. Pour le classement : la liste
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
  `abandon_multiplayer_match` ne plantent plus (tournois : journal dans `gidouilles_activity` ;
  matchs : `ROW(1500)` perdait le champ `rank`, l'abandon en compte à rebours violait
  `started_must_have_timestamp`). **Le multijoueur ne rapporte AUCUNE gidouille** (décision de
  David, 2026-10-10) : sans anti-triche (grille non comparée à la graine, pas de plafond), deux
  complices farmaient sans limite. À rouvrir avec un anti-triche. Mesuré en prod : aucun tournoi
  finalisé depuis le renommage, aucun match joué — personne lésé. Test :
  `tests/integration/gidouilles-tournois-multijoueur.test.ts`. **Restent** `process_weekly_rewards` et
  `purchase_shop_item`, sans aucun appelant (ni code, ni cron) : suppression à décider.
- **Lecture seule** (2026-10-10) : `run_weekly_rewards` et `award_weekly_best_bonuses` sautent les
  élèves sans consentement (`has_full_access`) ; le prof peut toujours en donner à la main.
- ✅ File multijoueur et scores 2048 : bornés / privés le 2026-10-10 (D18, voir « L'école est la
  frontière sociale »).
- **Classement des énigmes** : vue `riddle_progress` lue avec les droits de l'élève — pas de fuite,
  mais classement faux (les autres à 0) ; remplacée par `riddle_school_leaderboard` (voir plus haut).
- ✅ **Fonctions sans appelant supprimées** : `process_weekly_rewards`, `purchase_shop_item` et
  `get_2048_user_rank` le 2026-10-11 (migration `20261015090700`) ; `award_weekly_reward` et
  `calculate_daily_challenge_gidouilles` (défis quotidiens supprimés) le 2026-10-13 (migration
  `20261016101100`, M13). Les bonus hebdomadaires passent par `run_weekly_rewards` et
  `run_weekly_best_bonuses`.
- ✅ **Page sans entrée supprimée** (2026-10-12, décision de David) : `/dashboard/student/journal`,
  qu'aucun lien n'a jamais atteint, doublait la fenêtre `StudentJournalModal` de l'accueil élève
  (même `rewardJournalStore`, mêmes `RewardEventCard`). Ses filtres par type
  (`RewardJournalFilters`) restent sur la page prof du journal d'un élève.
- **Données de jeu privées** (2026-10-11, migration `20261015090600`) : `mathemo_scores`,
  `minesweeper_student_achievements`, `minesweeper_player_stats`, `marketplace_listing_views` —
  chacun ne lit que les siennes (avant : `using (true)` pour tout compte, toutes écoles).
- **Navadra** (en pause) : routes vivantes mais hors catalogue, gains de combat hors journal
  (à reprendre avec la réécriture). ✅ Les quatre liens morts du hub sont retirés (2026-10-13).
  **Evoland** (en pause) : page sans lien, hors plan du site.

---

Vérifié contre le code le 2026-10-10.
