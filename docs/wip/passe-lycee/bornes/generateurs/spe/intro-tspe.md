# Bornes des points de terminale spécialité

Objectif : pour chaque point actif du programme de spécialité de terminale (`grade` = `T_SPE`, 325 points lus dans `points-lycee.csv`), dire jusqu'où vont les questions qu'on peut y rattacher (« seulement »). Ces bornes servent à juger qu'un modèle de question reste entièrement dans le point. Le programme hérite de la 1re spécialité : ce qui y est déjà borné ne se recopie pas, sauf quand la terminale le change.

## Sources et façon de citer

| Abréviation    | Document                                                                                                                    | Page citée  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **BO Tle spé** | Programme de spécialité de mathématiques de la classe terminale de la voie générale, BO n° 14 du 2026-04-02 (`bo/tspe.txt`) | page du PDF |

Aucun document d'accompagnement n'est disponible pour ce programme : aucune borne n'en vient.

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point, ou dans le texte même de la borne pour les bornes générales).

Les points « approfondissement » du BO (« en aucun cas obligatoires », p.3) sont bornés à leur contenu, comme les autres. Un point « démonstration » est borné à ce qui est démontré.

## Ce qui est le plus utile pour la vérification « seulement »

- **Fonctions** : celles de 1re, plus ln, sin et cos ; pas de tangente ni de xᵃ (a réel) hors approfondissement ; aucun autre logarithme que ln ; pas de réciproque d'une fonction continue autre que exp ↔ ln.
- **Continuité, dérivabilité** : jamais à justifier.
- **Limites** : asymptotes parallèles aux axes seulement (obliques : approfondissement) ; opérations admises, composition en contexte ; formalisme non exigé.
- **Trigonométrie** : équation cos(x) = a, inéquation cos(x) ⩽ a sur [−π, π] ; sinus, intervalle, valeurs de a et sens en question (lts-1 à lts-4).
- **Primitives** : xⁿ (n ∈ ℤ), 1/√x, exp, sin, cos et (v′ ∘ u) × u′ ; équations différentielles y′ = ay, y′ = ay + b, y′ = ay + f (solution particulière donnée) ; rien d'exigible sur les autres.
- **Intégrales** : intégration par parties au programme ; démonstration du théorème fondamental pour f positive croissante seulement.
- **Espace** : repère orthonormé ; représentation paramétrique pour les droites seulement, équation cartésienne pour les plans ; sphères, intersection de deux plans et vecteur orthogonal à deux vecteurs = approfondissements ; systèmes « dans des cas simples ».
- **Dénombrement** : ensembles finis ; k-uplets, k-uplets d'éléments distincts, permutations, combinaisons ; combinaisons avec répétitions = approfondissement.
- **Probabilités** : variables finies ; indépendance de variables seulement dans une succession d'épreuves indépendantes, jamais à justifier ; épreuves non indépendantes : deux ou trois au plus ; E(XY) = E(X)E(Y) hors attendus.

## Contradictions et tensions relevées dans le BO

1. **Intersection de deux plans** (p.7) : citée parmi les configurations à traduire par un système (capacité attendue) et, sous la forme « Déterminer l'intersection de deux plans », parmi les approfondissements. → lts-7.
2. **Vecteur orthogonal à deux vecteurs** (p.7) : approfondissement, alors que l'orthogonalité de plans se traduit par un système en capacité attendue. → lts-8.
3. **Fonctions de référence des limites** (p.9) : la section « Limites » cite les seules fonctions de 1re, alors que ln, sin et cos sont étudiés dans la même année et que le découpage n'est « pas un plan de cours ». → lts-5.
4. **x ↦ xⁿ pour n ∈ ℤ** (p.11) : la liste des primitives inclut n = −1, dont la primitive est ln, sans parler de ln|x|. → lts-9.

## Questions ouvertes

`questions-spe.json` : lts-1 (sinus), lts-2 (intervalle de cos(x) = a), lts-3 (valeurs de a), lts-4 (sens de l'inéquation), lts-5 (limites avec ln, sin, cos), lts-6 (taille des systèmes), lts-7 (intersection de deux plans), lts-8 (vecteur normal à (ABC)), lts-9 (primitive de 1/x).

## Libellés signalés

- **TSPE-444** : le BO dit « de l'exponentielle ou du logarithme pour transformer une écriture » ; le libellé ne garde que le logarithme, et la partie exponentielle n'a aucun point en terminale.
