# Chantier `versions-exercices` — versions d'un exercice, la fiche choisit la sienne

## Reprendre ici

_Mis à jour le 2026-11-26, après #3202._

- **État** : les 4 PR du découpage sont faites. PR 1 (#3150) et PR 2 (#3154) en prod (v0.112.0), PR 3 (#3194) en prod (v0.115.0). PR 4 (#3202) mergée, migration `20261126221127` jouée en prod : `exercises` n'a plus que `variables`, 0 fonction morte, 428 exercices / 428 avec version. La page publique `/exercice/<slug>` rend bien l'énoncé.
- **Prochaine action** : clore le chantier (versement : le durable est déjà dans `docs/systeme/exercices.md` et `base-de-donnees.md`, puis archiver ce journal). Seulement sur le go de David.
- **En attente de David** : go pour clore. Le code de #3202 part au prochain `deploy:prod` ; le code en prod ne lit déjà plus les colonnes retirées (#3194).
- **Pièges en cours** : pas vus à l'écran, car ils demandent une connexion : le lien de partage et la sauvegarde admin, couverts par les tests d'intégration (`versions-exercices-retrait`, `versions-exercices-sauvegarde`).
- **Worktree / branche** : aucun (retirés par `pr:merger`).

## PR 4 — fait (2026-11-26)

- Migration `20261126221127_versions_exercices_retrait_ancien_contenu` (destructive, rollback en
  commentaire, éprouvé par deux tests) : 5 fonctions mortes, 2 index, 2 CHECK, 3 colonnes ;
  `get_exercise_by_share_token` en table explicite (mêmes champs, mêmes droits). Rouge prouvé
  sans elle (`versions-exercices-retrait.test.ts`).
- Code : types d'écriture d'un exercice = identité + contenu de version (`exercises.ts`,
  `ExerciseForm`) ; sauvegarde (restauration + fichier SQL) n'écrit plus le contenu sur
  `exercises`. Tests : fabriques et fixtures sans contenu sur `exercises` ; « élève archivé » passe
  par `get_student_exercises` ; rejeu de la PR 1 précédé du rollback de la PR 4.
- Revues : `security-auditor` aucun finding bloquant (personne ne gagne ni ne perd de lecture
  utilisée). `code-reviewer` (opus) : fichier SQL de sauvegarde non rejouable sur un exercice à
  niveaux (`grades` écrit en JSON dans un `text[]`, **déjà vrai sur `main`**) → corrigé, test rouge
  puis vert ; commentaires `exercises.generic_functions` périmés → corrigés. Vieux scripts : laissés
  (Q2).
- Suite d'intégration complète : 1 seul échec (compteur d'`anon-option-b`), corrigé.
- Pas vu à l'écran : la base de dev locale est partagée et la migration est destructive ; vérifier
  après `db:migrate`.

## Phase 0 de la PR 4 — retrait de l'ancien contenu (validée le 2026-11-26 : « je te suis »)

- Colonnes supprimées : `exercises.variations`, `shared`, `generic_functions` (ADR 0044 point 11).
  **`variables` reste** (Q1 : encore écrite à la création, lue par 3 fonctions ; chantier à part).
- Réconciliation (prod, lecture seule, 2026-11-26) : 428 exercices, 428 avec une v1 identique à
  l'ancien contenu, 0 contenu qui n'existerait que dans les anciennes colonnes, 0 exercice à
  plusieurs versions, 0 exercice à `variables`. **Rien n'est perdu.**
- Usages (grep du 2026-11-26) : aucun `from('exercises')` de `src/` ne nomme ces colonnes ; 5
  fonctions SQL mortes (`get_my|teacher|all_exercise_assignments`,
  `exercise_has_multiple_variations`, `exercise_variation_count`), appelées seulement par des tests ;
  `get_exercise_by_share_token` (forme `exercises`, contenu glissé dedans) → table explicite, mêmes
  champs ; sauvegarde admin (restauration + dump SQL) écrit encore ces colonnes → par les versions
  seulement ; 4 index (2 du contenu supprimés) et 3 règles (2 du contenu supprimées).
- Vieux scripts `scripts/create-*.ts`, `fix-*.ts` (déjà joués, hors typecheck) : laissés tels
  quels (Q2) ; une ligne dans la skill `fiches-exercices`.
- Calendrier (Q3) : PR écrite et ouverte sans merge ; `deploy:prod` de #3194, go de David, merge,
  `db:migrate`.

## Décisions (2026-11-25)

Voir l'[ADR 0044](../adr/0044-versions-d-un-exercice.md). Découpage : PR 1 bascule · PR 2 éditeur ·
PR 3 fiche · PR 4 effacement des anciennes colonnes (destructif, après `deploy:prod`, go de David).

## Plan de la PR 1 (validé le 2026-11-25)

**Base**

- Table `exercise_versions` : `id`, `exercise_id` (→ `exercises`, `on delete cascade`), `number`
  (≥ 1, unique avec `exercise_id`), `note` (texte borné, facultatif), `variations`, `shared`,
  `generic_functions` (mêmes types et CHECK que sur `exercises`), `created_at`, `updated_at`,
  `created_by`. Unique `(exercise_id, id)` pour la clé composée.
- `worksheet_exercises.exercise_version_id` NOT NULL après reprise ; FK composée
  `(exercise_id, exercise_version_id)` → `exercise_versions (exercise_id, id)` **`ON DELETE NO
ACTION`** : supprimer une version pointée est refusé, supprimer l'exercice passe (les deux
  cascades sont faites avant la vérification de fin d'instruction) — à prouver par test.
- Reprise : une v1 par exercice (contenu actuel, `variables` ancien format non repris : 0 en prod),
  chaque ligne de fiche → v1 de son exercice.
- RLS : lecture `exists (select 1 from exercises e where e.id = exercise_id)` (hérite des règles
  de l'exercice, présentes et futures) ; écriture (insert/update/delete) = prof auteur de
  l'exercice (`created_by = auth.uid()` + rôle `teacher`), comme les policies d'`exercises`.
- Rollback écrit en commentaire de la migration.

**Code** (inventaire du 2026-11-25)

- Une seule fonction lit le contenu d'une version ; « hors fiche » = la dernière (plus grand
  numéro), « dans une fiche » = celle de la ligne.
- Écritures (7) : `createExercise` crée la v1 ; `updateExercise` modifie la dernière ;
  `exercise-import-export.ts` (import = v1, doublon `replace` = dernière ; export inchangé, dernière
  version) ; `admin/exercise-backup.ts` (sauvegarde de toutes les versions, ancienne sauvegarde →
  v1, dump SQL compris) ; `reports/[reportId]/+server.ts:494` = **version de la fiche signalée**.
- Lectures hors fiche (11 + 2 RPC) : `exercises.ts` (`getExercises`, `getExercise`,
  `getExerciseBySlug`, `getTeacherExercises`, tous en `select('*')`), `exercise-assignments.ts`
  (`getAssignmentsForStudent`, `getAccessibleExercises`), `student/exercises/[id]`,
  `exercices/[id]/assign`, `api/tutor/conversations`, import/export, sauvegarde ; RPC
  `get_student_exercises` (lit `e.variations/shared/variables`) et `get_exercise_by_share_token`
  (`SETOF exercises`).
- Lectures dans une fiche (7 jointures) : `api/worksheets/[id]` (:106),
  `api/worksheets/[id]/exercises` (:90), `assignments/[assignmentId]/preview` (:305),
  `assignments/[assignmentId]/correction` (:93), `api/student/worksheets/[assignmentId]` (:212),
  signalement élève `…/report` (:146), traitement `reports/[reportId]` (:122, :462).
- Scripts : les 48 déjà joués restent (historique) ; fonction commune pour écrire le contenu d'une
  version ; `scripts/fiches/regen-depuis-base.ts`, `scripts/fiches/empreinte-typst.ts` et le skill
  `fiches-exercices` y passent.
- Hors PR 1 (PR 4) : 5 fonctions SQL mortes qui lisent le contenu (`get_my_exercise_assignments`,
  `get_all_exercise_assignments`, `get_teacher_exercise_assignments`,
  `exercise_has_multiple_variations`, `exercise_variation_count`), index et CHECK du contenu sur
  `exercises`.
- Helpers de test à adapter : `tests/helpers/database/test-data-factory.ts`,
  `trigger-test-helpers.ts` ; ~6 tests d'intégration et ~25 unitaires écrivent ou simulent le contenu.

## Tests (rouges d'abord)

1. Reprise : chaque exercice a une v1 identique à son contenu ; chaque ligne de fiche → v1 de son
   exercice.
2. Accès : une version se lit exactement quand son exercice se lit (ADR 0044) — l'auteur, tous si
   public, le lien de partage, l'élève qui lit l'exercice (il lit alors TOUTES ses versions, pas
   seulement celle de sa fiche ; relevé par l'audit, conforme à l'ADR) ; ne la lisent pas un autre
   prof, un élève d'une autre classe ; seul l'auteur écrit.
3. Version pointée non supprimable ; exercice supprimé → lignes de fiche parties ; ligne de fiche
   vers la version d'un autre exercice refusée.
4. v2 ajoutée en test : fiche restée en v1 → v1 dans copie élève, aperçu, corrigé, PDF ; page
   publique et page élève de l'exercice → v2.
5. API : création → v1, modification → dernière, import → v1, correction après signalement →
   version de la fiche.
6. À l'écran (`pnpm voir`) : liste des exercices, page d'exercice, fiche d'élève, PDF identiques.

Revue : `code-reviewer` (opus) + `security-auditor` avant d'ouvrir la PR.

## Mesures (prod, lecture seule, 2026-11-25)

- 50 fiches, 424 exercices en fiche, 64 partagés par 2 ou 3 fiches, 12 affectations.
- 428 exercices ; niveaux de guidage : guidé 427, autonome 42, intermédiaire 5, personnalisé 0 ;
  aucune valeur tirée (0 exercice à variables).
- Modèles de questions : 2 390 sur 2 866 ont plusieurs variations, chacune avec son énoncé (2 390),
  sa correction (2 347), ses variables (2 342), ses cases (2 292) → définition de « variation »
  précisée dans CONTEXT.md (commit `a30618b58`).

## Question d'accès (tranchée le 2026-11-25)

« Qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » → **personne** (David : « je te suis »).
Une version se lit exactement quand son exercice se lit, s'écrit quand il s'écrit.

## Entre-deux merge → mise en prod (tranché le 2026-11-25 : B)

La migration part au merge, le nouveau code seulement au `deploy:prod`. Entre les deux, le code en
prod est l'ancien : il ajoute un exercice à une fiche sans dire la version (refusé si la colonne est
obligatoire), crée un exercice sans version 1, modifie l'ancien contenu que plus rien ne lit ensuite.
Recommandation : trois déclencheurs de compatibilité, retirés en PR 4 (ligne de fiche sans version →
la dernière ; exercice créé → sa version 1 ; ancien contenu modifié → recopié dans la dernière).
Autre voie (B) : `db:migrate` et `deploy:prod` coup sur coup, rien touché entre les deux.

**David : B.** Aucun déclencheur de compatibilité. Après le merge de la PR 1, la session ne lance
pas `db:migrate` seule : elle prévient David, qui demande `db:migrate` + `deploy:prod` ensemble.

## Écarts relevés en passant

- Formulaire d'exercice : carte « Variations » et toasts « Variation ajoutee », « Maximum 10
  variations autorisees » (mot contraire à CONTEXT.md, accents manquants) → PR 2.

## PR 3 — fait (2026-11-26)

- Lecture : `loadWorksheetVersionChoices` (lignes dont l'exercice a ≥ 2 versions, affectations `active`). Écriture : `setLineVersion` + route `PUT /api/worksheets/[id]/exercises/[ligne]/version` (fiche archivée → 400, version d'un autre exercice ou disparue → 400, ligne absente → 404). Garde d'accès extraite dans `worksheet-line-access.ts`. Aucune migration.
- UI : `LineVersionControl` sous le titre de la ligne (menu vN · note · date, « une version plus récente existe », « Passer à la vN »), confirmation si affectation en cours ; Échap, clic dehors et « Renoncer » remettent le menu.
- Tests : 9 unitaires (`line-version.test.ts`), 9 d'intégration (`versions-exercices-fiche.test.ts`), 2 à l'écran (`e2e/verifs/versions-exercices-fiche.spec.ts`, verts). Doc : `fiches-et-pdf.md`, `base-de-donnees.md`.
- Revues : `code-reviewer` (Échap/clic dehors et ordre rechargement → corrigés ; pagination commentée ; affectation active mais close comptée, voulu). `security-auditor` : aucun finding bloquant, personne ne gagne d'accès ; 2 tests ajoutés (élève en PostgREST direct, clé composée 23503).
- Piège : le bouton d'annulation de `ConfirmDialog` s'appelle « Renoncer » (lore), pas « Annuler ».

## Phase 0 de la PR 3 — la fiche (validée le 2026-11-26 : « je valide »)

Mesures (prod, 2026-11-26) : aucun exercice à plusieurs versions ; aucune ligne de fiche vers
l'exercice d'un autre auteur ; 10 fiches publiées sur 12 ont des affectations, **1 brouillon aussi**
(dépubliée après affectation) → « distribuée » = a des affectations, pas « publiée ». Les exercices
d'une fiche publiée ne se modifient plus (ajout, retrait, ordre) : brouillon seulement.

- Ligne d'exercice : une seule version → rien de nouveau (Q3). Plusieurs → étiquette « v2 » ; pas
  la dernière → « une version plus récente existe (v3) » + bouton « Passer à la v3 ». L'étiquette
  ouvre un menu de toutes les versions (numéro, note, date), retour en arrière permis.
- Changer : sans affectation → direct, toast « Exercice 4 : version 3 » ; avec affectation(s) →
  confirmation « N affectations en cours : les élèves verront la nouvelle rédaction à leur prochaine
  ouverture ». Permis sur brouillon ET publiée, pas archivée (Q1).
- Ajout : dernière version, comme aujourd'hui ; le choix se fait sur la ligne après l'ajout, pas de
  menu dans la fenêtre d'ajout (Q2, écart assumé au texte du point 5 de l'ADR).
- Signalements déjà faits : gardent leur version.
- Erreurs : version d'un autre exercice → 400 (la base refuse déjà) ; version supprimée entre-temps
  → message, liste rechargée ; prof non auteur de la fiche → 403.
- Base : aucune migration prévue (les policies couvrent la mise à jour d'une ligne de fiche), à
  prouver par un test d'intégration. Accès : personne ne gagne de lecture.

## Phase 0 de la PR 2 — éditeur de versions (validée le 2026-11-25 : « je suis tes recos »)

Worktree `../ubumaths-wt-versions-exercices-editeur`, branche `feat/versions-exercices-editeur`.

**Page d'édition d'un exercice (prof auteur)**

- Nominal : en haut, « Version 3 (la plus récente) » et un menu des versions (numéro, note, date,
  « utilisée par 2 fiches »). La page ouvre la plus récente ; `?version=2` en ouvre une autre.
  « Enregistrer » modifie **sur place** la version affichée (ADR point 3), aucune autre.
- « Nouvelle version » : une fenêtre demande une note facultative (« question b) reformulée après
  le test en 2de 3 »), recopie la **plus récente** (ADR point 2), l'ouvre. Aucune fiche ne bouge.
- La note d'une version se modifie (bornée, vide permise).
- Bandeau si la version affichée sert à des fiches : « Utilisée par : Fiche A, Fiche B (distribuée) —
  vos modifications s'y verront. »
- Ouverte depuis une fiche (`?fiche=…`) : la page ouvre **la version de cette fiche**, pas la plus
  récente (sinon on corrigerait une version que la fiche n'affiche pas).
- Supprimer une version (Q1) : refusé si une fiche l'utilise (le refus nomme les fiches) ou si
  c'est la seule ; sinon supprimée (supprimer la plus récente rend la précédente « la plus récente »
  hors fiche).
- Limites / erreurs : deux « Nouvelle version » simultanées → une seule v4, l'autre v5 (numéro
  unique tenu par la base, pas de doublon) ; version d'un autre exercice dans l'adresse → 404 ;
  prof non auteur → 403 comme aujourd'hui.
- Mots : carte « Variations » → « Niveaux de guidage », toasts accentués (écart relevé en PR 1).

**Points reportés de la PR 1, faits d'abord**

1. « Dernière version de chaque exercice » calculée par la base (une fonction SQL appelée avec les
   droits de l'appelant), plus de limite des 1 000 lignes.
2. Toute écriture d'une version remet à jour `updated_at` de l'exercice (plan du site, tri
   « modifié le ») — signalement compris.
3. Modifier un exercice : fiche d'identité et version écrites ensemble (tout ou rien).
4. Sauvegarde : un exercice sans version ne l'interrompt plus ; restauration d'une ancienne
   sauvegarde → elle crée une **nouvelle** version au lieu d'écraser la v1 pointée par les fiches ;
   numéros de version uniques vérifiés à la lecture du fichier.
5. Test d'intégration de la jointure de `/correction`.

**Migration** (pour 1-3) : une fonction « dernière version » et un déclencheur `updated_at`, tous
deux avec les droits de l'appelant. Question d'accès (Q4) : qui pourra lire quoi qu'il ne pouvait
pas lire avant ? → recommandation : **personne**.

**Questions à David** : Q1 suppression d'une version dans cette PR (reco : oui, avec les deux
refus) · Q2 « Nouvelle version » part toujours de la plus récente, même si on regarde la v1 (reco :
oui, l'ADR) · Q3 depuis une fiche, ouvrir la version de la fiche (reco : oui) · Q4 accès : personne.

## PR 2 — fait (2026-11-25)

- Migration `20261125183550_versions_exercices_editeur` (additive, droits de l'appelant) :
  `latest_exercise_versions`, `create_exercise_version` (sans compte connecté : auteur de la
  version recopiée), `save_exercise_with_version` (version puis exercice, tout ou rien), déclencheur
  `exercise_versions_touch_exercise` (`exercises.updated_at`). Rouge prouvé sans elle (9 tests).
- Routes `GET/POST /api/exercises/[id]/versions`, `PATCH/DELETE …/[versionId]` ; `PUT
/api/exercises/[id]` prend `version_id`. Page d'édition : `ExerciseVersionsBar`, choix de la
  version (`src/lib/exercises/edited-version.ts`). Mots « niveau de guidage » dans `ExerciseForm`.
- Sauvegarde : exercice sans version exporté (`versions: []`) ; ancienne sauvegarde sur exercice
  versionné → nouvelle version ; numéros uniques au Zod.
- Vu à l'écran : `pnpm voir` (ordi + iPhone) et `e2e/verifs/versions-exercices-editeur.spec.ts`
  (nouvelle version, note, suppression, depuis la fiche, « Mettre à jour » écrit la v1 seule).
- Revues : `security-auditor` sans finding bloquant (personne ne gagne d'accès) ;
  `code-reviewer` (opus) : interblocage « Enregistrer » ↔ autres écritures (ordre des verrous
  inversé, corrigé), restauration `versions: []` qui ajoutait une version vide (corrigé), refus
  d'exercice annoncé « Version introuvable » (42501 → 403), commentaire faux. Accepté : un exercice
  sans version ne s'enregistre plus (404).
- Informatif (audit) : la policy UPDATE des versions (PR 1) exige `created_by = auth.uid()` → une
  version restaurée par l'admin au nom d'un autre compte ne serait pas modifiable par le prof.

## Revues de la PR 1 (2026-11-25)

Corrigés dans la PR 1 : policy UPDATE qui fige `created_by` (+ test d'intégration) ; un exercice
sans version est écarté d'une LISTE et journalisé au lieu de la faire tomber (lu seul : erreur) ;
alias de types de version déplacés dans `database-helpers.ts` (règle 6). Migration renommée
`20261125163605` (une migration de `main` horodatée après l'ancienne).

Conforme à l'ADR, pas un bug : l'élève qui lit un exercice lit TOUTES ses versions (corrigés
compris), pas seulement celle de sa fiche. Déjà vrai avant (contenu unique), mais les anciennes
versions restent lisibles ; une version publique ancienne reste lisible par `anon` → « retirer un
contenu » = modifier ou supprimer la version qui le porte. Corrigés lisibles par REST par l'élève :
existait avant la branche, chantier à part si David le veut.

Reportés :

- PR 2 : la correction après signalement ne touche plus `exercises.updated_at` (plan du site, tri
  « modifié le ») ; `fetchLatestVersions` sans pagination (`max_rows = 1000`) → « dernière version
  par exercice » en SQL dès que les v2 existent ; restauration d'une ancienne sauvegarde (→ v1)
  qui réécrit la v1 pointée par les fiches, et numéros de version non uniques dans le Zod de
  `backup.ts` ; sauvegarde qui s'interrompt sur un exercice sans version ; `updateExercise` /
  import `replace` : `exercises` écrit avant la version (pas atomique) ; test d'intégration de la
  jointure de `/correction`.
- PR 4 (inventaire du DROP) : `admin/exercise-backup.ts` écrit encore `variations`, `shared`,
  `generic_functions` sur `exercises` (dump SQL l. ~400-438, restauration l. ~855, ~891) ; anciens
  scripts `scripts/create-*.ts` qui font `.from('exercises').update({ generic_functions })` (réussit
  sans effet) → le dire dans la skill `fiches-exercices`.
