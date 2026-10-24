---
title: Retrait de /calc — journal
date: 2026-10-24
status: phase 0 validée (2026-10-24) — PR 1 en cours
---

## Reprendre ici

_Mis à jour le 2026-10-24, PR 1 prête (avant ouverture)._

- **État** : PR 1 « Comment ? » sur un calcul sans lettre codée, revue Opus faite (F1 angle en
  degrés, F2 `3/4*2/9` contre C3, F3 `2:0,5` → corrigés). Serveur de test : `localhost:5176`.
- **Prochaine action** : merger PR 1, puis PR 2 (retrait de `/calc` + `step-generator`, plan
  ci-dessous).
- **En attente de David** : rien. À signaler : en `.mode décimal`, pas d'étapes (réponses
  arrondies) ; une seule opération (`12/4`) a un « Comment ? » qui redit la ligne (C1).
- **Pièges** : `simplify-carte` (lot 5f-1) change `tidy` ; elle prévient au merge → rebaser,
  relancer `calcul-etapes*.test.ts`.
- **Worktree / branche** : `../ubumaths-wt-retrait-calc` · `chore/retrait-calc`.

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

### Questions — tranchées par David le 2026-10-24 (« je valide »)

- **Q1** Un calcul qui utilise une **valeur de l'atelier** (`a+2` avec `a = 3` posé) : **pas de
  « Comment ? »** en PR 1 (ce serait « On remplace $a$ par 3 », le travail de `.évaluer`).
- **Q2** **Pas de résumé** (bouton « Résumé / Détaillé ») : il redirait la ligne.
- **Q3** **Décimaux** : sans objet — `/calc` passait aussi par une fraction (`0.5+1.25` → `1/2 + 5/4
= 7/4`, mesuré). Garde E5 gardée : pas d'étapes. Des étapes décimales justes = piste pour
  `pedagogical-arithmetic`, non lancée.

### `step-generator` contre `pedagogical-arithmetic` (sonde du 2026-10-24, 24 calculs)

`step-generator` (moteur de `/calc`) : négatifs sans parenthèses (`-3 × -3`, `5 - -3`), `(-2)^3` écrit
`-2^3`, `-2^2` s'arrête à `2^2 = 4`, décimaux réécrits en fractions (`2.5*4` → `5/2 × 4`), étapes
parasites (`1 ÷ 2 = 1/2`, `√3 = √3`), libellé « sqrt ». Mieux : une puissance en une étape
(`2^3 = 8`, aparté « 2 × 2 × 2 »). → **`pedagogical-arithmetic` gardé** (moteur des corrections et de
`.évaluer`) ; **`step-generator` supprimé en PR 2** ; puissances en une étape = PR à part si David
le trouve lourd à l'usage.

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
  Suppression de `mathAST/step-generator` (seul lecteur : `/calc` ; `step-renderer-base.ts` et
  `pedagogical-solve/types.ts` ne le citent qu'en commentaire, à mettre à jour).
