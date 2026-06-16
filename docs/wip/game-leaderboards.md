# Spec Phase 0 — Classements de jeux à 3 niveaux (classe / niveau / école)

> Design doc + plan d'implémentation. **Implémentation sur la branche `refactor/single-teacher`** (PAS de
> nouvelle branche : on réutilise `my_school()`/`same_school()` du Lot 6, déjà en base EU).
> Rédigé : 2026-06-16. Statut : **Phase 0 terminée (décisions §6 prises), plan détaillé §7 prêt à exécuter**.

## 1. Objectif

Pour **chaque jeu**, exposer un classement à **3 portées** :

- **Classe** — mes camarades de classe ;
- **Niveau** — même `grade` que moi, **dans mon école** ;
- **École** — tous les élèves de mon école.

Et **retirer le classement public global** actuel (mineurs exposés inter-écoles → RGPD/safeguarding),
cohérent avec le modèle « école = frontière sociale » du refactor mono-prof
(cf. `docs/wip/single-teacher-refactor.md`, helpers `my_school()`/`same_school()`).

## 2. Décisions verrouillées (David, 2026-06-16)

| Sujet          | Décision                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jeux concernés | **minesweeper, 2048, mathémo** (PAS navadra — module condamné, réécriture en cours)                                                                                                                              |
| « Niveau »     | `profiles.grade` **∩ même école**                                                                                                                                                                                |
| Minesweeper    | **Option (i)** : entre dans la couche unifiée avec **une** métrique simple (`total_points`) pour les 3 portées ; **garde sa vue détaillée** existante (avg_top_10 / temps de référence / ELO multijoueur) à côté |
| Couche unifiée | Oui — faisable (verdict Phase 0)                                                                                                                                                                                 |

## 3. État réel (mesuré 2026-06-16)

Chaque jeu a **sa propre table de score** (pas de stockage commun) :

| Jeu         | Table                         | Score retenu (↑ = meilleur, **un seul par élève**) |
| ----------- | ----------------------------- | -------------------------------------------------- |
| 2048        | `game_2048_scores`            | `best_score` (int)                                 |
| mathémo     | `mathemo_scores`              | `total_score` (numeric)                            |
| minesweeper | vue `minesweeper_leaderboard` | `total_points` (bigint — agrège déjà les parties)  |

**Pas de variante** : un score unique par (jeu, élève). Le mode 2048 a été retiré (2026-06-16) ;
le classement minesweeper agrège déjà toutes les parties/difficultés en un `total_points`.

Existant à réutiliser/remplacer :

- Section **`src/routes/(public)/leaderboards/`** (+ sous-page `mathemo/`) — actuellement **publique/globale**.
- Vues minesweeper : `minesweeper_leaderboard`, `minesweeper_leaderboard_public`, `minesweeper_multiplayer_leaderboard`.
- `profiles.grade` peuplé pour **74/77** élèves ; valeurs `6, 2, 1_GEN, T_SPE…` (même vocab que `classes.grade`).
- `profiles.school_id` peuplé pour 95/98 (cf. refactor) ; helpers `my_school()`/`same_school()` déjà en base.

## 4. Modèle cible

### 4.1 Vue normalisante `game_scores_unified`

```
game_scores_unified(game text, user_id uuid, score numeric, updated_at timestamptz)
```

UNION ALL des 3 sources, une ligne par (jeu, élève) :

- `('2048',        user_id,    best_score,   updated_at)` ← game_2048_scores
- `('mathemo',     user_id,    total_score,  updated_at)` ← mathemo_scores
- `('minesweeper', student_id, total_points, …)` ← source minesweeper (vue ou agrégat brut — à finaliser)

Convention : **score plus élevé = meilleur** pour les 3 (best_score, total_score, total_points sont tous ↑).
Si un futur jeu est « plus petit = mieux » (ex. temps), ajouter une colonne `direction` ou normaliser à l'insertion.

### 4.2 Fonction de classement `game_leaderboard(...)`

```
game_leaderboard(p_game text, p_scope text, p_limit int)
  RETURNS TABLE(rank int NULL, user_id uuid, firstname text, avatar_url text,
                score numeric, is_me boolean, is_teacher boolean)
```

- `SECURITY DEFINER`, `search_path` pinné. Range par `auth.uid()` (l'appelant), jamais un id passé.
- `p_scope ∈ {'class','grade','school'}` → ensemble d'**élèves** :
  - **class** : `student_id IN (SELECT cm2.student_id FROM class_members cm1 JOIN class_members cm2 USING(class_id) WHERE cm1.student_id=auth.uid() AND cm1.status='active' AND cm2.status='active')` (mes camarades) ;
  - **grade** : `profiles.grade = (mon grade) AND profiles.school_id = my_school()` ;
  - **school** : `profiles.school_id = my_school()`.
- **Rang** : `dense_rank() OVER (ORDER BY score DESC)` calculé **entre élèves uniquement** (`role='student'`, `is_test=false`).
- **Le prof** (l'unique `role='teacher'`, s'il a un score pour ce jeu) est **ajouté à chaque scope** comme ligne de
  référence : `is_teacher=true`, **`rank=NULL`** (hors-classement), intercalé à sa position par `score`. Il **ne
  consomme pas de rang** → les rangs élèves ne sont pas décalés. **Admin exclu.**
- Tri final par `score DESC`. Ne renvoie **que** le périmètre autorisé → pas de fuite inter-école (safeguarding).

### 4.3 Affichage

Déplacer les classements de `(public)/leaderboards/` vers **`(protected)/.../leaderboards/`** (auth requise),
avec **3 onglets** (Classe / Niveau / École) par jeu, appelant `game_leaderboard` en RPC.
Minesweeper garde **en plus** sa vue détaillée actuelle (option i).

## 5. Safeguarding / RGPD

- **Plus de classement public inter-écoles** : on retire/segmente `(public)/leaderboards/` et
  `minesweeper_leaderboard_public`. Décision à acter dans l'AIPD (comme l'accès prof au Lot 7).
- Afficher **prénom + avatar** seulement (pas nom complet) sur les classements de mineurs (décidé §6).
- Réutiliser `my_school()` (frontière). Élèves sans `school_id`/`grade` (3) : absents des classements niveau/école.

## 6. Décisions (résolues 2026-06-16, David)

1. **Source du score minesweeper** : `total_points` depuis la vue `minesweeper_leaderboard` ; basculer sur un
   agrégat brut dédié seulement si la vue nested est trop lente (à benchmarker).
2. **Classement public actuel** : **supprimé** → école-only (safeguarding). À acter dans l'AIPD.
3. **Identité affichée** (mineurs) : **prénom + avatar** uniquement.
4. **Ex æquo** : **`dense_rank()`** (sans saut de rang).
5. **Prof / admin** : le **prof apparaît pour information**, positionné par son score, **sans rang**
   (`rank=NULL`, hors-classement) ; les rangs `dense_rank` ne se calculent **qu'entre élèves**. **Admin exclu.**

## 7. Plan d'implémentation (détaillé — exécution sur `refactor/single-teacher`)

### Conventions

- **TDD collaboratif** : les comportements ci-dessous (déjà dérivés des décisions §2/§4/§6) sont validés AVANT
  d'écrire le code de chaque phase ; les tests d'une phase échouent d'abord, puis l'implémentation les fait passer.
- **Agents + modèles** indiqués par tâche. `code-reviewer` (Opus) en fin de **chaque** phase de code ;
  `security-auditor` (Opus) après la migration (Phase 1).
- **Checks qualité** (`npx eslint`, `pnpm check:incremental`, `mcp svelte-autofixer`) **une seule fois, Phase 5**.
- **Doc de progression** : `docs/wip/game-leaderboards-progress.md`, mise à jour entre chaque phase (crash-recovery).
- **Migrations** : David exécute `pnpm db:migrate` + `pnpm db:types`. Les agents n'exécutent jamais build/lint/check.

### ⚠️ Contrainte de déploiement (CRITIQUE — base EU live)

La base EU est **en production**. On scinde la SQL en **deux migrations** :

- **Migration A (Phase 1) — additive uniquement** : vue `game_scores_unified` + fonction `game_leaderboard` +
  index. **Ne casse rien** → David peut la pousser dès la Phase 1.
- **Migration B (Phase 5) — destructive** : `DROP VIEW minesweeper_leaderboard_public` + `REVOKE` éventuels sur
  `anon`. **À pousser uniquement au moment du release**, en lockstep avec le retrait des routes `(public)/leaderboards/`
  (sinon le site prod actuel, qui interroge encore la vue publique, casse entre Phase 1 et release).

### Phase 1 — Couche DB (Migration A, additive)

**Comportements (TDD)** — `game_leaderboard(p_game, p_scope, p_limit)` appelée par un élève :

1. `('2048','class',N)` → mes camarades de classe **actifs** ayant un score 2048, triés `score DESC`, `dense_rank`
   (1, 2, 2, 3 — ex æquo sans trou).
2. `is_me=true` sur exactement ma ligne ; `false` ailleurs.
3. `scope='grade'` → élèves de **même `grade` ∩ même `school_id` (`my_school()`)** uniquement.
4. `scope='school'` → tous les élèves de mon école ayant un score.
5. **Prof** (l'unique `role='teacher'`, s'il a un score pour ce jeu) : présent dans **les 3 scopes**, `is_teacher=true`,
   **`rank=NULL`**, intercalé par `score` ; **ne consomme pas de rang** (les `dense_rank` élèves ne se décalent pas)
   et **n'est pas soumis à `p_limit`** (ligne de référence toujours visible).
6. **Admin** : jamais présent. Élèves `is_test=true` : exclus.
7. **Zéro fuite inter-école** : un élève de l'école A n'obtient jamais une ligne d'un élève d'une autre école,
   y compris en `scope='school'`.
8. **Élève hors-classe** en `scope='class'` → résultat vide (pas de classe = pas de camarades) ; reste visible en
   `grade`/`school` s'il a `grade`/`school_id`.
9. `p_limit` clampé (1..200) ; `p_scope` hors `{class,grade,school}` → vide (ou erreur explicite).

**Tâches** — _Agent : `supabase-expert` (Opus)_ :

- Migration A `supabase/migrations/<ts>_game_leaderboards.sql` :
  - **Vue `game_scores_unified(game, user_id, score, updated_at)`** = `UNION ALL` :
    - `'2048'` ← `game_2048_scores(user_id, best_score, updated_at)` ;
    - `'mathemo'` ← `mathemo_scores(user_id, total_score, updated_at)` ;
    - `'minesweeper'` ← `minesweeper_leaderboard(student_id, total_points, …)`. ⚠️ cette vue **n'a pas** d'`updated_at`
      → utiliser `(SELECT max(played_at) FROM minesweeper_games WHERE student_id=… AND status='won')` ou `NULL`.
      Si la vue imbriquée est trop lente (benchmark), basculer sur un agrégat brut dédié (réserve §6.1).
  - **Fonction `game_leaderboard`** `SECURITY DEFINER`, `SET search_path = public, pg_temp`. Pattern :
    `WITH scoped_students AS (… filtré par scope sur auth.uid() …), ranked AS (SELECT *, dense_rank() OVER (ORDER BY score DESC) FROM scoped_students WHERE role='student' AND NOT is_test), teacher AS (SELECT …, NULL::int AS rank WHERE role='teacher' AND school_id=my_school() AND a un score) SELECT * FROM (ranked WHERE rank<=p_limit UNION ALL teacher) ORDER BY score DESC`.
    Range **toujours** par `auth.uid()` (jamais un id passé en paramètre). Joint `profiles` pour
    `firstname` (colonne confirmée) + `avatar_url` + `role` + `grade`/`school_id` + `is_test`.
  - `GRANT EXECUTE ON FUNCTION game_leaderboard(...) TO authenticated;`
  - **Index** : vérifier/créer `class_members(student_id, status)` et `profiles(school_id, grade)` (perf des rangs).
- **David** : `pnpm db:migrate` (push EU) + `pnpm db:types` (régénère `database.ts`, commit).

**Gate Phase 1** — _Agent : `security-auditor` (Opus)_ : fuite inter-école (comportement 7), correction du
`SECURITY DEFINER` + `search_path`, non-divulgation via `p_scope`/`p_limit`, coût des window functions (perf des rangs
sur gros périmètre école). Puis `code-reviewer` (Opus) sur la migration.

### Phase 2 — Serveur / chargement

**Comportements (TDD)** :

- Le chargement lit `?game=` (`2048|mathemo|minesweeper`) et `?scope=` (`class|grade|school`) de l'URL, **validés
  Zod** (enum + `limit` 1..200, défauts `game` premier onglet / `scope='class'`), et appelle
  `supabase.rpc('game_leaderboard', …)` avec le client **authentifié** (RLS/`auth.uid()`).
- Non authentifié → redirigé/`401` (la route passe sous `(protected)`).
- Retourne des lignes typées (type dérivé dans `database-helpers.ts` : `GameLeaderboardRow`).

**Tâches** — _Agent : `backend-developer` (Sonnet, brief plafonné : ≤1 `+page.server.ts` + 1 schéma Zod + 1 type)_ :

- `(protected)/games/leaderboards/+page.server.ts` : `load({ url, locals })` URL-driven (1 RPC/onglet, SSR-friendly ;
  changement d'onglet = navigation par search-params). Schéma Zod dans `$lib/server/validation/games.ts`.
- Type `GameLeaderboardRow` dans `database-helpers.ts` (pas dans `database.ts`).

**Gate Phase 2** — `code-reviewer` (Opus) : Zod sur tous les params, pas de `any`, pas d'id passé à la RPC.

### Phase 3 — UI

**Comportements (TDD)** :

- 3 onglets **Classe / Niveau / École** par jeu ; défaut **Classe**. Sélecteur de jeu via **MySelect**.
- Chaque ligne : rang (ou **« — »** pour le prof), avatar, **prénom**, score. `is_me` mis en évidence ;
  `is_teacher` stylé « hors-classement » (ligne de référence).
- États vides : « pas encore de score » / « pas de camarades » (élève hors-classe en onglet Classe).
- Minesweeper conserve **en plus** sa vue détaillée actuelle (option i) à côté des 3 onglets unifiés.

**Tâches** — _Agent : `frontend-developer` + `mcp svelte-autofixer` sur chaque `.svelte`_ :

- Créer `(protected)/games/leaderboards/+page.svelte` + composant `LeaderboardTable.svelte` (Svelte 5 runes,
  onglets = liens search-params, MySelect pour le jeu).
- **Supprimer** `src/routes/(public)/leaderboards/` (index + `2048/` + `minesweeper/` + `mathemo/`) et **mettre à jour
  les liens de navigation** vers la nouvelle route protégée.
- Réintégrer la vue détaillée minesweeper existante dans la nouvelle page (réutiliser l'UI actuelle de
  `(public)/leaderboards/minesweeper/`).

**Gate Phase 3** — `code-reviewer` (Opus) + `accessibility-tester` (table de classement : en-têtes, ordre de focus).

### Phase 4 — Tests d'intégration

**Comportements** = les 9 de la Phase 1, vérifiés bout-en-bout contre Supabase local.

**Tâches** — _Agent : `test-automator` (brief plafonné : 1 fichier `tests/integration/`, réutiliser les helpers
existants)_ :

- `tests/integration/game-leaderboards.test.ts` : seed **1 seul prof** (respect du **verrou mono-prof** — cf.
  `tests/integration/global-setup.ts` qui purge les profs de seed) + 1 école, 2 classes, N élèves avec `grade`+scores,
  **1 élève d'une autre école** (test anti-fuite, comportement 7), prof avec un score (comportement 5).
- Tests unitaires UI/format **seulement** s'il reste de la logique TS non triviale (formatage rang « — », `is_me`).
  ⚠️ **Ne pas** créer un 2ᵉ prof dans ce test (le trigger `enforce_single_teacher` le rejetterait).

**Gate Phase 4** — `code-reviewer` (Opus). David lance `pnpm db:start` + `pnpm test:integration` (non vérifiable par
moi sans Supabase local).

### Phase 5 — Doc / AIPD + Migration B + checks finaux

**Tâches** :

- _Agent : `documentation-writer`_ — AIPD `docs/ref/conformite/aipd-dpia.md` : acter (a) **retrait du classement
  public inter-écoles**, (b) classements **école-scopés**, identité **prénom + avatar** seulement (mineurs).
- **Migration B (destructive)** `supabase/migrations/<ts>_drop_public_minesweeper_leaderboard.sql` :
  `DROP VIEW IF EXISTS public.minesweeper_leaderboard_public;` + `REVOKE` éventuels sur `anon`.
  **David la pousse au release uniquement** (cf. contrainte de déploiement ci-dessus).
- Mettre à jour `docs/wip/game-leaderboards-progress.md` et **lister tous les docs produits**.
- **Checks qualité finaux (une fois)** : `npx eslint <fichiers modifiés>`, `pnpm check:incremental`,
  confirmation `mcp svelte-autofixer` sur chaque `.svelte` modifié.
- Commit final (`commit-manager` ou direct selon la taille du diff). **Pas de push/release** sans demande explicite.

## 8. Risques

- **RGPD mineurs** : tout classement expose des données d'élèves → périmètre école strict + identité minimale.
- **Perf** : `game_leaderboard` fait un rang sur un JOIN profiles/class_members ; index sur `(school_id, grade)`,
  `class_members(student_id, status)` ; éviter de ranker toute la base. Vue nested minesweeper à benchmarker.
- **Couplage navadra** : exclu ici ; son classement 3-niveaux sera (re)fait dans la réécriture.
- **Hétérogénéité des scores** : chaque jeu a sa propre échelle (best_score / total_score / total_points) ;
  pas de comparaison inter-jeux — chaque classement est interne à un jeu.
