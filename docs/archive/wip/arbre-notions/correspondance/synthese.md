> ⚠️ **PÉRIMÉ le 2026-10-07** : cette synthèse décrit la passe initiale, calculée sur
> l'arbre à 115 notions / 418 sous-notions. La correspondance a été RELANCÉE sur l'arbre
> complet (537 sous-notions) : voir `relance-2026-10-07.md`. Les CSV de ce dossier sont à
> jour de la relance.

# Correspondance ancien classement → arbre branche > notion > sous-notion

Proposition générée le 2026-10-07 depuis la production (lecture seule). Rien n'est appliqué : à relire par David.
Fichiers : `modeles.csv` (1 nœud par modèle), `exercices.csv` (1 ou plusieurs nœuds, le principal en premier), `tags.csv`.
Tous les chemins ont été vérifiés contre `arbre-notions.json` (0 chemin inconnu).

## Comptes

|                      | total | haute | moyenne | basse |
| -------------------- | ----: | ----: | ------: | ----: |
| Modèles de questions |  1005 |   843 |     160 |     2 |
| Exercices            |   329 |   179 |     137 |    13 |

Exercices par nombre de nœuds : 1 nœud(s) : 219, 2 nœud(s) : 102, 3 nœud(s) : 6, 4 nœud(s) : 1, 5 nœud(s) : 1.
Types de source proposés : Bac : 7, Concours : 1 (les 321 autres exercices n'ont pas de source).

### Par branche

| Branche                   | modèles | exercices (nœud principal) | exercices (toutes mentions) |
| ------------------------- | ------: | -------------------------: | --------------------------: |
| Nombres et calculs        |     428 |                          5 |                           8 |
| Arithmétique              |      26 |                          0 |                           0 |
| Nombres complexes         |      20 |                          0 |                           0 |
| Proportionnalité          |      34 |                          2 |                           2 |
| Algèbre                   |      72 |                         21 |                          33 |
| Fonctions                 |     142 |                        149 |                         156 |
| Intégration               |      11 |                         10 |                          14 |
| Équations différentielles |      13 |                          7 |                           7 |
| Suites                    |      68 |                         32 |                          34 |
| Matrices                  |       9 |                          0 |                           1 |
| Graphes                   |      10 |                          0 |                           0 |
| Géométrie                 |      46 |                         49 |                          50 |
| Grandeurs et mesures      |      43 |                          0 |                           0 |
| Probabilités              |      49 |                         35 |                          36 |
| Dénombrement              |      15 |                          0 |                           0 |
| Statistiques              |       5 |                          1 |                           3 |
| Logique                   |       8 |                          0 |                           5 |
| Ensembles                 |       6 |                         16 |                          16 |
| Algorithmique             |       0 |                          2 |                           2 |

## Lignes de confiance basse (à relire)

### Modèles

- `4cc21ccd-03d9-4e62-b669-f5ca03a1cc9a` « Signe d'une expression » (Fonctions > Valeur absolue > Apprivoiser) → Fonctions > Fonction valeur absolue > définition et distance — énoncé : signe de ax selon le signe de x, prérequis sans nœud propre
- `c7cdca01-326b-487f-8400-ba25d382de74` « Signe d'une expression » (Fonctions > Valeur absolue > Apprivoiser) → Fonctions > Fonction valeur absolue > définition et distance — énoncé : signe de ax selon le signe de x, prérequis sans nœud propre

### Exercices

- `7c974266-05b6-4b95-b03b-0dca9c74ceb4` « Droite numérique » (Algèbre, 2) → Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ | Nombres et calculs > Relatifs : sens et écritures > droite graduée — réels placés sur une droite numérique en 2de : ni relatifs (5e-4e) ni intervalles, à trancher
- `e286f938-fae3-456e-9a33-78f52416c10b` « (sans titre) » (Algèbre, 2) → Algèbre > Calcul littéral > substitution | Algèbre > Équations : produit et quotient — vrai/faux : vérifier une solution, égalités pour tout x
- `250f7564-5a66-4a01-9e1a-d8f479ce2bda` « (sans titre) » (Algèbre, 2) → Algorithmique > Boucles | Nombres et calculs > Racines carrées : sens et écritures — recherche : triangles presque isocèles avec algorithme, aucune notion évidente
- `e845fcfc-dafa-4985-a0f2-eee25857ff3b` « BAC Mars 2021 sujet2 Ex 2 » (BAC, T_SPE) → Suites > Raisonnement par récurrence | Suites > Limites de suites | Matrices > Suites et matrices > suites couplées — bac : suites couplées en Tle spé, nœud « suites couplées » seulement en Expertes
- `f4bb8e0a-d446-4e99-bd32-8fc87ee7ff5f` « Concours général 2024 Problème 1 » (Concours général, T_EXP) → Suites > Limites de suites | Suites > Suites récurrentes — Concours général : suite u(n+1)=1/(n+1)+sqrt(u(n)), sujet ouvert
- `273b0e95-4b75-469b-9db3-03c9f828aff8` « Approcher π comme Archimède » (Fonctions trigonométriques, 1_SPE) → Fonctions > Fonctions trigonométriques > cosinus et sinus d'un réel — approcher π (Archimède), plutôt géométrie/trigo du triangle
- `8945969e-e90c-47e5-bb6f-df644efc275c` « Le phare et le bateau » (Géométrie repérée, 1_SPE) → Géométrie > Géométrie repérée > milieu et distance | Géométrie > Géométrie repérée > équation de cercle — problème en contexte (phare/bateau), contenu exact à relire
- `94ab6221-799a-4099-a5c7-66e4a600ac80` « Un encadrement du nombre $e$ » (Nombres, 1_SPE) → Fonctions > Fonction exponentielle | Suites > Limites de suites — encadrement de e par (1+1/n)^n : exp ou suites ?
- `521d5f07-ebd0-4dbb-aa82-4d55457bad9b` « Monte-Carlo : aire sous la parabole et π » (Probabilités, 1_SPE) → Statistiques > Échantillonnage > simulation | Intégration > Intégrale et aire — Monte-Carlo en 1re : simulation, aire, π
- `eb567e6b-2868-4334-a2f4-873416ccc2e6` « Une marche aléatoire » (Probabilités, 1_SPE) → Probabilités > Probabilités conditionnelles > arbres pondérés | Probabilités > Variables aléatoires — marche aléatoire
- `be5c50d3-1aff-45d8-9baa-e1125cca5f28` « Échantillons et règle des 2σ/√n » (Variables aléatoires, 1_SPE) → Probabilités > Variables aléatoires > variance et écart-type | Statistiques > Échantillonnage > fluctuation — échantillons et règle 2σ/√n en 1re
- `3a05ad58-7c11-43b1-aaa6-81ce1887bda3` « Fréquence des lettres » (Variables aléatoires, 1_SPE) → Algorithmique > Listes > parcourir une liste | Statistiques > Représenter des données > effectifs et fréquences — fréquence des lettres (Python), rangé en variables aléatoires
- `93c52644-7dd5-4a34-aacb-df8d2d6bdc95` « debug » (, sans niveau) → Algèbre > Équations : second degré > discriminant — exercice « debug » sans niveau ni thème : probablement à supprimer

## Nœuds de l'arbre qui ne reçoivent rien

### Notions vides (10 sur 114)

- **Fonctions** : Fonction inverse, Fonction racine carrée, Fonction cube
- **Géométrie** : Vecteurs : sans coordonnées, Vecteurs : avec coordonnées, Espace : sans coordonnées, Orthogonalité : sans coordonnées
- **Statistiques** : Indicateurs
- **Algorithmique** : Variables et instructions, Fonctions Python

### Sous-notions vides dans des notions qui reçoivent du contenu (52)

- Nombres complexes > Formes trigo. et exponentielle : forme trigonométrique
- Algèbre > Équations : premier degré : ax + b = cx + d, mettre en équation
- Algèbre > Équations : produit et quotient : équation quotient
- Algèbre > Inéquations : premier degré : ax + b < c, ax + b < cx + d, mettre en inéquation
- Algèbre > Inéquations : produit et quotient : inéquation produit, inéquation quotient
- Algèbre > Équations : second degré : équations incomplètes
- Fonctions > Fonction carré : définition et courbe, variations
- Fonctions > Fonction valeur absolue : courbe
- Intégration > Calcul d'intégrales : linéarité
- Équations différentielles > y′ = ay : solution générale
- Équations différentielles > y′ = ay + f : solution générale
- Suites > Suites arithmético-géométriques : limite
- Matrices > Systèmes linéaires : écriture matricielle, résolution
- Graphes > Vocabulaire des graphes : graphe orienté
- Graphes > Chaînes et connexité : chaînes et cycles, connexité
- Graphes > Matrice d'adjacence : matrice d'adjacence, nombre de chaînes de longueur n
- Graphes > Chaînes de Markov : graphe probabiliste
- Probabilités > Expériences aléatoires : équiprobabilité, événements
- Dénombrement > Arrangements et permutations : permutations, factorielle
- Dénombrement > Combinaisons : triangle de Pascal
- Statistiques > Représenter des données : tableaux, diagrammes en barres, diagrammes circulaires, histogrammes, fréquences cumulées
- Statistiques > Échantillonnage : estimation d'une proportion
- Logique > Connecteurs et contre-exemples : et, ou, non
- Logique > Implication et équivalence : implication, réciproque, contraposée, équivalence
- Logique > Quantificateurs et négation : pour tout, il existe, négation d'une proposition
- Logique > Raisonnements : par contraposée, disjonction de cas
- Ensembles > Opérations sur les ensembles : union et intersection, complémentaire, différence
- Algorithmique > Boucles : boucle bornée, boucle non bornée
- Algorithmique > Listes : créer une liste, liste en compréhension

## Ancien classement sans cible exacte

Aucune combinaison thème > domaine > sous-domaine (339) ni aucun exercice ne reste sans nœud. En revanche, certains contenus ont dû être rangés **au niveau de la notion** faute de sous-notion, ou dans un nœud approchant ; l'arbre semble incomplet sur ces points :

- **Géométrie > Espace / Orthogonalité avec coordonnées** : 8 modèles (Tle spé), tous rédigés en coordonnées : angles, produit scalaire, orthogonalité de vecteurs, projeté orthogonal, colinéarité/alignement, coplanarité/décomposition. Ces sous-notions n'existent que dans les notions « sans coordonnées ». Rangés au niveau de la notion « … : avec coordonnées ».
- **Géométrie > Produit scalaire (1re)** : pas de sous-notion « orthogonalité » : 5 exercices (vecteurs orthogonaux, triangle rectangle…) rangés au niveau de la notion.
- **Fonctions > Second degré** : la sous-notion « discriminant » n'existe que sous Algèbre > Équations : second degré ; « calculer Δ » sans résoudre y est rangé (moyenne). Les modèles « racines avec Δ » vont dans Fonctions > Second degré > racines (énoncé : racines du polynôme).
- **Fonctions > Fonctions trigonométriques** : pas de sous-notion « courbes de cos et sin » (2 modèles) ni « modélisation » (marée, tension : 2 exercices).
- **Fonctions > Fonction exponentielle** : pas de sous-notion « signe » (1 exercice).
- **Suites (1re)** : « Reconnaître une suite arithmétique ou géométrique » (4 modèles) : un modèle ne peut pointer que vers un nœud ; rangé sous Suites arithmétiques > reconnaître. Une sous-notion commune dans Généralités éviterait le choix arbitraire.
- **Suites arithmético-géométriques** : notion en Tle, mais 4 exercices de 1re (population, médicament, forêt, suite auxiliaire) l'utilisent ; l'escalier en 1re (2 modèles) rangé en Généralités > représentation graphique car « escalier » est en Tle.
- **Proportionnalité > Pourcentages** : augmentation/diminution en 6e (2 modèles) : Évolutions est en 2de-1re ; rangés en Pourcentages > calculer.
- **Algèbre > Équations : premier degré** : les modèles « a÷x = b » n'ont pas de forme dédiée (rangés en ax = b).
- **Fonctions > Valeur absolue > Apprivoiser** : « signe de ax selon le signe de x » (2 modèles, basse) : prérequis sans nœud.
- **Intégration > Calcul d'intégrales** : pas de sous-notion « positivité / intégrer une inégalité » (1 exercice).
- **Nombres complexes > Formes trigo. et exponentielle** : « passer à la forme algébrique » (1 modèle) rangé au niveau de la notion.

## Avertissements de niveaux

Lecture des niveaux de l'arbre : « Tle » = T_SPE, « Tle comp. » = T_COMP, « Expertes » = T_EXP, « cycle 3 » = CM1-6e ; une sous-notion hérite des niveaux de sa notion.

**54 avertissements viennent seulement de T_COMP** (contenus notés T_SPE + T_COMP sur des notions marquées « Tle ») : Fonctions > Logarithmes (6), Probabilités > Loi binomiale (6), Fonctions > Convexité (5), Équations différentielles > y′ = f (5), Suites > Limites de suites (4), Fonctions > Continuité (3), Fonctions > Dérivation (3), Fonctions > Limites de fonctions (3), Intégration > Calcul d'intégrales (3), Intégration > Intégrale et aire (3), Intégration > Valeur moyenne (3), Équations différentielles > Généralités (2), Équations différentielles > y′ = ay + b (2), Suites > Suites arithmético-géométriques (2), Intégration > Fonction intégrale (1), Équations différentielles > y′ = ay (1), Suites > Suites et modélisation (1), Suites > Suites récurrentes (1). → À trancher : « Tle » couvre-t-il Maths complémentaires ? Si oui, il suffit d'ajouter « Tle comp. » à ces notions.

Autres avertissements (nœud hors des niveaux du contenu) :

| Type     | Nœud                                                               | Niveau(x) hors nœud |  Nb |
| -------- | ------------------------------------------------------------------ | ------------------- | --: |
| exercice | Algèbre > Calcul littéral > factoriser                             | 1_SPE               |   3 |
| exercice | Algèbre > Calcul littéral > identités remarquables                 | 1_SPE               |   2 |
| exercice | Algèbre > Calcul littéral > simplifier l'écriture                  | 1_SPE               |   1 |
| exercice | Algèbre > Inéquations : produit et quotient > tableau de signes    | 1_SPE               |   1 |
| exercice | Algèbre > Équations : produit et quotient > x² = a                 | 1_SPE               |   1 |
| exercice | Fonctions > Convexité > inégalités de convexité                    | 1_SPE               |   1 |
| exercice | Géométrie > Géométrie repérée > équations de droites               | T_SPE               |   1 |
| exercice | Géométrie > Produit scalaire                                       | T_SPE               |   1 |
| exercice | Intégration > Intégrale et aire                                    | 1_SPE               |   1 |
| exercice | Matrices > Suites et matrices > suites couplées                    | T_SPE               |   1 |
| exercice | Nombres et calculs > Entiers : priorités opératoires               | 3                   |   1 |
| exercice | Nombres et calculs > Fractions : calculs                           | 3                   |   1 |
| exercice | Nombres et calculs > Fractions : sens et écritures > simplifier    | 2                   |   2 |
| exercice | Nombres et calculs > Puissances : calculs > mélange                | 1_SPE               |   1 |
| exercice | Nombres et calculs > Puissances : calculs > mélange                | 2                   |   1 |
| exercice | Nombres et calculs > Relatifs : sens et écritures > droite graduée | 2                   |   1 |
| exercice | Probabilités > Loi binomiale > schéma de Bernoulli                 | 1_SPE               |   2 |
| exercice | Probabilités > Probabilités conditionnelles > arbres pondérés      | T_SPE               |   1 |
| exercice | Statistiques > Représenter des données > effectifs et fréquences   | 1_SPE               |   1 |
| exercice | Statistiques > Échantillonnage > fluctuation                       | 1_SPE               |   1 |
| exercice | Statistiques > Échantillonnage > simulation                        | 1_SPE               |   1 |
| exercice | Suites > Limites de suites                                         | T_EXP               |   1 |
| exercice | Suites > Suites arithmético-géométriques                           | 1_SPE               |   2 |
| exercice | Suites > Suites arithmético-géométriques > suite auxiliaire        | 1_SPE               |   2 |
| exercice | Suites > Suites récurrentes                                        | T_EXP               |   1 |
| modèle   | Arithmétique > Divisibilité > multiples et diviseurs               | CE2                 |   2 |
| modèle   | Ensembles > Ensembles de nombres > appartenance et inclusion       | 1_SPE               |   2 |
| modèle   | Ensembles > Ensembles de nombres > intervalles                     | 1_SPE               |   1 |
| modèle   | Probabilités > Autres lois > loi géométrique                       | T_SPE               |   1 |
| modèle   | Probabilités > Expériences aléatoires > fréquences                 | 6                   |   1 |
| modèle   | Probabilités > Expériences aléatoires > probabilité simple         | 6                   |   1 |

Points saillants : Divisibilité « cycle 3 à Expertes » exclut le CE2 alors que la note de l'arbre reprend « Entiers : diviser, divisibilité (CE2 à CM2) » ; Ensembles de nombres (2de) reçoit 3 modèles de 1re ; Expériences aléatoires (5e à 2de) reçoit 2 modèles de 6e ; Loi géométrique (« Autres lois », Tle comp.) reçoit un modèle T_SPE ; Calcul littéral (5e-2de) sert à des exercices de 1re (approfondissement, avertissement normal).

## Tags

67 tags utilisés par les exercices : notion : 57, transversal : 10. Aucun tag « bac » ni « terminale » n'existe aujourd'hui (rien à retirer à ce titre). Le tag « otrthogonalité » est une faute de frappe.

Tags transversaux proposés : simplification, valeur approchée, python, inégalité, représentation graphique, algorithme, encadrement, lecture graphique, paramètre, coordonnées.
