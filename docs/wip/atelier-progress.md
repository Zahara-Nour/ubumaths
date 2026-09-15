---
title: Atelier de recherche — progression du chantier
date: 2026-09-15
status: Phase 1 — provenance des définitions (D10), 72 tests verts
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

### Phase 1 (suite) — implémentation, 38 tests verts

`pnpm test:server src/lib/atelier/__tests__/` → **38/38**, en 1,4 s.

| Fichier             | Rôle                                                          |
| ------------------- | ------------------------------------------------------------- |
| `types.ts`          | Les quatre types du v1, gardes de type, plafonds D8           |
| `names.ts`          | Validation, nommage automatique, messages français            |
| `parse.ts`          | Lecture des définitions, dépendances, réécriture au renommage |
| `atelier.svelte.ts` | Le modèle : création, renommage, modification, suppression    |

**Forme retenue : store à runes** (validé par David le 2026-09-15, après
comparaison). L'argument qui avait d'abord fait pencher vers une classe pure —
« les runes obligeraient à `test:client` » — était **faux** : `modalStack`
(12 tests) et `teacherDashboardCache` (101 tests, 8 `$derived`) tournent en
`test:server`, en node. La règle est le **nom du fichier de test**, pas les
runes : seul `*.svelte.test.ts` part dans le projet `client`, qui lance un vrai
navigateur.

### Phase 1 (suite) — les quatre états (D9), 56 tests verts

`error > pending > incomplete > ok`. L'attente se répare d'elle-même et se
propage : un objet qui dépend d'un objet en attente attend la même chose que lui.

**La rustine `seen` a disparu.** Elle existait pour distinguer « nom supprimé »
de « nom jamais défini » ; avec `pending`, la distinction n'a plus d'objet — un
nom absent est un nom absent, même message, même réparation.

#### Trois faits du moteur, mesurés avant d'écrire

1. **L'AST, jamais le texte.** `ax + b` donne les variables `a`, `x`, `b` : la
   lecture par expression régulière lisait `ax` comme un nom. `getVariables`
   résout la multiplication implicite.
2. **Un appel de fonction porte son nom dans l'AST** (`{type:'function',
name:'h'}`), donc le classement valeur/fonction est exact — pas deviné.
3. **Pas de liste blanche de fonctions à tenir.** Les fonctions génériques du
   parseur sont `f g h u v w F G H`, soit exactement la forme d'un nom d'objet.
   Donc la règle est : **seul un identifiant qui pourrait nommer un objet peut
   manquer**. `sqrt`, `sin`, `abs` font plusieurs lettres — hors jeu par
   construction. ⚠️ `FUNCTION_COMMANDS` ne contient PAS `sqrt` : s'en servir
   comme liste blanche aurait mis `sqrt(x)` en attente.

#### Une limite du moteur, figée par un test

En syntaxe custom, **`pi` n'est pas une constante** : il se lit `p·i`. Un test le
documente plutôt que de le masquer. `e` est bien reconnu.

### Phase 1 (suite) — la provenance (D10), 72 tests verts

`parse.ts` reçoit désormais une `Provenance`. Champ de maths, clavier virtuel et
stockage se lisent en **LaTeX** ; URL, collage et mode commande passent par la
**détection**, avec repli sur la syntaxe custom quand la confiance est ≤ 0,5.
`normalizePasted()` réécrit un collage en LaTeX.

#### ⚠️ Deux constats qui contredisent le §6 bis

1. **« L'objet passera en erreur » est illusoire.** Les deux parseurs tournent en
   mode tolérant : `bonjour tout le monde` se lit comme un produit de 18 lettres,
   et `!!! ??? %%%` devient `\lnot \lnot \lnot \placeholder…`. **Un collage ne
   produit donc presque jamais d'erreur.** Toute garde qui compte là-dessus est
   sans effet.
2. Conséquence concrète : coller une phrase donnerait un objet
   « en attente de b, o, j, u, r, t, l, m, d ». Absurde, mais ni une erreur ni un
   plantage.

**✅ Tranché le 2026-09-16 : pas de critère de refus au collage.** Il raterait le
cas le plus fréquent — coller « Soit f la fonction définie par f(x)=… » contient
opérateurs et vraie expression — et l'asymétrie des coûts l'interdit : un faux
refus bloque un usage valide, un faux passage coûte trois secondes et se voit.

Trois filets à la place, spécifiés au §6 bis : **annulation du collage**
(`Ctrl+Z`), **message d'attente qui compte au lieu d'énumérer** au-delà de trois
noms (§2.5 N7), et le fait que l'élève voit ce qui entre dans le champ.

✅ **N7 fait.** Au-delà de trois manquants le message compte ; le détail reste
dans `missing`, que l'interface montrera au survol :

```
a*x         → En attente de « a », qui n'est pas encore défini.
a*b*c*x     → En attente de « a », « b », « c », qui ne sont pas encore définis.
a*b*c*d*x   → En attente de 4 noms qui ne sont pas encore définis.
énoncé collé → En attente de 10 noms qui ne sont pas encore définis.
```

⚠️ **Écart volontaire à la lettre du §2.5 N7**, qui proposait « 9 noms
inconnus » : le mot **inconnu** désigne en maths ce qu'on cherche dans une
équation. L'employer pour un nom non défini serait un faux ami, dans un outil qui
s'adresse à des élèves. Un test interdit désormais ce mot dans le message.

Reste à faire : l'annulation du collage (`Ctrl+Z`), qui touche l'interface.

✅ **[#329](https://github.com/Zahara-Nour/ubumaths/issues/329) corrigé** — le
nommage automatique fabriquait une fausse « définition circulaire » : créer un
objet sans nom avec la définition `f(x)+1` le nommait `f`, donc l'atelier
dénonçait une circularité qu'il venait de créer. `nextName()` reçoit désormais
les noms **cités par la définition** et les évite : l'objet s'appelle `g` et le
message dit « en attente de f », le même qu'avec un nom choisi par l'élève.

Ce qui ne change pas : un élève qui écrit lui-même `f(x) = f(x)+1` lit toujours
« définition circulaire ». Quatre tests figent les deux comportements.

---

## Un défaut de conception trouvé par les tests

La détection des dépendances intersecte les identifiants d'une définition avec
les noms **existants**. Conséquence : supprimer `f` rendait `g(x) = f(x) + 1`
« correcte » — sa dépendance devenait invisible, donc son erreur disparaissait.
C'est le test §2.4 L1 qui l'a attrapé.

Corrigé par une mémoire des noms ayant existé (`seen`) : un nom qu'on SAIT avoir
disparu casse ses dépendants.

### ✅ Tranchée le 2026-09-15 — décision D9

Un nom inconnu met l'objet **en attente**, pas en erreur, et pour une lettre
seule l'attente porte une offre de curseur. Comportements écrits au §2.5 de la
Phase 0, implémentés et testés.

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

## Reste à faire

- [x] Implémenter `names.ts`, `parse.ts`, `atelier.svelte.ts`
- [x] Les quatre états (D9) et l'offre de curseur
- [x] La provenance des définitions (D10) et la normalisation au collage
- [x] #329 — le nommage automatique évite les noms cités par la définition
- [x] §2.5 N7 — message d'attente lisible au-delà de trois noms — 84 tests verts
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
