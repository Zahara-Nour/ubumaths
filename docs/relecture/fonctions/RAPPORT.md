# Lot « Fonctions » — rapport de relecture

39 questions TinyMath (#579–#617), 2de–1re : fonctions affines, valeur absolue, polynômes du
second degré, dérivation. Relecture le 2026-09-27 (Claude, trois relecteurs puis contrôle
d'ensemble).

> ✅ **Feu vert de David le 2026-09-27 : 37 questions importées en BROUILLON** (vérifié en base :
> reliées au suivi, statut draft, 37 emplacements distincts). #609 en attente (point 1 ci-dessous),
> #617 rejetée. David les publie lui-même.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 4      |
| Corrigée puis approuvée         | 33     |
| Rejetée                         | 1      |
| À arbitrer                      | 1      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/fonctions`) : **39 analysés,
0 non importable**, 50 tirages par variation sans échec. Images : 262 citées, toutes présentes dans
`static/images/questions/` (#607 citait des `.webp` inexistants, corrigé en `.png`). Rendu (5 tirages
par variation) : aucun marqueur brut, aucun `*` dans une formule.

## Préparation : convertisseur (#487)

`&1x` était lu comme le nom « 1x » : `[_&1x_]` devenait `{{eval:1x}}`, le coefficient tiré était
perdu ; et la variable de fonction `x` dans un calcul échouait (« free variables: x »). Les deux
corrigés ensemble : 28 → 34 questions génèrent (corriger le second seul aurait rendu des questions
générables mais fausses : #603 affichait « x² + 5x + 5 » et attendait 3).

## Corrections notables (fond)

- **#587** : les tirages pouvaient donner deux droites parallèles (même coefficient directeur), voire
  identiques, alors que la réponse attendue était « non parallèles » → exclusions ajoutées.
- **#590** v19 : réponse TinyMath fausse (0 au lieu de 3), vérifiée sur l'image.
- **#601** : un coefficient tiré nul donnait un énoncé faux (« −3x²0x+2 ») → chaque polynôme calculé
  d'un bloc, termes nuls retirés.
- **#608** v3 : un coefficient pouvait valoir 0 (« 5(x−4)^{20} ») ou avoir le mauvais signe (bonne
  réponse fausse) → tirage réécrit.
- **#597, #604** : réponse attendue / bonne réponse de QCM sorties en condition littérale ou non
  calculables. **#616** : réponse attendue cassée (aucune réponse juste possible).
- **#582, #583, #590, #607** : graphiques perdus à la conversion (questions insolubles) → remis, avec
  l'image de correction.
- **#581** : les « ... » de l'énoncé lus comme une plage aléatoire (génération impossible).
- **#595** : l'énoncé pouvait afficher « |7,0| ».
- Corrections : `{{expression}}` et `{{solution:html}}` affichés vides ou bruts hors formule
  (≈ 15 questions), tabulations, `\bold{` non fermé (#603), étapes vides ; « Résouds », « s'annulle »,
  « coefficent », « d'un fonction », « une expression positif ».

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Rejetée

- **#617** : questions de cours à réponse rédigée (« Que cherche-t-on à savoir quand on étudie une
  fonction ? »), sans case ni choix : le format ne sait pas les corriger.

## À décider par David

1. **#609 (forme canonique lue sur une parabole)** : sans forme exigée, la forme développée est
   comptée juste — l'objectif de la question est perdu. Le motif (#482) ne sait pas encore l'exiger :
   il impose l'ordre d'une somme de DEUX termes (`u(x+v)^2+w` refuse `−½(x+2)²−1`) et ne voit pas
   le coefficient implicite ±1 (`(x−1)²−3`, `−(x+1)²+3`). Proposition : corriger ces deux limites du
   moteur de motifs (petite PR, tests d'abord), puis importer #609 avec la forme canonique exigée.
2. **Décimal exact** (#583, #589) : `0,5` est refusé quand `\frac{1}{2}` est attendu. L'accepter ?
3. **Facteur répété** (#602–#604) : un tirage peut donner `3(x+5)(x+5)` (TinyMath l'autorisait).
   Ajouter `b ≠ c` ?
4. **#601 v5** : une fraction rationnelle simplifiable reste classée « non polynôme » (à cause du
   domaine) — un élève peut contester. Garder ?

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. `{{expression}}` / `{{solution:html}}` insérés hors formule (vides ou bruts).
2. Étapes TinyMath `@@ cond ?? … @@` converties en deux `{{if:…}}` : étape vide.
3. `{{if:…}}` en réponse attendue (découpé sur `|`) ou en bonne réponse de QCM (`{{eval}}` non
   évaluable).
4. Images perdues en mode `answerFields` ; `imagesCorrection` jamais converti.
5. `x&2` sans calcul → `xb` ; « ... » lus comme une plage ; `-{abs(&1)/(&1)}*$e[a;b]` ; dérivée
   `['_…_]` non convertie ; tabulations recopiées.
