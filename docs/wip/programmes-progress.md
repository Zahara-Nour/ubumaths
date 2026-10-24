# Chantier « programmes » : le BO consultable dans la page Programme

## Reprendre ici

_Mis à jour le 2026-10-24, après #1679 (+ correctif exposant t/n)._

- **État** : #1676, #1678, #1679 mergées (pas en prod). Vue PDF validée par David ; tout le lycée transcrit (2de, 1_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO) ; titres `##`/`###` en bleu d'accent, filet sous `##`, validé par David.
- **Prochaine action** : lot cycles 4, 3, 2 sur une nouvelle branche (`cycle-N.md` commun + un morceau par niveau, cf. `OFFICIAL_PROGRAMMES`) ; même méthode : un agent Sonnet par morceau, complétude par mots `pdftotext`, formules par `validateLatex` (`mathlive/ssr`).
- **En attente de David** : relecture de `transcriptions/2.md` (fractions empilées p. 5, vecteurs p. 9) ; niveaux de titres ambigus 1_TECHNO p. 8-9, T_TECHNO p. 10-11.
- **Pièges en cours** : `<embed>` bloqué par la CSP → `<iframe>` ; prettier ignore `transcriptions/` ; limiteur de connexions locales (15 min, par IP) bloque les captures Playwright après quelques essais → test client `OfficialProgrammeView.svelte.test.ts` pour le rendu.
- **Worktree / branche** : `../ubumaths-wt-programmes` (branche `feat/programmes-transcriptions-lycee`, mergée) gardé tant que le serveur de test 5177 sert ; à retirer ensuite.

## Décisions (2026-10-24, validées par David : « je suis tes recos »)

1. **Lecteur PDF** : celui du navigateur, dans un `<iframe>` (recherche, zoom, sélection), plus « Ouvrir le PDF dans un onglet » (aperçu médiocre sur iPhone / iPad) et « Télécharger ». Les lecteurs existants ne lisent pas un PDF donné : `PdfSvgView` affiche le SVG de Typst, le tableau blanc rasterise par `pdfjs-dist`.
2. **PDF déplacés** (`git mv`) de `docs/ref/programmes/` vers `static/programmes/` sous des noms ASCII ; renvois des docs vivantes mis à jour (archives et CHANGELOG laissés tels quels). Publics : textes officiels publiés.
3. **Transcription** : mot à mot, ubumark, dans `src/lib/server/programmes/transcriptions/<morceau>.md`, lue côté serveur. PR 1 = la 2de seule, pour valider la forme ; les autres par lots.
4. **Documents d'accompagnement** (`docs/ref/programmes/Accompagnement/`) : hors chantier.

## Écart au plan

- **Pas de `#page=N` par niveau** : les PDF des cycles 2, 3 et 4 sont rangés par domaine puis par niveau ; chaque niveau revient dans chaque domaine, aucune page n'est « la sienne ». Le PDF s'ouvre au sommaire ; la transcription d'un niveau de cycle = morceau commun du cycle (`cycle-N.md`) + morceau du niveau (`CM1.md`…), qui regroupe sa partie de chaque domaine.

## Correspondance niveau → texte

`src/lib/programmes/official-programmes.ts` (`OFFICIAL_PROGRAMMES`) : CP-CE2 → cycle 2 ; CM1-6e → cycle 3 ; 5e-3e → cycle 4 ; 2de ; 1_GEN → enseignement scientifique ; 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO ; T_GEN → aucun (pas de maths au tronc commun).

## Journal

- 2026-10-24 : phase 0 validée ; PR 1 codée (tests serveur rouges puis verts).
- 2026-10-24 : #1676 mergée. Revue (code-reviewer) : test de cohérence fichiers ↔ niveaux ajouté, BO lu dans ses seules vues ; crainte « CSP bloque le PDF dans le cadre » écartée (statiques servis sans CSP, en local comme sur Vercel), à confirmer dans Chrome. CI : motif `src/lib/programmes/**` ajouté au filtre de l'intégration.
- 2026-10-24 : #1678 mergée : barre des vues toujours sous le titre (à droite, elle passait à la ligne selon la longueur du sous-titre et changeait de place) ; vues BO à la largeur de la liste.
- 2026-10-24 : David a essayé la vue PDF dans Chrome : elle marche. PR 2 lancée (lot lycée, branche `feat/programmes-transcriptions-lycee`).
- 2026-10-24 : #1679 ouverte (lot lycée : 7 transcriptions par 7 agents Sonnet, 956 formules validées MathLive, complétude par mots). Titres en couleur : d'abord une couleur par niveau, jugé excessif par David → une seule couleur d'accent pour `##` et `###`.
- 2026-10-24 : #1679 mergée (lot lycée + titres en couleur sobres).
- 2026-10-24 : 1_GEN p. 7 : c'est l'exposant $t/n$ (David), pas $1/n$ comme je l'avais affirmé sur un glyphe abîmé : corrigé.
