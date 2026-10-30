---
couvre:
  - 'src/routes/(protected)/dev/+page.svelte'
  - 'src/routes/(protected)/dev/+layout.server.ts'
  - 'src/routes/(protected)/aide-ecriture/+layout.server.ts'
  - 'src/routes/(protected)/aide-ecriture/+page.svelte'
  - src/lib/components/PageIndex.svelte
  - 'src/routes/(public)/a-propos/+page.svelte'
  - 'src/routes/(public)/demo/+page.svelte'
  - 'src/routes/(public)/demo/+page.ts'
  - src/lib/seo/demo-pages.ts
  - 'src/routes/(protected)/dev/carte-question/+page.svelte'
  - 'src/routes/(protected)/dev/bancs-essai/+page.svelte'
  - 'src/routes/(protected)/dev/theme/+page.svelte'
  - 'src/routes/(protected)/aide-ecriture/cercle-trigo/+page.svelte'
  - 'src/routes/(protected)/aide-ecriture/blocs/**'
  - 'src/lib/block-catalog/**'
  - 'src/lib/components/block-catalog/**'
  - 'src/routes/(protected)/dev/cadres/+page.svelte'
  - 'src/routes/(protected)/dev/structure/+page.svelte'
  - 'src/routes/(protected)/dev/structure/*.svelte'
  - 'src/routes/(protected)/dev/structure/*.ts'
  - 'src/routes/(public)/demo/structure/+page.svelte'
  - 'src/routes/(public)/demo/cercle-trigo/+page.svelte'
  - 'src/routes/(public)/demo/blocs/+page.svelte'
  - 'src/routes/(public)/demo/cartes/+page.svelte'
  - 'src/routes/(public)/demo/cartes/cartes.ts'
  - 'src/routes/(public)/demo/lexique/+page.svelte'
  - 'src/routes/(public)/demo/corriges/+page.svelte'
  - 'src/routes/(public)/demo/corriges/corriges.ts'
  - 'src/routes/(public)/demo/geometrie/+page.svelte'
  - 'src/routes/(public)/demo/geometrie/DemoFigureCard.svelte'
  - 'src/routes/(public)/demo/geometrie/figures.ts'
  - 'src/routes/(public)/demo/constructions/+page.svelte'
  - 'src/routes/(public)/demo/constructions/DemoConstructionCard.svelte'
  - 'src/routes/(public)/demo/constructions/constructions.ts'
  - 'src/routes/(public)/demo/questions/+page.svelte'
  - 'src/routes/(public)/demo/questions/SpacedReviewDemo.svelte'
  - 'src/routes/(public)/demo/questions/questions.ts'
  - 'src/routes/(public)/demo/editeur/+page.svelte'
  - 'src/routes/(public)/demo/diaporama/+page.svelte'
  - 'src/routes/(public)/demo/diaporama/ChronoBar.svelte'
  - 'src/routes/(public)/demo/diaporama/diaporama.ts'
  - src/lib/components/structure/structure-lexicon.svelte.ts
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
> démo et de mise au point le 2026-10-24 ; vitrine `/demo` et clôture du chantier demo-debug le 2026-10-25.
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

Trois espaces, chacun pour un public (décisions de David du 2026-10-24, chantier demo-debug,
journal dans `docs/archive/wip/demo-debug-progress.md`) :

| Espace             | Pour qui          | Contenu                                                                | Robots  |
| ------------------ | ----------------- | ---------------------------------------------------------------------- | ------- |
| `/demo/…`          | tous, sans compte | **vitrine** : ce que fait Chiphre, contenu choisi page par page        | ouverts |
| `/aide-ecriture/…` | prof seul         | **aide à l'écriture** : essayer et apprendre à écrire scripts et blocs | fermés  |
| `/dev/…`           | admin seul        | **mise au point** : bancs d'essai, pages de contrôle, outils de debug  | fermés  |

- **Le contenu pédagogique est au prof, jamais à l'admin** : d'où l'aide à l'écriture, à part de
  `/dev`. Un vrai compte admin n'entre pas dans `/aide-ecriture` (403, tranché par David le
  2026-10-24). Même règle pour l'éditeur de constructions, rangé à côté des constructions
  (`/constructions/essais`, prof seul, [constructions.md](geometrie/constructions.md)).
- **Garde** : `/dev` et `/aide-ecriture` sont gardés dans le hook (`reservedAreasHandle`,
  [auth.md](auth.md#la-chaîne-de-handles)) ; le `+layout.server.ts` de chaque espace refait le
  contrôle pour la navigation côté client (sans nœud serveur, le hook ne tournerait pas). `/dev`
  admet aussi le prof **élevé** (`adminElevationHandle` lit le cookie sous `/dev`) ; un prof non
  élevé est envoyé vers `/dashboard/elevate`.
- **Accueils** : `/dev` et `/aide-ecriture` listent leurs pages par `PageIndex.svelte`
  (`DEV_PAGES`, `AIDE_PAGES`) ; le lien « Debug » du menu admin mène à `/dev`. `/demo` est le
  carrefour de la vitrine (plus bas).
- **Plus rien sous `/dashboard/admin/debug/`**. Seule la page de contrôle de la base y est restée,
  devenue `/dashboard/admin/integrite-donnees` (« Intégrité des données »).
- **Anciennes adresses** (`/test-*`, `/geometry-demo/…`, `/slides/…`, `/blockly/playground`,
  `/construction-demo`, `/dashboard/admin/debug/…`, anciennes `/demo/…`) : redirigées en 308 par
  `redirectHandle` (table `MOVED_PAGES`, [auth.md](auth.md#la-chaîne-de-handles)), sous-pages et
  query string comprises ; une ancienne adresse publique mène donc le visiteur à la connexion.
  `/test-font` ne l'est qu'à l'adresse exacte, ses images restant sous `static/test-font/`.
  `/test-exercises` a été supprimée (404), avec ses orphelins `ExerciseMarkdownEditor.svelte` et
  `exercises/services/image-markdown-editor.ts`.

Pages fusionnées : `/dev/carte-question` (ex-`/dashboard/admin/debug/question-display` et
`/demo/question-display-demo`), `/dev/editeur-riche` (ex-`/dashboard/admin/debug/rich-text` et
`/demo/rich-text-editor-demo`, voir [editeur-riche.md](editeur-riche.md)), `/dev/diaporama`
(ex-`/slides/demo`, `/slides/demo-embedded`, `/slides/test-transitions`, voir
[outils-prof.md](outils-prof.md)). Pages dont la vitrine a pris une part : `/dev/structure`
(ex-`/test-structure`), `/dev/cartes` et `/dev/cartes/exemples` (ex-`/demo/vip-cards-demo`, voir
[jeux-et-economie.md](jeux-et-economie.md)), `/dev/mots-cliquables` (ex-`/demo/mots-cliquables`,
voir [dictionnaire.md](dictionnaire.md)), `/dev/bancs-essai` (bancs d'essai sortis du carrefour
`/demo`). Aide à l'écriture : `/aide-ecriture/geometrie/…` (ex-`/geometry-demo/…`, 30 pages, voir
[geometrie/README.md](geometrie/README.md)), `/aide-ecriture/cercle-trigo`
(ex-`/demo/trig-circle-demo`) et le catalogue des blocs `/aide-ecriture/blocs/…` (voir plus bas).

**La vitrine** : 10 pages (`/demo/structure`, `cercle-trigo`, `cartes`, `lexique`, `corriges`,
`geometrie`, `constructions`, `questions`, `editeur`, `diaporama`), chacune écrite pour un
visiteur : contenu dans le code, rien lu en base sauf le dictionnaire public, rien enregistré.
Une seule liste, `DEMO_PAGES` de `src/lib/seo/demo-pages.ts`, nourrit les cartes de l'accueil
`/demo`, le sitemap (`/demo` en 0,6, les vitrines en 0,5) et la `<title>` et la
`meta description` de chaque vitrine (`<SeoHead {...demoSeo('/demo/…')} />`) ; le test
`demo-pages.test.ts` exige une entrée par dossier de `/demo`, le passage par `SeoHead`
(canonique, Open Graph), l'absence de `noindex` et de `Disallow: /demo`. L'accueil est relié
depuis les trois vues des publics (`DEMO` de `src/lib/kingdom-tour/views.ts` : un seul lien par
page de public) et l'`InfoPanel`.

Les pages de mise au point restent hors du sitemap (`/dev` est protégé, donc absent) et interdites
aux robots par `static/robots.txt` (`/test-`, `/dev`, `/aide-ecriture`) ; `/a-propos` et `/upsilon`
sont de vraies pages.

| Page                          | Servie à                                   | Liens entrants                                         | Contenu                                                                                                                                                              | Statut                |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `/a-propos`                   | tous                                       | `InfoPanel`, tour du Royaume, vue « parents », sitemap | « Chiphre, c'est quoi ? » : le manifeste pour les parents (`docs/Chiphres/lore-pataphysique.md`, section I)                                                          | **Vraie page**        |
| `/upsilon`                    | tous                                       | `Header`, `Sidebar`, tour du Royaume, sitemap          | Simulateur de la calculatrice Upsilon dans une `iframe`                                                                                                              | **Vraie page**        |
| `/demo`                       | tous (prérendue : `+page.ts`, `prerender`) | vues des publics, `InfoPanel`, sitemap                 | Accueil de la vitrine : une carte par vitrine, dans l'ordre de `DEMO_PAGES` (`src/lib/seo/demo-pages.ts`)                                                            | Vitrine               |
| `/dev/bancs-essai`            | admin (`/dev`)                             | `/dev`                                                 | Champ MathLive (`MathField`, `DynamicMathField`), cartes retournables, journal (`LoggerDemo`), toasts (`ToastDemo`)                                                  | Mise au point         |
| `/dev/modeles`                | admin (`/dev`)                             | `/dev`                                                 | Revue de tous les modèles en base par programme, branche, notion : fiches, aperçus des variations, verdicts (voir [questions.md](questions.md))                      | Mise au point         |
| `/dev/carte-question`         | admin (`/dev`)                             | `/dev`                                                 | `FlashCard` sur 11 questions d'exemple (dont les cases « figure » CP-058, 059, 060) : réglages (`MySelect`, `MyCheckbox`), journaux des événements, instance en JSON | Mise au point         |
| `/dev/editeur-riche`          | admin (`/dev`)                             | `/dev`                                                 | `RichTextEditor` : modes chat et form, import et export Markdown, onglet « Messagerie » (`Messagerie.svelte`)                                                        | Mise au point         |
| `/dev/theme`                  | admin (`/dev`)                             | `/dev`                                                 | « Référence des composants Shadcn » dans les deux thèmes (1 094 lignes) ; ex-`/demo/theme-test`, carte retirée de `/demo`                                            | Démo                  |
| `/aide-ecriture/cercle-trigo` | prof (`/aide-ecriture`)                    | `/aide-ecriture`, `/aide-ecriture/blocs`               | Fiche du bloc `trig` (cercle trigonométrique) du catalogue des blocs, à son adresse d'origine                                                                        | Aide à l'écriture     |
| `/aide-ecriture/blocs`        | prof (`/aide-ecriture`)                    | `/aide-ecriture`                                       | Catalogue des blocs spéciaux d'ubumark : une carte par bloc (`BLOCK_CATALOG`)                                                                                        | Aide à l'écriture     |
| `/aide-ecriture/blocs/<bloc>` | prof (`/aide-ecriture`)                    | `/aide-ecriture/blocs`                                 | Fiche d'un bloc : réglages, exemples à copier, erreurs fréquentes, zone « Essayer »                                                                                  | Aide à l'écriture     |
| `/dev/cadres`                 | admin (`/dev`)                             | `/dev`                                                 | Cadres arrondis autour d'une formule : `\htmlStyle` (`colorLatex`) contre `\enclose{roundedbox}`                                                                     | Mise au point, gardée |
| `/dev/polices`                | admin (`/dev`)                             | `/dev`                                                 | Bascule des polices de formules KaTeX ↔ Shantell (`mathlive-fonts.ts`)                                                                                               | Mise au point, gardée |
| `/dev/structure`              | admin (`/dev`)                             | `/dev`                                                 | « Structure d'une expression » au survol (`$lib/mathAST/structure`)                                                                                                  | **Chantier vivant**   |
| `/demo/structure`             | tous                                       | `/demo`, sitemap                                       | Vitrine : la formule de `/dev/structure` seule, 6 exemples, réglages par défaut                                                                                      | Vitrine               |
| `/demo/cercle-trigo`          | tous                                       | `/demo`, sitemap                                       | Vitrine : 4 exemples du bloc `trig` (exploration, π/6, cos x = 1/2, cos x > 1/2), sans le texte du bloc                                                              | Vitrine               |
| `/demo/blocs`                 | tous                                       | `/demo`, sitemap                                       | Vitrine : 9 blocs du catalogue rangés par niveau (primaire, collège, lycée), texte du prof replié                                                                    | Vitrine               |
| `/demo/cartes`                | tous                                       | `/demo`, sitemap                                       | Vitrine : 4 cartes VIP écrites dans le code, une par rareté, avec leur effet holographique                                                                           | Vitrine               |
| `/demo/lexique`               | tous                                       | `/demo`, sitemap                                       | Vitrine : mots du dictionnaire soulignés dans une question et 5 phrases, sélecteur de niveau                                                                         | Vitrine               |
| `/demo/corriges`              | tous                                       | `/demo`, sitemap                                       | Vitrine : une page de Corrigé de fiche (écriture manuscrite) en image fixe, `static/demo/corriges/`                                                                  | Vitrine               |
| `/demo/geometrie`             | tous                                       | `/demo`, sitemap                                       | Vitrine : 10 figures manipulables (collège, lycée, pour le plaisir), script replié, réduites à la largeur de l'écran                                                 | Vitrine               |
| `/demo/constructions`         | tous                                       | `/demo`, sitemap                                       | Vitrine : 3 constructions à la règle et au compas, lecteur seul ouvert sur la figure finie, script replié                                                            | Vitrine               |
| `/demo/questions`             | tous                                       | `/demo`, sitemap                                       | Vitrine : une série de 4 questions sous ses 5 formes en onglets, révisions espacées simulées, rien d'enregistré                                                      | Vitrine               |
| `/demo/editeur`               | tous                                       | `/demo`, sitemap                                       | Vitrine : une phrase écrite dans l'éditeur, vue dans 3 usages (message, cahier de texte, énoncé), rien d'enregistré                                                  | Vitrine               |
| `/demo/diaporama`             | tous                                       | `/demo`, sitemap                                       | Vitrine : 13 diapositives (navigation, fragments, formules, Python, cercle trigo, figure, minuteur, annotation, tableau blanc)                                       | Vitrine               |
| `/dev/saisie-naturelle`       | admin (`/dev`)                             | `/dev`                                                 | Saisie naturelle de Calcul, sans point, avec le panneau « sous le capot » ; le champ (`NaturalField.svelte`) sert aussi l'atelier, réglage « Écriture mathématique » | Prototype jetable     |

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
  `StructureFormula.svelte` (formules du corpus, survol seul) ; à côté du champ,
  `$lib/components/structure/structure-lexicon.svelte.ts` (fiches du dictionnaire au niveau de
  l'élève, 5e pour un visiteur), partagé avec la vitrine. Spécification et
  décisions : [mathast/structure-expression.md](mathast/structure-expression.md). Le moteur est
  décrit dans [mathast/README.md](mathast/README.md). Deux majuscules collées se lisent comme une
  **longueur** (« la longueur AB », `capitalPairs: 'length'`) ; la case « Lire AB comme un
  produit » repasse en mode produit, pour la formule principale et le corpus. Un nom de figure
  (`ABC`) affiche son message à la place de la lecture.
- **`/demo/structure`** (vitrine, PR 6a) : la même formule pour un visiteur, sans corpus ni cases à
  cocher (réglages par défaut : `AB` lu comme une longueur, terme soulevé pendant un déplacement),
  6 exemples (priorités, somme algébrique, différence, puissance, fractions, équation) ; à
  l'ouverture, l'expression de l'article Sésamath.
- **Catalogue des blocs** (`/aide-ecriture/blocs`, chantier
  [catalogue-blocs](../archive/wip/catalogue-blocs-progress.md)) : une fiche par bloc spécial d'ubumark
  (variations, arbre, droite graduée — avec `placer:` d'une question, un ou plusieurs points —, courbe, figure — en-tête seulement, renvoi vers
  `/aide-ecriture/geometrie` —, figure à compléter — case « figure » d'une question, rendue ici en
  figure de départ —, figure de travail — même rendu, jamais notée —, statistiques — 9 genres sur une page, avec `axe:` et `placer:` d’une question, le diagramme en barres que l’élève construit, `axe: à choisir` où il choisit d’abord l’échelle —, QR code, horloge — avec `placer:` d’une question, le cadran où l’élève pose les aiguilles —, étiquettes à ranger — le geste de l’élève, glisser ou toucher —, figure partagée en parts égales (``partage, `gris:` — avec `colorier:` d’une question, la figure où l’élève colorie les parts, en touchant ou en glissant ; avec `unites:`, plusieurs figures pour une fraction plus grande que 1 —), assemblage de cubes (``cubes — avec `dessiner:` d’une question, le quadrillage où l’élève colorie une vue ; avec `retrouver:`, la vue de dessus où il écrit les hauteurs d’après les vues —), solide en perspective cavalière (``solide : arêtes cachées en tirets, sommets nommés, `marquer:`, `cotes:`), opération posée,
  cercle trigo). Contenu écrit une fois dans `src/lib/block-catalog/<bloc>.ts`
  (`BlockCatalogEntry` : réglages avec clé, valeurs, défaut ; exemples ; erreurs fréquentes ; texte
  de la zone « Essayer »), liste ordonnée `BLOCK_CATALOG`. Page commune
  `src/lib/components/block-catalog/BlockHelpPage.svelte`, rendus avec `showAuthoringErrors` (le prof
  voit les messages situés). La route `/aide-ecriture/blocs/[bloc]` sert chaque fiche ; le cercle
  trigo garde son adresse (`href` de la fiche) et n'a pas de double sous `/blocs` (404). Garde :
  `src/lib/block-catalog/__tests__/catalogue.test.ts` passe chaque exemple par `parseMarkdown`
  (aucune erreur, bon type de nœud) et vérifie le message de chaque erreur fréquente. Les blocs
  variation, arbre et droite graduée n'ont pas de message : un bloc invalide s'y affiche en texte
  brut, ce que dit l'explication de l'erreur.
- **`/demo/cercle-trigo`** (vitrine, PR 6b) : 4 exemples du bloc `trig` rendus par
  `MarkdownRenderer`, sans leur texte : mode interactif (angle de départ π/4, le parseur refuse
  `preset: custom` sans angle), π/6 seul avec projections et tableau, cos x = 1/2, cos x > 1/2 en
  arc. Le catalogue complet et la syntaxe restent sur `/aide-ecriture/cercle-trigo`, dont un test
  vérifie que chaque exemple se dessine.
- **`/demo/blocs`** (vitrine, chantier catalogue-blocs, PR 2) : 9 exemples du catalogue des blocs,
  rangés par niveau : horloge, opération posée, droite graduée (primaire) ; barres, circulaire,
  nuage de points (collège) ; variations, arbre, courbe (lycée). Le texte n’est pas recopié :
  `src/lib/block-catalog/showcase.ts` renvoie à un exemple d’une fiche (slug + titre), un renvoi
  cassé fait échouer `showcase.test.ts`. Rendu sans `showAuthoringErrors` ; le texte du prof est
  replié sous « Voir ce qu’écrit le prof », comme « Voir le script » de `/demo/geometrie`.
- **`/demo/cartes`** (vitrine, PR 6c) : 4 cartes VIP (`VipCardHolo`), une par rareté (Coup
  Double, Super Bonus, Game of throne, Batman and Robin), écrites dans `cartes.ts` avec les textes
  du catalogue. Leurs images sont recopiées dans `static/images/demo-cartes/` : la page ne lit ni
  la base ni le stockage (dont la CSP locale refuse les images de la prod). La légendaire tourne
  seule (`showcase`). Les feuilles `/css/holo-cards/*.css` sont chargées par la page, comme dans
  `/dev/cartes`.
- **`/demo/lexique`** (vitrine, PR 6d) : les mots du dictionnaire soulignés dans une question
  (l'aire d'un carré, à remplir) et dans 5 phrases dont la fiche change avec le niveau (carré,
  aire, périmètre, fonction, fonction exponentielle), chacune avec une ligne d'aide non soulignée
  (`lexiconGrade={null}`). Un sélecteur (CM1 à 1re générale, 6e à l'ouverture) pose le niveau
  pour toute la page par `provideReaderGrade`. Le dictionnaire vient de `/api/dictionnaire`,
  public. La page de test, avec l'indice, reste sur `/dev/mots-cliquables`.
- **`/demo/corriges`** (vitrine, PR 6e) : la première page du Corrigé d'une fiche en image fixe
  (WebP, `static/demo/corriges/`), sans Typst ni polices chargés par la page. Chemin et
  dimensions dans `corriges.ts`, vérifiés par un test. L'image vient de la vraie chaîne des
  fiches, avec les deux premiers exercices de `/dev/polices/exercices-demo.json` (titre de la
  fiche : « Second degré et trigonométrie ») : un dossier de rédaction (`titles.txt`, `md/`,
  `sol/`, `en/`, `sol-en/`) passé à `pnpm tsx scripts/fiches/rendu-fiche.ts`, puis
  `node scripts/fiches/compile-prod.mjs --polices-corrige corrige.typ`, page 1 rendue par
  `pdftoppm -r 200`, recadrée sans le pied de page (`magick … -crop 1654x2225+0+0 -quality 85`).
  À refaire quand le modèle de fiche ou les polices du Corrigé changent.
- **`/demo/geometrie`** (vitrine, PR 6f) : 10 figures manipulables en trois sections (Au collège,
  Au lycée, Pour le plaisir), titre, texte et script replié sous « Voir le script ». Scripts dans
  `figures.ts`, repris des pages d'aide `/aide-ecriture/geometrie/…`, sauf l'épicycloïde, écrite
  pour la vitrine (courbe paramétrée jusqu'au curseur t, petit cercle qui roule) ; le flocon de
  Koch vient de `$lib/components/geometry/koch-dsl.ts`, partagé avec l'aide. Un test construit
  chaque figure. Textes rendus par le serveur, figures montées dans le navigateur
  (`DemoFigureCard.svelte`) et réduites à la largeur disponible, l'échelle suivant (la toile de
  `GeometryCanvas` a une largeur fixe).
- **`/demo/constructions`** (vitrine, phase 8) : 3 constructions (parallélogramme par ses
  diagonales, partage d'un segment en trois, symétrique d'un point au compas), titre, texte et
  script replié sous « Voir le script ». Scripts dans `constructions.ts`, recopiés des réécritures
  de `scripts/constructions-prod/contenu.ts` : la page ne lit pas la base. Un test joue chaque
  construction jusqu'au bout. `ConstructionPlayer` sans grille, monté dans le navigateur
  (`DemoConstructionCard.svelte`), ouvert sur la figure finie (`seekToEnd` ; « Jouer » repart du
  début) ; seule la toile se réduit à la largeur disponible (`zoom`), les boutons gardent leur
  taille. L'éditeur reste au prof, sur `/constructions/essais`
  ([constructions.md](geometrie/constructions.md)).
- **`/demo/questions`** (vitrine, PR 6g) : la même série de 4 questions (écrites dans
  `questions.ts`, sans base) sous ses cinq formes, en onglets, avec une phrase « qui, quand » par
  forme : En classe, Entraînement, Flash-cards et Course aux nombres sont les vrais composants
  d'Automaths (`$lib/components/test/`) ; les révisions espacées sont simulées
  (`SpacedReviewDemo.svelte` : carte, 4 notes et la prochaine date d'une carte neuve, calculée
  par `$lib/srs/fsrs`). Rien n'est enregistré : la fin de série n'appelle rien, et le bandeau
  « Connecte-toi… » d'Entraînement et Flash-cards est coupé par `loginNote={false}`. Les boutons
  « Retour au panier » mènent à `/automaths/panier`.
- **`/demo/editeur`** (vitrine, PR 6h) : un seul `RichTextEditor` (`preset="standard"`) dont le
  JSON alimente trois cartes, chacune par le vrai moteur de son usage : message privé au prof
  (`RestrictedRichText`, comme `/messages/[id]`), cahier de texte (`generateHTML`, même
  sérialisation que `editor.getHTML()`, puis `transformMathHtml` et `linkifyResourceReferences`,
  comme la page élève) et énoncé d'exercice (`tipTapToMarkdown` puis `MarkdownRenderer`). Le HTML
  du cahier est calculé après `onMount` : l'hydratation garde le `{@html}` du serveur sans le
  corriger. Les formules de la carte « cahier » sortent vides (écart de
  [editeur-riche.md](editeur-riche.md)). Rien n'est envoyé ;
- **`/demo/diaporama`** (vitrine, PR 6i-c) : un `Deck` de 13 diapositives dans un cadre (bouton
  ou F pour le plein écran, `hash: false`) : comment avancer, pile verticale, fragments,
  transitions, $(x+1)^2$ développé tout seul (`autoSlide` de 2 s et fragments `->`), formules
  ubumark, bloc Python coloré avec « Ouvrir dans Python » (`pythonPageOf`), cercle trigo, droite
  d'Euler de `/demo/geometrie` en `GeometryCanvas` manipulable, minuteur (deux questions de
  `/demo/questions`, 10 s chacune, barre `ChronoBar` lue dans le contexte du Deck, puis la
  correction), `AnnotatableSlide`, `WhiteboardSlide`, liens vers `/demo` et `/atelier`. Contenu
  dans `diaporama.ts`. Dans `<main>`, titres, paragraphes et listes suivent `--font-scale`
  (`app.css`) : la page le règle selon la largeur du cadre (requêtes de conteneur), cellules de
  tableau et code compris. Le banc d'essai complet reste `/dev/diaporama`.
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
- **Nouvelle vitrine** = une entrée dans `DEMO_PAGES` et `<SeoHead {...demoSeo('/demo/…')} />`
  dans la page : `demo-pages.test.ts` échoue sinon.
- **Sous `/dev` et `/aide-ecriture`, pas de `+layout@`** : il sauterait le `+layout.server.ts`
  de l'espace, donc la garde en navigation côté client. Pas non plus de donnée sensible par un
  `load` universel (`+page.ts`) : seule la garde serveur la protège.
- **Dans `<main>`, `h2`, `p` et `li` ont une taille `!important` × `--font-scale`** (`app.css`) :
  les classes `text-*` n'y font rien. Une vitrine qui veut d'autres tailles règle
  `--font-scale` (ainsi `/demo/diaporama`) ou passe par une classe `!`.

### Écarts connus

Notés pendant le rangement (chantier demo-debug), pas traités :

- **Contenu pédagogique encore géré par l'admin** : catalogue des cartes VIP
  (`/dashboard/admin/vip-cards`, `api/admin/vip-cards/`, privilèges de classe) et lexique
  (`/dashboard/admin/dictionnaire`, `api/admin/dictionnaire/`). Règle : au prof. David : « on le
  fera plus tard ».
- **`/dev/saisie-naturelle`** : prototype jetable dont le travail est fait (#1355), candidat à la
  suppression ; à trancher par David.
- **`/dev/blockly`** : deviendra une vraie fonctionnalité (algorithmique par blocs, cycle 4,
  relais vers Python ; décidé par David le 2026-10-24) ; phase 0 à ouvrir. Ne pas le supprimer.
- **Scripts d'essai de constructions et brouillons de `/constructions`** : doublon possible, à
  revoir.
- **Images de 4 cartes VIP de Mathémo** (Voyelles Révélées, Multiplicateur x1.5, Lettre Bonus,
  Retour en Arrière) : en prod, `image_path` en `/images/vip-cards/…`, dossier absent de
  `static/` ; sans doute cassées, pas vérifié dans le navigateur.
- **`angle_polaire` rend des degrés même en mode radians** (cos(3θ) faux dès qu'on combine les
  deux) ; `dsl-builtins.md` dit « en radians », faux en mode degrés. Les courbes trigonométriques
  de l'aide à l'écriture déclarent `unite_angle("radians")`, gardé par
  `courbes-trigo-radians.test.ts`.
- **Carte « cahier » de `/demo/editeur`** : formules vides, voir l'écart de
  [editeur-riche.md](editeur-riche.md) (futur chantier : cahier de texte en ubumark).
- **Révisions espacées** : `calculateNewStability` (`src/lib/srs/fsrs.ts`) ignore la note après
  la 1re révision ([srs.md](srs.md), futur chantier `fsrs`) ; `/demo/questions` n'affiche que la
  1re, non touchée.
- **Sur téléphone**, les flèches du `Deck` chevauchent parfois le bas d'une diapositive de
  `/demo/diaporama` (comportement du Deck).

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
