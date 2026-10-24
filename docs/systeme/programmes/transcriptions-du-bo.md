---
couvre:
  - 'src/lib/server/programmes/transcriptions/**'
  - 'static/programmes/**'
---

# Le BO consultable : PDF et transcriptions

> Versement du chantier « programmes » (2026-10-24 : #1676, #1678, #1679, #1683, #1688). Journal archivé :
> [programmes-progress](../../archive/wip/programmes-progress.md). Le code (page, composant, correspondance
> niveau → texte) est décrit dans [cours-et-chapitres.md](../cours-et-chapitres.md) ; ici, les choix et les
> conventions à respecter pour corriger ou ajouter une transcription.

## Ce que voit le prof

Page Programme d'un niveau, vues **BO (PDF)** et **BO (texte)** : le texte officiel du niveau, à côté de la liste
et de la carte des points.

- **PDF** : le lecteur du navigateur dans un `<iframe>` (recherche, zoom, sélection), plus « Ouvrir le PDF dans
  un onglet » (l'aperçu est médiocre sur iPhone / iPad) et « Télécharger ». Pas d'`<embed>` : la CSP
  `object-src 'none'` le bloque. Les lecteurs maison ne conviennent pas (`PdfSvgView` affiche le SVG de Typst,
  le tableau blanc rasterise).
- **Texte** : la transcription ubumark, rendue par `MarkdownRenderer` (mots du lexique désactivés).

## Les fichiers

| Quoi                          | Où                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------- |
| PDF officiels (noms ASCII)    | `static/programmes/` (servis tels quels, publics : textes officiels publiés)     |
| Transcriptions lycée          | `src/lib/server/programmes/transcriptions/<niveau>.md` (`2`, `1_SPE`, `T_COMP`…) |
| Transcriptions cycles 2, 3, 4 | `src/lib/server/programmes/transcriptions/cycle-N/` (voir ci-dessous)            |
| Niveau → PDF et morceaux      | `src/lib/programmes/official-programmes.ts` (`OFFICIAL_PROGRAMMES`)              |
| Documents d'accompagnement    | `docs/ref/programmes/Accompagnement/` — **hors** de cette fonctionnalité         |

Correspondance : CP-CE2 → cycle 2 ; CM1-6e → cycle 3 ; 5e-3e → cycle 4 ; 1_GEN → enseignement scientifique ;
T_GEN → aucun texte (pas de maths au tronc commun).

## Les cycles : un PDF pour trois niveaux

Les BO des cycles sont rangés **par domaine puis par niveau** : aucune page n'appartient à un niveau, donc pas
de `#page=N` — le PDF s'ouvre au sommaire. La transcription d'un niveau de cycle est découpée pour se lire
comme le BO, sans doublon :

1. `cycle-N/commun` : titre du cycle, Principes ;
2. pour chaque domaine, dans l'ordre du BO : `cycle-N/<domaine>` (titre `##` + introduction commune), puis
   `cycle-N/<niveau>-<domaine>` (titre `###` du niveau, sa seule partie).

Un niveau n'a de vue texte que si **tous** ses morceaux existent (`getTranscription` rend `null` sinon).

## Conventions de transcription

- **Mot à mot** : le texte du BO, sans reformuler ni résumer. Seuls manquent le sommaire et le texte des
  illustrations.
- **ubumark** ; formules en `$…$`, chacune validée par MathLive. Une expression à moitié en maths dans le PDF
  (`a$x$ = c`) passe **entièrement** en maths.
- **Siècles en texte** (« XVIIe »), comme dans le PDF.
- **Titres** : `##` et `###` dans une seule couleur d'accent (`--color-curve-1`, filet sous `##`) — une
  couleur par niveau a été essayée et jugée excessive.
- **Illustrations** : remplacées par `*(Illustration : voir le PDF, page P.)*`, à leur place, y compris en
  pleine phrase (CM1 p. 9 / CM2 p. 12 : ciseaux et stylos).
- **Tableaux « Objectifs d'apprentissage / Exemples de réussite »** (cycle 2) : éclatés en titres `######` +
  listes ; libellé ajouté là où le tableau n'a pas d'en-tête (CE1 p. 28). Les autres tableaux restent des
  tableaux (5e, « élection des délégués »).
- **Prettier ignore `transcriptions/`** : il abîme l'ubumark. Ne pas le forcer.
- **Glyphe douteux dans le PDF** : demander, ne pas trancher (1_GEN p. 7 : exposant $t/n$, pas $1/n$).

## Vérifier une transcription

- Complétude **par mots** contre le texte extrait du PDF (méthode des lots lycée et cycles).
- Toutes les formules passées par MathLive.
- Tests : cohérence fichiers ↔ niveaux (`src/lib/server/programmes/__tests__/`), rendu par test client — le
  limiteur de connexions locales bloque les captures Playwright.

## Points ouverts

À relire par David (notés dans [verifications-manuelles.md](../../wip/verifications-manuelles.md)) : le choix
des tableaux éclatés du cycle 2 et des renvois d'illustration ; `2.md` (fractions p. 5, vecteurs p. 9) ; titres
ambigus 1_TECHNO p. 8-9 et T_TECHNO p. 10-11.
