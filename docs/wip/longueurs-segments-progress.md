# Longueurs de segments (`AB`, `AB²`) dans mathAST — préparation

> Chantier préparé le 2026-10-11, suite de la [structure d'une expression](structure-expression-progress.md)
> (Q18). Rien n'est décidé : questions de phase 0 ci-dessous, à trancher par David.

## Le problème

Le parseur LaTeX de `mathAST` lit deux majuscules collées comme un **produit** de deux lettres.
Mesuré le 2026-10-11 (`parseLatexSafe` puis `toLatex`) :

| Saisie                       | Ce que comprend mathAST                     |
| ---------------------------- | ------------------------------------------- |
| `AB`                         | produit `A × B`                             |
| `AB^2`                       | `A × B²` (le carré ne porte que sur B)      |
| `AB^2=AC^2+BC^2` (Pythagore) | `A·B² = A·C² + B·C²`                        |
| `2AB`                        | produit `2 × A × B`                         |
| `(AB)^2`                     | carré du produit `A × B` (juste par hasard) |
| `\mathrm{AB}^2`, `\text{AB}` | **non reconnu** (échec du parseur)          |
| `\overline{AB}`              | **non reconnu**                             |
| `\widehat{ABC}`              | **non reconnu**                             |

Conséquences possibles :

- **lecture** (`/test-structure`) : « le produit de A par le carré de B » au lieu de « le carré de AB » ;
- **correction des réponses** : `AB^2 = 9` est comparé comme `A·B² = 9` ; une réponse juste peut
  être refusée, ou une fausse acceptée, quand le carré est en jeu (à mesurer sur les vraies
  questions) ;
- **écriture** : `toLatex` rend `A B`, avec une espace.

Questions en base (prod, 2026-10-11, 1 005 modèles) : 10 contiennent une puissance de deux
majuscules (`AB^…`), 23 une égalité `AB =`, 1 mentionne Pythagore. Leur validation actuelle reste à
examiner une par une (cas réels des élèves d'abord).

## Questions de phase 0 (à trancher par David)

1. **Portée** : deux majuscules collées sont-elles une longueur **partout** (règle du parseur), ou
   seulement quand le contexte le dit (question de géométrie, option du parseur), ou seulement
   quand l'auteur l'écrit explicitement (`\mathrm{AB}`) ?
2. **`AB` et `BA`** : même longueur pour la correction (`BA = 5` accepté pour `AB = 5`) ?
3. **Trois lettres et plus** : `ABC` = produit, angle, ou refus ?
4. **Notations voisines dans le même chantier** : `\overline{AB}` (mesure algébrique),
   `\widehat{ABC}` (angle), `\overrightarrow{AB}` (vecteur), ou plus tard ?
5. **Lecture** : `AB²` se lit « le carré de AB » ? `AB` seul, « la longueur AB » ou « AB » ?
6. **Minuscules** : `ab` reste un produit (algèbre) ? (Proposé : oui.)

## Décisions de David (2026-10-11)

Recommandations validées : Q1 **partout** (deux majuscules collées = une longueur) ; Q2 **`AB` = `BA`**
pour la correction ; Q3 **`ABC` refusé** avec un message ; Q4 `\overline`, `\widehat`,
`\overrightarrow` **plus tard** ; Q6 **`ab` reste un produit**. Q5 : `AB²` → « le carré de la
longueur AB », `AB` → « **la longueur AB** » (toujours préciser).

État du code : `mathAST` n'a **aucun nœud longueur ni angle** (`MathNode`, `types.ts`) ; `\angle`
n'existe que comme symbole. `geometry-core` (DSL de géométrie) connaît segments et angles, mais
`mathAST` ne s'en sert pas.

## Journal

- 2026-10-11 — préparation : mesure du parseur et des questions en base ; questions de phase 0.
