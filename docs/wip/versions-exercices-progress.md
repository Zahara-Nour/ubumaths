# Chantier `versions-exercices` — versions d'un exercice, la fiche choisit la sienne

## Reprendre ici

_Mis à jour le 2026-11-25, PR 2 (éditeur) commitée, correctifs de revue à rejouer en intégration._

- **État** : PR 2 sur `feat/versions-exercices-editeur` (worktree `../ubumaths-wt-versions-exercices-editeur`) : migration additive `20261125183550`, routes, éditeur, sauvegarde ; revues faites et corrigées. Détail : § PR 2 — fait.
- **Prochaine action** : rejouer `pnpm test:integration tests/integration/versions-exercices*.test.ts` + `pnpm test:verifs e2e/verifs/versions-exercices-editeur.spec.ts` (correctifs de revue pas encore rejoués : ordre des verrous, `versions: []`, 42501), puis `pnpm lint:fast`, ouvrir la PR, CI, merge ; au merge, `db:migrate` (4 conditions réunies : accès tranché « personne », rouge prouvé, audit sans bloquant, additive + rollback). Puis PR 3 (la fiche : menu de version à l'import, « version plus récente existe »).
- **En attente de David** : rien.
- **Pièges en cours** : `deploy:prod` lancé par David (`! pnpm deploy:prod`) ; le code de la PR 2 appelle les nouvelles fonctions SQL → `db:migrate` AVANT ou AVEC le `deploy:prod`. Base locale de dev : migration de la branche jouée (`db:a-jour`) et `create_exercise_version` / `save_exercise_with_version` redéfinies à la main après retouche.
- **Worktree / branche** : `../ubumaths-wt-versions-exercices-editeur` / `feat/versions-exercices-editeur`.

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
