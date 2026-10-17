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

| Constat                                  | PR    | En prod                       |
| ---------------------------------------- | ----- | ----------------------------- |
| B6 comptes non approuvés (garde du hook) | #1065 | code : au `deploy:prod`       |
| B7 inscription sans code → en attente    | #1065 | ✅ migration `20261015090400` |
| E20 suppressions SRS silencieuses        | #1066 | code : au `deploy:prod`       |
| B5 élévation admin cassée (500)          | #1067 | code : au `deploy:prod`       |

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

## C — promesses RGPD sans code (décisions de David, 2026-10-11)

| Point                           | Décision                                               | État                                                           |
| ------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| C9 « qui a accédé ? »           | aligner les documents                                  | ✅ rgpd.md, audit-trail.md (60 j, pas de lecture tracée)       |
| C10 Groq                        | aligner les documents (+ avertissement dans le tuteur) | ✅ registre ; avertissement #1070                              |
| C11 conservation                | aligner le code (purge)                                | ✅ #1071, migration en prod (accord explicite de David)        |
| C12 export                      | aligner le code (tuteur, déclaration d'âge)            | ✅ #1070 (+ inférences du tuteur, art. 15)                     |
| C13 page de confidentialité     | compléter (Brevo, Groq, HuggingFace ; 30 j)            | ✅ #1070 (« Groq : aucune conservation » retiré, invérifiable) |
| C14 messages après suppression  | —                                                      | ✅ réglé par A1 (messages supprimés avec le compte)            |
| C15 registre (rôle parent, âge) | aligner les documents                                  | ✅ registre-traitements.md                                     |

### C11 — détail

- `run_retention_c11()` (appelée en tête de `run_cleanup_expired_data`, hebdomadaire) : comptes
  élèves sans **activité** depuis 5 ans (connexion, session rafraîchie, présence — l'audit a montré
  que `last_sign_in_at` seul supprimait un élève resté connecté), conversations du tuteur 1 an après
  le dernier message, pré-inscriptions non activées après 1 an. Mesuré : le 1er passage ne supprime
  rien ; premières conversations vers le 13/12/2026, premiers comptes au plus tôt en 2030.
- **À faire avant 2030** : une tâche qui retire du storage les fichiers d'un compte purgé (chemins
  dans `account_deletion_audit.cleanup_result`, aucun consommateur aujourd'hui).
- Le bloc C est clos : C9, C10, C15 (documents), C11, C12, C13 (code), C14 (réglé par A1).

## Questions ouvertes tranchées (David, 2026-10-11) — toutes les recommandations retenues

| Point                                     | Décision                                      | État                                                                               |
| ----------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Données de jeu en `using (true)`          | lecture par soi seul (prof et admin compris)  | ✅ #1075, migration `20261015090600` en prod (vérifiée)                            |
| Base qui ignore `profiles.status`         | documenter seulement                          | ✅ #1075 (auth.md)                                                                 |
| D17 exercices / constructions `is_public` | exercices publics ; constructions → connectés | ✅ #1075 (constructions `TO authenticated`)                                        |
| Fonctions mortes                          | DROP (accord explicite)                       | ✅ #1075, migration `20261015090700` en prod (vérifiée)                            |
| B8 limites de débit                       | élévation fermée en panne, le reste ouvert    | ✅ #1076 (code : au `deploy:prod`)                                                 |
| B8 interrupteur Google                    | 403 côté API sauf `disconnect` / `status`     | ✅ #1076, + `whiteboard/export-to-classroom` (audit)                               |
| B8 `/auth/register`                       | dans `ALLOWED_SERVICE_ROLE_PATHS`             | ✅ #1076                                                                           |
| Classement des énigmes                    | fonction bornée à l'école, prénom + score     | ✅ #1077 (migration `20261015090800` en prod, vérifiée) + #1079 (page, `db:types`) |

- #1077 : seuls les élèves ayant tenté une énigme apparaissent (pas d'annuaire de l'école).
- **Nouveau constat (audit #1077), à soumettre à David** : `submit_riddle_attempt` prend
  `p_is_correct` de l'appelant et reste exécutable par `authenticated` ; la policy
  « Students can create own attempts » laisse aussi l'élève insérer une tentative à sa guise.
  Un élève peut donc s'attribuer des gidouilles d'énigme (et la tête du classement). Intégrité,
  pas confidentialité ; prod : `riddle_attempts` vide.
- **Drive du tableau blanc** (`api/whiteboard/drive/*`) : utilise le jeton Google sans le garde
  Classroom ; bouton volontairement hors du `{#if}`. À trancher : Drive = Classroom, ou
  interrupteur distinct à documenter.
- `db:types` régénéré dans #1079. La vue `riddle_progress` n'a plus de lecteur : `REVOKE` de
  `authenticated` possible dans une PR à part (le `DROP VIEW`, destructif, attendra David).

## Triche aux énigmes, vue du classement, Drive (David, 2026-10-11 : recos retenues)

- **Drive** ne fait pas partie de Classroom : routes `api/whiteboard/drive/*` laissées actives,
  consigné dans `outils-prof.md` (#1132).
- **#1132 (mergée, migration `20261016090200` en prod, vérifiée)** : la route de soumission
  appelle `submit_riddle_attempt` par le client service (justesse calculée par le serveur) ;
  policy d'insertion directe de l'élève supprimée ; `riddle_progress` fermée ; garde de la
  fonction explicite (client service ou l'élève lui-même — un appel sans `auth.uid()` passait).
- ⏳ **Étape 2, APRÈS le `deploy:prod` qui livre #1132** : migration
  `REVOKE EXECUTE ON FUNCTION submit_riddle_attempt(uuid,uuid,jsonb,boolean) FROM authenticated`
  (l'ancienne route en prod l'appelle encore avec le client de l'élève). Pas écrite d'avance :
  un `db push --include-all` d'une autre session l'appliquerait trop tôt.
- **Constats de l'audit de #1132 — recos retenues par David (2026-10-12)** :
  - **#1147 (mergée, migration `20261016100200` en prod, vérifiée : md5 e322477f…, anon
    refusé)** : 2048 et Mathémo appellent `record_game_reward` par le client service ; garde
    explicite (client service ou l'élève lui-même ; un appel sans `auth.uid()` passait).
  - **#1149 (mergée, code seul)** : les pages élève des énigmes n'envoient plus au navigateur
    ni `answer.value` ni `correction` (`toStudentRiddle`) ; `RiddleCard` ne corrige plus
    côté client. Prod : 1 énigme publiée, avec correction, 0 avec réponse automatique.
- ✅ (fait par #1191) **Étape 2 bis, APRÈS le `deploy:prod` qui livre #1147** : `REVOKE EXECUTE ON FUNCTION
record_game_reward(uuid,text,uuid,numeric,uuid) FROM authenticated` (même migration que
  l'étape 2 possible). L'appel imbriqué par `submit_riddle_attempt` garde son droit (DEFINER).
- **Recos retenues par David (2026-10-12)** :
  - **#1153 (mergée, migration `20261016100400` en prod, vérifiée)** : `upsert_mathemo_score` par
    le client service, garde explicite (elle ajoutait `p_score` au total sans borne).
  - **#1157 (mergée)** : un envoi d'énigme échoué rend la main à l'élève.
  - **Réponse et correction réservées à l'auteur et à l'admin**, en 3 étapes :
    - A **#1163 (mergée, `20261016100500` en prod, vérifiée : 2/2 recopiées, RLS, anon
      fermé)** : table `riddle_solutions` + déclencheur de recopie ;
    - B0 **#1166 (mergée, `20261016100600` en prod)** : `riddles.correction` vaut '' par défaut ;
    - B **#1172 (mergée, code seul)** : tout le code lit et écrit `riddle_solutions`, plus rien
      sur `riddles.answer/correction` (audit : 31 `from('riddles')` relus, colonnes nommées) ;
    - C ⛔ destructive, APRÈS le deploy de B : DROP des deux colonnes + déclencheur — s'arrêter,
      montrer à David la réconciliation et le grep d'usages.
- ✅ **v0.25.0 en prod (2026-10-12)**, puis **#1191 (mergée, `20261016100700` en prod,
  vérifiée)** : EXECUTE retiré à `authenticated` sur `submit_riddle_attempt`,
  `record_game_reward`, `upsert_mathemo_score` (ACL = postgres + service_role) ; démineur
  (`complete_minesweeper_game`, DEFINER) intact. Gardes testées sous `postgres` (rouges sans
  la garde). #1183 : test de chronométrage du pgcd qui bloquait le deploy.
- **Recos de David sur les points d'audit restants (2026-10-12)** :
  - parties « gagnées » en boucle : rien à faire (gidouilles = 1/jour/jeu, seul le classement
    se gonfle) ;
  - **#1178 (mergée, code seul)** : réponse attendue validée par Zod à la création et à
    l'édition (valeur validée enregistrée) ; corrigé au passage : succès affiché en erreur
    (réponse d'action lue sans `deserialize`), création impossible sans genre/image ou en
    validation à la main (`"undefined"`), bonne réponse QCM décalée par un choix vide,
    UUID de `validations/[id]` ;
  - édition non atomique : laissée (erreur visible, réenregistrer suffit) ;
  - `profile.class_ids` de la liste élève : pas de fuite (la RLS borne, le filtre ne fait
    que restreindre).

- ✅ **Étape C FAITE (2026-10-12)** : reprise sans toucher à la base locale partagée (vert
  prouvé par les tests d'intégration de la CI sur Supabase neuf). **#1206 (mergée,
  `20261016100800` en prod, vérifiée)** : garde de réconciliation (2/2, 0 écart, refaite
  juste avant le push), puis DROP du déclencheur, de `sync_riddle_solution()`, de
  `riddles.answer` et `riddles.correction`. Après : 0 colonne, 0 déclencheur, 2 solutions
  intactes ; aucune erreur dans les journaux Postgres. Un élève ne lit plus réponse ni
  correction. Types : #1208.
- ✅ **Fichiers des comptes supprimés (C11, décision de David du 2026-10-13)** : #1239
  (`20261016101000` en prod : `account_deletion_audit.storage_removed_at`) et #1243 (cron
  Vercel du dimanche `api/cron/deleted-account-files`, date l'audit si tout est retiré ; la
  route de suppression date aussi). Au passage : `verifyCronAuth` ne croit plus l'en-tête
  `x-vercel-cron` (falsifiable) ; le bouton admin des tâches HTTP envoie `Origin` (le
  contrôle CSRF le refusait en 403 en prod). **Actif après le prochain `deploy:prod`.**
  `profile.class_ids` (liste des énigmes élève) : pas de défaut, mesuré (0 écart / 81).
- ✅ **Chemins forgés (audit de #1243, antérieur) — #1246 (mergée, `20261016101200` en prod, md5 prod = local testé)** : un élève peut créer une pièce jointe
  de message privé (`message_attachments_v2.storage_path`) ou une capture de signalement
  (`bug_reports.screenshot_path`) avec le chemin d'un fichier d'autrui ; à la suppression
  de son compte, ce fichier serait retiré. Accord de David (2026-10-13) : `delete_user_account`
  ne rend que les chemins conformes (`messages/<id de son message>/…`,
  `<son id>/<id de son signalement>/…`). Prod : 0 fichier dans ces buckets.
- ✅ **Pièces jointes de la messagerie (décision de David du 2026-10-13 : « un élève envoie
  le scan de son cahier »)**. Le bucket n'existait pas en prod : toute pièce jointe
  échouait en silence. Règles validées : joint = expéditeur ; lit = expéditeur,
  destinataire non supprimé, admin ; JPEG/PNG/WebP/HEIC/PDF, 10 Mo, 3 par message ;
  conservation du message.
  - **#1250** (`20261016101300` en prod, vérifiée) : bucket privé sans policy de storage
    (une migration ne peut pas en poser : `storage.objects` à `supabase_storage_admin`),
    contrainte de taille 5 → 10 Mo, lecture admin, `list_orphan_message_attachment_files`.
  - **#1256** (code + `20261016101400` en prod, vérifiée) : liens d'envoi et de lecture
    signés par le serveur après contrôle RLS ; cron du dimanche qui retire les fichiers
    orphelins. **Audit : 1 bloquant corrigé avant merge** — le serveur signait le chemin
    écrit par le navigateur, `%2e%2e` sortait du message voire du bucket ; signature et
    policy exigent désormais `messages/<message>/<uuid>-<nom>`. Aussi : limite de 3 sur
    les fichiers déposés, consentement `send_message`, 303 `no-store`.
  - **Actif après le prochain `deploy:prod`.** Reste mineur : course sur la limite de 3
    (expéditeur seul, cron), 500 au lieu de 404 si le fichier manque.
- ✅ **I4 élargi — #1266, migration `20261016101700` EN PROD (vérifié le 2026-10-13)** :
  déclencheur `guard_worksheet_error_report_teacher_fields` présent et actif en prod
  (`tgenabled = O`) ; l'élève ne remplit plus status / reviewed_by / reviewed_at /
  response, et ne change plus que la description de son signalement en attente.
  Prod : 14 signalements, aucun forgé. Partie avec les migrations des autres sessions
  (101500 messages figés, 101600 boîte de réception, 103000 `python_recheck_supprime`,
  renumérotée par sa session). Pas de RPC nouvelle → pas de `db:types`.
- Le point 2 (safeguarding de la modération) est traité par une autre session
  (`fix/messages-prives-non-modifiables`, `fix/ecritures-verifiees`).
- **9bis — énigme du jour (branche `fix/enigme-du-jour-cron`)** : mesuré en prod le
  2026-10-13 — `VITE_RIDDLE_AUTO_SELECT_API_KEY` absente (seul `CRON_SECRET` est défini) →
  tout POST passait et faisait écrire `background_job_runs` par le client service ; la
  sélection elle-même échoue pour tous (policy d'INSERT `selected_by = auth.uid()`, la route
  écrit `null`), 0 exécution au journal. Correctif : `verifyCronAuth` (code seul, 4 tests
  rouges sans lui). La sélection automatique reste morte : question produit pour David.
- **Énigme du jour automatique (décision de David, 2026-10-13 : « je veux la garder »)** —
  branche `fix/enigme-du-jour-auto` : route `api/cron/riddle-of-the-day` (GET cron Vercel
  quotidien 00:05 UTC, POST bouton admin), `Bearer CRON_SECRET`, sélection par le client
  service (seule façon d'écrire sans compte ; ne choisit que des énigmes publiées). Prod :
  1 énigme publiée, 0 énigme du jour jamais posée → la tâche réussira le 1er jour, puis
  échouera (« Aucune énigme éligible ») 30 jours, faute d'autre énigme publiée.
- **T17 — conversation du Père Ubu sur une tablette partagée (choix de David, 2026-10-13)** —
  branche `fix/historique-tuteur-par-compte` : historique rangé par compte
  (`chatHistory:<id>`), conversations des autres comptes et ancienne clé commune effacées à
  l'ouverture du chat, toutes effacées à la déconnexion. 4 tests rouges sans le correctif.
  **Trouvé au passage** : le chat plantait au montage, en prod comme en dev
  (`bind:ref={undefined}` vers `Textarea`, `props_invalid_value`) → corrigé.
- **T17 étendu — données de travail dans le navigateur (David, 2026-10-13 : « traite les
  pareil », effacées à la déconnexion)** — branche `fix/donnees-de-travail-par-compte` :
  `src/lib/utils/work-data.ts` (18 clés + 4 préfixes : Python, Blockly, atelier, console,
  calculatrice, grapheur, tableur, tableau blanc, jeux, profil de joueur, chat). Propriétaire
  retenu dans le navigateur, vérifié par le layout racine à chaque page ; autre compte ou
  visiteur → effacées + rechargement ; visiteur qui se connecte → son compte reprend ;
  déconnexion, attente d'approbation, suppression du compte → effacées. Tests : 11 unitaires
  (8 rouges sans le module) + 3 du layout (rouges sans l'appel).
- **Adresses visitées jointes aux rapports de bug (David, 2026-10-13 : « traite le »)** —
  branche `fix/traces-onglet-rapport-bug` : `chiphre_freeze_data` (`sessionStorage`, 20
  dernières actions dont l'URL complète des navigations) vidé par `clearWorkData`, en mémoire
  comme dans l'onglet (`clearFreezeDetectionData`). 2 tests rouges sans l'appel, 2 qui
  vérifient ce qui reste (même compte, visiteur qui se connecte).
- **T16 — HuggingFace : inactif en prod, mesuré le 2026-10-13** : `HF_API_KEY` absente des
  variables Vercel de production, corpus vide (`rag_documents` 0, `rag_chunks` 0). Aucun
  message d'élève n'est parti chez HuggingFace. Latent : définir la clé l'activerait sans
  déclaration du sous-traitant. Suite à trancher par David.
- **T16 corrigé (#1311, David : option 2)** : `hybridSearch` vérifie qu'un extrait de
  `rag_chunks` est lisible par l'élève pour son niveau et son thème (même client, mêmes filtres
  que la RPC `rag_hybrid_search`, SECURITY INVOKER) avant tout appel à HuggingFace ; erreur → rien
  n'est envoyé. 2 tests rouges sans le garde-fou. Registre des sous-traitants et `tuteur-ia.md` :
  déclarer HuggingFace avant de définir `HF_API_KEY`.
- **T18 clos (David, 2026-10-13 : « clore, accepté »)** : la `solution` envoyée au tuteur par le
  navigateur reste ; elle y est déjà (correction côté client), la trafiquer ne fausse que l'aide
  reçue par l'élève lui-même. Écrit dans `tuteur-ia.md` (Pièges).
- **T11 plus vrai (mesuré le 2026-10-13)** : `sanitizeErrorData` masque clés sensibles et
  courriels (corps, contexte, URL, message, pile) ; prod : 934 lignes, `request_body` 0, une URL à
  paramètre (`/glossaire?q=`), plus ancienne au 2026-09-11 (purge 30 j). §5.9 de `rgpd.md` barré.
- **T5 corrigé (#1327)** : `challenge-variables.ts` n'envoie à `new Function` qu'une expression
  arithmétique (`ARITHMETIC_ONLY`, classe de caractères, temps linéaire) ; noms de variables
  substitués par `interpolateExpression` (un nom piégé faisait planter ou geler le combat).
  Prod : `game_challenges` écrite par le prof seul, 0 / 464 défis de type `expression`. 3 tests
  rouges sur `main`.
- **T4 plus vrai (vérifié le 2026-10-13)** : garde `assertGoogleClassroomEnabled()` dans chaque
  méthode des routes `/api/google/**` et `export-to-classroom` (comptage méthode par méthode),
  test `interrupteur-google.test.ts` 25/25 ; seuls `auth/disconnect` et `auth/status` restent
  ouverts (B8). Reste `class_google_classroom_links` : jamais lue, 0 ligne en prod → suppression
  destructive à décider par David.
