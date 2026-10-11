# 0024 — Un moteur commun de factorisation : un noyau exact, des stratégies qui racontent

- **Statut** : acceptée — amende l'ADR 0007 pour l'intention `factoriser` ; mise en œuvre close le
  2026-10-12 (lots 1 à 4 : #1127, #1134, #1136, #1141, #1143)
- **Date** : 2026-10-11 · **Décidée par** : David

## Contexte

État des lieux mesuré le 2026-10-11 (journal `docs/archive/wip/mathAST/moteur-factorisation-progress.md`, panel de
31 expressions) : une dizaine de lieux de mathAST factorisent, chacun à sa façon. Aucune valeur
fausse, mais :

- le seul chemin qui produit des étapes pour l'élève, l'intention `factoriser`, laisse inchangés
  `4x^2-25`, `9x^2-12x+4`, `x^2-5x+6`, `x^3-6x^2+11x-6`, et rend `(2x+1)^2-(x-3)^2` avec un facteur
  non réduit ;
- l'intégration sait déjà factoriser ces trinômes (`factorQuadratic`), sans étapes et sous une forme
  non scolaire (`4(x+5/2)(x-5/2)`) ;
- les racines rationnelles exactes ne sont calculées qu'à un endroit (`domain/exact-roots.ts`), qui
  perd les multiplicités ; ailleurs, des flottants arrondis ;
- des calculs en double : 3 détecteurs de carré parfait, 3 PGCD de monômes, 4 divisions de
  polynômes, 6 extracteurs de coefficients ; et du code mort (`transform/`, règles de factorisation
  trigo et hyperbolique, détecteurs de `analysis/structures.ts`).

Deux natures de factorisation coexistent sans se parler : l'**algorithmique** (PGCD, racines,
Horner), puissante et sans étapes, que veulent `limits`, `integration` et `domain` ; la
**réécriture par motifs**, qui produit des étapes nommées, que veut l'élève.

## Décision

Un module `mathAST/factor/` en deux couches :

1. **Un noyau exact sur ℚ**, sans étapes : polynôme et variable en entrée, constante et facteurs
   avec leurs multiplicités en sortie (contenu, racines rationnelles, Horner, carrés parfaits, Δ).
   Les appelants internes (`limits`, `integration`, `domain`, `normalize`) y migrent et leurs
   doublons disparaissent.
2. **Des stratégies qui racontent** : facteur commun, identités remarquables, racines du trinôme,
   racine évidente puis division. Chacune trouve avec le noyau et émet ses étapes en français selon
   le niveau. L'intention `factoriser` (atelier, primitives) passe par cette couche.

Quatre choix de produit, tranchés le même jour :

- **Racines irrationnelles** : au lycée seulement (`x^2-2` → `(x-\sqrt2)(x+\sqrt2)`) ; au collège,
  l'expression reste.
- **Coefficients entiers dès que possible** : `2x^2+x-3` → `(2x+3)(x-1)`, `4x^2-25` → `(2x-5)(2x+5)`.
  La forme a(x−x₁)(x−x₂) seulement quand la consigne la demande.
- **Atteignable selon le niveau** : collège = facteur commun (y compris une somme) et les trois
  identités remarquables, coefficients compris ; 1re = en plus les racines du trinôme ;
  terminale = en plus la racine évidente puis la division (degré 3).
- **Développer pour refactoriser**, en dernier recours, dans l'intention `factoriser` seulement,
  avec les étapes montrées (`x(x+1)-6` → `x^2+x-6` → `(x+3)(x-2)`). Cela amende la ligne de l'ADR
  0007 « `factoriser` : jamais développer » ; `auto` ne change pas et ne factorise toujours jamais.

## Écarté

- **Étendre seulement les règles de motifs de `factoriser`** : comble les trous côté élève, mais
  laisse les doublons, et chercher des racines par motifs revient à réécrire le noyau en moins bien.
- **Le noyau seul, sans étapes** : unifie les calculs internes, l'élève n'y gagne rien.

## Conséquences

- Livraison par lots, une PR chacun : noyau (panel en tests, aucun appelant changé) → stratégies
  branchées sur `factoriser` → migration des appelants internes et suppression du code mort → V18
  (écriture des primitives).
- `solve` n'est pas concerné : il cherche des zéros par formules (Δ, Cardano, Ferrari) et ne
  factorise qu'en dernier recours.
- Le décideur (`areEquivalent`) n'est pas concerné : chemin propre (ADR 0006).
