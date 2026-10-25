# 0032 — La forme affichée se choisit par le but ; `tidy` enlève, ne transforme pas

- **Statut** : acceptée — mise en œuvre close le 2026-10-25 (#1610 → #1765, chantier
  simplify-carte ; journal : `docs/archive/wip/simplify-carte-progress.md`)
- **Date** : 2026-10-22 · **Décidée par** : David (questions Q1-Q7, S1-S4, D1-D4, E1-E2 du chantier)

## Contexte

Le relevé du 2026-10-22 (~250 appels) a trouvé quatre sens de « simplifier », dont deux qui
développaient tout ; `réduire` qui développait malgré son contrat ; `normalize` montré à l'élève
(dénominateur commun, décimaux réécrits en fractions, `x/x → 1` sans condition) ; ~20 enveloppes
de `tidy` aux gardes divergentes pour « écrire un résultat » ; cinq évaluateurs numériques et ~40
copies `try/catch + isFinite` aux conventions d'échec différentes (NaN, `null`, ±∞, exception).

## Décision

1. **La forme affichée dépend du but, déclaré par l'appelant** : forme cible du contexte (réduite,
   développée, factorisée, la plus propre), puis `tidy`. Le moteur ne devine jamais le but ; `auto`
   ne sert que là où il n'y en a pas (`.simplifier`). Une dérivée est réduite pour « calculer
   f′(x) » (exponentielle commune en facteur), factorisée pour lire son signe ; l'énoncé peut
   demander une forme (`finalForm`). Table : `docs/systeme/mathast/README.md` § Quelle fonction
   pour quel besoin.
2. **`tidy` enlève, ne transforme pas** : une réécriture n'y entre que si elle enlève sans
   transformer, est préférée quel que soit le but, garde le domaine, et ne cache aucune leçon
   (`docs/systeme/mathast/tidy-spec.md` § 0.4). D'où : un décimal reste décimal (S1) ; ordre des
   termes d'une somme en option, `order: 'canonical' | 'kept'` (S2) ; pas de simplification qui
   perd le domaine sans hypothèse (S3) ; les identités enseignées vont dans `réduire`, avec étape
   (S4).
3. **`normalize` sert à comparer et à calculer, pas à montrer** une expression avec variable.
   Son nom reste (« une forme normale », Q5). Sans variable, il calcule la valeur exacte, que
   `exactValueToShow` écrit.
4. **Une seule définition de « bien écrit »** : une correction écrite par `tidy` passe le juge de
   l'élève sans remarque, au réglage le plus exigeant (E1) ; les règles de superflu sont écrites
   une fois (registre `superflu/`), appliquées en silence par `tidy`, rejouées une à une par le
   juge.
5. **Trois évaluateurs numériques, un par besoin** (Q6) : valeur sûre (`computeNumericValue`, fini
   ou `null`), variante qui laisse passer ±∞ (`computeNumericValueOrInfinity`), `compile` pour les
   boucles. Les décisions exactes (« vaut 0 », juge) restent sur les rationnels.

## Écarté

- **Une fonction unique « écrire un résultat »** : « proprement » dépend du contexte (Q1).
- **`tidy` comme juge de l'élève** : il range (`3+x` serait une faute), calcule (`400+80`) et ne
  nomme pas la faute.
- **Une seule fonction numérique `number | null`** : ±∞ est un résultat utile (limites, bornes),
  le tracé a besoin de la vitesse de `compile`, le juge de l'exactitude.
- **Renommer `normalize`** (Q5).

## Conséquences

- Un nouvel affichage commence par la question « quel est le but ? » et choisit une ligne de la
  table, ou en ajoute une avec David ; il n'écrit pas sa propre mise au propre.
- Une identité ajoutée pour l'écriture va dans `réduire` avec une étape, jamais dans `tidy`.
- Précise l'[ADR 0007](0007-un-moteur-quatre-intentions.md) (`auto` ne factorise jamais le
  **résultat**) et s'appuie sur l'[ADR 0006](0006-reduire-pour-comparer-pas-pour-ecrire.md).
