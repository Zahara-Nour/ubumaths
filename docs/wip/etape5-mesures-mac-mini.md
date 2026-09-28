# Étape 5 — lever les contraintes « 8 Go » sur le Mac mini, progression

> Ouvert le 2026-09-29. Le poste de dev est passé d'un laptop M1 **8 Go** à un
> **Mac mini 24 Go** (migration vérifiée de bout en bout le 2026-09-29).
> Toutes les règles « OOM » de `CLAUDE.md` ont été calibrées sur 8 Go.
> **À exécuter SUR LE MAC MINI** : c'est sa mémoire qu'on mesure, et c'est son
> `~/.claude` qui porte la mémoire à jour.

## Principe

1. **Mesurer d'abord**, sans rien changer aux règles ni aux scripts.
2. **Rapporter à David** avec le décor de chaque mesure.
3. **David décide** règle par règle (garder / assouplir / retirer).
   Une recommandation n'est pas une décision.
4. Seulement ensuite : modifier la doc, les scripts et la mémoire.

## Phase 1 — mesures

### Décor, à noter une fois

- `sysctl -n hw.memsize` (octets), puce (`sysctl -n machdep.cpu.brand_string`),
  `node -v`, `pnpm -v` (doit être 10.23.0 dans le projet).
- Mémoire allouée à OrbStack (réglages OrbStack, ou `orb config show`).

### Pour CHAQUE mesure, relever

| Indicateur                   | Comment                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| durée réelle                 | `/usr/bin/time -l <commande>` → `real`                                                      |
| RSS max du plus gros process | même sortie → `maximum resident set size` (**octets** sur macOS)                            |
| pic de mémoire totale        | échantillonneur ci-dessous                                                                  |
| swap avant / après           | `sysctl vm.swapusage` — **le vrai signal** : un swap qui grossit = la machine sature        |
| Supabase local               | allumé ou éteint (`docker ps --filter label=com.supabase.cli.project=ubumaths -q \| wc -l`) |
| verdict                      | code de sortie, nb d'erreurs / de tests                                                     |

⚠️ `maximum resident set size` ne donne que le **plus gros process**, pas la
somme (vitest lance plusieurs workers). D'où l'échantillonneur de mémoire
totale, lancé en arrière-plan le temps d'UNE mesure puis arrêté (un `sleep 5`,
pas une boucle à vide) :

```bash
( while true; do ps -A -o rss= | awk '{s+=$1} END {printf "%.0f\n", s/1024}'; sleep 5; done ) > /tmp/rss-M1.log &
SAMPLER=$!
# … la mesure …
kill $SAMPLER; sort -n /tmp/rss-M1.log | tail -1   # pic, en Mo
```

### Règles d'exécution

- **Une mesure à la fois**, jamais deux en parallèle (elles fausseraient les
  deux).
- Mesures longues **en arrière-plan** (le foreground de Claude Code coupe à
  10 min).
- **Aucune modification** des scripts, des plafonds de heap
  (`--max-old-space-size`) ni des règles pendant la phase 1.
- Si le swap grimpe de plus de 1 Go ou si la machine devient inutilisable :
  arrêter la mesure, la noter comme « sature », passer à la suivante.

### Les mesures

| #   | Commande                                                                                                                                 | Supabase   | Pourquoi                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| M1  | `pnpm check`                                                                                                                             | éteint     | typecheck complet, interdit sur 8 Go                                                    |
| M2  | `pnpm build`                                                                                                                             | éteint     | build complet, interdit sur 8 Go                                                        |
| M3  | `pnpm lint`                                                                                                                              | éteint     | eslint complet, « CI-only » sur 8 Go                                                    |
| M4  | `FORCE=1 pnpm check:incremental`                                                                                                         | éteint     | référence à cache chaud (~40 s sur 8 Go)                                                |
| M5  | `FORCE=1 ALLOW_DB=1 pnpm check:incremental` **après une édition sous `src/routes`**, avec `pnpm dev --port 5175 --strictPort` qui tourne | **allumé** | **le scénario exact** qui justifie la garde 2 : 15 min puis tué, le 2026-09-09 sur 8 Go |
| M6  | `pnpm test:integration` **sans argument**                                                                                                | allumé     | suite complète, à lancer « par lots de ~6 fichiers » sur 8 Go                           |

**Édition pour M5** (force `svelte-kit sync`, le chemin lent) : copier un
`+page.svelte` ou `+page.ts` de `src/routes` dans `/tmp`, y ajouter une ligne
de commentaire, mesurer, puis **restaurer depuis la copie** (jamais
`git checkout --`), et vérifier `git status --short` vide.

**M6** détruit puis recrée le compte prof local (teardown du global-setup) :
c'est prévu. Si la suite est interrompue : `pnpm db:dev-accounts`.

## Phase 2 — rapport à David

Un tableau : mesure · décor · durée · RSS max process · pic total · swap
avant/après · verdict. Puis, **pour chaque règle ci-dessous**, une
recommandation (garder / assouplir / retirer) avec la mesure qui la fonde.
**Attendre sa décision.**

Règles à passer en revue (dépôt) :

- `CLAUDE.md` § « Contrainte mémoire (OOM) » : liste des commandes interdites,
  `lint:fast` comme substitut, « eslint complet CI-only », « ~10 min après une
  édition », hook pre-commit léger ;
- `CLAUDE.md` § « Quand utiliser un agent » : « interdit aux agents : lancer
  build/lint/check/format (cf. OOM) » ;
- `scripts/check-incremental.sh` : **garde 2** (refus si Supabase tourne) et
  plafond de heap à 4096 Mio (commentaire : « re-measure — don't cargo-cult ») ;
- `package.json` : `--max-old-space-size=8192` de `build`, `check`,
  `check:safe` ;
- `docs/claude/worktrees.md`, `docs/claude/quality-standards.md`,
  `docs/claude/git-workflow.md`, `docs/claude/database.md`,
  `docs/ref/pnpm-scripts.md` : mentions de la contrainte ;
- `.lintstagedrc.js`, `vite.config.ts`, `tsconfig.check.json`,
  `scripts/with-db-lock.sh` : commentaires ou réglages liés aux 8 Go.

Ce qui **ne dépend pas** de la RAM et reste, quoi qu'on mesure :

- les verrous `typecheck` et `supabase` (une ressource partagée, pas la
  mémoire) ;
- les ports (5175 Claude, 5173 David) ;
- le typecheck hors hook (décision du 2026-09-08) ;
- les tâches tuées par le harness de Claude Code malgré de la mémoire libre
  (limite de l'outil, pas de la machine).

Mémoire de Claude **du Mac mini** à revoir (section « Machine 8 Go » de
`MEMORY.md` et fichiers liés : `never-two-typechecks`, `typecheck-a-chaque-lot`,
`suite-integration-par-lots`, `lint-rapide-avant-push`, `no-svelte-check-loops`,
`project_dev-env-oom-mitigation`).

## Phase 3 — appliquer les décisions de David

- Doc pure (`CLAUDE.md`, `docs/**`) → **commit direct sur `main`** (test
  mécanique `git diff --cached --name-only | grep -v -E '^docs/|\.md$'`).
- Scripts, `package.json`, configs → **branche + PR + CI verte + merge**.
- Chaque règle modifiée garde son **origine chiffrée** : « mesuré le <date>
  sur Mac mini <puce> 24 Go : <commande> = <durée>, pic <n> Go, swap +0 ».
- Mémoire du Mac mini : mettre à jour les fichiers, pas en créer des doublons ;
  renommer la section « Machine 8 Go ».

## Journal

- 2026-09-29 — protocole écrit (depuis le laptop). Phase 1 : non commencée.
