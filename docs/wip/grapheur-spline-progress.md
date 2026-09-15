# Grapheur — crochets de la spline (fix/grapheur-echantillonnage)

Signalé par David le 2026-09-15, après la livraison de #323 : « c'est mieux
mais il y a encore des irrégularités quand on zoome out », capture sur
`1/(x(x-1)(x+1))` dans x ∈ [-25 ; 12], y ∈ [-8 ; 12].

## Fausse piste, écartée par la mesure

Premier diagnostic : sous-échantillonnage. Il est réel — la branche ]-1 ; 0[ ne
reçoit que **13 points, dont 6 collés aux pôles**, et l'angle entre segments
consécutifs atteint **116°**. J'ai écrit une subdivision adaptative par
platitude… qui ne s'est **pas déclenchée du tout** sur ce cas (318 points avant
comme après) : la déviation à la corde y vaut 0,4 px, sous n'importe quel seuil
raisonnable. L'angle de 116° se produit entre deux segments de 2 px de large :
il ne se voit pas.

La subdivision a été retirée. Le rendu en segments droits des **mêmes**
échantillons est parfaitement régulier — c'est ce qui a désigné le vrai
coupable.

## La vraie cause : dépassement de Catmull-Rom

`pointsToCatmullRom` prend la tangente en un point comme la sécante de ses
**deux voisins**. Au premier point d'une cuvette entre deux pôles, le voisin de
gauche est la valeur écrêtée hors cadre (y = 32 contre y = 4,72) : la tangente
imposée vaut −14,5 là où la courbe descend doucement. La spline plonge donc
sous les données puis remonte — **3,13 unités de dépassement** mesurées.

C'est le crochet visible au fond de la cuvette, et la bosse symétrique au
sommet de la cloche entre 0 et 1.

⚠️ J'avais identifié ce mécanisme dès le premier diagnostic de #323 et décidé
de ne pas le traiter, en pariant que l'écrêtage suffirait à le rendre
invisible. Le pari était faux : l'écrêtage **crée** le voisin lointain qui
déclenche le dépassement.

## Correction

`rendering/bezier.ts` — limiteur de pente de Fritsch-Carlson, appliqué au seul
cas du **graphe de fonction**, détecté par des abscisses strictement monotones :

- pente nulle à tout extremum local ;
- pente bornée à trois fois la plus petite sécante adjacente.

Sur des données lisses et régulièrement espacées la borne ne mord jamais : le
rendu est alors identique à Catmull-Rom. Une courbe paramétrique (cercle,
ellipse, lissajous) n'est pas un graphe — x y revient en arrière — et garde le
Catmull-Rom uniforme, sinon ses sommets s'aplatiraient.

## Vérification

- 3 tests de dépassement (`bezier-monotone.test.ts`), dont un sur les
  échantillons réels de la cuvette ; 3775 tests geometry-core + grapheur verts.
- Rendu avant/après superposé sur la fenêtre exacte de la capture, puis relu
  dans l'application.
