# Re-vérification serveur des soumissions Python — progress

> Crash-recovery + gel des décisions. Créé le 2026-08-27. Branche : `feat/python-server-recheck`.
> Statut global : **Phase 1a en cours** (extraction du noyau de validation headless).

## Problème

`POST /api/python-exercises/[id]/submit` **fait confiance au `validation_result` calculé côté client**
(`is_correct = validationResult.valid`, cf. commentaire l. 29-32 du endpoint). Toute la validation
Python tourne dans Pyodide **dans le navigateur de l'élève** → par construction, l'élève contrôle le
verdict et peut POSTer `valid: true` avec un code bidon, ce qui déclenche le mastery (trigger
`python_exercise_mastery`). C'est un problème d'**intégrité de la notation** (pas RGPD : le prof voit
déjà le code réel stocké dans `python_exercise_submissions.code`).

## Objectif

Rejouer côté **serveur de confiance** les soumissions qui accordent le mastery, comparer au verdict
client, et **signaler les incohérences au prof** — sans bloquer le feedback client (instantané) et
**sans rien modifier** automatiquement (ni mastery, ni soumission).

## Décisions gelées (validées par David)

| Sujet                     | Décision                                                     | Pourquoi / alternatives rejetées                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime**               | **Pyodide dans une fonction Node**                           | Fidélité maximale du verdict (même Pyodide 0.26.2 + même glue + mêmes comparateurs TS) → zéro faux positif de divergence, et réutilisation directe de `output-compare.ts`/`variable-compare.ts`. Rejeté : **Vercel Sandbox / CPython** (interpréteur différent → divergences → risque d'accuser des élèves honnêtes ; réimplémentation des stratégies). Sandbox reste le plan B si Pyodide-in-Node ne tient pas en fonction.                                                                                                                                                                                                                                                     |
| **Déclenchement**         | **`waitUntil` (après submit) + balai pg_cron SQL**           | Le projet **n'utilise pas les crons Vercel** (`vercel.json` → `crons: []`) ; la planification passe par **pg_cron (SQL only)**, or un re-check Pyodide exige du Node. Faire un HTTP-cron = construire le 1er endpoint `/api/cron/*` + activer `pg_net` + Vault → nouvelle infra. Comme on ne rejoue que les soumissions mastery-only (faible volume) et que **Fluid Compute garde l'instance Pyodide chaude**, `waitUntil` est plus simple. Un petit job pg_cron SQL (calqué sur `cleanup_stuck_job_runs`) signale les soumissions coincées en `pending`. Rejeté : **cron Vercel** (Hobby = 1/jour), **HTTP-cron pg_net** (nouvelle brique), **Vercel Queues** (surdimensionné). |
| **Périmètre**             | **Soumissions qui accordent le mastery** (`is_correct=true`) | Cible le compute là où l'intégrité compte ; quotas free tier très confortables.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Politique incohérence** | **Flag prof, ne rien modifier**                              | Pas de punition auto d'un mineur, absorbe les faux positifs. Le prof tranche.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Modèle de données (migration additive)

Sur `python_exercise_submissions` :

- `server_verified_at timestamptz null`
- `server_is_correct boolean null`
- `verification_status text` ∈ `pending | match | mismatch | indeterminate | error | skipped`
- `server_validation_result jsonb null`

⚠️ **Masquage à l'élève** : la RLS est row-level, pas column-level. Masquer `server_*` à l'élève
nécessite des **privilèges colonne** (REVOKE au rôle `authenticated`) **ou** une vue/RPC restreinte.
→ `supabase-expert` tranche en 1b. **Le mastery n'est jamais modifié par le re-check.**

## Phasage

### Phase 1a — Extraction du noyau de validation headless _(EN COURS)_

- **Créer** `src/lib/shared/python/validation-core/` : une fonction agnostique du runtime
  `runExerciseValidation(pyodide, code, config): Promise<ValidationResult>` qui contient toute la
  logique aujourd'hui dans `validateExercise` (worker l. 2056–~2810) + la glue `_chiphre_*`.
- **Modifier** `pyodide.worker.ts` : `validateExercise` devient un mince wrapper (appelle le noyau
  puis `postMessage` le `validation-result`). Aucun changement de comportement.
- **Réutilise tel quel** `output-compare.ts` / `variable-compare.ts` (déjà purs).
- **TDD** : `exercise-validation-real.svelte.test.ts` reste VERT (non-régression) + tests du noyau
  sous Pyodide headless (Node).
- **Agents** : `backend-developer` (Opus) + `test-automator`. **PR autonome, zéro impact utilisateur.**

### Phase 1b — Migration + re-check via `waitUntil`

- Migration additive (colonnes ci-dessus) + masquage colonnes élève.
- Balai SQL `run_flag_stale_python_rechecks()` (logge dans `background_job_runs`, planif pg_cron
  hors-migration comme les autres jobs).
- `src/lib/server/python/recheck.ts` : client service_role, Pyodide-in-Node via le noyau 1a,
  compare au `validation_result.valid` client, écrit le verdict, logge le run.
  Gère L1 (seed réutilisé), L2/L4 (`indeterminate`), E1–E3.
- `submit/+server.ts` : pose `verification_status` à l'insert, puis `waitUntil(recheck(id))` si
  `is_correct=true`.
- **Spike au démarrage** : valider Pyodide-in-Node (mémoire Hobby, cold start sous Fluid). Fallback
  Vercel Sandbox si blocage.
- **Sécurité** : la fonction détient le service_role, mais le code élève tourne en Pyodide/WASM
  **sans pont vers `process.env`** → pas de fuite. **`security-auditor` obligatoire.**
- **Agents** : `supabase-expert`, `backend-developer`, `security-auditor`, `test-automator`.

### Phase 1c — Surface prof

- Badge « ⚠️ incohérence » + panneau diff serveur sur `/python-exercises/[id]/results` et
  `/python-exercises/students/[student_id]`. `pending/error` = état neutre discret.
- `frontend-developer` + `svelte-autofixer`.

## Comportements TDD (spec Phase 0)

- **N1** honnête & correct → serveur = client → `match`, aucune alerte.
- **N2** honnête & faux → `match`, aucune alerte.
- **N3** forgé (`valid:true` + code bidon) → serveur `false` → `mismatch` → alerte prof, mastery inchangé.
- **L1** `reference_solution.generator` → réutilise le seed stocké → reproductible.
- **L2** code non déterministe (`random`/`time`) → `indeterminate`, jamais classé fraude.
- **L3** un re-check ne consomme pas de tentative (`max_attempts`).
- **L4** exercice édité après coup (`updated_at > created_at`) → `indeterminate`.
- **L5** on ne rejoue que `is_correct=true`.
- **E1** exécution serveur échoue (timeout/paquet/OOM) → `error`, pas d'alerte de fraude.
- **E2** quota/worker indisponible → reste `pending`, rejoué plus tard (idempotent).
- **E3** divergence de moteur suspectée → conservateur, on n'accuse pas.

## Risques ouverts

1. Faisabilité **Pyodide-in-Node** en fonction Vercel (mémoire Hobby, cold start) — spike en 1b.
2. **Masquage colonnes** élève (privilèges colonne vs vue) — `supabase-expert` en 1b.
3. Extraction d'un fichier de ~4100 lignes — préserver le comportement à l'identique (garde-fou :
   tests réels existants).

## Journal

- **2026-08-27** — Phase 0 validée. Doc créé. Branche `feat/python-server-recheck`. Début 1a.
- **2026-08-27** — **Phase 1a extraite** (agent backend-developer/Opus). Worker `pyodide.worker.ts`
  4132 → 2677 lignes ; nouveau module `src/lib/shared/python/validation-core/` (`index.ts` 202 +
  `runners.ts` 1125 + `ast.ts` 201 = 1528 l.). `validateExercise` = mince wrapper transport ;
  `runExerciseValidation(pyodide, code, config, {namespace?, skipCodeExec?})` = noyau agnostique.
  Glue `_chiphre_*` inline (voyage avec les fonctions), aucun `_chiphre_*` partagé.
  **Vérifs parent** : ✅ `pnpm check:incremental` 0 erreur · ✅ relecture (extraction fidèle, zéro
  résidu postMessage/global pyodide, wrapper correct). ⏳ Le test réel
  `exercise-validation-real.svelte.test.ts` (@vitest/browser) **ne tourne pas en local** (Playwright
  Chromium non installé) → **validation en CI**. Rien de commité/PR (attente accord David).
