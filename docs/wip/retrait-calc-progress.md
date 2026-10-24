---
title: Retrait de /calc — journal
date: 2026-10-24
status: phase 0 — en attente de la validation de David
---

## Reprendre ici

_Mis à jour le 2026-10-24, avant la première PR._

- **État** : inventaire fait ; `/calc` n'a qu'un manque côté atelier : les **étapes d'un calcul sans lettre**.
  David (2026-10-24) : **combler d'abord**, puis retirer `/calc` → deux PR.
- **Prochaine action** : PR 1 « Comment ? » sur un calcul sans lettre, après validation de la phase 0
  ci-dessous.
- **En attente de David** : validation de la phase 0 (C1-C5) et des questions Q1-Q3.
- **Worktree / branche** : `../ubumaths-wt-retrait-calc` · `chore/retrait-calc` (PR 1 renommée au besoin).

---

## Inventaire (2026-10-24)

`/calc` = `src/routes/(public)/calc/` (14 lignes) + `components/calculator/` (5 composants, 2 tests) +
`stores/calculator.svelte.ts` (480 lignes, 1 test). **Aucun autre lecteur** dans `src/` (grep
`components/calculator|stores/calculator`) : seulement des commentaires qui citent `/calc`
(`atelier/*`, `grapheur-context.ts`, `cli/web/README.md`, `cli/web/types.ts`).

| `/calc` offre                             | Atelier                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| Saisie MathLive                           | ✅ `NaturalField`                                                             |
| Clavier virtuel                           | ✅ `virtual-keyboard.ts` (onglet « Calcul » = touches de `/calc`)             |
| Copier                                    | ✅ « Copier » / « Copier en LaTeX » par ligne                                 |
| Partage par lien (`?share=`)              | ✅ `ShareBar` (autre format : les vieux liens `?share=` tombent)              |
| Export texte / LaTeX de l'historique      | ✅ « Copier l'historique pour une fiche » (`history-export.ts`)               |
| « Tracer » → onglet Graphique             | ✅ l'atelier trace nativement                                                 |
| Historique gardé (`chiphre-calc-history`) | ✅ le sien (`chiphre-atelier-historique`) ; celui de `/calc` n'est pas repris |
| **Étapes d'un calcul simple**             | ❌ **ligne sans « Comment ? »** ; `.simplifier` = 1 étape globale             |

Mesuré (sonde vitest, 2026-10-24) : `2+3*4` → `/calc` « 3 × 4 = 12 », « 2 + 12 = 14 » ; l'atelier :
aucune étape ; `.simplifier 2+3*4` : « On calcule les nombres » d'un trait.

Le moteur de `.évaluer` (`pedagogical-arithmetic`, décisions E2-E6 de `evaluate-steps.ts`) fait déjà
une opération par étape. Sonde sur 20 calculs : priorités, parenthèses, puissances (`2^3` → produit),
négatifs (`5-(-3)`, `(-2)^3`, `-2^2`), fractions (même dénominateur), racines (`√16 = 4`, `√8 = 2√2`)
→ justes. Décimaux (`0.5+1.25`) : le moteur passe par des fractions → la garde E5 refuse.

---

## Phase 0 — PR 1 : « Comment ? » sur un calcul sans lettre

### Comportements

**Nominal**

- **C1** Une ligne de Calcul **sans lettre ni nom de l'atelier** et avec au moins une opération
  (`2+3*4`, `(2+3)*4`, `1/2+1/3`, `3*(2+5)^2`, `5-(-3)`) offre « Comment ? ».
- **C2** Les étapes = celles de `.évaluer` sans l'étape « On remplace » : une opération par étape,
  rédaction collège, l'opération faite en bleu (`2 + 3 × 4` → `2 + 12` → `14`). Une division tapée
  `1/2` s'écrit en fraction, comme dans `.évaluer`.

**Limites**

- **C3** Rien à montrer → pas de « Comment ? » : un nombre seul (`14`), une fraction déjà
  irréductible (`7/3`), une étape unique « On calcule » qui ne dit rien (`3/4*2/9`, mesuré).
- **C4** Mêmes gardes que `.évaluer` : réponse arrondie (`≈`), fonction transcendante (`cos`, `ln`…),
  étapes qui ne concluent pas la réponse du moteur, réponse décimale dont les étapes passent par des
  fractions (`0.5+1.25`) → pas de « Comment ? », la ligne garde sa réponse.

**Erreurs**

- **C5** Division par zéro, règle qui échoue, délai dépassé → la ligne reste celle d'aujourd'hui,
  sans « Comment ? » ; jamais d'erreur affichée à cause des étapes.

### Questions

- **Q1** Un calcul qui utilise une **valeur de l'atelier** (`a+2` avec `a = 3` posé) : pas de
  « Comment ? » en PR 1 (ce serait « On remplace $a$ par 3 », le travail de `.évaluer`). D'accord ?
- **Q2** **Pas de résumé** (bouton « Résumé / Détaillé ») : pour `.évaluer`, le résumé est
  « remplacement + résultat » ; ici il redirait la ligne. D'accord ?
- **Q3** **Décimaux** : `/calc` montrait `0.5 + 1.25 = 1.75` ; l'atelier n'aura rien (garde E5,
  le moteur passe par 7/4). Accepter cette perte pour retirer `/calc`, ou la traiter avant
  (chantier dans `pedagogical-arithmetic`) ?

### Plan

- **PR 1** (pedagogy-expert ou session, Sonnet) : tests d'abord (C1-C5, rendu de la ligne compris),
  puis un `arithmeticSteps(expression, engineAnswer)` tiré de `evaluate-steps.ts` (partage du
  pré-traitement et des gardes), branché sur la ligne `calcul` de `calcul.ts`. Revue `code-reviewer`
  Opus (correction des réponses / étapes).
- **PR 2** : retrait de `/calc` — redirection 308 `/calc` → `/atelier` (`redirectHandle.ts`, modèle
  `/cas`, test `redirectHandle.test.ts:56` à inverser), sortie du sitemap (`sitemap-pages.ts:76`, test
  `suggestions.test.ts` `/CALC/` à changer), suppression de `routes/(public)/calc`,
  `components/calculator`, `stores/calculator.svelte.ts` et leurs tests, commentaires qui citent
  `/calc` mis à jour, `docs/systeme/atelier.md` (`couvre:`), versement de `atelier-saisie-naturelle.md`.
  ⚠️ `mathAST/step-generator` : `generateSteps` n'aura plus de lecteur (ses types restent lus par
  `step-renderer-base.ts` et `pedagogical-solve/types.ts`) → à trancher en PR 2.
