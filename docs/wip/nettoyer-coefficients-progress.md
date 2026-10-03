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
- Valeur : `areEquivalent(avant, après)` ; faux ou exception → formule d'origine.
- Cases : le nombre de `?` doit rester le même ; sinon formule d'origine.
- Formule qui ne se lit pas en syntaxe maison (LaTeX d'auteur, DSL) → intacte.
- Formule inchangée par le nettoyage → texte d'origine conservé à l'octet près.

## Avancement

- [ ] Tests rouges
- [ ] Sélection exposée dans `cosmetic-transforms.ts`
- [ ] Module `clean-coefficients.ts` + câblage générateur
- [ ] Schéma, type, route, éditeur
- [ ] Doc `fiches-exercices.md`
- [ ] Non-régression (suites, question:specs, prod, simulation)
