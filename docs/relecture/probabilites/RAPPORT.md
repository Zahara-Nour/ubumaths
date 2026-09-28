# Lot « Probabilités » — rapport de relecture

2 questions TinyMath (#481, #482), classées en 6e : probabilité simple d'un lancer de dé, fréquence
d'apparition. Relecture le 2026-09-28 (Claude, un relecteur puis contrôle d'ensemble).

> ⏳ **En attente du feu vert de David** pour l'import en BROUILLON.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 0      |
| Corrigée puis approuvée         | 2      |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/probabilites`) : **2 analysés,
0 non importable**, 50 tirages par variation sans échec (#481 ne générait pas avant relecture).
Rendu : aucun marqueur brut.

## Corrections notables

- **#481** (« probabilité simple », 4 variations : un nombre donné, un nombre impossible, un nombre
  pair, un multiple de k) : la case disait « La fréquence d'apparition est » alors qu'on demande une
  probabilité ; l'énoncé ne disait pas que le dé est **équilibré** ni comment ses faces sont
  numérotées (équiprobabilité non posée) ; correction hors formule → réécrite avec « issues
  équiprobables », « événement impossible », et le cas « une seule face convient ».
- **#482** (fréquence d'apparition d'un nombre, de face, de pile) : consignes à l'impératif, étapes de
  correction explicites (« apparaît c fois sur a lancers », « pile = a − b »), espaces avant « ? ».

## Choix du relecteur (vérifiés par des specs)

- Fraction non réduite (`\frac{2}{12}`) : **juste** (option TinyMath « pas de pénalité » conservée).
- Décimal exact (0,125 ; 0,4) : **juste** (`acceptDecimal`) ; arrondi (0,17) : faux.
- Valeur hors de [0 ; 1] et erreurs typiques (effectif au lieu de la fréquence, pile/face inversés) :
  fausses.
- 40 % pour 0,4 : mauvaise forme — cohérent avec ta décision des pourcentages (#491 : `710 %` pour
  7,1 = mauvaise forme).

## À trancher par David

1. **Classe** : les deux sont en 6e. Les probabilités sont au programme à partir de la 5e (cycle 4).
   Recommandé : **#481 en 5e** ; #482 (fréquence d'un effectif observé) peut rester en 6e.
2. **Rangement de #481** : sous-domaine « fréquences » alors qu'elle porte sur une probabilité.
   Recommandé : **« Probabilité simple »**.
3. **Casse** : domaine « apprivoiser », sous-domaine et titres en minuscules, alors que les autres
   lots écrivent « Apprivoiser ». Recommandé : **majuscule initiale** (Apprivoiser, Fréquences,
   Probabilité simple, Fréquence).

## Défauts de conversion (corrigés à la main)

1. `{{solution:0}}` hors de `$…$` dans la correction (LaTeX brut).
2. Énoncé en question, répété par la case, au lieu d'une consigne à l'impératif.
3. Espace manquante avant « ? » ; variable hors mode math dans une branche `{{if:…}}`.
