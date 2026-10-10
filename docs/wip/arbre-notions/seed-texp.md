# Seed Maths expertes — points du programme (architecture points → nœuds)

> 2026-10-10 : nœuds mis à jour pour l'arbre .16 (nettoyage des facettes, #1002).

> **Statut : VALIDÉ INTÉGRALEMENT par David le 2026-10-08 (« je valide tout » : reprise un
> pour un, rubriques, discutables, A1 = non). Livraison en cours.** ⚠️ Soin maximal. Le
> **dernier seed** du référentiel.
> Source : « Programme d'enseignement optionnel de mathématiques expertes de terminale
> générale » (11 p., fourni par David le 2026-10-07 ; texte en vigueur reconduit), relu
> **puce par puce**. Ancien découpage (`docs/ref/programmes/terminale-exp-programme.md`,
> `TEXP-001`…`TEXP-153`, en prod, relu par David le 2026-10-04) : repris pour les libellés
> et la **traçabilité « ex- »** (il porte **173 liens de modèles sur 110 points**).
> Mapping : [programmes-ecarts-expertes.md](programmes-ecarts-expertes.md) (AA1-AA3
> tranchées le 2026-10-07). Arbre `2026-10-07.15`, **aucun changement d'arbre**. Parcours :
> `T_EXP` → `1_SPE` (l'élève suit en parallèle la Tle spé, voie distincte — C14).
> Règles déjà tranchées, appliquées sans être redemandées : critère de scission du lycée ;
> **Problèmes possibles = savoir-faire `approfondissement`** (décision David du
> 2026-10-04, comme les Approfondissements de spé) ; **Exemples d'algorithmes =
> `algorithme` `approfondissement`** (E1) ; Démonstrations (sans « possibles ») =
> `demonstration` `attendu`, comme en spé ; titres de problèmes et d'algorithmes conservés
> tels quels (V2) ; « modéliser » = compétence sauf modélisation par un objet précis.

## Attributs communs

| Attribut               | Valeur                                                                                                                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grade`                | `T_EXP`                                                                                                                                                                                                                                                                                         |
| `code`                 | **`TEXP-201` à `TEXP-353`** (code = 200 + display_order ; l'ancien seed s'arrête à `TEXP-153`)                                                                                                                                                                                                  |
| `objective_id`, `rang` | `NULL`                                                                                                                                                                                                                                                                                          |
| `rubrique`             | « thème > section » du BO pour les Nombres complexes ; **le thème seul** pour l'Arithmétique et les Graphes et matrices, que le BO ne découpe pas (les trois « objectifs » de l'ancien seed étaient une invention de lisibilité, elle n'a plus d'objet : le classement est porté par les nœuds) |
| `kind`                 | conn. / s-f / dém. / algo. (4 Exemples d'algorithmes) / s-f ⁺ (28 Problèmes possibles)                                                                                                                                                                                                          |
| `exigence`             | `attendu` ; ⁺ et algo. → `approfondissement`                                                                                                                                                                                                                                                    |
| `regime_acquisition`   | `diversite` partout                                                                                                                                                                                                                                                                             |

**153 points** : l'ancien découpage est repris **un pour un** — chaque ancien point garde
son libellé, ses liens se transfèrent sans perte. Ordre : celui du BO (dans l'Arithmétique
et les Graphes et matrices, Contenus → Capacités → Démonstrations → Exemples d'algorithmes
→ Problèmes possibles, comme le texte).

---

## ⚠️ Puces multi-parties

Examinées une par une : **aucune scission ni fusion nouvelle**. L'ancien découpage (relu
le 2026-10-04) coupait déjà chaque puce dont les parties visent des sous-notions
différentes — par exemple « déterminer le module et les arguments » (module / argument),
« utiliser les nombres complexes pour démontrer un alignement, une orthogonalité, calculer
des longueurs, des angles, déterminer des ensembles de points » (×5), « Algorithme
d'Euclide de calcul du PGCD et calcul d'un couple de Bézout » (`PGCD` / `théorèmes de
Bézout et de Gauss`), « Déterminer les diviseurs d'un entier, le PGCD de deux entiers »
(deux notions). Les puces gardées entières visent un seul nœud.

## ⚠️ Puces larges, « modéliser »

| Puce (ancien code, liens)                                                                                                                                                                                                                                                                            | Décision                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Modéliser une situation par un graphe » (118, 2) ; « Modéliser une situation par une matrice » (132, 1)                                                                                                                                                                                            | ✅ gardées : modéliser **par un objet précis**, avec une sous-notion créée pour ça (`modélisation par un graphe`, `Suites et matrices > modélisation`) et des modèles réels — à la différence de « modéliser un problème par une suite » (1re, Tle comp.), retiré parce que d'autres points portaient déjà sa part questionnable. |
| « Effectuer des calculs… en choisissant une forme adaptée, en particulier dans le cadre de la résolution de problèmes » (039, 2) ; « Dans le cadre de la résolution de problème, utiliser les nombres complexes pour… » (060-064) ; « utiliser le calcul matriciel pour… » (135, 136, 119, 147, 148) | ✅ gardées : un outil précis, un geste précis, des modèles réels (mêmes choix qu'en 1re et Tle).                                                                                                                                                                                                                                  |

## Références

**Aucune référence d'entretien** : les Expertes n'ont ni Vocabulaire, ni Algorithmique,
ni Automatismes ; aucun contenu n'y est repris mot pour mot d'une année antérieure.
Liste d'automatismes de 1re : **question A1**.

## Rattachements discutables

1. **« Détermination des racines rationnelles d'un polynôme à coefficients entiers »**
   (problème possible de l'Arithmétique, TEXP-300) → `Nombres complexes › Équations
polynomiales > racines d'un polynôme` : on cherche des racines (l'outil est
   arithmétique, l'objet est le polynôme). Alternative : `Arithmétique › Divisibilité`
   (notion).
2. **« Suite de nombres complexes définie par zₙ₊₁ = azₙ + b »** (problème possible,
   TEXP-227) → `Interprétation géométrique` (notion) : ce sont les spirales et les
   rotations qu'on étudie. Alternative : `Forme algébrique` (notion).
3. **Passer d'une forme à l'autre, utiliser Euler et Moivre pour transformer**
   (TEXP-237, 238, 240) → `Formes trigo. et exponentielle` (notion) : chaque capacité
   couvre deux sous-notions (forme trigonométrique **et** exponentielle ; Euler **et**
   Moivre). Alternative : les rattacher à la première sous-notion citée.
4. **« Distribution initiale d'une chaîne de Markov, matrice ligne π₀ »** (TEXP-330) →
   `Chaînes de Markov` (notion). Alternative : `> matrice de transition`.
5. **« Tests de primalité : notion de témoin, nombres de Carmichaël »** (TEXP-304) →
   `Congruences > petit théorème de Fermat` (les témoins sont ceux de Fermat) ;
   **« Sommes de deux carrés par les entiers de Gauss »** (TEXP-310) → `Nombres premiers`
   (notion) (quels premiers sont somme de deux carrés). Alternative pour le second :
   `PGCD, Bézout et Gauss > équations diophantiennes`.

## Questions — TOUTES TRANCHÉES (David, 2026-10-08 : « je valide tout »)

> **A1 = non** : aucune référence en Expertes (la liste de 1re est portée par la Tle spé).

- **A1 — liste d'automatismes de 1re en Expertes ?** Reco : **non** — l'élève d'Expertes
  suit en même temps la Tle spé, dont la liste (A1) contient déjà celle de 1re : la
  dupliquer en Expertes la ferait apparaître deux fois dans son suivi, sans rien apporter.
  (À l'inverse, la Tle comp. remplace la Tle spé : elle devait porter la liste.)
- **Validation d'ensemble** : les 153 points (reprise un pour un), les rubriques (thème
  seul pour Arithmétique et Graphes et matrices), les 5 discutables.

---

## Les 153 points

### Nombres complexes > Nombres complexes : point de vue algébrique (branche `Nombres complexes`)

| Code     | ex- | Énoncé                                                                          | kind  | nœud                                   |
| -------- | --- | ------------------------------------------------------------------------------- | ----- | -------------------------------------- |
| TEXP-201 | 001 | Ensemble $\mathbb{C}$ des nombres complexes. Partie réelle et partie imaginaire | conn. | Forme algébrique > calculs             |
| TEXP-202 | 002 | Opérations sur les nombres complexes                                            | conn. | Forme algébrique > calculs             |
| TEXP-203 | 003 | Conjugaison. Propriétés algébriques de la conjugaison                           | conn. | Forme algébrique > conjugaison         |
| TEXP-204 | 004 | Inverse d'un nombre complexe non nul                                            | conn. | Forme algébrique > inverse et quotient |
| TEXP-205 | 005 | Formule du binôme dans $\mathbb{C}$                                             | conn. | Forme algébrique > formule du binôme   |
| TEXP-206 | 006 | Effectuer des calculs algébriques avec des nombres complexes                    | s-f   | Forme algébrique > calculs             |
| TEXP-207 | 007 | Résoudre une équation linéaire $az = b$                                         | s-f   | Forme algébrique > équations           |
| TEXP-208 | 008 | Résoudre une équation simple faisant intervenir $z$ et $\bar{z}$                | s-f   | Forme algébrique > équations           |
| TEXP-209 | 009 | Conjugué d'un produit, d'un inverse, d'une puissance entière                    | dém.  | Forme algébrique > conjugaison         |
| TEXP-210 | 010 | Formule du binôme                                                               | dém.  | Forme algébrique > formule du binôme   |

### Nombres complexes > Nombres complexes : point de vue géométrique (branche `Nombres complexes`)

| Code     | ex- | Énoncé                                                                | kind  | nœud                                                   |
| -------- | --- | --------------------------------------------------------------------- | ----- | ------------------------------------------------------ |
| TEXP-211 | 011 | Image d'un nombre complexe. Image du conjugué                         | conn. | Interprétation géométrique > affixes et distances      |
| TEXP-212 | 012 | Affixe d'un point, d'un vecteur                                       | conn. | Interprétation géométrique > affixes et distances      |
| TEXP-213 | 013 | Module d'un nombre complexe. Interprétation géométrique               | conn. | Module et argument > module                            |
| TEXP-214 | 014 | Relation $\|z\|^2 = z\bar{z}$                                         | conn. | Module et argument > module                            |
| TEXP-215 | 015 | Module d'un produit, d'un inverse                                     | conn. | Module et argument > module                            |
| TEXP-216 | 016 | Ensemble $\mathbb{U}$ des nombres complexes de module $1$             | conn. | Interprétation géométrique > racines de l'unité        |
| TEXP-217 | 017 | Stabilité de $\mathbb{U}$ par produit et passage à l'inverse          | conn. | Interprétation géométrique > racines de l'unité        |
| TEXP-218 | 018 | Arguments d'un nombre complexe non nul. Interprétation géométrique    | conn. | Module et argument > argument                          |
| TEXP-219 | 019 | Forme trigonométrique d'un nombre complexe                            | conn. | Formes trigo. et exponentielle > forme trigonométrique |
| TEXP-220 | 020 | Déterminer le module d'un nombre complexe                             | s-f   | Module et argument > module                            |
| TEXP-221 | 021 | Déterminer les arguments d'un nombre complexe                         | s-f   | Module et argument > argument                          |
| TEXP-222 | 022 | Représenter un nombre complexe par un point                           | s-f   | Interprétation géométrique > affixes et distances      |
| TEXP-223 | 023 | Déterminer l'affixe d'un point                                        | s-f   | Interprétation géométrique > affixes et distances      |
| TEXP-224 | 024 | Formule $\|z\|^2 = z\bar{z}$                                          | dém.  | Module et argument > module                            |
| TEXP-225 | 025 | Module d'un produit                                                   | dém.  | Module et argument > module                            |
| TEXP-226 | 026 | Module d'une puissance                                                | dém.  | Module et argument > module                            |
| TEXP-227 | 027 | Suite de nombres complexes définie par $z_{n+1} = az_n + b$           | s-f ⁺ | Interprétation géométrique (notion) _(discutable 2)_   |
| TEXP-228 | 028 | Inégalité triangulaire pour deux nombres complexes ; cas d'égalité    | s-f ⁺ | Module et argument > module                            |
| TEXP-229 | 029 | Étude expérimentale de l'ensemble de Mandelbrot, d'ensembles de Julia | s-f ⁺ | Interprétation géométrique (notion)                    |

### Nombres complexes > Nombres complexes et trigonométrie (branche `Nombres complexes`)

| Code     | ex- | Énoncé                                                                                                                                              | kind  | nœud                                                                   |
| -------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------- |
| TEXP-230 | 030 | Formules d'addition à partir du produit scalaire                                                                                                    | conn. | Formes trigo. et exponentielle > formules d'addition et de duplication |
| TEXP-231 | 031 | Formules de duplication à partir du produit scalaire                                                                                                | conn. | Formes trigo. et exponentielle > formules d'addition et de duplication |
| TEXP-232 | 032 | Exponentielle imaginaire, notation $e^{i\theta}$                                                                                                    | conn. | Formes trigo. et exponentielle > forme exponentielle                   |
| TEXP-233 | 033 | Relation fonctionnelle de l'exponentielle imaginaire                                                                                                | conn. | Formes trigo. et exponentielle > forme exponentielle                   |
| TEXP-234 | 034 | Forme exponentielle d'un nombre complexe                                                                                                            | conn. | Formes trigo. et exponentielle > forme exponentielle                   |
| TEXP-235 | 035 | Formules d'Euler : $\cos(\theta) = \frac{1}{2}(e^{i\theta} + e^{-i\theta})$, $\sin(\theta) = \frac{1}{2i}(e^{i\theta} - e^{-i\theta})$              | conn. | Formes trigo. et exponentielle > formules d'Euler                      |
| TEXP-236 | 036 | Formule de Moivre : $\cos(n\theta) + i\sin(n\theta) = (\cos(\theta) + i\sin(\theta))^n$                                                             | conn. | Formes trigo. et exponentielle > formule de Moivre                     |
| TEXP-237 | 037 | Passer de la forme algébrique d'un nombre complexe à sa forme trigonométrique ou exponentielle                                                      | s-f   | Formes trigo. et exponentielle (notion) _(discutable 3)_               |
| TEXP-238 | 038 | Passer de la forme trigonométrique ou exponentielle d'un nombre complexe à sa forme algébrique                                                      | s-f   | Formes trigo. et exponentielle (notion) _(discutable 3)_               |
| TEXP-239 | 039 | Effectuer des calculs sur des nombres complexes en choisissant une forme adaptée, en particulier dans le cadre de la résolution de problèmes        | s-f   | Formes trigo. et exponentielle (notion)                                |
| TEXP-240 | 040 | Utiliser les formules d'Euler et de Moivre pour transformer des expressions trigonométriques, dans des contextes divers (intégration, suites, etc.) | s-f   | Formes trigo. et exponentielle (notion) _(discutable 3)_               |
| TEXP-241 | 041 | Utiliser les formules d'Euler et de Moivre pour calculer des puissances de nombres complexes                                                        | s-f   | Formes trigo. et exponentielle > formule de Moivre                     |
| TEXP-242 | 042 | Démonstration d'une des formules d'addition                                                                                                         | dém.  | Formes trigo. et exponentielle > formules d'addition et de duplication |

### Nombres complexes > Équations polynomiales (branche `Nombres complexes`)

| Code     | ex- | Énoncé                                                                                  | kind  | nœud                                              |
| -------- | --- | --------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| TEXP-243 | 043 | Solutions complexes d'une équation du second degré à coefficients réels                 | conn. | Équations polynomiales > second degré             |
| TEXP-244 | 044 | Factorisation de $z^n - a^n$ par $z - a$                                                | conn. | Équations polynomiales > degré 3 et factorisation |
| TEXP-245 | 045 | Si $P$ est un polynôme et $P(a) = 0$, factorisation de $P$ par $z - a$                  | conn. | Équations polynomiales > degré 3 et factorisation |
| TEXP-246 | 046 | Un polynôme de degré $n$ admet au plus $n$ racines                                      | conn. | Équations polynomiales > racines d'un polynôme    |
| TEXP-247 | 047 | Résoudre une équation polynomiale de degré $2$ à coefficients réels                     | s-f   | Équations polynomiales > second degré             |
| TEXP-248 | 048 | Résoudre une équation de degré $3$ à coefficients réels dont une racine est connue      | s-f   | Équations polynomiales > degré 3 et factorisation |
| TEXP-249 | 049 | Factoriser un polynôme dont une racine est connue                                       | s-f   | Équations polynomiales > degré 3 et factorisation |
| TEXP-250 | 050 | Factorisation de $z^n - a^n$ par $z - a$ (démonstration)                                | dém.  | Équations polynomiales > degré 3 et factorisation |
| TEXP-251 | 051 | Factorisation de $P(z)$ par $z - a$ si $P(a) = 0$                                       | dém.  | Équations polynomiales > degré 3 et factorisation |
| TEXP-252 | 052 | Le nombre de solutions d'une équation polynomiale est inférieur ou égal à son degré     | dém.  | Équations polynomiales > racines d'un polynôme    |
| TEXP-253 | 053 | Racines carrées d'un nombre complexe, équation du second degré à coefficients complexes | s-f ⁺ | Équations polynomiales > second degré             |
| TEXP-254 | 054 | Formules de Viète                                                                       | s-f ⁺ | Équations polynomiales > racines d'un polynôme    |
| TEXP-255 | 055 | Résolution par radicaux de l'équation de degré $3$                                      | s-f ⁺ | Équations polynomiales > degré 3 et factorisation |

### Nombres complexes > Utilisation des nombres complexes en géométrie (branche `Nombres complexes`)

| Code     | ex- | Énoncé                                                                                                             | kind  | nœud                                                     |
| -------- | --- | ------------------------------------------------------------------------------------------------------------------ | ----- | -------------------------------------------------------- |
| TEXP-256 | 056 | Interprétation géométrique du module et d'un argument de $\frac{c-a}{b-a}$                                         | conn. | Interprétation géométrique > angles et quotient          |
| TEXP-257 | 057 | Racines $n$-ièmes de l'unité. Description de l'ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l'unité            | conn. | Interprétation géométrique > racines de l'unité          |
| TEXP-258 | 058 | Représentation géométrique de l'ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l'unité                           | conn. | Interprétation géométrique > racines de l'unité          |
| TEXP-259 | 059 | Racines $n$-ièmes de l'unité, cas particuliers : $n = 2, 3, 4$                                                     | conn. | Interprétation géométrique > racines de l'unité          |
| TEXP-260 | 060 | Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer un alignement            | s-f   | Interprétation géométrique > alignement et orthogonalité |
| TEXP-261 | 061 | Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer une orthogonalité        | s-f   | Interprétation géométrique > alignement et orthogonalité |
| TEXP-262 | 062 | Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des longueurs             | s-f   | Interprétation géométrique > affixes et distances        |
| TEXP-263 | 063 | Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des angles                | s-f   | Interprétation géométrique > angles et quotient          |
| TEXP-264 | 064 | Dans le cadre de la résolution de problème, utiliser les nombres complexes pour déterminer des ensembles de points | s-f   | Interprétation géométrique > ensembles de points         |
| TEXP-265 | 065 | Utiliser les racines de l'unité dans l'étude de configurations liées aux polygones réguliers                       | s-f   | Interprétation géométrique > racines de l'unité          |
| TEXP-266 | 066 | Détermination de l'ensemble $\mathbb{U}_n$                                                                         | dém.  | Interprétation géométrique > racines de l'unité          |
| TEXP-267 | 067 | Lignes trigonométriques de $\frac{2\pi}{5}$, construction du pentagone régulier à la règle et au compas            | s-f ⁺ | Interprétation géométrique > racines de l'unité          |
| TEXP-268 | 068 | Somme des racines $n$-ièmes de l'unité                                                                             | s-f ⁺ | Interprétation géométrique > racines de l'unité          |
| TEXP-269 | 069 | Racines $n$-ièmes d'un nombre complexe                                                                             | s-f ⁺ | Interprétation géométrique > racines de l'unité          |
| TEXP-270 | 070 | Transformation de Fourier discrète                                                                                 | s-f ⁺ | Interprétation géométrique > racines de l'unité          |

### Arithmétique (rubrique = le thème, sans section dans le BO ; branche `Arithmétique`)

| Code     | ex- | Énoncé                                                                               | kind  | nœud                                                                                |
| -------- | --- | ------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------- |
| TEXP-271 | 071 | Divisibilité dans $\mathbb{Z}$                                                       | conn. | Divisibilité > multiples et diviseurs                                               |
| TEXP-272 | 072 | Division euclidienne d'un élément de $\mathbb{Z}$ par un élément de $\mathbb{N}^*$   | conn. | Divisibilité > division euclidienne                                                 |
| TEXP-273 | 073 | Congruences dans $\mathbb{Z}$                                                        | conn. | Congruences > congruences                                                           |
| TEXP-274 | 074 | Compatibilité des congruences avec les opérations                                    | conn. | Congruences > congruences                                                           |
| TEXP-275 | 084 | PGCD de deux entiers                                                                 | conn. | PGCD, Bézout et Gauss > PGCD                                                        |
| TEXP-276 | 085 | Algorithme d'Euclide                                                                 | conn. | PGCD, Bézout et Gauss > PGCD                                                        |
| TEXP-277 | 086 | Couples d'entiers premiers entre eux                                                 | conn. | PGCD, Bézout et Gauss > PGCD                                                        |
| TEXP-278 | 087 | Théorème de Bézout                                                                   | conn. | PGCD, Bézout et Gauss > théorèmes de Bézout et de Gauss                             |
| TEXP-279 | 088 | Théorème de Gauss                                                                    | conn. | PGCD, Bézout et Gauss > théorèmes de Bézout et de Gauss                             |
| TEXP-280 | 099 | Nombres premiers                                                                     | conn. | Nombres premiers > primalité                                                        |
| TEXP-281 | 100 | L'ensemble des nombres premiers est infini                                           | conn. | Nombres premiers > primalité                                                        |
| TEXP-282 | 101 | Existence et unicité de la décomposition d'un entier en produit de facteurs premiers | conn. | Nombres premiers > décomposition en facteurs premiers                               |
| TEXP-283 | 102 | Petit théorème de Fermat                                                             | conn. | Congruences > petit théorème de Fermat                                              |
| TEXP-284 | 075 | Déterminer les diviseurs d'un entier                                                 | s-f   | Divisibilité > multiples et diviseurs                                               |
| TEXP-285 | 089 | Déterminer le PGCD de deux entiers                                                   | s-f   | PGCD, Bézout et Gauss > PGCD                                                        |
| TEXP-286 | 076 | Résoudre une congruence $ax \equiv b \,[n]$                                          | s-f   | Congruences > équations ax ≡ b [n]                                                  |
| TEXP-287 | 077 | Déterminer un inverse de $a$ modulo $n$ lorsque $a$ et $n$ sont premiers entre eux   | s-f   | Congruences > équations ax ≡ b [n]                                                  |
| TEXP-288 | 078 | Établir des tests de divisibilité                                                    | s-f   | Divisibilité > critères de divisibilité                                             |
| TEXP-289 | 079 | Utiliser des tests de divisibilité                                                   | s-f   | Divisibilité > critères de divisibilité                                             |
| TEXP-290 | 103 | Étudier la primalité de certains nombres                                             | s-f   | Nombres premiers > primalité                                                        |
| TEXP-291 | 080 | Étudier des problèmes de chiffrement                                                 | s-f   | Congruences > chiffrement                                                           |
| TEXP-292 | 090 | Résoudre des équations diophantiennes simples                                        | s-f   | PGCD, Bézout et Gauss > équations diophantiennes                                    |
| TEXP-293 | 091 | Écriture du PGCD de $a$ et $b$ sous la forme $ax + by$, $(x, y) \in \mathbb{Z}^2$    | dém.  | PGCD, Bézout et Gauss > théorèmes de Bézout et de Gauss                             |
| TEXP-294 | 092 | Théorème de Gauss (démonstration)                                                    | dém.  | PGCD, Bézout et Gauss > théorèmes de Bézout et de Gauss                             |
| TEXP-295 | 104 | L'ensemble des nombres premiers est infini (démonstration)                           | dém.  | Nombres premiers > primalité                                                        |
| TEXP-296 | 093 | Algorithme d'Euclide de calcul du PGCD de deux nombres                               | algo. | PGCD, Bézout et Gauss > PGCD                                                        |
| TEXP-297 | 094 | Calcul d'un couple de Bézout par l'algorithme d'Euclide                              | algo. | PGCD, Bézout et Gauss > théorèmes de Bézout et de Gauss                             |
| TEXP-298 | 105 | Crible d'Ératosthène                                                                 | algo. | Nombres premiers > primalité                                                        |
| TEXP-299 | 106 | Décomposition en facteurs premiers                                                   | algo. | Nombres premiers > décomposition en facteurs premiers                               |
| TEXP-300 | 095 | Détermination des racines rationnelles d'un polynôme à coefficients entiers          | s-f ⁺ | `Nombres complexes` Équations polynomiales > racines d'un polynôme _(discutable 1)_ |
| TEXP-301 | 096 | Lemme chinois et applications à des situations concrètes                             | s-f ⁺ | Congruences (notion)                                                                |
| TEXP-302 | 107 | Démonstrations du petit théorème de Fermat                                           | s-f ⁺ | Congruences > petit théorème de Fermat                                              |
| TEXP-303 | 081 | Problèmes de codage (codes barres, code ISBN, clé du Rib, code Insee)                | s-f ⁺ | Congruences (notion)                                                                |
| TEXP-304 | 108 | Étude de tests de primalité : notion de témoin, nombres de Carmichaël                | s-f ⁺ | Congruences > petit théorème de Fermat _(discutable 5)_                             |
| TEXP-305 | 082 | Problèmes de chiffrement (affine, Vigenère, Hill, RSA)                               | s-f ⁺ | Congruences > chiffrement                                                           |
| TEXP-306 | 109 | Recherche de nombres premiers particuliers (Mersenne, Fermat)                        | s-f ⁺ | Nombres premiers (notion)                                                           |
| TEXP-307 | 083 | Exemples simples de codes correcteurs                                                | s-f ⁺ | Congruences (notion)                                                                |
| TEXP-308 | 110 | Étude du système cryptographique RSA                                                 | s-f ⁺ | Congruences > chiffrement                                                           |
| TEXP-309 | 097 | Détermination des triplets pythagoriciens                                            | s-f ⁺ | PGCD, Bézout et Gauss > équations diophantiennes                                    |
| TEXP-310 | 111 | Étude des sommes de deux carrés par les entiers de Gauss                             | s-f ⁺ | Nombres premiers (notion) _(discutable 5)_                                          |
| TEXP-311 | 098 | Étude de l'équation de Pell-Fermat                                                   | s-f ⁺ | PGCD, Bézout et Gauss > équations diophantiennes                                    |

### Graphes et matrices (rubrique = le thème, sans section dans le BO ; branches `Graphes` / `Matrices`)

| Code     | ex- | Énoncé                                                                                                                                                                    | kind  | nœud                                                              |
| -------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| TEXP-312 | 112 | Graphe, sommets, arêtes                                                                                                                                                   | conn. | `Graphes` Vocabulaire des graphes > sommets, arêtes, degré        |
| TEXP-313 | 113 | Exemple du graphe complet                                                                                                                                                 | conn. | `Graphes` Vocabulaire des graphes > sommets, arêtes, degré        |
| TEXP-314 | 114 | Sommets adjacents, degré, ordre d'un graphe                                                                                                                               | conn. | `Graphes` Vocabulaire des graphes > sommets, arêtes, degré        |
| TEXP-315 | 115 | Chaîne, longueur d'une chaîne                                                                                                                                             | conn. | `Graphes` Chaînes et connexité > chaînes et cycles                |
| TEXP-316 | 116 | Graphe connexe                                                                                                                                                            | conn. | `Graphes` Chaînes et connexité > connexité                        |
| TEXP-317 | 122 | Notion de matrice (tableau de nombres réels)                                                                                                                              | conn. | `Matrices` Calcul matriciel (notion)                              |
| TEXP-318 | 123 | Matrice carrée, matrice colonne, matrice ligne                                                                                                                            | conn. | `Matrices` Calcul matriciel (notion)                              |
| TEXP-319 | 124 | Opérations sur les matrices                                                                                                                                               | conn. | `Matrices` Calcul matriciel > opérations                          |
| TEXP-320 | 125 | Inverse d'une matrice carrée                                                                                                                                              | conn. | `Matrices` Calcul matriciel > inverse                             |
| TEXP-321 | 126 | Puissances d'une matrice carrée                                                                                                                                           | conn. | `Matrices` Calcul matriciel > puissances de matrices              |
| TEXP-322 | 117 | Représentation matricielle : matrice d'adjacence d'un graphe                                                                                                              | conn. | `Graphes` Matrice d'adjacence > matrice d'adjacence               |
| TEXP-323 | 127 | Représentation matricielle des transformations géométriques du plan                                                                                                       | conn. | `Matrices` Transformations du plan > matrice d'une transformation |
| TEXP-324 | 128 | Représentation matricielle des systèmes linéaires                                                                                                                         | conn. | `Matrices` Systèmes linéaires > écriture matricielle              |
| TEXP-325 | 129 | Représentation matricielle des suites récurrentes                                                                                                                         | conn. | `Matrices` Suites et matrices (notion)                            |
| TEXP-326 | 130 | Exemples de calcul de puissances de matrices carrées d'ordre $2$ ou $3$                                                                                                   | conn. | `Matrices` Calcul matriciel > puissances de matrices              |
| TEXP-327 | 131 | Suite de matrices colonnes $(U_n)$ vérifiant une relation de récurrence du type $U_{n+1} = AU_n + C$                                                                      | conn. | `Matrices` Suites et matrices > suites couplées                   |
| TEXP-328 | 139 | Graphe orienté pondéré associé à une chaîne de Markov à deux ou trois états                                                                                               | conn. | `Graphes` Chaînes de Markov > graphe probabiliste                 |
| TEXP-329 | 140 | Chaîne de Markov à deux ou trois états                                                                                                                                    | conn. | `Graphes` Chaînes de Markov (notion)                              |
| TEXP-330 | 141 | Distribution initiale d'une chaîne de Markov, représentée par une matrice ligne $\pi_0$                                                                                   | conn. | `Graphes` Chaînes de Markov (notion) _(discutable 4)_             |
| TEXP-331 | 142 | Matrice de transition d'une chaîne de Markov, graphe pondéré associé                                                                                                      | conn. | `Graphes` Chaînes de Markov > matrice de transition               |
| TEXP-332 | 143 | Pour une chaîne de Markov à deux ou trois états de matrice $P$, interprétation du coefficient $(i, j)$ de $P^n$                                                           | conn. | `Graphes` Chaînes de Markov > distribution après n transitions    |
| TEXP-333 | 144 | Distribution d'une chaîne de Markov après $n$ transitions, représentée comme la matrice ligne $\pi_0 P^n$                                                                 | conn. | `Graphes` Chaînes de Markov > distribution après n transitions    |
| TEXP-334 | 145 | Distributions invariantes d'une chaîne de Markov à deux ou trois états                                                                                                    | conn. | `Graphes` Chaînes de Markov > état stable                         |
| TEXP-335 | 118 | Modéliser une situation par un graphe                                                                                                                                     | s-f   | `Graphes` Vocabulaire des graphes (notion)                        |
| TEXP-336 | 132 | Modéliser une situation par une matrice                                                                                                                                   | s-f   | `Matrices` Suites et matrices (notion)                            |
| TEXP-337 | 146 | Associer un graphe orienté pondéré à une chaîne de Markov à deux ou trois états                                                                                           | s-f   | `Graphes` Chaînes de Markov > graphe probabiliste                 |
| TEXP-338 | 133 | Calculer l'inverse d'une matrice carrée                                                                                                                                   | s-f   | `Matrices` Calcul matriciel > inverse                             |
| TEXP-339 | 134 | Calculer les puissances d'une matrice carrée                                                                                                                              | s-f   | `Matrices` Calcul matriciel > puissances de matrices              |
| TEXP-340 | 135 | Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour résoudre un système linéaire                                                               | s-f   | `Matrices` Systèmes linéaires > résolution                        |
| TEXP-341 | 136 | Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une suite récurrente linéaire                                                      | s-f   | `Matrices` Suites et matrices > suites couplées                   |
| TEXP-342 | 119 | Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour calculer le nombre de chemins de longueur donnée entre deux sommets d'un graphe            | s-f   | `Graphes` Matrice d'adjacence > nombre de chaînes de longueur n   |
| TEXP-343 | 147 | Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : calculer des probabilités             | s-f   | `Graphes` Chaînes de Markov > distribution après n transitions    |
| TEXP-344 | 148 | Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : déterminer une probabilité invariante | s-f   | `Graphes` Chaînes de Markov > état stable                         |
| TEXP-345 | 120 | Expression du nombre de chemins de longueur $n$ reliant deux sommets d'un graphe à l'aide de la puissance $n$-ième de la matrice d'adjacence                              | dém.  | `Graphes` Matrice d'adjacence > nombre de chaînes de longueur n   |
| TEXP-346 | 149 | Pour une chaîne de Markov, expression de la probabilité de passer de l'état $i$ à l'état $j$ en $n$ transitions                                                           | dém.  | `Graphes` Chaînes de Markov > distribution après n transitions    |
| TEXP-347 | 150 | Pour une chaîne de Markov, expression de la matrice ligne représentant la distribution après $n$ transitions                                                              | dém.  | `Graphes` Chaînes de Markov > distribution après n transitions    |
| TEXP-348 | 121 | Étude de graphes eulériens                                                                                                                                                | s-f ⁺ | `Graphes` Chaînes et connexité > chaînes et cycles                |
| TEXP-349 | 137 | Interpolation polynomiale                                                                                                                                                 | s-f ⁺ | `Matrices` Systèmes linéaires > résolution                        |
| TEXP-350 | 151 | Marche aléatoire sur un graphe. Étude asymptotique                                                                                                                        | s-f ⁺ | `Graphes` Chaînes de Markov (notion)                              |
| TEXP-351 | 152 | Modèle de diffusion d'Ehrenfest                                                                                                                                           | s-f ⁺ | `Graphes` Chaînes de Markov (notion)                              |
| TEXP-352 | 138 | Modèle « proie-prédateur » discrétisé : évolution couplée de deux suites récurrentes                                                                                      | s-f ⁺ | `Matrices` Suites et matrices > suites couplées                   |
| TEXP-353 | 153 | Algorithme PageRank                                                                                                                                                       | s-f ⁺ | `Graphes` Chaînes de Markov > état stable                         |

## Après validation (plan de livraison)

Migration additive générée depuis ce document : 153 points `TEXP-201`…`TEXP-353` (+ la
liste de 1re si A1 = oui) ; bloc DO auto-vérifiant (comptes, kinds, 0 sans nœud, anciens
`TEXP-001`…`153` et leurs liens INTACTS) ; test intégral, preuve rouge, mise au diapason
des tests de l'ancien seed qui filtrent par préfixe `TEXP-%`, audit, PR, CI, merge,
`db:migrate`, vérification prod.
