---
title: Bloc ubumark ```courbe — progression
date: 2026-10-01
status: lots 1-3 livrés ; suites (lots S1-S3) livrées sur feat/courbe-suites
branche: feat/bloc-courbe (worktree ../ubumaths-wt-courbe)
---

# Bloc ubumark ```courbe

Spécification validée par David le 2026-10-01. Point de reprise en cas de crash.

## Syntaxe (v1)

````
```courbe
x: -4 ; 6
y: -8 ; 12
grille: 1 ; 2
f(x) = {{a}}*(x-{{x1}})*(x-{{x2}})   bleu   nom=C_f
g(x) = 2*x+1 sur [-1 ; 4]            rouge pointillé
points: A({{x1}};0), B({{x2}};0), S({{alpha}};{{beta}}), M(2 ; f(2))
asymptotes: x=2 ; y=1
aire: f ; {{x1}} ; {{x2}}
taille: moyenne
description: Parabole tournée vers le bas, coupant l'axe des abscisses en A et B.
```
````

**En v1** : fonctions (syntaxe maison `parseCustom`), domaine `sur [a;b]` / `]a;b]`…, fenêtre
x/y indépendante (repère anisotrope), grille + graduations (pas auto `computeGridStep` si
`grille` absent ; étiquettes avec virgule décimale française), points nommés à coordonnées
calculées dont `f(2)`, asymptotes données (pointillés), aire entre la courbe et l'axe sur
[a;b], couleurs + pointillé, nom de courbe en LaTeX.

**Pas en v1** : tangente, détection auto racines/extremums/asymptotes, survol, curseurs, suites,
paramétriques/implicites, saisie graphique, export LaTeX, masquage des graduations.

## Socle

Module NEUF branché sur les briques PURES du grapheur : `geometry-core/viewport/sampler.ts`
(`sampleFunction`), `mathAST/eval/compile.ts` (`createSafeEvaluator`),
`geometry-core/viewport/grid.ts` (`computeGridStep`). PAS `courbe()` de geometry-core (repère
isotrope, exporteurs sans `function`).

## Architecture

- `ubumark/types/courbe.ts` + `ubumark/parser/courbe-parser.ts` (modèle : `number-line-parser.ts`).
- `ubumark/utils/courbe-scene.ts` PUR : échantillonne, coupe aux discontinuités et aux bords de
  fenêtre, produit des primitives en coordonnées mathématiques (polylignes, points, étiquettes,
  graduations, polygones d'aire).
- `components/markdown/nodes/Courbe.svelte` : SVG statique, sans store, couleurs `var(--color-*)`,
  `role="img"`, `aria-label` auto « Courbe de f, x de −4 à 6 », `description:` prioritaire.
- `ubumark/generators/courbe-typst.ts` : la MÊME scène en cetz 0.3.0.
- Câblage : union `BlockNode`, 2 sites de `markdown-parser.ts` (priorités + blocs en liste),
  `MarkdownRenderer.svelte`, `ListNode.svelte`, `typst-generator.ts`, import de l'éditeur riche
  (`markdown-import.ts`, sinon le bloc disparaîtrait à l'aller-retour), `check:ubumark`.
- Variables de template déjà remplacées avant le parse : gérer `x--2`, `+-3`.

## Décisions

- **Q48 (erreurs)** : aujourd'hui une erreur de parse fait disparaître un bloc en silence. Pour
  `courbe`, l'erreur produit un nœud d'erreur : message détaillé (n° de ligne) visible pour le
  prof dans l'éditeur / l'aperçu, cadre neutre « Figure indisponible » pour l'élève. Le contexte
  prof est une prop EXPLICITE du renderer (défaut = élève). Les autres blocs ne changent pas.
- **Q49-Q53** : périmètre v1 ci-dessus (fenêtre anisotrope, grille auto, aire sur l'axe, couleurs,
  nom LaTeX) ; socle = briques pures du grapheur, pas `courbe()` de geometry-core.
- **Q54** : points à coordonnées calculées, y compris `M(2 ; f(2))` (point posé sur la courbe).
  Masquage des graduations : plus tard.

## Comportements à tester (validés)

1. bloc minimal → nœud `courbe` ; `{{a}}` remplacé avant ; `x--2` lu `x+2`.
2. `sur [0;6]` / `sur ]0;6]` : courbe arrêtée aux bornes ; fermée = disque plein, ouverte = vide.
3. `1/(x-2)` : pas de trait vertical à travers l'asymptote (polyligne coupée).
4. courbe sortant de la fenêtre découpée au bord ; point hors fenêtre non dessiné + avertissement.
5. grille auto, graduations aux multiples du pas, `0,5` en français.
6. `aire: f ; a ; b` → polygone ; a > b ou fonction inconnue = erreur.
7. erreurs (y ≤ ymin, expression illisible, clé inconnue, fonction pas en x) → message situé
   (ligne), bloc pas silencieux (Q48).
8. bloc reconnu en retrait sous un item de liste.
9. le Typst produit COMPILE en conditions de production (typst.ts 0.6.1-rc5 + cetz 0.3.0), sur
   un document en mode corrigé.
10. même scène → même nombre de polylignes et de points à l'écran et dans Typst.
11. SVG `role="img"` + `aria-label` (description prioritaire).
12. `M(2 ; f(2))` : point placé sur la courbe (Q54).

## Lots

- [x] Lot 1 — types + parseur + scène (`types/courbe.ts`, `parser/courbe-parser.ts`, `utils/courbe-scene.ts`, 36 tests rouges avant : module absent)
- [x] Lot 2 — composant + câblage + listes + Q48
- [x] Lot 3 — Typst + compilation prod

## Journal

- 2026-10-01 lot 1 : parseur + scène verts (36 tests, `src/lib/ubumark/__tests__/courbe/`).
  Choix : nom de courbe en LaTeX RESTREINT (`C_f`, `\mathcal{C}_f`) → pas de `{@html}`, même
  rendu SVG/Typst ; `pi` nu et `π` → `\pi` ; `{,}` → `.` ; points/aires/asymptotes lus APRÈS
  les fonctions (`M(2 ; f(2))` avant la ligne de f fonctionne) ; les avertissements de
  fenêtre (point, asymptote, courbe invisible) sont produits par la scène.
- 2026-10-01 lot 2 : `Courbe.svelte` (SVG, `role="img"`), câblage parseur (2 sites), renderer,
  `ListNode`, import de l'éditeur riche (bloc de code `courbe` porteur du texte : sans lui, le
  bloc DISPARAISSAIT à l'aller-retour — preuve rouge faite), `check:ubumark` signale les blocs en
  erreur / hors fenêtre.
  Q48 : contexte `components/markdown/authoring-errors.ts` + prop `showAuthoringErrors` de
  `MarkdownRenderer` (défaut élève, hérité par les rendus imbriqués), posée dans
  `MarkdownEditor` (aperçu), `RichTextEditor` (aperçu), `QuestionPreview` (formulaire de modèle)
  et la page prof `contenu/exercices/[id]`. Preuve rouge : neutraliser la prop → 3 tests rouges.
  Couleurs : tokens `--color-info/destructive/warning/foreground/muted-foreground` ; vert et
  violet n'ont pas de token → variables locales `light-dark()` dans le composant.
  Le parseur repère `courbe` dans `lines` ET `originalLines` (appariés par rang) : robuste à une
  formule `$$` multi-lignes placée avant (les blocs `line`/`trig` ne le sont pas — hors périmètre).
- 2026-10-01 lot 3 : `generators/courbe-typst.ts` (cetz 0.3.0, même scène, primitives
  marquées `// trace f`, `// point A`, `// borne`…), branché dans `typst-generator.ts` (listes
  comprises). Noms de points en TEXTE italique (`$AB$` = variable inconnue → fiche entière en
  échec) ; indice de nom de courbe entre guillemets s'il a plusieurs lettres ; bloc en erreur →
  « Figure indisponible » sans cetz. Tailles : 4,5 / 6,5 / 7,6 cm (colonne ≈ 8,7 cm).
  **Compilation prouvée** : fiche de 3 exercices (courbe complète avec 4 fonctions, aire,
  asymptotes, `ln` sur `]0 ; 6]`, points `AB` et `A'` ; deux courbes en liste petite/grande ;
  un bloc en erreur) passée par `scripts/fiches/rendu-fiche.ts` (vrai `WorksheetGenerator`,
  énoncé + CORRIGÉ, FR + EN) puis `scripts/fiches/compile-prod.mjs` (typst.ts 0.6.1-rc5) :
  4/4 OK, page relue à l'œil.
  Bundle (esbuild, hors `Courbe.svelte`, mathAST parser déjà présent) : ~20 Ko minifiés, ~28 Ko
  si `eval/compile` n'est pas déjà dans le chunk. `pnpm build` à lancer par David pour confirmer.

## Limites connues (v1)

- Le nom de courbe peut chevaucher une autre courbe (seuls les points nommés sont évités).
- Rapport du cadre fixe 4:3, quelle que soit la fenêtre.
- Export LaTeX : non (le générateur LaTeX ignore le bloc, comme avant).
- Couleurs Typst = teintes du thème clair.

## Relecture (2026-10-01) — corrections

- **Budget borné** (bloc rendu aussi dans le chat élève et le tableau blanc) : `COURBE_LIMITS`
  (`types/courbe.ts`) — 200 lignes de grille, 10 fonctions, 50 points, 20 asymptotes, 10 aires,
  bornes ≤ 10^9, étendue ≥ 10^-6 × la plus grande borne. L'analyse REFUSE (message situé), la
  scène TRONQUE et rend une scène vide si la fenêtre est inutilisable. `multiples` refuse un rang
  hors `Number.isSafeInteger` (boucle infinie au-delà de 2^53 : 22 s, 1,6 Go, `RangeError`).
  Le plafond de grille vaut aussi pour le pas automatique. Test d'entrées hostiles < 200 ms (7 ms).
- **Aire** restreinte à [a ; b] ∩ domaine de f, avec avertissement pour le prof.
- **`f(a)` hors du domaine** de f (bornes ouvertes exclues) : erreur située.
- **Bloc non fermé** : il s'arrête à sa dernière ligne de courbe (ou avant une autre clôture
  ```lang), erreur « bloc non fermé » ; ses lignes sont masquées pour la recherche des blocs de
  code, la suite du document reste visible. Limite : en item de liste, un bloc non fermé reste
  du texte (comme les autres blocs).
  ```
- Clés d'index dans les `{#each}` de `Courbe.svelte`.
- Compilation Typst dans un test Node : non faite (cetz se télécharge par le réseau) ;
  commentaire du test corrigé pour dire ce qui est prouvé.

## Suites (extension du bloc, décision de David du 2026-10-01)

Branche `feat/courbe-suites` (worktree `../ubumaths-wt-suites`), pour la 1re spé. Extension du
bloc ```courbe, PAS un nouveau bloc.

````
```courbe
x: -1 ; 10
y: -1 ; 8
u(n) = 2*n+1 pour n de 0 à 8          bleu   nom=u
v(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 9   rouge
points: …
```
````

- Suite EXPLICITE `u(n) = expr(n)` et RÉCURRENTE `v(0) = a ; v(n+1) = expr(v(n), n)` (sur UNE
  ligne ; premier rang quelconque : `v(1) = …`), rangs `pour n de n0 à n1` (entiers, n0 ≤ n1 ;
  `à` ou `a`). Pour une récurrence, n0 ≥ rang du premier terme (les termes avant n0 sont
  calculés, pas dessinés). Variables `{{…}}` résolues avant, comme le reste du bloc.
- Rendu : un disque par terme (n ; u_n), points NON reliés ; couleur, `nom=` (ancré près du
  dernier terme visible, même mécanique que le nom de courbe). Pas de pointillés de rappel en v1.
  Terme hors fenêtre : non dessiné + avertissement prof. Écran (SVG) et Typst : MÊME scène
  (primitive `sequences` de `courbe-scene.ts`, `// terme u` dans cetz).
- Socle réutilisé du grapheur, SANS store : `computeSequenceTerms` et `PREV_TERM_VARIABLE` de
  `grapheur/sequence.ts` (`v(n)` est lu par `parseCustom` comme un appel de fonction, réécrit en
  `PREV_TERM_VARIABLE` par `transformAST`).
- Pas en v1 : toile d'araignée, relier les points, sommes/produits, suites de matrices, appel
  d'une fonction ou d'une autre suite dans l'expression.
- Robustesse (`COURBE_LIMITS`) : ≤ 200 termes calculés par suite, ≤ 10 suites, ≤ 1000 termes au
  total ; rangs entiers « sûrs » ; terme non fini ou |terme| > 10^12 → calcul ARRÊTÉ à ce rang,
  avertissement situé (`v(n+1) = v(n)^2` ne fige rien). Entrées hostiles < 50 ms.
- Erreurs situées (« Ligne N : … ») : rangs non entiers, n0 > n1, récurrence sans premier terme,
  premier terme sans récurrence, expression illisible, nom qui ne correspond pas (`v(0) = 1 ;
u(n+1) = …`, `v(n-1)` dans la relation), `pour n de … à …` absent, trop de termes.

### Comportements à tester

S1. explicite `u(n) = 2*n+1 pour n de 0 à 8` → 9 points (n ; 2n+1).
S2. récurrence `v(0) = 1 ; v(n+1) = 0.5*v(n)+2` → 1 ; 2,5 ; 3,25 ; 3,625…
S3. premier rang 1 (`w(1) = 2 ; w(n+1) = w(n)+n pour n de 1 à 5`).
S4. `{{a}}` résolu avant.
S5. termes hors fenêtre non dessinés + avertissement.
S6. récurrence explosive `v(n+1) = v(n)^2` → arrêt, avertissement, < 50 ms (entrées hostiles).
S7. erreurs ci-dessus, situées.
S8. même nombre de termes à l'écran (SVG) et dans Typst.
S9. fonction ET suite dans le même bloc ; bloc dans une liste.
S10. `aria-label` mentionne la suite.
S11. Typst sans « Figure indisponible » ; compilation d'une fiche (`rendu-fiche.ts` +
`compile-prod.mjs`, 4/4 FR/EN énoncé/corrigé) si faisable.

### Lots suites

- [x] Lot S1 — types + parseur + scène + Typst (`courbe-suites.test.ts`, rouge avant : `sequences`
      absent)
- [x] Lot S2 — SVG (`.courbe-terme`) + accessibilité (5 tests navigateur, 3 rouges avant)
- [x] Lot S3 — compilation d'une fiche, vérifs finales

### Journal suites

- 2026-10-01 : termes calculés à l'ANALYSE (`CourbeSequence.terms`) avec `computeSequenceTerms`
  du grapheur ; la scène filtre à la fenêtre et tronque aux plafonds (spécification forgée).
  Avertissements : explosion / terme non défini (analyse, `node.warnings`), rangs sautés d'une
  suite explicite, termes hors fenêtre (scène). Nom de suite = UNE lettre.
- Piège trouvé par la compilation de la fiche : `parseCustom` ne lit `x(n)` comme un appel que
  pour f, g, h, u, v, w — `t(n)` y devient `t*n`. D'où la réécriture TEXTUELLE `t(n)` → `(t_n)`
  avant l'analyse, puis l'indice → variable (test rouge ajouté : t, a, p, q).
- **Compilation prouvée** : fiche de 3 exercices (fonction + 2 suites + point ; récurrence
  explosive `w(n+1) = w(n)^2` ; suite de premier rang 1 dans un item de liste, `taille: petite`)
  passée par `rendu-fiche.ts` (énoncé + corrigé, FR + EN) puis `compile-prod.mjs` : 4/4 OK,
  29 `// terme` par énoncé (20 + 4 + 5), aucun « Figure indisponible », page relue à l'œil.
- `src/lib/grapheur/sequence.ts` désormais atteint par la suite d'intégration (via ubumark) :
  motif ajouté au filtre `paths` de `nightly-integration.yml` (`check:integration-paths`).
