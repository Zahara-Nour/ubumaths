# Bornes des points de terminale maths expertes

Objectif : pour chaque point de programme actif de maths expertes (`T_EXP`), dire jusqu'où vont les questions qu'on peut y rattacher (« seulement »), pour juger ensuite qu'un modèle de question reste entièrement dans le point. 176 points lus dans `points-lycee.csv` (base locale, empreinte identique à la prod le 2026-10-22). Maths expertes s'ajoute à la Tle spé : ce que la Tle spé (et avant elle la 1re spé, la 2de) apporte n'est pas recopié ici.

## Sources et façon de citer

| Abréviation     | Document                                                                                                                                             | Page citée  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **BO Tle exp.** | Programme de l'enseignement optionnel de mathématiques expertes de terminale générale (2019, seul texte existant, reconduit) ; extrait `bo/texp.txt` | page du PDF |

Aucun document d'accompagnement n'a servi.

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point).

Les points issus des « Problèmes possibles » du BO (exigence `approfondissement`) ne sont bornés qu'à leur objet nommé ; le BO les dit « en aucun cas obligatoires » (p.5).

## Ce qui est le plus utile pour la vérification « seulement »

- **Polynômes** : fonctions polynômes à coefficients **réels** ; degré 2 (discriminant négatif → solutions conjuguées), degré 3 **avec une racine connue** ; coefficients complexes, racines carrées d'un complexe, Viète, Cardan : problèmes possibles seulement.
- **Équations dans ℂ** : az = b ; équation « simple » en z et z̄ (lte-1).
- **Arguments** : à 2π près ; valeurs exactes non remarquables en suspens (lte-2).
- **Racines de l'unité** : 𝕌n décrit, cas n = 2, 3, 4 ; racines n-ièmes d'un complexe quelconque : problème possible.
- **Arithmétique** : dans ℤ ; division euclidienne par un élément de ℕ* ; PGCD de deux entiers, **pas de PPCM** ; une congruence ax ≡ b [n] (systèmes, lemme chinois : problème possible) ; diophantiennes « simples » (lte-4).
- **Matrices** : à coefficients **réels** ; somme, produit par un réel, produit, inverse, puissances ; ni transposée ni déterminant (lte-7) ; récurrence du seul type U_{n+1} = AU_n + C ; ordre des matrices en suspens (lte-6).
- **Graphes** : vocabulaire limité à sommets, arêtes, graphe complet, adjacents, degré, ordre, chaîne, longueur, connexe ; pas de cycle ni de graphe eulérien (problème possible) ; graphes orientés hors Markov en suspens (lte-5).
- **Chaînes de Markov** : deux ou trois états, convention ligne π0Pⁿ, distributions invariantes ; pas d'étude asymptotique (problème possible).

## Contradictions et décalages relevés

1. **Chaîne / chemin** (p.10-11) : les contenus parlent d'arêtes et de chaînes (non orienté), la capacité et la démonstration de « chemins » ; l'orientation n'est écrite que pour les chaînes de Markov (lte-5).
2. **Texte de 2019 sur des prérequis de 2026** : « transformations géométriques du plan » (p.10) supposait l'ancien collège, où figuraient rotation et homothétie ; elles sont absentes du cycle 4 en vigueur et des programmes de lycée (lte-8). Même décalage pour les « similitudes directes », citées seulement dans l'histoire (lte-9).
3. **Ordre des matrices** : 2 ou 3 écrit pour les exemples de puissances et pour Markov, rien pour l'inverse, les systèmes, la matrice d'adjacence (lte-6).

## Questions ouvertes (`questions-spe.json`)

- **lte-1** — équations « simples » en z et z̄ (TEXP-208).
- **lte-2** — arguments exacts : valeurs remarquables seulement ? (TEXP-218, -221, -237, -238, -263).
- **lte-3** — racine « connue » : donnée ou à trouver ? (TEXP-248, -249).
- **lte-4** — équations diophantiennes « simples » (TEXP-292).
- **lte-5** — graphes orientés hors chaînes de Markov (TEXP-312, -315, -322, -342, -345).
- **lte-6** — ordre des matrices et taille des systèmes (TEXP-320, -321, -322, -324, -338, -339, -340, -342).
- **lte-7** — déterminant d'une matrice 2 × 2 (TEXP-319, -320, -338).
- **lte-8** — quelles transformations du plan en matrices (TEXP-323).
- **lte-9** — transformations z ↦ az + b (TEXP-227, -260, -261, -263, -264).

Libellés signalés : aucun ; les 176 libellés recopient le BO.
