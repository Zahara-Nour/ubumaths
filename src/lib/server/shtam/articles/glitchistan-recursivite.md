---
title: Pour comprendre la récursivité, Bosse-de-Nage doit d'abord comprendre la récursivité
date: 2027-03-15
author: cotice
lede: Le gouverneur du Glitchistan s'est lancé dans l'apprentissage de la programmation. Il a ouvert le manuel à la page « Récursivité ». Il y est renvoyé vers la page « Récursivité ». Il y est toujours.
---

Le gouverneur du Glitchistan a décidé de moderniser sa Province. Bosse-de-Nage, qui ne prononce habituellement que « ha ha », s'est inscrit à la formation de programmation de Turingrad. Les débuts ont été encourageants. Il a appris les variables, les boucles, les conditions. Puis il est arrivé au chapitre « Récursivité ».

La définition du manuel tenait en une ligne : « Récursivité : voir Récursivité. » Le gouverneur a suivi la consigne. Il est revenu au début de la page, qu'il a relue. Puis il est revenu au début de la page. Ses proches l'ont trouvé, le soir, devant le même paragraphe, répétant « ha ha » de plus en plus lentement.

L'enseignant de la formation a reconnu une erreur dans le manuel. « Il manquait le cas de base. Une définition récursive doit toujours dire quand s'arrêter. Sinon, on ne finit jamais. » Une nouvelle édition a été imprimée : « Récursivité : voir Récursivité, sauf si vous avez déjà compris. »

Bosse-de-Nage a refermé le manuel. Interrogé sur ce qu'il avait retenu de la formation, il a répondu : « ha ha ». Selon son enseignant, c'est la réponse correcte au cas de base.

## Le vrai du faux

Une fonction **récursive** est une fonction qui **s'appelle elle-même**. Exemple, la **factorielle**, $n! = n \times (n-1) \times \ldots \times 1$ :

```python
def factorielle(n):
    if n == 0:          # cas de base : on s'arrête
        return 1
    return n * factorielle(n - 1)
```

- `factorielle(4)` calcule `4 * factorielle(3)`, qui calcule `3 * factorielle(2)`, et ainsi de suite jusqu'à `factorielle(0)`, qui vaut 1. Résultat : $4! = 24$.
- Le **cas de base** est indispensable : sans lui, la fonction s'appellerait à l'infini, comme le manuel de Bosse-de-Nage. En pratique, le programme s'arrête avec une erreur quand la mémoire est pleine.
- La récursivité ressemble beaucoup au **raisonnement par récurrence** : un premier cas, puis chaque étape qui s'appuie sur la précédente.
