---
couvre:
  - 'src/lib/components/exercises/**'
  - 'src/lib/server/{exercises,exercise-assignments,exercise-import-export,exercise-share-tokens,resource-tags}.ts'
  - 'src/lib/server/validation/{exercises,exercise-mastery,image-upload,tags}.ts'
  - 'src/lib/types/exercise-*.ts'
  - 'src/routes/api/exercises/**'
  - 'src/routes/api/teacher/exercises/**'
  - 'src/routes/api/admin/exercises/**'
  - 'src/routes/api/student/exercise-mastery/**'
  - 'src/routes/api/tags/**'
  - 'src/routes/(protected)/dashboard/teacher/contenu/exercices/**'
  - 'src/routes/(protected)/dashboard/teacher/contenu/{+layout.svelte,+page.server.ts}'
  - 'src/lib/components/{TagBadgeSelector,GradeBadgeSelector}.svelte'
  - src/lib/stores/exerciseFont.svelte.ts
  - 'src/routes/(protected)/dashboard/student/exercises/**'
  - 'src/routes/(public)/exercice/**'
---

# Exercices : éditeur, partage, affectation, maîtrise

> Première doc de la zone, écrite à partir du code (règle « doc d'abord », 2026-10-12).
> Vérifié contre le code le 2026-10-12 ; réponses des niveaux de guidage le 2026-10-13 ; points du programme (C5, B2) le 2026-10-21.

## À quoi ça sert

Un **exercice** (table `exercises`) est un exercice **rédigé** en ubumark par le professeur :
énoncé, correction, indices, ressources, éventuellement paramétré par des variables. C'est la
brique des **fiches** ([fiches-et-pdf.md](fiches-et-pdf.md)), mais un exercice vit aussi seul :
page du professeur, page publique `/exercice/[slug]`, lien de partage, affectation directe à un
élève ou à une classe.

Ce n'est **pas** un modèle de question (`question_templates`, [questions.md](questions.md)) : pas
de réponse saisie ni corrigée par la machine. Le moteur (générateur d'instance, types,
`getExerciseContent*`, import Zod, Typst) vit dans `src/lib/exercises/`, décrit par
[questions.md](questions.md#srclibexercises--exercices-de-fiche-autre-moteur) ; cette doc décrit
ce qui l'entoure : éditeur, pages, API, accès.

Vocabulaire ([CONTEXT.md](../../CONTEXT.md)) : les `variations[]` d'un exercice sont ses **niveaux
de guidage** (`guided`, `intermediate`, `autonomous`), pas des « variations » ; le champ `topic`
(libellé « Theme » dans le formulaire) tient lieu de **notion** (à créer) ; `category` est la
**catégorie** d'exercice ; `source` sa provenance.

## Modèle de données

| Table                                      | Rôle                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exercises`                                | L'exercice. Contenu dans `variations` (jsonb, **seule source** de l'énoncé et de la correction) + `shared` (valeurs communes). `variables` (jsonb) = ancien format, encore validé. `is_public`, `search_indexed`, `distribution_mode`, `generic_functions`.                                                       |
| `resource_tags` (+ `tags`)                 | Étiquettes : jonction polymorphe `(resource_kind, resource_id, tag_id)`, `resource_kind = 'exercise'`. Les étiquettes ne sont **pas** une colonne d'`exercises`.                                                                                                                                                  |
| `exercise_share_tokens`                    | Liens de partage d'un exercice privé (jeton de 16 caractères, expiration facultative, révocation par `is_active = false`).                                                                                                                                                                                        |
| `exercise_assignments`                     | Affectation hors fiche : `assigned_to_type` ∈ `student` / `class` / `public`, `optional_deadline`, `is_active`.                                                                                                                                                                                                   |
| `exercise_completions`                     | Vues (`view_count`, `last_viewed_at`) et « terminé » (`completed_at`) d'un élève.                                                                                                                                                                                                                                 |
| `student_exercise_mastery`                 | Auto-évaluation de l'élève par exercice : `not_worked` / `mastered` / `needs_review` (`MASTERY_STATUSES`, `src/lib/types/exercise-mastery.ts`).                                                                                                                                                                   |
| `exercise_curriculum_points`               | Points du programme rattachés à l'exercice (page `exercices/[id]`, API `/api/teacher/curriculum/exercise-tags`). Points neufs seulement, posés sur un nœud de rangement de l'exercice (`exercise_classifications`) ou sur sa notion — règle en base ; détail dans [cours-et-chapitres.md](cours-et-chapitres.md). |
| `exercise_favorites`, `exercise_templates` | Lues seulement par la sauvegarde admin (`src/lib/server/admin/exercise-backup.ts`) ; aucun écran.                                                                                                                                                                                                                 |

`src/lib/types/exercise-row.ts` (`toExercise`) convertit la ligne brute en type métier `Exercise` :
une catégorie inconnue devient `automatisme`, un mode de distribution inconnu `on_demand`.

## Accès (RLS et gardes)

- **Lecture de `exercises`** (policies permissives, combinées en OU) : l'auteur (`Teachers can
view own exercises`, `created_by = auth.uid()`, depuis 20260618093000 : un prof ne lit plus les
  exercices des autres) ; tout le monde, anonyme compris, si `is_public` ; l'élève par
  `student_has_exercise_access(id)`. Écriture et suppression : l'auteur.
- **Jeton de partage** : aucune policy ne l'ouvre (les deux policies « à tout le monde » ont été
  retirées par 20260902101000, finding H8 : elles exposaient tout exercice partagé). L'accès passe
  par la RPC `SECURITY DEFINER` `get_exercise_by_share_token(p_token)`, qui exige le jeton exact,
  actif et non expiré, met à jour `last_accessed_at` et incrémente `access_count` (depuis
  20261016100800 ; la page `[id]` affiche ce nombre d'accès).
- **Accès élève hors fiche** : `student_has_exercise_access(p_exercise_id, p_student_id)`
  (dernière version : 20261003230000) = exercice public, ou affectation active directe, à une
  classe dont l'adhésion est **active** (20260912150000 : l'élève archivé perd les exercices de
  la classe quittée), ou `public`. Garde d'appelant : son propre compte, ou prof/admin.
  ⚠️ La fonction a deux surcharges, que le générateur de types saute : l'appel passe par
  `callExerciseAccess` (`exercise-assignments.ts`), seul contournement de typage du module.
- **Maîtrise** : l'élève lit et écrit ses lignes ; le prof (et l'admin) **lit** celles des élèves
  de ses classes (`is_teacher_of_student`, migration 20261012120000).
- **API** : `requireRole(locals, 'teacher')` sur l'écriture et le partage, puis contrôle
  `created_by === user.id` dans le code (`updateExercise`, `deleteExercise`, partage) en plus de
  la RLS. `deleteExercise` relit la ligne supprimée (`.select('id')`) : 0 ligne (refus RLS
  silencieux) → `EXERCISE_NOT_DELETED`, que la route `DELETE /api/exercises/[id]` et l'action de
  formulaire rendent en 403, jamais en succès. Routes élève : `requireAuth` ; « terminé » exige
  en plus le consentement (`requireConsent(profile, 'submit_exercise')`).

## Côté professeur

**Le hub « Contenu »** (`dashboard/teacher/contenu/`, vérifié le 2026-10-13) : `+layout.svelte`
pose cinq onglets (`GroupedRouteLayout`) — Templates (modèles de chapitre,
[cours-et-chapitres.md](cours-et-chapitres.md#modèles-de-chapitre)), Exercices (ci-dessous),
Énigmes ([jeux-et-economie.md](jeux-et-economie.md)), Worksheets ([fiches-et-pdf.md](fiches-et-pdf.md)),
Notebooks ([python/README.md](python/README.md)). `+page.server.ts` redirige (308) vers l'onglet
Templates. Le hub n'a pas de garde à lui : celle de `dashboard/teacher/+layout.server.ts`
(prof seul, 403 sinon) s'applique, et certains onglets en ajoutent une.

| Page (`dashboard/teacher/contenu/exercices/`) | Rôle                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `+page`                                       | Liste (`getTeacherExercises` au chargement, `/api/teacher/exercises` pour filtrer), aperçu (`ExerciseDisplay mode="template"`), export / import groupés, suppression (action de formulaire).                                                                                                            |
| `new/`                                        | `ExerciseForm` → `POST /api/exercises`.                                                                                                                                                                                                                                                                 |
| `[id]/`                                       | Édition (`ExerciseForm` → `PUT /api/exercises/[id]`), énoncé et correction rendus, JSON, PDF (Typst, `generateExerciseTypst`), liens de partage, points du programme (par niveau de l'exercice, ceux de ses notions de rangement ; non rangé → aucun, l'écran le dit). Réservée à l'auteur (403 sinon). |
| `[id]/assign/`                                | Affectation à des élèves, des classes, ou publique (`POST/GET /api/exercises/[id]/assign`, suppression par `/api/exercises/assignments/[assignmentId]`).                                                                                                                                                |

**`ExerciseForm.svelte`** est l'éditeur : titre, slug (format `^[a-z0-9][a-z0-9-]*[a-z0-9]$`,
3 à 100 caractères ; proposé par `/api/exercises/generate-slug` à partir du `topic`), source,
catégorie, notion (`topic`), niveaux (`GradeBadgeSelector`), étiquettes (`TagBadgeSelector`),
visibilité (`ExerciseVisibilityFields`), un onglet par niveau de guidage (`VariationEditor`, décrit
par [questions.md](questions.md), avec `BareGreekWarning`), ressources (`ExerciseResourceEditor` ; adresse http(s) seulement, refusée sinon par Zod à
l'écriture comme à l'import),
fonctions génériques (`GenericFunctionInput`), import LaTeX (`LaTeXImportDialog`). À l'envoi, le
formulaire écrit **toujours** `variations` ; `shared` n'est envoyé que s'il porte quelque chose ;
`search_indexed` vaut `isPublic && searchIndexed`.

Chaque niveau de guidage porte, en plus de l'énoncé et de la correction, des **réponses**
facultatives (`answers_md`, et `translations.en.answers_md`) : les résultats seuls, sans détail,
imprimés dans le PDF « Réponses » de la fiche ([fiches-et-pdf.md](fiches-et-pdf.md)). Carte
« Réponses (sans détail) » de `VariationEditor`, sous la correction ; vidée, la clé disparaît. Zod
(`exerciseVariationSchema`, `exerciseTranslationsSchema`, 50 000 caractères) ; les schémas de
réponse et de relecture d'un signalement (`validation/worksheets.ts`) déclarent `answers_md` et
`translations`, que la page de relecture renvoie avec la variation entière (avant, la traduction y
était retirée en silence puis effacée à l'enregistrement).

Autour : `ExerciseRichTextEditor` / `ExerciseMarkdownPreview` (aperçu de `LaTeXImportDialog`),
`HintEditor` et `HintTranslationEditor` (indices et leur traduction), `ImageUploader` et les
réglages d'image (`ImageAttributePanel`, `ImageSizeSelector`, `ImageAlignmentSelector`,
`ImageCaptionInput`), `ExportDialog` / `ImportDialog`.

**Images** : `POST /api/exercises/images` (prof ou admin) contrôle type, signature binaire
(`IMAGE_MAGIC_BYTES`, `validation/image-upload.ts`, partagé avec les captures des signalements),
5 Mo et 10 000 px au plus, puis envoie dans le bucket `exercise-images`
(`src/lib/exercises/services/image-upload.ts`).

## Affichage

**`ExerciseDisplay.svelte`** rend un exercice (`MarkdownRenderer`) en deux modes :

- `template` (aperçus du prof) : graine aléatoire ;
- `instance` (élève) : graine fixée par `distribution_mode` — `per_student` →
  `generateStudentSeed(exercise.id, userId)`, `per_group` → `generateGroupSeed(exercise.id,
groupId)`, `on_demand` → nouvelle instance à chaque tirage (bouton « Nouveau problème »). Une
  prop `seed` explicite l'emporte. Les boutons de tirage (« Autres valeurs », « Nouveau
  problème ») s'affichent dès que l'exercice a des variables, où qu'elles soient
  (`isParameterized` : `shared.variables`, `variations[].variables`, ou l'ancienne colonne
  `variables`).

Il fournit aussi aux formules le sens de `AB` (voir plus bas) et les fonctions génériques de
l'exercice. Ses utilisateurs : liste et aperçus du prof, page publique, page élève.

**Page publique** `(public)/exercice/[slug]` : cherche par jeton (`?token=`), puis par slug, puis
par identifiant si le paramètre est un UUID. Le jeton prime : valide mais pour un autre exercice
que celui de l'adresse (slug renommé depuis le lien, ou jeton d'un autre exercice), il redirige
(307, query gardée) vers `/exercice/<slug ou id>` de son exercice — un ancien lien marche encore et
l'adresse affichée n'est jamais trompeuse. Jeton invalide : l'exercice de l'adresse s'il est public,
sinon 403 (message du jeton) ou 404. `?variation=` et `?seed=` fixent le niveau de guidage et la
graine.
`noindex` partout **sauf** exercice public coché « Afficher sur Google » ouvert **sans** jeton.

**Page élève** `dashboard/student/exercises/` : la liste lit `/api/exercises/assigned`
(`getAssignmentsForStudent`) ; `[id]` vérifie l'accès (`/api/exercises/[id]/access`), affiche
l'exercice (`ExerciseDisplay mode="instance"`), enregistre une vue (`POST …/view`) et le
« terminé » (`POST`/`DELETE …/complete`, dans `exercise_completions`).

## Partage par jeton

`POST /api/exercises/[id]/share` (auteur seulement) crée un jeton (`generateShareTokenString` :
16 caractères tirés par CSPRNG, sans `0 O l I`), expiration 7 / 30 / 90 jours ou aucune, et rend
l'adresse `/exercice/<slug ou id>?token=…` (`buildShareUrl`). `GET` liste les jetons,
`DELETE …/share/[tokenId]` révoque (`is_active = false`, filtré sur l'exercice de l'adresse, avec
`.select()` sans `.single()` : 0 ligne — jeton inconnu, d'un autre exercice ou refus RLS → 404).
Le jeton n'ouvre que l'exercice auquel il appartient, à sa propre adresse (voir la page publique).
La page publique résout le jeton par la RPC ; une adresse à jeton n'est jamais indexée.

## Étiquettes

`src/lib/server/resource-tags.ts` est la **seule** source des étiquettes de toutes les ressources
étiquetables (`TAGGABLE_KINDS` : exercice, question, chapitre, fiche, exercice Python, figure
géométrique stockée `geometry_figure`…).
`syncResourceTags` remplace l'ensemble (suppression puis upsert) et **lève** en cas d'échec : à la
création, un échec d'étiquetage **supprime** l'exercice qui vient d'être créé ; à la mise à jour,
la ligne reste modifiée et l'erreur remonte. `getExercise` / `getExerciseBySlug` rajoutent
`tags: string[]` à la ligne lue. `GET /api/tags` (lisible sans compte, `?kind=` place en tête les
étiquettes déjà utilisées sur ce type) ; `POST /api/tags` : prof ou admin.

Deux sélecteurs partagés vivent à la racine de `src/lib/components/` :

- **`TagBadgeSelector.svelte`** : étiquettes en badges ; lit et crée par `apiPath` (défaut
  `/api/tags`, seul catalogue depuis la fusion de `python_tags`), `kind` ne fait qu'ordonner.
  Appelants : `ExerciseForm` (exercices et exercices Python), `MetadataCards` et `worksheets/new`
  (fiches), pages `presques-evaluations` (prof et publique).
- **`GradeBadgeSelector.svelte`** : niveaux (`GradeCode`) en badges, fenêtre groupée primaire /
  collège / lycée ; `restrictTo` limite les niveaux proposés. Mêmes appelants, plus la liste des
  exercices, les modèles de chapitre (`contenu/templates`) et la liste admin des questions.

## Import, export, sauvegarde

`src/lib/server/exercise-import-export.ts` : export JSON **v2.0** (`exerciseToExportV2` : titre,
source, catégorie, étiquettes, niveaux scolaires, `topic`, `variations`, `shared`,
`generic_functions`, `resources`, `distribution_mode`, plus `statement_md` / `solution_md`
recopiés du premier niveau de guidage ; **pas** le slug, qui doit rester unique) ou Markdown ;
import JSON (v1.0 migré vers les variations, champs relus par Zod : noms de fonction, ressources
http(s), mode connu) ou Markdown. Doublon = même empreinte SHA-256 de `titre:énoncé` parmi
**tous** les exercices de l'importateur (lecture paginée par 1 000, ordonnée par `id`) ; `on_duplicate` : `skip` (défaut), `replace`
(seulement son propre exercice), `create-copy` (titre suffixé « (copie) »). L'import ne porte ni
`is_public` ni `search_indexed` : un exercice importé naît privé.

`/api/admin/exercises/backup` (admin) : sauvegarde JSON ou SQL des tables d'exercices, restauration
avec mot de confirmation ; `backup-stats` compte les lignes. Code : `src/lib/server/admin/exercise-backup.ts`.

## Maîtrise

L'élève pose son auto-évaluation **depuis la fiche** (`ExerciseListItem`, `ExerciseModal`,
[fiches-et-pdf.md](fiches-et-pdf.md)) : `PUT /api/student/exercise-mastery/[exerciseId]` (élève
seulement, vérifie que l'exercice existe, upsert sur `student_id,exercise_id`) ; `GET
/api/student/exercise-mastery` rend toutes les siennes. Le prof la lit sur la page « Progression »
d'une affectation de fiche (`contenu/worksheets/[id]/assignments/[assignmentId]/progress`).
Libellés : « Non travaillé », « Maîtrisé », « À retravailler » (`MASTERY_LABELS`).

## Sens de `AB` (longueur ou produit) — lot 6

Deux majuscules collées dans une formule d'exercice (`~AB^2~`) se lisent selon la **notion** de
l'exercice, sans déclaration : `exerciseCapitalPairs(topic)` (`src/lib/questions/capital-pairs.ts`)
applique la table de contexte des questions — `Graphes et matrices` ou une notion de physique →
**produit**, toute autre notion ou aucune → **longueur**. Le sens est fourni aux formules par
`provideCapitalPairs` dans `ExerciseDisplay` (toutes ses pages), `ExerciseForm` (suit la notion
**saisie**, avant enregistrement) et la page `exercices/[id]` ; le PDF le reçoit par
`generateTypst({ capitalPairs })` ([ubumark.md](ubumark.md), [fiches-et-pdf.md](fiches-et-pdf.md)).
Au 2026-10-12 aucune notion d'exercice en base n'est « produit » : tous les exercices sont lus en
longueur. Journal : [longueurs-segments-progress.md](../archive/wip/longueurs-segments-progress.md).

## Pièges

- **Le contenu est dans `variations`**, pas dans des colonnes : lire par `getExerciseContentSafe`
  (rend des chaînes vides sans niveau de guidage) ; `getExerciseContent` lève.
- **Jointures en chaîne** : `exercise_tags` n'existe plus ; une jointure PostgREST qui la nommait
  passait le typecheck. Étiquettes : `fetchResourceTagNames` / `fetchTagNamesForResources`.
- **`get_student_exercises` rend des lignes**, pas des UUID : `toExerciseIds` vérifie à
  l'exécution (un cast `string[]` passait le typecheck).
- **« Afficher sur Google » exige « public »** (CHECK 23514) : `createExercise` refuse avec
  `SearchIndexedRequiresPublicError`, `updateExercise` écrit `search_indexed: false` dans la même
  requête quand l'exercice devient privé.

## Écarts connus

- **`GET /api/exercises`** a un appelant (`ExerciseSelector`, éditeur de fiche) : gardée. Les
  routes `by-slug/[slug]`, `[id]/stats`, `[id]/export` et `ExerciseParameterizationEditor.svelte`,
  sans appelant, ont été retirées le 2026-10-12.
- **`exerciseFont.svelte.ts` sans effet** : le store (police d'affichage des exercices, clé
  `localStorage` `exerciseFont`, variable CSS `--exercise-font-family` lue par `app.css`) n'a qu'un
  importeur, `FontSelector.svelte`, lui-même sans importeur
  ([coquille-et-caches.md](coquille-et-caches.md)) : la police reste celle de `app.css` (Inter).
- **Libellés du hub sans accents ni français** : « Contenu pedagogique », « Gerez », « Enigmes »,
  et les onglets « Templates », « Worksheets », « Notebooks ».
