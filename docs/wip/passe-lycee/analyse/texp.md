# T_EXP — passe des points (Tle maths expertes, 153 points, `bo/texp.txt`, texte de 2019 reconduit)

Détail ligne par ligne : [texp.tsv](texp.tsv), 17 lignes.

## Bilan

- **11 points à couper (1a)**, qui donnent **14 points neufs** (153 → 167 si tout est retenu). Aucune coupe 1b : la
  seed a déjà séparé les gestes doubles (237/238, 284/285, 286/287, 288/289, 296/297, 340-344…).
- Les coupes portent surtout sur des listes de propriétés ou d'objets : 209 (conjugué d'un produit, d'un inverse,
  d'une puissance), 211, 212, 215, 256, 314, 318, ainsi que 240 (Euler / Moivre), 253 et 267 parmi les problèmes
  possibles.
- **Familles (question 2)** : aucune hors de T_EXP, car complexes, arithmétique, graphes et matrices n'apparaissent dans
  aucun autre programme du lycée. Il n'y a pas non plus de jumeau coupé au collège : la seule famille proche, 2-236
  (multiple, diviseur), n'est pas coupée. Les familles internes sont cohérentes : 209 suit la coupe déjà faite de la
  l. 271 (224-226), et 256 suit 262/263.
- **Doublons (question 3)** : deux, partiels. Le RSA figure l. 413 (TEXP-305) et l. 416 (TEXP-308) ; le graphe pondéré
  d'une chaîne de Markov figure l. 463 (TEXP-328) et l. 465 (TEXP-331).
- **Points ⚙ (question 4)** : aucun, ce BO n'a pas de rubrique Automatismes.

## À trancher

1. **TEXP-305 « chiffrement (affine, Vigenère, Hill, RSA) »** : le couper en quatre ? La partie RSA double TEXP-308.
   _Recommandation_ : couper, et archiver la moitié RSA comme doublon de 308. L'autre voie : garder 305 entier comme
   liste d'exemples, à l'image de 303 (codes) et 306 (Mersenne, Fermat), que je garde entiers.
2. **TEXP-331 « Matrice de transition, graphe pondéré associé »** : le graphe redit TEXP-328. _Recommandation_ : garder
   331 entier, lu comme « matrice de transition », plutôt que de créer un point pour l'archiver aussitôt. Son modèle
   (« matrice de transition et graphe pondéré ») reste dessus.
3. **TEXP-240 Euler / Moivre** : la coupe est nette, mais le modèle tagué mêle Euler, Moivre et les formules
   d'addition, donc il reste sur Euler. Je garde **TEXP-241** entier (« calculer des puissances », c'est Moivre seul).
   D'accord ?
4. **TEXP-314** : « Degré d'un sommet » ajoute « d'un sommet » au mot du BO « degré ». Faut-il écrire « Degré » tout
   court ? Le degré passe en premier parce que le modèle tagué porte sur le degré et l'ordre.
5. **TEXP-318** (matrice carrée, colonne, ligne) : c'est du pur vocabulaire, que seul un QCM évaluerait. Couper (1a à la
   lettre), ou garder ensemble ? _Recommandation_ : couper, pour rester cohérent avec 1a.

## Non-coupes argumentées (GARDER)

- 213 et 218 « … Interprétation géométrique » : l'interprétation définit le module et l'argument, et les calculs ont leurs
  points (220, 221).
- 241 (voir plus haut) et 306 (exemples d'une même recherche).
- 202, 219, 235 (paire cos / sin d'Euler), 257, 303, 304, 315, 319 : évidemment entiers, absents du TSV.

## Écarts relevés au passage (tags, hors des quatre questions)

- Le modèle « Affixe d'un vecteur, distance, milieu, parallélogramme » est tagué **TEXP-223** (« Déterminer l'affixe
  d'un point »). Il viserait plutôt la moitié « Affixe d'un vecteur » de TEXP-212 coupé, ou TEXP-262.
- Le modèle de **TEXP-260** (alignement) couvre aussi l'orthogonalité (TEXP-261, sans modèle), et celui de **TEXP-263**
  (angles) couvre aussi le rapport de longueurs (TEXP-262).
