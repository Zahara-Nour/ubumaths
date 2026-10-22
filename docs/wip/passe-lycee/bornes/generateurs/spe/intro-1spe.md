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
- **1SPE-432**, **1SPE-433** : puces d'automatismes recopiées en partie seulement (« ou son tableau de variations », « par son équation réduite » manquent).

## Questions ouvertes (`questions-spe.json`)

- **l1s-1** — Dérivées de composées affines (√(ax + b), (ax + b)ⁿ) en 1re.
- **l1s-2** — Forme canonique : où s'arrêtent les « cas simples » ?
- **l1s-3** — Trigonométrie : quelles valeurs remarquables, quels angles associés, sous quelle forme ?
- **l1s-4** — Formule des probabilités totales « dans des cas simples » : taille de la partition.
- **l1s-5** — Exponentielle : les conséquences eˣ⁻ʸ = eˣ/eʸ et (eˣ)ⁿ = eⁿˣ sont-elles dans le point ?
- **l1s-6** — Linéarité de l'espérance : E(aX + b) seulement, ou aussi E(X + Y) ?
- **l1s-7** — Automatismes « privilégiant l'activité mentale » : bornent-ils les valeurs numériques ?
