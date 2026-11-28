---
title: Lot d'outils `python` — case « programme Python exécuté » (outil 49)
date: 2026-11-28
status: phase 0 posée, en attente de David
---

# Lot `python` : outil 49

## Reprendre ici

_Mis à jour le 2026-11-28, avant toute PR._

- **État** : phase 0 de l'outil 49 écrite ci-dessous, rien de codé.
- **Prochaine action** : lire les réponses de David aux questions Q1 à Q4, puis tests rouges.
- **En attente de David** : Q1 à Q4 (§ Phase 0).
- **Pièges en cours** : Python ne tourne que dans le navigateur (Pyodide) ; `validateAnswer` est
  synchrone et une évaluation notée est corrigée par le serveur (ADR 0015).
- **Worktree / branche** : `../ubumaths-wt-outil-python` · `feat/outil-python`.

## L'outil

`outils-manquants.md` n° 49 : l'élève écrit une fonction Python (seuil d'une suite…), jugée par
des tests, dans une case d'un modèle de question. Besoin : TSPE-392, TSPE-393, relevé
`idees-tle-suites` (TSA1-35 : « écrire en Python une fonction seuil (tests cachés), puis le rang »).

Ce qui existe : les exercices Python (`/python-exercises`) jugent déjà une fonction (`unit_test`,
`reference_solution`, exigences sur le code comme « utilise une boucle »), dans un worker Pyodide
du navigateur, délai de 5 s. Mais ce ne sont pas des cases de modèles de questions.

## Phase 0

### Exemple d'élève (nominal)

Énoncé : « La suite $u$ est définie par $u_0 = 2$ et $u_{n+1} = 1{,}5\,u_n$. Écris la fonction
`seuil(A)` qui rend le plus petit rang $n$ tel que $u_n > A$. » Les nombres 2 et 1,5 sont tirés.

L'élève voit un éditeur de code, déjà rempli par le début donné par l'auteur :

```python
def seuil(A):
    u = 2
    n = 0
    while ...:
        ...
    return n
```

Il complète, appuie sur « Valider » comme pour toute question. Le programme tourne dans son
navigateur sur quelques valeurs de `A` choisies par l'auteur. Tout juste → case juste.

### Limite

- La fonction rend le bon rang pour `A = 100` mais pas pour `A = 2` (cas du bord : $u_0 > A$ est
  faux, il faut un tour de boucle) → case fausse, message : « `seuil(2)` : ta fonction rend 0, on
  attendait 1. »
- L'élève écrit `return 7` (la réponse d'un seul test) → faux, car plusieurs valeurs de `A`.
- Une deuxième case ordinaire peut suivre (« donne le rang pour A = 1000 ») : elle se juge seule.

### Erreur

- Erreur de syntaxe → case fausse, message avec la ligne (« ligne 4 : il manque `:` »).
- Boucle sans fin → arrêt au bout de 5 s, case fausse : « ton programme ne s'arrête pas ».
- Pas de fonction `seuil` → « il faut écrire la fonction `seuil` ».
- Premier lancement : Python se charge (quelques secondes, ~10 Mo) ; un message « Python se
  charge… » tant que ce n'est pas prêt.

### Syntaxe d'auteur proposée

Un bloc dans l'énoncé, à la place de la case ; l'auteur écrit **sa solution**, pas les résultats
attendus (c'est la solution qui les calcule, avec les nombres tirés) :

````
```python-a-ecrire
fonction: seuil
depart: |
  def seuil(A):
      u = {{u0}}
      n = 0
      while ...:
          ...
      return n
solution: |
  def seuil(A):
      u = {{u0}}
      n = 0
      while u <= A:
          u = {{q}} * u
          n = n + 1
      return n
essais: seuil(2) ; seuil(100) ; seuil(10000)
exiger: boucle
```
````

`exiger:` reprend les exigences des exercices Python (boucle, pas de `print`…), facultatif.

### Questions à David

- **Q1 — Évaluations notées.** Une évaluation notée est corrigée par le serveur (ADR 0015), et le
  serveur ne sait pas faire tourner Python. Je propose : un modèle qui a une case Python **ne peut
  pas entrer dans une évaluation notée** (refus clair à l'ajout), ni dans les jeux et combats
  corrigés par le serveur. Il sert à l'entraînement (séries, fiches, révisions). D'accord ?
- **Q2 — Solution visible.** Le navigateur doit avoir la solution de l'auteur pour juger : un élève
  qui sait ouvrir les outils du navigateur peut la lire (comme aujourd'hui pour les exercices
  Python). Acceptable pour de l'entraînement ?
- **Q3 — Ce que l'élève voit d'un essai raté.** Je propose de montrer le premier essai raté («
  `seuil(2)` : ta fonction rend 0, on attendait 1 »). Ou bien cacher les essais (« un de nos
  essais échoue »), comme dit TSA1-35 « tests cachés » ?
- **Q4 — Début donné.** Le `depart:` est-il librement modifiable par l'élève, ou bien seules les
  zones `...` sont modifiables (les « zones verrouillées » des exercices Python) ? Je propose
  libre, plus simple ; les zones verrouillées en option plus tard.
