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

## Première, enseignement scientifique (64 points, 51 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- « Seuls sont exigibles des élèves les contenus mathématiques de la colonne de droite, mobilisés dans les capacités attendues » : les « Situations et problèmes » (fonction affine par morceaux de l'impôt, point d'équilibre offre/demande, Monty Hall, modèle de Malthus…) sont des contextes possibles, pas des contenus. — _BO 1re ES p.3_ (BO)
- Les automatismes de seconde « doivent être entretenus » : ils restent dans le champ du module. — _BO 1re ES p.3_ (BO)
- Familles de fonctions du module : fonctions affines (remobilisées), polynômes de degré 2, fonctions exponentielles x ↦ aˣ ; les fonctions de seconde restent connues. — _BO 1re ES p.5-7_ (BO)
- Fonctions exponentielles x ↦ aˣ seulement pour a > 0 et x ⩾ 0. — _BO 1re ES p.7_ (BO)
- Second degré : racines et signe seulement sous forme factorisée ; « le calcul des racines à l'aide du discriminant ne figure pas au programme » ; aucune formule (sommet, axe) n'est attendue. — _BO 1re ES p.6_ (BO)
- Pas de dérivée ni de logarithme : absents du BO du module. — _BO 1re ES p.3-7_ (BO)
- Suites : notation fonctionnelle u(n) d'abord, puis notation indicielle uₙ. — _BO 1re ES p.5_ (BO)
- Composante informatique (algorithmique, programmation, tableur) reposant sur « un nombre limité d'éléments de syntaxe » ; outils : calculatrice, tableur, logiciel de géométrie dynamique ou de programmation. — _BO 1re ES p.2-3_ (BO)

### Analyse de l'information chiffrée

- **1GEN-001** — Deux caractères qualitatifs : exemples d'analyse du croisement de deux caractères par représentation graphique (diagrammes en barres, diagrammes circulaires)
  - Deux caractères qualitatifs ; diagrammes en barres, diagrammes circulaires. — _BO 1re ES p.4_ (BO)
- **1GEN-002** — Deux caractères quantitatifs : représentation par un nuage de points
  - Deux caractères quantitatifs ; nuage de points. — _BO 1re ES p.4_ (BO)
- **1GEN-003** — Ajustement affine
  - Ajustements proposés : au jugé, droite de Mayer, moindres carrés ; « aucune connaissance théorique n'est attendue ». — _BO 1re ES p.4_ (BO)
- **1GEN-004** — Point moyen — _hérite des bornes générales_
- **1GEN-005** — Interpolation, extrapolation
  - À partir d'un ajustement affine. — _BO 1re ES p.4_ (BO)
- **1GEN-006** — Utiliser un tableur pour représenter des données sous forme de tableau ou de diagramme
  - Tableur ; tableau ou diagramme. — _BO 1re ES p.4_ (BO)
- **1GEN-007** — Déterminer un ajustement affine
  - Ajustements proposés : au jugé, droite de Mayer, moindres carrés ; « aucune connaissance théorique n'est attendue ». — _BO 1re ES p.4_ (BO)
- **1GEN-045** — Utiliser un ajustement affine pour interpoler ou extrapoler des valeurs inconnues
  - Ajustements proposés : au jugé, droite de Mayer, moindres carrés ; « aucune connaissance théorique n'est attendue ». — _BO 1re ES p.4_ (BO)
- **1GEN-008** — Savoir calculer les coordonnées d'un point moyen — _hérite des bornes générales_

### Automatismes > Fonctions et représentations

- **1GEN-062** — Déterminer graphiquement le signe d'une fonction
  - Lecture graphique, fonction donnée par sa courbe. — _BO 1re ES p.4_ (BO)
  - La même puce du BO ajoute « ou son tableau de variations » : cette partie est portée par 2-349 (« Relier représentation graphique et tableau de variations »), que les automatismes de 1re référencent.
- **1GEN-063** — Tracer une droite donnée par un point et son coefficient directeur
  - Droite donnée par un point et son coefficient directeur. — _BO 1re ES p.4_ (BO)
- **1GEN-064** — Déterminer le coefficient directeur d'une droite à partir des coordonnées de deux de ses points
  - Coordonnées de deux points de la droite. — _BO 1re ES p.4_ (BO)

### Phénomènes aléatoires

- **1GEN-009** — Indépendance de deux évènements
  - Définition : A et B indépendants si P_B(A) = P(A), avec P(B) ≠ 0. — _BO 1re ES p.5_ (BO)
  - ⚠ Caractérisation par P(A ∩ B) = P(A) × P(B) : question l1g-1.
- **1GEN-010** — Probabilité associée à la répétition d'épreuves aléatoires identiques et indépendantes de Bernoulli
  - Épreuves de Bernoulli identiques et indépendantes ; pas de loi binomiale ni de coefficient binomial (absents du BO). — _BO 1re ES p.5_ (BO)
  - ⚠ Nombre d'épreuves : les capacités disent n ⩽ 4, le contenu ne borne pas ; question l1g-2.
- **1GEN-011** — Représenter par un arbre de probabilités la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$
  - n ⩽ 4 épreuves. — _BO 1re ES p.5_ (BO)
  - Arbre de probabilités. — _BO 1re ES p.5_ (BO)
- **1GEN-046** — Calculer des probabilités associées à la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$
  - n ⩽ 4 épreuves. — _BO 1re ES p.5_ (BO)
  - Calcul à l'aide de l'arbre. — _BO 1re ES p.5_ (BO)
- **1GEN-012** — Savoir utiliser l'indépendance de deux évènements
  - Définition : A et B indépendants si P_B(A) = P(A), avec P(B) ≠ 0. — _BO 1re ES p.5_ (BO)
  - ⚠ Question l1g-1.
- **1GEN-047** — Savoir justifier l'indépendance de deux évènements
  - Définition : A et B indépendants si P_B(A) = P(A), avec P(B) ≠ 0. — _BO 1re ES p.5_ (BO)
  - ⚠ Question l1g-1.

### Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique

- **1GEN-022** — Fonctions polynômes de degré 2 : éléments caractéristiques de la courbe : allure de la courbe
  - Polynômes de degré 2 ; allure de la courbe (parabole). — _BO 1re ES p.6_ (BO)
- **1GEN-052** — Fonctions polynômes de degré 2 : éléments caractéristiques de la courbe : axe de symétrie
  - Aucune formule attendue (pas x = −b/(2a)) ; l'axe se détermine par exemple en résolvant f(x) = c. — _BO 1re ES p.6_ (BO)
- **1GEN-053** — Fonctions polynômes de degré 2 : éléments caractéristiques de la courbe : coordonnées du sommet en lien avec la symétrie
  - Sommet en lien avec la symétrie ; aucune formule attendue. — _BO 1re ES p.6_ (BO)
- **1GEN-054** — Fonctions polynômes de degré 2 : éléments caractéristiques de la courbe : tableau de variation de la fonction — _hérite des bornes générales_
- **1GEN-023** — Racines d'un polynôme de degré 2 donné sous forme factorisée (le calcul des racines à l'aide du discriminant ne figure pas au programme)
  - Polynôme donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re ES p.6_ (BO)
- **1GEN-055** — Signe d'un polynôme de degré 2 donné sous forme factorisée
  - Polynôme donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re ES p.6_ (BO)
- **1GEN-024** — Associer une parabole à une expression algébrique de degré 2, pour les fonctions de la forme $x \mapsto ax^2$, $x \mapsto ax^2 + c$, $x \mapsto a(x - x_1)(x - x_2)$
  - Formes x ↦ ax², x ↦ ax² + c, x ↦ a(x − x₁)(x − x₂) seulement. — _BO 1re ES p.6_ (BO)
- **1GEN-025** — Déterminer des éléments caractéristiques de la fonction $x \mapsto ax^2 + bx + c$ (aucune formule n'est attendue ; l'axe de symétrie se détermine par exemple en résolvant $f(x) = c$)
  - x ↦ ax² + bx + c ; aucune formule attendue ; axe de symétrie par exemple en résolvant f(x) = c. — _BO 1re ES p.6_ (BO)
- **1GEN-026** — Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour trouver ses racines
  - Polynôme donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re ES p.6_ (BO)
- **1GEN-027** — Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour étudier son signe
  - Polynôme donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant. — _BO 1re ES p.6_ (BO)

### Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle

- **1GEN-028** — Suites géométriques à termes strictement positifs : définition par relation de récurrence
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
  - Définition par relation de récurrence. — _BO 1re ES p.6_ (BO)
- **1GEN-029** — Suites géométriques : explicitation du terme de rang $n$
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
  - ⚠ ⚠ libellé : le BO place ce contenu sous « Suites géométriques à termes strictement positifs » ; le libellé ne le redit pas (la borne s'applique).
- **1GEN-030** — Suites géométriques : sens de variation
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
  - ⚠ ⚠ libellé : le BO place ce contenu sous « Suites géométriques à termes strictement positifs » ; le libellé ne le redit pas (la borne s'applique).
- **1GEN-031** — Suites géométriques : représentation graphique
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
  - ⚠ ⚠ libellé : le BO place ce contenu sous « Suites géométriques à termes strictement positifs » ; le libellé ne le redit pas (la borne s'applique).
- **1GEN-032** — Fonction $x \mapsto a^x$ ($a > 0$, $x \geqslant 0$)
  - x ↦ aˣ, a > 0, x ⩾ 0. — _BO 1re ES p.7_ (BO)
- **1GEN-033** — Fonctions $x \mapsto a^x$ : propriétés algébriques (admises, par extension des propriétés des puissances entières)
  - Propriétés algébriques admises, par extension des propriétés des puissances entières. — _BO 1re ES p.6-7_ (BO)
- **1GEN-034** — Fonctions $x \mapsto a^x$ : variations — _hérite des bornes générales_
- **1GEN-035** — Fonctions $x \mapsto a^x$ : représentation graphique — _hérite des bornes générales_
- **1GEN-036** — Fonctions $x \mapsto a^x$ : cas particulier de l'exposant $\frac{1}{n}$
  - Exposant 1/n. — _BO 1re ES p.7_ (BO)
- **1GEN-037** — Taux d'évolution moyen correspondant à $n$ évolutions successives
  - Taux moyen correspondant à n évolutions successives, à l'aide de l'exposant 1/n. — _BO 1re ES p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO place « Cas particulier de l'exposant 1/n » juste avant ce contenu, sans écrire le lien ; aucun logarithme n'est au programme.
- **1GEN-038** — Reconnaitre un phénomène discret ou continu de croissance ou décroissance exponentielle
  - Modèles : suites géométriques à termes strictement positifs, fonctions x ↦ aˣ. — _BO 1re ES p.6-7_ (BO)
  - Phénomène discret ou continu, croissance ou décroissance. — _BO 1re ES p.7_ (BO)
- **1GEN-056** — Savoir modéliser un phénomène discret ou continu de croissance ou décroissance exponentielle
  - Modèles : suites géométriques à termes strictement positifs, fonctions x ↦ aˣ. — _BO 1re ES p.6-7_ (BO)
  - ⚠ Point en partie compétence (modéliser) : un modèle s'y rattache s'il fait choisir ou écrire le modèle exponentiel d'une situation.
- **1GEN-039** — Calculer un terme de rang donné d'une suite géométrique définie par une relation fonctionnelle
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
  - Suite définie par une relation fonctionnelle. — _BO 1re ES p.7_ (BO)
- **1GEN-057** — Calculer un terme de rang donné d'une suite géométrique définie par une relation de récurrence
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
  - Suite définie par une relation de récurrence. — _BO 1re ES p.7_ (BO)
- **1GEN-040** — Calculer un taux d'évolution moyen — _hérite des bornes générales_
  - ⚠ Méthode : voir 1GEN-037 (exposant 1/n).
- **1GEN-041** — Réaliser la représentation graphique des termes d'une suite géométrique
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
- **1GEN-058** — Exploiter la représentation graphique des termes d'une suite géométrique
  - Suites géométriques à termes strictement positifs (raison positive). — _BO 1re ES p.6_ (BO)
- **1GEN-042** — Réaliser la représentation graphique d'une fonction exponentielle — _hérite des bornes générales_
- **1GEN-059** — Exploiter la représentation graphique d'une fonction exponentielle — _hérite des bornes générales_
- **1GEN-043** — Estimer les ordres de grandeur d'une quantité en croissance ou décroissance exponentielle — _hérite des bornes générales_
- **1GEN-044** — Résoudre un problème de seuil dans le cas d'une croissance ou décroissance exponentielle par le calcul
  - Croissance ou décroissance exponentielle ; pas de logarithme (absent du programme). — _BO 1re ES p.3-7_ (BO)
  - Par le calcul. — _BO 1re ES p.7_ (BO)
- **1GEN-060** — Résoudre un problème de seuil dans le cas d'une croissance ou décroissance exponentielle à l'aide d'une représentation graphique
  - Croissance ou décroissance exponentielle ; pas de logarithme (absent du programme). — _BO 1re ES p.3-7_ (BO)
  - À l'aide d'une représentation graphique. — _BO 1re ES p.7_ (BO)
- **1GEN-061** — Résoudre un problème de seuil dans le cas d'une croissance ou décroissance exponentielle en utilisant un outil numérique
  - Croissance ou décroissance exponentielle ; pas de logarithme (absent du programme). — _BO 1re ES p.3-7_ (BO)
  - En utilisant un outil numérique. — _BO 1re ES p.7_ (BO)

### Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire

- **1GEN-013** — Suites arithmétiques : définition par la relation de récurrence
  - Définition par la relation de récurrence. — _BO 1re ES p.5_ (BO)
- **1GEN-014** — Suites arithmétiques : explicitation du terme de rang $n$ — _hérite des bornes générales_
- **1GEN-015** — Suites arithmétiques : sens de variation
  - Sens de variation, en parallèle possible avec celui des fonctions affines. — _BO 1re ES p.5_ (BO)
- **1GEN-016** — Suites arithmétiques : représentation graphique — _hérite des bornes générales_
- **1GEN-017** — Reconnaitre un phénomène discret ou continu de croissance linéaire
  - Modèles : suites arithmétiques, fonctions affines (taux d'accroissement constant). — _BO 1re ES p.5_ (BO)
  - Phénomène discret ou continu de croissance linéaire. — _BO 1re ES p.6_ (BO)
- **1GEN-048** — Savoir modéliser un phénomène discret ou continu de croissance linéaire
  - Modèles : suites arithmétiques, fonctions affines (taux d'accroissement constant). — _BO 1re ES p.5_ (BO)
  - ⚠ Point en partie compétence (modéliser) : un modèle s'y rattache s'il fait choisir ou écrire le modèle linéaire d'une situation.
- **1GEN-018** — Calculer un terme de rang donné d'une suite arithmétique définie par une relation fonctionnelle
  - Suite définie par une relation fonctionnelle. — _BO 1re ES p.6_ (BO)
- **1GEN-049** — Calculer un terme de rang donné d'une suite arithmétique définie par une relation de récurrence
  - Suite définie par une relation de récurrence. — _BO 1re ES p.6_ (BO)
- **1GEN-019** — Réaliser la représentation graphique des termes d'une suite arithmétique — _hérite des bornes générales_
- **1GEN-050** — Exploiter la représentation graphique des termes d'une suite arithmétique — _hérite des bornes générales_
- **1GEN-020** — Réaliser la représentation graphique d'une fonction affine
  - Fonctions affines, remobilisées de seconde (« travail succinct ») : représentation graphique, sens de variation, lien entre taux d'accroissement et coefficient directeur. — _BO 1re ES p.5-6_ (BO)
- **1GEN-051** — Exploiter la représentation graphique d'une fonction affine
  - Fonctions affines, remobilisées de seconde (« travail succinct ») : représentation graphique, sens de variation, lien entre taux d'accroissement et coefficient directeur. — _BO 1re ES p.5-6_ (BO)
- **1GEN-021** — Résoudre un problème de seuil dans le cas d'une croissance linéaire
  - Croissance linéaire. — _BO 1re ES p.6_ (BO)
