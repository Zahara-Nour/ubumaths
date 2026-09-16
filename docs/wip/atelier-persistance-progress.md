---
title: Atelier — persistance locale (§5)
date: 2026-09-16
status: §5 complet — ranger, relire, cas limites, deux onglets, reprise du grapheur
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

## L4 — un autre onglet a écrit

`readForeignWrite(event)` lit ce qu'une autre page vient de ranger. Le navigateur
n'émet `storage` que dans les **autres** pages de la même origine : recevoir cet
événement signifie donc littéralement « quelqu'un d'autre a touché à l'atelier ».

⚠️ **Le dernier qui écrit gagne, et on ne fusionne pas** — mais on prévient.
C'est la différence avec le grapheur, où deux onglets s'écrasent aujourd'hui en
silence. L'état reçu est rendu à l'appelant, qui peut proposer de le reprendre
plutôt que d'imposer un choix.

Quatre issues : `changed`, `cleared` (un onglet a vidé l'atelier), `corrupt`,
`ignored` (une écriture qui ne nous concerne pas).

## L5 — reprendre ce qui a été tracé dans le grapheur

`adoptGrapheurState(storage)` propose à l'atelier les courbes de `/grapheur`.
Elles n'ont **pas de nom** — le grapheur ne nomme pas ses fonctions — donc elles
reçoivent `f`, `g`, `h`… puisqu'un objet d'atelier se désigne par son nom (§1).

⚠️ **L'état du grapheur est laissé intact** : c'est une copie, pas un
déménagement. `/grapheur` continue de vivre sa vie et l'élève ne perd rien s'il y
retourne. La reprise ne se fait donc qu'une fois, quand l'atelier n'a encore rien
à lui (`skipped` sinon).

Une courbe sans expression est écartée sans coûter les autres.

## ⚠️ Revue #335 — deux pertes du travail de l'élève, fermées

La revue a trouvé **deux chemins où l'élève perdait son travail**, tous deux
mesurés avant correction. C'est précisément ce que ce lot existait pour empêcher.

### 1. Un atelier trop gros s'enregistrait « avec succès », puis revenait vide

```
avant :  70 objets → save=saved → reload=corrupt        ← tout perdu
après :  70 objets → save=saved → reload=loaded, 70 objets, 0 écarté
```

Cause : **le schéma de lecture était plus strict que ce que le modèle laisse
créer**, et `saveAtelier` ne validait rien. L'élève dépassait 64 objets, l'atelier
disait « enregistré », et au rechargement `safeParse` échouait sur **tout**
l'état.

Deux corrections, complémentaires :

- la lecture **récupère objet par objet** au lieu de rejeter en bloc, et rend le
  nombre d'objets écartés (`dropped`) ;
- l'écriture **refuse avant d'écrire** ce qu'elle ne saura pas relire
  (`too-large`), plutôt que de mentir puis de perdre.

### 2. `restore()` perdait des objets en silence

```
avant :  3 objets → 1 restauré, 2 disparus sans un mot
après :  1 restauré, 2 signalés par leur nom et leur raison
```

Atteignable sans corruption : deux fois le même nom, ou un nom réservé (`x`,
`pi`). `restore()` rend désormais un `RestoreReport` — ce qu'on ne sait pas
restaurer doit au moins être **dit**.

⚠️ **Mon propre test gravait cette perte dans le marbre** : il s'appelait
« ignore un objet de forme inattendue **sans tout perdre** » et vérifiait
exactement le comportement fautif. Un test peut consacrer un défaut au lieu de
l'attraper.

### Trois autres corrections

- **Le quota de Firefox** n'était pas reconnu (`NS_ERROR_DOM_QUOTA_REACHED`,
  code 1014) : l'élève y lisait « rien ne sera conservé » au lieu de « exporte ou
  supprime ». Et mon test fabriquait une `Error` portant le nom que le code
  cherchait — il testait le code contre lui-même. Il jette maintenant une vraie
  `DOMException`.
- Le `.max()` de la reprise faisait **échouer toute la validation** dès la 7ᵉ
  courbe du grapheur, donc zéro reprise. Retiré : la boucle plafonne déjà.
- `readForeignWrite` applique la même tolérance objet par objet.

## Reste à faire

Brancher tout ceci sur l'atelier réel — chargement au démarrage, sauvegarde
différée, écoute de l'événement `storage`. Ce sont des gestes de composant : ils
appartiennent au **lot des vues**.
