# Lot « Racines » — rapport de relecture

10 questions TinyMath (#471–#480), 5e–2de : définition, existence, carré d'une racine, réduire,
égalités, calculer. Relecture le 2026-09-28 (Claude, deux relecteurs puis contrôle d'ensemble).

> ⏳ **En attente du feu vert de David** pour l'import en BROUILLON.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 1      |
| Corrigée puis approuvée         | 9      |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/racines`) : **10 analysés,
0 non importable**, 50 tirages par variation sans échec. Rendu (5 tirages par variation) : aucun
marqueur brut. Avant relecture, 4 questions ne généraient pas ou en partie (#472, #473, #474, #478).

## Corrections notables

- **Génération** : le renvoi TinyMath `&exp` était devenu `{{exp}}`, variable inexistante (#472–#474) ;
  #478 déclarait deux fois `expression2`.
- **Réponses que le correcteur refusait toutes** : #477 attendait `5sqrt(3)` (texte brut) → `5\sqrt{3}`.
- **Lettres affichées à la place des nombres** : `a √4` (#478), `(b√7)²` (#480).
- **#473 (existence)** : π était lu comme p·i (`\sqrt{p \imaginaryI}`) → écrit en dur ; valeur
  approchée à 14 décimales → arrondie au millième ; « Oui » / « Non » ; 8 variations vérifiées
  (réponse selon le signe, √0 existe).
- **Corrections** : #479 n'en avait aucune → ajoutée (dont √((−a)²) = a, « et non −a ») ; #480 v1
  commençait par « &= » sans membre de gauche ; #475 justifie désormais la comparaison ; #474 : la
  correction partagée renvoyait à la mauvaise expression → une par variation.
- **Forme exigée vérifiée par des specs** (#476, #477) : `\sqrt{50}`, `2\sqrt{50}`, `\sqrt{25}\sqrt{2}`,
  `2\sqrt{3}+3\sqrt{3}` refusés (mauvaise forme) ; `5\times\sqrt{2}` perfectible ; décimal refusé.
- « racine carré » → « racine carrée » dans les titres.

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## À trancher par David

1. **Thème « Racines carré »** (sans e) sur les 10 questions. Aucune question en base ne porte ce
   thème : le corriger en « Racines carrées » ne casse aucun regroupement. Recommandé : corriger.
2. **#471** (« trouver un nombre positif de carré donné ») est en 5e, ses voisines en 4e. Elle ne
   porte que sur un carré : 5e se défend. Recommandé : garder.
3. ✅ **#478 — décidé par David (2026-09-28)** : b tiré parmi 2, 3, 5, 6, 7 (plus de « √64 = 4√4 »,
   où la question se réduisait à « 8 = 8 ? ») ; en v1, b ± 1 aussi sans facteur carré (2↔3, 5↔6,
   6↔7) ; une correction par variation, avec sa conclusion (égales / pas égales). Vérifié sur
   300 tirages par variation : aucune racine non réduite.

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. `&exp` → `{{exp}}` (inexistant) ; `&expression` → `{{expression}}` rendu en texte brut.
2. Renvoi collé à une fonction (`&1sqrt(&2)`) → `asqrt(b)` : la lettre s'affiche.
3. Solution `[_…_]sqrt(&3)` → réponse attendue en texte brut, illisible pour le correcteur.
4. `&1 = pi` → variable introuvable ; `[._sqrt(&1)_]` → 14 décimales ; `&sol` / `&solution` avec des
   `$` décalés.

## Limites du moteur relevées

- `{{expressionN}}` n'est rendu en LaTeX qu'en tête de `$…$` ; ailleurs dans une formule, il sort
  en brut.
- `sqrt(pi)` en syntaxe maison est lu p·i (π s'écrit `\pi`).
