# Prompt — débloquer les tests d'intégration + reconvertir les tests « Type A »

> À coller dans une nouvelle session Claude Code. Contexte complet dans
> `docs/wip/test-architecture-progress.md` (section « Suivi post-migration »).

---

## Contexte

Une migration d'architecture des tests a été faite (cf. `docs/ref/tests/architecture.md`) :
tests unitaires co-localisés dans `src/**/__tests__/`, tests d'intégration dans
`tests/integration/` (dont `tests/integration/database/` pour les triggers/RLS),
helpers partagés dans `tests/helpers/` (`supabase/`, `fixtures/`, `database/`).
Les tests d'intégration tournent via `pnpm test:integration`
(`vitest.integration.config.ts`) et nécessitent **Supabase local**.

Un job CI nightly existe (`.github/workflows/nightly-integration.yml`) mais son
**cron est désactivé** (workflow_dispatch only) car il est **bloqué** (voir ci-dessous).

## Problème bloquant #1 — `supabase start` échoue (PRÉREQUIS de tout le reste)

`supabase start` échoue, en local **et** en CI, sur l'image storage :

```
storage-api Error manifest for supabase/storage-api:fix-object-level not found: manifest unknown
```

Faits établis (6 runs CI, cf. progress doc) :

- L'image `supabase/storage-api:fix-object-level` n'est publiée **sur aucun registre**
  (ghcr.io ET docker.io renvoient « manifest unknown »).
- `fix-object-level` est le **tag storage-api par défaut de la CLI 2.105.0**
  (la version installée localement via brew). Ce n'est PAS un override dans
  `supabase/config.toml` (aucun pin d'image n'y figure).
- `supabase start -x storage-api,...` ne suffit pas : la CLI **pull** les images
  avant d'exclure le démarrage.
- C'est très probablement la même cause que « les tests de triggers ne marchent
  pas en local » (note mémoire historique).

### Objectif #1

Faire en sorte que `supabase start` démarre une stack utilisable pour les tests
(au minimum : `db` / postgres, `auth` / gotrue, `rest` / postgrest, `realtime`),
**en local d'abord** (machine de David, macOS + Docker), puis en CI.

Pistes à explorer (à valider, ne pas appliquer à l'aveugle) :

1. **Vérifier l'état local** : est-ce que `supabase start` fonctionne sur la
   machine de David ? Si non, c'est le vrai préalable (rien d'autre n'est
   exploitable avant). `supabase --version` = 2.105.0.
2. **Tester une autre version de CLI** dont l'image storage-api est réellement
   publiée (essayer une release stable proche, vérifier que
   `supabase/storage-api:<tag>` existe sur ghcr/docker avant de pinner). La CLI
   est externe (brew en local ; `supabase/setup-cli@v1` en CI).
3. Si storage n'est pas requis par les tests : trouver un moyen de **vraiment**
   ne pas pull storage-api (version de CLI où `-x` n'force pas le pull, ou
   config qui désactive storage avant pull).
4. Mettre à jour la CLI locale ET le pin de version dans
   `.github/workflows/nightly-integration.yml` de façon cohérente.

### Une fois débloqué

- Lancer `pnpm db:start` puis `pnpm test:integration` en local, constater le
  résultat réel des 19 fichiers d'intégration (dont les 11 tests de triggers
  dans `tests/integration/database/`), et **trier** les échecs éventuels.
- Réactiver le cron dans `nightly-integration.yml` (remettre
  `schedule: - cron: '0 4 * * *'`) et valider via un run `workflow_dispatch`
  (`gh workflow run nightly-integration.yml`).

## Problème #2 — reconvertir les tests « Type A » (dépend de #1)

Trois fichiers de tests **unitaires** contiennent des `describe.skip`/`it.skip`
qui sont en réalité des **tests d'intégration** (leurs commentaires disent
explicitement « should be tested with integration tests » / besoin d'une vraie
DB). Ils sont laissés skippés en attendant #1 :

| Fichier                                                  | Tests skippés | Sujet                                            |
| -------------------------------------------------------- | ------------- | ------------------------------------------------ |
| `src/lib/server/summaries/__tests__/integration.test.ts` | 7             | génération des résumés quotidiens/hebdo          |
| `src/lib/server/__tests__/chapters.test.ts`              | 6             | CRUD chapitres + soumission réponses (DB réelle) |
| `src/lib/server/__tests__/journal.test.ts`               | 4             | requêtes journal multi-jointures                 |

### Objectif #2

Une fois `pnpm test:integration` fonctionnel : **réécrire** ces comportements
comme de vrais tests d'intégration dans `tests/integration/` (utiliser les
helpers `tests/helpers/database/` : `createAuthenticatedClient`, `TestData`,
`createServiceRoleClient`), puis **supprimer** les `describe.skip`/`it.skip`
correspondants dans les fichiers unitaires. Ne PAS se contenter de déplacer le
code skippé (il échoue en l'état) — réécrire avec la vraie DB.

## Contraintes (CLAUDE.md)

- Validation Zod sur les entrées, pas de `any`, Svelte 5 runes, MySelect/MyCheckbox.
- Ne PAS lancer `pnpm check` / `pnpm build` / `svelte-check` sans `--incremental`.
- Quality checks à la fin uniquement (`pnpm check:incremental`, eslint ciblé).
- Le **hook pre-commit** (`lint-staged` → `vitest related`) casse sur les gros
  mouvements de fichiers → utiliser `--no-verify` après vérif via les suites
  complètes. Lancer prettier sur les fichiers édités à la main (sinon le job Lint
  CI échoue sur Prettier).
- Ne PAS pousser / release sans demande explicite de David.
- Pas de `Co-Authored-By: Claude` dans les commits.

## Hors périmètre (déjà fait, ne pas refaire)

- La migration d'architecture (co-location, fusion DB, consolidation helpers) est
  TERMINÉE et poussée.
- Les tests « Type B » (mocks unit d'API cassés : `cleanup-all`, 17 skips de
  `google-coursework-bulk-share`) ont été **supprimés** sur décision PO.
- Le « Bucket 1 » (features non implémentées : `complex-functions` Re/Im,
  `web-repl` stats, `abs-sign`, RPC marketplace inexistantes ; gardes browser des
  stores ; déférés documentés `chapter-templates`/`student-inbox`) reste skippé
  **volontairement** — ne pas y toucher sauf si on implémente la feature/RPC sous-jacente.
