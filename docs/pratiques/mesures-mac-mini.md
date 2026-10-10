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
- `docs/pratiques/worktrees.md`, `docs/pratiques/qualite.md`,
  `docs/pratiques/git-workflow.md`, `docs/pratiques/base-de-donnees.md`,
  `docs/pratiques/commandes.md` : mentions de la contrainte ;
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
- 2026-09-29 — **Phase 1 faite** sur Mac mini Apple M6 (12 cœurs, 24 Go), node
  v22.23.3, pnpm 10.23.0, OrbStack plafonné à 12 Go. Brave, VS Code et deux
  sessions Claude ouverts. **Swap 0 → 0 sur toutes les mesures.** Pic total =
  somme des RSS (surestime : pages partagées comptées plusieurs fois).

  | #   | Commande                                            | Supabase | Durée | Plus gros process | Pic total (avant) | Verdict                               |
  | --- | --------------------------------------------------- | -------- | ----- | ----------------- | ----------------- | ------------------------------------- |
  | M6  | `pnpm test:integration`                             | allumé   | 180 s | 0,4 Go            | 18,4 Go (16,0)    | 1065 ✓, 12 ignorés                    |
  | M5  | `check:incremental` après édition + dev sur 5175    | allumé   | 47 s  | 2,9 Go            | 19,4 Go (18,3)    | 0 erreur, chemin lent (sync) confirmé |
  | M1  | `pnpm check`                                        | éteint   | 82 s  | 5,3 Go            | 18,9 Go (16,1)    | 10 016 fichiers, 0 erreur             |
  | M2  | `pnpm build`                                        | éteint   | 64 s  | 5,7 Go            | 18,6 Go (12,9)    | OK                                    |
  | M3  | `pnpm lint`                                         | éteint   | 530 s | 4,1 Go            | 17,8 Go (12,8)    | 0 erreur, 190 avertissements          |
  | M4  | `FORCE=1 check:incremental`                         | éteint   | 44 s  | 2,9 Go            | 17,2 Go (14,1)    | 0 erreur                              |
  | M7  | `check:fast` (retiré)                               | éteint   | 47 s  | 4,2 Go            | 18,4 Go (14,2)    | **exit 134 : tas Node par défaut**    |
  | M8  | `npx svelte-check --tsconfig ./tsconfig.check.json` | éteint   | 44 s  | 4,2 Go            | 18,3 Go (14,1)    | **exit 134 : tas Node par défaut**    |
  | M9  | `FRESH=1 check:incremental` (cache froid)           | éteint   | 82 s  | 4,0 Go            | 18,3 Go (14,2)    | 0 erreur                              |

  M7 et M8 : `JavaScript heap out of memory` près de 4030 Mo, plafond par
  défaut de Node = 4144 Mo sur cette machine. Limite V8, pas la RAM (swap 0).

- 2026-09-29 — **Décisions de David** : (1) `check`/`build`/`lint` autorisés,
  un seul gros process à la fois ; `tsc --noEmit` déconseillé — `check:fast` et
  `svelte-check` sans `--incremental` mesurés (M7, M8) : ils plantent sur le tas
  Node, donc laissés déconseillés, motif corrigé ; (2) `lint:fast` gardé, motif
  durée ; (3) eslint complet en local en arrière-plan ; (4) « ~10 min après une
  édition » retiré ; (5) hook léger gardé, motif durée ; (6) agents :
  `check:incremental` et tests ciblés, `check`/`build`/`lint` complets réservés
  à la session principale ; (7) garde 2 retirée ; (8) heap 4096 gardé,
  commentaire corrigé ; (9) 8192 gardé ; (10) motifs réels dans commentaires et
  doc.
- 2026-09-29 — **Phase 3** : scripts/configs → PR #509 ; doc → commit direct
  sur `main` ; mémoire de Claude du Mac mini mise à jour. Hors liste, corrigés ensuite
  par la PR #511 : `scripts/check-barrel-exports.ts:143` et
  `.github/workflows/bundle-analyze.yml:7` (workflow gardé manuel, seul le
  motif « impossible de builder en local » retiré). Motif de l'interdiction de
  `format` aux agents précisé dans `CLAUDE.md` : un reformatage de l'arbre
  entier noie le vrai changement ; le pre-commit formate déjà les fichiers
  modifiés.
