---
title: Grapheur — du singleton à l'instance par contexte
date: 2026-09-16
status: fait, 0 erreur 0 warning, en attente de revue
branche: refactor/grapheur-store
---

# Du singleton à l'instance

Prérequis de l'atelier de recherche : **l'atelier possède l'état, les vues n'en
sont que des projections** (décision figée n° 1,
[`atelier-recherche-eleve.md`](atelier-recherche-eleve.md)). Tant que les
composants du grapheur importaient `grapheurStore` en dur, une seconde instance
était impossible — ils auraient lu l'état de la première.

## Ce qui change

**12 composants** lisent leur instance au lieu de l'importer :

```ts
- import { grapheurStore } from '$lib/stores/grapheur.svelte';
+ import { useGrapheurStore } from '$lib/stores/grapheur-context';
+ const grapheurStore = useGrapheurStore();
```

Le nom de la variable ne change pas : **aucune autre ligne des composants n'a
bougé**. `GrapheurContainer` accepte une prop `store` et la fournit aux
descendants.

## Le repli sur le singleton n'est pas une facilité

`useGrapheurStore()` retombe sur le singleton quand aucun fournisseur n'est monté
au-dessus. C'est **nécessaire** : sept fichiers de tests montent les composants
seuls (`render(ParameterInput, …)`), donc sans parent et sans contexte. Sans le
repli, ils cassaient tous — et un composant monté hors de son conteneur aurait
cessé de fonctionner en silence.

Conséquence voulue : `/grapheur` et `/calc` gardent **exactement** le
comportement qu'ils avaient, état partagé compris. Rien ne change pour
l'utilisateur.

## Vérifications

|                                   |                                        |
| --------------------------------- | -------------------------------------- |
| Tests de composants grapheur      | **77, 13 fichiers — aucun modifié**    |
| Non-régression (stores + atelier) | 295 tests                              |
| `check:incremental`               | 1606 fichiers, **0 erreur, 0 warning** |
| `lint:fast`                       | rien à signaler                        |

Deux tests neufs prouvent ce que le refactor débloque : une instance fournie
reçoit les actions, le singleton reste vide, et deux instances ne se voient pas.

## Les deux `svelte-ignore`, et pourquoi

`provideGrapheurStore(store ?? grapheurStore)` déclenche
`state_referenced_locally`. La capture de la valeur initiale est ici **voulue** :
`setContext` ne peut être appelé qu'à l'initialisation d'un composant, donc
changer `store` après le montage n'aurait de toute façon aucun effet. Pour
piloter une autre instance, il faut remonter le conteneur — `{#key}` suffit.

Cas documenté comme légitime par [`warning-svelte.md`](../ref/warning-svelte.md)
§1 (pattern snapshot). Le projet est à 0 warning, et le reste.

## Ce que ça n'est pas

Le singleton **vit toujours** et reste l'instance par défaut. Ce n'est pas un
oubli : le supprimer demanderait d'envelopper les sept fichiers de tests et de
décider ce que `/grapheur` et `/calc` doivent partager — une question de produit
déjà tranchée par la décision figée n° 5, mais dont la mise en œuvre appartient
au lot des vues.
