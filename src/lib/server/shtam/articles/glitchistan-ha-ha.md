---
title: Turingrad — le programme du Gouverneur dit « ha ha » sans interruption depuis 1898, les ingénieurs n'osent pas l'arrêter
date: 2026-10-29
author: merdranpo
lede: Personne ne sait si la machine finira un jour par s'arrêter d'elle-même. Les ingénieurs du Glitchistan ont décidé d'attendre. Ils attendent toujours.
---

Dans la salle des machines de Turingrad, la grande calculatrice à vapeur du Glitchistan affiche, depuis 1898, un seul et unique message : « ha ha ». Puis à nouveau « ha ha ». Puis encore « ha ha ». Le programme a été écrit par le gouverneur de la Province, Bosse-de-Nage, qui, selon ses proches, n'a jamais rien su dire d'autre.

« Nous avons tout essayé pour savoir s'il allait s'arrêter un jour », raconte l'ingénieure en chef. « Nous avons lu le programme, nous avons attendu, nous avons attendu encore. » Après cent vingt-huit ans d'observation, son équipe est parvenue à une conclusion prudente : « Il ne s'est pas encore arrêté. »

Une proposition de débrancher la machine a été rejetée en conseil. « Et s'il était sur le point de finir ? », a objecté un ministre. Depuis, un Palotin de garde est chargé de vérifier chaque matin que la machine dit toujours « ha ha ». Elle le dit toujours.

Bosse-de-Nage, sollicité par le Shtam pour une déclaration, a répondu : « ha ha ».

## Le vrai du faux

Le programme du Gouverneur ressemble à ceci :

```python
while True:
    print("ha ha")
```

C'est une **boucle infinie** : la condition `True` est toujours vraie, donc la boucle ne s'arrête jamais. Ici, on le voit en lisant le programme.

- Mais en général, c'est **impossible à savoir à coup sûr** : Alan Turing (1912-1954) a démontré en 1936 qu'**aucun** programme ne peut décider, pour **tous** les programmes, s'ils finiront par s'arrêter. C'est le **problème de l'arrêt**.
- Ce résultat est l'un des fondements de l'informatique : il existe des questions précises auxquelles aucun ordinateur, si puissant soit-il, ne pourra jamais répondre.
