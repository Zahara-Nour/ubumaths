---
title: Écarts, lot 4 (L10, L16, V65) — journal
date: 2026-11-01
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-01, avant la PR._

- **État** : L10 et L16 corrigés (tests rouges puis verts, typecheck 0) · **Prochaine action** : sonder V65 reste (`|x^2-1|=3` non résolue), l'ajouter au lot si c'est petit, sinon PR · **En attente de David** : rien · **Pièges en cours** : ne pas toucher `pedagogical-simplify/`, `simplify`, `tidy` (`fusion-moteurs`) · **Worktree / branche** : `../ubumaths-wt-ecarts-lot4` (`fix/ecarts-lot4`)

---

## L10

`SEE_ALSO_PATHS` (`src/lib/dictionary/model.ts`) : `atbash`, `scytale`, `polybe` ajoutés. Test `see-also-paths.test.ts` : chaque dossier de `src/routes/(public)/chiffrement/` est une cible possible (rouge sans le correctif). Aucune contrainte en base sur ces chemins (grep `supabase/`).

## L16

`parseWithSpanMarks` (`ubumark/parser/markdown-parser.ts`) remplace la découpe des deux passes (`{.rappel}` puis `{.def}`) : chaque marquage devient son texte entre deux bornes de la zone à usage privé d'Unicode (une plage par passe, les deux s'imbriquent), la mise en forme est lue sur le texte entier, puis les nœuds texte sont redécoupés aux bornes. Borne restée dans un nœud non textuel (texte d'un lien) : effacée. Tests : 3 rouges sans le correctif (`lexicon-marks.test.ts`, `detail-callouts.test.ts`) ; suite ubumark, lexique, fiches, typst, correction : verte.
