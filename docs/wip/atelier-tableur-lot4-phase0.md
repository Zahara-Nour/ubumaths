---
title: Atelier — tableur intégré, lot 4 : les fonctions du tableur (phase 0)
date: 2026-10-15
status: phase 0 VALIDÉE (2026-10-15, « je valide tes recos ») ; Q-L4-1 à Q-L4-7 décidées
---

# Atelier — tableur intégré, lot 4 : les fonctions du tableur

Lots 1 à 3 livrés (#1410 → #1427, pas encore en prod) : la grille, les formules et leur recopie,
Tabuler. Phase 0 du tableur : [atelier-tableur-phase0.md](atelier-tableur-phase0.md). Journal :
[atelier-tableur-progress.md](atelier-tableur-progress.md).

Ce lot ajoute les **plages** (`A2:A21`) et les **fonctions du tableur en français**, celles des
exercices de collège et de seconde :

- statistiques : SOMME, MOYENNE, MEDIANE, MIN, MAX, NB, ECARTYPE, ECARTYPEP ;
- conditions : NB.SI, SI ;
- calcul : ARRONDI, ENT, RACINE, ABS, LN, EXP, PI.

Hors de ce lot : ALEA (lot 5), ET / OU, RANG, MOYENNE.SI et les autres fonctions de LibreOffice.

## Déjà décidé (rappel)

- **Q5** — Formules à la LibreOffice en français : `=` devant, `;` entre les arguments, noms
  français (SOMME, SI…) plus les fonctions de l'atelier. **ECARTYPE divise par n − 1, ECARTYPEP
  par n** : ECARTYPE de la grille ≠ σ de `.stats`, assumé.
- **Q1** — Dans une formule, lettre + chiffre = cellule, lettre seule = objet.
- **Q2 / Q-L3-2** — Une case montre sa valeur exacte courte ; un décimal fini s'écrit en décimal ;
  sinon `≈` et 4 décimales. La valeur exacte se voit sous la barre.
- **T5** — Une cellule vide citée laisse la formule vide (pas 0).
- **Lot 2** — Références relatives et `$` ; recopie ; lien en relatif ; un atelier reçu garde des
  références qui suivent leurs colonnes ; erreurs en français ; cycles.

## Ce que l'analyse a mesuré (2026-10-15)

- ⚠️ **Un bug silencieux existe déjà** : `=C1:C2` (C1 = 3, C2 = 5) affiche **0,6**. Le `:` est
  lu comme une division. Un élève qui tape une plage aujourd'hui obtient un nombre faux, sans
  message. Ce lot le corrige (§1).
- Aucun nom français n'est lu : `=somme(C1;C2)`, `=racine(2)`, `=arrondi(2,567;1)`, `=ent(2,5)`
  et `=si(C1>2;1;0)` donnent tous « Je n'ai pas su lire cette formule ».
- Les noms anglais du moteur marchent déjà : `max`, `min`, `sqrt`, `abs`, `ln`, `exp`, `round`,
  `floor`.
- `="fille"` donne « " n'est pas défini dans l'atelier ». Il n'y a pas de texte entre guillemets.
- `=C1>2` donne « Le résultat n'est pas un nombre réel. ». Il n'y a pas de comparaison.
- `=pi` est lu `p × i` (« p n'est pas défini »). `=π` marche.
- `=max(L)` donne « L est une liste : cite une de ses cellules (A2). ».
- Dans Calcul, `somme(L)` et `moyenne(L)` donnent « Fonction inconnue », et `mediane(L)` est
  recopié sans être calculé. C'est hors de ce lot, noté.

---

## Comportements proposés

### 1. Les plages

- **Nominal** — `A2:A21` désigne les cases de A2 à A21. Une plage rectangulaire `A2:B21` aussi.
- **Nominal** — `A:A` désigne toute la colonne A, de A1 à A200 (Q-L4-4).
- **Nominal** — Les `$` figent un bout de la plage à la recopie : `=SOMME($A$2:A2)`, recopié vers
  le bas, donne `=SOMME($A$2:A3)`, `=SOMME($A$2:A4)`… C'est le cumul, un geste classique.
- **Nominal** — Une plage se décale à la recopie, au copier-coller, dans le lien (écriture
  relative) et pour un atelier reçu, comme deux références.
- **Nominal** — Le nom d'une liste vaut sa colonne en argument : `=MOYENNE(L)` (Q-L4-3).
- **Erreur** — Une plage seule, hors d'une fonction (`=A1:A3`), est refusée : « Une plage
  s'utilise dans une fonction, par exemple =SOMME(A1:A3). ». C'est la fin du 0,6 silencieux.
- **Erreur** — Une plage hors de la grille (`A1:A300`) : le refus d'aujourd'hui pour une case
  hors de la grille. Une plage poussée hors de la grille par une recopie devient `#HORS`.
- **Limite** — Une formule qui cite une plage dépend de toutes ses cases. Changer une case de la
  plage la recalcule. Une formule dans sa propre plage (`=SOMME(A1:A10)` en A5) forme un cycle,
  dit comme tel.

### 2. Ce qu'une plage contient

- **Nominal** — Les cases **vides et les mots sont ignorés** par SOMME, MOYENNE, MEDIANE, MIN,
  MAX, ECARTYPE, ECARTYPEP et NB (Q-L4-2). `=MOYENNE(A2:A30)` marche donc sur une colonne qui
  n'a que 20 valeurs, ou qui a un titre en A1.
- **Nominal** — Une case en erreur dans la plage donne son erreur à la fonction : « A7 est en
  erreur. ». Comme dans LibreOffice, une erreur ne se cache jamais derrière un résultat.
- **Limite** — Plage sans aucun nombre : SOMME et NB donnent 0. MOYENNE, MEDIANE, MIN et MAX le
  disent : « Aucun nombre dans A2:A30. ».
- **Limite** — ECARTYPE d'un seul nombre : « ECARTYPE demande au moins deux nombres (il divise
  par n − 1). ». ECARTYPEP d'un seul nombre donne 0.

### 3. Les fonctions

| Fonction                    | Ce qu'elle rend                                         | Exemple                                           |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `SOMME(…)`                  | la somme                                                | `=SOMME(A2:A21)`                                  |
| `MOYENNE(…)`                | la moyenne                                              | `=MOYENNE(L)`                                     |
| `MEDIANE(…)`                | la médiane (pour n pair, la moyenne des deux du milieu) | `=MEDIANE(A2:A21)`                                |
| `MIN(…)`, `MAX(…)`          | le plus petit, le plus grand                            | `=MAX(A2:A21)-MIN(A2:A21)` (l'étendue)            |
| `NB(…)`                     | le nombre de cases qui contiennent un nombre            | `=NB(A2:A21)`                                     |
| `ECARTYPE(…)`               | l'écart type, en divisant par n − 1                     | `=ECARTYPE(A2:A21)`                               |
| `ECARTYPEP(…)`              | l'écart type, en divisant par n (le σ de `.stats`)      | `=ECARTYPEP(A2:A21)`                              |
| `NB.SI(plage ; critère)`    | le nombre de cases qui vérifient le critère             | `=NB.SI(B2:B21;"fille")`, `=NB.SI(A2:A21;">=10")` |
| `SI(condition ; oui ; non)` | `oui` si la condition est vraie, sinon `non`            | `=SI(A2>=10;"admis";"ajourné")`                   |
| `ARRONDI(x ; n)`            | x arrondi à n décimales                                 | `=ARRONDI(B2/3;2)`                                |
| `ENT(x)`                    | la partie entière, vers le bas (`ENT(-2,5)` = −3)       | `=ENT(A2/7)`                                      |
| `RACINE(x)`, `ABS(x)`       | √x, \|x\|                                               | `=RACINE(A2)`                                     |
| `LN(x)`, `EXP(x)`           | ln x, eˣ                                                | `=EXP(1)`                                         |
| `PI()`                      | π                                                       | `=2*PI()*A2`                                      |

- **Nominal** — Les arguments des fonctions de statistiques mêlent plages, cases et nombres :
  `=SOMME(A2:A10;C5;3)`. Les fonctions s'emboîtent : `=ARRONDI(MOYENNE(A2:A21);1)`.
- **Nominal** — Le calcul reste **exact** quand il est court : `=MOYENNE(1;2)` vaut 3/2 et
  s'affiche 1,5 ; `=ECARTYPEP(1;3)` vaut 1. Sinon la règle d'aujourd'hui s'applique : ≈ dans la
  case, exact sous la barre si la valeur exacte est courte.
- **Nominal** — La médiane et l'écart type des séries suivent les définitions de `.stats`, sauf
  ECARTYPE, qui divise par n − 1 (Q5, assumé).
- **Erreur** — Mauvais nombre d'arguments : « ARRONDI attend deux arguments : ARRONDI(x ; n). ».
  Nom inconnu : « MOYENE n'est pas une fonction de la grille. Fonctions : SOMME, MOYENNE… ».
- **Erreur** — Mêmes refus que Calcul pour RACINE, LN… (`=RACINE(-1)` : « Le résultat n'est pas
  un nombre réel. »).

### 4. Conditions et texte

- **Nominal** — Un texte s'écrit entre guillemets droits (`"fille"`), et seulement dans NB.SI et
  SI (Q-L4-5). Une case dont SI rend un texte est une case de mots : alignée à gauche, ignorée
  par les statistiques, comptée par `NB.SI(…;"admis")`.
- **Nominal** — Les comparaisons s'écrivent `<`, `>`, `<=`, `>=`, `=` et `<>` (différent), comme
  dans LibreOffice. Elles servent dans la condition de SI.
- **Nominal** — Le critère de NB.SI :
  - un mot (`"fille"`) compte les cases qui le contiennent exactement, sans tenir compte des
    majuscules ;
  - un nombre (`10` ou `"10"`) compte les cases égales à 10 ;
  - une comparaison (`">=10"`, `"<>0"`) compte les cases qui la vérifient, la virgule décimale
    comprise (`">1,5"`).
- **Erreur** — Une comparaison hors de SI (`=A1>2`) : « Une comparaison s'écrit dans SI, par
  exemple =SI(A1>2;1;0). ». Ce refus remplace « pas un nombre réel ».
- **Erreur** — Guillemets non fermés : « Il manque un guillemet fermant. ».

### 5. Écrire et lire les noms

- **Nominal** — Les noms se tapent en minuscules ou en majuscules, avec ou sans accent :
  `=moyenne(`, `=MÉDIANE(`, `=écartype(`. La barre les réécrit en majuscules sans accent,
  comme LibreOffice (`=somme(a2:a5)` → `=SOMME(A2:A5)`) (Q-L4-7).
- **Nominal** — Les noms anglais du moteur restent acceptés (`=max(…)`, `=sqrt(…)`) : rien de ce
  qui marche aujourd'hui ne casse. `=PI()` et `=π` marchent ; `=pi` reste lu `p × i`, comme
  dans Calcul.
- **Nominal** — **Une aide sous la barre** : pendant qu'on tape une fonction connue, sa forme
  s'affiche (« MOYENNE(plage ; …) — la moyenne des nombres »). Un clic n'est pas nécessaire :
  c'est une aide qu'on lit.

### 6. Calcul ne change pas (Q-L4-6)

- Les fonctions du tableur vivent dans la grille. Dans Calcul, `SOMME(…)` et `MOYENNE(L)`
  restent refusés, mais le refus dit où aller : « SOMME est une fonction de la grille. Pour une
  liste, tape .stats L. ».

---

## Questions du lot 4 — tranchées par David (2026-10-15, « je valide tes recos »)

Décidé : **Q-L4-1 (a)** une couche de la grille avant mathAST · **Q-L4-2 (a)** vides et mots
ignorés dans une plage (exception à T5) · **Q-L4-3 (a)** `=MOYENNE(L)` · **Q-L4-4 (a)** `A:A` ·
**Q-L4-5 (a)** texte entre guillemets dans NB.SI et SI · **Q-L4-6 (a)** la grille seule, Calcul
renvoie vers `.stats` · **Q-L4-7 (a)** noms réécrits en majuscules.

**Q-L4-1 — Où vivent les fonctions du tableur ?** (choix d'architecture)

- **(a)** Une couche dans la lecture des formules de la grille (`formula.ts`), avant mathAST. Elle
  repère les appels `SOMME(…)`, `SI(…)`, les plages et les textes. Chaque argument passe par la
  lecture d'aujourd'hui, et le résultat entre dans l'arbre comme une valeur de case. mathAST ne
  change pas.
- **(b)** Ajouter les plages, les textes, les comparaisons et ces fonctions au parseur et au
  moteur de mathAST.

**Reco (a).** Les plages, les guillemets, `<>` et `NB.SI` n'ont de sens que dans la grille. Les
mettre dans mathAST toucherait le parseur de tout le site (exercices, Calcul, correction) pour
un besoin local. (a) garde le cœur exact et les refus de mathAST pour tout ce qui est calcul.

**Q-L4-2 — Cases vides et mots dans une plage.**

- **(a)** Ignorés, comme LibreOffice et Excel.
- **(b)** La règle T5 : une case vide citée laisse la formule vide.

**Reco (a).** T5 protège une case citée seule (`=A7*2`) contre un faux zéro. Dans une plage, on
vise une colonne qui contient des trous et un titre : avec (b), `=MOYENNE(A2:A30)` ne donnerait
jamais rien. C'est une exception à T5, d'où la question.

**Q-L4-3 — `=MOYENNE(L)` : le nom d'une liste en argument ?**

- **(a)** Oui : le nom d'une liste, en argument d'une fonction du tableur, vaut sa colonne.
- **(b)** Non : seulement des plages (`=MOYENNE(A2:A21)`).

**Reco (a).** C'est la lecture de Q1 (lettre seule = objet), et l'élève qui a nommé sa colonne
L l'attend. Hors d'une fonction, `=L` reste refusé, comme aujourd'hui.

**Q-L4-4 — `A:A`, la colonne entière ?**

- **(a)** Oui, de A1 à A200.
- **(b)** Non, seulement `A1:A200`.

**Reco (a).** LibreOffice et Excel l'acceptent, et avec Q-L4-2 (a) elle sert vraiment :
`=MOYENNE(A:A)` ignore le titre et les cases vides.

**Q-L4-5 — Du texte entre guillemets ?**

- **(a)** Oui, mais seulement dans NB.SI et SI : `=NB.SI(B2:B30;"fille")`,
  `=SI(A2>=10;"admis";"ajourné")`.
- **(b)** Non : NB.SI avec des nombres seulement, SI qui rend des nombres.

**Reco (a).** Les exercices de tableur de collège comptent des modalités (« fille »,
« oui ») et écrivent « admis ». Sans texte, NB.SI ne sert plus aux données qualitatives que
l'atelier sait déjà lire.

**Q-L4-6 — Ces fonctions dans Calcul ?**

- **(a)** Non, la grille seule. Calcul refuse avec un renvoi (« fonction de la grille ;
  .stats L »).
- **(b)** Oui, pour une liste : `moyenne(L)`, `somme(L)` dans Calcul.

**Reco (a) pour ce lot.** `.stats L` répond déjà dans Calcul, et (b) ouvrirait le chantier de
`mediane(L)`, que Calcul recopie aujourd'hui sans le calculer. Noté pour plus tard.

**Q-L4-7 — Réécrire les noms en majuscules dans la barre ?**

- **(a)** Oui, comme LibreOffice : `=somme(a2:a5)` devient `=SOMME(A2:A5)`. C'est ce qu'on fait
  déjà pour `a2` → `A2`.
- **(b)** Non, garder la frappe de l'élève.

**Reco (a).** La formule se lit mieux, et l'élève voit que son nom a été reconnu. Un nom mal
tapé reste en minuscules, avec son refus.

---

## Décidé en cours de lot (David, 2026-10-15, « ok »)

- **Case vide dans la condition de SI** : la formule reste vide (T5). Recopiée sous les données,
  `=SI(A2>=10;"admis";"ajourné")` n'écrit rien sur les lignes vides.
- **Un mot ne se compare qu'avec `=` ou `<>`**, sans tenir compte des majuscules ; `=SI(B1<"g";…)`
  est refusé, pas d'ordre alphabétique.
- **Une case citée seule en argument d'une statistique** (`=MIN(A1;A9)`) se lit comme une plage
  d'une case : vide ou mot ignoré (revue de la PR 1, signalé).
- **« Valeur exacte » sous la barre** seulement si la valeur vient d'une division (option 3, #1432).

## Découpage en PR (lot 4)

1. **Les plages et les statistiques** : lecture des plages, `A:A`, noms de listes en argument,
   refus de `=A1:A3`, recopie / lien / atelier reçu / dépendances / cycles, et SOMME, MOYENNE,
   MEDIANE, MIN, MAX, NB, ECARTYPE, ECARTYPEP. Noms en majuscules.
2. **Le calcul et l'aide** : ARRONDI, ENT, RACINE, ABS, LN, EXP, PI, et l'aide sous la barre.
3. **Les conditions** : texte entre guillemets, comparaisons, SI et NB.SI, refus d'une
   comparaison hors de SI, renvoi de Calcul.

Tests : en node (`formules-tableur.test.ts`). Pour chaque fonction, des séries d'exercices
réels avec leurs valeurs calculées à la main, écrites dans le test ; MOYENNE, MEDIANE et
ECARTYPEP comparées aussi à `.stats` sur les mêmes séries. Doc : [atelier.md](../systeme/atelier.md) à chaque PR (section « La grille »).
