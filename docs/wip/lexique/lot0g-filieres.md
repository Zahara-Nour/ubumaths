# Lexique — lot 0g : mots partagés entre les filières de 1re

Décidé par David le 2026-10-09 : la 1re spé, la 1re générale (maths spécifiques) et la 1re techno ne se
voient pas l'une l'autre (hiérarchie des niveaux : chacune a la 2de pour prérequis). Un mot rangé en
1re spé était donc invisible aux 19 élèves de 1re générale. Option retenue (« 1 ») : **une entrée ou une
définition peut porter `sharedWith`**, la liste des filières parallèles qui la lisent aussi ; les niveaux
qui en découlent suivent par la hiérarchie (Tle maths complémentaires après la 1re générale, Tle techno
après la 1re techno). David a demandé d'ajouter la 1re techno (« N'oublie pas le niveau 1_TECHNO »).

**Règle** : un mot est partagé quand le programme de la filière le nomme (points 1GEN-xxx, 1TECHNO-xxx
ou texte du programme) et que la définition existante convient à cette filière.

## Comportements validés

1. Un élève de 1re générale voit « seuil » et sa définition ; Mathémo peut le lui faire deviner.
2. Un élève de Tle maths complémentaires le voit aussi (il suit la 1re générale).
3. Un élève de 1re spé voit « croissance linéaire », rangée en 1re générale.
4. « terme (suite) » : un élève de 1re générale voit la définition du CM1 et celle de 1re spé.
5. Jamais de définition de Tle spé pour la 1re générale ou la 1re techno, même sur un mot partagé.
6. Un élève de 2de ne voit toujours pas « seuil ».
7. Un mot partagé avec une filière a au moins une définition lisible dans cette filière.
8. Un renvoi visible d'une filière vise un mot visible de cette filière.
9. `sharedWith` ne contient que des filières parallèles : ni un niveau qui voit déjà le contenu
   (Tle spé pour un mot de 1re spé), ni un niveau antérieur (la 2de : ce serait un changement de niveau).

## Entrées partagées

- **évènements indépendants** → 1re générale, 1re techno — 1GEN-009, 1TECHNO-089
- **épreuve de Bernoulli** → 1re générale, 1re techno — 1GEN-010, 1TECHNO-093
- **suite arithmétique** → 1re générale, 1re techno — 1GEN-013, 1TECHNO-035
- **suite géométrique** → 1re générale, 1re techno — 1GEN-028, 1TECHNO-036
- **récurrence** → 1re générale, 1re techno — 1GEN-013, 1TECHNO-035
- **raison** → 1re générale, 1re techno — 1re générale (« suites géométriques de raison positive »), 1TECHNO-048
- **seuil** → 1re générale, 1re techno — 1GEN-021, 1TECHNO-052
- **fonction polynôme du second degré** → 1re générale, 1re techno — 1GEN-022, 1TECHNO-057
- **polynôme** → 1re générale, 1re techno — 1GEN-023, 1TECHNO-058
- **racine (polynôme)** → 1re générale, 1re techno — 1GEN-023, 1TECHNO-058
- **taux de variation** → 1re générale, 1re techno — 1re générale (« taux d'accroissement »), 1TECHNO-055
- **dérivée** → 1re techno — 1TECHNO-072
- **nombre dérivé** → 1re techno — 1TECHNO-070
- **tangente (courbe)** → 1re techno — 1TECHNO-069
- **variable aléatoire** → 1re techno — 1TECHNO-095
- **espérance** → 1re techno — 1TECHNO-096
- **échantillon** → 1re techno — 1TECHNO-101
- **formule des probabilités totales** → 1re techno — 1TECHNO-090
- **condition nécessaire** → 1re techno — 1TECHNO-002
- **condition suffisante** → 1re techno — 1TECHNO-002
- **croissance linéaire** → 1re spé — 1re spé (« phénomène discret à croissance linéaire »)
- **croissance exponentielle** → 1re spé — 1re spé (« phénomène discret à croissance exponentielle »)
- **discret** → 1re spé, 1re techno — 1re spé, 1TECHNO-042
- **interpolation** → 1re techno — 1TECHNO-088 (« interpoler ou extrapoler »)
- **extrapolation** → 1re techno — 1TECHNO-088 (renvoi vers « interpolation »)

La définition de l'entrée à son propre niveau est partagée avec elle.

## Définitions partagées (l'entrée est déjà visible, pas sa définition de 1re spé)

- **terme (suite)**, définition de 1re spé → 1re générale, 1re techno — 1GEN-014, 1TECHNO-037 (« terme de rang n »)
- **rang**, définition de 1re spé → 1re générale, 1re techno — 1GEN-014, 1TECHNO-037
- **suite**, définition de 1re spé → 1re générale, 1re techno — 1GEN-013, 1TECHNO-032
- **degré (équation)**, définition de 1re spé → 1re générale, 1re techno — 1GEN-022, 1TECHNO-057 (« polynôme de degré 2 »)
- **parabole**, définition de 1re spé → 1re générale, 1re techno — 1GEN-024, 1TECHNO-061
- **liste (informatique)**, définition de 1re spé → 1re techno — 1TECHNO-008 à 011
- **paramètre**, définition de 1re spé → 1re techno — 1TECHNO-001

## Écartés

- « discriminant » : exclu explicitement des programmes de 1re générale et de 1re techno.
- « fonction exponentielle » (et le renvoi « exponentielle ») : en 1re générale, c'est $x \mapsto a^x$,
  pas la fonction exp de la 1re spé ; il faudra une définition propre (autre mécanisme).
- « limite » : la 1re techno parle de la limite du taux de variation, la définition de 1re spé porte
  sur les suites.
- « série » (la 1re techno dit « série statistique »), « continu » (adjectif « phénomène continu »,
  la définition de Tle spé porte sur les fonctions).
- « croissance linéaire / exponentielle » pour la 1re techno : le programme dit « variation linéaire
  ou exponentielle », pas « croissance ».
