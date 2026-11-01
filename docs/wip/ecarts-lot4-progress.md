---
title: Écarts, lot 4 (L10, L16, V65) — journal
date: 2026-11-01
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-01, avant la PR._

- **État** : L10 et L16 corrigés (tests rouges puis verts, typecheck 0) · **Prochaine action** : PR, CI, merge · **En attente de David** : V65 reste, voir plus bas · **Pièges en cours** : ne pas toucher `pedagogical-simplify/`, `simplify`, `tidy` (`fusion-moteurs`) · **Worktree / branche** : `../ubumaths-wt-ecarts-lot4` (`fix/ecarts-lot4`)

---

## L10

`SEE_ALSO_PATHS` (`src/lib/dictionary/model.ts`) : `atbash`, `scytale`, `polybe` ajoutés. Test `see-also-paths.test.ts` : chaque dossier de `src/routes/(public)/chiffrement/` est une cible possible (rouge sans le correctif). Aucune contrainte en base sur ces chemins (grep `supabase/`).

## L16

`parseWithSpanMarks` (`ubumark/parser/markdown-parser.ts`) remplace la découpe des deux passes (`{.rappel}` puis `{.def}`) : chaque marquage devient son texte entre deux bornes de la zone à usage privé d'Unicode (une plage par passe, les deux s'imbriquent), la mise en forme est lue sur le texte entier, puis les nœuds texte sont redécoupés aux bornes. Borne restée dans un nœud non textuel (texte d'un lien) : effacée. Tests : 3 rouges sans le correctif (`lexicon-marks.test.ts`, `detail-callouts.test.ts`) ; suite ubumark, lexique, fiches, typst, correction : verte.

## V65 reste : `|x^2-1|=3` — non fait, à David

`solve/absolute-value.ts` borne VOLONTAIREMENT le périmètre aux arguments affines (V40, « cas des élèves » ; `|x² − 1| = 3` y est cité comme refus voulu), et `pedagogical-solve/absolute-value` lit la même analyse (`analyzeAbsoluteValue`). Élargir au second degré = rouvrir ce choix : à trancher par David (reco : laisser le refus, sauf demande d'exercices de 1re qui en ont besoin).

## Revue de #2131 (code-reviewer, sonnet)

Aucun bloquant. Corrigé : un caractère de la zone privée (U+E000–U+EFFF) tapé dans la source était pris pour une borne → retiré avant de poser les bornes (test ajouté, rouge sans). Relevés, **déjà sur main**, pour un futur chantier (aucun contenu en prod n'emploie ces formes) :

1. `[x $2+3$ y]{.def}` : le texte autour d'une formule ne reçoit pas la marque.
2. `[a ![i](u.png)]{.def} c` : le texte voisin de l'image disparaît.
3. `[a [b]{.rappel} c]{.def}` : un détail DANS un mot marqué reste littéral (l'inverse marche).
4. `a [[lien [m]{.def}](url)]{.def} b` : restes littéraux `]{.def} b` (sur main : tout littéral).
