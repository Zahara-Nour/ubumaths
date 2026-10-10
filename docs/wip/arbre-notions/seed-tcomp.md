# Seed Tle complémentaire — points du programme ET références (architecture points → nœuds)

> 2026-10-10 : nœuds mis à jour pour l'arbre .16 (nettoyage des facettes, #1002).

> **Statut : VALIDÉ INTÉGRALEMENT par David le 2026-10-08 (« je valide tout » : scissions,
> refusions, entretien, A1, discutables, P1 = oui, D1 = (a)). Livraison en cours.** ⚠️ Soin maximal.
> Source : « Programme de l'enseignement optionnel de mathématiques complémentaires de la
> classe terminale de la voie générale » (12 p., refourni par David le 2026-10-07), relu
> **puce par puce**. Ancien découpage (`docs/ref/programmes/terminale-comp-programme.md`,
> `TCOMP-001`…`TCOMP-139`, en prod, relu par David le 2026-10-04) : repris pour les
> libellés et la **traçabilité « ex- »** (il porte **140 liens de modèles sur 94
> points**). Mapping : [programmes-ecarts-tle-comp.md](programmes-ecarts-tle-comp.md)
> (Z1-Z4 tranchées le 2026-10-07). Arbre `2026-10-07.15`, **aucun changement d'arbre**.
> Parcours : la Tle comp. suit la **1re spé** (`T_COMP` → `1_SPE` → `2`) ; c'est une voie
> **parallèle** à la Tle spé, dont elle ne peut pas référencer les points (C14).
> Règles déjà tranchées, appliquées sans être redemandées : critère de scission du lycée ;
> entretien des contenus repris mot pour mot (U5/V1) ; puces trop larges et « modéliser »
> = compétence (2de, 1re V2) ; **Exemples d'algorithme = `algorithme` `approfondissement`**
> (E1) ; **Démonstrations possibles = `demonstration` `approfondissement`** (décision David
> du 2026-10-04) ; liste d'automatismes de 1re reprise pour le cycle terminal (A1) ;
> refusion des puces que l'ancien découpage coupait quand leurs parties visent le même
> nœud et n'ont pas de lien.

## Attributs communs

| Attribut               | Valeur                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `grade`                | `T_COMP`                                                                                          |
| `code`                 | **`TCOMP-201` à `TCOMP-329`** (code = 200 + display_order ; l'ancien seed s'arrête à `TCOMP-139`) |
| `objective_id`, `rang` | `NULL`                                                                                            |
| `rubrique`             | « partie > section » du BO ; le Vocabulaire → le thème seul                                       |
| `kind`                 | conn. / s-f / dém. ⁺ (Démonstrations possibles) / algo. (Exemples d'algorithme) / conn. ⁺ (D1)    |
| `exigence`             | `attendu` ; ⁺ et algo. → `approfondissement`                                                      |
| `regime_acquisition`   | `diversite` partout                                                                               |

Ordre : celui du BO — Vocabulaire, puis l'unique contenu propre aux Thèmes d'étude
(question D1), puis les Contenus. Colonne « ex- » : ancien code `TCOMP-xxx` (✂ = scission,
`+` = fusion, — = sans ancien équivalent).

---

## ⚠️ Puces multi-parties

### Scindées en plus de l'ancien découpage (8 puces → +8 points)

| Puce du BO (ancien code, liens)                                                                                                                        | Décision                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Notion de limite. **Lien avec la continuité** et les asymptotes » (018, 4)                                                                           | **×2** : limite et asymptotes (`Limites de fonctions`) / lien limite-continuité (`Continuité > continuité en un point`).                                                           |
| « Utiliser l'équation fonctionnelle de **l'exponentielle ou du logarithme** pour transformer, résoudre » (035, 2 ; 036, 3)                             | Comme en Tle spé : **transformer avec ln** · **résoudre avec exp** · **résoudre avec ln** ; « transformer avec exp » = **entretien** de 1SPE-294 (point de 1re, dans le parcours). |
| « Équation différentielle y′ = ay + b ; **allure des courbes** » (050, 1)                                                                              | **×2** : `y′ = ay + b` / `Généralités > allure des courbes` (comme en Tle spé).                                                                                                    |
| « Estimer graphiquement ou encadrer **une intégrale, une valeur moyenne** » (075, 2) ; « Interpréter **une intégrale, une valeur moyenne**… » (080, 1) | **×2 chacune** : `Intégrale et aire` ≠ `Valeur moyenne` (comme en Tle spé).                                                                                                        |
| « Loi binomiale : **expression, espérance et écart type** (admis) » (089, 2)                                                                           | **×2** : expression (`calcul de probabilités`) / espérance et écart type (`espérance et variance`).                                                                                |
| « Loi exponentielle. Densité, répartition. Espérance, **propriété d'absence de mémoire** » (110, 1)                                                    | **×2** : `loi exponentielle` / `absence de mémoire` (sous-notion créée en Z2 pour les deux lois, comme la loi géométrique 091/092).                                                |
| « **Nuage de points. Point moyen.** » (116, 2)                                                                                                         | **×2** : `nuage de points` / `point moyen` (deux sous-notions, comme les capacités 121/122).                                                                                       |

### Refusionnées (une puce du BO, un nœud, aucun lien)

038 + 039 (ln(ab), ln(1/a) — démonstrations possibles) · 041 + 042 (dérivées de ln u, de exp u
— démonstrations possibles) · 043 + 044 + 045 (balayage, dichotomie, Newton — un exemple
d'algorithme).

## Entretien : contenus repris mot pour mot de la 2de ou de la 1re

> Règle U5/V1. Aucun de ces anciens points TCOMP n'a de lien.

| Puce du BO (ancien code)                                                                                | Entretien → référence                         |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Notions d'ensembles, symboles, ensembles de nombres et intervalles, complémentaire, Card (126-128, 130) | 2-201 · 2-202 · 2-203 · 2-204 · 2-206 · 2-207 |
| Proposition, variables, connecteurs, négation simple, contre-exemple (132-136)                          | 2-208 · 2-209 · 2-210 · 2-211 · 2-212         |
| Implication-équivalence, réciproque, quantification (137-139)                                           | 2-213 · 2-214 · 2-215                         |
| Transformer une écriture avec l'équation fonctionnelle de l'exponentielle (part de 035)                 | 1SPE-294                                      |

**Dépasse la 2de → point** : couple, triplet, **n-uplet**, produit cartésien (ex-129, qui
ne disait que « couple » : l'ancien seed avait omis triplet, n-uplet, ensemble vide et
Card, que le BO cite — complété). Le n-uplet est un point de Tle spé, voie parallèle :
la Tle comp. a donc le sien. **Non repris** : 131 (symbole Σ, « son emploi comme outil de
calcul n'est pas un objectif » — [T]). La partie Algorithmique (« sans notion nouvelle »,
sans capacités listées) ne donne ni point ni référence.

## ⚠️ Puces trop larges (règles 2de et 1re V2)

| Puce (ancien code, liens)                                                                                                                  | Décision                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| « Modéliser un problème par une suite donnée par une formule explicite ou une relation de récurrence » (007, 0)                            | ⛔ **non retenue** — « modéliser » = compétence ; jumelle d'ex-1SPE-033, retirée en 1re (V2-A).                   |
| « Dans le cadre de la résolution de problème, utiliser le calcul des limites » (030, 0)                                                    | ⛔ **non retenue (question P1)** — « résous comme tu veux » ; le geste précis est « Calculer des limites » (028). |
| « …utiliser l'allure des courbes représentatives des fonctions inverse, carré, cube, racine carrée, exponentielle et logarithme » (031, 1) | ✅ gardée (P1) : une famille précise (lire et exploiter l'allure des courbes de référence) ; un modèle lié.       |
| « …utiliser l'espérance des lois précédentes » (098, **3**) ; « …utiliser un ajustement pour interpoler, extrapoler » (124, 2)             | ✅ gardées : un outil précis, des modèles réels.                                                                  |

## Les références (`curriculum_point_automatismes`, grade `T_COMP`)

### E. Entretien (U5/V1) — 15 références

2-201 · 2-202 · 2-203 · 2-204 · 2-206 · 2-207 · 2-208 · 2-209 · 2-210 · 2-211 · 2-212 ·
2-213 · 2-214 · 2-215 · 1SPE-294

### A. Liste d'automatismes de 1re reprise pour le cycle terminal (A1, appliqué)

Les **93 références** de la liste de 1re spé (qui contient celle de 2de), reprises telles
quelles avec le grade `T_COMP` — l'élève de Tle comp. vient de 1re spé, et le BO de 1re
attache ces automatismes à « l'ensemble du cycle terminal ». Le préambule du BO de Tle
comp. insiste lui aussi sur les automatismes et les activités rituelles.

## Rattachements discutables

1. **« …utiliser l'allure des courbes représentatives des fonctions de référence »**
   (TCOMP-232) → `Généralités sur les fonctions` (notion) : six fonctions, aucune
   sous-notion ne couvre leur ensemble. Alternative : la scinder par fonction (six points,
   une seule capacité du BO — reco : non).
2. **« Exploiter le tableau de variation pour résoudre une inéquation f(x) ⩽ k »**
   (TCOMP-234) → `Généralités sur les fonctions > variations` (c'est l'usage du tableau).
   Alternative : `> résolution graphique`.
3. **« Utiliser la relation ln qⁿ = n ln q pour déterminer un seuil »** (TCOMP-239) →
   `Suites et modélisation > seuil` (le doc d'écarts : c'est la famille des seuils).
   Alternative : `Logarithmes > équations et inéquations`.
4. **« …utiliser l'espérance des lois précédentes (uniforme, Bernoulli, binomiale,
   géométrique) »** (TCOMP-300) → `Variables aléatoires > espérance` (quatre lois, l'outil
   commun est l'espérance). Alternative : `Loi binomiale > espérance et variance`.
5. **Simulations** (TCOMP-317, 318) → Bernoulli ou dé depuis une loi uniforme :
   `Échantillonnage > simulation` ; somme de n variables : `Sommes et concentration >
échantillons`, comme « Simulation d'un échantillon » en Tle spé (TSPE-515).

## Questions — TOUTES TRANCHÉES (David, 2026-10-08 : « je valide tout »)

> **P1 = oui** (ex-030 retiré) · **D1 = (a)** : un point « déciles, rapport interdécile » en
> `approfondissement`.

- **P1 — puces larges** : retirer « Dans le cadre de la résolution de problème, utiliser
  le calcul des limites » (0 lien, son geste précis est déjà un point), garder « …utiliser
  l'allure des courbes représentatives… ». Reco : **oui**.
- **D1 — déciles et rapport interdécile** : c'est le seul contenu qui n'existe que dans un
  Thème d'étude (« Répartition des richesses, inégalités »), et la sous-notion a été créée
  pour lui (Z3). Mais tu avais décidé le 2026-10-04 (Q149) que le référentiel se bâtit sur
  les seuls Contenus. Options : **(a) un point**, en `approfondissement` (le thème est l'un
  des neuf, dont au moins six sont traités : non exigible pour tous) ; (b) pas de point.
  Reco : **(a)** — sinon la sous-notion créée pour la Tle comp. n'a aucun point, et ce
  contenu (que la Tle comp. est seule à introduire) disparaît du suivi.
- **Validation d'ensemble** : scissions (+8), refusions (3), entretien (15 références),
  liste de 1re reprise (A1), ex-007 non retenu (compétence), ex-131 non repris, les 5
  discutables.

---

## Les 129 points

### Vocabulaire ensembliste et logique (rubrique = le thème)

| Code      | ex- | Énoncé                                                                                       | kind  | nœud                                                          |
| --------- | --- | -------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------- |
| TCOMP-201 | 129 | Notion de couple, de triplet et plus généralement de $n$-uplet et celle de produit cartésien | conn. | `Ensembles` Cardinal et produit cartésien > produit cartésien |

### Thèmes d'étude > Répartition des richesses, inégalités (question D1)

| Code      | ex- | Énoncé                                                                                  | kind    | nœud                                                        |
| --------- | --- | --------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| TCOMP-202 | —   | Statistique descriptive : caractéristiques de dispersion — déciles, rapport interdécile | conn. ⁺ | `Statistiques` Indicateurs > déciles et rapport interdécile |

### Analyse > Suites numériques, modèles discrets (branche `Suites`)

| Code      | ex- | Énoncé                                                                                                                                                          | kind   | nœud                                                 |
| --------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| TCOMP-203 | 001 | Approche intuitive de la notion de limite, finie ou infinie, d'une suite                                                                                        | conn.  | Limites de suites > définition                       |
| TCOMP-204 | 002 | Approche intuitive des opérations sur les limites                                                                                                               | conn.  | Limites de suites > opérations                       |
| TCOMP-205 | 003 | Approche intuitive du passage à la limite dans les inégalités et du théorème des gendarmes                                                                      | conn.  | Limites de suites > comparaison et encadrement       |
| TCOMP-206 | 004 | Limite d'une suite géométrique de raison positive                                                                                                               | conn.  | Limites de suites > suites géométriques              |
| TCOMP-207 | 005 | Limite de la somme des termes d'une suite géométrique de raison positive strictement inférieure à $1$                                                           | conn.  | Limites de suites > suites géométriques              |
| TCOMP-208 | 006 | Suites arithmético-géométriques                                                                                                                                 | conn.  | Suites arithmético-géométriques (notion)             |
| TCOMP-209 | 008 | Calculer une limite de suite géométrique                                                                                                                        | s-f    | Limites de suites > suites géométriques              |
| TCOMP-210 | 009 | Calculer la limite de la somme des termes d'une suite géométrique de raison positive et strictement inférieure à $1$                                            | s-f    | Limites de suites > suites géométriques              |
| TCOMP-211 | 010 | Représenter graphiquement une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$ où $f$ est une fonction continue d'un intervalle $I$ dans lui-même | s-f    | Suites récurrentes > escalier                        |
| TCOMP-212 | 011 | Conjecturer le comportement global ou asymptotique d'une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$                                         | s-f    | Suites récurrentes (notion)                          |
| TCOMP-213 | 012 | Pour une récurrence arithmético-géométrique : rechercher une suite constante solution particulière                                                              | s-f    | Suites arithmético-géométriques > solution constante |
| TCOMP-214 | 013 | Pour une récurrence arithmético-géométrique : utiliser une suite constante solution particulière pour déterminer toutes les solutions                           | s-f    | Suites arithmético-géométriques > suite auxiliaire   |
| TCOMP-215 | 014 | Limite des sommes des termes d'une suite géométrique de raison positive strictement inférieure à $1$ (démonstration)                                            | dém. ⁺ | Limites de suites > suites géométriques              |
| TCOMP-216 | 015 | Recherche de seuils                                                                                                                                             | algo.  | Modèles d'évolution > seuil                          |
| TCOMP-217 | 016 | Pour une suite récurrente $u_{n+1} = f(u_n)$, calcul des termes successifs                                                                                      | algo.  | Suites récurrentes (notion)                          |
| TCOMP-218 | 017 | Recherche de valeurs approchées de constantes mathématiques, par exemple $\pi$, $\ln 2$, $\sqrt{2}$                                                             | algo.  | Limites de suites (notion)                           |

### Analyse > Fonctions : continuité, dérivabilité, limites, représentation graphique (branche `Fonctions`)

| Code      | ex-         | Énoncé                                                                                                                                                                   | kind   | nœud                                                        |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------- |
| TCOMP-219 | ✂018a      | Notion de limite d'une fonction ; asymptotes horizontales ou verticales                                                                                                  | conn.  | Limites de fonctions (notion)                               |
| TCOMP-220 | ✂018b      | Lien entre la notion de limite et la continuité                                                                                                                          | conn.  | Continuité > continuité en un point                         |
| TCOMP-221 | 019         | Limites des fonctions de référence (carré, cube, racine carrée, inverse, exponentielle, logarithme)                                                                      | conn.  | Limites de fonctions > opérations                           |
| TCOMP-222 | 020         | Théorème des valeurs intermédiaires (admis). Cas des fonctions strictement monotones                                                                                     | conn.  | Continuité > valeurs intermédiaires                         |
| TCOMP-223 | 021         | Réciproque d'une fonction continue strictement monotone sur un intervalle, représentation graphique                                                                      | conn.  | Continuité > fonction réciproque                            |
| TCOMP-224 | 022         | Fonction logarithme népérien : réciproque de la fonction exponentielle                                                                                                   | conn.  | Logarithmes > réciproque de l'exponentielle                 |
| TCOMP-225 | 023         | Limites et représentation graphique de la fonction logarithme népérien                                                                                                   | conn.  | Logarithmes > courbe                                        |
| TCOMP-226 | 024         | Équation fonctionnelle du logarithme népérien                                                                                                                            | conn.  | Logarithmes > propriétés algébriques                        |
| TCOMP-227 | 025         | Fonction dérivée du logarithme népérien                                                                                                                                  | conn.  | Logarithmes > dérivée                                       |
| TCOMP-228 | 026         | Fonction dérivée de $x \mapsto f(ax + b)$, $x \mapsto e^{u(x)}$, $x \mapsto \ln u(x)$, $x \mapsto u(x)^2$                                                                | conn.  | Dérivation > fonctions composées                            |
| TCOMP-229 | 027         | Calculer une fonction dérivée                                                                                                                                            | s-f    | Dérivation > opérations sur les dérivées                    |
| TCOMP-230 | 028         | Calculer des limites                                                                                                                                                     | s-f    | Limites de fonctions (notion)                               |
| TCOMP-231 | 029         | Dresser un tableau de variation                                                                                                                                          | s-f    | Dérivation > variations et extremums                        |
| TCOMP-232 | 031         | Dans le cadre de la résolution de problème, utiliser l'allure des courbes représentatives des fonctions inverse, carré, cube, racine carrée, exponentielle et logarithme | s-f    | Généralités sur les fonctions (notion) _(discutable 1)_     |
| TCOMP-233 | 032         | Exploiter le tableau de variation pour déterminer le nombre de solutions d'une équation du type $f(x) = k$                                                               | s-f    | Continuité > valeurs intermédiaires                         |
| TCOMP-234 | 033         | Exploiter le tableau de variation pour résoudre une inéquation du type $f(x) \leqslant k$                                                                                | s-f    | Généralités sur les fonctions > variations _(discutable 2)_ |
| TCOMP-235 | 034         | Déterminer des valeurs approchées, un encadrement d'une solution d'une équation du type $f(x) = k$                                                                       | s-f    | Continuité > encadrement d'une solution                     |
| TCOMP-236 | ✂035       | Utiliser l'équation fonctionnelle du logarithme pour transformer une écriture                                                                                            | s-f    | Logarithmes > propriétés algébriques                        |
| TCOMP-237 | ✂036a      | Utiliser l'équation fonctionnelle de l'exponentielle pour résoudre une équation, une inéquation                                                                          | s-f    | Fonction exponentielle > équations et inéquations           |
| TCOMP-238 | ✂036b      | Utiliser l'équation fonctionnelle du logarithme pour résoudre une équation, une inéquation                                                                               | s-f    | Logarithmes > équations et inéquations                      |
| TCOMP-239 | 037         | Utiliser la relation $\ln q^n = n \ln q$ pour déterminer un seuil                                                                                                        | s-f    | `Suites` Modèles d'évolution > seuil _(discutable 3)_       |
| TCOMP-240 | 038+039     | Relations $\ln(ab) = \ln a + \ln b$, $\ln\left(\frac{1}{a}\right) = -\ln a$                                                                                              | dém. ⁺ | Logarithmes > propriétés algébriques                        |
| TCOMP-241 | 040         | Calcul de la fonction dérivée du logarithme, en admettant sa dérivabilité                                                                                                | dém. ⁺ | Logarithmes > dérivée                                       |
| TCOMP-242 | 041+042     | Calcul de la fonction dérivée de $\ln u$, de $\exp u$                                                                                                                    | dém. ⁺ | Dérivation > fonctions composées                            |
| TCOMP-243 | 043+044+045 | Méthodes de recherche de valeurs approchées d'une solution d'équation du type $f(x) = k$ : balayage, dichotomie, méthode de Newton                                       | algo.  | Continuité > encadrement d'une solution                     |
| TCOMP-244 | 046         | Algorithme de Briggs pour le calcul de logarithmes                                                                                                                       | algo.  | Logarithmes (notion)                                        |

### Analyse > Primitives et équations différentielles (branche `Équations différentielles`)

| Code      | ex-    | Énoncé                                                                                                                             | kind   | nœud                                           |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| TCOMP-245 | 047    | Sur des exemples, notion d'une solution d'équation différentielle                                                                  | conn.  | Généralités > notion de solution               |
| TCOMP-246 | 048    | Notion de primitive, en liaison avec l'équation différentielle $y' = f$                                                            | conn.  | y′ = f > primitives : notion                   |
| TCOMP-247 | 049    | Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante                                           | conn.  | y′ = f > primitives : notion                   |
| TCOMP-248 | ✂050a | Équation différentielle $y' = ay + b$, où $a$ et $b$ sont des réels                                                                | conn.  | y′ = ay + b (notion)                           |
| TCOMP-249 | ✂050b | Allure des courbes des solutions de l'équation différentielle $y' = ay + b$                                                        | conn.  | Généralités > allure des courbes               |
| TCOMP-250 | 051    | Vérifier qu'une fonction donnée est solution d'une équation différentielle                                                         | s-f    | Généralités > notion de solution               |
| TCOMP-251 | 052    | Déterminer les primitives d'une fonction, en reconnaissant la dérivée d'une fonction de référence                                  | s-f    | y′ = f > primitives des fonctions de référence |
| TCOMP-252 | 053    | Déterminer les primitives d'une fonction de la forme $2uu'$, $e^{u}u'$ ou $\frac{u'}{u}$                                           | s-f    | y′ = f > forme (v′∘u)×u′                       |
| TCOMP-253 | 054    | Résoudre une équation différentielle $y' = ay$                                                                                     | s-f    | y′ = ay (notion)                               |
| TCOMP-254 | 055    | Pour une équation différentielle $y' = ay + b$ : déterminer une solution particulière constante                                    | s-f    | y′ = ay + b (notion)                           |
| TCOMP-255 | 056    | Pour une équation différentielle $y' = ay + b$ : utiliser une solution particulière constante pour déterminer la solution générale | s-f    | y′ = ay + b (notion)                           |
| TCOMP-256 | 057    | Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante (démonstration)                           | dém. ⁺ | y′ = f > primitives : notion                   |
| TCOMP-257 | 058    | Résolution de l'équation différentielle $y' = ay$                                                                                  | dém. ⁺ | y′ = ay (notion)                               |
| TCOMP-258 | 059    | Sur des exemples, résolution approchée d'une équation différentielle par la méthode d'Euler                                        | algo.  | Généralités > méthode d'Euler                  |

### Analyse > Fonctions convexes (branche `Fonctions`)

| Code      | ex- | Énoncé                                                                                                               | kind  | nœud                          |
| --------- | --- | -------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------- |
| TCOMP-259 | 060 | Dérivée seconde d'une fonction                                                                                       | conn. | Convexité > dérivée seconde   |
| TCOMP-260 | 061 | Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes | conn. | Convexité > caractérisations  |
| TCOMP-261 | 062 | Lorsque $f$ est dérivable, équivalence admise avec la position de la courbe par rapport aux tangentes                | conn. | Convexité > caractérisations  |
| TCOMP-262 | 063 | Caractérisation admise de la convexité par la croissance de $f'$, la positivité de $f''$                             | conn. | Convexité > caractérisations  |
| TCOMP-263 | 064 | Point d'inflexion                                                                                                    | conn. | Convexité > point d'inflexion |
| TCOMP-264 | 065 | Reconnaitre sur une représentation graphique une fonction convexe, concave, un point d'inflexion                     | s-f   | Convexité (notion)            |
| TCOMP-265 | 066 | Étudier la convexité, la concavité, d'une fonction deux fois dérivable sur un intervalle                             | s-f   | Convexité (notion)            |

### Analyse > Intégration (branche `Intégration`)

| Code      | ex-    | Énoncé                                                                                                                                                                     | kind   | nœud                                                  |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------- |
| TCOMP-266 | 067    | Définition de l'intégrale d'une fonction continue et positive sur $[a, b]$ comme aire sous la courbe. Notation $\int_a^b f(x)\,\mathrm{d}x$                                | conn.  | Intégrale et aire > aire algébrique                   |
| TCOMP-267 | 068    | Relation de Chasles                                                                                                                                                        | conn.  | Calcul d'intégrales > relation de Chasles             |
| TCOMP-268 | 069    | Valeur moyenne d'une fonction continue sur $[a, b]$. Approche graphique et numérique                                                                                       | conn.  | Valeur moyenne (notion)                               |
| TCOMP-269 | 070    | La valeur moyenne est comprise entre les bornes de la fonction                                                                                                             | conn.  | Valeur moyenne (notion)                               |
| TCOMP-270 | 071    | Approximation d'une intégrale par la méthode des rectangles                                                                                                                | conn.  | Calcul d'intégrales > méthode des rectangles          |
| TCOMP-271 | 072    | Présentation de l'intégrale des fonctions continues de signe quelconque                                                                                                    | conn.  | Intégrale et aire > aire algébrique                   |
| TCOMP-272 | 073    | Théorème : si $f$ est continue sur $[a, b]$, la fonction $F$ définie sur $[a, b]$ par $F(x) = \int_a^x f(t)\,\mathrm{d}t$ est dérivable sur $[a, b]$ et a pour dérivée $f$ | conn.  | Fonction intégrale > dérivée d'une fonction intégrale |
| TCOMP-273 | 074    | Calcul d'intégrales à l'aide de primitives : si $F$ est une primitive de $f$, alors $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$                                             | conn.  | Calcul d'intégrales > par une primitive               |
| TCOMP-274 | ✂075a | Estimer graphiquement ou encadrer une intégrale                                                                                                                            | s-f    | Intégrale et aire > aire algébrique                   |
| TCOMP-275 | ✂075b | Estimer graphiquement ou encadrer une valeur moyenne                                                                                                                       | s-f    | Valeur moyenne (notion)                               |
| TCOMP-276 | 076    | Calculer une intégrale                                                                                                                                                     | s-f    | Calcul d'intégrales > par une primitive               |
| TCOMP-277 | 077    | Calculer une valeur moyenne                                                                                                                                                | s-f    | Valeur moyenne (notion)                               |
| TCOMP-278 | 078    | Calculer l'aire sous une courbe                                                                                                                                            | s-f    | Intégrale et aire > aire algébrique                   |
| TCOMP-279 | 079    | Calculer l'aire entre deux courbes                                                                                                                                         | s-f    | Intégrale et aire > aire entre deux courbes           |
| TCOMP-280 | ✂080a | Interpréter une intégrale dans un contexte issu d'une autre discipline                                                                                                     | s-f    | Intégrale et aire (notion)                            |
| TCOMP-281 | ✂080b | Interpréter une valeur moyenne dans un contexte issu d'une autre discipline                                                                                                | s-f    | Valeur moyenne (notion)                               |
| TCOMP-282 | 081    | Dérivée de $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ lorsque $f$ est une fonction continue positive croissante                                                                | dém. ⁺ | Fonction intégrale > dérivée d'une fonction intégrale |
| TCOMP-283 | 082    | Méthode des rectangles, des trapèzes                                                                                                                                       | algo.  | Calcul d'intégrales > méthode des rectangles          |
| TCOMP-284 | 083    | Méthode de Monte-Carlo pour un calcul d'aire                                                                                                                               | algo.  | Intégrale et aire (notion)                            |

### Probabilités et statistique > Lois discrètes (branche `Probabilités`)

| Code      | ex-    | Énoncé                                                                                                                                                                                    | kind   | nœud                                                              |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| TCOMP-285 | 084    | Loi uniforme sur $\{1, 2, \ldots, n\}$. Espérance                                                                                                                                         | conn.  | Autres lois > loi uniforme discrète                               |
| TCOMP-286 | 085    | Épreuve de Bernoulli. Loi de Bernoulli : définition, espérance et écart type                                                                                                              | conn.  | Loi binomiale > schéma de Bernoulli                               |
| TCOMP-287 | 086    | Schéma de Bernoulli. Représentation par un arbre                                                                                                                                          | conn.  | Loi binomiale > schéma de Bernoulli                               |
| TCOMP-288 | 087    | Coefficients binomiaux : définition (nombre de façons d'obtenir $k$ succès dans un schéma de Bernoulli de taille $n$), triangle de Pascal, symétrie                                       | conn.  | Combinaisons > coefficients binomiaux                             |
| TCOMP-289 | 088    | Variable aléatoire suivant une loi binomiale $\mathcal{B}(n, p)$. Interprétation : nombre de succès dans le schéma de Bernoulli                                                           | conn.  | Loi binomiale (notion)                                            |
| TCOMP-290 | ✂089a | Loi binomiale : expression                                                                                                                                                                | conn.  | Loi binomiale > expression de la loi                              |
| TCOMP-291 | ✂089b | Loi binomiale : espérance et écart type (admis)                                                                                                                                           | conn.  | Loi binomiale > espérance et variance                             |
| TCOMP-292 | 090    | Loi binomiale : représentation graphique                                                                                                                                                  | conn.  | Loi binomiale (notion)                                            |
| TCOMP-293 | 091    | Loi géométrique : définition, expression, espérance (admise), représentation graphique                                                                                                    | conn.  | Autres lois > loi géométrique                                     |
| TCOMP-294 | 092    | Loi géométrique : propriété caractéristique (loi sans mémoire)                                                                                                                            | conn.  | Autres lois > absence de mémoire                                  |
| TCOMP-295 | 093    | Identifier des situations où une variable aléatoire suit une loi de Bernoulli, une loi binomiale ou une loi géométrique                                                                   | s-f    | Loi binomiale > schéma de Bernoulli                               |
| TCOMP-296 | 094    | Déterminer des coefficients binomiaux à l'aide du triangle de Pascal                                                                                                                      | s-f    | Combinaisons > coefficients binomiaux                             |
| TCOMP-297 | 095    | Dans le cas où $X$ suit une loi binomiale, calculer à l'aide d'une calculatrice ou d'un logiciel les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$, etc.           | s-f    | Loi binomiale > expression de la loi                              |
| TCOMP-298 | 096    | Calculer explicitement les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$ pour une variable aléatoire $X$ suivant une loi géométrique                               | s-f    | Autres lois > loi géométrique                                     |
| TCOMP-299 | 097    | Dans le cas où $X$ suit une loi binomiale, déterminer un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$ | s-f    | Loi binomiale > intervalle de fluctuation                         |
| TCOMP-300 | 098    | Dans le cadre de la résolution de problème, utiliser l'espérance des lois précédentes (uniforme, de Bernoulli, binomiale, géométrique)                                                    | s-f    | Variables aléatoires > espérance _(discutable 4)_                 |
| TCOMP-301 | 099    | Utiliser en situation la caractérisation d'une loi géométrique par l'absence de mémoire                                                                                                   | s-f    | Autres lois > absence de mémoire                                  |
| TCOMP-302 | 100    | Calculer des probabilités dans des situations faisant intervenir des probabilités conditionnelles                                                                                         | s-f    | Probabilités conditionnelles (notion)                             |
| TCOMP-303 | 101    | Calculer des probabilités dans des situations faisant intervenir des répétitions d'expériences aléatoires                                                                                 | s-f    | Probabilités conditionnelles > épreuves indépendantes successives |
| TCOMP-304 | 102    | Espérance et écart type d'une variable aléatoire suivant une loi de Bernoulli                                                                                                             | dém. ⁺ | Loi binomiale > schéma de Bernoulli                               |
| TCOMP-305 | 103    | Espérance d'une variable aléatoire uniforme sur $\{1, 2, \ldots, n\}$                                                                                                                     | dém. ⁺ | Autres lois > loi uniforme discrète                               |
| TCOMP-306 | 104    | Espérance d'une variable aléatoire suivant une loi binomiale ($n \leqslant 3$)                                                                                                            | dém. ⁺ | Loi binomiale > espérance et variance                             |
| TCOMP-307 | 105    | Caractérisation d'une loi géométrique par l'absence de mémoire                                                                                                                            | dém. ⁺ | Autres lois > absence de mémoire                                  |

### Probabilités et statistique > Lois à densité (branche `Probabilités`)

| Code      | ex-    | Énoncé                                                                                                                                                                       | kind  | nœud                                                         |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------ |
| TCOMP-308 | 106    | Notion de loi à densité à partir d'exemples. Représentation d'une probabilité comme une aire                                                                                 | conn. | Autres lois > densité et aire                                |
| TCOMP-309 | 107    | Fonction de répartition $x \mapsto P(X \leqslant x)$                                                                                                                         | conn. | Autres lois > fonction de répartition                        |
| TCOMP-310 | 108    | Espérance et variance d'une loi à densité, expressions sous forme d'intégrales                                                                                               | conn. | Autres lois > espérance et variance                          |
| TCOMP-311 | 109    | Loi uniforme sur $[0, 1]$ puis sur $[a, b]$. Fonction de densité, fonction de répartition. Espérance et variance                                                             | conn. | Autres lois > loi uniforme continue                          |
| TCOMP-312 | ✂110a | Loi exponentielle. Fonction densité, fonction de répartition. Espérance                                                                                                      | conn. | Autres lois > loi exponentielle                              |
| TCOMP-313 | ✂110b | Propriété d'absence de mémoire de la loi exponentielle                                                                                                                       | conn. | Autres lois > absence de mémoire                             |
| TCOMP-314 | 111    | Déterminer si une fonction est une densité de probabilité                                                                                                                    | s-f   | Autres lois > densité et aire                                |
| TCOMP-315 | 112    | Calculer des probabilités pour une variable aléatoire à densité                                                                                                              | s-f   | Autres lois > densité et aire                                |
| TCOMP-316 | 113    | Calculer l'espérance d'une variable aléatoire à densité                                                                                                                      | s-f   | Autres lois > espérance et variance                          |
| TCOMP-317 | 114    | Simulation d'une variable de Bernoulli ou d'un lancer de dé (ou d'une variable uniforme sur un ensemble fini) à partir d'une variable aléatoire de loi uniforme sur $[0, 1]$ | algo. | `Statistiques` Échantillonnage > simulation _(discutable 5)_ |
| TCOMP-318 | 115    | Simulation du comportement de la somme de $n$ variables aléatoires indépendantes et de même loi                                                                              | algo. | Sommes et concentration > échantillons _(discutable 5)_      |

### Probabilités et statistique > Statistique à deux variables quantitatives (branche `Statistiques`)

| Code      | ex-    | Énoncé                                                                                         | kind   | nœud                                                      |
| --------- | ------ | ---------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| TCOMP-319 | ✂116a | Nuage de points                                                                                | conn.  | Statistique à deux variables > nuage de points            |
| TCOMP-320 | ✂116b | Point moyen                                                                                    | conn.  | Statistique à deux variables > point moyen                |
| TCOMP-321 | 117    | Ajustement affine. Droite des moindres carrés                                                  | conn.  | Statistique à deux variables > ajustement affine          |
| TCOMP-322 | 118    | Coefficient de corrélation                                                                     | conn.  | Statistique à deux variables > coefficient de corrélation |
| TCOMP-323 | 119    | Ajustement se ramenant par changement de variable à un ajustement affine                       | conn.  | Statistique à deux variables > changement de variable     |
| TCOMP-324 | 120    | Application des ajustements à des interpolations ou extrapolations                             | conn.  | Statistique à deux variables > ajustement affine          |
| TCOMP-325 | 121    | Représenter un nuage de points                                                                 | s-f    | Statistique à deux variables > nuage de points            |
| TCOMP-326 | 122    | Calculer les coordonnées d'un point moyen                                                      | s-f    | Statistique à deux variables > point moyen                |
| TCOMP-327 | 123    | Déterminer une droite de régression, à l'aide de la calculatrice, d'un logiciel ou par calcul  | s-f    | Statistique à deux variables > ajustement affine          |
| TCOMP-328 | 124    | Dans le cadre d'une résolution de problème, utiliser un ajustement pour interpoler, extrapoler | s-f    | Statistique à deux variables > ajustement affine          |
| TCOMP-329 | 125    | Droite des moindres carrés (démonstration)                                                     | dém. ⁺ | Statistique à deux variables > ajustement affine          |

## Après validation (plan de livraison)

Migration additive générée depuis ce document : points `TCOMP-201`…, références
(entretien + liste de 1re) ; bloc DO auto-vérifiant (comptes, kinds, 0 sans nœud, anciens
`TCOMP-001`…`139` et leurs liens INTACTS) ; test intégral, preuve rouge, mise au diapason
des tests de l'ancien seed qui filtrent par préfixe `TCOMP-%`, audit, PR, CI, merge,
`db:migrate`, vérification prod.
