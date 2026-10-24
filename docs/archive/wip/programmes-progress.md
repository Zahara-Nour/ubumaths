# Chantier « programmes » : le BO consultable dans la page Programme

## Reprendre ici

_Mis à jour le 2026-10-24, après #1688._

- **État** : tous les niveaux transcrits. Lot cycles 2, 3, 4 (63 morceaux sous `transcriptions/cycle-N/`) mergé (#1688) ; lycée mergé (#1676, #1678, #1679, #1683) ; rien en prod.
- **Prochaine action** : relecture par David des cycles (serveur 5177) ; puis clore le chantier (versement dans `docs/systeme/`, archivage du journal).
- **En attente de David** : (1) cycle 2 : tableaux « Objectifs d’apprentissage / Exemples de réussite » éclatés en titres `######` + listes (libellés ajoutés là où le tableau n’a pas d’en-tête, CE1 p. 28) ; (2) illustrations remplacées par « _(Illustration : voir le PDF, page P.)_ », leur texte non transcrit (une en pleine phrase : ciseaux et stylos, CM1 p. 9 / CM2 p. 12) ; (3) relecture de `transcriptions/2.md` (fractions p. 5, vecteurs p. 9) ; titres ambigus 1_TECHNO p. 8-9, T_TECHNO p. 10-11.
- **Pièges en cours** : `<embed>` bloqué par la CSP → `<iframe>` ; prettier ignore `transcriptions/` ; limiteur de connexions locales bloque les captures Playwright → test client pour le rendu.
- **Worktree / branche** : `../ubumaths-wt-programmes` (branche `feat/programmes-transcriptions-cycles`, mergée) gardé tant que le serveur de test 5177 sert à la relecture ; à retirer ensuite.

## Décisions (2026-10-24, validées par David : « je suis tes recos »)

1. **Lecteur PDF** : celui du navigateur, dans un `<iframe>` (recherche, zoom, sélection), plus « Ouvrir le PDF dans un onglet » (aperçu médiocre sur iPhone / iPad) et « Télécharger ». Les lecteurs existants ne lisent pas un PDF donné : `PdfSvgView` affiche le SVG de Typst, le tableau blanc rasterise par `pdfjs-dist`.
2. **PDF déplacés** (`git mv`) de `docs/ref/programmes/` vers `static/programmes/` sous des noms ASCII ; renvois des docs vivantes mis à jour (archives et CHANGELOG laissés tels quels). Publics : textes officiels publiés.
3. **Transcription** : mot à mot, ubumark, dans `src/lib/server/programmes/transcriptions/<morceau>.md`, lue côté serveur. PR 1 = la 2de seule, pour valider la forme ; les autres par lots.
4. **Documents d'accompagnement** (`docs/ref/programmes/Accompagnement/`) : hors chantier.

## Écart au plan

- **Pas de `#page=N` par niveau** : les PDF des cycles 2, 3 et 4 sont rangés par domaine puis par niveau ; chaque niveau revient dans chaque domaine, aucune page n'est « la sienne ». Le PDF s'ouvre au sommaire ; la transcription d'un niveau de cycle = morceau commun du cycle (`cycle-N.md`) + morceau du niveau (`CM1.md`…), qui regroupe sa partie de chaque domaine.

- **Introductions de domaine** (cycles 3 et 4) : un morceau commun par domaine (`cycle-N/<domaine>`, titre `##` + introduction), suivi de la partie du niveau (`cycle-N/<niveau>-<domaine>`, titre `###` du niveau) — tranché par David le 2026-10-24 (pas de doublon, le texte se lit comme le BO).

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
- 2026-10-24 : lot cycles (branche `feat/programmes-transcriptions-cycles`) : 12 agents Sonnet (commun + 3 niveaux par cycle), complétude par mots (manquent seulement sommaire et texte des illustrations), 551 formules validées MathLive ; expressions à moitié LaTeX (`a$x$ = c`) passées entièrement en maths ; siècles en texte (« XVIIe ») comme au lycée.
- 2026-10-24 : #1688 mergée (lot cycles). La CI a attrapé un test de page qui supposait le CM1 non transcrit : corrigé.
