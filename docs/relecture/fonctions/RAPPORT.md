# Lot « Fonctions » — rapport de relecture

39 questions TinyMath (#579–#617), 2de–1re : fonctions affines, valeur absolue, polynômes du
second degré, dérivation. Relecture le 2026-09-27 (Claude, trois relecteurs puis contrôle
d'ensemble).

> ✅ **Feu vert de David le 2026-09-27 : 38 questions importées en BROUILLON** (vérifié en base :
> reliées au suivi, statut draft, 38 emplacements distincts), dont #609 après #489.
> **#617 : importée le 2026-09-28 en 4 cartes de cours** (type `course_card`, brouillon, niveaux 1 à 4)
> après le chantier « cartes de cours » (#493, #494). David les publie lui-même.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 4      |
| Corrigée puis approuvée         | 35     |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

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

## #617 : quatre cartes de cours

Questions de cours à réponse rédigée (« Que cherche-t-on à savoir quand on étudie une fonction ? »),
sans case ni choix : d'abord rejetées, faute de format. Décision de David (2026-09-28) : ce sont des
flashcards destinées au SRS → nouveau type « carte de cours » (recto = énoncé, verso = correction,
auto-évaluation), puis #617 découpée en **4 cartes** (ce qu'on cherche ; où chercher les limites ; ce
que donne la dérivée ; par quoi commencer). La 4e réponse de la source est corrigée : « On commence
par déterminer son ensemble de définition. » La 1re carte est reliée au suivi de #617 ; les 3 autres
sont des brouillons du même thème et du même domaine.

## Décisions de David (2026-09-27) — appliquées

1. **#609** : forme canonique exigée (`u*($x+v)^2+w`) après correctif du moteur de motifs (#489 :
   soustraction lue comme somme, coefficient implicite ±1, jokers limités aux nombres simples).
   Importée ; images remises. Reste refusé : `-\frac{(x+2)^2}{2}-1` (coefficient sous la fraction).
2. **Décimal exact accepté** (#583, #589) : option de case `acceptDecimal` (#488) ; `0,5` juste pour ½.
3. **Facteur répété exclu** (#603, #604) : c ≠ b, comme #602.
4. **#601** : v5 sans quotient simplifiable ; nouvelles v6 (se ramène au degré 1, « Non ») et v7 (se
   ramène au second degré pour x ≠ 0, « Oui »), corrections avec la simplification.

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. `{{expression}}` / `{{solution:html}}` insérés hors formule (vides ou bruts).
2. Étapes TinyMath `@@ cond ?? … @@` converties en deux `{{if:…}}` : étape vide.
3. `{{if:…}}` en réponse attendue (découpé sur `|`) ou en bonne réponse de QCM (`{{eval}}` non
   évaluable).
4. Images perdues en mode `answerFields` ; `imagesCorrection` jamais converti.
5. `x&2` sans calcul → `xb` ; « ... » lus comme une plage ; `-{abs(&1)/(&1)}*$e[a;b]` ; dérivée
   `['_…_]` non convertie ; tabulations recopiées.
