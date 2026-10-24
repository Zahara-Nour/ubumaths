---
couvre:
  - 'src/lib/server/{chapter*,chapters*,content-owner,template-content,template-guard,class-sessions,course-share-tokens,curriculum*,journal*,programme-tree,programme-tags}.ts'
  - 'src/lib/server/validation/{chapter*,chapters,curriculum,journal,academic}.ts'
  - 'src/lib/server/progression/**'
  - 'src/lib/server/programmes/**'
  - 'src/lib/programmes/**'
  - 'static/programmes/**'
  - 'src/lib/components/{cours,journal,progression,programme}/**'
  - 'src/lib/components/templates/{Chapter,Template}*.svelte'
  - 'src/lib/components/templates/{index.ts,__tests__/**}'
  - 'src/lib/components/{ClassScheduleGrid,ScheduleEntryModal}.svelte'
  - 'src/lib/types/{chapter*,chapters,journal,academic_periods_types}.ts'
  - 'src/lib/utils/{academic-period,class-sessions,schedule,timetable,week-config,timeMatching,programme-tree,programme-map,template-select-items}.ts'
  - 'src/routes/api/teacher/{chapters,chapter-templates,curriculum,periods}/**'
  - 'src/routes/api/student/{chapters,checklist}/**'
  - 'src/routes/(protected)/dashboard/teacher/{cours,cahier-texte,avancement,programme}/**'
  - 'src/routes/(protected)/dashboard/teacher/contenu/templates/**'
  - 'src/routes/(protected)/dashboard/student/{cours,cahier-texte,progression,notions}/**'
  - 'src/routes/(public)/cahier/**'
  - 'src/routes/(public)/cours/**'
---

# Le cours : chapitres, cahier de texte, programme

> Première doc de cette zone. Elle verse ce qui reste vrai des journaux archivés
> ([mon-cours-chapitres](../archive/wip/mon-cours-chapitres-progress.md),
> [chapitre-sections-spec](../archive/wip/chapitre-sections-spec.md),
> [séries dans un chapitre](../archive/wip/series-de-questions-dans-un-chapitre-spec.md),
> [cahier de texte, travaux multiples](../archive/wip/cahier-texte-travaux-multiples-progress.md),
> [suivi du programme](../archive/wip/suivi-programme-progress.md),
> [progression élève](../archive/wip/progression-eleve-progress.md)) et du chantier clos
> [publication progressive](../wip/publication-progressive-progress.md).
> Vérifié contre le code le 2026-10-10 ; lectures des points neufs (C5, étape 3, B1, B2 et D — progression élève) le 2026-10-21 ; filtres de l'ancienne génération retirés (C5, après l'étape 4) le 2026-10-22 ; vue « Carte » de la page Programme le 2026-10-23.

## À quoi ça sert

Trois surfaces du même métier, celui du professeur qui fait cours à une classe :

1. **Mon cours** : les **chapitres** de chaque classe, rangés en **sections**, avec leurs
   contenus (documents, exercices, fiches, objectifs à cocher, séries de questions de cours). Le
   prof prépare tout, puis **publie au fur et à mesure**. Un chapitre peut venir d'un **modèle de
   chapitre** et en recevoir les mises à jour.
2. **Le cahier de texte** : une **séance** par classe et par date, avec ce qui a été fait, ses
   **activités**, et ses **travaux à faire** (chacun avec son échéance). L'élève le lit dans son
   tableau de bord ; une famille sans compte le lit par un **lien de partage**.
3. **Le programme** : l'arbre `curriculum_*` d'un niveau, éditable par le prof (page
   **Programme**), sa **couverture** par les séances (page **Avancement**) et la **progression**
   de l'élève (page « Ma progression »).

Vocabulaire : [CONTEXT.md](../../CONTEXT.md) §« Le cours » (chapitre, modèle, instanciation,
fiche, cahier de texte, les **trois sens de « publier »**) et §« Le référentiel pédagogique »
(thème, objectif, point du programme). Ne pas confondre le **chapitre de Mon cours**
(`class_chapters`, propre à une classe) avec le **chapitre de classement** des exercices de
l'[ADR 0018](../adr/0018-chapitres-liste-tenue-par-le-prof.md), remplacé par la notion de
l'[ADR 0019](../adr/0019-classement-branche-notion-sous-notion.md).

Docs voisines, à lire plutôt que recopier :

- les tables, leurs policies et `published_at` : [base-de-donnees.md](base-de-donnees.md),
  domaine « Chapitres et cahier de texte » ;
- les fiches, leur distribution et la fiche ouverte depuis le cahier public :
  [fiches-et-pdf.md](fiches-et-pdf.md) ;
- les séries et l'entraînement libre : [questions.md](questions.md) ;
- le **paquet d'un chapitre** (révision espacée des questions de cours) et `chapter_decks` :
  [srs.md](srs.md) ;
- le contenu des programmes officiels : [programmes/](programmes/).

## Carte du code

### Mon cours — serveur (`src/lib/server/`)

| Fichier                    | Rôle                                                                                                                                                                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chapters.ts`              | CRUD des chapitres et de leurs contenus (documents, objectifs, exercices, fiches) ; lectures élève `getStudentChapters`, `getChapterWithContent`, `toggleChecklistItem`, `getMyChecklistProgress`.                                                                                                        |
| `chapters-publication.ts`  | `setContentPublication` : écrit `published_at` sur un contenu, via la table de correspondance **fermée** `TABLES` (type de contenu → table) ; `listDistributedWorksheetIds`.                                                                                                                              |
| `chapter-sections.ts`      | Sections : `listSections`, `createSection`, `renameSection`, `deleteSection`, `reorderSections`, `assignToSection`, `placeInSection`.                                                                                                                                                                     |
| `chapter-series.ts`        | Séries rattachées : `linkSeries`, `setSeriesForm`, `unlinkSeries`, `listChapterSeries`, `listAvailableSeries` ; erreurs typées `ChapterSeriesError` (→ 404 / 409 / 500).                                                                                                                                  |
| `chapter-plan.ts`          | `buildChapterPlan` : le plan du chapitre **tel que l'élève le voit** (sections dans l'ordre, `UNASSIGNED_SECTION_ID` pour le non-classé).                                                                                                                                                                 |
| `course-share-tokens.ts`   | Lien du cours (ADR 0025) : `getActiveCourseShareToken`, `rotateCourseShareToken`, `revokeCourseShareToken` (rend le nombre de lignes relues), `resolveCourse{ShareToken,WorksheetByShareToken,DocumentByShareToken}` (charges validées par Zod), `buildPublicCourseView`.                                 |
| `chapter-templates.ts`     | Modèles : CRUD, `publishTemplate`, `archiveTemplate`, `instantiateTemplate` (lien), `detachChapterFromTemplate` (copie puis délie), `createTemplateFromChapter` (copie puis adoption), `deleteChapterTemplate` (refus si relié), `getInstantiationWithStatus` (rattachement affiché, `null` sans modèle). |
| `chapter-template-copy.ts` | Aides de « Faire un modèle » : `readChapterContent`, `copyContentToTemplate` (lignes et fichiers copiés chez le modèle), `adoptMappedRows` (le chapitre adopte ses copies), `LINKED_TABLES_SECTIONS_LAST`. Sans module virtuel SvelteKit : importable par `tsx`.                                          |
| `template-content.ts`      | Contenu POSSÉDÉ par un modèle (ADR 0029) : `listTemplateContent`, `templateHasContent`, `retireTemplateElement`, `copyStoredFile`, `removeStoredFiles`.                                                                                                                                                   |
| `content-owner.ts`         | Propriétaire d'un contenu (`ContentOwner` : chapitre ou modèle) : colonne, insertion, dossier `chapters/<id>/` ou `templates/<id>/`, chemin neuf d'un fichier.                                                                                                                                            |
| `template-guard.ts`        | `requireOwnedTemplate` : UUID valide, modèle existant, auteur = utilisateur (400 / 404 / 403), pour les routes et actions du contenu d'un modèle.                                                                                                                                                         |

Validation Zod : `src/lib/server/validation/{chapters,chapter-sections,chapter-series,chapter-templates,chapter-documents}.ts`
(`chapter-documents` : types MIME, plafond 25 Mo, `isPathInFolder` pour un dépôt de modèle).
Types : `src/lib/types/chapters.ts` (convertisseurs `dbChapterToApp`…, `ChapterContentType`) et
`src/lib/types/chapter-templates.ts` (`TemplateContent` et ses éléments `Template*`,
`ChapterTemplate`, `InstantiationWithStatus` ; aucune colonne de l'ancien système de versions
n'y est lue). Les éléments de chapitre portent `sourceId` (élément du
modèle relié, `null` si propre) et `hidden` (masqué dans ce chapitre).

### Mon cours — pages et API

- Prof : `src/routes/(protected)/dashboard/teacher/cours/` — liste par classe, puis
  `[classId]/` (chapitres de la classe : actions `create`, `update`, `delete`, `reorder`,
  `toggleVisibility`, `instantiateFromTemplate`, `shareCourseLink`, `revokeCourseLink`), puis `[classId]/[chapterId]/` (éditeur :
  actions `setPublication`, `setHidden`, `setSectionHidden`, `linkExercise`, `linkWorksheet`, `linkSeries`, `setSeriesForm`,
  `createTemplate`, `detachFromTemplate`,
  objectifs…).
- Élève : `src/routes/(protected)/dashboard/student/cours/` et `cours/[chapterId]/` (plan du
  chapitre, action `toggleChecklist`).
- Sans compte (ADR 0025) : `src/routes/(public)/cours/[token]/` (tout le cours, chapitre par
  chapitre), `fiche/[id]/` (PDF en lecture) et `document/[id]/+server.ts` (redirection 303).
- Composants : `src/lib/components/cours/` (élève : `ChapterCard`, `ChecklistSection`,
  `ChapterSeriesCard`, `ChapterRevisionButton` → `/dashboard/revisions/chapitres/[chapterId]`) et
  `cours/teacher/` (`ChapterSectionsEditor` + `section-dnd.ts`, `ChapterAddDialogs`,
  `DocumentUpload`, `PublicationToggle`, `StudentProgressTable`, `CourseShareLinkCard`).
  `DocumentCard` accepte des adresses imposées (`hrefs`) et `ChapterSeriesCard` ne demande que
  titre, forme, nombre de questions et lien : la page publique les réutilise. Modèles :
  `ChapterTemplateIndicator` dans `src/lib/components/templates/`.
- **Éditeur partagé chapitre / modèle** (ADR 0029, étape 3c) : `ChapterSectionsEditor`,
  `DocumentUpload` et `ChapterAddDialogs` (les boîtes d'ajout : objectif, exercice, fiche, série,
  document) prennent `chapterId` OU `templateId`. Le propriétaire choisit la base des routes
  d'API ; les actions de formulaire (`?/linkExercise`, `?/deleteDocument`…) portent les mêmes noms
  sur les deux pages. Côté modèle : ni publication ni distribution, la suppression s'appelle
  « Retirer du modèle ». Côté chapitre lié : un élément du modèle (`sourceId`) porte la marque
  « Modèle », ne se corrige ni ne se supprime (ni crayon d'objectif, ni forme de série, ni
  corbeille ; une section du modèle ne se renomme ni ne se supprime) — il se **masque**
  (`?/setHidden`). Un élément masqué quitte le plan ; l'interrupteur « Afficher ce qui est
  masqué (n) » (éléments et sections) le fait revenir, barré, sans publication, avec « Réafficher » ; il s'éteint de
  lui-même quand le dernier masqué est réaffiché (`$derived` écrasable). Le masquage et le lien
  (`sourceId`, éléments et sections) entrent dans l'empreinte d'affichage (`empreinteAffichage`) :
  sinon un élément masqué resterait à l'écran, et un chapitre détaché garderait ses marques
  « Modèle » et des « Masquer » en 404. Ranger une zone masqués cachés enregistre la zone
  ENTIÈRE : chaque masqué reprend sa place après l'élément qu'il suivait (`avecMasquesASaPlace`),
  jamais à égalité de rang avec un visible.
  `ChapterTemplateIndicator` dit « Chapitre lié au modèle « X » » (lien vers sa page) et
  « Détacher du modèle », que la page confirme (`ConfirmDialog`) avant `?/detachFromTemplate`.
- **Section masquée** (décision du 2026-10-14, migration `20261016103600_section_masquee`) :
  dans un chapitre, chaque section — du modèle ou propre à la classe — porte « Masquer la
  section » (icône), après une confirmation qui dit que son contenu sera dépublié ; action
  `setSectionHidden` (`setChapterSectionHidden` dans `chapters-publication.ts` : filtre
  `chapter_id`, ligne écrite vérifiée, 404 sinon). La base masque et dépublie alors tout son
  contenu (`section_masquee_propage`), et la réafficher le fait revenir non publié. Dans le plan,
  une section masquée compte UNE fois dans l'interrupteur (son contenu n'est pas recompté),
  disparaît, et revient barrée (« Masquée », « Réafficher la section ») quand l'interrupteur est
  allumé — sans renommer, supprimer, ajouter, ni geste par élément. Rien ne s'y range : sa zone
  refuse le glisser-déposer dans les deux sens, et le menu « Ajouter » n'y est pas (un élément
  y naîtrait publiable ; sorti, il resterait masqué ailleurs). Réordonner les sections garde
  son rang à une section masquée cachée (`avecMasquesASaPlace`). Côté élève et lien de
  consultation, rien à filtrer : une section n'y paraît que si elle porte un contenu publié, et
  celui d'une section masquée ne l'est jamais. La page du modèle n'a pas ce bouton.
  **Le serveur le garde aussi** (2026-10-15) : `assignToSection` (donc `placeInSection` et les
  routes `sections/assign`) refuse de ranger un élément VISIBLE dans une section masquée
  (`hiddenSection`, 409) — réordonner son contenu déjà masqué reste permis ; `setLinkedElementHidden`
  refuse de réafficher seul un élément d'une section masquée (`sectionHidden`, 409 « réaffichez la
  section d'abord »). Test : `tests/integration/sections-masquees-serveur.test.ts`.
- Un chapitre caché (`is_visible` faux) se dit « Invisible des élèves » ; « Masqué » est réservé
  à ce qu'une classe écarte de son plan.
- API appelées par l'interface : `api/teacher/chapters/[id]/sections/**` (éditeur de sections),
  `api/teacher/chapters/[id]/document-upload-url` et `…/documents` (dépôt d'un fichier), et leur
  miroir pour un modèle : `api/teacher/chapter-templates/[id]/sections/**`,
  `…/document-upload-url`, `…/documents` (seules routes restantes sous
  `api/teacher/chapter-templates/`). Le reste de `api/teacher/chapters/**`,
  `api/student/chapters/**` et `api/student/checklist/**` n'a pas d'appelant dans `src/` (voir
  « Écarts connus »).

### Cahier de texte

| Fichier (`src/lib/server/`) | Rôle                                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journal.ts`                | Séances : `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`, `getJournalEntriesForWeek` (vue semaine prof), `getUpcomingHomework` (élève). |
| `journal-homework.ts`       | Travaux à faire : `resolveHomeworkItems` (règle des échéances), `prepareHomeworkForEntry`, `setHomeworkForEntry` (RPC `set_journal_entry_homework`).      |
| `journal-activities.ts`     | `parsePendingActivities` : activités choisies sur une séance pas encore enregistrée, relues à l'action `create`.                                          |
| `journal-share-tokens.ts`   | Lien de partage : `rotateShareToken`, `revokeShareToken`, `getActiveShareToken`, `resolveShareToken`, `resolveWorksheetByShareToken`.                     |
| `class-sessions.ts`         | `getClassSessionCalendar`, `getUpcomingSessionDates` : les jours où la classe a cours (emploi du temps moins vacances).                                   |

Calcul pur : `src/lib/utils/class-sessions.ts` (`computeSessionDates`, `isSessionDate`,
`DEFAULT_SESSION_LIMIT`). Validation : `src/lib/server/validation/journal.ts`. Types :
`src/lib/types/journal.ts`.

Pages : `src/routes/(protected)/dashboard/teacher/cahier-texte/` (semaine ; actions `shareLink`,
`revokeShareLink`) et `cahier-texte/[classId]/[date]/` (éditeur de séance : `create`, `update`,
`delete`, `publish`) ; `src/routes/(protected)/dashboard/student/cahier-texte/` et
`[entryId]/` ; `src/routes/(public)/cahier/[token]/` (sans compte). Composants :
`src/lib/components/journal/` (`JournalWeekGrid`, `JournalEntryCard`, `HomeworkCard`,
`JournalDatePicker`).

### Programme, couverture, progression

| Fichier                                                     | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/curriculum.ts`                              | `curriculumDbError` (erreur Postgres → HTTP). L'ancien arbre (`getCurriculumTree`, thème → objectif → point) a disparu à l'étape 3 (B2).                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/lib/server/programme-tree.ts`                          | `getProgrammeTree` : points d'un niveau et leurs nœuds, lus explicitement (pas de `!inner`) ; `getProgrammeTreeKeeping` : le même, archivés masqués sauf ceux qu'on lui donne (déjà cochés ou tagués) ; `loadNodesWithAncestors`, `PROGRAMME_POINT_COLS` ; `getProgrammeMap` : l'arbre **complet** (nœuds actifs lus par pages de 1 000, plafond PostgREST) et les points actifs du niveau, plus les nœuds archivés qui portent encore un point.                                                                                                   |
| `src/lib/utils/programme-tree.ts`                           | `buildProgrammeTree` (branche > notion > points ; ordre de l'arbre `position` puis nom, ordre du BO `display_order`), `filterTreePoints` (notions et branches vidées retirées), `hideArchivedPoints` (archivés gardés sur demande), `taggableNodeIds` (nœuds où un exercice peut prendre un point), `countArchivedPoints`, `placeOfNode` (notion et branche d'un nœud, `null` si un maillon manque).                                                                                                                                               |
| `src/lib/utils/programme-map.ts`                            | `buildProgrammeMap` : la carte, arbre complet branche > notion > sous-notion, points du niveau en feuilles (sur leur notion ou leur sous-notion), compteurs attendus / approfondissements descendants compris ; points archivés exclus, nœud archivé gardé seulement s'il porte un point ; nœud introuvable, point sur une branche, exigence ou type inconnus → erreur. `hideEmptyNodes`, `countsLabel`, `kindLabel` (type du point en français), `defaultOpenIds`, `pointHolderIds`, `branchColor` (palette du diagramme de l'arbre), `linkPath`. |
| `src/lib/components/programme/ProgrammeMap.svelte`          | La carte mentale d'un niveau, une par branche, de gauche à droite. Boîtes en HTML (les libellés portent des maths, rendues par `InlineMarkdown`) ; seules les courbes sont en SVG, recalculées depuis la position des boîtes (attachment : `ResizeObserver` + `MutationObserver` sur l'arbre, le SVG étant hors de l'élément observé).                                                                                                                                                                                                             |
| `src/lib/programmes/official-programmes.ts`                 | `OFFICIAL_PROGRAMMES` : le texte officiel (BO) de chaque niveau — titre, PDF de `static/programmes/`, morceaux de transcription ; `null` pour la terminale générale (pas de maths au tronc commun). Un cycle = un PDF pour ses trois niveaux ; `cycleTranscription` liste les morceaux d'un niveau de cycle (domaines de `CYCLE_DOMAINS`, dans l'ordre du BO).                                                                                                                                                                                     |
| `src/lib/server/programmes/transcriptions.ts`               | `getTranscription` : la transcription ubumark d'un niveau, morceaux de `transcriptions/**/*.md` mis bout à bout (un sous-dossier `cycle-N/` par cycle) ; `null` si un morceau manque. Tous les niveaux qui ont des maths sont transcrits. Texte du BO mot à mot ; prettier ignore le dossier (il abîme l'ubumark).                                                                                                                                                                                                                                 |
| `src/lib/components/programme/OfficialProgrammeView.svelte` | Le BO d'un niveau : PDF dans le lecteur du navigateur (`<iframe>` : la CSP `object-src 'none'` bloque `<embed>`), liens « Ouvrir le PDF dans un onglet » et « Télécharger » ; ou la transcription rendue par `MarkdownRenderer` (mots du lexique désactivés), titres `##` et `###` dans une seule couleur d'accent (`--color-curve-1`, filet sous `##`), les autres en couleur du texte.                                                                                                                                                           |
| `src/lib/server/curriculum-coverage.ts`                     | `reconcileAutoCoverage` : recalcule la couverture **auto** d'une séance ; `evaluationCurriculumPoints`. Ne compte que les points **non archivés**.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/lib/server/curriculum-grade.ts`                        | `keepLinksOfGrade` : une carte rattachée à plusieurs niveaux ne compte que pour celui qu'on lit.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/lib/server/curriculum-point-status.ts`                 | `readPointStatus` et `keepCheckablePointIds` : le point est-il lisible et non archivé, demandé à la base avant d'écrire (un point archivé ne se coche ni ne se tague). Depuis l'étape 4 de la C5, tout point porte un nœud (`node_id` NOT NULL) — [ADR 0020](../adr/0020-arbre-central-programmes-pointeurs.md).                                                                                                                                                                                                                                   |
| `src/lib/server/programme-tags.ts`                          | `loadTemplateProgrammeTags` : les choix de tags d'un modèle, un par programme, parmi les points de son nœud et de sa notion.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/lib/server/progression/student-progression.ts`         | Source **unique** de la progression élève : `getNotionsProgression` (branche > notion), `getNotionDetail` (page d'une notion), `aggregateNotionStats`, `getCompetencesProgression`.                                                                                                                                                                                                                                                                                                                                                                |

- `dashboard/teacher/programme/` : **consultation** du programme d'un niveau dans la génération
  neuve (ADR 0020, C5 étape 3) — branche > notion > points du niveau, dans l'ordre du BO ; seules les
  branches et notions qui portent un point du niveau apparaissent (un point sur une sous-notion compte
  pour sa notion, dont il affiche le nom). Un point sans niveau n'y apparaît jamais. Quatre vues
  (`?vue=`, validé par Zod, liste par défaut ; seule la vue demandée est lue) : **BO (PDF)** et
  **BO (texte)** (`pdf`, `texte`) montrent le programme officiel du niveau (PDF du cycle pour les
  niveaux de cycle, ouvert au sommaire : le BO y est rangé par domaine puis par niveau ; transcription
  d'un niveau de cycle = `cycle-N/commun` (titre, Principes), puis pour chaque domaine son
  introduction commune `cycle-N/<domaine>` et la partie du niveau `cycle-N/<niveau>-<domaine>`) ; la **liste**
  (renommer, archiver) et la **carte** (lecture seule) — l'arbre complet, nœuds sans point du niveau
  grisés (case « Masquer les nœuds vides »), approfondissements en pointillé, type de chaque point nommé (connaissance, savoir-faire, démonstration, algorithme), compteurs
  « N att. · M approf. » ; ouverte jusqu'aux sous-notions, points repliés ; clic sur une branche ou
  une notion : plier ses enfants, sur une sous-notion ou « N points sur la notion » : ses points.
- `api/teacher/curriculum/points/[pointId]` : **PATCH** `{ name?, archived? }` seulement (objet
  strict : tout autre champ → 400 ; libellé 1 à 500 caractères). L'écriture vérifie la ligne rendue (point
  inconnu ou RLS silencieuse → 404). Créer, supprimer, déplacer ou réordonner un point passe par une migration (le
  BO fait foi) : les routes `themes/**`, `objectives/**`, `points` (GET/POST), `points/reorder` et le
  DELETE d'un point ont été retirés à l'étape 3.
- `api/teacher/curriculum/{activities,coverage}` : activités et couverture **manuelle** d'une
  séance (éditeur de séance).
- `api/teacher/curriculum/exercise-tags` et `template-tags` : rattacher un exercice ou un modèle
  de questions à des points (pages d'édition d'exercice et de question). L'édition admin d'un
  modèle propose **un choix par programme** (MySelect), parmi les points du nœud du modèle et de sa
  notion (règles 1 et 2 posées en base) ; un modèle sans nœud se range d'abord. L'édition d'un
  exercice propose, pour chacun de **ses niveaux** (et ceux de ses points déjà tagués, pour
  pouvoir les retirer), les points posés sur l'un de ses nœuds de
  rangement ou sur leur notion (règle 1, en base aussi) ; un exercice non rangé n'en reçoit aucun, et
  aucun écran ne range un exercice (rangements posés par migration).
- Écritures de points (POST `coverage`, POST `exercise-tags`, points cochés à la création d'une
  séance) : un point archivé est refusé (**400** « Point archivé »), ou écarté à la création.
  Les DELETE de `coverage`, `exercise-tags` et `template-tags` relisent la ligne supprimée (zéro
  ligne → **404**, que l'écran traite comme « déjà retiré »).
- `dashboard/teacher/avancement/` : nombre de séances de l'année par point, en lecture seule, sur
  l'arbre branche > notion > points du niveau de la classe.
- `dashboard/student/progression/` : deux onglets, `src/lib/components/progression/`
  (`NotionsPanel`, `CompetencesPanel`) ; le tableau de bord lit la même source. « Ce que je sais
  faire » montre les points neufs actifs du niveau de l'élève, par branche > notion ; une notion
  est non commencée, en cours ou atteinte (tous ses points acquis, `notionLevel`), sans
  « maîtrisé » (aucun point neuf n'a de rang). Un point sans modèle tagué compte dans le total.
  Élève sans niveau, ou niveau sans point : message au lieu d'un « 0 sur 0 » (un niveau valide
  sans point est journalisé : RLS ou code de niveau décalé).
- `dashboard/student/notions/[id]` : les points d'une notion pour le niveau de l'élève (ordre du
  BO, sous-notion nommée, « Pas encore d'entraînement ici » sans modèle tagué) ; notion inconnue
  ou sans point de son niveau → **404**. L'ancienne page d'un objectif
  (`dashboard/student/objectifs/[id]`) redirige vers « Ma progression ».

### Calendrier scolaire et emploi du temps

- `src/lib/utils/week-config.ts` : jours ouvrés par école (`DEFAULT_WEEK_CONFIG`,
  `getOrderedSchoolDays`, `isValidWeekConfig`).
- `src/lib/utils/timetable.ts` : grille des heures de cours d'une école (`SchoolPeriod`,
  `validateTimetable`, `createDefaultTimetable`).
- `src/lib/utils/schedule.ts` : affichage des créneaux (`DAY_NAMES`, `formatTime`,
  `formatScheduleDisplay`).
- `src/lib/components/ClassScheduleGrid.svelte`, `ScheduleEntryModal.svelte` : emploi du temps
  d'une classe (`class_schedules`), édité depuis `dashboard/teacher/classes/`.
- `src/lib/utils/timeMatching.ts` : `findCurrentSchedule`, « la classe en cours maintenant »
  (tableau de bord prof, tableau blanc).
- `src/lib/utils/academic-period.ts` : `findCurrentPeriod`, `getPeriodName` (trimestres, tables
  `school_years`, `academic_periods`) ; `api/teacher/periods` les sert au tableau de bord.
- `src/lib/server/validation/academic.ts` : schémas de l'organisation d'une école (années,
  périodes, vacances), utilisés par l'administration des écoles.

## Le modèle

### Chapitre, sections, contenus

Un chapitre (`class_chapters`) appartient à **une** classe. `is_visible` l'ouvre aux élèves ;
chaque contenu (`chapter_documents`, `chapter_exercises`, `chapter_worksheets`,
`chapter_checklist_items`, `chapter_series`) a son propre `published_at`
([ADR 0005](../adr/0005-publication-par-element-acces-herite-de-la-classe.md)). Le **chapitre** est
publié par un booléen, ses **contenus** par une date.

Une **section** (`chapter_sections`) range les contenus par **moment du cours** plutôt que par
type. Elle appartient à un seul chapitre ; un contenu sans section est « non classé ». Les cinq
tables rangeables sont listées deux fois : `CONTENT_TABLES` dans `chapter-sections.ts` et la
migration `supabase/migrations/20260915260000_chapter_sections.sql` (plus
`20261002100000_series_de_chapitre.sql` pour les séries).

Une **série** rattachée reste celle du prof : le lien la suit, son titre et sa composition sont
relus à chaque chargement. L'élève la lance dans la **forme** choisie au rattachement
(`setSeriesForm`), sans note, par le lien de l'entraînement libre (voir [questions.md](questions.md)).

### Publier une fiche = la distribuer

Publier une fiche dans un chapitre la **distribue** immédiatement à la classe ; la dépublier la
retire du chapitre mais **garde l'affectation** (l'élève la retrouve dans « Mon travail »).
Détails : [fiches-et-pdf.md](fiches-et-pdf.md) et le chantier
[publication progressive](../wip/publication-progressive-progress.md).

### Modèles de chapitre

`chapter_templates` (`status` : `draft` → `published` → `archived`) et
`chapter_template_instantiations` (quel chapitre est rattaché à quel modèle, `is_detached`). Seul
un modèle **publié** s'instancie.

Depuis l'[ADR 0029](../adr/0029-le-modele-possede-son-contenu-le-chapitre-le-relie.md)
([journal](../archive/wip/refonte-modeles-chapitre-progress.md)), le modèle **possède son contenu** (mêmes
six tables, colonne `template_id`) et le chapitre lié le **relie** (lignes de lien, `source_id`,
contenu recopié par la base — migration `20261016103300`, voir
[base-de-donnees.md](base-de-donnees.md)).

**L'ancien système « snapshot + versions » est supprimé** (étape 5B, migration
`20261016103800`, accord de David du 2026-10-14) : plus de table `chapter_template_versions`, ni
de `content_snapshot` / `current_version` sur le modèle, ni de numéros de version sur le chapitre
lié ; la règle de stockage élève de prod (`chapters/…`) est retirée — le serveur sert les fichiers
après la garde de publication.

- **Contenu du modèle** : les fonctions du chapitre prennent un propriétaire `ContentOwner`
  (sections : `chapter-sections.ts` ; insertions : `insertDocument`, `insertChecklistItem`,
  `insertExercise`, `insertWorksheet` ; séries : `linkSeries`, `setSeriesForm`). Les fichiers d'un
  modèle vivent sous `templates/<template_id>/…` (mêmes types, même plafond de 25 Mo). La page
  `contenu/templates/[templateId]/` porte les MÊMES noms d'actions que la page du chapitre
  (`addChecklistItem`, `deleteDocument`, `unlinkSeries`…) pour l'éditeur partagé ; sa charge
  rend `content` (`listTemplateContent`). Publier exige un élément non retiré dans les tables
  (`templateHasContent`). ⚠️ Un élément de modèle ajouté DANS une section reçoit
  sa section **à l'insertion** (`nextSectionOrder` puis `insert*(…, placement)`) : la base crée ses
  lignes de lien à l'insertion même, et un rangement après coup les laisserait en « Non classé ».
- **Retirer un élément du modèle** (`retireTemplateElement`, ce que font les actions « supprimer »
  de la page du modèle) : `retired_at` posé, la base supprime les liens non publiés ; puis la ligne
  est supprimée si plus aucun chapitre ne la relie, sinon la base refuse (`RESTRICT`) et elle reste
  retirée. Le fichier n'est supprimé que si la ligne l'a été et qu'aucune autre ligne ne le désigne.
- **Instancier** (`instantiateTemplate`) = créer le chapitre puis `link_chapter_to_template` ; rien
  n'est copié ni publié. Les six sections semées par défaut sont retirées quand le modèle a son
  plan. Lien en échec → le chapitre créé est supprimé.
- **Détacher** (`detachChapterFromTemplate`) : chaque fichier relié est **copié** sous
  `chapters/<id>/…` (une copie en échec arrête tout avant de délier), puis les lignes se délient
  (`source_id` à vide, sections en dernier) avec leur publication, puis `is_detached`. Un élément
  masqué SEUL redevient visible (`hidden = false`), toujours non publié : sinon il resterait figé.
  Une section masquée le reste, et son contenu aussi (masqué, non publié) : la réafficher le fera
  revenir (décision du 2026-10-14).
- **Faire un modèle d'un chapitre** (`createTemplateFromChapter`) : copie du contenu chez le modèle
  (sections d'abord, fichiers copiés sous `templates/<id>/…`) AVANT de créer l'instanciation (sinon
  la base diffuserait des doublons), puis le chapitre **adopte** chaque élément (`source_id`) : mêmes
  identifiants, publications et cases cochées gardées. L'ancien fichier `chapters/…` reste (étape 5).
  Un chapitre déjà rattaché garde son rattachement : copie sans adoption, et sans ce qu'il a
  masqué. Une adoption ratée n'est pas un succès silencieux : `warning` dans le résultat (action
  `createTemplate`).
- **Supprimer un modèle** (`deleteChapterTemplate`) : refusé (`TemplateInUseError`, « archivez-le »,
  409 sur la page) tant qu'un chapitre non
  détaché le relie OU qu'une seule ligne de lien désigne un de ses éléments — vérifié avant de
  toucher au moindre fichier. Sinon la ligne du modèle est supprimée (vérifiée), puis ses fichiers
  `templates/<id>/` par le **client service** (la règle de stockage du professeur exige que le
  modèle existe), strictement dans ce dossier.
- **Dans le chapitre**, une ligne de lien ne se supprime pas (actions `deleteDocument`,
  `deleteChecklistItem`, `unlinkExercise`, `unlinkWorksheet`, `unlinkSeries` et les routes
  `DELETE api/…/documents/[docId]`, `checklist/[itemId]`, `exercises/[linkId]`,
  `worksheets/[linkId]` : 409 « masquez-le ») — le refus vit dans les fonctions mêmes
  (`.is('source_id', null)`, `LinkedElementError`) — et son fichier n'est jamais touché ;
  `setHidden` la masque (et la dépublie) ou la démasque.
- **Servir un fichier** (`api/documents/[id]`) : la ligne est lue avec le client de l'utilisateur
  (garde RLS : élève = chapitre visible de sa classe, document publié), puis le fichier est
  téléchargé avec le **client service** — l'élève n'a aucune règle de stockage sur `templates/…`.
  Le chemin vient toujours de la ligne lue, borné à `chapters/` ou `templates/`.

- **Reprise des modèles à snapshot** (étape 4, faite en prod le 2026-10-14) : le modèle de 1SPE,
  qui n'avait son contenu que dans `content_snapshot`, a reçu ses lignes, son chapitre d'origine
  les a adoptées et le chapitre de 1SPE 2 a été réparé ; l'outil (`migrateSnapshotTemplate` et son script
  `reprise-modeles-adr0029`) a été retiré à l'étape 5 — plus aucun modèle à snapshot.
  Historique : [journal](../archive/wip/refonte-modeles-chapitre-progress.md).

- **Refus d'un modèle inutilisable** : un brouillon ou un modèle archivé fait rendre à
  `instantiateTemplate` une `TemplateUnusableError`, dont le message est écrit pour le professeur
  (« publiez-le d'abord »). Les deux appelants (actions `instantiateFromTemplate` et
  `instantiate`) la rendent en **409**
  avec ce message ; toute autre erreur reste une panne (500, message générique, jamais le texte
  Postgres). Le dialogue « Créer depuis un template » de la page Cours **grise** ces modèles,
  statut dans le libellé (`src/lib/utils/template-select-items.ts`). Avant le 2026-10-14, il
  proposait les brouillons, et le refus s'affichait « Erreur lors de la creation… ».

- **Pages** (onglet « Templates » du hub Contenu, vérifié le 2026-10-13) :
  `src/routes/(protected)/dashboard/teacher/contenu/templates/` — liste (`listChapterTemplates`,
  filtres validés par `listTemplatesQuerySchema`, valeurs par défaut si invalides), `new/`
  (action `create`, `createChapterTemplateSchema`) et `[templateId]/` (plan du modèle dans
  l'éditeur partagé, chapitres liés ; actions `update` — bouton « Modifier », titre et
  description —, `publish`, `delete`, `archive`, `instantiate`, et les actions de contenu
  ci-dessus). Sa charge
  rend `content` et, pour l'éditeur, les titres des exercices, fiches et séries et les listes de
  rattachement (`enrichTemplateContent`). Plus d'historique des versions à l'écran. Prof seul
  (`requireRole`). Tests : `contenu/templates/__tests__/routes.test.ts`.
- **Compteurs** (documents, objectifs, corvées, fiches, séries ; liste des modèles, page du
  modèle, aperçu « Créer depuis un modèle » de la page Cours) : lus
  dans le contenu réel non retiré (`countTemplateContent`, appelé par `listChapterTemplates`).

### Séance et travaux à faire

Une séance (`class_journal_entries`) : une classe, une date, un texte, et `is_published`. Ses
**travaux** (`journal_entry_homework`) ont chacun une échéance, écrits en bloc par la RPC
`set_journal_entry_homework`. Règle de `resolveHomeworkItems` :

- un travail au texte vide est ignoré (avant tout contrôle de date) ;
- sans échéance → le **prochain cours** de la classe ;
- avec échéance, si la classe a un emploi du temps → elle doit être un **jour de cours**
  (`isSessionDate`) ; sinon elle est acceptée telle quelle ;
- une seule échéance refusée → **rien n'est écrit**, l'appelant répond 400.

Les **jours de cours** = jours de `class_schedules` moins les `school_holidays` de l'année
scolaire de l'école (`getClassSessionCalendar`).

**Activités** d'une séance (`journal_entry_activities`) : cinq sortes — `exercise`, `question`,
`assessment`, `course`, `textbook`. Sur une séance neuve, la page les garde et les envoie avec le
formulaire (`parsePendingActivities`).

### Couverture du programme

`journal_entry_points` relie une séance à des points, avec `source` `manual` ou `auto`.
`reconcileAutoCoverage` recalcule l'ensemble `auto` depuis **deux sources unies** : les activités
taguées (exercice, question, évaluation → les questions de sa série) et les ressources **citées
dans le texte** (`[[exercise:…]]`, `[[worksheet_exercise:…]]`…). Il supprime les `auto` périmés,
insère les manquants, ne touche jamais aux `manual`. Quelle que soit la source, seuls les points
**non archivés** comptent (`keepCheckablePointIds`, la règle du coché manuel) : une ligne `auto`
sur un point devenu archivé sort à la réconciliation suivante.
Appelé à **chaque** enregistrement de séance
et à chaque ajout ou retrait d'activité. Recalculé plutôt que figé : une séance de septembre
s'allume quand son contenu est tagué en juin.

Le bloc « Programme travaillé » de l'éditeur de séance coche les points du niveau de la
classe, rangés branche > notion (la sous-notion nommée à côté du point) ; un compteur par branche, un
« cochés / total » par notion.

La page Avancement compte, par point, les séances de l'année (1ᵉʳ septembre → 1ᵉʳ septembre) qui
le couvrent, sur le même arbre. Ses « vus / total » et pourcentages ne comptent que les points
actifs (`coverageStats`) : un archivé travaillé est affiché mais n'y entre pas, et une notion qui
n'a que des archivés n'affiche pas de ratio.

Sur les trois écrans (séance, Avancement, tags d'un exercice), un point **archivé** n'apparaît que
s'il est déjà coché, travaillé ou tagué — marqué « archivé » (`ProgrammePointLabel`), pour qu'on
puisse le décocher. L'API refuse de cocher ou de taguer
un archivé (400 « Point archivé ») ; décocher et retirer un tag restent permis.

### Lien de partage du cahier

`class_journal_share_tokens` : un jeton **actif** par classe (`rotateShareToken` révoque l'ancien),
expirant à la fin de l'année scolaire (`endOfSchoolYear`, 31 août). La page publique passe par
les RPC `get_class_journal_by_share_token` et `get_worksheet_by_share_token` ; elle ne donne
que les séances publiées, et seulement les fiches **citées** dans une séance visible (imprimées
dans le style de la fiche, lot 4b). Jeton
invalide, expiré ou révoqué → **même 404**.

### Lien du cours

[ADR 0025](../adr/0025-cours-lisible-par-lien-sans-compte.md). `class_course_share_tokens`, **calque
distinct** de la table du cahier : le jeton du cahier n'ouvre pas le cours, et inversement. Mêmes
règles de vie : un jeton actif par classe (`rotateCourseShareToken` révoque l'ancien), expiration
au 31 août, révoquer = désactiver. Le professeur le gère sur la page Cours d'une classe
(`CourseShareLinkCard` : copier, renouveler, révoquer ; consultations et expiration affichées).
Révoquer relit ses lignes : zéro ligne désactivée → 404 « Aucun lien actif », pas un faux succès.

Ce que lit un visiteur sans compte, par trois portes seulement :

- `/cours/[token]` — RPC `get_class_course_by_share_token` (anon) : chapitres **visibles** d'une
  classe **active**, et leurs contenus `published_at <= now()`. Le plan est rangé côté serveur par
  `buildPublicCourseView`, avec les règles de `buildChapterPlan` (sections dans l'ordre, objectifs
  groupés, « Non classé » à la fin sans titre). Objectifs en **texte seul**, séries vers
  l'entraînement libre (`buildSeriesLink`, forme du rattachement). Jamais : exercices notés, quiz,
  révisions, progression.
- `/cours/[token]/fiche/[id]` — RPC `get_course_worksheet_by_share_token` : fiche publiée dans un
  chapitre visible **et** distribuée à la classe ; PDF `reader`, sans correction, dans le style de
  la fiche (lot 4b : `style_id`, mise en page d'un style de l'auteur ; voir
  [fiches-et-pdf.md](fiches-et-pdf.md)).
- `/cours/[token]/document/[id]` — RPC `get_course_document_by_share_token`, **réservée au service
  role** (le chemin de stockage ne sort jamais vers le navigateur) ; fichier → URL signée de
  **60 s** (téléchargement forcé hors PDF et images), Drive → l'URL Drive si elle est en `https:`.
  Redirection 303, `noindex`, `no-store`. La table `chapter_documents` n'est jamais lue.

Jeton ou identifiant mal formé (Zod) → 404 **sans** appel à la base ; `null` de la base → le
**même** 404. Toutes les pages sont en `noindex` et exclues du plan du site.

## Invariants

1. **La garde d'accès élève est dans la policy**, pas dans le code : `chapters-publication.ts` ne
   fait qu'écrire une date. Les policies testent `published_at <= now()`, jamais `is not null`
   ([base-de-donnees.md](base-de-donnees.md)).
2. **Le type de contenu venu du client ne choisit jamais une table** : il est cherché dans une
   table de correspondance fermée (`TABLES`, `CONTENT_TABLES`) ; un type inconnu ne produit aucune
   requête.
3. **Écritures sous RLS, toujours relues** : sections et séries passent par `locals.supabase`
   (jamais le service role) et vérifient leurs lignes par `.select()`
   ([rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md)).
4. **Le plan élève masque les sections sans contenu publié**, côté serveur (`buildChapterPlan`) :
   le titre d'une section est lisible dès que le chapitre est visible, un titre comme « Contrôle
   vendredi » fuiterait sinon. Les objectifs d'une section forment **une** liste, à la position du
   premier.
5. **Une mise à jour de modèle n'efface rien** et ne touche ni l'ordre ni `published_at`.
   Retirer un élément du modèle le laisse chez les élèves qui l'avaient reçu (ADR 0029).
6. **Le fichier d'une ligne de lien appartient au modèle** : aucun geste du chapitre ne le
   supprime ; seul le retrait d'un élément du modèle, ligne supprimée et fichier désigné par
   aucune autre ligne, l'efface.
7. **Le client service ne sert un fichier qu'après la garde RLS** de sa ligne
   (`api/documents/[id]`), et seulement un chemin lu sur cette ligne.
8. **Une échéance est un jour de cours**, contrôlée à l'écriture (une requête forgée peut porter
   n'importe quelle date), pas seulement dans le sélecteur.
9. **La couverture `manual` est intouchable** par le recalcul ; le recalcul tourne à chaque
   enregistrement, même sans activité.
10. **Les jetons du cahier et du cours ne font que lire.** Ils ne se confondent jamais avec
    `classes.join_code`, qui inscrit dans la classe, ni entre eux.
11. **Progression élève : une seule source**, `student-progression.ts`. Deux agrégations
    divergentes ont déjà affiché 0 sur le tableau de bord et 20/20 sur la page.
12. **Lecture d'un programme à un niveau** : tags dont le point est lisible (jointure non nulle), puis
    `keepLinksOfGrade` sur les liens carte → point, avec le niveau lu sur le point (`grade`).

## Comment étendre

- **Nouvelle garde côté élève** (policy d'un contenu de chapitre) : la reporter dans les trois
  fonctions du lien du cours, qui la refont à la main (ADR 0025).
- **Nouveau type de contenu de chapitre** : l'ajouter à `ChapterContentType`, à `TABLES`
  (`chapters-publication.ts`, le `satisfies` casse sinon), à `CONTENT_TABLES`
  (`chapter-sections.ts`, rien ne casse sinon : le type ne serait jamais rangeable), à
  `buildChapterPlan`, au lien du cours s'il doit y être lisible (fonction SQL, schéma Zod et
  `buildPublicCourseView` — sinon il n'y apparaît pas), à la migration (colonnes `published_at`, `section_id`, `section_order` et
  policy élève), et décider s'il entre dans les modèles (`LINKED_TABLES_SECTIONS_LAST`,
  déclencheurs du lien).
- **Nouvelle sorte d'activité** : `validation/curriculum.ts` (union discriminée), puis
  `TAGGED_KINDS` dans `curriculum-coverage.ts` si elle porte des tags.
- **Toute nouvelle surface de progression élève** passe par `student-progression.ts`.
- Une route qui écrit dans ces tables valide son entrée avec les schémas de
  `src/lib/server/validation/` et lit `.select()` après écriture.

## Tests

- Unitaires serveur (`src/lib/server/__tests__/`) : `chapters`, `chapters-publication`,
  `chapter-plan`, `chapter-series`, `chapter-templates`, `modele-lien`
  (ordre des opérations du lien : détacher, faire un modèle, supprimer, instancier, retirer),
  `template-content-counts` (compteurs lus dans les tables, jamais des zéros sur panne), `journal`,
  `journal-homework`, `journal-activities`, `journal-weekend`, `curriculum-grade`,
  `curriculum-coverage-grade`, `evaluation-curriculum-points` ; `progression/__tests__/` ;
  chargements sur l'arbre neuf : `dashboard/teacher/{avancement,cahier-texte/[classId]/[date]}/__tests__/`
  et `api/teacher/curriculum/{coverage,exercise-tags}/__tests__/` (décor commun
  `src/lib/server/__tests__/helpers/fake-programme.ts`) ;
  validation `chapter-series`, `chapter-templates-grades`, `journal`, `academic`.
- Utilitaires : `src/lib/utils/__tests__/{class-sessions,academic-period,week-config,timeMatching}.test.ts`.
- Composants : `src/lib/components/cours/**/__tests__/` (dont
  `ChapterSectionsEditor-proprietaire` : plan d'un modèle, chapitre lié, masqués ; et
  `DocumentUpload-proprietaire` : routes du propriétaire), `templates/__tests__/`,
  `src/lib/components/__tests__/ClassScheduleGrid.svelte.test.ts` ; routes :
  `dashboard/teacher/cours/[classId]/[chapterId]/__tests__/series-actions.test.ts`,
  `api/teacher/chapters/[id]/sections/assign/__tests__/assign.test.ts`,
  `dashboard/teacher/cours/[classId]/__tests__/share-course-actions.test.ts`,
  `dashboard/teacher/contenu/templates/__tests__/{routes,identifiants,suppression-modele-relie}.test.ts`,
  `(public)/cours/[token]/__tests__/{page-server,page.svelte}.test.ts` ; serveur :
  `course-share-tokens.test.ts`.
- Intégration (`tests/integration/`, base locale) : `chapter-publication-rls`,
  `archived-member-chapter-access`, `chapter-sections`, `sections-crud`,
  `placer-dans-une-section`, `backfill-chapter-sections`, `chapter-documents-size-limit`,
  `chapter-template-instantiation-unique`, `chapter-decks`, `class-journal-share-token`,
  `class-course-share-token`,
  `security-share-tokens`, `journal-entry-homework`, `journal-pending-activities`,
  `curriculum-api`, `curriculum-coverage`, `curriculum-tracking-rls`, `template-tags`,
  `modele-possede-son-contenu` (base du lien), `modele-adoption`, `modele-serveur` (ADR 0029 :
  éditer, instancier, retirer, servir à l'élève, masquer, détacher, supprimer, faire un modèle),
  `purge-tests-lignes-de-lien` (la purge des tests et `global-setup` passent malgré les
  lignes de lien : `tests/helpers/database/purge-modeles.ts` supprime les liens, puis les
  modèles).

## Décisions

- [ADR 0005](../adr/0005-publication-par-element-acces-herite-de-la-classe.md) — publication par
  élément ; accès élève hérité de la classe, résolu à la volée ; élève sorti de classe archivé
  (relit ce qu'il a reçu, ne reçoit plus rien) ; documents plafonnés à 25 Mo, téléversés
  directement du navigateur au storage (d'où `document-upload-url`).
- [ADR 0025](../adr/0025-cours-lisible-par-lien-sans-compte.md) — le cours d'une classe est lisible
  par un lien distinct de celui du cahier ; portes `SECURITY DEFINER` seulement, contenus réservés
  aux comptes masqués.
- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) — mono-professeur : la policy
  prof est un rôle, pas un propriétaire (`_teacherId` inutilisé dans `journal.ts`).
- [ADR 0020](../adr/0020-arbre-central-programmes-pointeurs.md) — l'arbre des notions devient
  central ; les points du programme le pointent (chantier C5 en cours, d'où `isLegacyPoint`).
- Le détail des décisions du 2026-09-13 qui ont produit l'ADR 0005 :
  [publication progressive](../wip/publication-progressive-progress.md).

## Écarts connus

1. **Le cahier de texte publie autrement que le reste** : `class_journal_entries.is_published` a le
   **troisième sens** de « publier » de [CONTEXT.md](../../CONTEXT.md) (mis à disposition des élèves),
   mais par un booléen, plus `entry_date <= current_date` dans la policy élève, et non par une date
   `published_at` testée `<= now()` comme le veut l'[ADR 0005](../adr/0005-publication-par-element-acces-herite-de-la-classe.md).
2. _(Résolu le 2026-10-15 : les colonnes de l'ancien système de versions sont supprimées,
   migration `20261016103800`.)_
3. _(Résolu le 2026-10-15 : « Faire un modèle » compte les séries, comme `templateHasContent` —
   `chapterHasTemplateContent`, `src/lib/components/cours/teacher/chapter-has-template-content.ts`.
   La règle Q128 venait de l'ancien modèle « snapshot ».)_
4. **API REST sans appelant dans `src/`** (grep du 2026-10-14) : `api/teacher/chapters` (racine,
   `[id]`, `checklist`, `exercises`, `worksheets`, `progress`, `reorder`),
   `api/student/chapters/**`, `api/student/checklist/**`. L'interface passe par les actions de
   formulaire des pages. Doublons à surveiller : une règle corrigée d'un côté ne l'est pas de
   l'autre. (Les routes de l'ancien système de modèles — `chapter-templates` racine, `[id]`,
   `publish`, `versions`, `instantiate`, et `chapters/[id]/{create-template,detach,migrate,template-updates}` —
   ont été supprimées à l'étape 5A.)
5. **`src/lib/components/templates/`** ne garde que `ChapterTemplateIndicator` pour les modèles de
   chapitre (les composants de l'ancien système ont été supprimés à l'étape 5A) ; il héberge aussi
   `VariableAutocomplete`, `TagsInput`, `FiltersHelp`, qui servent les **modèles de message**
   (hors de cette zone, donc hors `couvre:`).
6. **Fonctions sans appelant hors tests** : `reorderDocuments`, `reorderExercises`
   (`chapters.ts`, aucun appelant du tout) ; `getTeacherJournalEntries`, `getJournalStatistics`,
   `getNextClassDate` (`journal.ts`) ; `getTimeSlots`, `findScheduleAtSlot`, `calculateSlotSpan`,
   `isScheduleStart`, `isValidTimeRange`, `getDefaultStartTime`, `getDefaultEndTime`
   (`schedule.ts`) ; `findMatchingPeriod`, `isTimetableEmpty`, `getNextTimePeriod`
   (`timetable.ts`). L'action `reorder` de `dashboard/teacher/cours/[classId]/` n'est appelée par
   aucun formulaire de la page.
7. **`src/lib/types/academic_periods_types.ts` est mort** : aucun import, et il déclare sa propre
   interface `Database` (« à ajouter à database.ts ») — en contradiction avec la règle « types
   dérivés dans `database-helpers.ts` ».
8. **Trois définitions de l'année scolaire** : la page Avancement la calcule (1ᵉʳ septembre →
   1ᵉʳ septembre), `endOfSchoolYear` en a une autre (31 août), les tables `school_years` /
   `academic_periods` une troisième, propre à l'école. Elles concordent pour une école française,
   pas au-delà.
9. **Chevauchement avec [fiches-et-pdf.md](fiches-et-pdf.md)** : `src/routes/(public)/cahier/*/fiche/**`
   et `api/teacher/chapters/*/worksheets/**` sont couverts par les deux docs.
10. L'en-tête de l'éditeur de chapitre (`[classId]/[chapterId]/+page.server.ts`) annonce un
    réordonnancement des documents, objectifs et exercices qui n'a pas d'action.
11. **Un modèle ne se modifiait qu'en passant par un chapitre** (un chapitre de classe, puis
    « Mettre à jour depuis un chapitre » : un geste que personne n'avait choisi, bouche-trou du
    2026-09-14). Tranché par l'[ADR 0029](../adr/0029-le-modele-possede-son-contenu-le-chapitre-le-relie.md) :
    le modèle s'édite sur sa page — serveur livré à l'étape 3b, interface à l'étape 3c
    ([journal](../archive/wip/refonte-modeles-chapitre-progress.md)). Le bouton « Mettre à jour depuis un
    chapitre » a disparu, et l'ancien circuit des versions a été supprimé à l'étape 5A.
