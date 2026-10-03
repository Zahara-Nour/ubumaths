# Restes du chantier « cleanCoefficients sur les modèles publiés » (outils)

Branche `fix/restes-publies-outils`, worktree `ubumaths-wt-restes-outils`. Rien n'est écrit en base.

## 2. Modèles hors de synchronisation — fait

Comparaison de TOUS les champs des fichiers `scripts/questions/*-existants/*.json` à la production
(lecture seule, 2026-10-03). Écarts trouvés, tous des changements avérés faits en base :

- **f8ccc8b6** (vrai / faux, polynômes) : `subdomain` « Vrai ou Faux » → « Propriétés » (Q117 (a),
  `docs/wip/questions-de-cours-progress.md`) ; `options.courseQuestion: true` (Q116 (b)). ⚠️ `options`
  est ÉCRIT par le script : sans la synchronisation, une écriture aurait EFFACÉ le marqueur « question de
  cours ».
- **158ecaa4**, **1315d326**, **c23840b6**, **849aabbc** : sous-domaines accentués
  (`scripts/rename-question-subdomains.ts`, commit 772a9c434).
- Tous les autres fichiers : identiques à la base, champ par champ.

Simulation des trois lots : chaque cible « identique ».

Reste hors de ce chantier : `src/lib/questions/category-order.ts` porte encore « Vrai ou Faux » pour
Fonctions › Polynôme du second degré (le sous-domaine « Propriétés » se range donc en fin de liste).

## 3. Cinq fichiers des suites hors lot — fait

337d31c3, 849aabbc, 1315d326, 7247dbb0, c23840b6 : exportés au lot 1 (commit 29c7c6e26) avec les
14 modèles publiés du thème, mais seuls les 9 CORRIGÉS ont été mis dans `SUITES`. Tous publiés, identiques
à la base (après les sous-domaines accentués) → ajoutés au lot `suites`, simulation « identique ».

## 1. `\bold{…}` → « bold1 » dans le PDF — fait

- **Cause** : `convertLatexToTypstMath` ne connaissait que `\mathbf` ; `\bold`, `\boldsymbol`, `\bm`
  tombaient dans le filet des commandes inconnues (nom en texte : `"bold"#text(…)[$-3$]`).
  `\textbf{…}` entourant une commande (`\textbf{\textcolor{…}{1}}`) : même défaut.
- **Correction** : les quatre convertis en `bold(…)` (accolades équilibrées, comme `\mathbf`).
- **Écran** : MathLive (`convertLatexToMarkup`) connaît `\bold`, `\boldsymbol`, `\bm` (classe
  `ML__mathbf`, aucune erreur de `validateLatex`) : rien à changer dans les modèles.
- **Preuves** : test rouge (7 cas) puis vert (`typst-authoring-defects.test.ts`, point 12) ; corrigé
  de 1acb6d47 compilé par le compilateur de prod, avant « bold − 3 », après −3 en gras orange ;
  fiche des 54 modèles publiés (108 tirages) compilée OK, 0 « bold » dans le texte du PDF.
- **Mesure prod** (lecture seule) : `\bold` dans 54 modèles PUBLIÉS, `\mathbf` dans 13 brouillons
  et 2 exercices, `\boldsymbol` / `\bm` / `\textbf` : 0. Empreinte Typst de 67 modèles × 30
  tirages (4020 textes) : 1584 changent, tous dans les 54 modèles à `\bold`, chaque ligne changée
  portait « "bold" » avant, 0 après ; brouillons à `\mathbf` inchangés. Exercices
  (`empreinte-typst.ts`, 1298 textes) : 0 changement (aucun `\bold`).
