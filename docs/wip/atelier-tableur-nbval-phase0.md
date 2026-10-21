---
title: Atelier — tableur intégré : NBVAL et NB.VIDE (phase 0)
date: 2026-10-18
status: phase 0 VALIDÉE (2026-10-18, « je te suis ») ; Q-NV-1 à Q-NV-4 = les recos
---

# Atelier — tableur intégré : NBVAL et NB.VIDE

Question de David (2026-10-18) : « est-ce qu'on a des fonctions qui permettent de compter le
nombre de cellules non vides ? ». Aujourd'hui, seulement par un détour : `=NB.SI(A1:A30;"<>")`.
Demande : préparer **NBVAL** (les cases non vides) et **NB.VIDE** (les cases vides), les noms de
LibreOffice et d'Excel en français. Journal : [atelier-tableur-progress.md](atelier-tableur-progress.md).

## Ce que fait la grille aujourd'hui (mesuré le 2026-10-18)

A1 `12`, A2 `fille`, A3 vide, A4 `=SI(1>0;"";1)` (rend une case vide), A5 `=1/0` (erreur),
A6 `=A1*2`, A7 `=SI(1>0;"oui";1)` (rend un mot) :

| Formule                    | Résultat                    | Remarque                              |
| -------------------------- | --------------------------- | ------------------------------------- |
| `=NB(A1:A3)`               | 1                           | NB compte les **nombres** seulement   |
| `=NB.SI(A1:A3;"<>")`       | 2                           | le détour : nombres et mots           |
| `=NB(A1:A7)`               | refus « A5 est en erreur. » | une case en erreur arrête NB et NB.SI |
| `=NB(L)` (L = `12 ; ; 15`) | 2                           | une liste nommée = sa colonne         |
| `=NBVAL(A1:A3)`            | refus : fonction inconnue   |                                       |

## Déjà décidé (rappel)

- **Lot 4** — Une case en erreur dans une plage arrête la fonction (« A5 est en erreur. ») : une
  statistique fausse sans le dire serait pire. `A:A` = de A1 à A200 (Q-L4-4). Une liste nommée
  s'écrit seule en argument (`NB(L)`, Q-L4-3).
- **Règle 1 du projet** — la grille fait 26 colonnes × 200 lignes.

---

## Comportements proposés

### 1. NBVAL

- **Nominal** — `=NBVAL(A1:A7)` compte les cases **non vides** : nombres et mots, qu'ils soient
  tapés ou rendus par une formule. Sur l'exemple : A1, A2, A6, A7 → **4** (A3 et A4 sont vides,
  A5 : Q-NV-2).
- **Nominal** — Plusieurs arguments, comme NB : `=NBVAL(A1:A10;C1:C10)`, une case seule
  (`=NBVAL(B2)` → 0 ou 1), une liste nommée (`=NBVAL(L)`), une colonne entière (`=NBVAL(A:A)`).
- **Nominal** — L'aide sous la barre : « NBVAL(plage ; …) — combien de cases ne sont pas vides ».
- **Erreur** — Sans argument : « NBVAL attend au moins un argument, par exemple NBVAL(A2:A21). »
  (comme NB).

### 2. NB.VIDE

- **Nominal** — `=NB.VIDE(A1:A7)` compte les cases **vides**. Sur l'exemple : A3 et A4 → **2**.
- **Nominal** — Une seule plage, comme LibreOffice : `=NB.VIDE(B2:B31)` — combien d'élèves n'ont
  pas de note.
- **Nominal** — L'aide : « NB.VIDE(plage) — combien de cases sont vides ».
- **Erreur** — Deux arguments ou plus : « NB.VIDE attend une plage : NB.VIDE(B2:B31). »
- Une colonne entière (`NB.VIDE(A:A)`) et une liste nommée : Q-NV-3 et Q-NV-4.

### 3. Ce qui ne change pas

- `NB` compte toujours les nombres seuls ; `NB.SI(plage;"<>")` reste lu (même résultat que NBVAL,
  hors erreurs).
- Dans **Calcul**, `nbval(L)` renvoie vers la grille, comme `somme(L)` : « NBVAL est une fonction
  de la grille (onglet Données). Pour une liste, tape .stats L. »

---

## Questions — tranchées par David (2026-10-18 : les quatre recos)

**Q-NV-1 — Une formule qui rend une case vide (`=SI(A2>=10;"admis";"")`) : vide ou pas ?**

- **(a)** Vide, pour les deux : NBVAL ne la compte pas, NB.VIDE la compte. C'est ce que l'élève
  voit.
- **(b)** Comme Excel : NBVAL la compte (la case contient une formule), NB.VIDE aussi.

**Reco (a).** Dans Excel, une même case compte à la fois comme pleine (NBVAL) et comme vide
(NB.VIDE) : NBVAL + NB.VIDE dépasse alors la taille de la plage. Le cas est courant dans nos
grilles : `=SI(…;"admis";"")` recopié sous la classe entière (lot 4, T5).

**Q-NV-2 — Une case en erreur dans la plage ?**

- **(a)** Comme NB aujourd'hui : la fonction s'arrête, « A5 est en erreur. »
- **(b)** Comme LibreOffice : NBVAL la compte (elle n'est pas vide), NB.VIDE non.

**Reco (a).** Même règle que toutes les fonctions de plage de la grille (lot 4) : l'élève voit
l'erreur et la corrige au lieu d'un compte qui la cache.

**Q-NV-3 — `NB.VIDE(A:A)` : une colonne entière ?**

- **(a)** Accepté : la colonne compte ses 200 lignes. Une colonne de 30 notes → 170.
- **(b)** Refusé : « NB.VIDE compte dans une plage : NB.VIDE(A2:A31). »

**Reco (b).** Le résultat (170) dépend de la taille de la grille, pas des données : il ne veut rien
dire pour l'élève (dans LibreOffice, plus d'un million). NBVAL(A:A), lui, garde son sens.

**Q-NV-4 — NB.VIDE d'une liste nommée (`NB.VIDE(L)`, L = `12 ; ; 15`) ?**

- **(a)** Les entrées vides de la liste : `12 ; ; 15` → **1** (de sa première à sa dernière
  entrée).
- **(b)** Refusé, comme une colonne entière.

**Reco (a).** Une liste a une longueur : ses trous ont un sens (une valeur manquante dans une
série). NBVAL(L) compte de même ses entrées non vides.

---

## Découpage

Une seule PR : `grid-functions.ts` et `formula.ts`, aide sous la barre, tests en node.
Doc : [atelier.md](../systeme/atelier.md) (section « La grille »).

Hors périmètre, à signaler : `NB.SI(A1:A30;"")` vaut 0 aujourd'hui (NB.SI ignore les cases vides,
lot 4), alors que LibreOffice compte les cases vides. NB.VIDE couvre ce besoin.
