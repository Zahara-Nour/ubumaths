# Mathoux v1 — la Chatterie de Faustroll — journal

> Branche `feat/mathoux-chatterie`, worktree `../ubumaths-wt-mathoux`. Démarré le 2026-10-18.
> Spécification validée : [mathoux-conception.md](mathoux-conception.md) § 9.

## Découpage

- Composant SVG `MathouAvatar` (race, stade, sieste, silhouette).
- Calcul serveur de la collection (aucune table) + page `/dashboard/student/chatterie`.
- Le Palotin annonce les Mathoux en sieste.

## Avancement

- [x] PR 1 — #1490 mergée le 2026-10-18 (pas en prod).
- [x] PR 2 — #1489 (table `student_mathoux`) mergée et migrée en prod le 2026-10-18 (vérifié : RLS, lecture seule, anon sans droit).
- [ ] PR 3 — mémoire (meilleur stade, étoiles) + export RGPD : codée, tests verts (branche
      `feat/mathoux-memoire`, non commitée) ; reste revue, audit, PR.
- [ ] Dessins : direction à choisir par David (A2, B2, AB), puis 19 races.

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

### Corrections après revue et audit (2026-10-18, non commité)

Travaillable = tagué par un modèle publié ; états lus sur les seuls points travaillables ; tags lus
par pages de 1 000 ; widget muet sur la Chatterie, salutation après la réponse, bulle à lien 20 s
en `aria-live="polite"`, `resolve()` ; « pour ta classe » ; plus de `<main>` imbriqué ; doc : coût
réel (39 requêtes en Tle spé), rapetissement sans table de mémoire. Signalé, non corrigé : le
plafond de 1 000 lignes latent dans `computePointBadges` (code partagé avec le tableau de bord).

### PR 3 — mémoire et export (2026-10-18, non commité)

Fait, tests verts (unitaires, rendu, intégration avec preuves du rouge) :

- `collection-logic.ts` : `memory` en entrée ; stade affiché = max(calcul, mémoire) ; `stars` =
  niveaux entièrement acquis ∪ étoiles mémorisées ; oubli → sieste ; `memoryUpdates`,
  `mergeMemory`, `starGradeLabel` ;
- `server/mathoux/memory.ts` : lecture au client de l'élève, écriture au client service (insert
  groupé `ON CONFLICT DO NOTHING`, puis mises à jour conditionnées à `updated_at`, relecture et
  fusion sur conflit) ; `collection.ts` l'appelle à chaque calcul, seulement s'il y a du nouveau ;
  `lib/server/mathoux/collection.ts` ajouté à la liste blanche du client service ;
- page : étoiles « ★ 2nde ★ 1ère Spé » ;
- export RGPD : `gaming.mathoux` (`student_mathoux`) et `gaming.palotin` (`student_buddies`,
  décision de David du 2026-10-18), tableau de `rgpd.md` § 7.3. `format_version` laissé à 1.4.

Choix faits faute de spécification (à faire valider) :

- ~~oubli = stade mémorisé > stade calculé~~ → **tranché par David le 2026-10-18 (option 2)** :
  seul un point « déjà réussi puis perdu » (seuil du régime atteint, non acquis) endort ; un point
  jamais acquis empêche seulement l'étoile (`isPointLost`) ;
- un Mathou mémorisé sans point travaillable reste affiché, sans sieste ;
- `first_seen_at` = date de la première écriture (défaut de la table), pas de la première réussite.

Réveil : un Mathou endormi par un point perdu sans carte due ne se réveille qu'à la prochaine
révision due (cas rare, accepté par David le 2026-10-18) ; v1.1 : bouton S'entraîner sur cette
notion (révision forcée limitée aux questions de la notion).
