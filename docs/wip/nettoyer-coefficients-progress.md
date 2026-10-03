# Modèles de questions : nettoyer les coefficients (`shared.cleanCoefficients`)

Branche `feat/nettoyer-coefficients` — worktree `ubumaths-wt-coef`.
Validé par David le 2026-10-03.

## Problème

Un modèle à coefficients tirés écrit `{{a}}x{{b;+}}y{{c;+}}=0` : selon le tirage
s'affichent « 1x », « -1y », « +0 ». Les auteurs contournent en excluant ±1 et 0 des
tirages. Pas de nouvelle syntaxe par variable : on réutilise les transformations
cosmétiques EXISTANTES de mathAST.

## Spécification

- Option `shared.cleanCoefficients: true` (absente / `false` = strictement rien ne change).
- Après la résolution des variables, chaque formule maison `$…$` / `$$…$$` de l'énoncé,
  de la correction (étapes, feedback), des choix de QCM, et la réponse attendue des cases
  mathématiques passent par une SÉLECTION des étapes de `buildASTPipeline`
  (`cosmetic-transforms.ts`, source unique), dans l'ordre du pipeline :
  1. `simplifyNullProductsAST` (0·x → 0) ;
  2. `removeNullTermsAST` (x + 0 → x) ;
  3. `removeSignsAST` ((−1)·x → −(1·x), − − → +, + − → −) ;
  4. `removeFactorsOneAST` (1·x → x).
- Exclues : `stripUnnecessaryBrackets`, `reduceFractionsAST`, `removeMultOperatorAST`,
  `sortTermsAndFactorsAST`.

## Gardes

- Fonctions (déclarées + défauts) : nœud `function` jamais touché (`f(1)`, `f'(-3)`).
- Structurelle : seul le PREMIER facteur d'un produit est un coefficient. Un facteur
  suivant qui est un nombre, une parenthèse, une fonction ou un signe est protégé
  (`C(1)`, `C(-3)`, `x×(−7)`, `97,6×1` intacts) ; le contenu d'une parenthèse protégée
  est nettoyé pour lui-même.
- Fractions : numérateur et dénominateur nettoyés pour eux-mêmes, leur signe ne sort pas
  (`\dfrac{-10}{10}` intact ; mesuré en simulation).
- Signe + écrit : gardé (`+\infty`, `+1` ; `+1x` → `+x`).
- Chaîne de calcul (≥ 2 relations, `r = -1 - (-4) = 3`) : intacte ; relation qui
  deviendrait `x + 3 = x + 3` : intacte (mesuré en simulation).
- Valeur : `areEquivalent(avant, après)` ; faux ou exception → formule d'origine.
- Cases : le nombre de `?` doit rester le même ; sinon formule d'origine.
- Formule qui ne se lit pas en syntaxe maison (LaTeX d'auteur, DSL) → intacte.
- Formule inchangée par le nettoyage → texte d'origine conservé à l'octet près.

## Avancement

- [x] Tests rouges (15 rouges sur 33 avec des bouchons identité), puis verts (43)
- [x] Sélection exposée : `coefficientCleanupSteps()` filtre `buildASTPipeline()`
- [x] Module `src/lib/questions/clean-coefficients.ts` + câblage générateur
- [x] Schéma strict, type, route serveur (refine), éditeur (`MyCheckbox`)
- [x] Doc `docs/ref/fiches-exercices.md`
- [x] Non-régression : suites questions/utils/mathAST/ubumark 610 fichiers verts ;
      `question:specs` 195 JSON, sortie identique à main ; prod 801 modèles / 7075 specs,
      verdicts identiques (0 modèle avec l'option) ; simulation 195 modèles × 30 tirages
      avec l'option en mémoire : 0 échec, 0 verdict de spec changé.
- [x] `check:incremental` 0 erreur, `lint:fast` propre

## Points ouverts (décision de David)

- `{{c;+}}` avec c = 0 écrit `0` sans `+` (`evaluate-with-modifiers.ts` : `numValue > 0`). « 1y0 » n'est pas réparé par
  l'option (laissé intact, jamais réduit en `x = 0`). Correctif possible : `;+` sur 0 → `+0`
  (change l'affichage des modèles existants qui tirent 0 : à mesurer).
- Restent nettoyés (conformes à la spec, à valider) : `\dfrac{0 - 6}{2}` → `\dfrac{-6}{2}`
  (dérivation C-02), `x - (-x) + 2 = 0` → `x + x + 2 = 0` (géométrie B-01).
- `generatedSteps` (mode B) non nettoyées.
