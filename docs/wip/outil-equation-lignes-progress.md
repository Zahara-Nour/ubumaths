---
title: Lot d'outils equation-lignes — résoudre une équation ligne par ligne (outil 55)
date: 2026-11-28
status: phase 0 posée, en attente de David
---

# Lot `equation-lignes` (outil 55)

## Reprendre ici

_Mis à jour le 2026-11-28, avant toute PR._

- **État** : outil 55 vérifié absent du code (aucune `AnswerKind` à plusieurs lignes) ; phase 0
  posée ci-dessous · **Prochaine action** : réponses de David aux questions 1 à 4, puis tests
  rouges · **En attente de David** : questions 1 à 4 · **Pièges en cours** : lot « mathAST » (un
  seul à la fois, règle 1 d'`outils-lots.md`) · **Worktree / branche** :
  `../ubumaths-wt-outil-equation-lignes`, `feat/outil-equation-lignes`.

## Outil 55 — phase 0 (2026-11-28)

Source : `outils-manquants.md` n° 55 ; idée venue de `idees-3e-calcul-litteral` (3L13, 3L13-1,
3L13-2), points 4-024 et 4-025. Aucune décision détaillée de David écrite avant ce journal.

### Ce que verrait l'élève

L'énoncé donne l'équation. Sous elle, la case : une première ligne vide, un bouton « Ajouter une
ligne » (et Entrée passe à la ligne suivante), une croix pour retirer une ligne.

> Résous : 3x − 5 = 7
>
> 3x = 12
> x = 4

### Comment c'est jugé

- Chaque ligne est comparée à la précédente (la première à l'équation de l'énoncé) : elles doivent
  avoir **les mêmes solutions**. `3x = 12` → `x = 4` : juste. `6x = 24` aussi.
- La dernière ligne doit être **x = valeur**, valeur simplifiée (fraction irréductible ; décimal
  exact accepté si le modèle le dit, comme une case ordinaire).
- **Nominal** : 3x − 5 = 7 → 3x = 12 → x = 4 : juste.
- **Limite** : … → x = 12/3 : lignes justes, dernière non simplifiée → ½ (« à simplifier »), comme
  ailleurs. Une ligne recopiée sans changement : acceptée (elle ne change pas les solutions).
- **Erreur** : 3x − 5 = 7 → 3x = 2 → x = 2/3 : la ligne 1 est marquée fausse (« cette ligne n'a
  pas les mêmes solutions que la précédente »), la réponse est fausse. Ligne illisible ou sans
  signe = : marquée « je ne peux pas lire cette ligne », réponse fausse. Rien écrit : vide.
- À la correction, chaque ligne porte ✓ ou ✗ ; la correction modèle montre les étapes que mathAST
  sait déjà écrire (`pedagogical-solve`, équations du premier degré).

Portée : équations du premier degré en x à une solution (3L13, 3L13-1, y compris
k(ax + b) = cx + d) et équations de proportion (x/4 = 3/5, 4/x = 5/3).

### Syntaxe d'auteur proposée

Une nouvelle nature de case, comme `intervalles` ou `equation` :

```python
{'answerKind': 'resolution', 'equation': '{{a}}x+{{b}}={{c}}'}   # réponse attendue : x={{s}}
```

### Questions à David

1. **Ligne fausse au milieu, dernière ligne juste** (deux erreurs qui se compensent) : réponse
   fausse (je recommande : c'est la méthode qu'on juge) ou ½ ?
2. **L'élève écrit seulement `x = 4`**, sans étape : juste (je recommande, avec un réglage du
   modèle « au moins N lignes » pour exiger des étapes) ou toujours au moins une étape ?
3. **Coche à chaque ligne pendant la saisie**, ou seulement à la validation (je recommande : comme
   les autres cases ; en évaluation, une coche en direct donnerait la réponse) ?
4. **Nom** de la nature de case : `resolution` ?

## Historique

### 2026-11-28 — ouverture

Lot réservé par `pnpm outils lancer` (c825324f80). Outil vérifié absent : `AnswerKind` =
intervalles, equation, vecteur, matrice, primitive, solution-ed ; rien à plusieurs lignes.
