---
couvre:
  - 'src/routes/(protected)/test-exercises/+page.svelte'
  - 'src/routes/(protected)/dev/+page.svelte'
  - 'src/routes/(protected)/dev/+layout.server.ts'
  - 'src/routes/(protected)/aide-ecriture/+layout.server.ts'
  - 'src/routes/(protected)/aide-ecriture/+page.svelte'
  - src/lib/components/PageIndex.svelte
  - 'src/routes/(public)/a-propos/+page.svelte'
  - 'src/routes/(public)/demo/+page.svelte'
  - 'src/routes/(public)/demo/+page.ts'
  - 'src/routes/(protected)/dev/carte-question/+page.svelte'
  - 'src/routes/(protected)/dev/bancs-essai/+page.svelte'
  - 'src/routes/(protected)/dev/theme/+page.svelte'
  - 'src/routes/(protected)/aide-ecriture/cercle-trigo/+page.svelte'
  - 'src/routes/(protected)/dev/cadres/+page.svelte'
  - 'src/routes/(protected)/dev/structure/+page.svelte'
  - 'src/routes/(protected)/dev/structure/*.svelte'
  - 'src/routes/(protected)/dev/structure/*.ts'
  - 'src/routes/(protected)/dev/saisie-naturelle/*.svelte'
  - 'src/routes/(protected)/dev/polices/+page.svelte'
  - 'src/routes/(protected)/dev/polices/exercices-demo.json'
  - 'src/routes/(protected)/dev/polices/shantell-pdf.ts'
  - 'src/routes/(public)/upsilon/+page.svelte'
  - src/lib/stores/listNumbering.svelte.ts
  - src/lib/styles/list-numbering.css
  - src/lib/types/list-numbering.ts
  - src/lib/components/ClassStatsCard.svelte
  - src/lib/components/CodeViewer.svelte
  - src/lib/components/DynamicMathField.svelte
  - src/lib/components/JsonViewer.svelte
  - src/lib/components/LaTeXEditor.svelte
  - src/lib/components/LoggerDemo.svelte
  - src/lib/components/MathField.svelte
  - src/lib/components/ToastDemo.svelte
  - src/lib/components/teacher/StudentQuickActionsTable.svelte
  - src/lib/constants/deadlines.ts
  - src/lib/index.ts
  - src/lib/supabase-test.ts
  - src/lib/supabaseClient.ts
  - src/lib/transitions/slide-transition.ts
  - src/lib/utils.ts
  - src/lib/utils/auth.ts
  - src/lib/utils/avatar.ts
  - src/lib/utils/dates.ts
  - src/lib/utils/file-upload.ts
  - src/lib/utils/filename.ts
  - src/lib/utils/footer.ts
  - src/lib/utils/format.ts
  - src/lib/utils/fractional-indexing.ts
  - src/lib/utils/french-math.ts
  - src/lib/utils/latex-syntax-adapter.ts
  - src/lib/utils/markdown.ts
  - src/lib/utils/mathlive-fonts.ts
  - src/lib/utils/search.ts
  - src/lib/utils/skeleton-detector.ts
  - src/lib/utils/storage.ts
  - src/lib/utils/string.ts
  - src/lib/utils/worksheet-constants.ts
---

# Utilitaires, composants isolés et pages de démo

> Vérifié contre le code le 2026-10-12 (commit 4ab55c5e8) ; `french-math.ts` le 2026-10-23 ; pages de
> démo et de mise au point le 2026-10-24.
> Ce fichier **recense** : il dit ce que fait chaque fichier, qui l'appelle, et s'il est mort.
> Chaque fichier de l'index est dans le `couvre:` : une PR qui le modifie relit sa ligne.
> Il ne remplace pas la doc du domaine qui l'utilise ; quand elle existe, elle est citée.
> Voisins : [seo.md](seo.md), [editeur-riche.md](editeur-riche.md),
> [carte-des-fonctionnalites.md](carte-des-fonctionnalites.md), [serveur.md](serveur.md).

## À quoi ça sert

Trois familles de fichiers sans domaine propre :

1. les **pages de démo et de mise au point** (`/demo/**`, `/dev/**`) et deux pages publiques
   isolées (`/a-propos`, `/upsilon`) ;
2. la **numérotation des listes** à l'affichage (store, CSS, types) ;
3. les **utilitaires** de `src/lib/utils/` et les composants isolés, en index.

Un appelant compté ici est un import réel (`git grep "<chemin d'import>" -- src`), tests exclus.

---

## 1. Pages de démo et de mise au point

**Rangement en cours** (chantier demo-debug, `docs/wip/demo-debug-progress.md`) : les pages de
mise au point sont passées sous `/dev/…` (admin seul), les aides pour écrire du contenu sous
`/aide-ecriture/…` (prof seul) ; les deux espaces sont gardés dans le hook
(`reservedAreasHandle`, [auth.md](auth.md#la-chaîne-de-handles)), contrôle refait par le
`+layout.server.ts` de chaque espace (navigation côté client), et fermés aux robots. Leur
accueil (`/dev`, `/aide-ecriture`) liste leurs pages par `PageIndex.svelte` (`DEV_PAGES` pour `/dev`, `AIDE_PAGES` pour
`/aide-ecriture`).

Pages déjà déplacées sous `/dev` (PR 2) : `/dev/theme`, `/dev/saisie-naturelle`, `/dev/cadres`,
`/dev/polices`, `/dev/erreurs/page`, `/dev/erreurs/surveillance`, `/dev/blockly` et les anciennes pages
de `/dashboard/admin/debug/` (`/dev/session`, `/dev/rls`, `/dev/api`, `/dev/avatar`, `/dev/roue`,
`/dev/champ-math`, `/dev/apercu-question`, `/dev/correction-generee`, `/dev/pdf-typst`,
`/dev/pdf-latex`, `/dev/latex-vers-ubumark`).

Fusions et parts dev (PR 3) : `/dev/carte-question` (ex-`/dashboard/admin/debug/question-display`
et `/demo/question-display-demo`), `/dev/editeur-riche` (ex-`/dashboard/admin/debug/rich-text` et
`/demo/rich-text-editor-demo`, voir [editeur-riche.md](editeur-riche.md)), `/dev/diaporama`
(ex-`/slides/demo`, `/slides/demo-embedded`, `/slides/test-transitions`, voir
[outils-prof.md](outils-prof.md)), `/dev/structure` (ex-`/test-structure`), `/dev/cartes` et
`/dev/cartes/exemples` (ex-`/demo/vip-cards-demo`, voir [jeux-et-economie.md](jeux-et-economie.md)),
`/dev/mots-cliquables` (ex-`/demo/mots-cliquables`, voir [dictionnaire.md](dictionnaire.md)),
`/dev/bancs-essai` (bancs d'essai sortis du carrefour `/demo`). Plus rien sous
`/dashboard/admin/debug/`.

Aide à l'écriture (PR 4) : `/aide-ecriture/geometrie/…` (ex-`/geometry-demo/…`, 30 pages, voir
[geometrie/README.md](geometrie/README.md)) et `/aide-ecriture/cercle-trigo` (ex-`/demo/trig-circle-demo`,
carte retirée du carrefour `/demo`). Un vrai compte admin n'y entre pas (403).

Les anciennes adresses sont redirigées en 308 par `redirectHandle` (table `MOVED_PAGES`,
[auth.md](auth.md#la-chaîne-de-handles)), sous-pages comprises ; une ancienne adresse publique mène
donc le visiteur à la connexion. `/test-font` ne l'est qu'à l'adresse exacte, ses images restant
sous `static/test-font/`. Les pages vitrine (`/demo/…`) viendront plus tard (phases 6 et 7 du
chantier).

Toutes sont hors du sitemap (`src/lib/seo/sitemap-pages.ts` exclut `/demo/**` ; `/dev` est
protégé, donc absent) et interdites aux robots par `static/robots.txt` (`/demo`, `/test-`, `/dev`), sauf `/a-propos` et
`/upsilon`, qui sont de vraies pages.

| Page                          | Servie à                                   | Liens entrants                                         | Contenu                                                                                                                                                              | Statut                            |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `/a-propos`                   | tous                                       | `InfoPanel`, tour du Royaume, vue « parents », sitemap | « Chiphre, c'est quoi ? » : le manifeste pour les parents (`docs/Chiphres/lore-pataphysique.md`, section I)                                                          | **Vraie page**                    |
| `/upsilon`                    | tous                                       | `Header`, `Sidebar`, tour du Royaume, sitemap          | Simulateur de la calculatrice Upsilon dans une `iframe`                                                                                                              | **Vraie page**                    |
| `/demo`                       | tous (prérendue : `+page.ts`, `prerender`) | aucun, hors des `BackLink` de ses sous-pages           | Carrefour : liens vers les seules pages publiques (Mathémo, Trio)                                                                                                    | Démo, non liée                    |
| `/dev/bancs-essai`            | admin (`/dev`)                             | `/dev`                                                 | Champ MathLive (`MathField`, `DynamicMathField`), cartes retournables, journal (`LoggerDemo`), toasts (`ToastDemo`)                                                  | Mise au point                     |
| `/dev/carte-question`         | admin (`/dev`)                             | `/dev`                                                 | `FlashCard` sur 8 questions d'exemple : réglages (`MySelect`, `MyCheckbox`), journaux des événements, instance en JSON                                               | Mise au point                     |
| `/dev/editeur-riche`          | admin (`/dev`)                             | `/dev`                                                 | `RichTextEditor` : modes chat et form, import et export Markdown, onglet « Messagerie » (`Messagerie.svelte`)                                                        | Mise au point                     |
| `/dev/theme`                  | admin (`/dev`)                             | `/dev`                                                 | « Référence des composants Shadcn » dans les deux thèmes (1 094 lignes) ; ex-`/demo/theme-test`, carte retirée de `/demo`                                            | Démo                              |
| `/aide-ecriture/cercle-trigo` | prof (`/aide-ecriture`)                    | `/aide-ecriture`                                       | Bloc markdown `trig` (cercle trigonométrique) avec ses réglages                                                                                                      | Aide à l'écriture                 |
| `/dev/cadres`                 | admin (`/dev`)                             | `/dev`                                                 | Cadres arrondis autour d'une formule : `\htmlStyle` (`colorLatex`) contre `\enclose{roundedbox}`                                                                     | Mise au point, gardée             |
| `/dev/polices`                | admin (`/dev`)                             | `/dev`                                                 | Bascule des polices de formules KaTeX ↔ Shantell (`mathlive-fonts.ts`)                                                                                               | Mise au point, gardée             |
| `/dev/structure`              | admin (`/dev`)                             | `/dev`                                                 | « Structure d'une expression » au survol (`$lib/mathAST/structure`)                                                                                                  | **Chantier vivant**               |
| `/dev/saisie-naturelle`       | admin (`/dev`)                             | `/dev`                                                 | Saisie naturelle de Calcul, sans point, avec le panneau « sous le capot » ; le champ (`NaturalField.svelte`) sert aussi l'atelier, réglage « Écriture mathématique » | Prototype jetable                 |
| `/test-exercises`             | tout connecté, élève compris               | aucun                                                  | `ExerciseMarkdownEditor` sur un exercice d'exemple                                                                                                                   | Mise au point, probablement morte |

Précisions :

- **`/upsilon`** : l'`iframe` (`static/upsilon-simulator/simulator.html`) n'est chargée qu'au
  clic sur « Lancer le simulateur ». La page envoie le thème (`postMessage`
  `{ type: 'ubumaths-theme', dark }`, origine du site) à chaque changement ; `simulator.html`
  l'écoute. Plein écran par bouton, sortie par Échap. Licence affichée : CC BY-NC-SA 4.0.
- **`/dev/structure`** (ex-`/test-structure`) : une seule formule, le **champ de formule** `StructureField`
  (`$lib/components/structure/`, réglages structure, lecture et déplacer tous allumés) : on la
  survole (encadré de la sous-expression, lecture en français, mots du dictionnaire cliquables,
  message « 6e ou avant »), on l'écrit d'un clic court, on déplace un terme, un facteur ou un
  membre d'égalité par appui puis mouvement, « Annuler » revient en arrière. Dans la route :
  `StructureFormula.svelte` (formules du corpus, survol seul) et `structure-lexicon.svelte.ts`
  (fiches du dictionnaire au niveau de l'élève, 5e pour un visiteur). Spécification et
  décisions : [mathast/structure-expression.md](mathast/structure-expression.md). Le moteur est
  décrit dans [mathast/README.md](mathast/README.md). Deux majuscules collées se lisent comme une
  **longueur** (« la longueur AB », `capitalPairs: 'length'`) ; la case « Lire AB comme un
  produit » repasse en mode produit, pour la formule principale et le corpus. Un nom de figure
  (`ABC`) affiche son message à la place de la lecture.
- **`/dev/polices`** (ex-`/test-font`) : outil de comparaison des polices de rendu ; décision de ne rien changer à
  KaTeX. Seul appelant de `src/lib/utils/mathlive-fonts.ts`. L'éditeur s'ouvre sur une
  expression (`\begin{gathered}`, une famille de symboles par ligne) qui réunit tous les symboles
  de la police, petits et grands (ponctuation, opérateurs, logique, ensembles, flèches, vecteurs,
  géométrie, symboles courants, lettres calligraphiques, délimiteurs empilés, racines, ∑ ∫,
  lettres grecques, AMS) : la regarder suffit pour juger un changement du jeu Shantell (`tools/chiphre-math/`). En bas, trois **exercices réels**
  (copie figée de la base, `exercices-demo.json`, image restée dans `static/test-font/`), affichés en
  Shantell et téléchargeables en PDF : `shantell-pdf.ts` compile avec le compilateur du **Corrigé
  des fiches** (`src/lib/typst/compiler/correction-fonts-compiler.ts`, `TypstSnippet.buildLocalCompiler`),
  qui charge en plus `static/fonts/chiphre-math-typst/` (Shantell Sans Light/Bold, **Chiphre Math** :
  police OpenType MATH construite depuis le jeu KaTeX par
  `tools/chiphre-math/src/build_typst_math_font.py`), et pose les mêmes règles de police
  (`withCorrectionFonts`). Le compilateur partagé des fiches n'est pas touché.
- **`/dev/cadres`** (ex-`/test-cadres`) : garde la trace du choix `\htmlStyle` pour le cadre des solutions
  (`\bbox` perd sa bordure en MathLive 0.111.1, `roundedbox` est décalé).

### Pièges

- **`/dev/structure` lit un fichier de test** :
  `$lib/mathAST/structure/__tests__/fixtures/corpus-saisies.txt?raw`. Modifier ce corpus change
  la page ; le supprimer casse le build.
- **`/dev/polices` ne rétablit pas les polices en partant.** `switchMathFonts('shantell')` pose un
  `<link>` dans `<head>` et change `MathfieldElement.fontsDirectory` ; la page n'a ni `onDestroy`
  ni retour à `katex`. Après une visite, une navigation côté client garde Shantell partout
  jusqu'au rechargement.
- **Navigateur en français : minuscules grecques droites.** MathLive choisit `letterShapeStyle`
  d'après la langue du navigateur (« french » si elle commence par `fr`) et écrit alors α, π…
  droits, pris dans KaTeX_Main-Regular. KaTeX n'y a pas de minuscules grecques : le navigateur
  prend une police du système (le jeu `katex` fait pareil). Le jeu Shantell les ajoute à
  Main-Regular. Une capture Playwright sans `locale: 'fr-FR'` ne montre pas ce cas.
- **MathLive n'écrit pas toujours le caractère ni la police de KaTeX.** `\perp` donne `⟂`
  (U+27C2, absent de KaTeX), `\lnot` est pris dans AMS (qui n'a pas de `¬`), les accents de
  `\hat` et `\tilde` sont `^` et `~`. Redessiner le glyphe attendu ne change alors rien à
  l'écran : relever d'abord, dans le navigateur, le caractère et la police (`font-family`) de
  chaque symbole. `\widehat` et `\overline` ne passent pas par la police (SVG, filet).
- Les pages `/demo/**` sont publiques et sans `noindex` : seul `robots.txt` les écarte. Celles de `/dev` sont réservées à l'admin.

---

## 2. Numérotation des listes à l'affichage

Fichiers : `src/lib/types/list-numbering.ts`, `src/lib/stores/listNumbering.svelte.ts`,
`src/lib/styles/list-numbering.css` (importé par `src/app.css`).

- **Schémas** (`NUMBERING_SCHEMES`) : `1-a-i`, `a-1-i`, `a-i`, `1.a.i`, `I.A.1`, `decimal`
  (1. 1.1. 1.1.1.). L'`id` devient une classe CSS `scheme-<id>` posée sur les `<ol>`, avec
  `enumerate-depth-<n>` ; la CSS numérote par compteurs et `::before`.
- **Réglage** (`ListNumberingConfig`) : `scheme` (`'auto'` ou un schéma), `schemeWithNesting`,
  `schemeWithoutNesting`. Par défaut : `auto`, `1-a-i` avec ou sans imbrication (même hiérarchie que
  le PDF, `typst-generator.ts` ; une liste plate est numérotée 1) 2) 3), choix de David du
  2026-10-18). Un réglage enregistré par l'admin (localStorage) garde son choix.
- **Calcul** : `MarkdownRenderer.svelte` (`effectiveListScheme`) prend le store, fusionne la prop
  `listNumberingOverride`, et en mode `auto` choisit selon la profondeur maximale des listes de
  l'AST. `ListNode.svelte` applique la classe.
- **Interface** : carte « Numérotation des listes » de `/dashboard/admin/settings`.

Cette partie appartient au rendu ubumark ([ubumark.md](ubumark.md)) ; elle est décrite ici
faute d'y être.

### Écarts connus

- **Le réglage admin ne s'applique qu'au navigateur de l'admin.** Le store se range dans
  `localStorage` (clé `listNumberingConfig`), rien en base. Élèves et profs voient toujours
  `DEFAULT_CONFIG`. La page de réglages ne le dit pas.
- La prop `listNumberingOverride` de `MarkdownRenderer` n'a aucun appelant.

---

## 3. Index des utilitaires et composants isolés

### `src/lib/utils/`

| Fichier                   | Ce qu'il fait                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Appelants                                                          | Doc du domaine                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `auth.ts`                 | `submitLogoutForm()` : efface les données de travail de l'élève du navigateur (`work-data.ts`, T17), puis POST d'un formulaire caché vers `/auth/logout`                                                                                                                                                                                                                                                                                                                                          | `Header`, layout du dashboard, profil                              | [auth.md](auth.md)                                                     |
| `avatar.ts`               | Image par défaut selon le rôle, initiales                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `UserAvatar.svelte`                                                | [composants-ui.md](../pratiques/composants-ui.md)                      |
| `dates.ts`                | Échéances : passée, proche (`DEADLINE_WARNING_DAYS`), formats compact / complet (date-fns, `fr`)                                                                                                                                                                                                                                                                                                                                                                                                  | évaluations, séries de chapitre, exercices élève, affectation      | [evaluations.md](evaluations.md)                                       |
| `file-upload.ts`          | Pièces jointes du chat (`chat-attachments`, 1 Mo) et de la messagerie (`message-attachments`, privé : lien d'envoi demandé au serveur, règles dans `message-attachment-rules.ts`, [messagerie-et-moderation.md](messagerie-et-moderation.md))                                                                                                                                                                                                                                                     | `ChatWindow`, `/messages/compose`                                  | —                                                                      |
| `filename.ts`             | Nom de fichier : version slug, version stockage, nom unique, extension                                                                                                                                                                                                                                                                                                                                                                                                                            | `exercises/markdown-frontmatter.ts`, `file-upload.ts`              | —                                                                      |
| `footer.ts`               | `showsInfoButton(pathname)` : bouton « Infos et confidentialité » sur `/` seulement                                                                                                                                                                                                                                                                                                                                                                                                               | `src/routes/+layout.svelte`                                        | [carte-des-fonctionnalites.md](carte-des-fonctionnalites.md)           |
| `format.ts`               | `formatDuration(secondes)`, `formatNumber`                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 3 modales du démineur                                              | [jeux-et-economie.md](jeux-et-economie.md)                             |
| `fractional-indexing.ts`  | `getPositionBetween(avant, après)` : position d'insertion sans renuméroter                                                                                                                                                                                                                                                                                                                                                                                                                        | kanban (`/organisation/kanban/[boardId]`)                          | — (organisation)                                                       |
| `french-math.ts`          | Nombres d'un LaTeX à la française (`{,}`, espaces fines dès 5 chiffres, option `minDigits`) ; `toLocaleDecimal` garde le point en anglais ; `withDigitGrouping` pose les espaces sans toucher au séparateur                                                                                                                                                                                                                                                                                       | questions, saisie à trous, rendu markdown, générateurs LaTeX/Typst | [ubumark.md](ubumark.md)                                               |
| `latex-syntax-adapter.ts` | `$$…$$` sur une ligne → `$…$` (ancienne syntaxe MathDisplay)                                                                                                                                                                                                                                                                                                                                                                                                                                      | `ChatBot`, `TutorChat`, `QuestionPreviewCard`, `OrderingInput`     | —                                                                      |
| `markdown.ts`             | `addHeaderIds(html)` : `id` unique sur les `<h2>`…`<h6>`                                                                                                                                                                                                                                                                                                                                                                                                                                          | `/dashboard/admin/docs`, `server/markdown-parser.ts`               | —                                                                      |
| `mathlive-fonts.ts`       | Bascule KaTeX ↔ Shantell (feuille de surcharge, `fontsDirectory`) ; en Shantell, barres de fraction et de racine au trait des lettres (0,068 em, bouts arrondis), la racine dépasse et se referme par un petit trait : règles ajoutées à la feuille partagée des champs MathLive ; le mode texte (`\text`, `\textbf`) passe en Shantell Sans Light/Bold, la police de texte des PDF (`--text-font-family` posée par `static/mathlive-fonts-shantell.css`, sinon MathLive prend la police système) | `/dev/polices` seulement                                           | § 1                                                                    |
| `search.ts`               | Nettoie et valide une recherche (longueur minimale 2)                                                                                                                                                                                                                                                                                                                                                                                                                                             | `server/exercise-assignments.ts`                                   | —                                                                      |
| `skeleton-detector.ts`    | Squelette de chargement selon la route (`dashboard`, `list`, `form`, `default`)                                                                                                                                                                                                                                                                                                                                                                                                                   | layout racine, layout du dashboard                                 | [tableaux-de-bord-et-navigation.md](tableaux-de-bord-et-navigation.md) |
| `storage.ts`              | `storageUrl(bucket, path)` : URL publique Supabase Storage depuis `PUBLIC_SUPABASE_URL`                                                                                                                                                                                                                                                                                                                                                                                                           | démineur, 2048                                                     | —                                                                      |
| `string.ts`               | `slugify` (accents retirés)                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `markdown.ts`, `server/markdown-parser.ts`                         | —                                                                      |
| `worksheet-constants.ts`  | Libellés, icônes, variantes de statut des fiches ; `formatDuration(minutes)`                                                                                                                                                                                                                                                                                                                                                                                                                      | liste, détail et création de fiches, `MetadataCards`               | [fiches-et-pdf.md](fiches-et-pdf.md)                                   |

### Racine de `src/lib/` et dossiers isolés

| Fichier                                   | Ce qu'il fait                                                                    | Appelants                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| `src/lib/utils.ts`                        | `cn()` (clsx + tailwind-merge), types `With…` de shadcn, `fixUrl`, `flyAndScale` | `cn` : 219 fichiers ; `fixUrl` : 3 pages Google |
| `src/lib/index.ts`                        | Fichier du gabarit SvelteKit, un commentaire seul                                | aucun (`from '$lib'` : 0)                       |
| `src/lib/supabaseClient.ts`               | Client Supabase singleton, **déprécié** (non SSR) selon son en-tête              | `supabase-test.ts` seulement                    |
| `src/lib/supabase-test.ts`                | `testSupabaseConnection()` : trois requêtes de diagnostic dans le journal        | aucun                                           |
| `src/lib/constants/deadlines.ts`          | Constantes d'échéance et de pagination                                           | `DEADLINE_WARNING_DAYS` : `dates.ts`            |
| `src/lib/transitions/slide-transition.ts` | `slideFromRight`, `slideToLeft` : glissé + fondu entre deux questions            | `components/test/TestInteractive.svelte`        |

### Composants isolés

| Composant                                 | Ce qu'il fait                                                                                                                                                | Appelants                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `MathField.svelte`                        | Enveloppe `<math-field>` MathLive : `bind:value`, `bind:element`, attributs transmis                                                                         | atelier, CAS, grapheur, `MathInput`, `TestSpecEditor`, démos |
| `DynamicMathField.svelte`                 | `<math-field>` créé en JS après import dynamique de MathLive                                                                                                 | `/dev/bancs-essai` seulement                                 |
| `CodeViewer.svelte`                       | CodeMirror 6 en lecture seule (JSON, Python), chargé à la demande                                                                                            | `PdfPreview`, détail d'un exercice (prof)                    |
| `LaTeXEditor.svelte`                      | CodeMirror 6 pour du LaTeX, chargé à la demande                                                                                                              | `/dev/latex-vers-ubumark`                                    |
| `JsonViewer.svelte`                       | JSON indenté dans une carte, bouton copier                                                                                                                   | **aucun**                                                    |
| `LoggerDemo.svelte`, `ToastDemo.svelte`   | Démonstrations du journal et des toasts                                                                                                                      | `/dev/bancs-essai` seulement                                 |
| `ClassStatsCard.svelte`                   | Nombre d'élèves d'une classe et bouton « emploi du temps »                                                                                                   | `/dashboard/teacher/classes`                                 |
| `teacher/StudentQuickActionsTable.svelte` | Tableau d'élèves du tableau de bord prof : +1 gidouille, +1 bonus, cartes VIP, avertissement en trois temps ; mise à jour optimiste, appels groupés (500 ms) | `TeacherDashboard.svelte`                                    |

### Pièges

- **Deux `formatDuration` d'unités différentes** : `utils/format.ts` attend des **secondes**
  (`2m 05s`), `utils/worksheet-constants.ts` des **minutes** (`1h 30min`). Même nom, même type
  `number` : TypeScript ne voit pas l'erreur d'import.
- **`MathField` n'efface pas le champ** : l'effet fait `if (value) node.value = value`. Remettre
  `value` à `''` ne vide pas le `<math-field>` ; passer par `element.value = ''`.
- `supabaseClient.ts` crée un client au chargement du module, sans cookies : ne pas l'importer
  dans du code de l'application ([auth.md](auth.md)).

### Écarts connus

Exports sans appelant hors tests (`git grep -lw <nom> -- src`, `__tests__` exclus) :

- `utils.ts` : `flyAndScale` ;
- `format.ts` : `formatNumber` ;
- `worksheet-constants.ts` : `formatDate` ;
- `file-upload.ts` : `deleteChatAttachment`, `validateFileType`, `getFileIcon` (quatre fichiers
  redéfinissent leur propre `getFileIcon`) ;
- `filename.ts` : `getFilenameWithoutExtension` ;
- `mathlive-fonts.ts` : `initMathFonts`, `preloadAllFonts` ;
- `search.ts` : `sanitizeSearchQuery` (appelée seulement par `validateSearchQuery`, son export
  ne sert pas) ;
- `constants/deadlines.ts` : `MS_PER_DAY`, `RECENT_EXERCISES_LIMIT`, `MAX_SEARCH_LENGTH`,
  `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE` (`almanach/calendar.ts`, `utils/class-sessions.ts` et
  `/dashboard/student/materials` redéfinissent les leurs).

Fichiers morts : `JsonViewer.svelte`, `supabase-test.ts` (et donc `supabaseClient.ts`, son seul
appelant), `src/lib/index.ts` (vide). `DynamicMathField`, `LoggerDemo`, `ToastDemo` ne vivent que
pour `/dev/bancs-essai`.

Doublons :

- **`formatDate` défini 81 fois** (`git grep -n "function formatDate" -- src`, tests exclus) :
  des copies locales dans les pages et composants, plus l'exemplaire exporté et inutilisé de
  `worksheet-constants.ts` et celui de `templates/templateEngine.ts`.
- `slugify` : `utils/string.ts` et une copie privée dans `exercises/slug-generator.ts`.
- Trois enveloppes CodeMirror chargées à la demande, presque identiques : `CodeViewer`,
  `LaTeXEditor`, `rich-text/MarkdownCodeEditor` (plus `constructions/components/JsonEditor`).
- `/test-exercises` est sous `(protected)` : tout compte connecté, élève compris, peut l'ouvrir.
  Aucun lien n'y mène.
