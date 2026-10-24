---
title: Atelier → Python, « Ouvrir dans Python » — phase 0
date: 2026-10-24
status: validée par David le 2026-10-24 (« je suis tes recos » : Q1-Q4 = recos ; plafond de la carte d’une liste à 13 actions)
---

# « Ouvrir dans Python » — phase 0

Décision du 2026-10-24 ([atelier.md § Décisions](../../systeme/atelier.md#décisions)) : pas d'onglet
Python dans l'atelier, pas d'état partagé, mais un pont **à sens unique et visible**. L'élève
prend une fonction, une suite ou une liste de l'atelier et l'ouvre dans `/python` sous forme de
code Python lisible, qu'il peut modifier.

Ce qui existe déjà : `/python?code=…` (code compressé LZString, `pythonStore.loadFromUrl`). Le
travail porte surtout sur la **traduction** d'un objet de l'atelier en Python.

## La règle, en une phrase

**Le code produit est celui qu'un élève de lycée écrirait, ou qu'un sujet de bac lui donnerait à
compléter** : `def f(x): return …`, une boucle `for` pour une récurrence, une liste entre
crochets, `from math import …` pour les seules fonctions utilisées.

## Comportements

### Nominal

1. **Fonction** `f(x) = 3x^2 - 2x + 1` → menu de la carte « Ouvrir dans Python » → un nouvel
   onglet `/python` contient :
   ```python
   def f(x):
       return 3*x**2 - 2*x + 1
   ```
2. **Fonction usuelle** `g(x) = e^{-x}\sqrt{x}` → `from math import exp, sqrt` en tête, puis
   `return exp(-x)*sqrt(x)`. π → `pi`, ln → `log`, log → `log10`, |x| → `abs(x)`.
3. **Fonction qui cite un curseur** `f(x) = a x^2` avec `a = 3` → le curseur part avec sa valeur
   du moment, avant la fonction :
   ```python
   a = 3  # curseur de l'atelier
   def f(x):
       return a*x**2
   ```
   Même chose pour une fonction qui en cite une autre (`h(x) = f(x) + 1` emporte `f`).
4. **Suite explicite** `u(n) = 2n + 1` → `def u(n): return 2*n + 1`.
5. **Suite récurrente** `u(n+1) = 0,5 u(n) + 3`, u₀ = 2 → la forme du bac :
   ```python
   def u(n):
       u = 2
       for k in range(n):
           u = 0.5*u + 3
       return u
   ```
   (premier rang n₀ ≠ 0 → `range(n0, n)`.)
6. **Liste** `L = 12 ; 15 ; 9` → `L = [12, 15, 9]`.
7. **La lettre choisie par l'élève** est gardée : `f(t) = t^2` → `def f(t):`.

### Limites

8. **Valeurs exactes** : `1/3` reste `1/3` (Python calcule 0.333…), `√2` → `sqrt(2)`. On ne
   convertit jamais en décimal dans le code.
9. **Virgule décimale** : `0,5` → `0.5`.
10. **Liste à trous** (cases vides de la grille) : les cases vides sont retirées, avec un commentaire
    `# 2 cases vides retirées`.
11. **Lien trop long** (> 2 000 caractères compressés, la limite de `/python`) : refus en français
    (« Trop long pour être ouvert dans Python »).

### Erreurs / refus (le bouton est grisé, avec la raison au survol)

12. Objet **incomplet ou en erreur** : pas de bouton.
13. Ce qui ne se traduit pas sans perte : fonction **définie par morceaux** ou **sur un
    intervalle** (`sur`), grandeur **à unité**, **points et courbes** de la géométrie, liste
    **qualitative** (texte). Refus, jamais une traduction approchée.

## Questions pour David

- **Q1 — le code de l'élève dans `/python`.** Aujourd'hui `?code=` **remplace** en silence ce
  que l'élève avait dans l'éditeur (`loadFromUrl`). Reco : si son code diffère du code d'accueil,
  demander « Remplacer ton code par celui de l'atelier ? » (Annuler garde son code).
- **Q2 — un objet ou tout l'atelier ?** Reco : **un objet** (menu de la carte), avec ce qu'il
  cite (point 3). Un bouton « tout l'atelier » viendra si on le demande.
- **Q3 — une ligne d'exemple ?** Reco : **non**. Le code s'arrête à la définition ; l'élève écrit
  lui-même `print(f(2))`. (Alternative : ajouter `print(f(1))` ou `print(u(10))` pour qu'un
  clic sur Exécuter montre quelque chose.)
- **Q4 — `from math import …` ou `import math` / `math.sqrt` ?** Reco : `from math import sqrt,
exp` (seulement les noms utilisés), l'écriture des sujets de bac.

## Découpage proposé

Une seule PR : `src/lib/atelier/to-python.ts` (traduction depuis l'arbre `mathAST` de l'objet,
pas depuis le texte), ses tests (un par point ci-dessus, avec chaque refus), puis l'entrée
« Ouvrir dans Python » dans le menu de la carte, et Q1 côté `/python` si validée.
