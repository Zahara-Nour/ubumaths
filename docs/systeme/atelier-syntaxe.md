---
couvre:
  - src/lib/atelier/commands.ts
  - src/lib/atelier/law-commands.ts
  - src/lib/mathAST/cli/core/variable-argument.ts
---

# Syntaxe des commandes de Calcul (atelier)

> **Référence en service** (proposée et validée le 2026-10-08, implémentée : `src/lib/atelier/commands.ts`, `src/lib/mathAST/cli/core/variable-argument.ts`, test `src/lib/atelier/__tests__/syntaxe-mots-cles.test.ts`). Vue d'ensemble de l'atelier : [atelier.md](atelier.md). **Décisions de David (2026-10-08)** : Q1 oui (variable devinée quand un seul choix), Q2 `en` ET `pour`, Q3 probabilités/statistiques inchangées. Liste complète validée le 2026-10-08 (incohérences corrigées : `.ajustement`, mots-clés sans accent).

## Pourquoi cette syntaxe (avant le 2026-10-08)

Dans une expression, l'espace veut déjà dire « multiplié par ». Les commandes s'en servent aussi pour séparer leurs arguments, et doivent deviner où l'expression s'arrête :

| Saisie                         | Voulu            | Lu avant                      |
| ------------------------------ | ---------------- | ----------------------------- |
| `.évaluer x^2 x=3`             | x² en x = 3      | x²·x = 3 (équation x³ = 3)    |
| `.intégrer x 3 a`              | ∫₃ᵃ x dx         | ambigu avec ∫ 3ax dx          |
| `.intégrer sqrt(x) 0 1/2`      | ∫₀^½ √x dx       | refusé                        |
| `.équivalent (x+1)^2 x^2+2x+1` | deux expressions | (x+1)²·x² + 2x + 1 ?          |
| `.taylor e^x 3 1`              | ordre 3 en 1     | dépend de l'ordre des nombres |

La virgule est le séparateur décimal (#880) ; `;` sert déjà à choisir la variable (#888).

## Principe proposé : des mots-clés français

L'expression s'arrête au **premier mot-clé**. Un mot-clé est un mot entier, entouré d'espaces, jamais une lettre seule (pas de conflit avec une variable `a`, `t`…).

### Commandes sur une expression

| Commande                                       | Nouvelle écriture                                 | Exemple                                                 |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| dériver                                        | `.dériver EXPR [pour VAR]`                        | `.dériver f` · `.dériver a t^2 pour t`                  |
| intégrer (primitive)                           | `.intégrer EXPR [pour VAR]`                       | `.intégrer x^2`                                         |
| intégrer (définie)                             | `.intégrer EXPR de A à B [pour VAR]`              | `.intégrer x de 3 à a` · `.intégrer sqrt(x) de 0 à 1/2` |
| résoudre                                       | `.résoudre ÉQUATION [pour VAR] [dans INTERVALLE]` | `.résoudre sin(x)=0 dans [0;2\pi]`                      |
| évaluer                                        | `.évaluer EXPR en VAR=VALEUR` (ou `pour`)         | `.évaluer x^2 en x=3`                                   |
| équivalent                                     | `.équivalent EXPR et EXPR`                        | `.équivalent (x+1)^2 et x^2+2x+1`                       |
| taylor                                         | `.taylor EXPR ordre N [en A] [pour VAR]`          | `.taylor e^x ordre 3 en 1`                              |
| variations / domaine / simplifier / factoriser | `.commande EXPR [pour VAR]`                       | inchangé (un seul argument)                             |

- `[…]` = facultatif. Ordre des mots-clés libre (`en 1 ordre 3` accepté).
- **Variable** : voir la question 1 ci-dessous.

### Commandes de probabilités et de statistiques

Leurs arguments sont des **noms d'objets et des nombres**, jamais des expressions : l'espace n'y est pas ambigu. **Proposition : inchangées** (`.binomiale X 10 0,3`, `.simuler L M 100`, `.comparer L M`…). Seul l'argument « événement » (`P(X ⩽ 3)`) est une expression, déjà délimitée par `P(…)`.

## Transition

- L'ancienne écriture reste acceptée **quand elle est sans ambiguïté** (`.intégrer x^2 0 1`, `.taylor sin(x) 5 0`).
- Quand elle est ambiguë, l'atelier **ne devine plus** : il propose la nouvelle forme dans son message.
- `; t` reste accepté comme synonyme de `pour t`.
- Les historiques exportés (JSON/ubumark) restent rejouables : ils passent par la même lecture.
- Aide et autocomplétion de Calcul : les mots-clés y sont proposés.

## Questions à trancher

1. **La variable est-elle nécessaire ?** (`.dériver f pour t`, `.résoudre sin(t)=0 pour t`)
   Proposition : **non, quand il n'y a qu'un choix possible** :
   - une fonction de l'atelier se dérive par rapport à **sa propre lettre** (`f(t) = t²` → `.dériver f` dérive en t, #905) ;
   - une expression qui ne contient **qu'une seule lettre** (`sin(t)=0`) se résout ou se dérive par rapport à elle ;
   - `pour VAR` n'est exigé que s'il y a **plusieurs lettres et pas de x** (`a t^2` : a ou t ?) ; avec un x présent, x reste la variable par défaut (règle #888).
   - `e` n'est jamais une variable (constante d'Euler) : `; e` et `pour e` sont refusés avec « e est la constante d'Euler, pas une variable » (`chosenVariable`, `variable-argument.ts`, 2026-10-10) ; `e_1` reste une variable indicée.
     Cela assouplit la règle « x par défaut » de #888 (aujourd'hui `.résoudre sin(t)=0` sans `; t` affiche une indication).
2. Mot-clé pour `.évaluer` : `en` (« en x = 3 ») ou `pour` (« pour x = 3 ») ? Proposition : les deux.
3. Probabilités / statistiques inchangées : d'accord ?

## Compléments validés (2026-10-08)

### Ordre libre des mots-clés

Après l'expression, les mots-clés se placent dans n'importe quel ordre ; seule contrainte : `de` va avec `à`.

- `.taylor e^x ordre 3 en 1` = `.taylor e^x en 1 ordre 3`
- `.intégrer a*t^2 de 0 à 1 pour t` = `.intégrer a*t^2 pour t de 0 à 1`
- `.résoudre sin(t)=0 pour t dans [0;2\pi]` = `.résoudre sin(t)=0 dans [0;2\pi] pour t`

### Sans accents

Les **noms de commandes** s'écrivent déjà sans accent (`.deriver`, `.resoudre`, `.integrer`, `.evaluer`, `.equivalent`, `.geometrique`… : les accents sont retirés avant la recherche). Les **mots-clés** aussi :

- `à` s'écrit aussi `a` : `.integrer x de 0 a 1`. Pas de conflit avec une variable `a` : une borne est **un seul bloc sans espace** (`1/2`, `\pi`, `a`), donc `de 0 a a` se lit sans ambiguïté (de 0 à a), et `de a a b` aussi (de a à b).
- Autres mots-clés : déjà sans accent (`de`, `en`, `pour`, `ordre`, `dans`, `et`).

### `.ajustement` : la virgule est décimale

`.ajustement 1,2,3,4,5,6 : 12,15,19,22,27,30 ; x = 8` séparait les valeurs par des virgules, alors que la virgule est le séparateur décimal (`1,5`). Nouvelle écriture, alignée sur `.stats` et `.évaluer` :

`.ajustement 1 ; 2 ; 3 ; 4 ; 5 ; 6 : 12 ; 15 ; 19 ; 22 ; 27 ; 30 en x = 8`

(ancienne écriture acceptée tant qu'elle est sans ambiguïté : aucune valeur décimale.)

### `.filtrer`

`.filtrer L = fille et M = oui` garde son `et` logique : pas d'expression mathématique, donc pas de conflit avec le `et` de `.équivalent`.
