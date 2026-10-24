# Chantier « programmes » : le BO consultable dans la page Programme

## Reprendre ici

_Mis à jour le 2026-10-24, PR 1 en cours._

- **État** : PR 1 (vues « BO (PDF) » et « BO (texte) », PDF déplacés dans `static/programmes/`, transcription de la 2de) en cours sur `feat/programmes-officiels`.
- **Prochaine action** : après le merge de la PR 1, transcrire les autres programmes par lots (lycée, puis cycles 4, 3, 2 découpés par niveau).
- **En attente de David** : relecture de la transcription de 2de (fidélité au BO, forme).
- **Pièges en cours** : `object-src 'none'` (CSP) bloque `<embed>` → `<iframe>` ; prettier ignore `src/lib/server/programmes/transcriptions/` (il abîme l'ubumark).
- **Worktree / branche** : `../ubumaths-wt-programmes` · `feat/programmes-officiels`.

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
