# Fiches en anglais — doc de progression

> Classe anglophone : la **fiche entière** sort en anglais (contenu + habillage PDF).
> Spec validée le 2026-09-03. Le français reste la source de vérité.

## Décisions actées (PO)

- Correction/solution traduite **oui**.
- Titre de fiche, sections et consignes personnalisées : **même traitement** que le contenu.
- Format de date : **`en-US`**.
- Hors périmètre : les `question_templates` (séries, quiz, diapos) ; l'UI de l'application reste en français.

## Modèle

Le français vit dans les champs de base, une traduction ne porte que ce qu'elle surcharge, et
tout ce qui manque retombe sur le français **champ par champ** — jamais de trou dans un PDF.

| Où                           | Forme                                                                                   | Migration ?             |
| ---------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| Contenu d'exercice           | `variation.translations.en = { statement_md, solution_md, hints }` et idem sur `shared` | non (déjà JSONB)        |
| Langue de rendu              | `worksheet.config.language = 'fr' \| 'en'`                                              | non (config déjà JSONB) |
| Titre / description de fiche | `worksheets.translations`                                                               | **oui**                 |
| Titre / consignes de section | `worksheet_sections.translations`                                                       | **oui**                 |
| Consignes par exercice       | `worksheet_exercises.translations`                                                      | **oui**                 |

Cascade de résolution, du plus spécifique au moins :
`variation.translations[locale]` → `variation` → `shared.translations[locale]` → `shared`.
Une variation qui définit son propre énoncé français bat donc la traduction partagée, qui
traduit un autre énoncé.

## Phase 1 — modèle, résolution, Zod ✅

Fait le 2026-09-03. **Rien n'est commité ni migré en prod.**

- `src/lib/types/locale.ts` (nouveau) — `CONTENT_LOCALES`, `ContentLocale`, `DATE_LOCALES`
  (`en-US`), `TYPST_LANGS`, `isContentLocale`. Source unique, pour ne pas définir la locale deux fois.
- `src/lib/exercises/types.ts` — `TranslatedExerciseContent`, `ExerciseTranslations`,
  champ `translations` sur `ExerciseVariation` et `SharedExerciseDefaults` ;
  `resolveExerciseVariationWithShared(shared, variation, locale)` et
  `getExerciseContent(exercise, variationIndex, locale)` prennent la locale (défaut `fr`).
  **C'est le point de passage unique** : tout l'aval en hérite.
- `src/lib/types/worksheets.ts` — `WorksheetConfig.language`, `RowTranslations`,
  `worksheetLocale()`, `localizedText()`, champ `translations` sur les trois types de ligne.
- Zod — `language` (enum strict) dans la config, `translations` sur les schémas de création
  fiche/section/exercice et sur variation + shared. `strict()` sur les deux niveaux : une
  locale ou un champ inconnu est rejeté, pas stocké en silence.
- Migration `20260906140000_worksheet_translations.sql` — `translations jsonb` nullable sur les
  3 tables. Purement additif, appliquée **en local seulement** (vérifiée après `db:reset`).

Tests : 10 (contenu) + 9 (fiche) + 8 (Zod) écrits **avant** l'implémentation, tous rouges puis verts.
`pnpm check:incremental` 0 erreur ; suites exercises/types/validation/typst : 2117 tests verts.

## Phase 2 — éditeur ✅

Fait le 2026-09-03.

- `VariationEditor.svelte` — onglets **Français / English** partagés par l'énoncé et la solution
  (le prof écrit la source ou sa traduction, pas les deux à la fois), via des _function bindings_
  Svelte 5 : rien n'est créé tant qu'il n'a pas tapé. Badge « EN » sur la carte Énoncé.
- `src/lib/exercises/translation-draft.ts` (nouveau) — `withTranslatedField()` pur : écrit le champ,
  le retire quand il est vidé, et **supprime le conteneur devenu vide**. Un exercice tapé puis effacé
  redevient indiscernable d'un exercice jamais traduit. Sorti du composant pour être testable sans navigateur.
- `src/lib/exercises/translation-status.ts` (nouveau) — `untranslatedExercises()`. Une variation compte
  comme traduite si son **énoncé** l'est (une solution seule laisse un énoncé français devant l'élève).
  Toutes les variations sont vérifiées, pas la première : en mode variantes, l'élève peut tomber sur
  n'importe laquelle. Une variation sans énoncé propre hérite de la traduction partagée.
- `ExerciseForm.svelte` — la duplication emporte la traduction ; badge « EN » sur l'onglet de variation.
- `MetadataCards.svelte` — sélecteur **Langue** (Français / English) dans la config de la fiche.
- Page de la fiche — bandeau listant les exercices qui sortiraient en français, affiché uniquement
  quand la fiche est en anglais.

Tests : 8 (pruning) + 8 (statut) écrits avant l'implémentation. `svelte-autofixer` passé sur les
4 `.svelte` modifiés, 0 issue. `check:incremental` 0 erreur ; 1886 tests verts.

### Indices : forme corrigée, puis UI livrée (2026-09-03)

La spec disait « l'onglet anglais édite énoncé, solution **et indices** ». Deux constats :

- le modèle initial (`translations.en.hints` = `ExerciseHint[]`, un tableau parallèle) était mauvais :
  il forçait à recréer les `id`, et une dérive y casse les références `{{hint:id}}` de l'énoncé.
  Il avait même un bug — un tableau vide effaçait tous les indices français (`??` ne filtre pas `[]`) ;
- en prod : **128 exercices, 1 seul indice au total**. Construire l'éditeur maintenant serait de
  l'interface pour un cas qui n'existe pas.

Décision : **changer la forme tout de suite** (gratuit tant qu'aucune ligne ne l'utilise, migration
de données plus tard), **différer l'UI**. `translations.en.hints` est désormais une table indexée par
`id` ne portant que le texte (`title`, `description`, `content`) — `id`/`type`/`url` restent
structurels. Un indice ajouté en français apparaît non traduit au lieu de disparaître, un indice
supprimé ne peut pas ressusciter par sa traduction, et le repli est champ par champ. L'UI a suivi le
même jour, purement additive comme prévu : `HintTranslationEditor.svelte`, affiché dans l'onglet
English de la carte « Aides ». Les indices français y sont le **cadre fixe** — mêmes `id`, mêmes
types, mêmes URL — et seuls leurs textes sont saisissables. Un test vérifie qu'aucun champ n'est
jamais offert pour `id`, `type` ou `url` : c'est l'invariant qui protège les `{{hint:id}}`.
`content` n'apparaît que pour les indices `ubumark` (les autres portent une URL), et `description`
que si le français en a une. Comme partout, un champ vidé retire sa traduction et ne laisse aucun
conteneur derrière lui.

## Phase 3 — habillage Typst ✅

Fait le 2026-09-03.

- `src/lib/typst/labels.ts` (nouveau) — ~60 libellés FR/EN : blocs identité, métadonnées, structure,
  bandeaux de type, et les phrases (instructions d'examen, attestation sur l'honneur, encart
  « Le saviez-vous ? », citation). `labelPlaceholders()` les aplatit en `{{label_*}}`.
- `worksheet-generator.ts` — `locale` lu depuis `config.language` (valeur inconnue → français, une
  config corrompue doit quand même générer). Plus un seul mot français en dur : `Nom/Classe/Date`,
  `Duree/Bareme`, `Instructions`, `Exercice N`, `pt/pts`, bandeau et pied de correction, nom du type
  de document. Date en `en-US`, et `{{lang}}` transmis aux templates.
- **Les 12 templates** — ~70 libellés remplacés par des placeholders, `lang: "fr"` → `lang: "{{lang}}"`
  (césure et guillemets typographiques, pas seulement les mots). Un seul corps par template : pas de
  dérive possible entre les deux langues.
- `SAMPLE_PREVIEW_DATA` reçoit les libellés français : sans ça l'éditeur de templates et la galerie
  affichaient `{{label_name}}` brut. **C'est le test de la PR précédente qui l'a attrapé.**
- Plomberie de la langue jusqu'au contenu : `getExerciseContentSafe(exercise, 0, locale)` dans
  `pdf/+server.ts`, `pdf/batch`, `assignments/[id]/correction` et `PdfPreview.svelte`.
- Migration `20260906150000_worksheet_templates_localisation.sql` + seed regénérés depuis la source
  de vérité TS. Appliqués **en local seulement**.

Vérifications : **48 compilations réelles** avec le CLI Typst 0.14.2 (12 templates × 2 langues ×
options on/off) — toutes passent, aucun placeholder résiduel. Un test par template vérifie qu'aucun
mot français ne survit au rendu anglais. 2182 tests verts, `check:incremental` 0 erreur.

## Phase 4 — côté élève ✅

Fait le 2026-09-03.

- `StudentWorksheetView.language` porte la langue jusqu'au PDF élève.
- `student-worksheet-typst.ts` — badge de type, `Instructions`, `Exercices indispensables`,
  `Autres exercices`, `Corrections` et `lang:` suivent la langue. Les noms de type côté élève
  (« Fiche de travail », « Devoir ») restent volontairement distincts de ceux du PDF prof
  (`STUDENT_TYPE_LABELS`) : changer ce vocabulaire français n'était pas demandé.
- `GenerateInstanceOptions.locale` — le générateur d'instances résout le contenu dans la langue,
  y compris ses chemins de repli.
- Routes `api/student/worksheets/[assignmentId]` et `api/worksheets/assignments/[assignmentId]/preview` :
  langue calculée une fois et passée à `resolveExercise()` et aux replis.

Tests : 2 sur le PDF élève (français inchangé / anglais complet). **Suite serveur complète :
31 019 tests verts**, `check:incremental` 0 erreur.

## Phase 5 — revue + corrections ✅

`code-reviewer` et `security-auditor` lancés le 2026-09-03. **Aucune faille critique ni haute**
(locale dérivée serveur et non paramètre client, `.strict()` aux deux niveaux, migrations sans
privilège, aucune injection Typst — vérifié sur les deux chemins). La revue de code, elle, a trouvé
des bugs réels, dont trois que la doc affirmait faussement résolus :

- **C1/C2** — deux générateurs d'instances (`server/worksheets/instance-generator.ts`, preview
  d'assignation) ignoraient la langue : habillage anglais, énoncés français. Corrigé.
- **I1 — régression du français** : les libellés avaient été écrits sans accents, dégradant les
  templates qui, eux, étaient accentués (`Durée`→`Duree`, `ÉLÈVE`, `ÉDITION`), plus une nuance
  supprimée (« sauf mention contraire ») et `Total des points` réduit à `Total`. Restauré ; les
  capitales du design passent par `#upper[]` pour tenir dans les deux langues.
- **I2** — 3 templates gardaient du français en dur, dont « Scientifique » massivement (+20 libellés).
- **I3** — `translation-status` rejouait la cascade au lieu de l'interroger, et en divergeait. Il
  appelle désormais `resolveExerciseVariationWithShared()` : une seule implémentation de la règle.
- **I4 / badge / locale** — garde `isContentLocale()` côté élève, badge EN unifié sur
  `hasEnglishStatement()`, résolution de locale ramenée à `worksheetLocale()` partout.

**Le test de localisation a été durci** : au-delà d'une liste de marqueurs (trop étroite, elle
laissait passer des phrases entières), il refuse désormais **tout caractère accentué** dans le rendu
anglais, hors noms propres. Ce filet a immédiatement rattrapé une erreur de la correction elle-même
(un remplacement d'accents avait contaminé le bloc anglais).

## Phase 6 — traductions de lignes, câblage complet ✅

La décision PO « même traitement » pour titre / sections / consignes n'était livrée qu'au niveau du
modèle : validée et migrée, mais **jamais persistée, jamais lue, jamais saisissable**. Cause : le
découpage en phases ne l'avait attribuée à personne. Livré maintenant :

- **Persistance** — `translations` dans les 6 routes (création + mise à jour de fiche, de section,
  d'exercice), et `updateWorksheetSchema` aligné sur les autres schémas.
- **Lecture** — `localizedText()` sur le titre (générateur + vues élève), les titres et instructions
  de section, et les consignes par exercice, au moment où l'instance est construite (elle porte le
  texte résolu, comme pour les énoncés). Les `select()` Supabase rapatrient la colonne.
- **Saisie** — champ « Titre anglais » dans `MetadataCards`, « Titre / Instructions anglaises » dans
  `SectionManager`, « Instructions anglaises » dans `ExerciseConfigModal`. Affichés **uniquement**
  quand la fiche est en anglais, et vidés ils ne laissent aucun conteneur derrière eux.

Vérifications finales : 48 compilations Typst réelles (12 templates × 2 langues × options),
**31 023 tests serveur verts**, `check:incremental` 0 erreur, `svelte-autofixer` sur les 6 `.svelte`.

## Reste à faire

- Après migration prod : `pnpm db:types` pour que `database.ts` connaisse la colonne
  (les types de ligne sont écrits à la main dans `types/worksheets.ts` en attendant).
