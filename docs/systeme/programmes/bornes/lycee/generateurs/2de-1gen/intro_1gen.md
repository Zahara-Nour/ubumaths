# Bornes des points de première, mathématiques de l'enseignement scientifique

Objectif : pour chaque point de programme actif du programme de mathématiques intégré à l'enseignement scientifique de 1re générale (`grade` = `1_GEN`), dire jusqu'où vont les questions qu'on peut y rattacher (« seulement »). Ces bornes serviront à juger qu'un modèle de question reste **entièrement** dans le point. 64 points lus dans `points-lycee.csv` (base locale, empreinte identique à la prod le 2026-10-22).

Ce programme hérite de la seconde (`2de.json`) : ce qui y est acquis (fonctions de référence, calcul algébrique, droites, probabilités conditionnelles, statistiques, automatismes) n'est pas recopié, sauf quand la 1re le change.

## Sources et façon de citer

| Abréviation   | Document                                                                                                                                        | Page citée  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **BO 1re ES** | Programme de mathématiques intégré à l'enseignement scientifique de 1re générale, **nouveau programme** (BO n° 14 du 2026-04-02), `bo/1gen.txt` | page du PDF |

Aucun document d'accompagnement n'a été utilisé.

**Force** : `BO` = écrit dans le programme (une absence nette du texte compte comme BO) ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point).

Le BO est en deux colonnes : « Seuls sont exigibles des élèves les contenus mathématiques de la colonne de droite, mobilisés dans les capacités attendues » (p.3). La colonne « Situations et problèmes » ne fournit donc aucune borne, seulement des contextes possibles. Les points-compétences (modéliser) n'ont pas de borne propre au-delà de leur famille de modèles ; les points sans borne propre héritent des bornes générales.

## Ce qui est le plus utile pour la vérification « seulement »

- **Fonctions** : affines (remobilisées, « travail succinct »), polynômes de degré 2, exponentielles x ↦ aˣ avec **a > 0 et x ⩾ 0**. Ni dérivée, ni logarithme.
- **Second degré** : formes ax², ax² + c, a(x − x₁)(x − x₂) ; racines et signe **sous forme factorisée seulement**, pas de discriminant, aucune formule de sommet ni d'axe (axe par f(x) = c).
- **Suites** : arithmétiques et géométriques **à termes strictement positifs** ; récurrence et forme explicite ; notation u(n) puis uₙ.
- **Seuils et taux moyen** : par le calcul, le graphique ou l'outil numérique, sans logarithme ; taux moyen par l'exposant 1/n.
- **Probabilités** : indépendance définie par P_B(A) = P(A) (le produit : question l1g-1) ; répétition de Bernoulli avec **n ⩽ 4**, sans loi binomiale (question l1g-2).
- **Statistique à deux variables** : nuage de points, point moyen, ajustement affine (au jugé, Mayer, moindres carrés) sans connaissance théorique, interpolation et extrapolation.

## Libellés qui ne collent plus au BO (signalés, rien corrigé)

- **1GEN-029**, **1GEN-030**, **1GEN-031** : le BO range ces contenus sous « Suites géométriques à termes strictement positifs » ; seul 1GEN-028 le redit (la borne s'applique à tous les points de suites géométriques).

## Questions ouvertes (`questions-2de-1gen.json`)

- **l1g-1** — Indépendance : la caractérisation par le produit P(A ∩ B) = P(A) × P(B).
- **l1g-2** — Répétition d'épreuves de Bernoulli : n ⩽ 4 vaut-il pour le contenu ?
