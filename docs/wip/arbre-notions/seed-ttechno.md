# Seed Tle technologique — points du programme ET références (architecture points → nœuds)

> **Statut : PROPOSITION, en attente de validation par David.** ⚠️ Soin maximal (classes de lycée).
> Source : « Annexe — Programme d'enseignement de mathématiques de la classe terminale de la
> voie technologique » (11 p., `progs-lycee/terminale-techno.pdf`, fourni par David le
> 2026-10-07), relu **puce par puce** — enseignement commun à toutes les séries. **Pas
> d'ancien seed** : construit directement depuis le BO (ni liens à préserver, ni colonne
> « ex- »). Mapping : [programmes-ecarts-tle-techno.md](programmes-ecarts-tle-techno.md)
> (Y1-Y5 tranchées le 2026-10-07 : indice de base 100, logarithme décimal, STD2A couverte).
> Arbre `2026-10-07.15`, **aucun changement d'arbre** (les 69 nœuds visés existent, vérifié
> par script). Parcours : `T_TECHNO` → `1_TECHNO` → `2` → … (toutes les cibles y sont,
> vérifié en prod).
> Règles déjà tranchées, appliquées sans être redemandées : une puce = un point, scission
> si notions différentes ; entretien des contenus repris d'une année antérieure (U5/V1) ;
> T1 (série dans la rubrique) ; bloc Algorithmique en `algorithme` (L1) ; automatismes =
> références, auto-référence permise (C13) ; points vagues à spécifier sans rien ajouter au BO.

## Attributs communs

| Attribut               | Valeur                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `grade`                | `T_TECHNO`                                                                                                    |
| `code`                 | **`TTECHNO-001` à `TTECHNO-069`** (préfixe fabriqué par la base : `T_TECHNO` → `TTECHNO` ; aucun ancien seed) |
| `objective_id`, `rang` | `NULL`                                                                                                        |
| `rubrique`             | « partie > section » du BO, **série comprise** pour les Activités géométriques (T1)                           |
| `kind`                 | conn. (Contenus) / s-f (Capacités attendues) / algo. (Situations algorithmiques)                              |
| `exigence`             | `attendu`, sauf les **Situations algorithmiques** : `approfondissement` proposé (question T3)                 |
| `regime_acquisition`   | `diversite` partout                                                                                           |

**69 points**, **85 références**. Les **Commentaires** et les **Thèmes d'étude** (optimisation
linéaire, Monte-Carlo, marches aléatoires, graphes) sont du cadrage : ni point, ni nœud.

Un contenu laconique du BO reçoit le **nom de son objet**, pris dans le titre de sa section
(« Sens de variation. » sous « Fonction logarithme décimal » → « Sens de variation de la
fonction logarithme décimal ») — rien d'autre n'est ajouté au texte.

---

## ⚠️ Puces multi-parties : scindées (8 puces → +8 points)

| Puce du BO                                                                                                                                                                                                    | Décision                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Les **cinq capacités** de Suites numériques, toutes en « … d'une suite arithmétique **ou** géométrique » (prouver trois termes consécutifs, raison, terme général, somme, reconnaître une situation de somme) | **×2 chacune** (deux notions), comme en 1re techno et en 1re spé → 10 points.                                 |
| Fonction inverse : « **Dérivée et sens de variation** »                                                                                                                                                       | **×2** : la dérivée va à `Dérivation`, le sens de variation à `Fonction inverse > variations` (discutable 1). |
| « **Loi binomiale** $\mathcal{B}(n, p)$ ; **espérance** »                                                                                                                                                     | **×2** (deux sous-notions), comme « loi de probabilité, espérance » en 1re techno.                            |
| « **Coefficients binomiaux** $\binom{n}{k}$ ; **triangle de Pascal** »                                                                                                                                        | **×2** : `Loi binomiale > coefficients binomiaux` / `Dénombrement › Combinaisons > triangle de Pascal`.       |

**Gardées en un point** : « Lorsque X suit une loi binomiale : » introduit **trois tirets** du
BO, qui sont déjà trois points (chacun préfixé de sa condition). « Calculer les probabilités
des évènements {X = 0}, {X = 1}, {X = n}, {X = n − 1} et de ceux qui s'en déduisent par
réunion » reste un point (un seul geste : le calcul direct sans coefficients). « Propriétés
algébriques » (exponentielles, logarithme) restent un point chacune : une puce de contenu
qui énumère les formules d'une même famille.

## Entretien : contenus repris d'une année antérieure (U5/V1) — 32 références, aucun point

| Partie du BO de Tle techno                                                                                                                        | Entretien → référence                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Vocabulaire ensembliste (élément, sous-ensemble, réunion…, symboles, intervalles, couple et produit cartésien, complémentaire, Card)              | 2-201 · 2-202 · 2-203 · 2-204 · 2-205 · 2-206 · 2-207                |
| Logique : connecteurs « et », « ou » ; contre-exemple ; réciproque                                                                                | 2-210 · 2-212 · 2-214                                                |
| Logique : statut d'une égalité et des lettres ; condition nécessaire / suffisante / équivalence                                                   | 1TECHNO-001 · 1TECHNO-002                                            |
| **Algorithmique et programmation (sauf STD2A)** : les **dix capacités** sont, mot pour mot, celles de 1re (« se poursuit en continuité »)         | 1TECHNO-003 à 1TECHNO-013 (11 points, la liste étant scindée en 1re) |
| Suites : « Expression en fonction de $n$ du terme de rang $n$ » (arithmétique, géométrique)                                                       | 1TECHNO-037 · 1TECHNO-038                                            |
| Probabilités conditionnelles : construire un arbre ; interpréter les pondérations ; lien avec la multiplication ; utiliser un arbre pour calculer | 2-393 · 2-398 · 2-399 · 2-391 · 2-397                                |
| Variables aléatoires : « Espérance d'une variable aléatoire discrète » ; « Calculer l'espérance … et l'interpréter »                              | 1TECHNO-096 · 1TECHNO-099                                            |

Conséquence : **la partie Vocabulaire ensembliste et logique et la partie Algorithmique ne
créent aucun point en Tle techno** — tout y est entretien. (La contraposée, en 1re, n'apparaît
plus en Tle ; 2-214 la porte avec la réciproque.)

## Les références (`curriculum_point_automatismes`, grade `T_TECHNO`) — 85

### A. Lignes de la partie « Automatismes » du BO de Tle — 53 références

Le BO de Tle **redonne la liste complète** (lignes de 1re reprises, plus cinq lignes en
italique « propres à la classe terminale ») et **ne dit pas** « s'ajoute la liste de
première » (question T4). Une ligne nouvelle sans antécédent devient un point
auto-référencé (Y1/Y2) : l'indice de base 100 (TTECHNO-015).

| Ligne d'Automatismes (résumé fidèle)                                                             | Cible(s)                                                    |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Calculer, appliquer, exprimer une proportion sous différentes formes                             | 6-140 · 4-056                                               |
| Calculer la proportion d'une proportion                                                          | 2-364 · 2-376                                               |
| Passer d'une formulation additive à une formulation multiplicative                               | 4-057                                                       |
| Appliquer un taux d'évolution pour calculer une valeur finale ou initiale                        | 2-377                                                       |
| Calculer un taux d'évolution, l'exprimer en pourcentage                                          | 2-367 · 2-377                                               |
| **Interpréter un indice de base 100 ; calculer un indice ; taux d'évolution entre deux valeurs** | **TTECHNO-015 (auto-référence)**                            |
| Calculer le taux d'évolution équivalent à plusieurs évolutions successives                       | 2-378                                                       |
| Calculer un taux d'évolution réciproque                                                          | 2-379                                                       |
| _Reconnaitre une situation se modélisant par une suite géométrique dont on identifie la raison_  | 1TECHNO-042 · 1TECHNO-036                                   |
| Opérations et comparaisons entre des fractions simples                                           | 4-013 · 5-025                                               |
| Opérations sur les puissances                                                                    | 3-005                                                       |
| Passer d'une écriture d'un nombre à une autre (décimale, fractionnaire, scientifique)            | 6-106 · 3-006                                               |
| Estimer un ordre de grandeur                                                                     | 6-119                                                       |
| Effectuer des conversions d'unités                                                               | CM1-068 · 6-150 · 5-051 · CE2-052 · 6-159 · 4-052 · CE2-047 |
| Équation ou inéquation du premier degré, équation $x^2 = a$                                      | 2-279 · 2-280 · 2-281                                       |
| Signe d'une expression du premier degré, d'une expression factorisée du second degré             | 2-328 · 2-330 · 1TECHNO-066                                 |
| Isoler une variable dans une égalité ou une inégalité                                            | 2-273 · 2-274                                               |
| Application numérique d'une formule                                                              | 5-035                                                       |
| Développer, factoriser, réduire une expression algébrique simple                                 | 3-016 · 4-022 · 5-039                                       |
| _Calculer la dérivée d'une fonction polynomiale de degré ≤ 3_                                    | 1TECHNO-080                                                 |
| _Coefficient directeur de la tangente en un point à l'aide de la dérivée_                        | 1TECHNO-077 · 1TECHNO-079                                   |
| Déterminer graphiquement des images et des antécédents                                           | 3-040                                                       |
| Résoudre graphiquement $f(x) = k$, $f(x) < k$                                                    | 2-336                                                       |
| _Signe d'une expression factorisée du second degré par une image mentale de la courbe_           | 1TECHNO-066 · 1TECHNO-057                                   |
| Déterminer graphiquement le signe d'une fonction ou son tableau de variations                    | 2-329 · 2-349                                               |
| Exploiter une équation de courbe                                                                 | 2-331                                                       |
| Tracer une droite (équation réduite, ou point et coefficient directeur)                          | 2-316                                                       |
| Lire graphiquement l'équation réduite d'une droite                                               | 2-315                                                       |
| Équation réduite d'une droite à partir de deux de ses points                                     | 2-314                                                       |
| _Déterminer graphiquement le coefficient directeur d'une tangente à une courbe_                  | 1TECHNO-077                                                 |
| Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite…               | 5-077 · 2-372 · 3-030                                       |
| Passer du graphique aux données et vice versa                                                    | 5-077 · 5-096                                               |

(_Italique_ = ligne propre à la Tle selon le BO. Les doublons — 2-377, 1TECHNO-066,
1TECHNO-077, 5-077 — ne comptent qu'une fois : la clé est (point, grade).) Cibles des lignes
reprises de la 1re : **les mêmes qu'en 1re techno**, pour la cohérence.

### E. Entretien (U5/V1) — 32 références (tableau plus haut)

---

## Rattachements discutables

1. **« Dérivée de la fonction inverse »** (TTECHNO-046) → `Dérivation > fonctions dérivées`,
   là où sont les dérivées des fonctions de référence en 1re spé. Alternative :
   `Fonction inverse > variations`, avec son jumeau scindé (« sens de variation »).
2. **« Utiliser le logarithme décimal pour résoudre $a^x = b$, $x^a = b$, $a^x < b$… »**
   (TTECHNO-043) → `Logarithmes > logarithme décimal`, où vit tout le log de la voie techno
   (Y3). Alternative : `Logarithmes > équations et inéquations` — mais ce nœud porte les
   équations en $\ln$ de la voie générale ; les mêler brouillerait le filtrage par série.
3. **« Intercaler entre deux points … la moyenne arithmétique (resp. géométrique) »**
   (situation algorithmique, TTECHNO-039) → `Fonction exponentielle > fonctions x ↦ aˣ`, sa
   section : c'est la construction point par point de la courbe de $x \mapsto a^x$.
   Alternative : `Suites géométriques` (notion), d'où viennent les moyennes.
4. **« Interpréter l'évènement {X = k} sur un arbre de probabilité »** (TTECHNO-063) →
   `Loi binomiale > calcul de probabilités`. Alternative : `Probabilités conditionnelles >
épreuves indépendantes successives`, où est l'arbre de Bernoulli de 1re (1TECHNO-094).
5. **« Représenter par un diagramme en bâtons la loi d'une loi binomiale … lien avec
   l'histogramme des fréquences »** (TTECHNO-067) → `Loi binomiale` (notion, pas de
   sous-notion « représentation »). Alternative : `Statistiques › Échantillonnage >
simulation`, pour le lien avec la simulation de 1re.
6. **« Formule des probabilités totales pour une partition de l'univers »** (TTECHNO-055 et
   la capacité TTECHNO-056) → **deux points neufs**, car la Tle **dépasse** la 1re : la 1re
   techno a « Formule des probabilités totales » et « Dans les cas simples, calculer… »
   (1TECHNO-090, 092) ; la Tle la pose pour une **partition** et la démontre pour deux ou
   trois évènements. Alternative : entretien vers 1TECHNO-090 · 092, sans point.
7. **« Coniques : sections planes d'un cône de révolution »** (STD2A, TTECHNO-001) →
   `Solides > sections planes` (doc d'écarts : on coupe un solide). Alternative :
   `Figures planes > coniques`, où vont la tangente et le raccordement.

## Questions

- **T3 — Situations algorithmiques de Tle : `approfondissement`.** Le BO de 1re disait
  qu'elles « **doivent** toutes faire l'objet d'un travail spécifique » (→ `attendu`, T2).
  Celui de Tle écrit qu'elles « **peuvent** toutes faire l'objet d'un travail spécifique » et
  que les professeurs en proposent « **quelques**-unes » ; les capacités attendues en
  algorithmique sont, elles, déjà portées par l'entretien des 11 points de 1re. Reco :
  **`approfondissement`** (8 points), comme les « Exemples d'algorithme » de la voie générale
  (E1). Alternative : `attendu`, comme en 1re.
- **T4 — Automatismes : pas de reprise de la liste de 1re.** En 1re, le BO disait « s'ajoute
  la liste des automatismes de seconde » (C16). En Tle, il redonne une liste **complète** et
  ne parle d'aucun ajout. Quatre lignes de 1re n'y sont plus : équation produit nul,
  indicateurs statistiques, probabilités conditionnelles sur tableau ou arbre, distinguer
  $P(A \cap B)$, $P_A(B)$, $P_B(A)$. Reco : **la liste de Tle seule** (53 références). Mais le
  BO ajoute que « les différents thèmes proposés doivent être travaillés tout au long des
  deux années » — alternative : reprendre aussi la liste de 1re techno (et donc celle de
  2de, par C16), comme A1 l'a fait pour le cycle terminal général.
- **Validation d'ensemble** : les scissions, l'entretien (32 références, dont tout le bloc
  Algorithmique), les références A, les 7 discutables.

---

## Les 69 points

### Activités géométriques (série STD2A) > Géométrie plane (branche `Géométrie`)

| Code        | Énoncé                                                                                           | kind  | nœud                                       |
| ----------- | ------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------ |
| TTECHNO-001 | Coniques : sections planes d'un cône de révolution                                               | conn. | Solides > sections planes _(discutable 7)_ |
| TTECHNO-002 | Notion de tangente à une conique en un point                                                     | conn. | Figures planes > coniques                  |
| TTECHNO-003 | Étudier le raccordement d'arcs de cercles, d'ellipses ou de courbes représentatives de fonctions | s-f   | Figures planes > coniques                  |

### Activités géométriques (série STD2A) > Géométrie dans l'espace (branche `Géométrie`)

| Code        | Énoncé                                                                                                                                                                         | kind  | nœud                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------ |
| TTECHNO-004 | Perspective centrale : projection centrale                                                                                                                                     | conn. | Solides > perspective centrale |
| TTECHNO-005 | Propriétés de conservation (alignement, contact) ou de non conservation (longueurs, milieux, rapports de longueurs, angles, parallélisme) ; cas particulier des plans frontaux | conn. | Solides > perspective centrale |
| TTECHNO-006 | Point de fuite d'une droite                                                                                                                                                    | conn. | Solides > perspective centrale |
| TTECHNO-007 | Point de fuite principal                                                                                                                                                       | conn. | Solides > perspective centrale |
| TTECHNO-008 | Ligne de fuite d'un plan non frontal, ligne d'horizon                                                                                                                          | conn. | Solides > perspective centrale |
| TTECHNO-009 | Image d'un quadrillage, de solides simples (parallélépipède rectangle, prisme, pyramide)                                                                                       | conn. | Solides > perspective centrale |
| TTECHNO-010 | Utiliser le vocabulaire usuel de la perspective centrale                                                                                                                       | s-f   | Solides > perspective centrale |
| TTECHNO-011 | Utiliser les propriétés d'une projection centrale                                                                                                                              | s-f   | Solides > perspective centrale |
| TTECHNO-012 | Utiliser la conservation de forme dans les plans frontaux                                                                                                                      | s-f   | Solides > perspective centrale |
| TTECHNO-013 | Utiliser la position relative de l'image de deux droites parallèles                                                                                                            | s-f   | Solides > perspective centrale |
| TTECHNO-014 | Construire l'image d'un quadrillage ou d'un parallélépipède rectangle ayant au moins une arête en vraie grandeur                                                               | s-f   | Solides > perspective centrale |

### Automatismes (le seul contenu neuf de la rubrique — Y1/Y2 ; auto-référencé)

| Code        | Énoncé                                                                                                   | kind | nœud                                    |
| ----------- | -------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------- |
| TTECHNO-015 | Interpréter un indice de base 100 ; calculer un indice ; calculer le taux d'évolution entre deux valeurs | s-f  | `Proportionnalité` Évolutions > indices |

### Analyse > Suites numériques (branche `Suites`)

| Code        | Énoncé                                                                                                                                                                                                                                                                                                            | kind  | nœud                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------- |
| TTECHNO-016 | Moyenne arithmétique de deux nombres                                                                                                                                                                                                                                                                              | conn. | Suites arithmétiques (notion)           |
| TTECHNO-017 | Somme des $n$ premiers termes d'une suite arithmétique ; notation $\Sigma$                                                                                                                                                                                                                                        | conn. | Suites arithmétiques > somme des termes |
| TTECHNO-018 | Moyenne géométrique de deux nombres positifs                                                                                                                                                                                                                                                                      | conn. | Suites géométriques (notion)            |
| TTECHNO-019 | Somme des $n$ premiers termes d'une suite géométrique ; notation $\Sigma$                                                                                                                                                                                                                                         | conn. | Suites géométriques > somme des termes  |
| TTECHNO-020 | ✂ Prouver que trois nombres sont (ou ne sont pas) les termes consécutifs d'une suite arithmétique                                                                                                                                                                                                                | s-f   | Suites arithmétiques > reconnaître      |
| TTECHNO-021 | ✂ Prouver que trois nombres sont (ou ne sont pas) les termes consécutifs d'une suite géométrique                                                                                                                                                                                                                 | s-f   | Suites géométriques > reconnaître       |
| TTECHNO-022 | ✂ Déterminer la raison d'une suite arithmétique modélisant une évolution                                                                                                                                                                                                                                         | s-f   | Suites arithmétiques > raison           |
| TTECHNO-023 | ✂ Déterminer la raison d'une suite géométrique modélisant une évolution                                                                                                                                                                                                                                          | s-f   | Suites géométriques > raison            |
| TTECHNO-024 | ✂ Exprimer en fonction de $n$ le terme général d'une suite arithmétique                                                                                                                                                                                                                                          | s-f   | Suites arithmétiques > terme général    |
| TTECHNO-025 | ✂ Exprimer en fonction de $n$ le terme général d'une suite géométrique                                                                                                                                                                                                                                           | s-f   | Suites géométriques > terme général     |
| TTECHNO-026 | ✂ Calculer la somme des $n$ premiers termes d'une suite arithmétique                                                                                                                                                                                                                                             | s-f   | Suites arithmétiques > somme des termes |
| TTECHNO-027 | ✂ Calculer la somme des $n$ premiers termes d'une suite géométrique                                                                                                                                                                                                                                              | s-f   | Suites géométriques > somme des termes  |
| TTECHNO-028 | ✂ Reconnaitre une situation relevant du calcul d'une somme de termes consécutifs d'une suite arithmétique                                                                                                                                                                                                        | s-f   | Suites arithmétiques > somme des termes |
| TTECHNO-029 | ✂ Reconnaitre une situation relevant du calcul d'une somme de termes consécutifs d'une suite géométrique                                                                                                                                                                                                         | s-f   | Suites géométriques > somme des termes  |
| TTECHNO-030 | Écrire en langage Python une fonction qui calcule la somme des $n$ premiers carrés, des $n$ premiers cubes ou des $n$ premiers inverses ; établir le lien entre l'écriture de la somme à l'aide du symbole $\Sigma$ et les composantes de l'algorithme (initialisation, sortie de boucle, accumulateur, compteur) | algo. | Suites et modélisation > algorithmes    |

### Analyse > Fonctions exponentielles (branches `Fonctions` / `Proportionnalité`)

| Code        | Énoncé                                                                                                                                                                                                                                        | kind  | nœud                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| TTECHNO-031 | Définition de la fonction $x \mapsto a^x$ pour $x$ positif comme prolongement à des valeurs non entières positives de la suite géométrique $(a^n)_{n \in \mathbb{N}}$ ; extension à $\mathbb{R}_-$ en posant $a^{-x} = \frac{1}{a^x}$         | conn. | Fonction exponentielle > fonctions x ↦ aˣ                  |
| TTECHNO-032 | Sens de variation de $x \mapsto a^x$ selon les valeurs de $a$                                                                                                                                                                                 | conn. | Fonction exponentielle > fonctions x ↦ aˣ                  |
| TTECHNO-033 | Allure de la courbe représentative de $x \mapsto a^x$ selon les valeurs de $a$                                                                                                                                                                | conn. | Fonction exponentielle > fonctions x ↦ aˣ                  |
| TTECHNO-034 | Propriétés algébriques : $a^{x+y} = a^x a^y$ ; $a^{x-y} = \frac{a^x}{a^y}$ ; $a^{nx} = (a^x)^n$ pour $n$ entier relatif                                                                                                                       | conn. | Fonction exponentielle > fonctions x ↦ aˣ                  |
| TTECHNO-035 | Cas particulier de l'exposant $\frac{1}{n}$ pour calculer un taux d'évolution moyen équivalent à $n$ évolutions successives                                                                                                                   | conn. | `Proportionnalité` Évolutions > taux d'évolution moyen     |
| TTECHNO-036 | Connaitre et utiliser le sens de variation des fonctions de la forme $x \mapsto k a^x$, selon le signe de $k$ et les valeurs de $a$                                                                                                           | s-f   | Fonction exponentielle > fonctions x ↦ aˣ                  |
| TTECHNO-037 | Connaitre les propriétés algébriques des fonctions exponentielles et les utiliser pour transformer des écritures numériques ou littérales                                                                                                     | s-f   | Fonction exponentielle > fonctions x ↦ aˣ                  |
| TTECHNO-038 | Calculer le taux d'évolution moyen équivalent à des évolutions successives                                                                                                                                                                    | s-f   | `Proportionnalité` Évolutions > taux d'évolution moyen     |
| TTECHNO-039 | Intercaler entre deux points déjà construits un troisième point ayant pour abscisse (respectivement pour ordonnée) la moyenne arithmétique (respectivement géométrique) des abscisses (respectivement des ordonnées) des deux points initiaux | algo. | Fonction exponentielle > fonctions x ↦ aˣ _(discutable 3)_ |

### Analyse > Fonction logarithme décimal (branche `Fonctions`)

| Code        | Énoncé                                                                                                                                                                                                                                 | kind  | nœud                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| TTECHNO-040 | Définition du logarithme décimal de $b$ pour $b > 0$ comme l'unique solution de l'équation $10^x = b$ ; notation $\log$                                                                                                                | conn. | Logarithmes > logarithme décimal                  |
| TTECHNO-041 | Sens de variation de la fonction logarithme décimal                                                                                                                                                                                    | conn. | Logarithmes > logarithme décimal                  |
| TTECHNO-042 | Propriétés algébriques : $\log(ab) = \log(a) + \log(b)$, $\log(a^n) = n\log(a)$ et $\log\left(\frac{a}{b}\right) = \log(a) - \log(b)$, pour $n$ entier naturel, $a$ et $b$ réels strictement positifs                                  | conn. | Logarithmes > logarithme décimal                  |
| TTECHNO-043 | Utiliser le logarithme décimal pour résoudre une équation du type $a^x = b$ ou $x^a = b$ d'inconnue $x$ réelle, une inéquation du type $a^x < b$ ou $x^a < b$ d'inconnue $x$ réelle ou du type $a^n < b$ d'inconnue $n$ entier naturel | s-f   | Logarithmes > logarithme décimal _(discutable 2)_ |
| TTECHNO-044 | Utiliser les propriétés algébriques de la fonction logarithme décimal pour transformer des expressions numériques ou littérales                                                                                                        | s-f   | Logarithmes > logarithme décimal                  |

### Analyse > Fonction inverse (branche `Fonctions`)

| Code        | Énoncé                                                                                                                                             | kind  | nœud                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------ |
| TTECHNO-045 | Comportement de la fonction inverse aux bornes de son ensemble de définition                                                                       | conn. | Fonction inverse > définition et courbe          |
| TTECHNO-046 | ✂ Dérivée de la fonction inverse                                                                                                                  | conn. | Dérivation > fonctions dérivées _(discutable 1)_ |
| TTECHNO-047 | ✂ Sens de variation de la fonction inverse                                                                                                        | conn. | Fonction inverse > variations                    |
| TTECHNO-048 | Courbe représentative de la fonction inverse ; asymptotes                                                                                          | conn. | Fonction inverse > définition et courbe          |
| TTECHNO-049 | Étudier et représenter des fonctions obtenues par combinaisons linéaires de la fonction inverse et de fonctions polynomiales de degré au maximum 3 | s-f   | Dérivation > étude de fonction                   |

### Statistique et probabilités > Séries statistiques à deux variables quantitatives (branche `Statistiques`)

| Code        | Énoncé                                                                                                                                                                                                                            | kind  | nœud                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------- |
| TTECHNO-050 | Changement de variable dans l'étude graphique d'une série statistique à deux variables quantitatives                                                                                                                              | conn. | Statistique à deux variables > changement de variable |
| TTECHNO-051 | Ajustement se ramenant par changement de variable à un ajustement affine                                                                                                                                                          | conn. | Statistique à deux variables > changement de variable |
| TTECHNO-052 | Représenter un nuage de points en effectuant un changement de variable donné (par exemple $u^2$, $\frac{1}{t}$, $\frac{1}{\sqrt{n}}$, $\log(y)$, etc.) afin de conjecturer une relation de linéarité entre de nouvelles variables | s-f   | Statistique à deux variables > changement de variable |
| TTECHNO-053 | Automatiser le calcul de $\sum_i \left(y_i - (ax_i + b)\right)^2$                                                                                                                                                                 | algo. | Statistique à deux variables > ajustement affine      |
| TTECHNO-054 | Rechercher un couple $(a, b)$ minimisant cette expression parmi un ensemble fini de couples proposés par les élèves ou générés par balayage, tirage aléatoire, etc.                                                               | algo. | Statistique à deux variables > ajustement affine      |

### Statistique et probabilités > Probabilités conditionnelles (branche `Probabilités`)

| Code        | Énoncé                                                                                                                     | kind  | nœud                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------- |
| TTECHNO-055 | Formule des probabilités totales pour une partition de l'univers                                                           | conn. | Probabilités conditionnelles > probabilités totales _(discutable 6)_ |
| TTECHNO-056 | Calculer la probabilité d'un évènement connaissant ses probabilités conditionnelles relatives à une partition de l'univers | s-f   | Probabilités conditionnelles > probabilités totales                  |

### Statistique et probabilités > Variables aléatoires discrètes finies (branches `Probabilités` / `Dénombrement`)

| Code        | Énoncé                                                                                                                                                                                                                                                                                             | kind  | nœud                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| TTECHNO-057 | ✂ Loi binomiale $\mathcal{B}(n, p)$                                                                                                                                                                                                                                                               | conn. | Loi binomiale (notion)                                  |
| TTECHNO-058 | ✂ Espérance de la loi binomiale (admise)                                                                                                                                                                                                                                                          | conn. | Loi binomiale > espérance et variance                   |
| TTECHNO-059 | ✂ Coefficients binomiaux $\binom{n}{k}$                                                                                                                                                                                                                                                           | conn. | Loi binomiale > coefficients binomiaux                  |
| TTECHNO-060 | ✂ Triangle de Pascal                                                                                                                                                                                                                                                                              | conn. | `Dénombrement` Combinaisons > triangle de Pascal        |
| TTECHNO-061 | Calculer des coefficients binomiaux $\binom{n}{k}$ à l'aide du triangle de Pascal pour $n \leqslant 10$                                                                                                                                                                                            | s-f   | Loi binomiale > coefficients binomiaux                  |
| TTECHNO-062 | Reconnaitre une situation relevant de la loi binomiale et en identifier le couple de paramètres                                                                                                                                                                                                    | s-f   | Loi binomiale > reconnaître une loi                     |
| TTECHNO-063 | Lorsque la variable aléatoire $X$ suit une loi binomiale : interpréter l'évènement $\{X = k\}$ sur un arbre de probabilité                                                                                                                                                                         | s-f   | Loi binomiale > calcul de probabilités _(discutable 4)_ |
| TTECHNO-064 | Lorsque la variable aléatoire $X$ suit une loi binomiale : calculer les probabilités des évènements $\{X = 0\}$, $\{X = 1\}$, $\{X = n\}$, $\{X = n - 1\}$ et de ceux qui s'en déduisent par réunion                                                                                               | s-f   | Loi binomiale > calcul de probabilités                  |
| TTECHNO-065 | Lorsque la variable aléatoire $X$ suit une loi binomiale : calculer la probabilité de l'évènement $\{X = k\}$ à l'aide des coefficients binomiaux                                                                                                                                                  | s-f   | Loi binomiale > coefficients binomiaux                  |
| TTECHNO-066 | Générer un triangle de Pascal de taille $n$ donnée                                                                                                                                                                                                                                                 | algo. | `Dénombrement` Combinaisons > triangle de Pascal        |
| TTECHNO-067 | Représenter par un diagramme en bâtons la loi de probabilité d'une loi binomiale $\mathcal{B}(n, p)$ ; faire le lien avec l'histogramme des fréquences observées des 1 lors de la simulation de $N$ échantillons de taille $n$ d'une loi de Bernoulli de paramètre $p$ faite en classe de première | algo. | Loi binomiale (notion) _(discutable 5)_                 |
| TTECHNO-068 | Calculer l'espérance $\sum x_i p_i$ d'une variable aléatoire suivant une loi de probabilité donnée ; cas particulier d'une variable aléatoire suivant la loi binomiale $\mathcal{B}(n, p)$                                                                                                         | algo. | Variables aléatoires > espérance                        |
| TTECHNO-069 | Représenter graphiquement l'espérance de lois binomiales $\mathcal{B}(n, p)$ à $p$ fixé et $n$ variable, à $n$ fixé et $p$ variable, puis faire le lien avec l'expression admise de l'espérance                                                                                                    | algo. | Loi binomiale > espérance et variance                   |

## Après validation (plan de livraison)

Migration additive générée depuis ce document : 69 points `TTECHNO-001`…`069`,
85 références A + E (auto-référence comprise) ; bloc DO auto-vérifiant (comptes, kinds,
exigences, 0 sans nœud, références) ; test intégral, preuve rouge, audit, PR, CI, merge,
`db:migrate`, vérification prod.
