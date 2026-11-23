# Chantier `cours-eleve-design` — journal

## Reprendre ici

_Mis à jour le 2026-11-23, avant l'ouverture de la PR._

- **État** : code, tests, doc faits sur la branche ; PR à ouvrir · **Prochaine action** : PR, CI, merge, puis archiver ce journal · **En attente de David** : son avis sur le rendu en prod (après une mise en prod qu'il demandera) · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-cours-eleve-design` / `feat/cours-eleve-design`

## Demande (2026-11-23)

David, sur le lien de consultation d'une classe : titres de chapitre et de section difficiles à
distinguer, grosses cartes. Maquette validée (artefact « Maquette du cours partagé »), puis :
pas de nombre de documents par section, pas de type ni de taille sous le titre ; même design pour
l'élève connecté (oui) ; titres affichés tels que saisis, `_` compris (oui).

## Cause

La règle globale `main h3 { font-size: … !important }` (`src/app.css`) donnait aux titres de
documents (`h3` de `DocumentCard`) la taille des titres de section : la hiérarchie disparaissait.
Cartes de ~190 px par document (pied « Voir / Télécharger » et `py-6` de la carte).

## Fait

- `ResourceRow.svelte` (ligne : pastille, titre, téléchargement) et `plan-groups.ts`
  (`groupPlanItems`, `documentKind`), avec leurs tests.
- `(public)/cours/[token]` : en-tête « Cours de mathématiques » + niveau en toutes lettres,
  sommaire numéroté avec nombre de ressources, chapitre en bandeau, sections en étiquettes.
- `dashboard/student/cours/[chapterId]` : même rendu ; progression sous le titre sur téléphone.
- Description du document (texte du prof) gardée en petite ligne sous le titre (revue) ; ni type ni taille.
- Vu à l'écran (`pnpm voir`, iPhone et ordinateur, décor fictif local) : 0 erreur de console.
- Doc : `docs/systeme/cours-et-chapitres.md`.
