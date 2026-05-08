# Soumissions persistées (Bloc A) — progression

Permettre la soumission persistée des exos Python pour tous les étudiants : exos assignés (existant) ET exos publics en libre accès (nouveau). Bouton "Soumettre" séparé du "Vérifier", panneau historique sur la page consultation, tout traçable côté prof.

Plan : `~/.claude/plans/shimmying-cooking-hamster.md`.

## Phase 1 — Migration RLS + endpoints API ✅

**Fichiers créés / modifiés :**

- `supabase/migrations/20260509002840_allow_public_python_submissions.sql` — nouvelle policy `python_exercise_submissions_insert_public` qui autorise un élève à insérer une soumission sans assignment quand l'exercice est `is_public = TRUE`. La policy historique (qui exige une assignment) reste en place ; PostgreSQL OR-combine les deux.
- `src/routes/api/python-exercises/[id]/submit/+server.ts` — relâché : si pas d'assignment, on vérifie que l'exo est public, sinon 403. Les checks `max_attempts` et `due_date` sont entourés d'un `if (assignment)` pour ne s'appliquer qu'aux soumissions assignées. Le body de l'INSERT met `assignment_id: assignment?.id ?? null`.
- `src/routes/api/python-exercises/[id]/my-submissions/+server.ts` — nouveau GET. Lit les soumissions sur cet exo (RLS filtre élève vs prof), supporte `?limit=N` (défaut 10, max 50).
- `src/routes/api/python-exercises/[id]/my-submissions/server.test.ts` — 6 tests : élève authentifié reçoit ses soumissions, prof reçoit la vue RLS-élargie, anon reçoit 401, RLS-filtré → tableau vide, erreur Supabase → 500, limit clampé à 50.

**Vérifié :** 6/6 tests verts.

**Décisions :**

- La logique d'autorisation en lecture est déléguée à RLS — le handler ne fait qu'auth + pagination. Plus simple, moins de duplication, garanties uniformes pour student / teacher / anon.
- En écriture (`/submit`), la décision "pas d'assignment + exo non public → 403" reste applicative pour retourner une erreur explicite plutôt que laisser RLS échouer avec un message générique.
- Idempotence migration : `DROP POLICY IF EXISTS` + `CREATE POLICY` (au cas où).

## Phase 2 — UI page consultation ✅

**Fichiers modifiés :**

- `src/routes/(public)/python-exercises/[id]/+page.server.ts` — load enrichi : fetch parallèle exercice + soumissions + role profil. Retourne `{ exercise, submissions, canSubmit, isAuthenticated }`. Pour anon : `submissions: []`, `canSubmit: false`. Ignore les erreurs sur `/my-submissions` pour ne pas casser le rendu de l'exercice.
- `src/routes/(public)/python-exercises/[id]/+page.svelte` — refondu :
  - Init `code` : dernière soumission > localStorage > starter_code.
  - Nouveau handler `handleSubmit()` : exécute la validation locale, POST sur `/submit` avec le résultat, toast + `invalidateAll()` pour rafraîchir les soumissions.
  - Helper `runValidation()` factorise la logique entre "Vérifier" et "Soumettre".
  - Nouveau bouton "Soumettre" : caché pour les profs, grisé+title pour anon, actif pour les élèves.
  - Panneau historique `<details open>` : itère sur les soumissions, badge "Libre" si `assignment_id === null`, bouton "Charger ce code" qui réécrit l'éditeur, format date relative en français.

**Décisions :**

- `invalidateAll()` plutôt qu'un re-fetch manuel : SvelteKit re-rendra automatiquement la page avec les soumissions à jour.
- L'init `code` depuis la dernière soumission n'écrase pas le localStorage existant — le `$effect` continue de mettre à jour localStorage pendant l'édition. Si un élève a un brouillon non soumis dans localStorage et revient après une soumission, il verra le code soumis et perdra le brouillon. Acceptable : la soumission est la "vérité" la plus récente.
- Bouton "Soumettre" `disabled` plutôt que caché pour les anon : laisse le tooltip transmettre l'incitation à se connecter.
- Svelte autofixer : 0 issue, 1 suggestion ignorée (le `$effect` localStorage est un side-effect légitime, pattern préexistant du projet).

## Phase 3 — Quality checks ✅

**Vérifications passées :**

- `mcp__svelte__svelte-autofixer` sur `+page.svelte` — 0 issue, 1 suggestion ignorée (legitimate side-effect).
- `pnpm check:incremental` — toutes erreurs résiduelles dans `slides/demo` et `extern/` (préexistantes, filtrées).
- `npx eslint <5 fichiers>` — 0 problème.
- `pnpm test:server` :
  - `[id]/server.test.ts` : 5/5 ✅ (existants — pas de régression)
  - `[id]/my-submissions/server.test.ts` : 6/6 ✅ (nouveaux)

**Commits livrés (2) :**

1. `dc3375dc1` — Phase 1 : migration RLS publique + relax `/submit` + nouveau `/my-submissions` + 6 tests
2. `bf6479131` — Phase 2 : bouton "Soumettre" + panneau historique + init code depuis dernière soumission

## Application en local

L'utilisateur doit lancer :

```bash
pnpm db:migrate    # applique 20260509002840_allow_public_python_submissions.sql
pnpm dev -- --port 5175
```

## Vérifications manuelles

1. **Élève authentifié, exo public sans assignment** : ouvrir un exo seedé. Le bouton "Soumettre" apparaît actif. Cliquer → toast success/info, le panneau historique apparaît avec `Tentative #1 · Libre`.
2. **Anon** : navigation privée, ouvrir le même exo → bouton "Soumettre" grisé, tooltip _"Connecte-toi pour suivre tes progrès"_.
3. **Prof authentifié** : pas de bouton "Soumettre", "Vérifier" présent.
4. **Exo non public sans assignment** : POST direct via curl → 403.
5. **Recharger la page** après une soumission : l'éditeur charge le code de la dernière soumission (priorité sur localStorage).

## Documents produits

- `docs/wip/free-practice-submissions-progress.md` (ce document).
