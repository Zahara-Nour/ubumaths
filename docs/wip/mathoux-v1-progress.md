# Mathoux v1 — la Chatterie de Faustroll — journal

> Branche `feat/mathoux-chatterie`, worktree `../ubumaths-wt-mathoux`. Démarré le 2026-10-18.
> Spécification validée : [mathoux-conception.md](mathoux-conception.md) § 9.

## Découpage

- Composant SVG `MathouAvatar` (race, stade, sieste, silhouette).
- Calcul serveur de la collection (aucune table) + page `/dashboard/student/chatterie`.
- Le Palotin annonce les Mathoux en sieste.

## Avancement

- [ ] PR 1

### Calcul, page, Palotin gardien (2026-10-18, non commité)

Fait, tests verts :

- logique pure `src/lib/mathoux/collection-logic.ts` (+ `summary.ts`, schéma Zod du résumé) ;
- chargement `src/lib/server/mathoux/collection.ts`, client de l'élève, aucune table ;
- page `/dashboard/student/chatterie` + entrée « La Chatterie » dans la navigation élève ;
- `GET /api/student/mathoux` (compteurs) lu paresseusement par `BuddyWidget` ;
- doc `docs/systeme/mathoux.md`, entrée dans `docs/README.md`, notes dans `buddy-palotins.md` et
  `tableaux-de-bord-et-navigation.md` ; `src/lib/mathoux/**` ajouté au filtre de
  `nightly-integration.yml`.

Complément de David (2026-10-18), intégré : tout le parcours compte (`grade_ancestors`), stade
calculé niveau par niveau, affiché = le meilleur ; détail `byGrade` gardé pour la future table de
mémoire (meilleur stade, étoiles) ; sieste sur un point de n'importe quel niveau.

Choix faits faute de spécification (à faire valider) :

- nom : pluriel (premier mot en -s/-x) → « le Mathou des … », sinon « le Mathou « … » » ;
- une silhouette ne fait jamais la sieste ; les compteurs de sieste ne comptent que les Mathoux nés ;
- « Réveiller » → `/dashboard/revisions/decks/programme` ;
- bulle du Palotin avec lien, 10 s ; remplace la salutation au hasard ;
- silhouette : nom de la notion affiché, pas « le Mathou des … ».

Reste : `code-reviewer`, `security-auditor` (endpoint élève, lectures RLS), commit + PR ; au commit,
`Doc-inchangée:` pour `docs/pratiques/environnement-de-dev.md` (filtre `paths` étendu d'un motif)
si la garde la réclame.
