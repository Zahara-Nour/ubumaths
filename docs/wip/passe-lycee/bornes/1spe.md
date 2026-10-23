# Bornes des points de première spécialité

Objectif : pour chaque point de programme actif de la spécialité de mathématiques de 1re (`grade` = `1_SPE`), dire jusqu'où vont les questions qu'on peut y rattacher (« seulement »). Ces bornes serviront à juger qu'un modèle de question reste **entièrement** dans le point. 237 points lus dans `points-lycee.csv` (base locale, empreinte identique à la prod le 2026-10-22).

La 1re spécialité hérite de la seconde : ce qui est acquis en 2de (fonctions de référence, calcul algébrique, vecteurs et droites, probabilités conditionnelles sur arbre ou tableau, statistiques) n'est pas recopié ici, sauf quand la 1re le change.

## Sources et façon de citer

| Abréviation    | Document                                                                                                                     | Page citée  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **BO 1re spé** | Programme de spécialité de mathématiques de première générale, **nouveau programme** (BO n° 14 du 2026-04-02), `bo/1spe.txt` | page du PDF |

Aucun document d'accompagnement n'a été utilisé (aucun n'existe encore pour ce programme).

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point).

Les **approfondissements possibles** du BO sont « en aucun cas obligatoires » (BO p.3) : la remarque du point le rappelle. Les points-compétences (modéliser, raisonner, résoudre un problème) n'ont pas de borne propre : `bornes: []` et une remarque.

## Ce qui est le plus utile pour la vérification « seulement »

- **Dérivées** : carré, cube, inverse, racine carrée, xⁿ (n ∈ ℤ), e^{at} ; opérations somme, produit, inverse, quotient. **Aucune autre composée** n'est écrite au BO nouveau (ni √(ax + b), ni (ax + b)ⁿ par composition) : question l1s-1.
- **Limites** : intuition seulement, sur des exemples ; aucune formalisation, aucun calcul de limite de fonction.
- **Second degré** : forme canonique par complétion du carré dans des cas simples, cas général non attendu (frontière : question l1s-2) ; racines réelles seulement.
- **Exponentielle** : propriétés exp(x + y) = exp(x)exp(y) et exp(x)exp(−x) = 1 (conséquences : question l1s-5) ; pas de logarithme, donc pas d'équation eˣ = k quelconque.
- **Trigonométrie** : cercle, radian, cos et sin d'un réel, valeurs remarquables (liste et angles associés : question l1s-3) ; ni fonctions sinus et cosinus, ni équations trigonométriques.
- **Géométrie** : plane seulement, repère orthonormé en géométrie repérée.
- **Probabilités** : univers finis ; deux épreuves indépendantes ; Bernoulli répétée n ⩽ 4, sans loi binomiale ni coefficient binomial ; linéarité de l'espérance (portée : question l1s-6).
- **Algorithmique** : listes seulement comme collection.

## Libellés qui ne collent plus au BO nouveau (signalés, rien corrigé)

- **1SPE-243** (forme développée ; coefficients), **1SPE-247** (coordonnées du sommet), **1SPE-384** (axe de symétrie) : absents du texte de 1re spé ; **1SPE-250** (inéquation du second degré) : seulement dans la parenthèse d'une capacité.
- **1SPE-221** (« nuage de points » ajouté), **1SPE-354** (« définir … et donner ses valeurs possibles » au lieu de « modéliser »), **1SPE-364** (« calculer l'écart » au lieu d'« étudier la distance »).

## Questions ouvertes (`questions-spe.json`)

- **l1s-1** — Dérivées de composées affines (√(ax + b), (ax + b)ⁿ) en 1re.
- **l1s-2** — Forme canonique : où s'arrêtent les « cas simples » ?
- **l1s-3** — Trigonométrie : quelles valeurs remarquables, quels angles associés, sous quelle forme ?
- **l1s-4** — Formule des probabilités totales « dans des cas simples » : taille de la partition.
- **l1s-5** — Exponentielle : les conséquences eˣ⁻ʸ = eˣ/eʸ et (eˣ)ⁿ = eⁿˣ sont-elles dans le point ?
- **l1s-6** — Linéarité de l'espérance : E(aX + b) seulement, ou aussi E(X + Y) ?
- **l1s-7** — Automatismes « privilégiant l'activité mentale » : bornent-ils les valeurs numériques ?

## Première spécialité (237 points, 232 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Fonctions connues : celles de seconde (affines, valeur absolue, carré, inverse, racine carrée, cube), plus les polynômes du second degré, les fonctions x ↦ xⁿ (n ∈ ℤ) et la fonction exponentielle. Pas de logarithme, pas de fonctions sinus et cosinus étudiées comme fonctions (terminale). — _BO 1re spé p.5-8_ (déduite)
- Dérivées : fonctions carré, cube, inverse, racine carrée, x ↦ xⁿ (n ∈ ℤ), t ↦ e^{at} (a réel) ; opérations somme, produit, inverse, quotient. C'est la liste du BO ; la seule composée écrite est t ↦ e^{at} (au-delà, question l1s-1). — _BO 1re spé p.7-8_ (BO)
- Les fonctions étudiées sont toutes régulières ; le nombre dérivé est introduit par la perception intuitive de la limite du taux de variation, sans définition formelle de la limite. — _BO 1re spé p.7_ (BO)
- Limites : aucune formalisation ; seulement une intuition sur des exemples (calculs numériques, algorithmes de seuil). Pas de calcul de limite de fonction : aucun contenu de limite de fonction n'est écrit au BO de 1re. — _BO 1re spé p.5-7_ (déduite)
- Suites : seules les suites arithmétiques et géométriques sont formalisées ; d'autres types simples peuvent être rencontrés sans aucune connaissance spécifique à leur sujet. — _BO 1re spé p.5_ (BO)
- Second degré : forme canonique déterminée dans des cas simples par complétion du carré (x² + 2ax = (x + a)² − a²) ; le calcul effectif de la forme canonique dans le cas général n'est pas un attendu. — _BO 1re spé p.5_ (BO)
- Trigonométrie : cercle trigonométrique, radian, cosinus et sinus d'un réel, valeurs remarquables. Pas d'équation ni d'inéquation trigonométrique, pas de formule d'addition. — _BO 1re spé p.8_ (déduite)
- Équations et inéquations avec l'exponentielle : seulement celles qui se ramènent à eᵘ = eᵛ ou eᵘ < eᵛ par la stricte croissance (u, v expressions connues) ; pas d'équation eˣ = k avec k > 0 quelconque, faute de logarithme (terminale). — _BO 1re spé p.8_ (déduite)
- Géométrie plane seulement ; en géométrie repérée, le plan est rapporté à un repère orthonormé. Pas de géométrie dans l'espace (terminale). — _BO 1re spé p.9_ (BO)
- Probabilités : univers finis et variables aléatoires réelles seulement ; répétition d'épreuves de Bernoulli limitée à n ⩽ 4 (pas de loi binomiale ni de coefficient binomial, qui sont de terminale). — _BO 1re spé p.10_ (déduite)
- Notations ensemblistes : ∅, ∈, ⊂, ∩, ∪, { … }, ensembles de nombres, intervalles ; complémentaire noté Ā ou E \ A ; Card(A) ; couple, produit cartésien. Les symboles ∀ et ∃ ne sont pas exigibles. — _BO 1re spé p.3-4_ (BO)
- Notation Δy/Δx pour un taux de variation et dy/dx pour une dérivée : peut être signalée et utilisée en liaison avec les autres disciplines, en adaptant les lettres au contexte (x = f(t), q = f(t)…). — _BO 1re spé p.7_ (BO)
- Algorithmique : langage naturel ou Python ; affectation notée « ← » en langage naturel ; seule notion nouvelle : la liste, sans aucun autre type de collection. — _BO 1re spé p.4_ (BO)

### Algorithmique et programmation > Notion de liste

- **1SPE-206** — Générer une liste en extension
  - Génération en extension (énumération des éléments). Listes seulement (pas d'autre type de collection) ; Python ou langage naturel. — _BO 1re spé p.4_ (BO)
- **1SPE-207** — Générer une liste en compréhension
  - Génération en compréhension, mise en lien avec la notion d'ensemble ; les conditions de la compréhension travaillent la logique. Listes seulement (pas d'autre type de collection) ; Python ou langage naturel. — _BO 1re spé p.4_ (BO)
- **1SPE-208** — Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices
  - Ajouter, supprimer des éléments, accéder par l'indice. Listes seulement (pas d'autre type de collection) ; Python ou langage naturel. — _BO 1re spé p.4_ (BO)
- **1SPE-209** — Parcourir une liste
  - Parcours d'une liste. Listes seulement (pas d'autre type de collection) ; Python ou langage naturel. — _BO 1re spé p.4_ (BO)
- **1SPE-210** — Itérer sur les éléments d'une liste
  - Itération sur les éléments d'une liste. Listes seulement (pas d'autre type de collection) ; Python ou langage naturel. — _BO 1re spé p.4_ (BO)
- **1SPE-367** — Générer une liste par ajouts successifs
  - Génération par ajouts successifs. Listes seulement (pas d'autre type de collection) ; Python ou langage naturel. — _BO 1re spé p.4_ (BO)

### Algèbre > Suites numériques, modèles discrets

- **1SPE-211** — Exemples de modes de génération d'une suite : explicite $u_n = f(n)$
  - Mode explicite uₙ = f(n), sur des exemples. — _BO 1re spé p.6_ (BO)
- **1SPE-212** — Notations : $u(n)$, $u_n$, $(u(n))$, $(u_n)$
  - Notations u(n), uₙ, (u(n)), (uₙ). — _BO 1re spé p.6_ (BO)
- **1SPE-213** — Suites arithmétiques : exemples, définition
  - Suite arithmétique : exemples et définition (uₙ₊₁ = uₙ + r). — _BO 1re spé p.6_ (BO)
- **1SPE-214** — Suites arithmétiques : lien avec l'étude d'évolutions successives à accroissements constants
  - Évolutions successives à accroissements constants. — _BO 1re spé p.6_ (BO)
- **1SPE-215** — Suites arithmétiques : calcul de $1 + 2 + \cdots + n$
  - Somme 1 + 2 + … + n seulement (démontrée au programme). — _BO 1re spé p.6_ (BO)
- **1SPE-216** — Suites géométriques : exemples, définition
  - Suite géométrique : exemples et définition (uₙ₊₁ = q·uₙ). — _BO 1re spé p.6_ (BO)
- **1SPE-217** — Suites géométriques : lien avec l'étude d'évolutions successives à taux constant
  - Évolutions successives à taux constant ; une évolution à taux fixe est modélisée par une suite géométrique, rapport de deux termes consécutifs. — _BO 1re spé p.5_ (BO)
- **1SPE-218** — Suites géométriques : calcul de $1 + q + \cdots + q^n$
  - Somme 1 + q + … + qⁿ seulement (démontrée au programme). — _BO 1re spé p.6_ (BO)
- **1SPE-219** — Sens de variation d'une suite
  - Sens de variation d'une suite (croissante, décroissante) ; méthodes non précisées par le BO. — _BO 1re spé p.6_ (BO)
- **1SPE-220** — Sur des exemples, introduction intuitive de la notion de limite, finie ou infinie, ou de l'absence de limite d'une suite
  - Sur des exemples, intuition de la limite (finie, infinie) ou de l'absence de limite ; toute formalisation exclue. — _BO 1re spé p.5-6_ (BO)
- **1SPE-221** — Passer d'un registre à l'autre pour une suite : de l'expression algébrique à la représentation graphique (nuage de points) et inversement
  - Registres langue naturelle, algébrique, graphique pour une suite, et passage de l'un à l'autre. — _BO 1re spé p.6_ (BO)
  - ⚠ libellé : le BO (p.6) dit « registre graphique » sans préciser « nuage de points » ; la précision du libellé est naturelle (une suite se représente par des points isolés) mais ne figure pas au texte.
  - → David (2026-10-23) : **laisser**
- **1SPE-222** — Déterminer une relation explicite pour une suite définie par un motif géométrique, par une question de dénombrement
  - Relation explicite pour une suite définie par un motif géométrique ou une question de dénombrement. — _BO 1re spé p.6_ (BO)
- **1SPE-223** — Calculer des termes d'une suite définie explicitement
  - Termes d'une suite définie explicitement. — _BO 1re spé p.6_ (BO)
- **1SPE-224** — Pour une suite arithmétique, calculer le terme général
  - Terme général d'une suite arithmétique. — _BO 1re spé p.6_ (BO)
- **1SPE-225** — Pour une suite géométrique, calculer le terme général
  - Terme général d'une suite géométrique. — _BO 1re spé p.6_ (BO)
- **1SPE-226** — Pour une suite arithmétique, calculer la somme de termes consécutifs
  - Somme de termes consécutifs d'une suite arithmétique, ramenée à 1 + 2 + … + n. — _BO 1re spé p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO ne donne que 1 + 2 + … + n (contenus et démonstrations p.6) ; la somme de termes consécutifs s'y ramène. La formule « nombre de termes × (premier + dernier) / 2 » n'est pas écrite.
- **1SPE-227** — Pour une suite géométrique, calculer la somme de termes consécutifs
  - Somme de termes consécutifs d'une suite géométrique, ramenée à 1 + q + … + qⁿ (q ≠ 1). — _BO 1re spé p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO ne donne que 1 + q + … + qⁿ (p.6) ; la somme de termes consécutifs s'y ramène.
- **1SPE-228** — Pour une suite arithmétique, déterminer le sens de variation
  - Sens de variation d'une suite arithmétique (signe de la raison). — _BO 1re spé p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : « déterminer le sens de variation » d'une suite arithmétique ; le critère du signe de r n'est pas écrit mais découle de la définition.
- **1SPE-229** — Pour une suite géométrique, déterminer le sens de variation
  - Sens de variation d'une suite géométrique (selon q et le signe du premier terme). — _BO 1re spé p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le critère sur q n'est pas écrit au BO (p.6).
- **1SPE-230** — Modéliser un phénomène discret à croissance linéaire par une suite arithmétique
  - Phénomène discret à croissance linéaire → suite arithmétique. — _BO 1re spé p.6_ (BO)
- **1SPE-231** — Conjecturer, dans des cas simples, la limite éventuelle d'une suite
  - Conjecture seulement, dans des cas simples (calculs numériques, algorithme de seuil) ; aucune démonstration de limite. — _BO 1re spé p.5-6_ (BO)
- **1SPE-232** — Calcul du terme général d'une suite arithmétique
  - Ce qui est démontré : l'expression du terme général d'une suite arithmétique ; pas plus. — _BO 1re spé p.6_ (BO)
- **1SPE-233** — Calcul du terme général d'une suite géométrique
  - Ce qui est démontré : l'expression du terme général d'une suite géométrique ; pas plus. — _BO 1re spé p.6_ (BO)
- **1SPE-234** — Calcul de $1 + 2 + \cdots + n$
  - Ce qui est démontré : 1 + 2 + … + n = n(n + 1)/2 ; pas plus. — _BO 1re spé p.6_ (BO)
- **1SPE-235** — Calcul de $1 + q + \cdots + q^n$
  - Ce qui est démontré : 1 + q + … + qⁿ = (1 − qⁿ⁺¹)/(1 − q) pour q ≠ 1 ; pas plus. — _BO 1re spé p.6_ (BO)
- **1SPE-236** — Calcul de termes d'une suite
  - Algorithme de calcul de termes d'une suite. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-237** — Calcul de seuil
  - Algorithme de seuil : premier rang à partir duquel uₙ dépasse (ou passe sous) une valeur ; pas de résolution algébrique de qⁿ > A (logarithme : terminale). — _BO 1re spé p.5-6_ (déduite)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3). Lecture déduite (texte implicite) : sans logarithme au programme, le seuil d'une suite géométrique ne se trouve que par algorithme ou calculs successifs.
- **1SPE-238** — Calcul de factorielle
  - Algorithme de calcul de n!. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-239** — Liste des premiers termes d'une suite : suites de Syracuse, suite de Fibonacci
  - Suites de Syracuse et de Fibonacci seulement. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-240** — Tour de Hanoï
  - Tour de Hanoï. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-241** — Somme des $n$ premiers carrés
  - Somme des n premiers carrés. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-242** — Remboursement d'un emprunt par annuités constantes
  - Emprunt remboursé par annuités constantes. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-368** — Exemples de modes de génération d'une suite : par une relation de récurrence $u_{n+1} = f(u_n)$
  - Relation de récurrence uₙ₊₁ = f(uₙ) (récurrence d'ordre 1), sur des exemples. — _BO 1re spé p.6_ (BO)
- **1SPE-369** — Exemples de modes de génération d'une suite : par un algorithme
  - Suite générée par un algorithme, sur des exemples (Python ou langage naturel). — _BO 1re spé p.6_ (BO)
- **1SPE-370** — Exemples de modes de génération d'une suite : par des motifs géométriques
  - Motifs géométriques ou combinatoires (nombres figurés, nombre d'éléments d'une configuration dépendant d'un entier naturel). — _BO 1re spé p.5_ (BO)
- **1SPE-371** — Suites arithmétiques : calcul du terme général
  - Terme général d'une suite arithmétique. — _BO 1re spé p.6_ (BO)
- **1SPE-372** — Suites arithmétiques : lien avec les fonctions affines
  - Lien suite arithmétique ↔ fonction affine (points alignés). — _BO 1re spé p.6_ (BO)
- **1SPE-373** — Suites géométriques : calcul du terme général
  - Terme général d'une suite géométrique. — _BO 1re spé p.6_ (BO)
- **1SPE-374** — Suites géométriques : lien avec la fonction exponentielle
  - Mise en parallèle évolution géométrique à temps discret / évolution exponentielle à temps continu. — _BO 1re spé p.5_ (BO)
- **1SPE-375** — Passer d'un registre à l'autre pour une suite : de l'énoncé en langage naturel à l'expression algébrique
  - Passage de l'énoncé en langue naturelle à l'expression algébrique d'une suite. — _BO 1re spé p.6_ (BO)
- **1SPE-376** — Déterminer une relation de récurrence pour une suite définie par un motif géométrique, par une question de dénombrement
  - Relation de récurrence pour une suite définie par un motif géométrique ou une question de dénombrement. — _BO 1re spé p.6_ (BO)
- **1SPE-377** — Calculer des termes d'une suite définie par récurrence
  - Termes d'une suite définie par une récurrence uₙ₊₁ = f(uₙ). — _BO 1re spé p.5-6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le seul mode de récurrence écrit au BO est uₙ₊₁ = f(uₙ) (p.5 et p.6) ; une récurrence d'ordre 2 n'apparaît qu'à travers la suite de Fibonacci, en exemple d'algorithme (1SPE-239).
- **1SPE-378** — Calculer des termes d'une suite définie par un algorithme
  - Termes d'une suite définie par un algorithme (Python ou langage naturel). — _BO 1re spé p.6_ (BO)
- **1SPE-379** — Modéliser un phénomène discret à croissance exponentielle par une suite géométrique
  - Phénomène discret à croissance exponentielle → suite géométrique (capital, population, décroissance radioactive). — _BO 1re spé p.5-6_ (BO)
- **1SPE-380** — Calcul de sommes de termes
  - Algorithme de calcul de sommes de termes. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-381** — Somme des $n$ premiers cubes
  - Somme des n premiers cubes. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-435** — Proposer, modéliser une situation permettant de générer une suite de nombres — _hérite des bornes générales_
  - ⚠ Point-compétence (modéliser) : « Proposer, modéliser une situation permettant de générer une suite de nombres » (BO p.6) ; aucun grain questionnable propre.

### Algèbre > Équations, fonctions polynômes du second degré

- **1SPE-243** — Forme développée d'une fonction polynôme du second degré ; coefficients
  - Forme développée réduite ax² + bx + c (a ≠ 0), nommée parmi les formes à choisir. — _BO 1re spé p.6_ (déduite)
  - ⚠ libellé : les contenus du BO (p.6) ne mentionnent pas « forme développée ; coefficients » ; seule la capacité « choisir une forme adaptée (développée réduite, canonique, factorisée) » nomme la forme développée. Lecture déduite (texte implicite) : forme ax² + bx + c, a ≠ 0.
  - → David (2026-10-23) : **laisser**
- **1SPE-244** — Fonction polynôme du second degré donnée sous forme factorisée ; racines
  - Forme factorisée a(x − x₁)(x − x₂) ; racines lues sur la forme factorisée. — _BO 1re spé p.6_ (BO)
- **1SPE-245** — Expression de la somme des racines
  - Somme des racines : x₁ + x₂ = −b/a. — _BO 1re spé p.6_ (BO)
- **1SPE-246** — Forme canonique d'une fonction polynôme du second degré
  - Forme canonique a(x − α)² + β ; obtenue dans des cas simples par complétion du carré x² + 2ax = (x + a)² − a² ; cas général non attendu. — _BO 1re spé p.5_ (BO)
  - ⚠ La frontière entre « cas simples » et « cas général » n'est pas écrite : question l1s-2.
- **1SPE-247** — Calcul des coordonnées du sommet d'une parabole
  - Sommet de la parabole lu sur la forme canonique (α ; β), ou obtenu par l'extrémum en lien avec la dérivation. — _BO 1re spé p.5-8_ (déduite)
  - ⚠ libellé : « calcul des coordonnées du sommet d'une parabole » n'est pas écrit dans le programme de 1re spé (BO p.5-8). Lecture déduite (texte implicite) : le sommet s'obtient par la forme canonique (p.5) ou par l'étude de l'extrémum (p.8) ; la formule α = −b/(2a) n'est pas écrite.
  - → David (2026-10-23) : **laisser**
- **1SPE-248** — Discriminant d'une fonction polynôme du second degré
  - Discriminant Δ = b² − 4ac. — _BO 1re spé p.6_ (BO)
- **1SPE-249** — Signe d'une fonction polynôme du second degré
  - Signe de ax² + bx + c selon Δ et le signe de a. — _BO 1re spé p.6_ (BO)
- **1SPE-250** — Résolution d'une inéquation du second degré
  - Inéquation du second degré ramenée au signe d'un polynôme du second degré. — _BO 1re spé p.6_ (déduite)
  - ⚠ libellé : la « résolution d'une inéquation du second degré » n'est pas un contenu du BO (p.6), qui dit « Signe » ; l'inéquation n'apparaît que dans la capacité « choisir une forme adaptée … (équation, inéquation, optimisation, variations) ». Lecture déduite (texte implicite) : inéquation se ramenant au signe d'un trinôme.
  - → David (2026-10-23) : **laisser**
- **1SPE-251** — Étudier le signe d'une fonction polynôme du second degré donnée sous forme factorisée
  - Polynôme donné sous forme factorisée a(x − x₁)(x − x₂) seulement ; signe par tableau de signes. — _BO 1re spé p.5-6_ (BO)
- **1SPE-252** — Déterminer les fonctions polynômes du second degré s'annulant en deux nombres réels distincts
  - Polynômes a(x − x₁)(x − x₂), a ≠ 0 quelconque, x₁ ≠ x₂ réels donnés. — _BO 1re spé p.6_ (BO)
- **1SPE-253** — Factoriser une fonction polynôme du second degré, en diversifiant les stratégies : racine évidente, détection des racines par leur somme et leur produit, identité remarquable, application des formules générales
  - Stratégies : racine évidente, racines détectées par leur somme et leur produit, identité remarquable, formules générales. Factorisation directe dans les cas qui s'y prêtent : racines apparentes, coefficient de x nul, racines entières trouvées mentalement. — _BO 1re spé p.5-6_ (BO)
- **1SPE-254** — Choisir une forme adaptée (développée réduite, canonique, factorisée) d'une fonction polynôme du second degré dans le cadre de la résolution d'un problème (équation, inéquation, optimisation, variations)
  - Trois formes : développée réduite, canonique, factorisée ; problèmes d'équation, d'inéquation, d'optimisation, de variations. — _BO 1re spé p.6_ (BO)
- **1SPE-255** — Résolution de l'équation du second degré
  - Ce qui est démontré : la résolution de ax² + bx + c = 0 (discriminant, racines réelles) ; pas plus. — _BO 1re spé p.6_ (BO)
- **1SPE-256** — Factorisation d'un polynôme du troisième degré admettant une racine
  - Polynôme du troisième degré dont une racine est connue (factorisation par x − x₀). — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-257** — Factorisation de $x^n - 1$ par $x - 1$, de $x^n - a^n$ par $x - a$
  - xⁿ − 1 par x − 1 et xⁿ − aⁿ par x − a seulement. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-258** — Déterminer deux nombres réels connaissant leur somme $s$ et leur produit $p$ comme racines de la fonction polynôme $x \mapsto x^2 - sx + p$
  - Deux réels de somme s et de produit p, racines de x² − sx + p. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-382** — Fonction polynôme du second degré donnée sous forme factorisée ; signe
  - Signe d'un polynôme du second degré donné sous forme factorisée. — _BO 1re spé p.6_ (BO)
- **1SPE-383** — Expression du produit des racines
  - Produit des racines : x₁x₂ = c/a. — _BO 1re spé p.6_ (BO)
- **1SPE-384** — Axe de symétrie d'une parabole
  - Axe de symétrie x = α, lu sur la forme canonique. — _BO 1re spé p.5_ (déduite)
  - ⚠ libellé : « axe de symétrie d'une parabole » n'est pas écrit dans le programme de 1re spé (BO p.5-8). Lecture déduite (texte implicite) : il se lit sur la forme canonique, en lien avec la position du graphe de x ↦ f(x − m) (p.5).
  - → David (2026-10-23) : **laisser**
- **1SPE-385** — Factorisation éventuelle
  - Factorisation a(x − x₁)(x − x₂) quand Δ ⩾ 0 ; pas de factorisation quand Δ < 0. — _BO 1re spé p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : « factorisation éventuelle » (p.6) signifie que la factorisation dépend du signe de Δ ; aucun nombre complexe en 1re.
- **1SPE-386** — Résolution d'une équation du second degré
  - Équation ax² + bx + c = 0 (a ≠ 0), solutions réelles ; aucun nombre complexe. — _BO 1re spé p.6_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO ne parle que de solutions réelles ; les complexes ne sont qu'en maths expertes.
- **1SPE-387** — Résolution de l'équation associée à un polynôme du troisième degré admettant une racine
  - Équation du troisième degré dont une racine est connue, ramenée au second degré. — _BO 1re spé p.6_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).

### Analyse > Dérivation

- **1SPE-259** — Taux de variation
  - Taux de variation (f(b) − f(a))/(b − a) ; notation Δy/Δx possible. — _BO 1re spé p.7_ (BO)
- **1SPE-260** — Nombre dérivé d'une fonction en un point, comme limite du taux de variation ; notation $f'(a)$
  - Nombre dérivé comme limite intuitive du taux de variation, sans définition formelle ; notation f′(a). Calcul algébrique du taux dans les cas qui s'y prêtent : second degré, fonction inverse. — _BO 1re spé p.7_ (BO)
- **1SPE-261** — Tangente à la courbe représentative d'une fonction en un point, comme « limite des sécantes » ; pente
  - Tangente comme « limite des sécantes » ; pente f′(a). — _BO 1re spé p.7_ (BO)
- **1SPE-262** — Approximation linéaire : fonction affine tangente $x \mapsto f(a) + f'(a)(x - a)$
  - Fonction affine tangente x ↦ f(a) + f′(a)(x − a). — _BO 1re spé p.7_ (BO)
- **1SPE-263** — Fonction dérivable sur un intervalle ; fonction dérivée
  - Fonction dérivable sur un intervalle, fonction dérivée ; fonctions régulières seulement. — _BO 1re spé p.7_ (BO)
- **1SPE-264** — Fonction dérivée de la fonction carré
  - (x²)′ = 2x. — _BO 1re spé p.7_ (BO)
- **1SPE-265** — Opérations sur les fonctions dérivables : somme
  - (u + v)′ = u′ + v′ (et (ku)′ = ku′). — _BO 1re spé p.7_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le produit par une constante n'est pas nommé dans la liste « somme, produit, inverse, quotient » (p.7) ; il découle du produit par une fonction constante.
- **1SPE-266** — Pour $n$ dans $\mathbb{Z}$, fonction dérivée de la fonction $x \mapsto x^n$
  - (xⁿ)′ = nxⁿ⁻¹ pour n ∈ ℤ (x ≠ 0 si n < 0) ; exposants entiers seulement. — _BO 1re spé p.7_ (BO)
- **1SPE-267** — Fonction valeur absolue : étude de la dérivabilité en 0
  - Fonction valeur absolue en 0 seulement. — _BO 1re spé p.7_ (BO)
- **1SPE-268** — Calculer un taux de variation
  - Taux de variation d'une fonction connue entre deux valeurs. — _BO 1re spé p.7_ (BO)
- **1SPE-269** — Interpréter le nombre dérivé en contexte : pente d'une tangente, vitesse instantanée, cout marginal, etc.
  - Contextes : pente d'une tangente, vitesse instantanée, coût marginal, etc. — _BO 1re spé p.7_ (BO)
- **1SPE-270** — Déterminer graphiquement un nombre dérivé par la pente de la tangente
  - Lecture graphique du nombre dérivé par la pente de la tangente tracée. — _BO 1re spé p.7_ (BO)
- **1SPE-271** — Construire la tangente en un point à une courbe représentative connaissant le nombre dérivé
  - Tracé de la tangente en un point, le nombre dérivé étant connu. — _BO 1re spé p.7_ (BO)
- **1SPE-272** — Déterminer l'équation de la tangente en un point à la courbe représentative d'une fonction
  - y = f(a) + f′(a)(x − a), f dérivée à l'aide des dérivées et opérations du programme. — _BO 1re spé p.7_ (BO)
- **1SPE-273** — Calculer une valeur approchée de $f(a + h)$
  - f(a + h) ≈ f(a) + f′(a)h. — _BO 1re spé p.7_ (BO)
- **1SPE-274** — Dans des cas simples, calculer une fonction dérivée en utilisant les propriétés des opérations sur les fonctions dérivables
  - Cas simples ; dérivées et opérations du programme seulement (somme, produit, inverse, quotient, xⁿ pour n ∈ ℤ, √x, e^{at}). — _BO 1re spé p.7-8_ (BO)
  - ⚠ Le BO nouveau ne contient aucune dérivée de composée hors t ↦ e^{at} : faut-il refuser √(ax + b), (ax + b)ⁿ ? Question l1s-1.
- **1SPE-275** — Équation de la tangente en un point à une courbe représentative
  - Ce qui est démontré : l'équation y = f(a) + f′(a)(x − a) de la tangente ; pas plus. — _BO 1re spé p.8_ (BO)
- **1SPE-276** — La fonction racine carrée n'est pas dérivable en 0
  - Ce qui est démontré : la fonction racine carrée n'est pas dérivable en 0 (taux de variation non borné) ; pas plus. — _BO 1re spé p.8_ (BO)
- **1SPE-277** — Fonction dérivée de la fonction carrée
  - Ce qui est démontré : (x²)′ = 2x ; pas plus. — _BO 1re spé p.8_ (BO)
- **1SPE-278** — Fonction dérivée d'un produit
  - Ce qui est démontré : (uv)′ = u′v + uv′ ; pas plus. — _BO 1re spé p.8_ (BO)
- **1SPE-279** — Écrire la liste des coefficients directeurs des sécantes pour un pas donné
  - Liste (Python) des coefficients directeurs des sécantes pour un pas donné. — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-388** — Sécantes à la courbe représentative d'une fonction en un point donné
  - Sécante à la courbe en un point donné ; sa pente est le taux de variation. — _BO 1re spé p.7_ (BO)
- **1SPE-389** — Équation : la tangente à la courbe représentative de $f$ au point d'abscisse $a$ est la droite d'équation $y = f(a) + f'(a)(x - a)$
  - Équation de la tangente y = f(a) + f′(a)(x − a). — _BO 1re spé p.7_ (BO)
- **1SPE-390** — Approximation linéaire : approximation de $f(a + h)$ par $f(a) + f'(a)h$
  - Approximation f(a + h) ≈ f(a) + f′(a)h ; exemples du BO : a = 1 avec carré, inverse, racine carrée. — _BO 1re spé p.7_ (BO)
- **1SPE-391** — Fonction dérivée de la fonction cube
  - (x³)′ = 3x². — _BO 1re spé p.7_ (BO)
- **1SPE-392** — Fonction dérivée de la fonction inverse
  - (1/x)′ = −1/x² sur ]−∞ ; 0[ et ]0 ; +∞[. — _BO 1re spé p.7_ (BO)
- **1SPE-393** — Fonction dérivée de la fonction racine carrée
  - (√x)′ = 1/(2√x) sur ]0 ; +∞[. — _BO 1re spé p.7_ (BO)
- **1SPE-394** — Opérations sur les fonctions dérivables : produit
  - (uv)′ = u′v + uv′. — _BO 1re spé p.7_ (BO)
- **1SPE-395** — Opérations sur les fonctions dérivables : inverse
  - (1/v)′ = −v′/v², v ne s'annulant pas. — _BO 1re spé p.7_ (BO)
- **1SPE-396** — Opérations sur les fonctions dérivables : quotient
  - (u/v)′ = (u′v − uv′)/v², v ne s'annulant pas. — _BO 1re spé p.7_ (BO)
- **1SPE-397** — Calculer la pente d'une sécante
  - Pente d'une sécante. — _BO 1re spé p.7_ (BO)
- **1SPE-398** — Fonction dérivée de la fonction inverse
  - Ce qui est démontré : (1/x)′ = −1/x² ; pas plus. — _BO 1re spé p.8_ (BO)

### Analyse > Fonction exponentielle

- **1SPE-289** — Définition de la fonction exponentielle comme unique fonction dérivable sur $\mathbb{R}$ vérifiant $f' = f$ et $f(0) = 1$ (existence et unicité admises) ; notation $\exp(x)$
  - exp : unique fonction dérivable sur ℝ telle que f′ = f et f(0) = 1, existence et unicité admises ; notation exp(x). — _BO 1re spé p.8_ (BO)
- **1SPE-290** — Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$
  - exp(x + y) = exp(x)exp(y). — _BO 1re spé p.8_ (BO)
- **1SPE-291** — Nombre $e$ ; notation $e^x$
  - Nombre e = exp(1) ; notation eˣ. — _BO 1re spé p.8_ (BO)
- **1SPE-292** — Signe de la fonction exponentielle
  - eˣ > 0 pour tout réel x. — _BO 1re spé p.8_ (BO)
- **1SPE-293** — Lien avec les suites géométriques
  - Lien avec les suites géométriques (évolution discrète / continue). — _BO 1re spé p.7-8_ (BO)
- **1SPE-294** — Transformer une expression en utilisant les propriétés algébriques de la fonction exponentielle
  - Propriétés algébriques de l'exponentielle (exp(x + y) = exp(x)exp(y), exp(x)exp(−x) = 1). — _BO 1re spé p.8_ (BO)
  - ⚠ Le BO n'écrit que deux propriétés ; les conséquences eˣ⁻ʸ = eˣ/eʸ et (eˣ)ⁿ = eⁿˣ sont-elles dans le point ? Question l1s-5.
- **1SPE-295** — Pour $a$ réel, dérivée de la fonction $t \mapsto e^{at}$
  - (e^{at})′ = a·e^{at}, a réel. — _BO 1re spé p.8_ (BO)
- **1SPE-296** — Pour une valeur numérique strictement positive de $k$, représenter graphiquement la fonction $t \mapsto e^{-kt}$
  - t ↦ e^{−kt} pour une valeur numérique k > 0. — _BO 1re spé p.8_ (BO)
- **1SPE-297** — Modéliser une situation par une croissance, une décroissance exponentielle (évolution d'un capital à taux fixe, décroissance radioactive)
  - Croissance ou décroissance exponentielle (capital à taux fixe, décroissance radioactive, dilution). — _BO 1re spé p.7-8_ (BO)
- **1SPE-298** — Construction de l'exponentielle par la méthode d'Euler
  - Méthode d'Euler pour construire l'exponentielle. — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-299** — Détermination d'une valeur approchée de $e$ à l'aide de la suite $\left(\left(1 + \tfrac{1}{n}\right)^n\right)$
  - Valeur approchée de e par la suite ((1 + 1/n)ⁿ). — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-300** — Unicité d'une fonction $f$ dérivable sur $\mathbb{R}$ vérifiant $f' = f$ et $f(0) = 1$
  - Ce qui est démontré : l'unicité d'une fonction dérivable sur ℝ telle que f′ = f et f(0) = 1 ; pas plus. — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-301** — Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$
  - Ce qui est démontré : exp(x + y) = exp(x)exp(y) ; pas plus. — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3). Même énoncé que 1SPE-290 (connaissance), ici à démontrer.
- **1SPE-302** — La fonction exponentielle est strictement positive et croissante
  - Ce qui est démontré : exp strictement positive et croissante ; pas plus. — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-404** — $\exp(x)\exp(-x) = 1$
  - exp(x)exp(−x) = 1. — _BO 1re spé p.8_ (BO)
- **1SPE-405** — Sens de variation de la fonction exponentielle
  - exp strictement croissante sur ℝ. — _BO 1re spé p.8_ (BO)
- **1SPE-406** — Courbe représentative de la fonction exponentielle
  - Courbe de la fonction exponentielle. — _BO 1re spé p.8_ (BO)
- **1SPE-407** — Pour une valeur numérique strictement positive de $k$, représenter graphiquement la fonction $t \mapsto e^{kt}$
  - t ↦ e^{kt} pour une valeur numérique k > 0. — _BO 1re spé p.8_ (BO)

### Analyse > Trigonométrie

- **1SPE-303** — Cercle trigonométrique
  - Cercle trigonométrique (cercle de centre O, de rayon 1, orienté), en repère orthonormé. — _BO 1re spé p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : la définition du cercle trigonométrique n'est pas écrite au BO (p.8).
- **1SPE-304** — Enroulement de la droite sur le cercle trigonométrique ; image d'un nombre réel
  - Image sur le cercle de tout nombre réel par enroulement de la droite. — _BO 1re spé p.8_ (BO)
- **1SPE-305** — Cosinus et sinus d'un nombre réel ; lien avec le sinus et le cosinus dans un triangle rectangle
  - cos x et sin x d'un réel x ; lien avec cosinus et sinus dans le triangle rectangle. — _BO 1re spé p.8_ (BO)
- **1SPE-306** — Placer un point sur le cercle trigonométrique
  - Point image d'un réel sur le cercle trigonométrique. — _BO 1re spé p.8_ (BO)
  - ⚠ Les réels à placer ne sont pas bornés par le BO ; voir question l1s-3 (valeurs remarquables et angles associés).
- **1SPE-307** — Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de $x$, les cosinus et sinus d'angles associés à $x$
  - Lecture du cercle ; valeurs remarquables de x et angles associés à x. — _BO 1re spé p.8_ (BO)
  - ⚠ Quels angles associés (−x, π − x, π + x, π/2 − x…) et sous quelle forme (valeurs numériques ou formules littérales) : question l1s-3.
- **1SPE-308** — Calcul de $\cos\left(\tfrac{\pi}{4}\right)$, $\sin\left(\tfrac{\pi}{4}\right)$
  - Ce qui est démontré : cos(π/4) = sin(π/4) = √2/2 ; pas plus. — _BO 1re spé p.8_ (BO)
- **1SPE-309** — Approximation de $\pi$ par la méthode d'Archimède
  - Approximation de π par la méthode d'Archimède. — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-408** — Longueur d'arc
  - Longueur d'arc sur le cercle trigonométrique (rayon 1). — _BO 1re spé p.8_ (BO)
- **1SPE-409** — Radian
  - Radian ; conversion degrés ↔ radians. — _BO 1re spé p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : la conversion degrés ↔ radians n'est pas écrite, mais le lien avec le triangle rectangle (angles en degrés au collège) la suppose.
- **1SPE-410** — Cosinus et sinus d'un nombre réel : valeurs remarquables
  - Valeurs remarquables de cos et sin. — _BO 1re spé p.8_ (BO)
  - ⚠ Le BO ne liste pas les valeurs remarquables ni les angles associés : question l1s-3.
- **1SPE-411** — Calcul de $\cos\left(\tfrac{\pi}{3}\right)$, $\sin\left(\tfrac{\pi}{3}\right)$
  - Ce qui est démontré : cos(π/3) = 1/2, sin(π/3) = √3/2 ; pas plus. — _BO 1re spé p.8_ (BO)

### Analyse > Variations et courbes représentatives des fonctions

- **1SPE-280** — Représentation algébrique de fonctions paires, impaires
  - Parité : f(−x) = f(x) (paire), f(−x) = −f(x) (impaire), sur un domaine symétrique. — _BO 1re spé p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO écrit « représentation algébrique … de fonctions paires, impaires » (p.8) sans donner les égalités ; la condition de domaine symétrique est sous-entendue.
- **1SPE-281** — Lien entre le sens de variation d'une fonction dérivable sur un intervalle et le signe de sa fonction dérivée
  - Fonction dérivable sur un intervalle : sens de variation ↔ signe de la dérivée. — _BO 1re spé p.8_ (BO)
- **1SPE-282** — Nombre dérivé en un extrémum, tangente à la courbe représentative
  - En un extrémum (intérieur à l'intervalle), nombre dérivé nul, tangente horizontale. — _BO 1re spé p.8_ (BO)
- **1SPE-283** — Étudier les variations d'une fonction
  - Fonctions dérivables à l'aide des dérivées et opérations du programme ; variations par le signe de la dérivée. — _BO 1re spé p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : la capacité « étudier les variations d'une fonction » (p.8) ne liste pas les fonctions ; elles sont bornées par ce que l'élève sait dériver (bornes générales).
- **1SPE-284** — Résoudre un problème d'optimisation — _hérite des bornes générales_
  - ⚠ Point-compétence (modéliser, résoudre un problème) : « Résoudre un problème d'optimisation » (BO p.8) ; les fonctions en jeu restent bornées par les bornes générales.
- **1SPE-285** — Exploiter les variations d'une fonction pour établir une inégalité
  - Inégalité établie par l'étude des variations d'une fonction (signe d'une différence). — _BO 1re spé p.8_ (BO)
- **1SPE-286** — Étudier la position relative de deux courbes représentatives
  - Position relative de deux courbes par le signe de la différence f − g. — _BO 1re spé p.8_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : la méthode (signe de f − g) n'est pas écrite ; elle est déjà celle de la seconde.
- **1SPE-287** — Étudier, en lien avec la dérivation, une fonction polynôme du second degré : variations
  - Polynôme du second degré : variations par la dérivée. — _BO 1re spé p.8_ (BO)
- **1SPE-288** — Méthode de Newton, en se limitant à des cas favorables
  - Méthode de Newton, cas favorables seulement. — _BO 1re spé p.8_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-399** — Représentation graphique de fonctions paires, impaires ; traduction géométrique
  - Traduction géométrique : symétrie par rapport à l'axe des ordonnées (paire), par rapport à l'origine (impaire). — _BO 1re spé p.8_ (BO)
- **1SPE-400** — Caractérisation des fonctions constantes
  - f constante sur un intervalle ⟺ f′ nulle sur cet intervalle. — _BO 1re spé p.8_ (BO)
- **1SPE-401** — Déterminer les extrémums
  - Extrémums d'une fonction dérivable sur un intervalle, à l'aide des variations. — _BO 1re spé p.8_ (BO)
- **1SPE-402** — Étudier, en lien avec la dérivation, une fonction polynôme du second degré : extrémum
  - Polynôme du second degré : extrémum. — _BO 1re spé p.8_ (BO)
- **1SPE-403** — Étudier, en lien avec la dérivation, une fonction polynôme du second degré : allure selon le signe du coefficient de $x^2$
  - Polynôme du second degré : allure (parabole tournée vers le haut ou le bas) selon le signe du coefficient de x². — _BO 1re spé p.8_ (BO)

### Automatismes > Fonctions et représentations

- **1SPE-432** — Déterminer graphiquement le signe d'une fonction
  - Lecture graphique du signe d'une fonction sur sa courbe. — _BO 1re spé p.5_ (BO)
  - La puce du BO (p.5) ajoute « ou son tableau de variations » : cette partie est portée par 2-349 (« Relier représentation graphique et tableau de variations »), que les automatismes de 1re référencent.
- **1SPE-433** — Tracer une droite donnée par un point et son coefficient directeur
  - Droite donnée par un point et son coefficient directeur, tracée dans un repère. — _BO 1re spé p.5_ (BO)
  - La puce du BO (p.5) dit aussi « par son équation réduite » : cette partie est portée par 2-316 (« Tracer une droite connaissant son équation réduite »), que les automatismes de 1re référencent.
- **1SPE-434** — Déterminer le coefficient directeur d'une droite à partir des coordonnées de deux de ses points
  - Coefficient directeur (yB − yA)/(xB − xA) à partir des coordonnées de deux points (xA ≠ xB). — _BO 1re spé p.5_ (BO)

### Géométrie > Calcul vectoriel et produit scalaire

- **1SPE-310** — Produit scalaire à partir de la projection orthogonale
  - Produit scalaire par la projection orthogonale. — _BO 1re spé p.9_ (BO)
- **1SPE-311** — Caractérisation de l'orthogonalité
  - u et v orthogonaux ⟺ u·v = 0. — _BO 1re spé p.9_ (BO)
- **1SPE-312** — Produit scalaire : bilinéarité
  - Bilinéarité du produit scalaire. — _BO 1re spé p.9_ (BO)
- **1SPE-313** — En base orthonormée, expression du produit scalaire
  - En base orthonormée : u·v = xx′ + yy′. — _BO 1re spé p.9_ (BO)
- **1SPE-314** — Expression des coordonnées dans une base orthonormée en termes de produits scalaires avec les vecteurs de la base
  - Coordonnées x = u·i, y = u·j dans une base orthonormée (i, j). — _BO 1re spé p.9_ (BO)
- **1SPE-315** — Développement de $\lVert\vec{u} + \vec{v}\rVert^2$
  - ‖u + v‖² = ‖u‖² + 2u·v + ‖v‖². — _BO 1re spé p.9_ (BO)
- **1SPE-316** — Formule d'Al-Kashi
  - Formule d'Al-Kashi. — _BO 1re spé p.9_ (BO)
- **1SPE-317** — Transformation de l'expression $\vec{MA} \cdot \vec{MB}$
  - Transformation de MA·MB (par le milieu I de [AB] : MA·MB = MI² − AB²/4). — _BO 1re spé p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO (p.9) ne donne pas la forme transformée ; MI² − IA² est la transformation classique, en lien avec la démonstration 1SPE-323.
- **1SPE-318** — Utiliser le produit scalaire pour démontrer une orthogonalité
  - Orthogonalité démontrée par un produit scalaire nul, dans le plan. — _BO 1re spé p.9_ (BO)
- **1SPE-319** — Utiliser le produit scalaire pour calculer un angle
  - Angle obtenu par cos(u, v) = u·v / (‖u‖‖v‖), dans le plan. — _BO 1re spé p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : la formule n'est pas écrite ; elle découle de la formule avec le cosinus.
- **1SPE-320** — Utiliser le produit scalaire pour calculer une longueur dans le plan
  - Longueur dans le plan (Al-Kashi, développement de ‖u ± v‖²). — _BO 1re spé p.9_ (BO)
- **1SPE-321** — En vue de la résolution d'un problème, calculer le produit scalaire de deux vecteurs en choisissant une méthode adaptée (projection orthogonale, coordonnées, normes et angle, normes)
  - Quatre méthodes : projection orthogonale, coordonnées, normes et angle, normes seules. — _BO 1re spé p.9_ (BO)
- **1SPE-322** — Formule d'Al-Kashi (démonstration avec le produit scalaire)
  - Ce qui est démontré : la formule d'Al-Kashi, par le produit scalaire ; pas plus. — _BO 1re spé p.9_ (BO)
- **1SPE-323** — Ensemble des points $M$ tels que $\vec{MA} \cdot \vec{MB} = 0$ (démonstration avec le produit scalaire)
  - Ce qui est démontré : l'ensemble des points M tels que MA·MB = 0 est le cercle de diamètre [AB] ; pas plus. — _BO 1re spé p.9_ (BO)
- **1SPE-324** — Loi des sinus
  - Loi des sinus. — _BO 1re spé p.9_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-325** — Concourance des hauteurs d'un triangle
  - Concourance des hauteurs d'un triangle. — _BO 1re spé p.9_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-326** — Les médianes d'un triangle concourent au centre de gravité
  - Concourance des médianes au centre de gravité. — _BO 1re spé p.9_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-412** — Produit scalaire à partir de la formule avec le cosinus
  - u·v = ‖u‖‖v‖cos(u, v). — _BO 1re spé p.9_ (BO)
- **1SPE-413** — Produit scalaire : symétrie
  - Symétrie u·v = v·u. — _BO 1re spé p.9_ (BO)
- **1SPE-414** — En base orthonormée, expression de la norme
  - En base orthonormée : ‖u‖ = √(x² + y²). — _BO 1re spé p.9_ (BO)
- **1SPE-415** — En base orthonormée, critère d'orthogonalité
  - En base orthonormée : xx′ + yy′ = 0. — _BO 1re spé p.9_ (BO)
- **1SPE-416** — Développement de $\lVert\vec{u} - \vec{v}\rVert^2$
  - ‖u − v‖² = ‖u‖² − 2u·v + ‖v‖². — _BO 1re spé p.9_ (BO)
- **1SPE-436** — Utiliser le produit scalaire pour résoudre un problème géométrique — _hérite des bornes générales_
  - ⚠ Point-compétence (résoudre un problème géométrique) : « Utiliser le produit scalaire pour résoudre un problème géométrique » (BO p.9) ; aucun grain questionnable propre, plan seulement.

### Géométrie > Géométrie repérée

- **1SPE-327** — Vecteur normal à une droite
  - Vecteur normal à une droite du plan, en repère orthonormé. — _BO 1re spé p.9_ (BO)
- **1SPE-328** — Projection orthogonale d'un point sur une droite
  - Projeté orthogonal d'un point sur une droite du plan. — _BO 1re spé p.9_ (BO)
- **1SPE-329** — Équation de cercle
  - Équation de cercle (x − a)² + (y − b)² = r² en repère orthonormé. — _BO 1re spé p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO dit « équation de cercle » sans la forme ; la forme centre-rayon découle de la capacité « cercle donné par son centre et son rayon ».
- **1SPE-330** — Déterminer une équation cartésienne d'une droite connaissant un point et un vecteur normal
  - Droite donnée par un point et un vecteur normal ; équation ax + by + c = 0. — _BO 1re spé p.9_ (BO)
- **1SPE-331** — Déterminer les coordonnées du projeté orthogonal d'un point sur une droite
  - Coordonnées du projeté orthogonal d'un point sur une droite, en repère orthonormé. — _BO 1re spé p.9_ (BO)
- **1SPE-332** — Déterminer l'équation d'un cercle donné par son centre et son rayon
  - Cercle donné par son centre et son rayon. — _BO 1re spé p.9_ (BO)
- **1SPE-333** — Reconnaitre une équation de cercle
  - Reconnaître qu'une équation x² + y² + αx + βy + γ = 0 est celle d'un cercle (par complétion des carrés). — _BO 1re spé p.9_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : la forme développée de l'équation n'est pas écrite au BO (p.9) ; la reconnaissance passe par la complétion du carré vue en second degré.
- **1SPE-334** — Recherche de l'ensemble des points équidistants de l'axe des abscisses et d'un point donné
  - Points équidistants de l'axe des abscisses et d'un point donné (parabole). — _BO 1re spé p.9_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-335** — Déterminer l'intersection d'un cercle avec une droite parallèle à un axe
  - Cercle et droite parallèle à un axe seulement. — _BO 1re spé p.9_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-417** — Le vecteur de coordonnées $(a\,;\,b)$ est normal à la droite d'équation $ax + by + c = 0$
  - (a ; b) normal à la droite ax + by + c = 0. — _BO 1re spé p.9_ (BO)
- **1SPE-418** — Utiliser l'équation d'un cercle donné par son centre et son rayon
  - Utilisation de l'équation d'un cercle donné par son centre et son rayon (appartenance d'un point…). — _BO 1re spé p.9_ (BO)
- **1SPE-419** — Équation de cercle : déterminer centre et rayon
  - Centre et rayon à partir d'une équation de cercle. — _BO 1re spé p.9_ (BO)
- **1SPE-420** — Déterminer l'intersection d'une parabole d'équation $y = ax^2 + bx + c$ avec une droite parallèle à un axe
  - Parabole y = ax² + bx + c et droite parallèle à un axe seulement. — _BO 1re spé p.9_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-437** — Utiliser un repère pour étudier une configuration — _hérite des bornes générales_
  - ⚠ Point-compétence (choisir un cadre) : « Utiliser un repère pour étudier une configuration » (BO p.9) ; aucun grain questionnable propre, plan en repère orthonormé.

### Probabilités et statistiques > Expérimentations

- **1SPE-362** — Simuler une variable aléatoire avec Python ou un tableur
  - Simulation avec Python ou un tableur. — _BO 1re spé p.11_ (BO)
- **1SPE-363** — Lire, comprendre et écrire une fonction Python renvoyant la moyenne d'un échantillon de taille $n$ d'une variable aléatoire
  - Fonction Python renvoyant la moyenne d'un échantillon de taille n. — _BO 1re spé p.11_ (BO)
- **1SPE-364** — Sur des exemples, calculer l'écart entre la moyenne d'un échantillon simulé de taille $n$ d'une variable aléatoire et l'espérance de cette variable aléatoire
  - Sur des exemples, distance entre la moyenne d'un échantillon simulé de taille n et l'espérance. — _BO 1re spé p.11_ (BO)
  - ⚠ libellé : le BO (p.11) dit « Étudier sur des exemples la distance … », le libellé dit « calculer l'écart ».
  - → David (2026-10-23) : **laisser**
- **1SPE-365** — Simuler, avec Python ou un tableur, $N$ échantillons de taille $n$ d'une variable aléatoire d'espérance $\mu$ et d'écart type $\sigma$ ; si $m$ désigne la moyenne d'un échantillon, calculer la proportion des cas où l'écart entre $m$ et $\mu$ est inférieur ou égal à $\tfrac{2\sigma}{\sqrt{n}}$
  - N échantillons de taille n simulés (Python ou tableur) ; proportion des cas où |m − μ| ⩽ 2σ/√n. — _BO 1re spé p.11_ (BO)

### Probabilités et statistiques > Probabilités conditionnelles et indépendance

- **1SPE-336** — Indépendance de deux évènements
  - A et B indépendants : P_B(A) = P(A) (P(B) ≠ 0), soit P(A ∩ B) = P(A)P(B). — _BO 1re spé p.10_ (BO)
- **1SPE-337** — Partition de l'univers (systèmes complets d'évènements)
  - Partition de l'univers (système complet d'évènements), univers fini. — _BO 1re spé p.10_ (BO)
- **1SPE-338** — Succession de deux épreuves indépendantes
  - Succession de deux épreuves indépendantes seulement. — _BO 1re spé p.10_ (BO)
- **1SPE-339** — Pour $n \leqslant 4$, répétition de $n$ épreuves de Bernoulli indépendantes et identiques
  - n ⩽ 4 épreuves de Bernoulli indépendantes et identiques. — _BO 1re spé p.10_ (BO)
- **1SPE-340** — Dans des cas simples, calculer une probabilité à l'aide de la formule des probabilités totales
  - Cas simples de la formule des probabilités totales. — _BO 1re spé p.10_ (BO)
  - ⚠ « Cas simples » n'est pas défini (taille de la partition) : question l1s-4.
- **1SPE-341** — Savoir utiliser l'indépendance de deux évènements
  - Utiliser l'indépendance de deux évènements (pas plus de deux). — _BO 1re spé p.10_ (BO)
- **1SPE-342** — Représenter la succession de deux épreuves indépendantes par un arbre
  - Arbre pour deux épreuves indépendantes. — _BO 1re spé p.10_ (BO)
- **1SPE-343** — Pour $n \leqslant 4$, représenter l'arbre associé à la répétition de $n$ épreuves de Bernoulli indépendantes et identiques
  - Arbre de n ⩽ 4 épreuves de Bernoulli indépendantes et identiques. — _BO 1re spé p.10_ (BO)
- **1SPE-344** — Méthode de Monte-Carlo : estimation de l'aire sous la parabole
  - Monte-Carlo : aire sous la parabole. — _BO 1re spé p.10_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-345** — Exemples de succession de plusieurs épreuves indépendantes
  - Plusieurs épreuves indépendantes (au-delà de deux), sur des exemples. — _BO 1re spé p.10_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-346** — Exemples de marches aléatoires
  - Marches aléatoires, sur des exemples. — _BO 1re spé p.10_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-421** — Formule des probabilités totales
  - Formule des probabilités totales relative à une partition de l'univers. — _BO 1re spé p.10_ (BO)
- **1SPE-422** — Succession de deux épreuves indépendantes : représentation par un arbre
  - Deux épreuves indépendantes, représentation par un arbre. — _BO 1re spé p.10_ (BO)
- **1SPE-423** — Succession de deux épreuves indépendantes : représentation par un tableau
  - Deux épreuves indépendantes, représentation par un tableau. — _BO 1re spé p.10_ (BO)
- **1SPE-424** — Savoir justifier l'indépendance de deux évènements
  - Justifier l'indépendance de deux évènements (P(A ∩ B) = P(A)P(B) ou P_B(A) = P(A)). — _BO 1re spé p.10_ (BO)
- **1SPE-425** — Représenter la succession de deux épreuves indépendantes par un tableau
  - Tableau pour deux épreuves indépendantes. — _BO 1re spé p.10_ (BO)
- **1SPE-426** — Pour $n \leqslant 4$, calculer des probabilités associées à la répétition de $n$ épreuves de Bernoulli indépendantes et identiques
  - Probabilités lues sur l'arbre de n ⩽ 4 épreuves de Bernoulli. — _BO 1re spé p.10_ (BO)
  - Pas de loi binomiale ni de coefficient binomial. — _BO 1re spé p.10_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : le BO de 1re limite à n ⩽ 4 et passe par l'arbre (p.10) ; la loi binomiale et les coefficients binomiaux n'y figurent pas (programme de terminale).
- **1SPE-427** — Méthode de Monte-Carlo : estimation du nombre $\pi$
  - Monte-Carlo : estimation de π. — _BO 1re spé p.10_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).

### Probabilités et statistiques > Variables aléatoires réelles

- **1SPE-347** — Variable aléatoire réelle : modélisation du résultat numérique d'une expérience aléatoire ; formalisation comme fonction définie sur l'univers et à valeurs réelles
  - Variable aléatoire réelle sur un univers fini, fonction de l'univers dans ℝ. — _BO 1re spé p.10_ (BO)
- **1SPE-348** — Loi d'une variable aléatoire
  - Loi d'une variable aléatoire à valeurs en nombre fini. — _BO 1re spé p.10_ (BO)
- **1SPE-349** — Espérance d'une variable aléatoire
  - Espérance E(X) = Σ xᵢ P(X = xᵢ). — _BO 1re spé p.10_ (BO)
- **1SPE-350** — Variance, écart type d'une variable aléatoire
  - Variance V(X) = E((X − E(X))²), écart type σ(X) = √V(X). — _BO 1re spé p.10_ (BO)
- **1SPE-351** — Linéarité de l'espérance
  - Linéarité de l'espérance. — _BO 1re spé p.10_ (BO)
  - ⚠ Le BO dit « linéarité de l'espérance » sans préciser : E(aX + b) seulement, ou aussi E(X + Y) (sommes de variables aléatoires : terminale) ? Question l1s-6.
- **1SPE-352** — Formule de König-Huygens
  - V(X) = E(X²) − E(X)². — _BO 1re spé p.10_ (BO)
- **1SPE-353** — Interpréter en situation les notations $\{X = a\}$, $\{X \leqslant a\}$, $P(X = a)$, $P(X \leqslant a)$
  - Notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a), interprétées en situation. — _BO 1re spé p.11_ (BO)
- **1SPE-354** — Définir une variable aléatoire modélisant une situation et donner ses valeurs possibles
  - Modélisation d'une situation par une variable aléatoire réelle (univers fini). — _BO 1re spé p.11_ (BO)
  - ⚠ libellé : le BO (p.11) dit « Modéliser une situation à l'aide d'une variable aléatoire » ; « définir … et donner ses valeurs possibles » est une reformulation qui n'est pas au texte.
  - → David (2026-10-23) : **laisser**
- **1SPE-355** — Déterminer la loi de probabilité d'une variable aléatoire
  - Loi de probabilité d'une variable aléatoire à valeurs en nombre fini. — _BO 1re spé p.11_ (BO)
- **1SPE-356** — Calculer une espérance
  - Espérance d'une variable aléatoire à valeurs en nombre fini. — _BO 1re spé p.11_ (BO)
- **1SPE-357** — Calculer une variance, un écart type
  - Variance et écart type d'une variable aléatoire à valeurs en nombre fini. — _BO 1re spé p.11_ (BO)
- **1SPE-358** — Utiliser la notion d'espérance dans une résolution de problème (mise pour un jeu équitable, etc.)
  - Espérance dans une résolution de problème (mise pour un jeu équitable, etc.). — _BO 1re spé p.11_ (BO)
- **1SPE-359** — Algorithme renvoyant l'espérance d'une variable aléatoire
  - Algorithme renvoyant l'espérance. — _BO 1re spé p.11_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-360** — Fréquence d'apparition des lettres d'un texte donné, en français, en anglais
  - Fréquence d'apparition des lettres d'un texte, en français, en anglais. — _BO 1re spé p.11_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-361** — Pour $X$ variable aléatoire, étude de la fonction du second degré $x \mapsto E\big((X - x)^2\big)$
  - Fonction x ↦ E((X − x)²), du second degré. — _BO 1re spé p.11_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).
- **1SPE-428** — Utiliser les notations $\{X = a\}$, $\{X \leqslant a\}$, $P(X = a)$, $P(X \leqslant a)$
  - Notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a). — _BO 1re spé p.11_ (BO)
- **1SPE-429** — Passer du registre de la langue naturelle au registre symbolique
  - De la langue naturelle aux notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a). — _BO 1re spé p.11_ (BO)
- **1SPE-430** — Passer du registre symbolique au registre de la langue naturelle
  - Des notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a) à la langue naturelle. — _BO 1re spé p.11_ (BO)
- **1SPE-431** — Algorithme renvoyant la variance ou l'écart type d'une variable aléatoire
  - Algorithme renvoyant la variance ou l'écart type. — _BO 1re spé p.11_ (BO)
  - ⚠ Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3).

### Vocabulaire ensembliste et logique

- **1SPE-201** — Employer les expressions « condition nécessaire », « condition suffisante »
  - Expressions « condition nécessaire », « condition suffisante », en situation, sur des propositions du programme. — _BO 1re spé p.4_ (BO)
- **1SPE-202** — Identifier le statut des égalités (identité, équation)
  - Statut d'une égalité : identité ou équation. — _BO 1re spé p.4_ (BO)
- **1SPE-203** — Repérer les quantifications implicites dans certaines propositions, particulièrement dans les propositions conditionnelles
  - Quantifications implicites, surtout dans les propositions conditionnelles ; symboles ∀ et ∃ non exigibles. — _BO 1re spé p.4_ (BO)
- **1SPE-204** — Formuler la négation de propositions quantifiées
  - Négation de propositions quantifiées, formulée en langage naturel (∀ et ∃ non exigibles). — _BO 1re spé p.4_ (déduite)
  - ⚠ Lecture déduite (texte implicite) : les symboles ∀ et ∃ n'étant « pas exigibles » (BO p.4), la négation attendue est formulée en mots ; un modèle peut afficher les symboles dans l'énoncé sans les exiger dans la réponse.
- **1SPE-205** — Produire un raisonnement par contraposée — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner) : « les élèves produisent des raisonnements … par contraposée » (BO p.4) ; aucun grain questionnable propre, au mieux une question sur la contraposée d'une implication donnée (voir aussi la puce « formuler la réciproque d'une implication, la contraposée »).
- **1SPE-366** — Identifier le statut des lettres utilisées (variable, inconnue, paramètre)
  - Statut d'une lettre : variable, inconnue ou paramètre. — _BO 1re spé p.4_ (BO)
