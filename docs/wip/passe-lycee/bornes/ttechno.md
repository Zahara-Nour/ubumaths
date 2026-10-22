# Bornes des points de terminale technologique

Objectif : pour chaque point actif de terminale technologique (`points-lycee.csv`, grade `T_TECHNO`), dire jusqu'où vont les questions générées (« seulement »). 92 points. Programme du BO n° 14 du 2026-04-02 ; héritage : la 1re techno (`1techno.md`), dont rien n'est recopié sauf ce qui change.

## Sources et façon de citer

| Abréviation       | Document                                                                                                                                                     | Page citée  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **BO 1re techno** | Programme de mathématiques de la classe de première de la voie technologique (BO n° 14 du 2026-04-02, `docs/ref/programmes/`, extrait dans `bo/1techno.txt`) | page du PDF |
| **BO Tle techno** | Programme de mathématiques de la classe terminale de la voie technologique (même BO, `bo/ttechno.txt`)                                                       | page du PDF |
| **BO 2de**        | Programme de seconde générale et technologique (`bo/2de.txt`), pour ce qui est hérité                                                                        | page du PDF |

Aucun document d'accompagnement n'est disponible pour ces programmes : aucun n'est cité.

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite, le plus souvent une **absence** (ce que la liste des contenus ne contient pas), toujours expliquée dans la remarque ⚠ du point ou dans le texte de la borne générale.

## Ce qui est le plus utile pour la vérification « seulement »

- **Pas de base e** : ni exp ni ln ; les exponentielles sont x ↦ aˣ et k·aˣ (a > 0), le seul logarithme est **log décimal**.
- **Dérivées** : polynômes de degré ≤ 3 et fonction inverse seulement ; **ni dérivée de aˣ ou de log, ni produit, ni quotient** ; fonctions étudiées = combinaisons linéaires de 1/x et d'un polynôme de degré ≤ 3.
- **Ni primitive ni intégrale** ; aucune limite hors du comportement de 1/x aux bornes ; asymptote sans définition.
- **Logarithme** : équations et inéquations aˣ = b, xᵃ = b, aⁿ < b seulement ; propriétés log(ab), log(a/b), log(aⁿ) pour n entier naturel.
- **Suites** : sommes des n premiers termes (arithmétique, géométrique à termes positifs), notation Σ ; moyennes arithmétique et géométrique de deux nombres.
- **Loi binomiale** : coefficients par le triangle de Pascal (**n ⩽ 10**), pas de factorielle ; arbre dessiné pour n ⩽ 4 ; probabilités de {X = 0}, {X = 1}, {X = n}, {X = n − 1} et leurs réunions ; espérance admise, pas de variance.
- **Ajustements** : changement de variable **donné** (u², 1/t, 1/√n, log y) se ramenant à un ajustement affine.
- **Automatismes de Tle** : fractions et paramètres admis (x² − 4/9, 4x² − k²), enchaînements, changements de registre.

## Contradictions et tensions entre passages

1. **log(aⁿ) = n·log(a)** n'est énoncée que pour n entier naturel (p.8), mais la résolution de aˣ = b d'inconnue réelle (p.8) suppose la propriété pour x réel. → ltt-1.
2. **Coefficients binomiaux** : capacité « pour n ⩽ 10 » ; commentaire « pour des valeurs de n plus grandes, […] donné ou déterminé à l'aide du triangle de Pascal » (p.10). → ltt-3.
3. **Automatismes en italique** (p.6) : l'indice de base 100 n'est pas en italique (vérifié sur le rendu du PDF) alors qu'il n'est ni au BO de 2de ni au BO de 1re techno. Sans effet sur une borne.
4. **Probabilités totales** : la Tle dit les « introduire » (p.9) alors que la 1re techno les a déjà (p.10). → l1t-1.
5. **Suites géométriques** : « à termes strictement positifs » en 1re (p.7), « à termes positifs » en Tle (p.7). Sans effet pratique.

## Questions ouvertes

Les incertitudes sont dans `questions-techno.json` (sans décision) :

- **l1t-1** — Probabilités totales : quelle partition en 1re techno ? (reco : `deux`).
- **l1t-3** — Automatismes : « privilégiant l'activité mentale » est-il une borne ? (reco : `modalite`).
- **ltt-1** — log(aˣ) = x·log(a) pour x réel ? (reco : `reel-dans-resolution`).
- **ltt-2** — Loi binomiale : contraire et P(X ⩽ k) quelconque (reco : `reunion-contraire`).
- **ltt-3** — Coefficients binomiaux au-delà de n = 10 (reco : `dix`).
- **ltt-4** — Combinaisons linéaires avec l'inverse : forme quotient admise ? (reco : `equivalente`).
- **ltt-5** — Probabilités totales en Tle : partition en plus de trois évènements ? (reco : `finie`).
- **ltt-6** — Fonction inverse aux bornes : notation lim ? (reco : `notation`).

## Terminale technologique (92 points, 59 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Familles nouvelles : x ↦ aˣ et x ↦ k·aˣ (a > 0), logarithme décimal, fonction inverse (dérivée, variations, asymptotes) et combinaisons linéaires de la fonction inverse et de polynômes de degré ≤ 3. — _BO Tle techno p.8-9_ (BO)
- Pas de base e : ni exp ni ln ; seul le logarithme décimal, noté log, défini comme l'unique solution de 10ˣ = b (aucune autre fonction exponentielle ou logarithme n'est au programme de la voie techno). — _BO Tle techno p.7-8_ (déduite)
- Dérivées : polynômes de degré ≤ 3 (1re) et fonction inverse seulement ; ni dérivée de aˣ ou de log, ni produit, ni quotient, ni composée (aucune n'est au programme). — _BO Tle techno p.8-9_ (déduite)
- Ni primitive ni intégrale ; aucune limite hors du comportement de la fonction inverse aux bornes de son ensemble de définition (absentes du programme). — _BO Tle techno p.7-10_ (déduite)
- Programmation : Python ou tableur. — _BO Tle techno p.5_ (BO)
- Automatismes de Tle : nature des nombres plus complexe (entiers, fractions ou paramètres : x² − 9, x² − 4/9, 4x² − k²), enchaînement de plusieurs automatismes, changements de registre (signe de −2(x − 1)(x − 3) par l'image mentale de la courbe). — _BO Tle techno p.6_ (BO)
- Variables aléatoires discrètes finies : espérance seulement, ni variance ni écart type (absents du programme). — _BO Tle techno p.10_ (déduite)

### Activités géométriques (série STD2A) > Géométrie plane

- **TTECHNO-001** — Coniques : sections planes d'un cône de révolution — _hérite des bornes générales_
- **TTECHNO-002** — Notion de tangente à une conique en un point
  - Tangente définie comme position limite des sécantes ; aucune connaissance attendue sur les équations cartésiennes des tangentes à une conique (données dans les situations analytiques). — _BO Tle techno p.5_ (BO)
- **TTECHNO-003** — Étudier le raccordement d'arcs de cercles, d'ellipses ou de courbes représentatives de fonctions
  - Tangente définie comme position limite des sécantes ; aucune connaissance attendue sur les équations cartésiennes des tangentes à une conique (données dans les situations analytiques). — _BO Tle techno p.5_ (BO)

### Activités géométriques (série STD2A) > Géométrie dans l'espace

- **TTECHNO-004** — Perspective centrale : projection centrale — _hérite des bornes générales_
- **TTECHNO-005** — Propriétés de conservation (alignement, contact) ou de non conservation (longueurs, milieux, rapports de longueurs, angles, parallélisme) ; cas particulier des plans frontaux — _hérite des bornes générales_
- **TTECHNO-006** — Point de fuite d'une droite — _hérite des bornes générales_
- **TTECHNO-007** — Point de fuite principal — _hérite des bornes générales_
- **TTECHNO-008** — Ligne de fuite d'un plan non frontal — _hérite des bornes générales_
- **TTECHNO-070** — Ligne d'horizon — _hérite des bornes générales_
- **TTECHNO-009** — Image d'un quadrillage — _hérite des bornes générales_
- **TTECHNO-071** — Image de solides simples (parallélépipède rectangle, prisme, pyramide)
  - Parallélépipède rectangle, prisme, pyramide. — _BO Tle techno p.6_ (BO)
- **TTECHNO-010** — Utiliser le vocabulaire usuel de la perspective centrale — _hérite des bornes générales_
- **TTECHNO-011** — Utiliser les propriétés d'une projection centrale — _hérite des bornes générales_
- **TTECHNO-012** — Utiliser la conservation de forme dans les plans frontaux
  - Situations simples où un plan frontal est disponible. — _BO Tle techno p.6_ (BO)
- **TTECHNO-013** — Utiliser la position relative de l'image de deux droites parallèles — _hérite des bornes générales_
- **TTECHNO-014** — Construire l'image d'un quadrillage
  - Situations simples où un plan frontal est disponible. — _BO Tle techno p.6_ (BO)
- **TTECHNO-072** — Construire l'image d'un parallélépipède rectangle ayant au moins une arête en vraie grandeur
  - Situations simples où un plan frontal est disponible. — _BO Tle techno p.6_ (BO)

### Automatismes

- **TTECHNO-015** — Interpréter un indice de base 100
  - Indice de base 100 : interpréter, calculer un indice, calculer le taux d'évolution entre deux valeurs. — _BO Tle techno p.7_ (BO)
  - ⚠ Contradiction : le BO dit que les automatismes propres à la Tle sont en italique (p.6) ; cette ligne n'est pas en italique (vérifié sur le rendu du PDF), alors que l'indice de base 100 n'apparaît ni au BO de 2de ni au BO de 1re techno. Sans effet sur une borne : le point est de Tle.
- **TTECHNO-073** — Calculer un indice — _hérite des bornes générales_
  - ⚠ Même remarque que TTECHNO-015 (ligne non en italique).
- **TTECHNO-092** — Isoler une variable dans une inégalité qui en comporte plusieurs
  - Exemples internes aux mathématiques ou issus des autres disciplines. — _BO Tle techno p.7_ (BO)

### Analyse > Suites numériques

- **TTECHNO-016** — Moyenne arithmétique de deux nombres — _hérite des bornes générales_
- **TTECHNO-017** — Somme des $n$ premiers termes d'une suite arithmétique — _hérite des bornes générales_
- **TTECHNO-074** — Notation $\Sigma$
  - Notation Σ travaillée sur des exemples variés (sommes de carrés, de cubes, d'inverses…). — _BO Tle techno p.8_ (BO)
- **TTECHNO-018** — Moyenne géométrique de deux nombres positifs
  - Deux nombres positifs. — _BO Tle techno p.7_ (BO)
- **TTECHNO-019** — Somme des $n$ premiers termes d'une suite géométrique
  - Suites géométriques à termes positifs. — _BO Tle techno p.7_ (BO)
  - ⚠ La 1re techno dit « à termes strictement positifs » (p.7), la Tle « à termes positifs » (p.7) : écart de mot sans effet pratique (un terme nul rend la suite nulle).
- **TTECHNO-020** — Prouver que trois nombres sont (ou ne sont pas) les termes consécutifs d'une suite arithmétique — _hérite des bornes générales_
- **TTECHNO-021** — Prouver que trois nombres sont (ou ne sont pas) les termes consécutifs d'une suite géométrique
  - Suites géométriques à termes positifs. — _BO Tle techno p.7_ (BO)
- **TTECHNO-022** — Déterminer la raison d'une suite arithmétique modélisant une évolution — _hérite des bornes générales_
- **TTECHNO-023** — Déterminer la raison d'une suite géométrique modélisant une évolution
  - Suites géométriques à termes positifs. — _BO Tle techno p.7_ (BO)
- **TTECHNO-024** — Exprimer en fonction de $n$ le terme général d'une suite arithmétique — _hérite des bornes générales_
- **TTECHNO-025** — Exprimer en fonction de $n$ le terme général d'une suite géométrique
  - Suites géométriques à termes positifs. — _BO Tle techno p.7_ (BO)
- **TTECHNO-026** — Calculer la somme des $n$ premiers termes d'une suite arithmétique — _hérite des bornes générales_
- **TTECHNO-027** — Calculer la somme des $n$ premiers termes d'une suite géométrique
  - Suites géométriques à termes positifs. — _BO Tle techno p.7_ (BO)
- **TTECHNO-028** — Reconnaitre une situation relevant du calcul d'une somme de termes consécutifs d'une suite arithmétique — _hérite des bornes générales_
- **TTECHNO-029** — Reconnaitre une situation relevant du calcul d'une somme de termes consécutifs d'une suite géométrique
  - Suites géométriques à termes positifs. — _BO Tle techno p.7_ (BO)
  - Exemple type : valeur acquise par des placements à intérêts composés à taux constant avec versements réguliers. — _BO Tle techno p.8_ (BO)
- **TTECHNO-030** — Écrire en langage Python une fonction qui calcule la somme des $n$ premiers carrés
  - Langage Python. — _BO Tle techno p.8_ (BO)
- **TTECHNO-075** — Écrire en langage Python une fonction qui calcule la somme des $n$ premiers cubes
  - Langage Python. — _BO Tle techno p.8_ (BO)
- **TTECHNO-076** — Écrire en langage Python une fonction qui calcule la somme des $n$ premiers inverses
  - Langage Python. — _BO Tle techno p.8_ (BO)
- **TTECHNO-077** — Établir le lien entre l'écriture de la somme à l'aide du symbole $\Sigma$ et les composantes de l'algorithme (initialisation, sortie de boucle, accumulateur, compteur) — _hérite des bornes générales_

### Analyse > Fonctions exponentielles

- **TTECHNO-031** — Définition de la fonction $x \mapsto a^x$ pour $x$ positif comme prolongement à des valeurs non entières positives de la suite géométrique $(a^n)_{n \in \mathbb{N}}$ ; extension à $\mathbb{R}_-$ en posant $a^{-x} = \frac{1}{a^x}$
  - a > 0. — _BO Tle techno p.8_ (BO)
- **TTECHNO-032** — Sens de variation de $x \mapsto a^x$ selon les valeurs de $a$
  - a > 0 ; sens de variation selon les valeurs de a, en parallèle avec les suites géométriques. — _BO Tle techno p.8_ (BO)
- **TTECHNO-033** — Allure de la courbe représentative de $x \mapsto a^x$ selon les valeurs de $a$
  - a > 0 ; sens de variation selon les valeurs de a, en parallèle avec les suites géométriques. — _BO Tle techno p.8_ (BO)
- **TTECHNO-034** — Propriétés algébriques : $a^{x+y} = a^x a^y$
  - Propriétés admises, par extension des propriétés des puissances entières. — _BO Tle techno p.8_ (BO)
- **TTECHNO-078** — Propriétés algébriques : $a^{x-y} = \frac{a^x}{a^y}$
  - Propriétés admises, par extension des propriétés des puissances entières. — _BO Tle techno p.8_ (BO)
- **TTECHNO-079** — Propriétés algébriques : $a^{nx} = (a^x)^n$ pour $n$ entier relatif
  - Propriétés admises, par extension des propriétés des puissances entières. — _BO Tle techno p.8_ (BO)
  - n entier relatif. — _BO Tle techno p.8_ (BO)
- **TTECHNO-035** — Cas particulier de l'exposant $\frac{1}{n}$ pour calculer un taux d'évolution moyen équivalent à $n$ évolutions successives — _hérite des bornes générales_
- **TTECHNO-036** — Connaitre le sens de variation des fonctions de la forme $x \mapsto k a^x$, selon le signe de $k$ et les valeurs de $a$
  - Forme x ↦ k·aˣ seulement (k réel, a > 0) ; sens selon le signe de k et les valeurs de a. — _BO Tle techno p.8_ (BO)
- **TTECHNO-080** — Utiliser le sens de variation des fonctions de la forme $x \mapsto k a^x$, selon le signe de $k$ et les valeurs de $a$
  - Forme x ↦ k·aˣ seulement (k réel, a > 0) ; sens selon le signe de k et les valeurs de a. — _BO Tle techno p.8_ (BO)
- **TTECHNO-037** — Connaitre les propriétés algébriques des fonctions exponentielles
  - Propriétés admises, par extension des propriétés des puissances entières. — _BO Tle techno p.8_ (BO)
- **TTECHNO-081** — Utiliser les propriétés algébriques des fonctions exponentielles pour transformer des écritures numériques ou littérales
  - Propriétés admises, par extension des propriétés des puissances entières. — _BO Tle techno p.8_ (BO)
- **TTECHNO-038** — Calculer le taux d'évolution moyen équivalent à des évolutions successives
  - Par l'exposant 1/n ; contextes : taux mensuel équivalent à un taux annuel, évolution moyenne d'une population sur une période. — _BO Tle techno p.8_ (BO)
- **TTECHNO-039** — Intercaler entre deux points déjà construits un troisième point ayant pour abscisse (respectivement pour ordonnée) la moyenne arithmétique (respectivement géométrique) des abscisses (respectivement des ordonnées) des deux points initiaux
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)

### Analyse > Fonction logarithme décimal

- **TTECHNO-040** — Définition du logarithme décimal de $b$ pour $b > 0$ comme l'unique solution de l'équation $10^x = b$ ; notation $\log$
  - Logarithme décimal seulement, b > 0, notation log. — _BO Tle techno p.8_ (BO)
- **TTECHNO-041** — Sens de variation de la fonction logarithme décimal — _hérite des bornes générales_
- **TTECHNO-042** — Propriétés algébriques : $\log(ab) = \log(a) + \log(b)$, pour $a$ et $b$ réels strictement positifs — _hérite des bornes générales_
- **TTECHNO-082** — Propriétés algébriques : $\log(a^n) = n\log(a)$, pour $n$ entier naturel, $a$ réel strictement positif
  - n entier naturel (le BO montre aussi la propriété « pour de petites valeurs de n » à partir du logarithme d'un produit). — _BO Tle techno p.8-9_ (BO)
  - ⚠ Voir ltt-1 (log(aˣ) = x·log(a) pour x réel).
- **TTECHNO-083** — Propriétés algébriques : $\log\left(\frac{a}{b}\right) = \log(a) - \log(b)$, pour $a$ et $b$ réels strictement positifs — _hérite des bornes générales_
- **TTECHNO-043** — Utiliser le logarithme décimal pour résoudre une équation du type $a^x = b$ ou $x^a = b$ d'inconnue $x$ réelle
  - Équations du type aˣ = b ou xᵃ = b, d'inconnue x réelle. — _BO Tle techno p.8_ (BO)
  - ⚠ Voir ltt-1 (log(aˣ) = x·log(a) pour x réel).
- **TTECHNO-084** — Utiliser le logarithme décimal pour résoudre une inéquation du type $a^x < b$ ou $x^a < b$ d'inconnue $x$ réelle
  - Inéquations du type aˣ < b ou xᵃ < b, d'inconnue x réelle. — _BO Tle techno p.8_ (BO)
  - ⚠ Voir ltt-1 (log(aˣ) = x·log(a) pour x réel).
- **TTECHNO-085** — Utiliser le logarithme décimal pour résoudre une inéquation du type $a^n < b$ d'inconnue $n$ entier naturel
  - Inconnue n entière naturelle (ex. nombre d'annuités). — _BO Tle techno p.8-9_ (BO)
  - ⚠ Voir ltt-1.
- **TTECHNO-044** — Utiliser les propriétés algébriques de la fonction logarithme décimal pour transformer des expressions numériques ou littérales — _hérite des bornes générales_
  - ⚠ Voir ltt-1 (log(aˣ) = x·log(a) pour x réel).

### Analyse > Fonction inverse

- **TTECHNO-045** — Comportement de la fonction inverse aux bornes de son ensemble de définition
  - Approche intuitive, en lien avec l'ordre de grandeur des inverses de petits ou de grands nombres et l'allure de la courbe. — _BO Tle techno p.9_ (BO)
  - ⚠ Voir ltt-6 (notation lim).
- **TTECHNO-046** — Dérivée de la fonction inverse
  - Dérivée de x ↦ 1/x obtenue en réinvestissant la définition du nombre dérivé (taux de variation). — _BO Tle techno p.9_ (BO)
- **TTECHNO-047** — Sens de variation de la fonction inverse — _hérite des bornes générales_
- **TTECHNO-048** — Courbe représentative de la fonction inverse — _hérite des bornes générales_
- **TTECHNO-086** — Asymptotes de la courbe représentative de la fonction inverse
  - Aucune définition de l'asymptote : approche intuitive. — _BO Tle techno p.9_ (BO)
  - ⚠ Voir ltt-6 (notation lim).
- **TTECHNO-049** — Étudier des fonctions obtenues par combinaisons linéaires de la fonction inverse et de fonctions polynomiales de degré au maximum 3
  - Combinaisons linéaires de x ↦ 1/x et de polynômes de degré ≤ 3 seulement. — _BO Tle techno p.9_ (BO)
  - Contextes : prix unitaire, coût moyen. — _BO Tle techno p.9_ (BO)
  - ⚠ Voir ltt-4 (forme quotient, ex. coût moyen (x² + 2x + 100)/x).
- **TTECHNO-087** — Représenter des fonctions obtenues par combinaisons linéaires de la fonction inverse et de fonctions polynomiales de degré au maximum 3
  - Combinaisons linéaires de x ↦ 1/x et de polynômes de degré ≤ 3 seulement. — _BO Tle techno p.9_ (BO)
  - ⚠ Voir ltt-4 (forme quotient).

### Statistique et probabilités > Séries statistiques à deux variables quantitatives

- **TTECHNO-050** — Changement de variable dans l'étude graphique d'une série statistique à deux variables quantitatives — _hérite des bornes générales_
- **TTECHNO-051** — Ajustement se ramenant par changement de variable à un ajustement affine
  - Ajustements au jugé, droite de Mayer, moindres carrés ; aucune connaissance théorique attendue. — _BO Tle techno p.9_ (BO)
- **TTECHNO-052** — Représenter un nuage de points en effectuant un changement de variable donné (par exemple $u^2$, $\frac{1}{t}$, $\frac{1}{\sqrt{n}}$, $\log(y)$, etc.)
  - Changement de variable donné (ex. u², 1/t, 1/√n, log(y)). — _BO Tle techno p.9_ (BO)
- **TTECHNO-088** — Conjecturer une relation de linéarité entre de nouvelles variables — _hérite des bornes générales_
- **TTECHNO-053** — Automatiser le calcul de $\sum_i \left(y_i - (ax_i + b)\right)^2$
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
- **TTECHNO-054** — Rechercher un couple $(a, b)$ minimisant cette expression parmi un ensemble fini de couples proposés par les élèves ou générés par balayage, tirage aléatoire, etc.
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
  - Ensemble fini de couples (proposés par les élèves, balayage, tirage aléatoire). — _BO Tle techno p.10_ (BO)
  - ⚠ Le libellé dit « cette expression » : il renvoie à la somme Σᵢ(yᵢ − (axᵢ + b))² de TTECHNO-053.

### Statistique et probabilités > Probabilités conditionnelles

- **TTECHNO-055** — Formule des probabilités totales pour une partition de l'univers
  - Partition de l'univers présentée sans formalisme ; formule mise en relation avec l'arbre. — _BO Tle techno p.10_ (BO)
  - ⚠ Voir ltt-5 (partition en plus de trois évènements) et l1t-1.
- **TTECHNO-056** — Calculer la probabilité d'un évènement connaissant ses probabilités conditionnelles relatives à une partition de l'univers
  - Partition de l'univers présentée sans formalisme ; formule mise en relation avec l'arbre. — _BO Tle techno p.10_ (BO)
  - ⚠ Voir ltt-5 (partition en plus de trois évènements) et l1t-1.

### Statistique et probabilités > Variables aléatoires discrètes finies

- **TTECHNO-057** — Loi binomiale $\mathcal{B}(n, p)$ — _hérite des bornes générales_
- **TTECHNO-058** — Espérance de la loi binomiale (admise)
  - Valeur de l'espérance admise. — _BO Tle techno p.10_ (BO)
- **TTECHNO-059** — Coefficients binomiaux $\binom{n}{k}$
  - Coefficient défini comme le nombre de chemins réalisant {X = k} dans l'arbre ; formule de Pascal établie par un raisonnement sur les chemins. — _BO Tle techno p.10_ (BO)
  - Pas d'expression par factorielles (absente du programme). — _BO Tle techno p.10_ (déduite)
  - ⚠ Lecture déduite : le BO définit le coefficient par les chemins et le calcule au triangle de Pascal ; aucune factorielle n'apparaît.
- **TTECHNO-060** — Triangle de Pascal — _hérite des bornes générales_
- **TTECHNO-061** — Calculer des coefficients binomiaux $\binom{n}{k}$ à l'aide du triangle de Pascal pour $n \leqslant 10$
  - n ⩽ 10. — _BO Tle techno p.10_ (BO)
  - ⚠ Voir ltt-3 (n > 10).
- **TTECHNO-062** — Reconnaitre une situation relevant de la loi binomiale — _hérite des bornes générales_
- **TTECHNO-089** — Identifier le couple de paramètres d'une situation relevant de la loi binomiale — _hérite des bornes générales_
- **TTECHNO-063** — Lorsque la variable aléatoire $X$ suit une loi binomiale : interpréter l'évènement $\{X = k\}$ sur un arbre de probabilité
  - Arbre dessiné pour n ⩽ 4 ; au-delà, l'arbre sert d'image mentale. — _BO Tle techno p.10_ (BO)
- **TTECHNO-064** — Lorsque la variable aléatoire $X$ suit une loi binomiale : calculer les probabilités des évènements $\{X = 0\}$, $\{X = 1\}$, $\{X = n\}$, $\{X = n - 1\}$ et de ceux qui s'en déduisent par réunion
  - Évènements {X = 0}, {X = 1}, {X = n}, {X = n − 1} et ceux qui s'en déduisent par réunion. — _BO Tle techno p.10_ (BO)
  - ⚠ Voir ltt-2 (évènement contraire, P(X ⩽ k) quelconque).
- **TTECHNO-065** — Lorsque la variable aléatoire $X$ suit une loi binomiale : calculer la probabilité de l'évènement $\{X = k\}$ à l'aide des coefficients binomiaux
  - Nombre de chemins donné ou déterminé au triangle de Pascal. — _BO Tle techno p.10_ (BO)
  - ⚠ Voir ltt-3 (n > 10).
- **TTECHNO-066** — Générer un triangle de Pascal de taille $n$ donnée
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
- **TTECHNO-067** — Représenter par un diagramme en bâtons la loi de probabilité d'une loi binomiale $\mathcal{B}(n, p)$
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
- **TTECHNO-090** — Faire le lien avec l'histogramme des fréquences observées des 1 lors de la simulation de $N$ échantillons de taille $n$ d'une loi de Bernoulli de paramètre $p$ faite en classe de première
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
- **TTECHNO-068** — Calculer l'espérance $\sum x_i p_i$ d'une variable aléatoire suivant une loi de probabilité donnée ; cas particulier d'une variable aléatoire suivant la loi binomiale $\mathcal{B}(n, p)$
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
- **TTECHNO-069** — Représenter graphiquement l'espérance de lois binomiales $\mathcal{B}(n, p)$ à $p$ fixé et $n$ variable, à $n$ fixé et $p$ variable
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
- **TTECHNO-091** — Faire le lien avec l'expression admise de l'espérance
  - Langage Python ou tableur. — _BO Tle techno p.5_ (BO)
