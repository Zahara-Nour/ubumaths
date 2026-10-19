# Mathoux v1 — la Chatterie de Faustroll — journal

> Branche `feat/mathoux-chatterie`, worktree `../ubumaths-wt-mathoux`. Démarré le 2026-10-18.
> Spécification validée : [mathoux-conception.md](mathoux-conception.md) § 9.

## Reprendre ici

_Mis à jour le 2026-10-19, après #1498._

- **État** : Mathoux v1 + « Faire grandir » (#1490, #1489, #1493, #1494, #1498) sur `main`, pas en prod. Noms des 19 races validés par David ([mathoux-noms.md](mathoux-noms.md)).
- **Prochaine action** : lire les avis de la page à cocher (base `avis`, `kind` = `mathou`), relire chaque nom avec sa fiche (signaler les coquilles, ne pas corriger en silence), puis UNE PR : races dans `src/lib/components/mathoux/mathou-races.ts` (noms provisoires à remplacer), table notion → nom affichée « Nom, Race », `docs/systeme/mathoux.md`.
- **En attente de David** : relecture des 134 noms de Mathoux sur la page à cocher https://claude.ai/artifact/Q594t4KTxepA4Q6MSnmp84 ; `deploy:prod` (seulement à sa demande).
- **Pièges en cours** : juste avant `deploy:prod`, lancer `fix-renvois-numerotation.ts --publier` (autre chantier) ; peu de Mathoux possibles tant que les modèles ne sont pas tous tagués (autre chantier).
- **Worktree / branche** : aucun ouvert ; partir de `origin/main` (`feat/mathoux-noms`).

## Découpage

- Composant SVG `MathouAvatar` (race, stade, sieste, silhouette).
- Calcul serveur de la collection (aucune table) + page `/dashboard/student/chatterie`.
- Le Palotin annonce les Mathoux en sieste.

## Avancement

- [x] PR 1 — #1490 mergée le 2026-10-18 (pas en prod).
- [x] PR 2 — #1489 (table `student_mathoux`) mergée et migrée en prod le 2026-10-18 (vérifié : RLS, lecture seule, anon sans droit).
- [x] PR 3 — #1493 mergée le 2026-10-18 : mémoire (meilleur stade, étoiles), sieste de l'oubli, export RGPD (Mathoux et Palotin).
- [x] Dessins : AB3 choisi par David le 2026-10-18 (après trois itérations), décliné en 19 races, #1494 mergée.
- [x] v1.1 « Faire grandir » — #1498 mergée le 2026-10-18 (pas en prod).
- [ ] Noms : races validées le 2026-10-18 ; noms des 134 Mathoux en relecture chez David.

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

### v1.1 — « Faire grandir » (2026-10-18, branche `feat/mathoux-faire-grandir`, non commité)

Spec validée par David le 2026-10-18 : bouton « Faire grandir » sur chaque Mathou né, vers un
Entraînement (`/automaths/test?…&mode=interactive`) des modèles publiés de la notion, sur tout le
parcours : points perdus, puis non acquis, puis autres ; 10 au plus, une question par modèle.
« Réveiller » d'un Mathou endormi sans carte due mène à ce même Entraînement.

Fait, tests verts (rouge d'abord) :

- `collection-logic.ts` : `trainingTemplateFrom` (brouillon et catégorie hors bornes écartés),
  `selectTrainingTemplates` (priorité, plafond, un par modèle, points servis tour à tour),
  `trainingCategories`, `trainingQuery` (`buildSeriesLink`) ; `Mathou.trainingCategories` et
  `Mathou.dueForRevision` ; après revue : le lien se construit au rendu (données de la page pour 40
  Mathoux : 172 Ko → 80 Ko), plus de « Réveiller » sans carte due ni Entraînement, plus de cast
  dans `resolve()`, ordre des catégories prouvé en intégration ;
- `server/mathoux/collection.ts` : la jointure des tags lit aussi `theme, domain, subdomain, level,
delay` du modèle — **aucune requête en plus** ;
- page : « Faire grandir » (`aria-label` « Faire grandir le Mathou des … »), « Réveiller » vers
  l'Entraînement sans carte due, `resolve()` ;
- intégration (`mathoux-collection.test.ts`) : le lien relu par `resolveTestLaunch` porte les
  modèles publiés de la notion, pas le brouillon ajouté.

Choix faits faute de spécification (à faire valider) : à priorité égale, points servis tour à tour
(ordre du parcours, plus ancien niveau d'abord, puis id) ; « Faire grandir » reste aussi sur un
grand matou ; un Mathou endormi sans carte due n'a que « Réveiller » (vers l'Entraînement),
correction demandée le 2026-10-18 ;
durée = celle du modèle, 20 s sinon.
