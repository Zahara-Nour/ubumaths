---
title: Lot d'écarts « fiches » (PDF et Typst)
date: 2026-11-28
status: clos
---

# Lot d'écarts « fiches »

## Reprendre ici

_Mis à jour le 2026-11-28 : chantier clos._

- **État** : clos. 9 écarts faits et barrés (#3267, #3275) ; migration `20261128003004` en prod ; lot marqué « fait » dans `docs/wip/ecarts-lots.md` ; journal archivé.
- **Prochaine action** : aucune.

## Écarts du lot

V108, V109, V111 (visibles, phase 0) · L9, L85, L86, L111 (latents) · T23 (RGPD) · M44 (code mort).

## Questions posées à David (2026-11-28)

1. **V108 + M44** : au corrigé d'une série d'automatismes, vecteur attendu en flèche verte, droite verticale en vert ; le dessin `solved` de `courbe-typst.ts` (M44, sans appelant) servirait au lieu d'être supprimé.
2. **V109** : au corrigé imprimé, aiguilles de l'horloge à régler et barre à construire dessinées en vert.
3. **V111** : fiche anglaise, notion sans nom anglais : quel titre en tête ?
4. **L86** : fonction SQL (droits de l'appelant) qui écrit notions et fiche d'un coup ; question d'accès.
5. **L9** : la prod n'a pas STIX Two Math (polices du bundle typst.ts : New Computer Modern Math) ; le témoin devrait la retirer plutôt que la mettre dans le dépôt.

**Tranché par David le 2026-11-28 (« d'accord » sur les recommandations)** : (1) V108 + M44 : flèche verte, pointillés de construction gardés, dessin `solved` appelé (pas supprimé) ; (2) V109 : aiguilles et barre en vert ; (3) V111 : nom anglais de la branche s'il existe, sinon « Worksheet » ; (4) L86 : fonction SQL aux droits de l'appelant, accès inchangé ; (5) L9 : STIX retirée du témoin (décision du 2026-11-03 remplacée).

## Historique

- 2026-11-28 : clôture sur go de David : lot marqué fait, journal archivé.

- 2026-11-28 : #3275 mergée (PR 2 : V109, L86), après un `deploy:prod` qui tenait le verrou ; `db:migrate` de `20261128003004` (seule migration en attente), fonction vérifiée en prod.

- 2026-11-28 : revues de la PR 2. `security-auditor` (Opus) : aucun bloquant, accès inchangé (policies vérifiées en prod) ; test ajouté : élève qui lit la fiche sans pouvoir retirer ses notions. `code-reviewer` (Opus) : aucun bloquant ; message de la route rendu juste (« la fiche et ses notions »), constante remise avant les fonctions.

- 2026-11-28 : PR 2. V109 : clé `solution: oui` sur `horloge (aiguilles attendues en vert, à la taille de l'horloge à placer) et `barres (barres à construire en vert, `spec.solvedBars` ; échelle à choisir → l'axe juste, `adaptedScale`) ; écran, PDF, `findHorlogesToPlace` / `findBarsToPlace` sautent ces blocs ; série : `horlogesARegler`, `barresAConstruire` (énoncé sans `case:`, corrigé + `solution: oui`). Relevé en prod : 4 modèles publiés à horloge à régler, 7 à barres à construire (dont 4 à échelle à choisir). L86 : `save_worksheet_classification` (security invoker, une transaction, refus RLS vérifiés en base) ; route et `applyClassification` passent par elle.

- 2026-11-28 : #3267 mergée (PR 1). Conflit avec `main` sur `ubumark.md` (L89 d'une autre session) résolu en gardant les deux.

- 2026-11-28 : L9 (STIX retirée du témoin), V111 (branche anglaise, sinon « Worksheet » ; `loadBranches` lit la branche d'une notion seule), V108 + M44 (clé `solution: oui` du bloc courbe, `solvedOverlay` partagé écran / PDF, série d'automatismes). Rendu vu à l'écran (capture Chromium) et au PDF (compilateur de la prod). V109 se révèle plus gros (la série refuse horloge et barres) : PR 2.

- 2026-11-28 : L85 (`escapeTypst` échappe `//` et `/*`), T23 (`escapeTypstBrackets` sur le texte du prof d'une fiche), L111 (refus HTTP relevé tel quel) ; tests compilés pour de vrai, vérifiés rouges sans le correctif.

- 2026-11-28 : lot pris, worktree ouvert, preuves rejouées (9 rouges).
