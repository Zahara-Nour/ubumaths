# Passe des points — Terminale spécialité (T_SPE)

Source : `bo/tspe.txt` (relu en entier), 239 points. Détail ligne à ligne : [tspe.tsv](tspe.tsv) (54 lignes).
Le seed a déjà découpé finement (une phrase du BO donne souvent un point). Ce qui reste porte surtout sur des
énumérations à l'intérieur d'une phrase.

## Bilan

- **36 coupes proposées** (COUPER), qui donnent **47 points neufs** : 30 en 1a, 6 en 1b ; 22 d'entre elles valent aussi
  pour une famille (question 2).
- **7 points à trancher** (A_TRANCHER), 11 points neufs de plus si tout est coupé : TSPE-304, 371, 402, 403, 456, 485, 486.
- **11 non-coupes argumentées** (GARDER), dont 2 faux doublons (TSPE-401/382, TSPE-535/538).
- **Doublons (question 3)** : aucun à archiver. **Points ⚙ (question 4)** : aucun.
- **Familles hors T_SPE à couper pareil** : TCOMP-201, 205, 221, 225, 237, 238, 243, 262, 283, 291, 297 ; 1SPE-288, 292, 313 ;
  2-205. Ces familles **sont déjà coupées** dans un autre programme, et la coupe de T_SPE s'aligne dessus : TCOMP-246/247, 254/255,
  289/290 ; 1SPE-340/341, 349/350 ; collège 3-042/3-065 (équation / inéquation).
- **Modèles déjà tagués sur un point coupé** : ils sont à répartir à la main, car le CSV ne dit pas quelle partie ils visent.
  Ce sont TSPE-402 (5 modèles), 453 (3), 371 (3), 345, 446, 454, 469, 510 (2 chacun) et une dizaine de points à 1 modèle.

## Questions pour David (avec ma recommandation)

1. **Limites (TSPE-402, 403), l. 588-590.** Le BO énumère les techniques : limites usuelles, croissances comparées, opérations,
   majorations ou encadrements, factorisation du terme prépondérant. Faut-il couper un point par technique ?
   → **Oui, en 4 points**, en gardant ensemble « limites usuelles » et « opérations » (on ne les sépare pas en pratique). Il faut
   alors répartir les 7 modèles tagués.
2. **Traduire par un système (TSPE-371), l. 453-456.** Faut-il couper selon les 3 types de problèmes (base ; coordonnées dans une base ;
   configuration) ? → **Oui, si les 3 modèles tagués visent chacun un type.** Sinon, garder le point entier, car « traduire » seul
   s'évalue mal.
3. **Parité et périodicité (TSPE-456, et la 2e partie de TSPE-453).** Un point ou deux ? → **Deux** : ce sont deux propriétés,
   chacune évaluable.
4. **Estimer graphiquement ou encadrer (TSPE-485, 486, et la famille TCOMP-274/275).** Faut-il couper ? Le collège a séparé le calcul
   et le graphique (3-014 / 3-057). → **Oui, couper.** Mais le « ou » du BO peut aussi se lire comme deux moyens d'un même but : à toi
   de voir.
5. **Lire la convexité (TSPE-419).** Je coupe selon l'objet lu (courbe de f, de f′, de f″), ce qui suit TSPE-411 (3 caractérisations).
   L'autre axe possible est « intervalles convexe / concave » contre « points d'inflexion », celui de TCOMP-264. Faut-il couper aussi
   selon cet axe (6 points) ? → **Non**, l'objet suffit.
6. **Récurrence (TSPE-304 / 386).** Même nœud, sens voisin, mais pas le même texte ni la même section (logique contre suites).
   → **Garder les deux**, ce n'est pas un doublon.
7. **Coupes douteuses que j'ai tranchées.** Je coupe TSPE-336, 337, 348, 350, 356 : le BO y donne des objets différents (deux droites,
   droite et plan, deux plans…). Je garde TSPE-316 (relation et triangle de Pascal), 326 (vecteurs et translations) et 397 (limite en
   +∞, en −∞, en un point). Si tu lis ces trois-là comme des listes de savoirs, ils basculent en COUPER.

## Écarts relevés (hors des quatre questions)

- **l. 421 sans point** : « Résoudre des problèmes impliquant des grandeurs et mesures : longueur, angle, aire, volume. »
  Aucun point de T_SPE ni d'un autre programme du lycée ne porte cette ligne. Le seed l'a manquée entre TSPE-356 et TSPE-357.
  Il faut y ajouter un point fidèle au BO (ce n'est pas un ajout de contenu). Je propose « Orthogonalité et distances dans
  l'espace », nœud « Espace ».
- **l. 681** : la partie « exponentielle → transformer une écriture » n'a pas de point T_SPE. Elle est couverte par 1SPE-294,
  que référence la liste T_SPE. Rien à faire, sauf si tu veux un point T_SPE propre.
- **Lignes transversales** (ensembles l. 203-210, logique l. 221-231, listes l. 260-265) : elles sont couvertes par des
  références aux points 2-201…2-217, 1SPE-201, 1SPE-205 et 1SPE-206…1SPE-210. Ce qui est cohérent.
- **Famille à prévenir pour la passe 2de** : la coupe équation / inéquation (TSPE-445/446) touche aussi 2-336 à 2-344, que
  référence la liste T_SPE.
