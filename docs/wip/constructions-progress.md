# Constructions animées — journal

## Reprendre ici

_Mis à jour le 2026-10-23, lot 10 en cours (`@mesure`, PR 1/3 : `milieu`)._

- **État** : lot 10 `@mesure` lancé, plan validé par David (3 PR : `milieu` à la règle graduée → `bissectrice` au rapporteur → `mediatrice` milieu mesuré + équerre ; pas `perpendiculaire`). PR 1 `milieu` : tests rouges commités, code en cours. Lots 1 à 9 partent au prochain `deploy:prod`.
- **Prochaine action** : coder la voie `milieu @mesure` (`choreographies/milieu.ts`), verts, revue `code-reviewer` Sonnet, doc `constructions.md`, PR.
- **En attente de David** : (1) vérification #1633 (serveur 5182, worktree `-auxiliaires`) ; marqueurs d'angle droit en `@complet` → puis suppression des worktrees `../ubumaths-wt-constructions`, `-droite`, `-consignes`, `-auxiliaires`. (2) Suites hors `@mesure` : côté du carré d'angle droit ; message « P sur (AB) » sans `@equerre` ; C\* à côté d'un vrai C.
- **Pièges en cours** : `e` = constante d'Euler, jamais comme nom dans un script. Primes typographiques (′ ″) dans consignes et étiquettes. Étiquette auxiliaire = provisoire (`setProvisionalLabel`) : `updateLabel` la rend définitive. Shard client 1/2 de la CI peut bloquer sur `wrapDynamicImport` → relancer le job. 3 constructions en prod avec des `@cacher` sans effet.
- **Worktree / branche** : `../ubumaths-wt-constructions-mesure`, `feat/constructions-mesure`.

---

## Lot 1 — Sécurité (2026-10-22)

### Question d'accès (tranchée par David le 2026-10-22)

- **Écriture** : créer, modifier, publier une construction = **prof et admin seuls**. Un élève ne peut plus en créer. Mesure prod : 9 constructions, toutes publiques, toutes sans auteur (comptes supprimés) ; aucun élève n'en a écrit → personne ne perd rien qu'il utilise.
- **Lecture** : inchangée — tout compte connecté lit les constructions publiées (contenu de cours écrit par un adulte).

### Phase 0 — comportements

Nominal :

1. Un prof (ou l'admin) crée, modifie, publie, supprime ses constructions comme aujourd'hui.
2. Un élève voit la liste `/constructions` et joue les constructions publiées, comme aujourd'hui.

Limite :

3. Un élève n'a plus les boutons « Nouvelle construction » ni « Conversion » sur `/constructions`.
4. Un élève qui ouvre `/constructions/new` ou `/constructions/[id]/edit` à la main reçoit un 403.
5. Un élève qui conserve une construction (cas théorique : ancien prof devenu élève) peut encore la **supprimer**, plus la modifier.

Erreur :

6. `POST /api/constructions` et `PUT /api/constructions/[id]` par un élève → **403**, rien d'écrit.
7. Un élève qui écrit **directement en base** (client Supabase du navigateur) : `insert` refusé (erreur `42501`), `update` → zéro ligne modifiée. Tenu par la RLS : `INSERT` et `UPDATE` exigent `is_teacher_or_admin()` en plus de `auth.uid() = author_id`.

Migration : **additive au sens du risque** (resserre deux policies, aucune donnée touchée) ; rollback écrit en commentaire (les deux policies d'origine).

### Réalisé (2026-10-22)

- Migration `20261022200000_constructions_ecriture_prof_admin.sql` : `INSERT` et `UPDATE` exigent `is_teacher_or_admin()`. Test `tests/integration/constructions-ecriture-reservee.test.ts` : 3 rouges sans la migration (création élève ×2, modification élève), 7/7 verts avec.
- API : `POST` et `PUT` → `requireRoles(CONSTRUCTION_AUTHOR_ROLES)` (`src/lib/server/constructions-access.ts`) ; `DELETE` avec `.select()` (zéro ligne → 404).
- Pages : `/constructions/new` et `/constructions/[id]/edit` → 403 pour un élève ; boutons « nouvelle », « importer XML », « modifier » masqués (`canAuthor`). Test `src/routes/api/constructions/__tests__/ecriture-reservee.test.ts` : 6 rouges sans le correctif, 10/10 verts avec.
- Revues : `security-auditor` aucun finding bloquant ; `code-reviewer` → PUT refusé par la RLS = 404, assertions 200/201 strictes, DELETE à zéro ligne testé (11/11).

## Lot 2 — Consignes, `masque`, ménage (2026-10-23)

Inventaire de départ : [constructions.md](../systeme/geometrie/constructions.md) § Fonctions manquantes, Dette de code, Commentaires périmés.

### Phase 0 — validée par David le 2026-10-23

**A. Consignes des sous-étapes affichées** (`SubStep.instruction`, ~60 consignes écrites, jamais affichées)

1. Pendant une sous-étape qui porte une consigne, le lecteur l'affiche ; elle suit le curseur (avancer, reculer, recommencer).
2. Instruction non chorégraphiée, ou sous-étape sans consigne : rien de plus ; la consigne de sous-étape disparaît au pas suivant.
3. **Deux lignes** (choix de David) : la consigne `@instruction` de l'auteur reste en haut, celle de la sous-étape dessous, plus petite.
4. Construction en erreur : figure partielle comme aujourd'hui ; consigne = celle du dernier pas joué.

**B. Convertisseur** : un point « masquer » / « montrer » de l'XML IEP → `masque(A)` / `montre(A)` (au lieu de `@cacher("A")` / `@montrer("A")`, sans effet). Instruments inchangés (`@cacher`). Les 3 constructions déjà en prod ne sont **pas** réparées (choix de David) : leurs arguments sont des identifiants IEP (`T_3`, `arc_9`) sans nom dans le script.

**C. Ménage sans changement de comportement** : code mort (`resolveCurrentDecorators`, `_speedFactor`, `ConstructionMeta`, `DirectiveName`) ; `any` de `ScriptEditor.svelte` ; coloration de l'éditeur tirée de `BUILTIN_NAMES` (seul changement visible) ; commentaires périmés du code et `couvre:` du README ; `constructions.md` mis à jour. Journaux d'archive inchangés.

**Hors lot** (choix de David) : les deux défauts de l'API des scripts de démo → lot à part (revue sécurité).

Revue : `code-reviewer` (Sonnet).

### Réalisé (2026-10-23)

- **A** : `ConstructionPlayer.svelte` lit `executor.currentSubStep?.instruction` dans `syncState()` et l'affiche sous la consigne de l'auteur (« ↳ », plus petit). Test `components/__tests__/ConstructionPlayer-consignes.svelte.test.ts` : 4 rouges sans le code, 4/4 verts avec (rendu réel, curseur avant/arrière).
- **B** : `converter.ts` écrit `masque(A)` / `montre(A)`. 2 tests dans `converter.test.ts` (sortie + point réellement masqué à l'exécution) : rouges sans le correctif, verts avec.
- **C** : code mort retiré, `any` de l'éditeur → `StateEffectType<number[]>`, coloration tirée de `BUILTIN_NAMES` / `MATH_FUNCTIONS` (sur-ensemble strict de l'ancienne liste, aucun mot ne change de couleur), 7 commentaires corrigés, `constructions.md` recalé (numéros de ligne, lignes réglées retirées, les 3 constructions de prod notées).
- `check:incremental` 0 erreur · `types:cliquet` tenu · `lint:fast` propre · `test:server constructions-v2` 189 ✓ / 21 ignorés.

## Lot 3 — API des scripts de démo (2026-10-23)

**Phase 0 validée par David** : `DELETE` d'un id étranger ou inconnu → 404 « Script introuvable », rien de supprimé ; erreur de la base → 500 en français, détail au journal serveur ; question d'accès : **prof et admin seulement** (lecture comprise), comme l'écriture des constructions. Mesuré en prod : 5 scripts, tous de l'admin ; personne ne perd rien.

### Réalisé

- `+server.ts` : `requireRoles(CONSTRUCTION_AUTHOR_ROLES)` sur les trois verbes, `DELETE … .select('id')` (zéro ligne → 404), `logger.error` + message fixe en 500.
- Migration `20261023150000_construction_demo_scripts_prof_admin.sql` : la policy `*` « les siens » devient « les siens, prof ou admin » (`is_teacher_or_admin()`), rollback en commentaire.
- Tests : `api/construction-demo-scripts/__tests__/api.test.ts` (7 rouges sans le correctif, 9/9 verts) ; `tests/integration/construction-demo-scripts-reserves.test.ts` (2 rouges sans la migration — cas élève —, 5/5 verts avec).
- `constructions.md` : tables, API, dette réglée retirée.
- Non fait (hors lot) : la page `/construction-demo` montre toujours « Sauvegarder » à un élève, qui reçoit un toast d'erreur 403.
- Revues : `code-reviewer` et `security-auditor` sans finding bloquant ; ajout des tests « `author_id` usurpé » et « visiteur non connecté » (7/7). CI verte, mergée (#1618), `db:migrate` joué en prod le 2026-10-23 (policy vérifiée : une seule, `authenticated`).

## Lot 5 — Parallèle par double perpendiculaire (2026-10-23)

**Phase 0 validée par David** (2026-10-23), deux voies `double_perpendiculaire` :

- **`@euclide`** (le stub `NOT_YET_IMPLEMENTED` de `parallele.ts`) :
  1. Perpendiculaire à `(AB)` par `P`, animée comme `perpendiculaire @euclide` (`rayon_libre`, 7 sous-étapes, via `ctx.sub`) → la droite auxiliaire `e` apparaît.
  2. Perpendiculaire à `e` **au point `P`** (P ∈ e : `rayon_libre` dégénère) : deux petits arcs en `P` coupent `e` en `C*`, `D*` (fade-in) ; ouverture **plus grande**, arcs en `C*` puis `D*` qui se croisent en `R` (fade-in) ; règle `(PR)` = la parallèle.
- **`@equerre`** (nouvelle) : équerre posée sur `(AB)`, angle droit au pied, tracé de `e` ; puis équerre posée sur `e`, angle droit en `P`, tracé de la parallèle ; règle pour prolonger.
- Consignes de sous-étape en français (lot 2). `e` = **charnière** (visible `@squelette`/`@complet`, masquée `@epure`) ; arcs et points auxiliaires comme les autres voies. Défauts inchangés (`parallelogramme`, `pose_equerre`).
- Limite : `P` loin → rayon viewport-safe. `P ∈ (AB)` → erreur d'exécution claire, pas d'animation fausse (cas non élève, pas creusé).
- Tests d'abord : nombre et suite des sous-étapes, `e ⟂ (AB)`, droite finale ∥ `(AB)` passant par `P`, visibilité des 3 modes, rendu dans le lecteur ; le test du stub est remplacé.

### Réalisé (2026-10-23)

- `parallele.ts` : les deux voies (sous-perpendiculaires `rayon_libre` / `pose_equerre` par `ctx.sub`, méthodes passées explicitement) ; rayons fixes 1,5 et 2,5 pour la perpendiculaire en P ; charnières `[e, R]` (`@euclide`), `[e]` (`@equerre`), deux marqueurs d'angle droit. `ChoreographyError` (`types.ts`) → `DslRuntimeError` à la ligne (`executor.ts`).
- Tests : 17 d'intégration rouges sans le code + 3 de rendu du lecteur ; 208 ✓ / 21 ignorés. Revue `code-reviewer` opus : aucun bloquant ; mineurs 1-2 corrigés (direction de la parallèle à l'équerre tirée de `u`, juste quand P glisse sur (AB) — test rouge sans, vert avec) ; mineur 3 (autres décors) non fait.
- `check:incremental` 0 erreur · `types:cliquet` tenu · `lint:fast` propre · `docs:check-a-jour` sans alerte · CI verte, mergée (#1621).

## Lot 6 — Autres décors, arrêt d'exécution signalé (2026-10-23)

**Phase 0 validée par David** (2026-10-23, « je suis tes recos » : B = proposition 1) :

- **A. Double perpendiculaire sur d'autres décors** (tests seulement ; rouge = vrai bug, corrigé dans la PR) — `@euclide` et `@equerre`, décors (AB) verticale avec P à gauche puis à droite, (AB) oblique avec P dessous :
  1. droite finale ∥ (AB) passant par P ; 2. `e` ⟂ (AB) passant par P ; 3. à l'équerre, angle droit du côté de P à chaque pose, marqueurs d'angle droit (F, P) du bon côté ; 4. au compas, R distinct de P et hors de `e`.
  2. Limite : P glissé de l'autre côté de (AB) après coup → la parallèle suit, l'équerre se retourne au rejeu.
- **B. Arrêt d'exécution signalé dans les consignes** : constat — la « sous-étape fautive » n'existe pas (l'erreur est levée avant les sous-étapes, l'instruction est retirée de la frise). Donc : au **dernier pas** de la frise, si l'exécution s'est arrêtée ensuite, une ligne « ⚠ Arrêt à la ligne N : <message> » s'ajoute sous les consignes ; la consigne du dernier pas joué reste (règle 4 du lot 2) ; curseur reculé → la ligne disparaît. Erreur de syntaxe (pas de frise) ou script sans erreur → rien ne change.

### Réalisé (2026-10-23)

- `ConstructionPlayer.svelte` : `$derived` `executionStop` (dernier pas + `loadError` → ligne d'arrêt). 6 tests de composant (2 rouges sans le code ; frise vide et script corrigé ajoutés après revue).
- `choreographies-integration.test.ts` : 12 tests « autres décors » (3 décors × 4), tous verts ; preuve : rotation de la 2e pose d'équerre inversée à la main → 6 rouges.
- Revue `code-reviewer` opus : aucun bloquant ; mineurs 1-2 corrigés, 3 (préfixe « Ligne N » ailleurs qu'en tête) laissé, aucun message actuel concerné.
- `check:incremental` 0 erreur · `types:cliquet` tenu · `lint:fast` propre · `docs:check-a-jour` OK · CI verte, mergée (#1623).

## Lot 7 — Formes décorées `(P, d)` (2026-10-23)

**Phase 0 validée par David** (2026-10-23) :

- **Nominal** : `d = droite(A, B)` (ou segment `[AB]`, demi-droite `[AB)`) puis `parallele(P, d) @…` / `perpendiculaire(P, d) @…` → animation **identique** à `(P, A, B)` : mêmes sous-étapes, consignes, visibilité des 3 modes ; toutes les voies existantes. Aujourd'hui : droite tracée sans animation (les arguments non-points font abandonner la chorégraphie en silence).
- **Point caché de `d`** (ex. `d` elle-même construite) : pour les voies qui posent l'instrument sur A ou B (`parallelogramme`, `arcs_egaux`, `pose_equerre` de la parallèle), le point caché apparaît en fondu comme point auxiliaire (masqué en `@epure`). Voies qui n'utilisent que la direction : inchangées.
- **Erreurs** : inchangées (premier argument non-point, second non-droite, `P ∈ d` en `double_perpendiculaire`).
- Tests d'abord : suite de sous-étapes `(P, d)` = `(P, A, B)` voie par voie, droite finale juste, visibilité 3 modes, point caché, rendu dans le lecteur.

### Réalisé (2026-10-23)

- `executor.ts` : `expandLineArgument` ramène `(P, d)` à `(P, A, B)` (ordre de `resolveLinePoints`) ; la pré-passe applique la visibilité finale après chaque chorégraphie, comme l'exécution (sinon fondu rejoué sur un point déjà visible).
- `choreographies/reveal-points.ts` : fondu des points cachés de d sur lesquels un instrument se pose — `parallelogramme` (A, B), `perpendiculaire @arcs_egaux` et `@pose_equerre` (A), donc `parallele @equerre @double_perpendiculaire` ; pas `parallele @equerre @pose_equerre` (équerre près du projeté).
- Hors phase 0, demandé par David en cours de route : message de `e`/`π` réservés (`interpreter.ts`).
- Tests : 44 rouges sans le code puis verts (+ 3 réutilisation de d, + 2 rendu du lecteur, + 2 message) ; `test:server constructions-v2` 277 ✓ / 21 ignorés, `geometry-core/dsl` 2009 ✓. Revue `code-reviewer` opus : aucun bloquant ; mineur 1 (pré-passe) et trou de test corrigés, mineur 2 (consignes en dur) → David. CI verte, mergée (#1626).

## Lot 8 — Consignes avec les vrais noms (2026-10-23)

**Phase 0 validée par David** (2026-10-23) :

- **Nominal** : dans les consignes de sous-étape de **toutes** les chorégraphies (`parallele`, `perpendiculaire`, `mediatrice`, `bissectrice`, `cercle_circonscrit`, `transporte`), chaque lettre qui désigne un argument du script est remplacée par son nom sur la figure : `parallele(M, C, D)` → « Compas en M, on prend la mesure |MC| » ; forme `(P, d)` → « coupe d », « parallèle à d ».
- **Point d'argument caché ou sans nom** (ex. point caché de d) → tournure neutre (« Compas sur le point choisi… »).
- **Inchangé** : points auxiliaires (Q, R, C*, D*, A′, B′, A*, B*, O…) et droite intermédiaire `e`, sans étiquette sur la figure → lot à part. Scripts aux noms identiques aux lettres d'aujourd'hui → textes identiques.
- Tests d'abord : autres noms, forme `(P, d)`, point caché, non-régression des textes actuels.

### Réalisé (2026-10-23)

- `choreographies/names.ts` (rôles `en`, `de`, `mesure`, `droite`, `lineFormRoles`…) ; `args.lineName` rempli par `expandLineArgument`, transmis par `ctx.sub`. Corrigé au passage : 2e médiatrice de `cercle_circonscrit` (« Compas en A » au lieu de B).
- Choix validé par David : un angle (α, β de `transporte`) n'est nommé que si son nom s'affiche, sinon « l'angle ».
- Tests : 44 + 7 (tournures neutres par famille) ; 33 rouges sans le code ; 13 non-régressions (textes d'avant). `test:server constructions-v2` 321 ✓. Revue `code-reviewer` Sonnet : aucun bloquant ; tests des tournures neutres ajoutés. CI verte (shard client 1 relancé : blocage `wrapDynamicImport` sans rapport), mergée (#1629).

## Lot 9 — Points auxiliaires nommés (2026-10-23)

**Phase 0 validée par David** (2026-10-23) : **afficher** (pas retirer), collision → **prime**.

- **Nominal** : tout point auxiliaire nommé par une consigne (Q, R, C\*, D\*, A\*, B\*, A′, B′, A″, B″, M, O, P de la bissectrice `@arcs_egaux`) et la droite `e` portent cette lettre sur la figure, dès leur apparition et tant qu'ils sont visibles (charnières `@squelette`/`@complet`, autres `@complet`, rien `@epure`).
- **Lettre prise** (figure, script même plus loin, chorégraphie précédente) → prime de plus (Q → Q′ → Q″), même lettre dans la consigne.
- **Inchangé** : auxiliaires non nommés (F, croisements des médiatrices) ; textes des consignes hors collision — sauf le prime, désormais typographique (B' → B′, A'' → A″), comme l'étiquette (le canevas écrit les étiquettes en texte brut).
- Constat de l'inventaire : collision réelle avant ce lot (script avec un point Q, O, M, R ou P → consigne qui désignait le mauvais point ; deux parallèles → deux « Q »).

### Réalisé (2026-10-23)

- `Figure.setLabel` ; `ctx.auxName` (`createAuxNamer` dans `names.ts`, un générateur par instruction, partagé avec `ctx.sub`) ; `labelAux(ctx, id, base)` ; noms du script relevés au chargement (`declaredNames`, `executor.ts`). Six chorégraphies : `parallele`, `perpendiculaire`, `bissectrice`, `cercle_circonscrit`, `transporte` (A″, B″ = points de β créés par le builtin, étiquetés après coup) ; `mediatrice` sans lettre. Descriptions des voies passées aux primes typographiques.
- Tests : `choreographies-auxiliaires.test.ts` (29, dont 26 rouges sans le code) ; `ConstructionPlayer-points-auxiliaires.svelte.test.ts` (2, rouges sans `setLabel`) ; non-régressions du lot 8 passées aux primes typographiques. `test:server constructions-v2` 357 ✓ / 21 ignorés ; `test:client` constructions + atelier 26 ✓. `check:incremental` 0 · `types:cliquet` tenu · `lint:fast` propre.

- Revue `code-reviewer` opus : 2 importants corrigés — (1) `O = centre(c)` donnait « O′ » (la chorégraphie créait son propre O) ; (2) `D = cote(be, 2)` après `transporte` : le nom D était perdu (A″, B″ sont les points de β). Règle ajoutée, dans l'esprit du lot 8 : **le nom donné par le script l'emporte** — étiquette provisoire (`Figure.setProvisionalLabel`) que `labelElement` remplace, détectée en fin de pré-passe, pré-passe refaite avec ce nom ; le O de `cercle_circonscrit` est le centre du builtin. Mineurs : `Q[i]` ne réserve plus Q ; `setLabel` retiré (doublon d'`updateLabel`) ; en-tête de `names.ts` ; tests du lecteur pour `e` et R. +4 tests serveur (rouges sans le correctif), +1 client. `test:server constructions-v2` 361 ✓ ; client 27 ✓.

### Vérifications #1621, #1626, #1629 (Playwright sans fenêtre, 2026-10-23)

Faites par un agent (aucun navigateur pilotable dans la session) : consignes relevées pas à pas et captures.

- #1621 : compas OK (19 étapes, figure finale juste) ; équerre OK (consignes, angle droit en P, côté cohérent) ; P sur (AB) → « Arrêt à la ligne 4 : … P est sur la droite (AB)… » OK — écart mineur : le message cite `@double_perpendiculaire` sans `@equerre`. Marqueurs d'angle droit : visibles en `@complet` seulement, à revoir dans ce mode.
- #1626 : `m` = animation de `(P, A, B)` OK ; consigne « On choisit un point de la droite » OK, fondu non jugeable sur captures instantanées ; message `e` réservé OK.
- #1629 : OK. Remarque de l'agent : « C\* » à côté d'un vrai point C du script se lit mal (« plus grand que MC\* » après « Compas en C… »).

## Lot 10 — `@mesure` (2026-10-23)

**Plan validé par David** (2026-10-23, « je suis tes recos ») : trois PR — (1) `milieu` à la règle graduée ; (2) `bissectrice` au rapporteur (mesure de l'angle, moitié, repère, tracé) ; (3) `mediatrice` = milieu mesuré + angle droit à l'équerre. **Pas** `perpendiculaire` au rapporteur (au collège : équerre, et `@equerre` existe). Consignes avec **valeur lue et calcul** ; lecture arrondie au **mm** (longueur) / au **degré** (angle), calcul fait sur la valeur lue, point placé à la valeur exacte ; unité **cm**, virgule décimale.

### PR 1 — `milieu @mesure` : phase 0 validée (2026-10-23)

- **Nominal** : `I = milieu(A, B) @mesure` (ou `milieu(s)`) → (1) règle posée le long de A–B, 0 sur A, rien de tracé : « On place le 0 de la règle sur A et on lit AB = 6,4 cm » ; (2) crayon à la graduation, règle visible : « 6,4 ÷ 2 = 3,2 : on repère la graduation 3,2 » ; (3) I apparaît : « On marque I à 3,2 cm de A ».
- **Visibilité** : codage AI = IB (deux marques égales) étiqueté `marker`, comme les angles droits des voies `@equerre` : visible en `@complet`, retiré par `-marqueurs`, caché en `@squelette`/`@epure`.
- **Limites** : 0 sur le point le plus à gauche (le plus bas si vertical) → consigne « sur B… de B » ; 6,37 → « 6,4 » ; 6,3 ÷ 2 = 3,15 ; entier sans « ,0 » ; noms : règle des consignes du lot 8.
- **Erreurs** : A = B → « A et B sont confondus : il n'y a pas de longueur à mesurer » ; AB > 15 cm → « AB = 17,2 cm : trop long pour la règle de 15 cm, rapprochez les points » (règle de longueur fixe, choix de David sur reco) ; `milieu @euclide` → « non disponible ».
- Tests : `core/__tests__/milieu-mesure.test.ts` (22, tous rouges sans le code).
