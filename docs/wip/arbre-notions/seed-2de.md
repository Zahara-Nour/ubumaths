# Seed 2de — points du programme ET références d'automatismes (architecture points → nœuds)

> **Statut : VALIDÉ INTÉGRALEMENT par David le 2026-10-08 (puces multi-parties,
> discutables 1-5, L1-L4). Livraison en cours.** ⚠️ Niveau à soin maximal : classes réelles de 2de.
> Source : « Programme de mathématiques de la classe de seconde générale et
> technologique » (13 p., lues ligne à ligne), rubriques Contenus / Capacités
> attendues / Démonstrations / Exemples d'algorithme / Approfondissements possibles +
> la partie **Automatismes** (→ références). Base de travail : le découpage en
> **185 points relus** de l'ancien référentiel (`docs/wip/referentiel/2de-programme.md`,
> convention « deux gestes réussissables séparément = deux points », établie à la
> relecture 1re spé du 2026-08-30) — repris tel quel, **scindé en plus là où une puce
> traverse plusieurs notions de l'arbre** (section dédiée ci-dessous). La colonne
> « ex- » trace l'ancien code : le transfert des 63 tags de 2de (étape 2 de C5) se fera
> par cette table, mécaniquement. Mapping des nœuds :
> [programmes-ecarts-2de.md](programmes-ecarts-2de.md) (T1-T6 tranchées le 2026-10-07,
> sous-notions T2/T3/T4/T5 créées pour ce seed). Un changement d'arbre : la branche
> Logique restructurée (C2, tranché par David le 2026-10-08 — voir discutable 1),
> version `2026-10-07.15`.

## Attributs communs

| Attribut               | Valeur                                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grade`                | `2`                                                                                                                                                                                                       |
| `code`                 | **`2-201` à `2-400`** (code = 200 + display_order). L'ancien seed occupe `2-001`…`2-185` jusqu'à l'étape 4 de C5 (index de codes global)                                                                  |
| `objective_id`, `rang` | `NULL`                                                                                                                                                                                                    |
| `rubrique`             | « thème > objectif » du BO (C11), ex. `Fonctions > Variations et extrémums d'une fonction` ; la partie transversale « Vocabulaire ensembliste et logique » n'a pas d'objectifs → rubrique = le thème seul |
| `kind`                 | conn. (Contenus) / s-f (Capacités) / dém. (Démonstrations) / **algo.** — questions L1-L2 ci-dessous                                                                                                       |
| `exigence`             | `attendu`, sauf **Approfondissements possibles** → `approfondissement` ; les **Exemples d'algorithme** → question L2                                                                                      |
| `regime_acquisition`   | `diversite` partout (pas de répertoire de faits nouveau en 2de ; les automatismes sont des références)                                                                                                    |
| `display_order`        | ordre du BO (scissions insérées à leur place)                                                                                                                                                             |

**200 points** (185 de l'ancien découpage + 17 issus des scissions multi-notions − 2
puces non retenues : ex-2-099 et ex-2-100, trop larges — voir discutable 3) et
**29 lignes d'Automatismes → 58 références** distinctes (cibles cycle 2 → 3e désormais
toutes en base, plus **8 auto-références** C13 quand la ligne porte sur un contenu
introduit en 2de : 2-269, 2-273, 2-274, 2-276, 2-277, 2-331, 2-380, 2-381 — comptes
établis par le générateur). Libellés : repris de l'ancien référentiel (LaTeX MathLive déjà validé).

---

## ⚠️ Les puces multi-parties : scindées ou non, une par une

> Critère (celui des seeds précédents, durci pour le lycée) : on scinde quand les
> parties visent **des notions différentes de l'arbre** OU quand elles sont **traitées
> à des moments différents de l'année** (sinon le suivi de progression ne peut pas
> cocher honnêtement). On ne scinde PAS quand les parties sont des variantes d'un même
> geste (la gradation vit dans le `level` des questions).

### Scindées (17 points supplémentaires)

| Puce (ancien code)                                                                                                          | Décision                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ex-2-001 « élément, sous-ensemble, vide, appartenance, inclusion, réunion, intersection, complémentaire »                   | **×2** : appartenance/inclusion (→ `Ensembles de nombres > appartenance et inclusion`) ≠ opérations sur les ensembles (→ `Opérations sur les ensembles`). Deux notions.                                                                                            |
| ex-2-025 « Programmer, dans des cas simples, une boucle bornée, une boucle non bornée »                                     | **×2** : `for` et `while` sont deux habiletés, apprises à des moments différents (→ `Boucles > boucle bornée` / `> boucle non bornée`).                                                                                                                            |
| ex-2-063 « Ensemble des solutions des équations ax + b = 0 et des inéquations ax + b > 0 »                                  | **×2** : équations ≠ inéquations, deux notions de l'arbre (→ `Équations : premier degré > ax + b = c` / `Inéquations : premier degré > ax + b < c`).                                                                                                               |
| ex-2-067 « Effectuer des calculs… mettant en jeu des puissances, des racines carrées, des écritures fractionnaires »        | **×3** : trois chapitres distincts (→ `Puissances : calculs` / `Racines carrées : calculs > calculer` / `Calcul littéral > expressions fractionnaires`).                                                                                                           |
| ex-2-125 « Signe d'une fonction affine et des fonctions de référence »                                                      | **×2** : l'affine (→ `Fonctions affines > variations et signe`) ≠ le concept général (→ `Généralités sur les fonctions > signe`).                                                                                                                                  |
| ex-2-129 « Fonctions valeur absolue, carré, inverse : définitions et courbes représentatives »                              | **×3** : chaque fonction de référence a sa notion et son moment dans l'année (→ `Fonction valeur absolue` (notion) / `Fonction carré > définition et courbe` / `Fonction inverse > définition et courbe`).                                                         |
| ex-2-133 « Pour les fonctions affines, valeur absolue, carré, inverse, racine carrée et cube, résoudre f(x) = k, f(x) < k » | **×6** : les sous-notions d'équations existent par fonction, créées pour ça (T2) — affines `> équations`, valeur absolue `> équations et inéquations`, carré `> x² = k, x² < k`, inverse `> 1/x = k, 1/x < k`, racine `> √x = k, √x < k`, cube `> x³ = k, x³ < k`. |
| ex-2-143 « Fonctions valeur absolue, carré : signe et variations »                                                          | **×2** : une par fonction (→ `Fonction valeur absolue > variations` / `Fonction carré > variations`). Le « signe » est porté par la scission d'ex-2-125.                                                                                                           |
| ex-2-147 [D] « Variations des fonctions carré, inverse »                                                                    | **×2** : deux démonstrations distinctes (→ `Fonction carré > variations` / `Fonction inverse > variations`).                                                                                                                                                       |
| ex-2-180 « Construire un arbre pondéré ou un tableau en lien avec une situation donnée »                                    | **×2** : deux registres réussissables séparément (→ `Probabilités conditionnelles > arbres pondérés` / `> tableaux croisés`).                                                                                                                                      |
| ex-2-182 « Calculer des probabilités conditionnelles… sous forme de tableau croisé… ou d'arbre »                            | **×2** : même critère (→ `> tableaux croisés` / `> arbres pondérés`).                                                                                                                                                                                              |

### Examinées et NON scindées (variantes d'un même geste)

| Puce (ancien code)                                                                                                     | Pourquoi on garde UN point                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ex-2-074 « équations du type ax = b, a + x = b, ax + b = cx + d »                                                      | Un seul geste (résoudre le premier degré), formes = gradation `level` ; traité d'un bloc en 2de (révision). Nœud : la notion `Équations : premier degré`. |
| ex-2-075 « inéquations du type ax ⩾ b, a + x ⩾ b, ax + b ⩾ cx + d »                                                    | Idem → notion `Inéquations : premier degré`.                                                                                                              |
| ex-2-111 « équation de droite à partir de deux points, d'un point et un vecteur directeur, ou d'un point et la pente » | Un geste (déterminer une équation de droite), trois données d'entrée → `Géométrie repérée > équations de droites`.                                        |
| ex-2-023 « concevoir et écrire une affectation, une séquence, une conditionnelle »                                     | Le b-a-ba d'un même apprentissage → notion `Variables et instructions`.                                                                                   |
| ex-2-095 « coordonnées d'une somme de vecteurs, d'un produit par un réel »                                             | La sous-notion `somme et produit par un réel` couvre exactement les deux.                                                                                 |
| ex-2-130 / ex-2-132 « résoudre f(x) = k, f(x) < k / f(x) = g(x), f(x) < g(x) »                                         | Le geste est le CHOIX de méthode (graphique/algébrique/logicielle) → `Généralités sur les fonctions > résolution graphique`.                              |
| ex-2-029 « écrire des fonctions simples ; appeler une fonction »                                                       | Écrire et appeler s'apprennent ensemble → notion `Fonctions Python`.                                                                                      |
| ex-2-144 « comparer f(a) et f(b) pour une fonction de référence »                                                      | Capacité générique du BO (utiliser les variations), pas une par fonction → `Généralités sur les fonctions > variations`.                                  |
| ex-2-158 [C] « influence sur la moyenne, la médiane, de l'ajout/suppression d'une valeur »                             | Une connaissance d'un seul tenant → notion `Indicateurs`.                                                                                                 |
| ex-2-159 [C] « histogramme, polygone des fréquences cumulées »                                                         | [C] descriptif → notion `Représenter des données` (les SF de tracé n'existent pas en 2de).                                                                |

---

## Les 200 points

> Colonnes : code (nouveau) · ex- (ancien code, pour le transfert des tags) · énoncé
> (libellé de l'ancien référentiel, LaTeX MathLive) · kind · nœud. Rubrique = titre de
> bloc. Régime : `diversite` partout. ✂ = issu d'une scission ci-dessus.

### Vocabulaire ensembliste et logique (rubrique = le thème ; branches `Ensembles` / `Logique`)

| Code  | ex-    | Énoncé                                                                                                                                              | kind  | nœud                                                            |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------- |
| 2-201 | ✂001a | Notions d'élément d'un ensemble, de sous-ensemble, d'appartenance et d'inclusion                                                                    | conn. | Ensembles de nombres > appartenance et inclusion                |
| 2-202 | ✂001b | Notions d'ensemble vide, de réunion, d'intersection et de complémentaire                                                                            | conn. | Opérations sur les ensembles (notion)                           |
| 2-203 | 002    | Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\ldots\,\}$                                                 | conn. | Opérations sur les ensembles (notion)                           |
| 2-204 | 003    | Notation des ensembles de nombres et des intervalles                                                                                                | conn. | Ensembles de nombres (notion — ℕℤ𝔻ℚℝ + intervalles)             |
| 2-205 | 004    | Notion de couple et de produit cartésien de deux ensembles                                                                                          | conn. | Cardinal et produit cartésien > produit cartésien               |
| 2-206 | 005    | Notation du complémentaire d'un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$                                 | conn. | Opérations sur les ensembles > complémentaire                   |
| 2-207 | 006    | Notation $\operatorname{Card}(A)$ pour le cardinal d'un ensemble fini                                                                               | conn. | Cardinal et produit cartésien > cardinal                        |
| 2-208 | 007    | Reconnaitre ce qu'est une proposition mathématique                                                                                                  | s-f   | Proposition mathématique (notion)                               |
| 2-209 | 008    | Utiliser des variables pour écrire des propositions mathématiques                                                                                   | s-f   | Proposition mathématique > statut des lettres et des égalités   |
| 2-210 | 009    | Lire et écrire des propositions contenant les connecteurs « et », « ou »                                                                            | s-f   | Proposition mathématique > et, ou, non                          |
| 2-211 | 010    | Formuler la négation de propositions simples (sans implication ni quantificateurs)                                                                  | s-f   | Quantificateurs et négation > négation d'une proposition        |
| 2-212 | 011    | Mobiliser un contre-exemple pour montrer qu'une proposition est fausse                                                                              | s-f   | Raisonnements > contre-exemple                                  |
| 2-213 | 012    | Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple                                                     | s-f   | Implication et équivalence (notion — implication + équivalence) |
| 2-214 | 013    | Formuler la réciproque d'une implication, la contraposée                                                                                            | s-f   | Implication et équivalence (notion — réciproque + contraposée)  |
| 2-215 | 014    | Lire et écrire des propositions contenant une quantification universelle ou existentielle (les symboles $\forall$ et $\exists$ sont hors programme) | s-f   | Quantificateurs et négation > pour tout, il existe              |
| 2-216 | 015    | Produire un raisonnement par disjonction des cas                                                                                                    | s-f   | Raisonnements > disjonction de cas                              |
| 2-217 | 016    | Produire un raisonnement par l'absurde                                                                                                              | s-f   | Raisonnements > par l'absurde                                   |

### Algorithmique et programmation (branche `Algorithmique` ; kind → question L1)

| Code  | ex-    | Énoncé                                                                                                                                   | kind  | nœud                                                     |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------- |
| 2-218 | 017    | Variables informatiques de type entier, booléen, flottant, chaine de caractères                                                          | algo. | Variables et instructions > types                        |
| 2-219 | 018    | Affectation (notée $\leftarrow$ en langage naturel)                                                                                      | algo. | Variables et instructions > variables et affectation     |
| 2-220 | 019    | Séquence d'instructions                                                                                                                  | algo. | Variables et instructions (notion)                       |
| 2-221 | 020    | Instruction conditionnelle                                                                                                               | algo. | Variables et instructions > instructions conditionnelles |
| 2-222 | 021    | Boucle bornée (`for`), boucle non bornée (`while`)                                                                                       | algo. | Boucles (notion)                                         |
| 2-223 | 022    | Choisir ou déterminer le type d'une variable (entier, flottant ou chaine de caractères)                                                  | algo. | Variables et instructions > types                        |
| 2-224 | 023    | Concevoir et écrire une instruction d'affectation, une séquence d'instructions, une instruction conditionnelle                           | algo. | Variables et instructions (notion)                       |
| 2-225 | 024    | Écrire une formule permettant un calcul combinant des variables                                                                          | algo. | Variables et instructions > variables et affectation     |
| 2-226 | ✂025a | Programmer, dans des cas simples, une boucle bornée                                                                                      | algo. | Boucles > boucle bornée                                  |
| 2-227 | ✂025b | Programmer, dans des cas simples, une boucle non bornée                                                                                  | algo. | Boucles > boucle non bornée                              |
| 2-228 | 026    | Dans des cas plus complexes : lire, comprendre, modifier ou compléter un algorithme ou un programme                                      | algo. | Variables et instructions (notion)                       |
| 2-229 | 027    | Fonctions à un ou plusieurs arguments                                                                                                    | algo. | Fonctions Python > définir une fonction                  |
| 2-230 | 028    | Fonction renvoyant un nombre aléatoire ; série statistique obtenue par la répétition de l'appel d'une telle fonction                     | algo. | `Statistiques` Échantillonnage > simulation              |
| 2-231 | 029    | Écrire des fonctions simples ; appeler une fonction                                                                                      | algo. | Fonctions Python (notion)                                |
| 2-232 | 030    | Lire, comprendre, modifier, compléter des fonctions plus complexes                                                                       | algo. | Fonctions Python (notion)                                |
| 2-233 | 031    | Lire et comprendre une fonction renvoyant une moyenne, un écart type (aucune connaissance sur les listes n'est exigée)                   | algo. | Fonctions Python (notion)                                |
| 2-234 | 032    | Écrire des fonctions renvoyant le résultat numérique d'une expérience aléatoire, d'une répétition d'expériences aléatoires indépendantes | algo. | `Statistiques` Échantillonnage > simulation              |

### Nombres et calculs, algèbre > Arithmétique (branches `Arithmétique` / `Nombres et calculs`)

| Code  | ex- | Énoncé                                                                                                                                                 | kind  | nœud                                                            |
| ----- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------- |
| 2-235 | 033 | Notations $\mathbb{N}$ et $\mathbb{Z}$                                                                                                                 | conn. | `Ensembles` Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ                |
| 2-236 | 034 | Définition des notions de multiple, de diviseur, de nombre pair, de nombre impair : $a$ est multiple de $b$ s'il existe un entier $k$ tel que $a = kb$ | conn. | Divisibilité (notion — multiples et diviseurs + pair ou impair) |
| 2-237 | 035 | Modéliser et résoudre des problèmes mobilisant les notions de multiple, de diviseur, de nombre pair, de nombre impair                                  | s-f   | Divisibilité (notion)                                           |
| 2-238 | 036 | Présenter les fractions sous forme irréductible                                                                                                        | s-f   | `Nombres et calculs` Fractions : sens et écritures > simplifier |
| 2-239 | 037 | Pour une valeur numérique de $a$, la somme de deux multiples de $a$ est multiple de $a$                                                                | dém.  | Divisibilité > multiples et diviseurs                           |
| 2-240 | 038 | Le carré d'un nombre impair est impair                                                                                                                 | dém.  | Divisibilité > pair ou impair                                   |
| 2-241 | 039 | Déterminer si un entier naturel $a$ est multiple d'un entier naturel $b$                                                                               | algo. | Divisibilité > multiples et diviseurs                           |
| 2-242 | 040 | Pour des entiers $a$ et $b$ donnés, déterminer le plus grand multiple de $a$ inférieur ou égal à $b$                                                   | algo. | Divisibilité > multiples et diviseurs                           |

### … > Nombres réels

| Code  | ex- | Énoncé                                                                                                                             | kind  | nœud                                                                        |
| ----- | --- | ---------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------- |
| 2-243 | 041 | Ensemble $\mathbb{R}$ des nombres réels, droite numérique                                                                          | conn. | `Ensembles` Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ                            |
| 2-244 | 042 | Intervalles de $\mathbb{R}$ ; représentation graphique, notations du type $[a\,;\,+\infty[$, $]-\infty\,;\,a]$, $[a\,;\,b]$        | conn. | `Ensembles` Ensembles de nombres > intervalles                              |
| 2-245 | 043 | Notation en valeur absolue $\|a\|$ pour la distance de $a$ à $0$ ; distance entre deux nombres réels                               | conn. | `Fonctions` Fonction valeur absolue > définition et distance                |
| 2-246 | 044 | Inéquation du type $\|x - a\| \leqslant r$ ; représentation graphique des solutions, intervalle $[a - r\,;\,a + r]$                | conn. | `Fonctions` Fonction valeur absolue > équations et inéquations              |
| 2-247 | 045 | Ensemble $\mathbb{D}$ des nombres décimaux ; encadrement décimal d'un nombre réel à $10^{-n}$ près                                 | conn. | `Ensembles` Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ                            |
| 2-248 | 046 | Ensemble $\mathbb{Q}$ des nombres rationnels ; nombres irrationnels, exemples fournis par la géométrie comme $\sqrt{2}$ et $\pi$   | conn. | `Ensembles` Ensembles de nombres > nombres irrationnels                     |
| 2-249 | 047 | Lire l'abscisse d'un nombre réel sur une droite graduée                                                                            | s-f   | `Ensembles` Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ                            |
| 2-250 | 048 | Placer un nombre réel d'abscisse donnée sur une droite graduée                                                                     | s-f   | `Ensembles` Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ                            |
| 2-251 | 049 | Représenter un intervalle de la droite numérique                                                                                   | s-f   | `Ensembles` Ensembles de nombres > intervalles                              |
| 2-252 | 050 | Déterminer si un nombre réel appartient à un intervalle donné                                                                      | s-f   | `Ensembles` Ensembles de nombres > intervalles                              |
| 2-253 | 051 | Donner un encadrement, d'amplitude donnée, d'un nombre réel par des décimaux                                                       | s-f   | `Nombres et calculs` Décimaux : numération > encadrer                       |
| 2-254 | 052 | Dans le cadre de la résolution de problèmes, arrondir en donnant le nombre de chiffres significatifs adapté à la situation étudiée | s-f   | `Nombres et calculs` Décimaux : numération > arrondis et ordres de grandeur |
| 2-255 | 053 | Le nombre rationnel $\tfrac{1}{3}$ n'est pas décimal                                                                               | dém.  | `Ensembles` Ensembles de nombres > nombres irrationnels                     |
| 2-256 | 054 | Le nombre réel $\sqrt{2}$ est irrationnel                                                                                          | dém.  | `Ensembles` Ensembles de nombres > nombres irrationnels                     |
| 2-257 | 055 | Déterminer par balayage un encadrement de $\sqrt{2}$ d'amplitude inférieure ou égale à $10^{-n}$                                   | algo. | `Algorithmique` Boucles > boucle bornée _(discutable 2)_                    |
| 2-258 | 056 | Développement décimal illimité d'un nombre réel                                                                                    | s-f ⁺ | `Ensembles` Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ                            |
| 2-259 | 057 | Observation, sur des exemples, de la périodicité du développement décimal de nombres rationnels                                    | s-f ⁺ | `Ensembles` Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ                            |

### … > Algèbre (branches `Algèbre` / `Nombres et calculs`)

| Code  | ex-    | Énoncé                                                                                                                                                         | kind  | nœud                                                        |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------- |
| 2-260 | 058    | Règles de calcul sur les puissances entières relatives                                                                                                         | conn. | `Nombres et calculs` Puissances : calculs (notion)          |
| 2-261 | 059    | Règles de calcul sur les racines carrées ; relation $\sqrt{a^2} = \|a\|$                                                                                       | conn. | `Nombres et calculs` Racines carrées : calculs > propriétés |
| 2-262 | 060    | Exemples simples de calcul sur des expressions algébriques, en particulier sur des expressions fractionnaires                                                  | conn. | Calcul littéral > expressions fractionnaires                |
| 2-263 | 061    | Somme d'inégalités ; produit d'une inégalité par un réel positif, négatif, en liaison avec le sens de variation d'une fonction affine                          | conn. | Inégalités > règles de calcul                               |
| 2-264 | 062    | Comparaison additive (par différence), comparaison multiplicative (par rapport, pour deux nombres strictement positifs)                                        | conn. | Inégalités > comparer et encadrer                           |
| 2-265 | ✂063a | Ensemble des solutions des équations du type $ax + b = 0$                                                                                                      | conn. | Équations : premier degré > ax + b = c                      |
| 2-266 | ✂063b | Ensemble des solutions des inéquations de la forme $ax + b > 0$                                                                                                | conn. | Inéquations : premier degré > ax + b < c                    |
| 2-267 | 064    | Équation de la forme $A(x)B(x) = 0$ (équation produit nul)                                                                                                     | conn. | Équations : produit et quotient > produit nul               |
| 2-268 | 065    | En liaison avec la section « Fonctions », étude du signe des expressions de la forme $A(x)B(x)$ et $\tfrac{A(x)}{B(x)}$                                        | conn. | Inéquations : produit et quotient > tableau de signes       |
| 2-269 | 066    | Équation $\tfrac{A(x)}{B(x)} = k$ (équation quotient), en lien avec l'ensemble de définition d'une expression                                                  | conn. | Équations : produit et quotient > équation quotient         |
| 2-270 | ✂067a | Effectuer des calculs numériques ou littéraux mettant en jeu des puissances                                                                                    | s-f   | `Nombres et calculs` Puissances : calculs (notion)          |
| 2-271 | ✂067b | Effectuer des calculs numériques ou littéraux mettant en jeu des racines carrées                                                                               | s-f   | `Nombres et calculs` Racines carrées : calculs > calculer   |
| 2-272 | ✂067c | Effectuer des calculs numériques ou littéraux mettant en jeu des écritures fractionnaires                                                                      | s-f   | Calcul littéral > expressions fractionnaires                |
| 2-273 | 068    | Sur des cas simples de relations entre variables ($U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres | s-f   | Calcul littéral > isoler une variable                       |
| 2-274 | 069    | Exprimer une variable en fonction de l'autre dans une relation du premier degré $ax + by = c$                                                                  | s-f   | Calcul littéral > isoler une variable                       |
| 2-275 | 070    | Choisir la forme la plus adaptée (factorisée, développée réduite) d'une expression en vue de la résolution d'un problème                                       | s-f   | Calcul littéral (notion)                                    |
| 2-276 | 071    | Comparer deux quantités en utilisant leur différence, ou leur rapport (ratio) dans le cas de quantités positives                                               | s-f   | Inégalités > comparer et encadrer                           |
| 2-277 | 072    | Interpréter, selon le contexte, cette comparaison en termes de variation additive ou multiplicative                                                            | s-f   | Inégalités > comparer et encadrer                           |
| 2-278 | 073    | Modéliser un problème par une inéquation                                                                                                                       | s-f   | Inéquations : premier degré > mettre en inéquation          |
| 2-279 | 074    | Donner l'ensemble des solutions d'une équation du premier degré du type $ax = b$, $a + x = b$, $ax + b = cx + d$                                               | s-f   | Équations : premier degré (notion — formes = level)         |
| 2-280 | 075    | Donner l'ensemble des solutions d'une inéquation du premier degré du type $ax \geqslant b$, $a + x \geqslant b$, $ax + b \geqslant cx + d$                     | s-f   | Inéquations : premier degré (notion — formes = level)       |
| 2-281 | 076    | Donner l'ensemble des solutions d'une équation du type $x^2 = a$                                                                                               | s-f   | Équations : produit et quotient > x² = a                    |
| 2-282 | 077    | Quels que soient les réels positifs $a$ et $b$, on a $\sqrt{ab} = \sqrt{a}\,\sqrt{b}$                                                                          | dém.  | `Nombres et calculs` Racines carrées : calculs > propriétés |
| 2-283 | 078    | Déterminer la première puissance d'un nombre positif donné supérieure ou inférieure à une valeur donnée                                                        | algo. | `Algorithmique` Boucles > boucle non bornée                 |
| 2-284 | 079    | Développement de $(a + b + c)^2$                                                                                                                               | s-f ⁺ | Calcul littéral > identités remarquables                    |
| 2-285 | 080    | Développement de $(a + b)^3$                                                                                                                                   | s-f ⁺ | Calcul littéral > identités remarquables                    |
| 2-286 | 081    | Inégalité entre moyennes géométrique et arithmétique de deux réels strictement positifs                                                                        | s-f ⁺ | Inégalités (notion)                                         |

### Géométrie > Vecteurs et problèmes de géométrie (branche `Géométrie`)

| Code  | ex- | Énoncé                                                                                                                       | kind  | nœud                                                       |
| ----- | --- | ---------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| 2-287 | 082 | Égalité de deux vecteurs ; notation $\vec{u}$ ; vecteur nul                                                                  | conn. | Vecteurs : sans coordonnées > égalité de vecteurs          |
| 2-288 | 083 | Représentants d'un vecteur                                                                                                   | conn. | Vecteurs : sans coordonnées > égalité de vecteurs          |
| 2-289 | 084 | Produit d'un vecteur par un nombre réel                                                                                      | conn. | Vecteurs : sans coordonnées > produit par un réel          |
| 2-290 | 085 | Colinéarité de deux vecteurs                                                                                                 | conn. | Vecteurs : sans coordonnées > colinéarité                  |
| 2-291 | 086 | Représentation d'un vecteur comme combinaison de deux vecteurs non colinéaires                                               | conn. | Vecteurs : sans coordonnées > combinaison linéaire         |
| 2-292 | 087 | Base orthonormée ; coordonnées d'un vecteur                                                                                  | conn. | Vecteurs : avec coordonnées > coordonnées d'un vecteur     |
| 2-293 | 088 | Expression de la norme d'un vecteur                                                                                          | conn. | Vecteurs : avec coordonnées > norme                        |
| 2-294 | 089 | Expression des coordonnées de $\vec{AB}$ en fonction de celles de $A$ et de $B$                                              | conn. | Vecteurs : avec coordonnées > coordonnées d'un vecteur     |
| 2-295 | 090 | Déterminant de deux vecteurs dans une base orthonormée, critère de colinéarité ; application à l'alignement, au parallélisme | conn. | Vecteurs : avec coordonnées > colinéarité et déterminant   |
| 2-296 | 091 | Caractérisation vectorielle du milieu d'un segment                                                                           | conn. | Vecteurs : sans coordonnées (notion) _(discutable 3)_      |
| 2-297 | 092 | Représenter la somme de deux vecteurs à partir de représentants de même origine                                              | s-f   | Vecteurs : sans coordonnées > somme et relation de Chasles |
| 2-298 | 093 | Représenter un vecteur dont on connait les coordonnées                                                                       | s-f   | Vecteurs : avec coordonnées > coordonnées d'un vecteur     |
| 2-299 | 094 | Lire les coordonnées d'un vecteur                                                                                            | s-f   | Vecteurs : avec coordonnées > coordonnées d'un vecteur     |
| 2-300 | 095 | Calculer les coordonnées d'une somme de vecteurs, d'un produit d'un vecteur par un nombre réel                               | s-f   | Vecteurs : avec coordonnées > somme et produit par un réel |
| 2-301 | 096 | Calculer la distance entre deux points                                                                                       | s-f   | Géométrie repérée > milieu et distance                     |
| 2-302 | 097 | Calculer les coordonnées du milieu d'un segment                                                                              | s-f   | Géométrie repérée > milieu et distance                     |
| 2-303 | 098 | Caractériser alignement et parallélisme par la colinéarité de vecteurs                                                       | s-f   | Vecteurs : avec coordonnées > colinéarité et déterminant   |
| 2-304 | 101 | Caractérisations de la colinéarité de deux vecteurs non nuls : nullité du déterminant ; proportionnalité des coordonnées     | dém.  | Vecteurs : avec coordonnées > colinéarité et déterminant   |
| 2-305 | 102 | Barycentre de deux ou trois points                                                                                           | s-f ⁺ | Vecteurs : sans coordonnées (notion)                       |
| 2-306 | 103 | Formule permettant le calcul des coordonnées du milieu d'un segment                                                          | s-f ⁺ | Géométrie repérée > milieu et distance                     |
| 2-307 | 104 | Démontrer que les hauteurs d'un triangle sont concourantes                                                                   | s-f ⁺ | Géométrie repérée (notion)                                 |
| 2-308 | 105 | Expression de l'aire d'un triangle : $\tfrac{1}{2}ab\sin C$                                                                  | s-f ⁺ | `Grandeurs et mesures` Aires > triangle quelconque         |
| 2-309 | 106 | Démontrer que l'isobarycentre de trois points non alignés est l'intersection des médianes                                    | s-f ⁺ | Vecteurs : sans coordonnées (notion)                       |
| 2-310 | 107 | Démontrer que le point de concours des médiatrices est le centre du cercle circonscrit                                       | s-f ⁺ | Géométrie repérée (notion)                                 |

### … > Droites du plan

| Code  | ex- | Énoncé                                                                                                                   | kind  | nœud                                                                          |
| ----- | --- | ------------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------- |
| 2-311 | 108 | Vecteur directeur d'une droite                                                                                           | conn. | Géométrie repérée > vecteur directeur                                         |
| 2-312 | 109 | Équation de droite : équation cartésienne, équation réduite                                                              | conn. | Géométrie repérée > équations de droites                                      |
| 2-313 | 110 | Pente (ou coefficient directeur) d'une droite non parallèle à l'axe des ordonnées                                        | conn. | `Fonctions` Fonctions affines > coefficient directeur et ordonnée à l'origine |
| 2-314 | 111 | Déterminer une équation de droite à partir de deux points, d'un point et un vecteur directeur, ou d'un point et la pente | s-f   | Géométrie repérée > équations de droites                                      |
| 2-315 | 112 | Déterminer la pente ou un vecteur directeur d'une droite donnée par une équation ou une représentation graphique         | s-f   | Géométrie repérée > vecteur directeur                                         |
| 2-316 | 113 | Tracer une droite connaissant son équation cartésienne ou réduite                                                        | s-f   | Géométrie repérée > équations de droites                                      |
| 2-317 | 114 | Établir que trois points sont alignés ou non                                                                             | s-f   | Vecteurs : avec coordonnées > colinéarité et déterminant                      |
| 2-318 | 115 | Déterminer si deux droites sont parallèles ou sécantes                                                                   | s-f   | Géométrie repérée > intersection de deux droites                              |
| 2-319 | 116 | Déterminer le point d'intersection de deux droites sécantes données par leur équation réduite                            | s-f   | Géométrie repérée > intersection de deux droites                              |
| 2-320 | 117 | En utilisant le déterminant, établir la forme générale d'une équation de droite                                          | dém.  | Géométrie repérée > équations de droites                                      |
| 2-321 | 118 | Étudier l'alignement de trois points dans le plan                                                                        | algo. | Vecteurs : avec coordonnées > colinéarité et déterminant                      |
| 2-322 | 119 | Déterminer une équation de droite passant par deux points donnés                                                         | algo. | Géométrie repérée > équations de droites                                      |
| 2-323 | 120 | Ensemble des points équidistants d'un point et de l'axe des abscisses                                                    | s-f ⁺ | Géométrie repérée (notion)                                                    |
| 2-324 | 121 | Représentation, sur des exemples, de parties du plan décrites par des inégalités sur les coordonnées                     | s-f ⁺ | Géométrie repérée (notion)                                                    |

### Fonctions > Représentation algébrique et graphique des fonctions (branche `Fonctions`)

| Code  | ex-    | Énoncé                                                                                                                                                | kind  | nœud                                                               |
| ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| 2-325 | 122    | Fonction à valeurs réelles définie sur un intervalle ou une réunion finie d'intervalles de $\mathbb{R}$                                               | conn. | Généralités sur les fonctions (notion)                             |
| 2-326 | 123    | Recherche de domaine d'étude (ensemble de définition)                                                                                                 | conn. | Généralités sur les fonctions > ensemble de définition             |
| 2-327 | 124    | Courbe représentative : la courbe d'équation $y = f(x)$ est l'ensemble des points du plan dont les coordonnées $(x\,;\,y)$ vérifient $y = f(x)$       | conn. | Généralités sur les fonctions > appartenance à une courbe          |
| 2-328 | ✂125a | Signe d'une fonction affine                                                                                                                           | conn. | Fonctions affines > variations et signe                            |
| 2-329 | ✂125b | Signe des fonctions de référence                                                                                                                      | conn. | Généralités sur les fonctions > signe                              |
| 2-330 | 126    | Tableau de signes pour une fonction produit ou quotient                                                                                               | conn. | `Algèbre` Inéquations : produit et quotient > tableau de signes    |
| 2-331 | 127    | Exploiter l'équation $y = f(x)$ d'une courbe : appartenance, calcul de coordonnées                                                                    | s-f   | Généralités sur les fonctions > appartenance à une courbe          |
| 2-332 | 128    | Modéliser par des fonctions des situations issues des mathématiques, des autres disciplines ou de la vie courante ou citoyenne                        | s-f   | Généralités sur les fonctions (notion)                             |
| 2-333 | ✂129a | Fonction valeur absolue : définition et courbe représentative                                                                                         | s-f   | Fonction valeur absolue (notion — définition et distance + courbe) |
| 2-334 | ✂129b | Fonction carré : définition et courbe représentative                                                                                                  | s-f   | Fonction carré > définition et courbe                              |
| 2-335 | ✂129c | Fonction inverse : définition et courbe représentative                                                                                                | s-f   | Fonction inverse > définition et courbe                            |
| 2-336 | 130    | Résoudre une équation ou une inéquation du type $f(x) = k$, $f(x) < k$, en choisissant une méthode adaptée : graphique, algébrique, logicielle        | s-f   | Généralités sur les fonctions > résolution graphique               |
| 2-337 | 131    | Résoudre une équation ou une inéquation de la forme $f(x) = 0$, $f(x) > 0$ à l'aide d'un tableau de signes, lorsque $f$ est un produit ou un quotient | s-f   | `Algèbre` Inéquations : produit et quotient > tableau de signes    |
| 2-338 | 132    | Résoudre, graphiquement ou à l'aide d'un outil numérique, une équation ou inéquation du type $f(x) = g(x)$, $f(x) < g(x)$                             | s-f   | Généralités sur les fonctions > résolution graphique               |
| 2-339 | ✂133a | Fonction affine : résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$                              | s-f   | Fonctions affines > équations                                      |
| 2-340 | ✂133b | Fonction valeur absolue : résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$                      | s-f   | Fonction valeur absolue > équations et inéquations                 |
| 2-341 | ✂133c | Fonction carré : résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$                               | s-f   | Fonction carré > x² = k, x² < k                                    |
| 2-342 | ✂133d | Fonction inverse : résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$                             | s-f   | Fonction inverse > 1/x = k, 1/x < k                                |
| 2-343 | ✂133e | Fonction racine carrée : résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$                       | s-f   | Fonction racine carrée > √x = k, √x < k                            |
| 2-344 | ✂133f | Fonction cube : résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$                                | s-f   | Fonction cube > x³ = k, x³ < k                                     |

### … > Variations et extrémums d'une fonction

| Code  | ex-    | Énoncé                                                                                                                                                        | kind  | nœud                                                              |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| 2-345 | 134    | Croissance, décroissance, monotonie d'une fonction définie sur un intervalle ; tableau de variations                                                          | conn. | Généralités sur les fonctions > variations                        |
| 2-346 | 135    | Maximum, minimum d'une fonction sur un intervalle                                                                                                             | conn. | Généralités sur les fonctions > extremums                         |
| 2-347 | 136    | Pour une fonction affine donnée par $f(x) = mx + p$, interprétation de $m$ comme taux d'accroissement et de $p$ comme ordonnée à l'origine                    | conn. | Fonctions affines > coefficient directeur et ordonnée à l'origine |
| 2-348 | 137    | Variations d'une fonction affine selon le signe du coefficient directeur                                                                                      | conn. | Fonctions affines > variations et signe                           |
| 2-349 | 138    | Relier représentation graphique et tableau de variations                                                                                                      | s-f   | Généralités sur les fonctions > variations                        |
| 2-350 | 139    | Déterminer graphiquement les extrémums d'une fonction sur un intervalle                                                                                       | s-f   | Généralités sur les fonctions > extremums                         |
| 2-351 | 140    | Exploiter un logiciel de géométrie dynamique ou de calcul formel, la calculatrice ou Python pour décrire les variations d'une fonction donnée par une formule | s-f   | Généralités sur les fonctions > variations                        |
| 2-352 | 141    | Pour une fonction affine, relier sens de variation, signe de la fonction et droite représentative                                                             | s-f   | Fonctions affines > variations et signe                           |
| 2-353 | 142    | Traiter des problèmes d'optimisation                                                                                                                          | s-f   | Généralités sur les fonctions > extremums                         |
| 2-354 | ✂143a | Fonction valeur absolue : signe et variations                                                                                                                 | s-f   | Fonction valeur absolue > variations                              |
| 2-355 | ✂143b | Fonction carré : signe et variations                                                                                                                          | s-f   | Fonction carré > variations                                       |
| 2-356 | 144    | Pour deux nombres $a$ et $b$ donnés et une fonction de référence $f$, comparer $f(a)$ et $f(b)$ numériquement ou graphiquement                                | s-f   | Généralités sur les fonctions > variations _(discutable 4)_       |
| 2-357 | 145    | Variations des fonctions affines                                                                                                                              | dém.  | Fonctions affines > variations et signe                           |
| 2-358 | 146    | Position relative des courbes d'équation $y = x$ et $y = x^2$, pour $x \geqslant 0$                                                                           | dém.  | Fonction carré > définition et courbe                             |
| 2-359 | ✂147a | Variations de la fonction carré                                                                                                                               | dém.  | Fonction carré > variations                                       |
| 2-360 | ✂147b | Variations de la fonction inverse                                                                                                                             | dém.  | Fonction inverse > variations                                     |
| 2-361 | 148    | Pour une fonction dont le tableau de variations est donné, algorithmes d'approximation numérique d'un extrémum (balayage, dichotomie)                         | algo. | Généralités sur les fonctions > extremums                         |
| 2-362 | 149    | Algorithme de calcul approché de longueur d'une portion de courbe représentative de fonction                                                                  | algo. | Généralités sur les fonctions (notion)                            |
| 2-363 | 150    | Relier les courbes représentatives de la fonction racine carrée et de la fonction carré sur $\mathbb{R}^+$                                                    | s-f ⁺ | Fonction racine carrée > définition et courbe                     |

### Statistiques et probabilités > Information chiffrée et statistique descriptive (branches `Proportionnalité` / `Statistiques`)

| Code  | ex- | Énoncé                                                                                                                                                                                                             | kind  | nœud                                                                                 |
| ----- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------ |
| 2-364 | 151 | Ensembles de référence inclus les uns dans les autres : pourcentage de pourcentage                                                                                                                                 | conn. | `Proportionnalité` Pourcentages > calculer                                           |
| 2-365 | 152 | Évolution : variation absolue (variation additive) $V_2 - V_1$                                                                                                                                                     | conn. | `Proportionnalité` Évolutions > variations en pourcentage                            |
| 2-366 | 153 | Évolution : coefficient multiplicateur (variation multiplicative) $\tfrac{V_2}{V_1}$                                                                                                                               | conn. | `Proportionnalité` Évolutions > variations en pourcentage                            |
| 2-367 | 154 | Évolution : variation relative (taux d'évolution) $\tfrac{V_2 - V_1}{V_1}$                                                                                                                                         | conn. | `Proportionnalité` Évolutions > variations en pourcentage                            |
| 2-368 | 155 | Évolutions successives, évolution réciproque : relation sur les coefficients multiplicateurs (produit, inverse)                                                                                                    | conn. | `Proportionnalité` Évolutions > évolutions successives et réciproque                 |
| 2-369 | 156 | Linéarité de la moyenne                                                                                                                                                                                            | conn. | `Statistiques` Indicateurs > moyenne                                                 |
| 2-370 | 157 | Indicateurs de dispersion : écart type                                                                                                                                                                             | conn. | `Statistiques` Indicateurs > écart-type                                              |
| 2-371 | 158 | Influence sur la moyenne, la médiane, de l'ajout ou de la suppression d'une valeur dans la série                                                                                                                   | conn. | `Statistiques` Indicateurs (notion)                                                  |
| 2-372 | 159 | Représentation graphique : histogramme, polygone des fréquences cumulées                                                                                                                                           | conn. | `Statistiques` Représenter des données (notion — histogrammes + fréquences cumulées) |
| 2-373 | 160 | Calcul de la moyenne à partir de la moyenne et des effectifs de chaque classe (moyenne pondérée) ; cas particulier où la répartition est uniforme dans chaque classe                                               | conn. | `Statistiques` Indicateurs > moyenne                                                 |
| 2-374 | 161 | Détermination de la classe médiane à partir des effectifs des classes ; estimation de la médiane dans le cas de répartition uniforme dans la classe médiane                                                        | conn. | `Statistiques` Indicateurs > médiane                                                 |
| 2-375 | 162 | Exploiter la relation entre effectifs, proportions et pourcentages                                                                                                                                                 | s-f   | `Statistiques` Représenter des données > effectifs et fréquences                     |
| 2-376 | 163 | Traiter des situations simples mettant en jeu des pourcentages de pourcentages                                                                                                                                     | s-f   | `Proportionnalité` Pourcentages > calculer                                           |
| 2-377 | 164 | Exploiter la relation entre deux valeurs successives et leur taux d'évolution                                                                                                                                      | s-f   | `Proportionnalité` Évolutions > variations en pourcentage                            |
| 2-378 | 165 | Calculer le taux d'évolution global à partir des taux d'évolution successifs                                                                                                                                       | s-f   | `Proportionnalité` Évolutions > évolutions successives et réciproque                 |
| 2-379 | 166 | Calculer un taux d'évolution réciproque                                                                                                                                                                            | s-f   | `Proportionnalité` Évolutions > évolutions successives et réciproque                 |
| 2-380 | 167 | Pour une série regroupée en classes, calculer la moyenne à partir de la moyenne et des effectifs de chaque classe                                                                                                  | s-f   | `Statistiques` Indicateurs > moyenne                                                 |
| 2-381 | 168 | Pour une série regroupée en classes, déterminer la classe médiane et estimer la médiane dans le cas d'une répartition uniforme                                                                                     | s-f   | `Statistiques` Indicateurs > médiane                                                 |
| 2-382 | 169 | Décrire les différences entre deux séries statistiques, en s'appuyant sur des indicateurs ou couples d'indicateurs (moyenne–écart type, médiane–écart interquartile) ou sur des représentations graphiques données | s-f   | `Statistiques` Indicateurs (notion)                                                  |

### … > Croisement de deux variables qualitatives

| Code  | ex- | Énoncé                                                                                                                                                                | kind  | nœud                                                                       |
| ----- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------- |
| 2-383 | 170 | Tableau croisé d'effectifs                                                                                                                                            | conn. | `Statistiques` Tableaux croisés > tableau croisé d'effectifs               |
| 2-384 | 171 | Fréquence conditionnelle, fréquence marginale                                                                                                                         | conn. | `Statistiques` Tableaux croisés > fréquences marginales et conditionnelles |
| 2-385 | 172 | Calculer des fréquences conditionnelles et des fréquences marginales                                                                                                  | s-f   | `Statistiques` Tableaux croisés > fréquences marginales et conditionnelles |
| 2-386 | 173 | Compléter un tableau croisé par des raisonnements sur les effectifs ou en utilisant des fréquences conditionnelles                                                    | s-f   | `Statistiques` Tableaux croisés > tableau croisé d'effectifs               |
| 2-387 | 174 | À partir de deux listes représentant deux caractères d'individus, déterminer un sous-ensemble d'individus répondant à un critère (filtre, utilisation de ET, OU, NON) | algo. | `Statistiques` Tableaux croisés (notion)                                   |
| 2-388 | 175 | Dresser le tableau croisé de deux variables qualitatives à partir du fichier des individus et calculer des fréquences conditionnelles ou marginales                   | algo. | `Statistiques` Tableaux croisés > tableau croisé d'effectifs               |

### … > Probabilités

| Code  | ex-    | Énoncé                                                                                                                                        | kind  | nœud                                                                       |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------- |
| 2-389 | 176    | Version vulgarisée de la loi des grands nombres : lorsque $n$ est grand, sauf exception, la fréquence observée est proche de la probabilité   | conn. | `Statistiques` Échantillonnage > fluctuation                               |
| 2-390 | 177    | Probabilité conditionnelle d'un évènement $B$ sachant un évènement $A$ de probabilité non nulle ; notation $P_A(B)$                           | conn. | `Probabilités` Probabilités conditionnelles (notion)                       |
| 2-391 | 178    | Arbres de probabilité, application au calcul de probabilités                                                                                  | conn. | `Probabilités` Probabilités conditionnelles > arbres pondérés              |
| 2-392 | 179    | Observer la loi des grands nombres à l'aide d'une simulation sur Python ou tableur                                                            | s-f   | `Statistiques` Échantillonnage > simulation                                |
| 2-393 | ✂180a | Construire un arbre pondéré en lien avec une situation donnée                                                                                 | s-f   | `Probabilités` Probabilités conditionnelles > arbres pondérés              |
| 2-394 | ✂180b | Construire un tableau en lien avec une situation donnée                                                                                       | s-f   | `Probabilités` Probabilités conditionnelles > tableaux croisés             |
| 2-395 | 181    | Passer du registre de la langue naturelle au registre symbolique et inversement                                                               | s-f   | `Probabilités` Probabilités conditionnelles (notion)                       |
| 2-396 | ✂182a | Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme de tableau croisé d'effectifs                      | s-f   | `Probabilités` Probabilités conditionnelles > tableaux croisés             |
| 2-397 | ✂182b | Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme d'arbre de probabilité                             | s-f   | `Probabilités` Probabilités conditionnelles > arbres pondérés              |
| 2-398 | 183    | Interpréter les pondérations de chaque branche d'un arbre en termes de probabilités, et notamment de probabilités conditionnelles             | s-f   | `Probabilités` Probabilités conditionnelles > arbres pondérés              |
| 2-399 | 184    | Faire le lien entre la définition des probabilités conditionnelles et la multiplication des probabilités des branches du chemin correspondant | s-f   | `Probabilités` Probabilités conditionnelles > arbres pondérés              |
| 2-400 | 185    | Distinguer en situation $P_A(B)$ et $P_B(A)$, par exemple dans des situations de type « faux positifs »                                       | s-f   | `Probabilités` Probabilités conditionnelles > inversion du conditionnement |

---

## Les références d'automatismes (`curriculum_point_automatismes`, grade `2`)

La partie « Automatismes » du BO (travaillée « dans les classes antérieures ») →
références vers le point le plus récent du parcours. ⚠️ Nouveauté 2de : certaines
lignes portent sur du contenu INTRODUIT en 2de → **auto-références** (C13, comme
l'indice de base 100 en Tle techno). Les cibles 2-2xx/2-3xx sont les nouveaux points
ci-dessus.

| Ligne d'Automatismes de la 2de (résumé fidèle)                                                                                       | Cible(s)                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Comparer deux nombres (différence ; quotient si strictement positifs)                                                                | 2-276 · 2-277 (auto-réf)                                                          |
| Opérations et comparaisons entre fractions simples                                                                                   | 4-013 · 5-025                                                                     |
| Opérations sur les puissances                                                                                                        | 3-005                                                                             |
| Passer d'une écriture d'un nombre à une autre (décimale, fractionnaire, pourcentage)                                                 | 6-106                                                                             |
| Estimer un ordre de grandeur                                                                                                         | 6-119                                                                             |
| Conversions d'unités : longueurs, aires, volumes, contenances, durées, vitesses, masses                                              | CM1-068 · 6-150 · 5-051 · CE2-052 · 6-159 · 4-052 · CE2-047                       |
| Calcul littéral élémentaire (expressions additives −(a+b) ; multiplicatives 1×x, ab/c…)                                              | 3-011 · 5-039 · 4-013                                                             |
| Développer, factoriser, réduire (identités (a±b)², (a+b)(a−b) ; factorisations ax²+bx, ax+bx)                                        | 3-016 · 4-022 · 5-039                                                             |
| Résoudre x² = a, ax + b = cx + d, a/x = b, une inéquation du premier degré                                                           | 3-008 · 4-025 · 3-014 · 2-269 (auto-réf)                                          |
| Isoler une variable dans une égalité qui en comporte plusieurs                                                                       | 2-273 · 2-274 (auto-réf)                                                          |
| Effectuer une application numérique d'une formule                                                                                    | 5-035                                                                             |
| Calculer, appliquer, exprimer une proportion sous différentes formes                                                                 | 6-140 · 4-056                                                                     |
| Utiliser une proportion pour calculer une partie connaissant le tout, ou l'inverse                                                   | 6-141                                                                             |
| Passer d'une formulation additive (« augmenter de 5 % ») à une formulation multiplicative                                            | 4-057                                                                             |
| Déterminer graphiquement des images et des antécédents                                                                               | 3-040                                                                             |
| Exploiter une équation de courbe (appartenance, calcul de coordonnées)                                                               | 2-331 (auto-réf)                                                                  |
| Reconnaitre l'expression d'une fonction linéaire, affine ; leur représentation est une droite                                        | 3-041 · 3-044                                                                     |
| Sur une droite graduée, repérer ou placer un point d'abscisse un relatif                                                             | 5-016                                                                             |
| Dans un repère orthogonal, lire ou placer les coordonnées d'un point                                                                 | 5-047                                                                             |
| Calculer périmètres (polygone, cercle), aires (rectangle, triangle, disque), volumes (pavé, prisme, cylindre, pyramide, cône, boule) | 6-144 · 6-147 · 6-152 · 5-061 · 5-052 · 5-050 · 5-053 · 4-029 · 3-021             |
| Application simple des théorèmes de Pythagore et de Thalès                                                                           | 4-034 · 3-022                                                                     |
| Lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente                                                        | 3-023                                                                             |
| Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage)                                                          | 5-077 · 5-096                                                                     |
| Calculer et interpréter moyenne, médiane, quartiles selon la présentation des données                                                | 4-039 · 4-040 · 3-029 · 2-380 · 2-381 (auto-réf : séries en classes, contenu 2de) |
| Comparer des distributions à l'aide de boites à moustaches                                                                           | 3-030                                                                             |
| Savoir qu'une probabilité est un nombre entre 0 et 1                                                                                 | 6-186                                                                             |
| Calculer la probabilité de l'évènement contraire                                                                                     | 4-048                                                                             |
| Probabilité d'un évènement comme somme des probabilités des issues                                                                   | 4-048                                                                             |
| Relation P(A) = Card(A)/Card(Ω) dans le cas de l'équiprobabilité                                                                     | 6-187                                                                             |

(« S'assurer de la vraisemblance d'un résultat » : transversal [T], pas de référence.)

---

## Rattachements discutables (hors scissions, traitées plus haut)

1. ~~Discutable~~ **TRANCHÉ (David, 2026-10-08, structure C2)** : la branche Logique
   est restructurée — notion **`Proposition mathématique`** en tête (sous-notions
   `statut des lettres et des égalités` + `et, ou, non`, récupérées de « Quantificateurs
   et négation » et de « Connecteurs et contre-exemples », cette dernière disparaissant) ;
   **`contre-exemple` rejoint `Raisonnements`**. 2-208 → la notion même, 2-209 →
   `> statut des lettres et des égalités`, 2-210 → `> et, ou, non`, 2-212 →
   `Raisonnements > contre-exemple`. Arbre version `2026-10-07.15` (comptes inchangés :
   19/137/540) ; aucun point livré ne visait la branche Logique → migration de nœuds
   sans impact sur l'existant.
2. **TRANCHÉ (David, 2026-10-08)** : le balayage de √2 (2-257) → `Boucles > boucle
bornée` (balayage à pas fixe) ; la première puissance dépassant un seuil (2-283) →
   `> boucle non bornée` (while).
3. **TRANCHÉ (David, 2026-10-08)** : « Caractérisation vectorielle du milieu »
   (2-296) → `Vecteurs : sans coordonnées` (notion) — calcul vectoriel pur ; le calcul
   en coordonnées vit dans `Géométrie repérée > milieu et distance` (2-301/302).
   ⛔ **Les puces ex-2-099 (« représentation la plus adaptée des vecteurs ») et
   ex-2-100 (« problèmes avec des méthodes diverses ») ne deviennent PAS des points** :
   trop larges pour être cochées honnêtement (« résous un problème de géométrie comme
   tu veux ») — c'est de l'évaluation par compétence, pas un point de programme.
   Vérifié en prod le 2026-10-08 : aucun exercice rattaché à 2-099/2-100, rien ne
   tombe au transfert C5.
4. **TRANCHÉ (David, 2026-10-08)** : « Comparer f(a) et f(b) pour une fonction de
   référence » (2-356) → `Généralités sur les fonctions > variations` : capacité
   générique (utiliser la monotonie), UN seul point, pas une scission par fonction.
5. **TRANCHÉ (David, 2026-10-08)** — kinds corrigés par rapport à l'ancien
   référentiel : le balayage de √2 (ex-2-055) et la première puissance (ex-2-078)
   étaient classés [D] — le BO les met en « Exemple d'algorithme » → kind `algo.` ici.

## Questions (L1-L4) — TRANCHÉES (David, 2026-10-08 : « je valide »)

- **L1** — bloc « Algorithmique et programmation » (2-218 à 2-234) : kind **`algorithme`**
  pour les 17 (cohérence verticale avec le cycle 4).
- **L2** — les 10 « Exemples d'algorithme » hors bloc (2-241, 2-242, 2-257, 2-283,
  2-321, 2-322, 2-361, 2-362, 2-387, 2-388) : kind `algorithme`, exigence **`attendu`**
  (rubrique propre du BO, distincte des Approfondissements).
- **L3** — les 14 Approfondissements possibles (⁺) : kind **savoir-faire**, exigence
  **`approfondissement`**, y compris les « Démontrer que… » (2-307, 2-309, 2-310) : le
  kind `demonstration` reste réservé aux démonstrations exigibles.
- **L4** — validation d'ensemble : 200 points, 5 discutables tranchés (dont le retrait
  d'ex-2-099/100), 58 références dont 8 auto-références, `diversite` partout.

## Après validation (plan de livraison)

1. Worktree + migration additive générée depuis ce document : (a) restructuration C2
   de la branche Logique (renommage « Connecteurs et contre-exemples » →
   « Proposition mathématique », déplacement de `statut des lettres et des égalités`
   et de `contre-exemple` — UPDATE de nœuds, node_id préservés, aucun point existant
   ne vise la branche) ; (b) 200 points (codes 2-201…2-400 explicites) + références
   (cibles par code, grade '2' — auto-références comprises, permises par C13). Bloc DO
   auto-vérifiant (comptes, kinds, 0 sans nœud, anciens 2-001…185 INTACTS, arbre
   toujours à 696 nœuds). Rollback scopé, mises en garde RGPD et inter-grades.
2. Test d'intégration : comparaison intégrale points + références en lecture anonyme,
   preuve rouge avant ; vérification que les 185 anciens points de 2de restent
   rattachés à leurs objectifs.
3. `security-auditor`, PR, CI verte, merge, `db:migrate`, vérification prod.
4. Suivent, dans l'ordre des années : 1re spé, Tle spé, Tle comp., Expertes — puis
   rangements et séquence C5 (le transfert des 63 tags de 2de utilisera la colonne
   « ex- » de ce document).
