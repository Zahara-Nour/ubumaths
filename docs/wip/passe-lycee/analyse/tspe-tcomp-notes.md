# Lot `tspe-tcomp` : questions à trancher

Lot de 65 modèles (55 de T_SPE,T_COMP, 10 de T_COMP seul), jugés contre T_SPE et T_COMP, et contre T_TECHNO, 1_GEN ou
1_TECHNO quand la tâche y figure. Détail : [tspe-tcomp.csv](tspe-tcomp.csv). Trois questions, quatre lignes
`A_TRANCHER`.

## Q1. Suites arithmético-géométriques en Tle spé : quel point, ou hors programme ?

**Modèles** :

- `81ff485d` « Suite arithmético-géométrique : solution constante et limite » ;
- `9f14d672` « Suite arithmético-géométrique : expression de uₙ en fonction de n ».

Ligne concernée : T_SPE de chacun. En T_COMP, ils sont tagués sans difficulté (TCOMP-208 et TCOMP-214).

**Exemples tirés du relevé** :

- `81ff485d` V4 : « La suite (uₙ) est définie par u₀ = 110 et uₙ₊₁ = 0,2 uₙ + 72. Détermine la limite de (uₙ). »
  → 90.
- `81ff485d` V3 : « ℓ = 2ℓ + 9 » → −9.
- `9f14d672` V1 : « On pose vₙ = uₙ − 90 et on admet que (vₙ) est géométrique de raison 0,2. Exprime uₙ en fonction
  de n. » → 20 × 0,2ⁿ + 90.

**Le problème** : la Tle spé n'a aucun point « arithmético-géométrique ». Ce type de suite est un exercice classique
de Tle spé, mais le BO ne le nomme pas. Le point le plus proche est **TSPE-432** « Pour une fonction continue f d'un
intervalle dans lui-même, étudier une suite définie par une relation de récurrence uₙ₊₁ = f(uₙ) ». Ici f(x) = ax + b,
continue de ℝ dans ℝ, et ℓ en est le point fixe. Mais TSPE-432 est rangé dans la rubrique « Continuité », où l'on
s'attend plutôt au théorème du point fixe.

**Options** :

- **A.** TSPE-432 pour les deux modèles : f affine continue de ℝ dans ℝ ; la suite auxiliaire (9f14d672) n'utilise que
  les suites géométriques de 1re spé, puisque vₙ est donnée ou suggérée.
- **B.** Hors programme en Tle spé : le BO ne nomme pas la méthode, et les modèles restent en T_COMP seulement.
- **C.** Au cas par cas : `81ff485d` V4-V5 (les limites) vers TSPE-385 « Établir la convergence d'une suite, ou sa
  divergence vers +∞ ou −∞ », le reste hors programme. Un modèle ne portant qu'un point, il faudrait alors scinder
  `81ff485d`.

**Reco** : A. C'est l'usage des sujets de Tle spé, et la borne de TSPE-432 (f continue d'un intervalle dans
lui-même) est respectée.

## Q2. Seuil par le logarithme : un modèle « ln » peut-il viser la Tle techno ?

**Modèle** : `f1963ef2` « Seuil : plus petit entier n tel que qⁿ dépasse une valeur (logarithme) ». Ligne
T_TECHNO.

**Exemples tirés du relevé** :

- V1 : « Détermine le plus petit entier naturel n tel que 0,9ⁿ < 0,001. » → 66.
- V2 : « Un capital de 5 000 euros est placé à 3 % : Cₙ = 5 000 × 1,03ⁿ. Plus petit n tel que Cₙ ⩾ 10 000 ? » → 24.
- V3 : « uₙ = 90 − 29 × 0,9ⁿ ; plus petit n tel que uₙ > 89 » → 32.

**Le problème** : les trois énoncés ne citent aucun logarithme et se résolvent au logarithme décimal. Ils entrent
donc dans **TTECHNO-085** « Utiliser le logarithme décimal pour résoudre une inéquation du type aⁿ < b d'inconnue n
entier naturel » (V3 se ramène à 0,9ⁿ < 1/29 ; contextes : intérêts composés, suite à termes positifs). Mais le
titre dit « (logarithme) » et le sous-titre « qⁿ < s ⟺ n > ln(s)/ln(q) ». Or la voie techno n'a ni exp ni ln (borne
générale de T_TECHNO). Le relevé ne montre pas le corrigé ; s'il passe par ln, l'élève de techno voit une fonction
qu'il ne connaît pas.

**Options** :

- **A.** Taguer TTECHNO-085 tel quel : l'énoncé est neutre, et l'élève peut résoudre au log.
- **B.** Ne pas taguer ce modèle en T_TECHNO, et écrire un modèle jumeau « au logarithme décimal » (titre, sous-titre
  et corrigé en log) tagué TTECHNO-085.
- **C.** Faire un corrigé à deux voies (ln ou log), puis taguer TTECHNO-085.

**Reco** : B, si le corrigé passe par ln (à vérifier dans le modèle). Sinon A.

## Q3. Intégrales de signe quelconque en Tle compl. : Chasles, valeurs négatives, bornes inversées

**Modèle** : `3b396d9c` « Relation de Chasles pour les intégrales ». Ligne T_COMP. La même réponse vaut pour deux
lignes déjà taguées sous réserve : `dd0ee69a` V1 (m de −3 à 3 dans m ⩽ f ⩽ M) et `b52c53d8` V1 (intégrales de
mx + p, négatives possibles).

**Exemples tirés du relevé** :

- V2 : « ∫₋₄³ f = 9 et ∫₋₄¹ f = −8 ; ∫₁³ f = ? » → 17.
- V3 : « ∫₋₃⁴ f = 9 ; ∫₄⁻³ f = ? » → −9.

**Le problème** : en Tle compl., l'intégrale est définie pour une fonction continue et positive (TCOMP-266
« Définition de l'intégrale d'une fonction continue et positive sur [a, b] comme aire sous la courbe »). Le BO écrit
« Relation de Chasles » sur la même ligne. Le signe quelconque n'y est qu'une « présentation » (TCOMP-271
« Présentation de l'intégrale des fonctions continues de signe quelconque »). Le modèle tire des intégrales
négatives (p, q, r de −9 à 9), et V3 inverse les bornes (∫ᵇᵃ = −∫ₐᵇ), ce que le BO de Tle compl. n'écrit nulle part.

**Options** :

- **A.** TAG TCOMP-267 tel quel : le signe quelconque est présenté dans l'année, et F(b) − F(a) (TCOMP-273) donne
  aussitôt les valeurs négatives et ∫ᵇᵃ = −∫ₐᵇ.
- **B.** MODIFIER : tirer p, q > 0 et r > p (intégrales positives), retirer V3 (bornes inversées). Restreindre de même
  `dd0ee69a` V1 (m ⩾ 0) et `b52c53d8` V1 (intégrande positif sur [a ; b]).
- **C.** Garder les valeurs négatives (V1, V2), mais retirer V3 (l'inversion des bornes n'est pas au BO).

**Reco** : A. La « présentation » du signe quelconque rend ces calculs naturels, et la Tle compl. calcule F(b) − F(a)
sans condition de signe (TCOMP-272 et 273 parlent d'une fonction continue). Si David préfère la lettre du BO : C.
