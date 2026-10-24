# T_COMP — passe des points (Tle maths complémentaires, 129 points, `bo/tcomp.txt`)

Détail ligne par ligne : [tcomp.tsv](tcomp.tsv), 35 lignes.

## Bilan

- **29 points à couper (1a)**, qui donnent **40 points neufs** (129 → 169 si tout est retenu). Aucune coupe 1b : les
  points « deux gestes » de ce BO sont déjà séparés par la seed (211/212, 213/214, 233/234, 254/255, 274-281…).
- **Le gros des coupes** : les listes de formules ou de lois (228 : quatre dérivées ; 252 : trois formes de primitives ;
  221 : six limites ; 293, 311, 312 : loi géométrique, uniforme et exponentielle, chacune découpée comme la binomiale
  289-292) et les paires espérance / écart type (285, 286, 291, 304, 310), au grain de la 1re spé (1SPE-349 / 350).
- **Familles (question 2)** : 237/238 « équation, inéquation » suivent le collège 3-042 et touchent TSPE-445/446 et la
  2de (2-336 à 2-344). D'autres points de Tle spé sont à couper pareil : TSPE-301, 381, 399, 411, 419, 434, 441, 498,
  522, 528. **TSPE-469** n'est pas coupé alors que son jumeau TCOMP-254/255 l'est déjà.
- **Doublons (question 3)** : un seul, partiel. Les limites de ln figurent l. 553-554 (TCOMP-221) et l. 557 (TCOMP-225).
- **Points ⚙ (question 4)** : aucun, le BO de T_COMP n'a pas de rubrique Automatismes.
- **Références existantes respectées** : quand la partie taguée n'est pas la première du BO, l'ordre est inversé
  (205 gendarmes, 219 asymptotes, 225 courbe, 228 eᵘ). La tâche calculatrice `solve-approx-comp` vise TCOMP-243
  (balayage, qui reste premier).

## À trancher

1. **TCOMP-221, une limite par fonction (six points) ?** C'est la règle 1a appliquée à la lettre (l'exemple
   « dérivée de xⁿ, de 1/x, de √x »). Sa partie « logarithme » double alors la moitié « limites » de TCOMP-225.
   _Recommandation_ : couper en six et archiver la moitié « limites » issue de 225 (le premier point reste, la règle des
   doublons). L'autre voie : garder 221 entier comme « limites des fonctions de référence ».
2. **Modèles qui couvrent plusieurs parties (228, 252, 262, 264, 311, 312).** Ils restent tagués sur la première partie
   (« un modèle, un point par programme »), donc les autres parties n'ont aucun modèle. Ça te va, ou faut-il prévoir
   un tag par variation plus tard ? _Recommandation_ : ça me va, à revoir lors des tags.
3. **TCOMP-238** : ses deux modèles (équation / inéquation) se répartissent sur les deux moitiés, et le modèle
   « inéquation » passe au code neuf. D'accord ?
4. **TCOMP-236 : une case du BO sans point.** La l. 569 dit « de l'exponentielle ou du logarithme pour transformer une
   écriture », mais seul le logarithme a un point. La coupe tire la moitié « exponentielle » de la ligne, sans rien
   ajouter. Même manque en Tle spé (TSPE-444). _Recommandation_ : oui, couper.
5. **TCOMP-232** a perdu « utiliser le calcul des limites » (l. 564). _Recommandation_ : ne rien ajouter, car la
   l. 563 (TCOMP-230 « Calculer des limites ») couvre cette partie, et ne pas couper par fonction : c'est une compétence
   de résolution de problème.
6. **TCOMP-311 et 312** : la partie qui garde le code est la « fonction de densité », alors que le modèle porte sur
   « probabilités et espérance ». Faut-il plutôt donner le code à l'espérance ? _Recommandation_ : la densité, c'est la
   première dans le BO.
7. **Grain « espérance / écart type »** (285, 286, 291, 304, 310) : je les sépare comme en 1re spé ; la variance et
   l'écart type restent ensemble quand le BO les nomme tous deux. À confirmer, car la même coupe gagne TSPE-522 et 528.

## Non-coupes argumentées (GARDER)

- 298 « P(X = k) ou P(X ⩽ k), etc. » et 328 « interpoler, extrapoler » : un seul geste chacun, le BO ne fait que varier
  le cas.
- 300 « utiliser l'espérance des lois précédentes » : compétence de résolution de problème, les espérances ont leurs
  points.
- 203, 218, 235, 317, 321, 327 : évidemment entiers, absents du TSV.

## Écart relevé hors des quatre questions

- **Vocabulaire ensembliste et logique (l. 167-181)** : seul TCOMP-201 en est tiré. Les autres puces (ensembles,
  connecteurs, négation, contre-exemple, implication, réciproque, quantificateurs) n'ont aucun point en T_COMP, alors
  que la 2de (2-202, 2-212, 2-214) et la Tle spé (TSPE-302, 303) en ont. La seed l'a voulu, ou c'est un oubli ?
