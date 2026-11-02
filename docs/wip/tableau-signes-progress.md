---
status: en cours
---

# Chantier « tableau-signes » — tableau de signes à compléter

> Outil n° 8 de [outils-manquants.md](outils-manquants.md) : cases dans le bloc ` ```variation `.
> Points servis : 2-268, 426, 330, 446, 337, 449-451 (2de), puis 1re et Tle. Ouvert le 2026-11-02.

## Reprendre ici

_Mis à jour le 2026-11-02, phase 0 validée._

- **État** : phase 0 validée (Q1-Q5) ; exploration du code avant le plan d'implémentation.
- **Prochaine action** : plan (fichiers, tests rouges), puis tests d'abord.
- **En attente de David** : Q6 (réécrire les modèles 2de « cases sous le tableau » ou non).
- **Pièges en cours** : —
- **Worktree / branche** : `../ubumaths-wt-tableau-signes`, `feat/tableau-signes-cases`.

---

## Existant (2026-11-02)

- Bloc ` ```variation ` : `domain:`, lignes `sign:` (une ou plusieurs), marques `z`, `||`, `|h|`, `d` ; parseur
  `src/lib/ubumark/parser/variation-table-parser.ts`, rendu `VariationTable.svelte`, PDF `variation-table-typst.ts`.
- Cases dans un tableau markdown (`| $?$ |`) : chantier `trous-dans-tableau`, livré. Pas dans ` ```variation `.
- 2de : « cases sous le tableau » en attendant l'outil (`questions-2de` l. 214-220).
- Modèle à suivre : ` ```operation ` (réponse attendue tirée du bloc, jamais écrite dans `blanks`).

## Phase 0 (validée par David le 2026-11-02 : « je suis tes recos »)

**Nominal**

1. L'auteur écrit le tableau **juste** et préfixe d'un `?` chaque cellule cachée : `domain: -inf, ?-3, 2, +inf`,
   `-inf,-3: ?-`, `-3: ?z`. Réponse attendue tirée du bloc ; rien dans `blanks`.
2. Cachables : **valeur de x** (hors ±∞), **signe**, **marque** (0, double barre, rien).
3. Saisie : valeur de x = petite case MathLive dans la cellule ; signe = deux boutons + / − au toucher ;
   marque = choix 0 / ‖ / rien. Utilisable au doigt à 390 px.
4. Chaque cellule cachée = **une case**, jugée seule, numérotée dans l'ordre de lecture ; valeur de x jugée par
   équivalence (`3/2` = `1,5`).
5. Corrigé : cellules fausses marquées, bonne valeur dans la cellule. Fiche PDF : cellule vide à l'énoncé, remplie au
   corrigé.
6. Page à cocher : cellules cachées dessinées ; `question:specs` les accepte.

**Limite**

7. Plusieurs lignes `sign:` (produit, quotient) : n'importe quelle cellule de n'importe quelle ligne.
8. Tableau sans `?` : rendu inchangé (écran, PDF).
9. `?` devant une valeur tirée de variables (`?{{r}}`).

**Erreur**

10. `?` sur ±∞, une étiquette de ligne ou une ligne `variation:` → échec de génération, message situé.
11. Réponse écrite dans `blanks` pour une cellule du tableau → refusée (comme `operation`).

**Décisions** : Q1 tableau de **signes** d'abord ; tableau de variations = suite du même chantier. Q2 valeurs de x,
signes, marques (pas les étiquettes). Q3 syntaxe `?` devant la valeur. Q4 une case par cellule. Q5 tableau construit
entièrement par l'élève (nombre de colonnes) : hors chantier.

**Ouverte** : Q6 — après l'outil, réécrire les modèles 2de faits en « cases sous le tableau » (268, 426, 330, 446,
337, 449-451) ou les laisser et ne servir que les nouveaux modèles ?

## Plan technique (pedagogy-expert, 2026-11-02)

- **AST** : `SignValue` et `VariationMarker` inchangés (unions lues partout en `sign | marker`) ; ajouts
  `DomainPoint.hidden`, `cases?: HiddenCell[]` (`{ index, row, key, kind: valeur|signe|marque, answer }`, ordre de
  LECTURE — domaine, puis lignes `sign:` par colonne, pas l'ordre de la `Map`), `caseIndex` (ligne `case: N` posée par le
  générateur), `source` brut. `values` garde la vraie valeur (corrigé, page à cocher).
- **Indexation** : marquage calqué sur `markBuildBlocks` (plusieurs cases par bloc), blocs délimités par
  `findVariationBlocks` ; `variationBlanks` ; valeur = case `math`, signe/marque = `text` + `InstanceBlank.cellule`.
- **Jugement** : signe/marque en égalité exacte (comme `ranger`), avant `isChoiceBlank` ; « rien » = jeton `rien`
  (une case vide est `empty`) ; `0` ramené à `z`. Valeur : juge ordinaire — vérifier `1,5` contre `\frac{3}{2}`.
- **Évaluation notée (risque)** : l'énoncé envoyé contient les réponses, les CLÉS d'intervalles aussi
  (`-inf,-3`) → masquage dans `masked-statement.ts` (`??n` pour une valeur, `?` seul pour signe/marque) +
  `findUnmaskedAnswers` ; refusés dans un modèle.
- **Corrigé** : nouvelle `ExpectedLine` `sign-table` (sinon une ligne `expected-only` par case) ; Typst
  `hiddenCells: blank|filled` ; éditeur riche : importer depuis `node.source` (`convertVariationTable` perdrait les `?`).
- **PR** : 1 ubumark (AST, parseur, éditeur, Typst) · 2 génération, jugement, masquage (revue Opus + `security-auditor`)
  · 3 saisie (`VariationTable.svelte`, `FillBlanksInput.svelte`) · 4 corrigé, page à cocher, testSpecs. Docs :
  `ubumark.md`, `questions.md`, `fiches-exercices.md`, `outils-manquants.md`.
- **Pièges** : décimal `?1,5` coupé aux virgules du domaine (écrire une fraction) ; messages d'erreur du parseur en
  anglais (« Unknown sign value ») → messages français situés.
- **À trancher** : (a) marque « rien » cachée = `?rien` ; (b) `?|h|`, `?d`, signe caché sur un point → refusés.
