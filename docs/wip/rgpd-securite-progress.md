# RGPD et sécurité — progression

> Chantier ouvert le 2026-10-10. Constats : [rgpd-securite-constats.md](rgpd-securite-constats.md).
> Worktree `../ubumaths-wt-rgpd`, branche `fix/rgpd-suppression-compte`.

## Ordre fixé par David

1. A1 — suppression de compte (art. 17)
2. B4 — élévation admin qui survit au logout
3. A2 — mode lecture seule contournable (garde côté base à proposer)
4. E19 — six fonctions qui écrivent dans `gidouilles_history`
5. A3 — règle de consentement : question produit, David tranche
6. Le reste (B5-B8, C, D, E20) : ordre à proposer ; C point par point (code ou documents)

## A1 — suppression de compte

### Mesures en prod (MCP lecture seule, 2026-10-10)

- `delete_user_account` en prod = celle du baseline. Tables absentes : `shop_purchase_history`,
  `item_usage_log`, `student_item_inventory`, `message_template_audit`, `message_template_drafts` ;
  colonne absente : `notifications.user_id`.
- Colonnes `NOT NULL` que la fonction passe à NULL : `gidouilles_activity.student_id`,
  `bonus_history.student_id`, `vip_cards_activity.student_id` (élève) ;
  `exercises.created_by`, `exercise_assignments.assigned_by`, `message_template_versions.modified_by`
  (prof).
- **Second verrou, absent des constats** : clés étrangères vers `profiles` sans `ON DELETE`
  (`NO ACTION`) → `auth.admin.deleteUser` échouerait même la fonction réparée.
  Côté élève : `exercise_completions.student_id`, `exercise_assignments.student_id`,
  `student_achievements.unlocked_by`. Côté prof : `exercise_assignments.assigned_by`,
  `exercise_share_tokens.created_by`, `user_restrictions.restricted_by`,
  `template_audit_log.performed_by`, `migration_edits.editor_id`, `message_templates.reviewed_by`,
  `message_template_versions.modified_by`, `worksheet_error_reports.reviewed_by`,
  `class_journal_share_tokens.created_by`, `game_challenges.created_by`, `game_monsters.*`.
- `account_deletion_audit` vide : **aucune suppression n'a jamais été tentée en prod**.
- `exercise_completions` / `exercise_assignments` : 0 ligne d'élève en prod aujourd'hui.
- Le local reproduit la prod (mêmes tables absentes, mêmes `NOT NULL`).

### État

- [x] Test rouge : `tests/integration/suppression-compte-art17.test.ts`
- [x] Question d'accès posée à David
- [x] Migration
- [x] security-auditor (2 bloquants corrigés, voir plus bas)
- [x] Docs : `docs/systeme/conformite/` (`auth.md` non concerné ; `base-de-donnees.md` après `db:types`)

### security-auditor (2026-10-10)

Corrigé dans la même PR (chaque cas rouge avec l'ancienne fonction, vert avec la nouvelle, 8/8) :

- **B1** `template_audit_log.performed_by` (sans ON DELETE) rempli par un élève qui met un modèle en
  favori → suppression impossible. 0 ligne en prod aujourd'hui.
- **I4** `worksheet_error_reports.reviewed_by` : un élève peut y écrire l'identifiant d'un AUTRE
  élève sur son propre signalement → bloquait la suppression de l'autre. 0 en prod.
  ⚠️ Le droit de colonne lui-même reste ouvert → à fermer (section D).
- **B2** atomicité : garde générique en fin de fonction (toute FK NO ACTION restante → exception →
  annulation complète).
- **I1** fichiers : chemins exacts rendus par la fonction (l'ancien `list(userId)` ne trouvait rien).
- **M1** une faute de frappe dans la phrase ne consomme plus la limite de 24 h. **M2** commentaires.

Reste à trancher (ajouté au lot C) :

- **I2** `audit_logs.new_values` garde e-mail/nom/prénom du profil (sans FK) ; `error_logs.request_body`,
  `message_moderation_logs.reason`, `game_combats.player_snapshots` gardent du texte ou des uuid.
- **I3** `account_deletion_audit` : hash d'e-mail sans sel (retrouvable par dictionnaire), IP,
  navigateur, sans durée de conservation.
- Limite de débit en mémoire, par instance (contournable) — déjà au constat B8.

### Décisions de David (2026-10-10, question d'accès)

1. Économie (gidouilles, bonus, cartes VIP) : **tout supprimer** (cascade), plus d'anonymisation.
2. Messages de l'élève : **supprimés pour tous**, texte et aperçu compris (les signalements de ces
   messages partent avec eux, `message_reports` en cascade).
3. **Élèves seulement** : prof/admin refusés (403 route, refus dans la fonction, bouton masqué).

### Fait

- Migration `20261014100000_suppression_compte_art17.sql` ; test d'intégration rouge sans elle
  (`23502` élève actif, `42P01` élève vierge), vert avec (5/5). Tests voisins verts (655).
- Route : 403 prof/admin avant limite de débit et audit (test unitaire rouge → vert).
- Docs : `rgpd.md` §5.2 et §7.2 réécrits, README conformité §2, AIPD.

## A2 — mesures en prod (2026-10-10)

- 11 élèves en lecture seule (consentement requis, ni accordé ni en grâce), 70 non soumis, 0 consenti.
- Depuis la fin de leur grâce : 0 message, 0 annonce du marché, 0 message de marché, 0 partie de
  démineur → **contournement non exploité à ce jour** (reste à prouver par un test qu'il est possible).
- **Mais 56 versements de gidouilles `weekly_no_warning`** (tâche hebdomadaire, sans auteur) à ces
  élèves, alors que `earn_rewards` est une action fermée en lecture seule → question à David.

### Livré

- **A1** : #1034 mergée, migration `20261014100000` en prod le 2026-10-10 (vérifié : nouvelle
  fonction, EXECUTE `service_role` seul ; aucun des 81 élèves bloqué par une référence non traitée ;
  `db:types` sans changement).

## B4 — élévation admin (fait, #1035 mergée)

- Logout : révoque + efface le cookie. `requireAdmin` : 401 sans session. Le cookie porte
  `elevatedBy` : l'élévation ne vaut que pour la session qui l'a obtenue (security-auditor : un élève
  connecté ensuite sur le même navigateur la récupérait). Cookies antérieurs refusés (se ré-élever).

## A2 — mode lecture seule (branche `fix/rgpd-lecture-seule`)

Décisions de David (2026-10-10) :

1. Garde **dans la base**, triggers sur l'auteur (`has_full_access` = copie de `hasValidConsent`).
2. Récompenses : seules les **tâches automatiques** sautent ces élèves (filtre dans la tâche, avec
   E19) ; le prof peut toujours en donner à la main. Les 11 élèves concernés sont tous archivés
   (6e et 2nde de l'an dernier, grâce finie le 30/06, aucune demande envoyée). Les 56 versements
   (03/07 → 21/08) faisaient partie de 146 versements à 73 élèves archivés, arrêtés depuis le 21/08.
3. « **Retirer oui, agir non** » pour ce qui a été commencé avant.
4. Annonces d'un auteur en lecture seule **masquées** du marché.

Fait : migration `20261014110000_lecture_seule_garde_base` (23 triggers, file du démineur filtrée),
test 24/24 (9 cas rouges avec la 1re version, 7 contournements prouvés avant toute migration).

Reste : **2e PR** après `db:migrate` + `db:types` — la route `api/marketplace/listings` GET filtre
`marketplace_hidden_creators()`.

## Nouveau constat (hors A2, à prouver)

- **Suppression de message par modération probablement cassée** : `api/moderation/messages/[id]`
  fait `update({ deleted_at })` avec le client de l'appelant ; la policy SELECT de `messages` exige
  `deleted_at IS NULL` → Postgres refuse la nouvelle ligne (« new row violates row-level security
  policy »). Reproduit en local pour l'élève ET pour le prof (via l'API PostgREST). À mesurer en prod
  (logs) et à corriger.
- Suite d'intégration complète en local : 18 échecs **identiques avec et sans** la migration A2
  (arbre des notions, presques-évaluations, succès du démineur) → état de la base locale partagée ;
  la CI tranchera.

## État au 2026-10-10 (soir)

- **A2 mergée (#1042), PAS encore en prod** : `db push` refuse (`DbPushMissingRemoteError`) à cause
  de `20261013120000_tags_modeles_points` (session tags, mergée, non migrée), datée avant ma
  migration A1 déjà en prod — mes horodatages `20261014…` étaient dans le futur. **Décision de
  David : attendre que la session tags migre la sienne**, puis pousser A2, puis E19.
- Après `db:migrate` de A2 : `db:types`, puis 2e PR — `api/marketplace/listings` GET filtre
  `marketplace_hidden_creators(school_id)` (client service).

## E19 — récompenses de tournoi et de multijoueur (branche `fix/gidouilles-history-e19`)

- Mesuré en prod : aucun tournoi finalisé depuis le renommage (3 le 02/01), aucun match multijoueur
  jamais joué → personne lésé.
- Tournois : journal dans `gidouilles_activity` (solde déjà crédité).
- Multijoueur : réparé (table, `ROW(1500)`, abandon en compte à rebours) **sans aucune récompense**
  — décision de David après security-auditor (farm illimité entre complices, grille non comparée à
  la graine). À rouvrir avec un anti-triche.
- Tâches automatiques (`run_weekly_rewards`, `award_weekly_best_bonuses`) : sautent les élèves en
  lecture seule (décision A2).
- **À trancher par David** : `process_weekly_rewards` et `purchase_shop_item` écrivent aussi dans
  `gidouilles_history`, sans AUCUN appelant (ni code, ni cron) → les supprimer ? (destructif).
- Migration à pousser APRÈS celle de A2 (elle appelle `has_full_access`).

## Point d'étape — 2026-10-10, fin de soirée

| Constat                               | PR            | Mergée | En prod (base)          | Reste                                                                                              |
| ------------------------------------- | ------------- | ------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| A1 suppression de compte              | #1034         | ✅     | ✅                      | —                                                                                                  |
| B4 élévation admin                    | #1035         | ✅     | (code seul)             | `deploy:prod` — les élévations en cours seront refusées (se ré-élever)                             |
| A2 lecture seule                      | #1042 + #1054 | ✅     | ✅ (vérifié)            | —                                                                                                  |
| E19 récompenses tournoi / multijoueur | #1048         | ✅     | ✅ (vérifié)            | décider `process_weekly_rewards` / `purchase_shop_item` (sans appelant ; suppression = destructif) |
| A3 règle de consentement              | #1050         | ✅     | ✅ (33 comptes marqués) | —                                                                                                  |

Les migrations A2, E19 et A3 sont parties avec celle de la session tags (`--include-all`), vérifiées
en prod le 2026-10-10. #1054 : `db:types` ; annonces d'un auteur en lecture seule masquées aux élèves
(prof et admin les voient) ; `creator_id` validé et réservé à l'élève lui-même (il contournait le
masquage — faille antérieure relevée par security-auditor) ; toast multijoueur sans « +0 ».

### Ordre proposé pour la suite (à valider par David)

1. **Nouveau constat** : soft-delete d'un message par la modération refusé par la RLS (policy SELECT
   `deleted_at IS NULL`) — safeguarding. En prod, 2 suppressions le 30/12/2025, aucune depuis.
2. **D16** démineur lisible par `anon` avec `student_id` ; **D18** frontière d'école absente.
3. **B6 / B7** comptes `pending`/`rejected` et inscription GoTrue directe.
4. **E20** (SRS, DELETE sans `.select()`), **B5** (à mesurer), **B8**, **D17** (question : voulu ?).
5. **C9 → C15** : point par point avec David (aligner le code ou les documents).

## Suppression d'un message par la modération (nouveau constat, branche `fix/moderation-suppression-message`)

- Reproduit en local (2026-10-10), écriture de la route rejouée avec le client du prof :
  conversation de groupe → `42501` (policy SELECT `deleted_at IS NULL` refuse la nouvelle ligne,
  la route répond 500) ; **1-1 entre élèves → 0 ligne, sans erreur : la route répondait
  « supprimé »**, le message restait visible. En prod : 2 suppressions le 30/12/2025, aucune depuis.
- Correctif sans SQL : la route vérifie déjà les droits ; l'écriture passe par le client service
  (`/api/moderation/messages/[id]/` ajouté à `ALLOWED_SERVICE_ROLE_PATHS`), `.select('id')` et
  exactement une ligne exigée, sinon 500. `soft_delete_message` (RPC existante, jamais appelée)
  n'a pas été reprise : sa garde exclut les 1-1 entre élèves, que la route autorise.
- Les tests unitaires enregistraient le bug (UPDATE simulé à 0 ligne compté comme succès) :
  réécrits ; 3 cas rouges avec l'ancienne route.
- security-auditor : la route rendait réels des droits que la base bloquait. **Décision de David
  (2026-10-10)** : le prof ne supprime que des messages écrits par un élève (ou les siens), jamais
  ceux de l'admin ; l'admin garde tout. Contrôle ajouté dans la route, testé.
- Remarque, non traitée : la route LIT le message avec le client du prof ; la policy SELECT ne lui
  montre une conversation 1-1 que si les deux élèves sont membres d'une classe — un 1-1 entre
  élèves hors classe donnerait 404 (contraire à l'option B « le prof supervise tout élève »).

## Suite — 2026-10-10 (nuit)

- **Modération (#1057, mergée, code seul)** : la suppression d'un message passe par le client
  service après les contrôles de la route, et exige une ligne touchée ; le prof ne supprime que des
  messages d'élèves (décision de David). En prod au prochain `deploy:prod`.
- **D16 (#1058, mergée, migration en prod)** : `minesweeper_games` n'a plus qu'une policy SELECT
  (ses propres parties) — vérifié en prod. La page de stats lit rang et tableau par
  `minesweeper_scoped_leaderboard('school')` (prénom seul). Jusqu'au `deploy:prod`, l'ancienne page
  affiche le rang 1 et un tableau réduit à l'élève. Mineurs notés : égalités (rang d'en-tête ≠
  position dans le tableau), prof en fin de tableau.
- Migration D16 poussée depuis son worktree (lien `supabase/.temp` recopié) : le dépôt principal
  est bloqué un commit en retard par deux fichiers régénérés non commités (identiques à
  `origin/main`) — en attente de l'accord de David pour les annuler.

- **D18 (#1062, mergée, migration en prod)** : `game_2048_scores` lisible par soi seul (route
  `/api/games/2048/leaderboard`, sans appelant, supprimée) ; `join_multiplayer_queue` bornée à l'école
  (vérifié en prod). Classement des énigmes : pas de fuite, mais classement faux (autres à 0) —
  bug fonctionnel à traiter à part. Mineur : `get_2048_user_rank` (sans appelant) calcule un rang
  toutes écoles. Le test `Q160` (rpc-lot4) apparie désormais deux élèves de la même école.
- **Règle de David (2026-10-11)** : un DROP POLICY sans perte de donnée suit les 4 conditions comme
  une migration additive ; arrêt toujours sur DROP TABLE/COLUMN, DELETE, perte de donnée.
- Branches locales mergées laissées (`git branch -D` bloqué par les permissions) :
  `fix/rgpd-frontiere-ecole`.

### Reste, dans l'ordre validé

B6/B7, E20, B5, B8, D17 (question), C9→C15 (point par point).

## B6 / B7 (branche `fix/rgpd-comptes-non-approuves`)

- Décisions de David (2026-10-10) : B7 « tous en attente » (compte sans code ni pré-inscription) ;
  B6 « un seul garde dans le hook ».
- Mesure prod : 1 compte refusé, 0 en attente ; 2 élèves approuvés sans classe (laissés tels quels).
- Garde `accountStatusHandle` par **identifiant de route** (security-auditor : `/%61pi/…` contournait
  un test sur le chemin brut) ; routes ouvertes : déconnexion, connexion, inscription,
  `update-password`, consentement parental, journal d'erreurs, export et suppression de compte.
- **Nouveau constat (hors branche)** : la base ignore `profiles.status` — un compte en attente garde
  via PostgREST ce qu'a un élève sans école (écrire ses données, écrire au prof, lire des stats de
  jeu pseudonymes en `using (true)` : `mathemo_scores`, `minesweeper_player_stats`,
  `minesweeper_student_achievements`, `marketplace_listing_views`). Aucun accès à un mineur. À
  proposer à David.

## Point d'étape — 2026-10-11

| Constat | PR | En prod |
| ------- | -- | ------- |
| B6 comptes non approuvés (garde du hook) | #1065 | code : au `deploy:prod` |
| B7 inscription sans code → en attente | #1065 | ✅ migration `20261015090400` |
| E20 suppressions SRS silencieuses | #1066 | code : au `deploy:prod` |
| B5 élévation admin cassée (500) | #1067 | code : au `deploy:prod` |

- E20 : une section inexistante reste une suppression idempotente (200, contrat de
  `sections-crud`) ; 0 ligne sur une section existante → 403.
- B5 : mesuré — le prof voyait 0 profil admin (policies identiques local/prod), l'élévation
  répondait 500 à chaque tentative. Corrigé par le client service.

### Questions ouvertes pour David

- **B8** : limites de débit qui échouent ouvertes ; `api/google/auth/*` sans test de
  `GOOGLE_CLASSROOM_ENABLED` ; `/auth/register` hors `ALLOWED_SERVICE_ROLE_PATHS` (simple
  avertissement en dev). (Le cookie d'élévation non chiffré est une décision du 2026-06-18.)
- **D17** : `anon` lit 11 exercices et 9 constructions `is_public` (aucune d'un élève ; seul
  l'identifiant du prof auteur est visible) — voulu ?
- **Base qui ignore `profiles.status`** (relevé pendant B6) : fermer en base aussi ?
- **Classement des énigmes faux** (autres élèves à 0) ; **`get_2048_user_rank`** sans appelant,
  rang toutes écoles ; **fonctions mortes** `process_weekly_rewards`, `purchase_shop_item`.
- **C9 → C15** : point par point (aligner le code ou les documents).
