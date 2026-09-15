---
title: Atelier de recherche de l'élève — état des lieux, contraintes et périmètre v1
date: 2026-09-15
status: Phase 0 à écrire — les contraintes sont tranchées, aucun code écrit
scope: src/lib/components/calculator/, src/lib/stores/{calculator,repl,grapheur}.svelte.ts, src/lib/{mathAST,grapheur,geometry-core,spreadsheet,shared/python}/
---

# Atelier de recherche de l'élève

Relevé **dans le code** le 2026-09-15, puis cadré par trois décisions de David
prises le même jour. Aucun code n'est écrit : ce document sert de base à la
Phase 0 (spécification des comportements en français).

---

## 1. L'intention, en une phrase

Faire des cinq moteurs mathématiques du projet **un seul outil de recherche pour
l'élève** — l'endroit où il cherche un problème complexe, essaie, se trompe,
conjecture et garde ce qu'il trouve.

### Les trois décisions tranchées par David (2026-09-15)

| #   | Décision                                                                         | Ce que ça ferme                                                                                                               |
| --- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Public visé : l'élève**, comme outil de recherche — pas le prof en préparation | Les étapes pédagogiques, l'export Typst/LaTeX et le tableau de variations inséré dans un cours descendent tous au second plan |
| 2   | **Sans compte**                                                                  | Pas de base, pas de RLS, pas de RGPD, pas d'assignation, pas de checkpoints, pas de correction                                |
| 3   | **Du collège au lycée**                                                          | Pas de sélecteur de niveau ; la progressivité doit être une propriété de l'interface, pas un réglage                          |

David a également validé la recommandation d'architecture du §7 et le périmètre
du §9.

---

## 2. Ce qui existe : cinq moteurs, cinq îles

Tailles mesurées hors tests, le 2026-09-15.

| Moteur                                             | Lignes  | Sait faire                                                                                                                                                                                                                                                                                                                                                             | Ignore                                                                                      | Persiste           |
| -------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| **CAS** `mathAST`                                  | 152 749 | parse LaTeX + syntaxe custom, hash canonique et équivalence, simplify, dérivée, intégrale (symbolique et définie), Taylor, `solve` avec étapes par niveau, domaine, **variations complètes** (signe, extrema, limites aux bornes), fonctions nommées avec dérivée / réciproque / domaine, exact ou décimal, **unités dimensionnées**, **stats et régression linéaire** | les données (listes, tableaux), le dessin                                                   | —                  |
| **Grapheur**                                       | 8 976   | **repère anisotrope** (redimensionnement d'un seul axe, unique dans le projet), suites explicites et récurrentes, escalier, tableau de termes, **curseurs paramètres**, dérivée, tangente, aire, cercle osculateur, longueur d'arc, asymptotes obliques, zéros / extrema / intersections **exacts**, survol lecteur de valeurs                                         | paramétrique, polaire, implicite, coniques, **nuages de points**, échelle logarithmique     | localStorage       |
| **Géométrie** `geometry-core` + `constructions-v2` | 45 940  | DSL francophone (92 primitives), 80 types d'objets, graphe de dépendances réactif, drag, aimantation, hit-testing, curseurs, undo/redo, paramétrique + polaire + implicite + coniques + lieux + transformations, instruments animés, export SVG / TikZ / Typst                                                                                                         | les suites, l'anisotropie, les asymptotes de fonction                                       | `constructions`    |
| **Tableur**                                        | 8 529   | grille 20×20, **parser de formules maison**, ~50 fonctions FR/EN, graphe de dépendances, formats, CSV                                                                                                                                                                                                                                                                  | **tout le reste du projet** — aucun import de `mathAST`, aucun graphique, aucune régression | `spreadsheets`     |
| **Python** Pyodide                                 | 14 790  | worker isolé, contextes persistants nommés, notebook Jupyter-like, **débogueur pas-à-pas** avec diagramme mémoire et arbre de récursion, matplotlib / numpy / **sympy** à la demande, sortie LaTeX sympy, exercices validés par AST, assignation, présentation                                                                                                         | —                                                                                           | `python_notebooks` |

**Les seules coutures qui existent** : grapheur → `mathAST`, `geometry-core` →
`mathAST`, et le bouton « Tracer » de `/calc`. Le reste est vide.

---

## 3. Ce qu'est `/calc` aujourd'hui

Six phases livrées les 5 et 6 janvier 2026, marquées `COMPLETE`
(`docs/wip/calculator-progress.md`, supprimé depuis, lisible dans `0e233d5b0`),
**plus touchées depuis** hors renommages Chiphre. C'est **1 237 lignes de
composants posées sur un moteur de 152 749 lignes**.

Deux onglets, `Calcul | Graphique`. L'intégration réelle tient en une fonction :
`handlePlot()` → `grapheurStore.addFunction()` puis bascule d'onglet
(`CalculatorContainer.svelte:148`).

Sept constats, tous vérifiés dans le code le 2026-09-15 :

| #   | Constat                                                                                                                                                                                             | Où                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | **Le résultat n'est pas rendu en maths.** On saisit dans MathLive et on relit `\frac{x^{2}}{2}` en monospace ; le commentaire l'annonce (« will be replaced by proper LaTeX rendering »)            | `ResultDisplay.svelte:143`                           |
| 2   | **Deux stores, deux pages, un seul moteur.** `/calc` et `/cas` instancient chacun un `WebReplEngine` : historiques, variables et fonctions **disjoints**                                            | `calculator.svelte.ts:183`, `repl.svelte.ts:135`     |
| 3   | **22 commandes invisibles dans `/calc`.** L'autocomplétion en liste 8 en dur ; le registre en compte 26, plus 4 web-only (`.stats`, `.linreg`, `.convert`, `.unitmode`)                             | `UnifiedInput.svelte:33`                             |
| 4   | Donc **les phases 2 (unités) et 4 (statistiques) sont inaccessibles** à qui ne lit pas le code                                                                                                      | —                                                    |
| 5   | `calculatorStore.getCommands()` existe **sans aucun appelant**. `/cas`, lui, s'en sert pour son popover d'aide — c'est un argument pour que la fusion parte de `/cas`                               | `calculator.svelte.ts:356` vs `HelpPopover.svelte:9` |
| 6   | Le passage au grapheur est une **regex sur le LaTeX de sortie** (`/(?<![a-zA-Z])x(?![a-zA-Z])/`), alors que le CAS sait donner les variables libres exactement (`getVariables`)                     | `ResultDisplay.svelte:34`                            |
| 7   | **`/calc` n'est dans aucune navigation** — ni `Sidebar.svelte`, ni `Header.svelte`, ni `dashboard-nav.ts` — et aucun lien entrant dans tout `src/`. Idem `/cas`, `/spreadsheet`, `/python-notebook` | `Sidebar.svelte:28-52`                               |

Le constat 7 est le plus brutal : **l'outil n'existe pas pour un élève.**

---

## 4. Le diagnostic

Cinq manques, dans l'ordre où ils font mal.

1. **Aucun état partagé.** Quatre registres de variables disjoints : l'`EvalState`
   du CAS, les `parameters` du grapheur, les cellules du tableur, le namespace
   Python. La lettre `a` y désigne quatre choses sans rapport.

2. **Aucun type de donnée commun autre que l'expression.** Il n'existe nulle part
   de « liste de nombres » partagée — l'objet pivot de la statistique, du nuage de
   points, de la suite et du tableau de valeurs, les quatre à la fois.

3. **Aucun conteneur.** Le notebook est un conteneur de cellules, mais ses
   cellules ne peuvent être que Python. `ubumark` a des blocs pédagogiques riches
   (droite graduée, arbre de probabilités, cercle trigonométrique, tableau de
   variations) et **aucun** bloc figure / courbe / tableur / calcul.

4. **Deux représentations du même objet qui s'ignorent.** `mathAST/variations/`
   **calcule** un tableau de variations complet ; `ubumark/types/variation-table.ts`
   en **affiche** un et l'exporte en LaTeX et Typst. Aucun pont. (Utile au prof,
   donc hors périmètre ici — mais à ne pas perdre de vue.)

5. **Trois moteurs de calcul rivaux** (`mathAST`, le parser du tableur, sympy) et
   deux moteurs de tracé. Pour les tracés, la coexistence est **justifiée** :
   `docs/wip/grapheur-vs-geometry-core.md` §1 établit que l'analyse exige
   d'écraser un axe et la géométrie que le cercle reste rond. Pour les moteurs de
   calcul, non.

---

## 5. Le principe directeur : le changement de registre

**Chercher en maths, c'est passer d'un registre à l'autre** — du numérique au
graphique, du graphique à l'algébrique, de l'algébrique au géométrique — sans
perdre l'objet en route. Aucune calculatrice ne le fait.

C'est la seule justification solide de l'outil, et elle décide de tout le reste :
l'état partagé et le geste « envoyer vers » ne sont pas des commodités, **ils sont
le produit**. Le reste est décor.

---

## 6. La forme : l'atelier à objets

Ni une calculatrice à onglets, ni un cahier. Un **panneau « Mes objets »
persistant**, visible depuis toutes les vues, et des outils qui deviennent des
_vues sur ces objets_ au lieu d'îles juxtaposées.

```
Mes objets            │  ┌─ Calcul ──┬─ Graphe ──┬─ Figure ──┬─ Données ──┬─ Python ─┐
  f(x) = x² − 3x      │  │                                                            │
  u : u₀ = 2, uₙ₊₁…   │  │   La même chose, montrée autrement.                        │
  a = 3    ●────────  │  │   Aucun transfert, aucun re-parse.                         │
  L = [12, 15, 9, …]  │  │                                                            │
  A, B, (d)           │  └────────────────────────────────────────────────────────────┘
```

`f` défini dans Calcul est traçable dans Graphe, tabulable dans Données,
dérivable, injectable dans Python. `a` est **le même** curseur partout.

Techniquement : `EvalState` (bindings + fonctions + mode, déjà sérialisable —
`mathAST/cli/core/eval-state.ts`) élargi aux listes et aux objets géométriques,
porté par l'atelier au lieu d'être un singleton par store.

> ⚠️ Ne pas nommer ça « panier » : `questionCart` occupe déjà le terme.

### Le panneau résout aussi la progressivité

L'écart 6ᵉ ↔ terminale est énorme, et un sélecteur de niveau serait la mauvaise
réponse : ça stigmatise, ça enferme, et l'élève ment.

**En attachant les actions aux objets plutôt qu'à une barre de menus, la
progressivité tombe toute seule.** Tant qu'il n'y a que des nombres dans
l'atelier, aucun menu « dériver » n'existe. Dès qu'une fonction est définie, les
actions de fonction apparaissent sur elle. L'outil ne montre que ce que l'objet
appelle. Un seul dispositif, deux problèmes résolus — c'est le point de design le
plus important de ce document.

**Corollaire de vocabulaire** : `.diff`, `.taylor`, « AST », « forme normale »,
c'est du vocabulaire de développeur. Le DSL géométrie a déjà fait le choix du
français ; le CAS ne l'a pas fait. Avec les actions sur les objets, on ne tape
plus `.diff f` : on clique **dériver** sur `f`.

---

## 7. Les conséquences de « sans compte »

### La bonne nouvelle

**Aucune donnée d'élève mineur ne quitte le navigateur.** Plus de RLS, plus de
policies, plus de RGPD, plus de migration. Le chantier le plus ambitieux de la
liste devient le moins risqué pour la production.

### L'URL remplace le compte

Sans compte, le partage par URL **remplace à la fois** la sauvegarde cloud, la
reprise sur un autre appareil, le rendu au prof et la distribution d'énoncés. Ce
n'est plus un bouton « Partager », c'est le mécanisme central :

- l'élève envoie son brouillon au prof ou à un camarade ;
- le prof envoie un **atelier pré-rempli** (« voici la figure et les données,
  cherche ») sans rien assigner et sans base ;
- téléphone → ordinateur ;
- l'élève garde une trace de ce qu'il a trouvé.

Le mécanisme existe déjà dans `/calc` (`?share=`, base64 + validation Zod) mais
plafonné à 400 caractères et au dernier résultat seul
(`CalculatorContainer.svelte:175`). Il faut le passer à l'atelier entier,
compressé.

### Ce qu'il faut assumer

| Contrainte                                                                                                                    | Réponse                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Quota localStorage (~5 Mo) — le gestionnaire `QuotaExceededError` de `calculator.svelte.ts:444` prouve qu'on l'atteint déjà   | IndexedDB, ou budget strict par atelier                                                        |
| **Perte silencieuse** : navigation privée, nettoyage, autre appareil. Perdre 40 minutes de recherche est pire que pas d'outil | Export / import de fichier local, comme le `.ubw` du whiteboard                                |
| Pas d'assignation, pas de checkpoints, pas de correction                                                                      | Confirme qu'on ne valide pas, et écarte le notebook comme conteneur                            |
| Hors ligne : le service worker existe (`static/service-worker.js`)                                                            | **Sauf Pyodide** (~10 Mo de CDN au premier chargement) — à annoncer franchement, pas à masquer |

---

## 8. Les conséquences de « collège → lycée »

Ce que le collège fait remonter dans la liste :

- **Les unités et les grandeurs** (`.convert`, dimensions, messages d'erreur
  dimensionnels déjà en français) : c'était une commande cachée de la phase 2,
  c'est en fait une fonction de premier plan pour la moitié de la cible —
  vitesses, aires, volumes, conversions.
- **Les fractions exactes** : déjà là (mode exact), seulement invisible. Voir
  `√2/2` et non `0.7071…` est ce qui permet de reconnaître un motif.
- **La géométrie à la souris** : au collège c'est le registre **principal**, pas
  un registre de plus. Or elle n'est aujourd'hui pilotable **que par le DSL** —
  aucune barre d'outils « point / droite / cercle » n'existe
  (`src/lib/components/geometry/` ne contient que `GeometryCanvas`,
  `ElementPopover`, `SliderControl`). Le moteur a pourtant déjà le drag,
  l'aimantation, le hit-testing, les curseurs et l'undo/redo : **tout sauf l'UI de
  création.** Sans elle, l'outil est un outil de lycée.
- **Mobile d'abord** : un collégien cherche sur son téléphone. Panneau + vue en
  plein écran s'y prête mieux que des onglets côte à côte.

---

## 9. Décisions figées — ne pas les re-proposer

1. **L'atelier possède l'état ; les vues n'en sont que des projections.**
   (Validé par David le 2026-09-15.) L'alternative — garder les stores singleton
   maîtres et faire de l'atelier un routeur — a été écartée : elle laisse deux
   vérités et ramène le partage d'objets à du transfert de chaînes, c'est-à-dire
   exactement ce qu'on cherche à quitter. ⚠️ Conséquence à traiter : `/grapheur`
   vit aujourd'hui sa vie avec sa propre persistance (`chiphre-grapheur-state`).
2. **On ne valide pas.** Le projet a une culture forte de la validation
   (checkpoints, `validateAnswer`, verdicts) et ce serait le réflexe. Un outil qui
   dit à l'élève si c'est juste tue la recherche : elle consiste précisément à
   décider soi-même si l'on tient quelque chose.
3. **On ne fusionne pas grapheur et `geometry-core`.** Voir
   `grapheur-vs-geometry-core.md` §1 : l'isotropie est une contrainte de domaine
   opposée dans les deux cas. On les rend invocables depuis le même conteneur.
4. **Pas de sélecteur de niveau.** La progressivité passe par les actions
   attachées aux objets (§6).

---

## 10. Périmètre

### v1 — l'atelier qui tient debout

Une page **publique**, le panneau d'objets, **trois vues** (Calcul · Graphe ·
Données), le partage par URL, les verbes français. **Sans géométrie, sans
Python.**

Ça couvre déjà : calculer exact, convertir des grandeurs, définir une fonction,
la tracer, la tabuler, saisir des données, faire des statistiques, conjecturer.
Du 6ᵉ au terminale.

### v2 — la géométrie à la souris

Barre d'outils de construction sur `GeometryCanvas`. Le plus gros chantier, et
celui qui ouvre l'outil au collège.

### v3 — Python

Le banc d'essai de conjecture : un problème complexe se teste par force brute
avant de se démontrer. Lycée seulement, et demande le réseau. Le pont existe déjà
dans les deux sens (`executeCode` écrit le namespace, `variable_check` le relit).

---

## 11. Ordre de travail

1. **Découvrabilité + verbes français sur les objets** — rendu mathématique du
   résultat, commandes réelles, fusion `/calc` + `/cas` **en partant de `/cas`**,
   mise en navigation. Sans ça, rien de ce qui suit n'existe pour un élève.
2. **Le panneau d'objets** — partage d'état _et_ progressivité.
3. **Partage par URL de l'atelier entier** — remplace le compte.
4. **Unités et exactitude visibles** — la moitié collège de la cible.
5. **Listes de première classe** + tableau de valeurs de fonction. C'est le
   chaînon qui relie d'un coup une colonne du tableur, les stats, le nuage de
   points (que le grapheur ne sait **pas** tracer) et les termes d'une suite.
6. **Géométrie à la souris** (v2).
7. **Python** (v3).

Les trois premiers suffisent à faire exister l'outil ; les suivants le rendent
complet.

---

## 12. Ce qui reste à faire avant tout code

**Phase 0 — spécification TDD.** Proposer les comportements en français (cas
nominal, cas limite, cas d'erreur) pour au moins :

- le cycle de vie d'un objet de l'atelier (créer, renommer, supprimer, collision
  de noms entre les vues) ;
- la sérialisation et la relecture de l'atelier dans une URL (taille, corruption,
  version de format, atelier venu d'une version plus récente) ;
- l'apparition et la disparition des actions selon le type d'objet (§6) ;
- la cohabitation avec `/grapheur` et sa persistance existante (décision figée
  n° 1).

Aucun code avant validation de cette Phase 0.

---

## 13. Ce que ce document n'a pas fait

- Aucune mesure de performance, aucun budget de bundle. Le chunk du root layout
  reste sous garde CI (`docs/ref/safari-webkit-tdz.md`) — l'atelier devra charger
  ses moteurs en import dynamique.
- Aucune maquette. La forme du §6 est un principe, pas un écran.
- Aucune décision sur le sort de `/calc`, `/cas`, `/calculatrice` (NumWorks) et
  `/spreadsheet` une fois l'atelier en place.
- Les numéros de ligne cités datent du **2026-09-15** : les revérifier avant de
  s'en servir.
