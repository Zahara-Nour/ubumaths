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

| Constat                               | PR    | Mergée | En prod (base) | Reste                                                                                     |
| ------------------------------------- | ----- | ------ | -------------- | ----------------------------------------------------------------------------------------- |
| A1 suppression de compte              | #1034 | ✅     | ✅ migrée      | —                                                                                         |
| B4 élévation admin                    | #1035 | ✅     | (code seul)    | `deploy:prod` par David — les cookies d'élévation en cours seront refusés (se ré-élever)  |
| A2 lecture seule                      | #1042 | ✅     | ⏳             | migrer ; puis `db:types` et 2e PR (masquage des annonces dans la route)                   |
| E19 récompenses tournoi / multijoueur | #1048 | ✅     | ⏳             | migrer après A2 ; décider `process_weekly_rewards` / `purchase_shop_item` (sans appelant) |
| A3 règle de consentement              | #1050 | ✅     | ⏳             | migrer après E19                                                                          |

**Blocage des migrations** : `20261013120000_tags_modeles_points` (session tags) est mergée mais pas
migrée, et datée avant A1 (déjà en prod) → `db push` exige `--include-all`. Décision de David :
attendre que la session tags migre la sienne. Ordre ensuite : `20261014110000` (A2) →
`20261014120000` (E19) → `20261015090100` (A3).

### Ordre proposé pour la suite (à valider par David)

1. **Nouveau constat** : soft-delete d'un message par la modération refusé par la RLS (policy SELECT
   `deleted_at IS NULL`) — safeguarding. En prod, 2 suppressions le 30/12/2025, aucune depuis.
2. **D16** démineur lisible par `anon` avec `student_id` ; **D18** frontière d'école absente.
3. **B6 / B7** comptes `pending`/`rejected` et inscription GoTrue directe.
4. **E20** (SRS, DELETE sans `.select()`), **B5** (à mesurer), **B8**, **D17** (question : voulu ?).
5. **C9 → C15** : point par point avec David (aligner le code ou les documents).
