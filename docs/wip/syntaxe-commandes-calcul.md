# Syntaxe des commandes de Calcul : séparer les arguments sans espaces ambigus

> Proposition du 2026-10-08, **à valider par David** avant tout code.

## Le problème

Dans une expression, l'espace veut déjà dire « multiplié par ». Les commandes s'en servent aussi pour séparer leurs arguments, et doivent deviner où l'expression s'arrête :

| Saisie                         | Voulu            | Lu aujourd'hui                |
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
     Cela assouplit la règle « x par défaut » de #888 (aujourd'hui `.résoudre sin(t)=0` sans `; t` affiche une indication).
2. Mot-clé pour `.évaluer` : `en` (« en x = 3 ») ou `pour` (« pour x = 3 ») ? Proposition : les deux.
3. Probabilités / statistiques inchangées : d'accord ?
