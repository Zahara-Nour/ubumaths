---
title: Bloc ubumark ```figure — progression
date: 2026-10-01
status: lots 1-3 livrés sur la branche (PR à ouvrir)
branche: feat/bloc-figure (worktree ../ubumaths-wt-figure)
---

# Bloc ubumark ```figure

Spécification validée par David le 2026-10-01. Point de reprise en cas de crash.
Modèle à reproduire : le bloc ```courbe (`docs/archive/wip/bloc-courbe-progress.md`, #576).

## Syntaxe (v1)

````
```figure
fenetre: -1 ; 8 ; -1 ; 6
taille: petite
description: Triangle rectangle ABC.
---
A = point(0, 0)
B = point({{c}}, 0)
C = point(0, {{b}})
p = polygone(A, B, C)
angle(B, A, C, marque="carre")
```
````

- En-tête (avant `---`) : `fenetre` = xmin ; xmax ; ymin ; ymax (repère ISOTROPE : la hauteur
  se déduit de la largeur), `taille` (petite / moyenne / grande), `description`.
- Corps : le DSL de geometry-core TEL QUEL, interprété sans affichage (`interpret(parse(script))`).
- v1 : seulement les types que geometry-core exporte déjà en SVG ET en Typst — points, segments,
  droites, demi-droites, vecteurs, cercles, arcs, polygones, angles, codages, textes.
- REFUSÉS en v1, message situé : `courbe` / fonctions, aires, lieux, images (URL externe),
  curseurs, animations (`@instruction`…), tout type hors liste blanche.

## Décisions

- **Q48 (erreurs)** : comme `courbe` — message détaillé (résumé + n° de ligne du bloc) pour le
  prof (`showAuthoringErrors`), cadre neutre « Figure indisponible » pour l'élève.
- **Q53 (source)** : le DSL est écrit EN LIGNE dans le bloc, pas de renvoi vers une construction
  enregistrée, pour que les variables de modèle `{{c}}` fonctionnent.
- **Q56 (rendu)** : partout, y compris chat élève et tableau blanc → bornes de robustesse : un
  bloc hostile ne doit jamais figer l'onglet.

## Architecture

- `ubumark/types/figure.ts` + `parser/figure-parser.ts` : garde le script brut + l'en-tête
  (analyse légère, sans geometry-core : le parseur Markdown reste dans le chunk des pages).
- `ubumark/utils/figure-scene.ts` : interprétation SANS affichage, liste blanche des types,
  bornes (taille du script, nombre d'objets, budget d'exécution).
- Composant chargé à la demande (`{#await import()}`) : afficheur LÉGER sur les primitives SVG
  de geometry-core — PAS `GeometryCanvas` (mathlive + roughjs), qui ne doit pas entrer dans le
  chunk des pages Markdown.
- Typst : `exportToTypst` aligné sur cetz 0.3.0 (même version que `courbe`, `trig`, `line`).
- Câblage comme `courbe` : ast, 2 sites de `markdown-parser.ts`, `MarkdownRenderer`,
  `ListNode`, `typst-generator`, `rich-text/markdown-import.ts`, `check:ubumark`.
- Accessibilité : `role="img"`, `aria-label` auto, `description:` prioritaire.

## Comportements à tester (validés)

12. un script de triangle donne une figure ; `{{c}}` remplacé (via le vrai `resolveMarkdownContent`).
13. type hors liste blanche (`courbe`, `image`, curseur) → erreur explicite située.
14. erreur DSL → son message (`summary`) et sa ligne, visibles pour le prof ; cadre neutre élève.
15. Typst : chaque élément visible à l'écran a son équivalent exporté (même nombre) ; le texte
    compile en conditions de production (fiche FR/EN énoncé + corrigé via `rendu-fiche.ts` puis
    `compile-prod.mjs`).
16. le composant n'est PAS dans le chunk Markdown (chargé à la demande).

- robustesse : entrées hostiles bornées (< 200 ms) ; bloc dans une liste ; aller-retour éditeur riche.

## Lots

- [x] Lot 1 — types + parseur + scène (40 tests rouges avant : modules absents ; 6 tests geometry-core)
- [x] Lot 2 — composant à la demande + câblage + Q48
- [x] Lot 3 — Typst + compilation prod

## Journal

- 2026-10-01 lot 1 : `types/figure.ts`, `parser/figure-parser.ts` (LÉGER : aucun import de
  geometry-core), `utils/figure-scene.ts` (`src/lib/ubumark/__tests__/figure/`, 40 tests).
  **Budget** : la mesure a montré le danger — trois boucles `pour` imbriquées (1000 tours
  chacune) figeaient l'interpréteur **23,8 s** ; `polygone_regulier(O, 1, 10^7)` crée 10^7 objets
  en UNE instruction. Ajouts OPTIONNELS à geometry-core (sans option : comportement historique,
  3422 tests verts) : `interpret(…, { maxSteps })` (instructions + tours de boucle, erreur située
  « Budget d'exécution dépassé ») et `Figure.setElementLimit(n)` (`FigureElementLimitError`).
  Plafonds `FIGURE_LIMITS` : 20 000 caractères, 500 lignes, 400 objets (cachés compris),
  5 000 instructions. Entrées hostiles : toutes refusées en ≤ 50 ms (le pire :
  `polygone_regulier` à 10^7 sommets, coupé au 400ᵉ objet).
  **Liste blanche en deux temps** : les appels refusés (`courbe`, `tangente`, `aire`, `lieu`,
  `trace`, `image`, `slider`/`curseur`, `secteur`, `couronne`, `mtexte`, `rtexte`…) et les
  directives `@…` sont rejetés AVANT l'exécution par un parcours de l'AST (boucles et macros
  comprises) → ligne exacte, et aucun calcul coûteux lancé ; puis chaque objet VISIBLE doit être
  d'un type dessiné par l'écran ET par `exportToTypst` (filet).
  Choix : `;` accepté comme séparateur d'arguments (`point(0;0)`, usage français — le DSL n'a
  pas de `;`, remplacé hors chaînes et commentaires) ; `2{,}5` (valeur affichée d'une variable)
  lu `2.5`. `angle_droit` n'existe pas dans le DSL (retiré en mai) : codage = `angle(B, A, C,
marque="carre")`. `mtexte`/`rtexte` refusés : leur LaTeX n'a pas d'équivalent Typst sûr.
  Erreurs : `Ligne N : <summary>` avec N = ligne du BLOC (pas du script) + `hint` de geometry-core.
- 2026-10-01 lot 2 : `FigureBlock.svelte` (LÉGER, dans le chunk Markdown : n'importe rien de
  geometry-core ; erreurs d'en-tête affichées sans rien charger ; cadre aux proportions de la
  figure pendant le chargement ; échec de chargement → « Figure indisponible ») +
  `FigureBlockView.svelte` (chargé par `import()`, SVG statique depuis `utils/figure-svg.ts`, qui
  n'utilise que les PRIMITIVES SVG de geometry-core — ni `GeometryCanvas`, ni `exportToSVG` qui
  importe roughjs) + `FigureErrors.svelte` (Q48, réutilise `showAuthoringErrors` de `courbe`).
  Câblage : union `BlockNode`, 2 sites de `markdown-parser.ts` (les lignes d'un bloc figure sont
  masquées pour la recherche des blocs de code, comme `courbe`), `MarkdownRenderer`, `ListNode`,
  `markdown-import.ts` (preuve rouge : 3 tests d'aller-retour rouges avant), `check:ubumark`.
  Style par défaut d'une figure : objets NOIRS (`Figure` créée avec `defaultColor: #000000`,
  traits 1,5, points de rayon 3) ; à l'écran le noir devient `var(--color-foreground)` (clair /
  sombre), posé en `style:` (un `var()` dans un attribut de présentation SVG n'est pas fiable).
  **Faille trouvée et corrigée dans geometry-core** : `marque_segment(A, B, traits=10^8)` n'était
  pas borné (documenté 1, 2 ou 3) → une boucle par trait à chaque rendu ; refusé désormais.
  Tests navigateur (`nodes/__tests__/FigureBlock.svelte.test.ts`, 12, rendus dans `<main>`) :
  chaque objet visible de la scène a sa forme (`data-element`), repère isotrope, couleur
  calculée non vide, Q48 prof/élève, contexte du renderer, bloc dans une liste.
- 2026-10-01 lot 3 : `generators/figure-typst.ts` = `exportToTypst` de geometry-core, ALIGNÉ
  sur la production (tests rouges avant, `export-typst-production.test.ts`) : cetz **0.3.0** (était
  0.3.4), noms de points et textes en CHAÎNES Typst échappées (était `$AB$` → variable inconnue,
  fiche entière en échec ; `exportToTypst` n'avait aucun appelant hors tests), options
  `includeImport`, `annotate` (`// element <id>`), `includeViewportBounds` (cadre invisible =
  fenêtre), `markScale` (points, codages, angles gardent leur taille quand une unité ≠ 1 cm).
  Repère isotrope : unité = largeur (4,5 / 6,5 / 7,6 cm comme `courbe`) / (xmax − xmin).
  **Comportement 15** : l'écran (`figureToSvg`, `data-element`) et le PDF (`// element <id>`)
  dessinent exactement les mêmes objets (test). **Compilation prouvée** : fiche de 3 exercices
  (figure complète : 4 points dont `AB`, polygone, angle droit, angle mesuré, codage 2 traits,
  vecteur, 2 cercles, arc, droite, demi-droite, milieu, texte `*1* $ _x_ \ y` ; deux figures en
  liste petite/grande ; fenêtre 100 × 60 ; un bloc en erreur) passée par
  `scripts/fiches/rendu-fiche.ts` (vrai `WorksheetGenerator`, énoncé + CORRIGÉ, FR + EN) puis
  `scripts/fiches/compile-prod.mjs` (typst.ts 0.6.1-rc5) : **4/4 OK**, page relue à l'œil.
  **Comportement 16 — chunk Markdown, mesuré** : bundle ROLLUP 4.60 (le bundler de vite 7) de
  `MarkdownRenderer.svelte`, tree-shaking par défaut, paquets npm externes (script d'analyse hors
  dépôt). Premier essai : `typst-generator` importait `figure-typst` → **~630 Ko non minifiés de
  geometry-core (dont `builtins.ts`, 200 Ko) dans le chunk statique** — `typst-generator` est
  réexporté par le baril `$lib/ubumark`, importé par 19 modules dont le rendu Markdown, et rollup
  range dans le chunk d'entrée tout module ATTEIGNABLE statiquement. Correctif : registre léger
  `figure-typst-registry.ts` dans `typst-generator` ; le rendu réel est inscrit par
  `figure-typst-setup.ts`, importé par les 4 producteurs de PDF (`worksheet-generator`,
  `student-worksheet-typst`, `notebook-generator`, `exercise-typst-generator`) ; un test interdit
  un appel à `generateTypst` sans cet import (sinon « Figure indisponible » silencieux). Après :
  chunk Markdown = `figure-parser` seul (5 Ko) ; `FigureBlockView` + interpréteur + builtins dans
  un chunk À LA DEMANDE (~490 Ko minifiés, ~120 Ko gzip), qui n'importe ni roughjs ni
  `GeometryCanvas` (mathlive y est seulement re-déclaré par rollup : déjà chargé par la page).
  À confirmer par David sur un vrai `pnpm build` (interdit aux agents).

## Limites connues (v1)

- Pas de découpage à la fenêtre au PDF : un objet qui dépasse la fenêtre agrandit la figure
  (à l'écran il est coupé). Le prof est averti pour les points hors fenêtre.
- `#` dans une chaîne du DSL : refusé par le tokenizer de geometry-core (« Chaîne non fermée »,
  message situé) — défaut préexistant du DSL, hors périmètre.
- Étiquettes : placement réglable depuis le 2026-10-02 (`etiquette=`, `ancre=`, voir `figure-etiquettes-progress.md`).
- Export LaTeX : non (le générateur LaTeX ignore le bloc).

## Relecture (2026-10-01) — corrections

Chaque correctif des points 1 à 4 a sa preuve rouge (correctif neutralisé → échec constaté →
restauré depuis une copie).

1. **Couleurs** (bloquant) : la scène résout toute couleur (trait, remplissage) en hexadécimal
   3/4/6/8 chiffres (ce que `rgb()` de Typst accepte — 5 chiffres l'aurait fait échouer) ; noms
   courants FR/EN en table ; sinon erreur située (ligne de la chaîne). Défense en profondeur :
   `exportToTypst` écrit `black` pour toute couleur non hexadécimale. Le tokenizer de
   geometry-core prenait le `#` d'une chaîne pour un commentaire : `couleur="#2563eb"` était
   impossible à écrire → corrigé (commentaire retiré HORS chaînes seulement).
2. **Nombres non finis** (bloquant) : coordonnées, rayons, angles d'arc, composantes de
   vecteur, positions de texte, épaisseur, taille → finis et |x| ≤ 10^9 (au-delà, notation
   exponentielle), sinon erreur située (ligne `A = …`). Export : toute ligne avec `NaN` /
   `Infinity` hors chaîne est omise.
3. **Injection CSS** : fermée par 1 ; défense à l'écran (`figureToSvg` : non hexadécimal →
   couleur par défaut). Test navigateur : la couleur hostile n'apparaît jamais dans le DOM.
   **Bloc courbe vérifié** : couleurs = liste fermée, nombres déjà bornés (test
   `courbe-relecture-bornes.test.ts`, vert sans correctif — rien à corriger).
4. **Budget par document** (`components/markdown/render-budget.ts`) : `MarkdownRenderer` pose un
   budget partagé (rendus imbriqués compris) par les blocs figure ET courbe : au plus 20 blocs et
   100 ms de calcul cumulé ; au-delà, cadre neutre (message pour le prof). Mesuré au navigateur :
   126 blocs `polygone_regulier(K,1,10^7)` (10 000 caractères) 2 785 ms → < 300 ms ; 70 blocs
   `intersection` 1 909 ms → < 300 ms.
5. `markdownToTypst` inscrit lui-même le rendu (import dynamique, chunk Markdown inchangé) ; le
   test du registre repère aussi les imports renommés ; `point(2,5 ; 1)` → « virgule décimale :
   écrire 2.5 ou 2{,}5 ». Filtre nightly : `src/lib/geometry-core/**` (les producteurs de PDF
   importent désormais l'interpréteur).

Fiche en conditions de production avec les cas 1 et 2 (couleurs anglaises normalisées, couleur
hostile, `0/0`, `10^400`) : FR/EN, énoncé + corrigé, **4/4 compilées**, cadres neutres, aucun
`NaN` ni `rgb("` non hexadécimal dans le Typst.
