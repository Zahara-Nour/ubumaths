---
title: La machine de Turingrad ne sait plus additionner, Mère Ubu sait toujours soustraire… de l'argent à ses clients
date: 2026-11-19
author: pile
lede: À cause d'une erreur d'arrondi, la Banque de Turingrad a versé à un client une somme minuscule en trop. Mère Ubu exige qu'il la rende, « avec les intérêts ».
---

L'incident s'est produit mardi, à la Banque Centrale du Glitchistan. Chargée d'additionner deux dépôts de 0,1 et 0,2 gidouille, la grande machine de Turingrad a affiché un solde de 0,30000000000000004 gidouille. Le guichetier, consciencieux, a versé la somme au client.

Il n'en fallait pas davantage pour alerter Mère Ubu. « Quelqu'un a reçu 0,00000000000000004 gidouille de trop », a-t-elle déclaré. « Je veux savoir qui, et je veux la récupérer. » Une équipe d'huissiers a été dépêchée à Turingrad avec une loupe.

Les ingénieurs de la Banque se défendent. « La machine ne se trompe pas, elle arrondit. Elle compte en base deux, et en base deux, 0,1 n'a pas de fin. » L'explication n'a pas convaincu les huissiers, qui ont saisi la machine, la loupe, et par erreur le guichetier.

Le client, lui, a décidé de placer ses 0,00000000000000004 gidouille sur un livret à 5 % par an. Selon ses calculs, il possédera une gidouille entière dans environ 775 ans. Il se dit prêt à attendre.

## Le vrai du faux

C'est vrai : beaucoup de langages de programmation affichent ce résultat.

```python
print(0.1 + 0.2)   # 0.30000000000000004
```

- Les ordinateurs stockent les nombres en **binaire** (base 2), avec un nombre limité de chiffres. Or en binaire, $0{,}1$ s'écrit avec une infinité de chiffres, comme $\frac{1}{3} = 0{,}333\ldots$ en base 10. L'ordinateur doit donc **arrondir**, et une toute petite erreur apparaît.
- C'est pour cela qu'en informatique, on ne compare jamais deux nombres décimaux avec `==`, et que les banques comptent souvent en **centimes entiers**.
