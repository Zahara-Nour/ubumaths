---
title: Le registre des commandes, référence commune (pnpm math, Atelier, calculatrice) — journal
date: 2026-11-01
status: phase 0 tranchée, PR 0 à faire
---

## Reprendre ici

_Mis à jour le 2026-11-01, après les réponses de David à Q1-Q6._

- **État** : phase 0 tranchée (D1-D4, Q1-Q6 validées) ; chantier renommé `registre-reference` ;
  rien de codé.
- **Prochaine action** : PR 0, le corpus (`tests/fixtures/mathast/`) et ses deux tests, puis la page
  à cocher pour que David valide les attendus.
- **En attente de David** : rien.
- **Pièges en cours** : `tsx` lance `WebReplEngine` seul (< 1 s), pas l'Atelier (`$state is not
defined`) ; une sonde ou un test de l'Atelier passe par vitest ou le runner de Vite (~9 s).
- **Worktree / branche** : `../ubumaths-wt-registre-reference` · `refactor/registre-reference`
  (ex-`pnpm-math-atelier`).

---

## Décisions de David (2026-11-01)

- **D1** Le **registre des commandes** (`src/lib/mathAST/cli/commands/`, servi par
  `WebReplEngine`) est **la référence commune** de trois outils : l'Atelier, `pnpm math`, et la
  **calculatrice** d'un futur chantier. Il rend la **réponse brute**, la même pour tous. Un outil
  habille la réponse, il ne la remplace jamais.
- **D2** La forme de la réponse = **la forme propre** du travail `tidy` / `simplify` :
  [ADR 0032](../adr/0032-la-forme-affichee-se-choisit-par-le-but.md) (forme cible selon le but de la
  commande, puis `tidy`). Table : `docs/systeme/mathast/README.md` § Quelle fonction pour quel besoin.
- **D3** **Les étapes restent dans l'Atelier** seulement. Elles doivent aboutir à la réponse du
  registre.
- **D4** **Un corpus de réponses attendues** : des lignes, chacune avec la réponse brute écrite à
  l'avance. Il est le contrat du registre, et chaque outil (Atelier, `pnpm math`, calculatrice) est
  testé contre lui. Existants à reprendre, pas à recopier : les oracles des limites
  (`mathAST/limits/__tests__/oracle/corpus.ts`) et des primitives
  (`mathAST/integration/__tests__/oracle/primitives-corpus.ts`, avec son jugement de forme `checkForm`).

Remplace la direction du 2026-10-24 (« `pnpm math` branchée sur l'Atelier », via `runInput`) :
c'est le registre qui fait foi, pas la couche de l'Atelier.

## Pourquoi

Aujourd'hui l'Atelier appelle le registre, puis **jette sa réponse et la remplace** par un autre
calcul (exemple : `calcul.ts`, `if (name === 'diff')` → `deriveSteps`). Deux calculs de la même
chose, qui ne s'accordent pas ; `pnpm math` (`repl.ts`, sur le registre) montre l'autre réponse.

## Inventaire (2026-11-01, sonde jetable, runner de Vite)

Même ligne envoyée au registre (`WebReplEngine.execute`, nom anglais) et à l'Atelier (`runInput`).

**Même réponse** (habillage seul) : `.dériver x^2`, `ln(x²+1)`, `sin(x)²` ; `.résoudre`
d'équations (`x²−3x+1=0`, `eˣ=3`) ; `.évaluer` ; `.taylor` ; `.intégrer x^2 de 0 à 1` (`1/3`) ;
`.domaine` (`ℝ \ {0}`, `]2;+∞[`, écrit autrement) ; `.équivalent` (texte du moteur repris tel quel) ;
calculs sans lettre (`2+3*4`, `1/2+1/3`, `√8`).

**Réponses différentes** :

| Ligne                      | Registre                   | Atelier                              |
| -------------------------- | -------------------------- | ------------------------------------ |
| `.dériver x*e^x`           | `eˣ + xeˣ`                 | `(x+1)eˣ`                            |
| `.dériver (2x+1)/(x-3)`    | `(2(x−3) − (2x+1))/(x−3)²` | `−7/(x−3)²`                          |
| `.simplifier (x²−1)/(x+1)` | `x − 1` (perd x ≠ −1)      | inchangée (+ bouton « pour x ≠ −1 ») |
| `.résoudre 2x+1<7`         | `S = ]−∞ ; 3[`             | `x < 3`                              |
| `.intégrer x*e^x`          | `(x−1)eˣ`                  | `(x−1)eˣ + C`                        |

Les deux premières et `.simplifier` : le registre ne suit pas l'ADR 0032 (dérivée réduite ; pas de
simplification qui perd le domaine sans hypothèse, S3).

**Absentes du registre** (n'existent que dans l'Atelier) : `factoriser`, `développer`, `limite`,
`réciproque` ; statistiques et probabilités (`simuler`, `binomiale`, `géométrique`, `uniforme`,
`exponentielle`, `normale`, `comparer`, `croiser`, `filtrer`, `fréquence`, `échantillons`, `stats`,
`ajustement`) ; `tabuler`, `relever` (géométrie) ; la définition `f(x) = …` (le registre veut
`.def`).

**Absentes de l'Atelier** (registre seul, outils de développement ou retirées le 2026-10-13) :
`parse`, `tree`, `latex`, `custom`, `normal`, `hash`, `let`, `def`, `def'`, `inv`, `clear`,
`unset`, `undef`.

## Phase 0 — comportements visés

**Nominal**

- **R1** Pour toute commande du registre, l'Atelier affiche **la réponse du registre** (même forme),
  plus ses étapes. Le tableau « Réponses différentes » devient vide.
- **R2** `pnpm math` est un terminal sur `WebReplEngine` : mêmes entrées que le registre, mêmes
  réponses ; une seule session par console ; `pnpm math "ligne1" "ligne2"` rejoue puis rend la main.
- **R3** La forme de chaque commande suit l'ADR 0032 : `.dériver` réduite (`(x+1)eˣ`, `−7/(x−3)²`) ;
  `.simplifier` ne perd pas de domaine sans hypothèse.

**Limites**

- **R4** Quand l'Atelier n'a pas d'étapes (`sec(3x)`), il affiche la réponse du registre telle
  quelle (déjà le cas pour `.dériver`).
- **R5** Les étapes de l'Atelier qui n'aboutissent pas à la réponse du registre : on les corrige
  (pas la réponse) ; un test par commande le garde.

**Erreurs**

- **R6** Une commande refusée par le registre l'est avec le même message dans l'Atelier et le
  terminal.

## Questions — tranchées par David le 2026-11-01 (« je valide tes recos »)

Réponses retenues, en gras sous chaque question.

- **Q1 — Commandes de l'Atelier absentes du registre.** D1 veut qu'elles y descendent (sinon la
  calculatrice ne les a pas). Proposé : `factoriser`, `développer`, `limite`, `réciproque` et
  `f(x) = …` dans ce chantier ; statistiques, probabilités, `tabuler`, `relever` plus tard (elles
  lisent les listes et les figures de l'Atelier). **→ validé.**
- **Q2 — Une inéquation** : la réponse brute est-elle `S = ]−∞ ; 3[` (registre) ou `x < 3`
  (Atelier) ? **→ `S = ]−∞ ; 3[`**, comme les équations ; les étapes de l'Atelier peuvent passer
  par `x < 3` et conclure sur S.
- **Q3 — Une primitive** : `+ C` dans la réponse brute ? **→ oui**, ajouté par la commande du
  registre (le moteur calcule toujours F seul ; l'oracle des primitives ôte déjà le `+ C`).
- **Q4 — Commandes du registre seul** (`parse`, `tree`, `latex`, `custom`, `normal`, `hash`, `let`,
  `def`, `def'`, `inv`, `clear`, `unset`, `undef`). Proposé : garder les outils de développement
  pour `pnpm math` (`tree`, `hash`, `normal`, `latex`, `custom`), retirer `inv` et `def'` (réponses
  données à la main, que `.réciproque` et `.dériver` remplacent), garder les commandes de noms
  (la calculatrice en aura besoin). **→ validé.**
- **Q5 — Le nom du chantier.** `pnpm-math-atelier` ne dit plus ce qu'il fait. Proposé :
  `registre-reference` (nouveau journal, worktree et branche renommés). **→ validé, fait le
  2026-11-01.**

- **Q6 — Le corpus** (D4).
  - **Où** : un fichier de données sous `tests/fixtures/mathast/` (aucun test ne lit `docs/`), une
    entrée = `{ id, ligne, attendu, note? }`, regroupées par commande.
  - **Comparaison** : l'écriture exacte, à variations cosmétiques près (espaces, signe ×, ordre des
    termes — le `checkForm` déjà utilisé par l'oracle des primitives), plus un contrôle numérique
    quand c'est possible (une faute de frappe dans un attendu ne fabrique pas un faux « moteur
    faux »).
  - **Qui écrit les attendus** : je propose les lignes (cas réels des élèves, ~10 par commande) et
    les attendus d'après l'ADR 0032 ; **tu les valides** sur une page à cocher avant qu'ils fassent
    foi. Une ligne refusée par toi n'entre pas.
  - **Deux tests** : registre contre corpus ; Atelier contre corpus (sa réponse affichée = l'attendu).
    Les lignes qui divergent aujourd'hui sont marquées « connues fausses » (comme `known-wrong.ts`
    des limites) et se retirent de la liste au fil des PR.
  - **→ validé** (les quatre points).

## Découpage (validé avec Q1-Q6)

0. Le corpus (D4, Q6) et ses deux tests, lignes divergentes marquées « connues fausses ».
1. `.dériver` : forme réduite dans le registre, l'Atelier cesse de remplacer (pilote de la méthode).
2. `.simplifier`, `.résoudre`, `.intégrer` (même méthode).
3. Commandes de Q1 descendues dans le registre, une PR par famille.
4. `pnpm math` sur `WebReplEngine` (`repl.ts`, `cli.ts` réécrits) ; règle « ne plus sonder avec
   `pnpm math` » levée.
