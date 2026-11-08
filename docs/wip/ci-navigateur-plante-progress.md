# Chantier « ci-navigateur-plante » — le job « Client Tests (browser) » plante, tests verts

> Décidé par David le 2026-11-04 (« ce n'est pas possible d'attendre aussi longtemps à chaque fois ») ; ouvert le
> 2026-11-08, depuis la session `questions-2de-demonstrations` (relance sur #2460).

## Reprendre ici

_Mis à jour le 2026-11-08, après les mesures sur les logs (§ 1 bis)._

- **État** : logs mesurés (§ 1 bis) : ~10 % des shards plantent, au hasard ; `wrapDynamicImport` écarté.
- **Prochaine action** : phase 0 avec David : comportements attendus, puis mesures (§ 2) AVANT toute hypothèse
  retenue.
- **En attente de David** : validation des comportements de phase 0 (posés le 2026-11-08 en session).
- **Pièges en cours** : `pnpm check`/`build`/`lint` = un seul à la fois (exit 2 = attendre) ; relancer un job planté
  = `gh run rerun <run> --failed` (run terminé seulement) ; « Client Tests (browser) » n'est PAS un check exigé,
  « CI Summary » l'est.
- **Worktree / branche** : `../ubumaths-wt-ci-navigateur-plante` · `fix/ci-navigateur-plante`.

---

## 1. Ce qu'on sait (2026-11-08, relevé, non mesuré)

**Symptôme.** Un shard du job « Client Tests (browser, shard n/2) » finit rouge alors que tous les tests qui ont
tourné sont verts. Dans le log : de nombreux `TypeError: Cannot read properties of undefined (reading
'wrapDynamicImport')`, puis `[vitest] Browser connection was closed while running tests` et `[birpc] rpc is closed,
cannot call "createTesters"`. Une relance (`gh run rerun <run> --failed`) passe, ~4 min de plus.

**Occurrences relevées.**

| Date            | Où                                     | Shard | Détail                                                           |
| --------------- | -------------------------------------- | ----- | ---------------------------------------------------------------- |
| 2026-10-06 → 08 | 3 fois, dont 2 sur `main`              | —     | avant le découpage en 2 shards ; fichier différent à chaque fois |
| 2026-11-04      | #2380, #2383, `fix/fenetre-choix-test` | 2/2   | tous verts (ex. 2136 tests, 205 fichiers)                        |
| 2026-11-06      | #2435                                  | ?     | relancé une fois (journal `cahier-ubumark`)                      |
| 2026-11-08      | #2453                                  | ?     | relancé une fois (journal `cahier-ubumark`)                      |
| 2026-11-08      | #2460, run 42493249470                 | 1/2   | 1946/1946 tests verts, mais **157 fichiers sur 225** passés      |

Aussi : `clavier-mathlive` (« Browser connection was closed » sur `aide-ecriture/cercle-trigo`, shard 2),
`questions-1spe-demonstrations`.

**Antécédent : #1012 (2026-10-10).** « Browser connection was closed » 3 fois du 6 au 8/10, chaque fois sur un fichier
différent, aucun test ne fait naviguer la page → « c'est le navigateur qui plante, pas un test précis ». Remède : 2
shards (`vitest run --project client --shard=n/2`), « Client Tests (browser) » retiré des checks exigés, « CI
Summary » exigé. « À suivre : la cause exacte n'est pas prouvée. »

## 1 bis. Mesures du 2026-11-08 (logs GitHub, 2026-11-01 → 2026-11-08)

Relevé : tous les jobs « Client Tests » en échec (toutes tentatives) des runs `quality.yml` depuis le 2026-11-01
14 h (l'API plafonne à 1000 runs : rien d'avant). Logs dans le scratchpad de la session, non versionnés.

- **Fréquence, sous-estimée par le § 1** : 107 jobs rouges, dont **88 plantages** (« Browser connection was closed »)
  et 19 vrais tests rouges. Taux de plantage (sur 841 jobs comptés, comptage partiel) : **~10 % par shard**
  (1/2 : 42/421, 2/2 : 49/420) → **~1 run sur 5** demande une relance. Les deux shards plantent autant.
- **Moment de la coupure : au hasard.** 89 à 218 s après le `RUN` (médiane 142 s) ; entre **95 et 218 fichiers
  passés** sur ~225. Rien qui ressemble à un plafond de fichiers fixe (#1012 parlait de 234).
- **Fichier en cours à la coupure : dispersé.** ~45 fichiers différents sur 88 plantages, aucun au-delà de 4
  occurrences (`atelier/serialize` 4, `page-aide-cercle-trigo` 3, `CustomFlashCard` 3, `liste-dans-calcul` 3,
  `banc-curseur` 3). Pas de coupable unique.
- **`wrapDynamicImport` = bruit, piste ÉCARTÉE** : présent aussi dans les jobs VERTS (106 et 163 occurrences sur les
  deux shards du run 42493249470, tentative 2). Pile : `get_hooks` de `.svelte-kit/generated/server/internal.js`,
  côté serveur Vite, pas dans le navigateur.
- **Durée d'un shard vert** : 139 s (1/2) et 215 s (2/2), `import` 191 s / 277 s cumulés → plusieurs fichiers en
  parallèle dans la page (parallélisme par défaut du mode navigateur ; `maxWorkers: 1` du `vitest.base.config.ts`
  ne vaut que pour la config d'intégration).
- **Pas encore mesuré** : mémoire du runner et de Chromium, `dmesg` (tueur OOM ?), cause de fermeture de la page
  (crash du renderer ou fermeture). Il faut instrumenter le job (`workflow_dispatch` sur la branche, sans PR).

## 2. Pistes à MESURER (aucune n'est retenue)

- **Volume par Chromium** : #1012 parlait de Chromium qui « tombait sous 234 fichiers » ; chaque shard est revenu à
  ~225 fichiers. Mesurer : nombre de fichiers par shard au fil des plantages, rang du fichier où ça casse.
- **Mémoire du runner** : RAM du runner GitHub, mémoire de Chromium au fil du shard.
- **`wrapDynamicImport`** : import dynamique après fermeture d'un contexte ? Trouver quel fichier le déclenche en
  premier (horodatages du log).
- **Un fichier de test qui fait tomber la page** : comparer les fichiers en cours au moment de la coupure, sur
  plusieurs plantages.
