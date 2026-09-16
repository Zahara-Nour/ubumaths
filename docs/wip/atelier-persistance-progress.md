---
title: Atelier — persistance locale (§5)
date: 2026-09-16
status: lot 1 fait (ranger, relire, cas limites) ; L4 et L5 à venir
branche: feat/atelier-persistance
---

# Persistance locale

Comportements : [`atelier-recherche-eleve-phase0.md`](atelier-recherche-eleve-phase0.md) §5.
Sans compte, le navigateur est la **seule** mémoire de l'élève : ce lot ne doit
jamais perdre son travail en silence.

## Fait

`src/lib/atelier/persistence.ts` — le stockage est **injecté** plutôt
qu'importé : la logique se teste en node, et `null` représente le cas « stockage
refusé » (navigation privée, §5 E1).

Chaque issue porte un nom, et l'appelant décide quoi dire à l'élève :

| Lecture       | Écriture        |
| ------------- | --------------- |
| `loaded`      | `saved`         |
| `empty`       | `quota`         |
| `too-recent`  | `refused-newer` |
| `corrupt`     | `unavailable`   |
| `unavailable` |                 |

Plus `Atelier.serialize()` et `Atelier.restore()`.

### Deux refus délibérés

**Le quota ne réduit rien** (§5 L1). `calculator.svelte.ts:444` coupe l'historique
de moitié puis le vide, sans un mot. Ici c'est le travail de l'élève : on refuse,
on explique, on propose d'exporter.

**Un état plus récent n'est ni relu ni écrasé** (§5 L2). La version se lit
**avant** la validation — un format plus neuf a le droit d'avoir une forme qu'on
ne connaît pas encore — et `saveAtelier` refuse d'écrire par-dessus.

---

## ⚠️ Le test que j'ai failli livrer, et qui ne prouvait rien

Le test du `structuredClone` était écrit en **node**. Il passait. Neutralisation
faite, il passait **aussi sans** `$state.snapshot()` — puis j'ai découvert que
`structuredClone(atelier.objects)` ne jetait pas non plus.

**Le piège n'existe pas en node.** Mesuré :

```
navigateur :  objects=DataCloneError   un-objet=DataCloneError
              values=DataCloneError    serialize=ok
node       :  tout passe
```

Conséquences, toutes vérifiées :

1. Le test est parti dans `serialize.svelte.test.ts`, **dans un navigateur**, et
   teste le **contraste** : l'état vivant n'est pas clonable, ce que `serialize()`
   en tire l'est. Neutralisation refaite : il rougit bien quand `serialize()`
   rend `this.items`.
2. **`$state.snapshot()` a été retiré** : mesuré inutile ici, puisque seules des
   chaînes sont recopiées. Le garder aurait été une incantation. Le commentaire
   dit ce qui le rendrait nécessaire — un champ non primitif entrant dans la
   sérialisation.

**La leçon** : un test sur les runes écrit en node peut rassurer sans rien
vérifier. Le nom du fichier (`*.svelte.test.ts` ou non) décide de ce qu'il peut
prouver.

---

## Vérifications

|                     |                                        |
| ------------------- | -------------------------------------- |
| Tests               | **113 node + 3 navigateur**            |
| `check:incremental` | 1606 fichiers, **0 erreur, 0 warning** |
| `lint:fast`         | rien à signaler                        |

⚠️ Le typecheck a été **tué trois fois par le harness** (seuil de consommation),
alors que 59 % de la mémoire système était libre. Lancé par David depuis son
terminal, il passe. À retenir : un kill n'est pas un échec, et une mesure tuée ne
vaut rien.

---

## Reste à faire du §5

- **L4 — deux onglets** : le dernier qui écrit gagne, mais on prévient. Demande
  d'écouter l'événement `storage`.
- **L5 — reprendre un ancien `chiphre-grapheur-state`** : les fonctions anonymes
  reçoivent un nom, l'ancienne clé est conservée le temps d'une version.
