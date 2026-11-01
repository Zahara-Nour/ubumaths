---
title: pnpm math branchée sur l'Atelier — journal
date: 2026-11-01
status: phase 0, en attente de David
---

## Reprendre ici

_Mis à jour le 2026-11-01, ouverture du chantier._

- **État** : phase 0 écrite (comportements + questions Q1-Q6), rien de codé.
- **Prochaine action** : réponses de David à Q1-Q6, puis tests rouges de la PR 1.
- **En attente de David** : Q1-Q6.
- **Pièges en cours** : `tsx` ne lance pas l'Atelier (`$state is not defined`, `atelier.svelte.ts`) ;
  passer par le runner de Vite (mesuré, voir § Mesures).
- **Worktree / branche** : `../ubumaths-wt-pnpm-math-atelier` · `refactor/pnpm-math-atelier`.

---

## Pourquoi

Décision de David du 2026-10-24 : `pnpm math` sera branchée sur l'Atelier. Aujourd'hui la console
(`src/lib/mathAST/cli/repl.ts`, `cli.ts`) appelle le registre des commandes directement, sans
`WebReplEngine` ni la couche de l'Atelier (`src/lib/atelier/calcul.ts`) : ses réponses divergent de
ce que voit l'élève (2026-10-23 : `.diff` → `eˣ + xeˣ`, `.dériver` de l'Atelier → `(x+1)eˣ`). Depuis,
on sonde par des tests jetables sur `calcul.ts`.

But : **une console = la vue Calcul de l'Atelier dans le terminal**, mêmes entrées, mêmes réponses,
plus ce qu'un développeur veut voir (l'arbre). Outil de développement, jamais montré aux élèves.

## Mesures (2026-11-01)

- **Point d'entrée** : `runInput(session, ligne)` de `calcul.ts`, avec
  `session = { atelier: new Atelier(), engine: new WebReplEngine() }` — ce que font déjà les tests
  (`atelier/__tests__/solve-command.test.ts`). Rend un `CalcResult` (`kind` : `calcul`, `commande`,
  `definition`, `refus`…), réponse en LaTeX, étapes en LaTeX (`RenderedStep[]`).
- **`tsx`** : échoue, `ReferenceError: $state is not defined` (`atelier.svelte.ts:587`). Les runes
  demandent le compilateur Svelte.
- **Runner de Vite** (`createServerModuleRunner` + plugin Svelte, sonde jetable) : marche.
  `2+3*4` → `14` avec ses étapes ; `.dériver x*e^x` → LaTeX `(x+1)eˣ` ; `f(x)=x^2-3x` puis `f(2)` →
  `-2`. **Chargement : ~9,4 s à froid**, puis chaque ligne est immédiate.
- ⚠️ Dans le résultat de `.dériver`, le champ `output` (texte du moteur) dit encore
  `e^x+xe^x` ; seul `latex` (et l'arbre) porte la réponse de l'Atelier. La console ne doit **jamais
  afficher `output`** pour une commande : elle écrit la réponse depuis l'arbre ou le LaTeX.
- Sous-commandes actuelles de `cli.ts` : `parse`, `tree`, `latex`, `custom`, `simplify`, `normal`,
  `hash`, `equiv`, `repl`. Citée par 4 docs (`pratiques/commandes.md`, `systeme/atelier.md`,
  `systeme/statistiques.md`, `systeme/mathast/README.md`).

## Phase 0 — comportements

**Nominal**

- **M1** `pnpm math` ouvre une console : chaque ligne tapée passe par `runInput`, dans **une seule
  session** (une fonction posée reste posée : `f(x)=x^2` puis `f(3)` → `9`).
- **M2** `pnpm math "f(x)=x^2" "f(3)"` : chaque argument est une ligne de la même session, rejouée
  dans l'ordre, puis la commande rend la main (pour les sondes et les agents).
- **M3** Toutes les entrées de l'Atelier en mode texte marchent : calculs, définitions, commandes à
  point en français, sans accents ou en anglais (`.dériver`, `.deriver`, `.diff`).
- **M4** La réponse est **celle de l'Atelier** : `.dériver x*e^x` → `(x+1)eˣ`, jamais
  `eˣ + xeˣ`. Un refus s'affiche avec le message de l'Atelier.

**Limites**

- **M5** Une ligne qui produit un graphique, une figure ou un tableau statistique : la console dit ce
  qui a été créé (nom, nature) sans dessiner.
- **M6** Ligne vide → rien ; `Ctrl+D` / `.quitter` → sortie.

**Erreurs**

- **M7** Une exception du moteur n'arrête pas la console : message d'erreur, la session continue.
  En mode M2, code de sortie ≠ 0 si une ligne a levé une exception (pas pour un refus normal).

## Questions pour David

- **Q1 — Écriture de la réponse.** Le terminal ne rend pas le LaTeX. Proposé : la réponse en
  écriture texte tirée de l'arbre (`(x+1)*e^x`), le LaTeX sur demande (`--latex`).
- **Q2 — Les étapes (« Comment ? »).** Proposé : cachées par défaut, montrées avec `--etapes` (ou
  `.etapes` dans la console), en texte converti depuis le LaTeX, couleurs retirées.
- **Q3 — L'arbre.** Proposé : sur demande (`--arbre`), comme `pnpm math tree` aujourd'hui.
- **Q4 — Les anciennes sous-commandes** (`parse`, `tree`, `latex`, `custom`, `simplify`, `normal`,
  `hash`, `equiv`) parlent au moteur brut, pas à l'Atelier. Proposé : **les retirer** (c'est la
  divergence qu'on supprime), sauf `hash` et `tree` s'ils te servent ; `repl.ts` et `cli.ts`
  remplacés, `cli/commands/` gardé (c'est le moteur de l'Atelier).
- **Q5 — Les 9 s de chargement.** (a) les accepter ; (b) un paquet précompilé par Vite, refait
  automatiquement quand le code change (démarrage visé ~1 s, plus de mécanique). Proposé : (a) en
  PR 1, (b) en PR 2 si la lenteur gêne.
- **Q6 — Réglages de l'Atelier** (mode décimal, angles, domaine). Proposé : options de la commande
  (`--decimal`, `--degres`), défaut = défaut de l'Atelier.

Hors chantier : l'alignement des formes de commande entre « Écriture mathématique » et le mode
texte (conjugaisons / noms anglais), question laissée en suspens le 2026-11-01.

## Découpage proposé

- **PR 1** : la console sur `runInput` (M1-M7, Q1-Q4, Q6), anciennes sous-commandes retirées, docs
  et mémoire « ne plus sonder avec `pnpm math` » levée.
- **PR 2** (si Q5 b) : démarrage rapide.
