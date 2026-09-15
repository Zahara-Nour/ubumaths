---
title: Atelier de recherche — progression du chantier
date: 2026-09-15
status: Phase 1 — tests écrits et ROUGES, aucune implémentation
branche: feat/atelier
worktree: ../ubumaths-wt-atelier
---

# Atelier — progression

| Document                                                               | Rôle                                      |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [atelier-recherche-eleve.md](atelier-recherche-eleve.md)               | Cadrage, 5 décisions figées, périmètre v1 |
| [atelier-recherche-eleve-phase0.md](atelier-recherche-eleve-phase0.md) | Comportements attendus, décisions D1 à D8 |
| **ce fichier**                                                         | Où en est le chantier                     |

---

## Fait

### Phase 0 — spécification (validée le 2026-09-15)

D1 à D8 tranchées par David, toutes dans le sens des recommandations. Seul le
plafond chiffré de D8 (200 valeurs par liste, 8 listes) est une proposition de
ma part, à contester.

### Phase 1 — tests d'abord, vus ROUGES

**38 tests, tous en échec, et en échec sur le comportement** — les signatures
existent et lèvent « non implémenté », donc aucun test ne rougit à cause d'un
import cassé. C'est la preuve rouge au sens fort.

| Fichier                                     | Tests | Couvre                                      |
| ------------------------------------------- | ----- | ------------------------------------------- |
| `src/lib/atelier/__tests__/names.test.ts`   | 15    | §1 nommage, §2.2 collisions                 |
| `src/lib/atelier/__tests__/atelier.test.ts` | 23    | §2.1 création, §2.2, §2.3, §2.4 suppression |

```bash
pnpm test:server src/lib/atelier/__tests__/names.test.ts
pnpm test:server src/lib/atelier/__tests__/atelier.test.ts
```

Fichiers de production créés, **signatures seules** :
`src/lib/atelier/types.ts` · `names.ts` · `atelier.ts`.

---

## Trois défauts existants que ces tests verrouillent

Ils sont dans le code d'aujourd'hui ; les tests garantissent qu'on ne les
reproduit pas dans l'atelier.

1. **`nextName` ne rend jamais un nom pris.** `nextParameterName`
   (`src/lib/grapheur/types.ts:262`) retombe sur `a` quand les huit lettres sont
   prises (`?? PARAMETER_NAMES[0]`) — anodin pour un curseur anonyme,
   destructeur pour un objet nommé. Test : « ne rend jamais un nom déjà pris ».
2. **Une liste lit la virgule comme décimale, le point-virgule comme
   séparateur.** Le tokenizer distingue aujourd'hui `1,2` de `1, 2` par
   l'espace : intenable pour un collégien.
3. **Supprimer le dernier objet laisse l'atelier vide**, sans y remettre `x^2`
   d'office comme le fait `/grapheur` aujourd'hui (`onMount`).

---

## Choix de structure que j'ai fait — à contester

`Atelier` est une **classe pure**, sans runes, dans `atelier.ts` ; un store
Svelte l'enveloppera plus tard. Motif : la logique de noms, de dépendances et de
cycle de vie est substantielle, et la tester sans contexte de composant est
beaucoup plus simple — d'où `pnpm test:server` et non `test:client`.

Le grapheur, lui, met tout dans son store. Si tu préfères cette forme, c'est le
moment de le dire : après l'implémentation, le changement coûte.

---

## Reste à faire

- [ ] Implémenter `names.ts`, puis `atelier.ts` — les 38 tests passent au vert
- [ ] Tests et implémentation de la **persistance locale** (§5) et de
      **l'URL / mode éphémère** (§6)
- [ ] ⚠️ **Le refactor inévitable** : les 13 fichiers qui font
      `import { grapheurStore }` en dur doivent recevoir l'instance par
      contexte, sinon l'atelier ne peut pas avoir son propre état. Touche
      `/grapheur` en production — à traiter dans sa propre PR.
- [ ] Les vues Calcul, Graphe, Données
- [ ] Les deux garanties `/grapheur` (§7)

## Pas encore poussé, et c'est voulu

La branche est rouge par construction. Rien n'est poussé tant que
l'implémentation n'est pas verte : une CI rouge sur une branche sans PR ne
prouve rien et coûte douze jobs.
