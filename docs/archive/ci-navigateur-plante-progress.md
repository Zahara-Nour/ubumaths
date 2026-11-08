# Chantier « ci-navigateur-plante » — le job « Client Tests (browser) » plante, tests verts

> Décidé par David le 2026-11-04 (« ce n'est pas possible d'attendre aussi longtemps à chaque fois ») ; ouvert le
> 2026-11-08, depuis la session `questions-2de-demonstrations` (relance sur #2460).

## Reprendre ici

_Mis à jour le 2026-11-08, PR du GC forcé — chantier clos à son merge._

- **État** : cause trouvée et corrigée (§ 1 quater) : GC de Chromium forcé après chaque fichier des tests client
  (`VITEST_CHROMIUM_GC_DISK_THRESHOLD_GB` dans `quality.yml`), décidé par David le 2026-11-08 (+50 s par job
  acceptées). Journal versé dans `docs/archive/`, décision dans `docs/pratiques/environnement-de-dev.md`.
- **Prochaine action** : aucune (clos). À suivre : le taux des plantages sur les PR des jours suivants.
- **En attente de David** : rien. La relance automatique dans le job n'a plus d'objet.
- **Laissé en l'état** : `deploy:prod` reconnaît « le plantage connu » à `wrapDynamicImport` dans les logs ; or
  cette erreur est dans TOUS les logs du job client, verts compris (§ 1 bis) : un vrai test client rouge serait
  relancé à tort (au plus 2 fois, puis arrêt). Signature juste : « Browser connection was closed ».
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

## 1 ter. Runs instrumentés du 2026-11-08 (branche, `workflow_dispatch`)

Runs 42500460491 (10 jobs, 0 plantage), 42501714844 (20 jobs, 1), 42502747694 (20 jobs, 4). Trois plantages lus
en détail (jobs 128795768532, 128798927656, 128798927794), même schéma à chaque fois :

- **Mémoire écartée** : runner 16 Go, 4 cœurs ; Chromium au plus 5,7 Go (un processus ≤ 2 Go), Node ≤ 2,7 Go ;
  au moins 7,3 Go disponibles, 8,3 Go au moment d'une coupure. `dmesg` vide (ni OOM ni segfault).
- **Plantage de Chromium écarté** : `pw:browser` montre `<gracefully close start>` puis `exitCode=0` APRÈS la
  coupure, aucun message de plantage.
- **Ce qui se passe** : toutes les connexions de la page tombent d'un coup, de façon non propre (« [vite] server
  connection lost » pour le client Vite ET le tester Vitest, dans plusieurs iframes). Le navigateur le voit 10 à 40 ms
  AVANT Node (« Browser connection was closed »).
- **Redémarrage de Vite écarté** : `inotifywait` ne voit aucun fichier écrit entre le démarrage et la coupure (seul
  `results.json` à la fin) ; `vite:deps`/`vite:hmr`/`vite:config` muets pendant les tests.
- **Fichier en cours** : `derivative-everywhere`, et d'autres : toujours dispersé.

## 1 quater. Cause et remède (2026-11-08)

- **Codes de fermeture** (`ws.on("close")` patché dans le CI, run 42506033619, 5 plantages) : la PREMIÈRE connexion
  fermée est toujours celle d'un **orchestrateur, code 1001** (la page s'en va, fermeture propre côté navigateur) ;
  son testeur suit en 1001, puis les autres pages en 1006 quand Vitest ferme le navigateur.
- **Ni navigation ni `beforeunload`** sur la page principale avant la coupure (écouteurs posés par chaque iframe).
- **Le taux suit les documents retenus** : poser des écouteurs sur `window.top` depuis chaque iframe (qui retient
  donc chaque iframe retirée) fait passer le taux à **15/20** (run 42506955972).
- **Remède : GC de Chromium forcé après chaque fichier.** Vitest 4.1.12 l'a (`maybeCollectChromiumGarbage`,
  `HeapProfiler.collectGarbage` par CDP) mais seulement sous un seuil de disque libre (4 Go ; `/tmp` en a 86) ;
  `VITEST_CHROMIUM_GC_FORCE` ne suffit pas (le seuil est relu après) → `VITEST_CHROMIUM_GC_DISK_THRESHOLD_GB=100000`.
  - même instrumentation qui fuit + GC : **20/20 verts** (run 42507785612) contre 15/20 rouges ;
  - sans instrumentation + GC : **20/20 verts** (run 42509298715).
- **Coût** : job 291 s (shard 1) et 322 s (shard 2) contre 242 s et 271 s sur des PR récentes, soit **~+50 s par
  job**. Le GC prend ~2 s par fichier (mesuré avec instrumentation), en parallèle sur 3 pages.
- Même mécanisme que [vitest#10300](https://github.com/vitest-dev/vitest/pull/10300) (Mapbox : « seul un GC forcé
  toutes les 5 s marche ») ; [vitest#9437](https://github.com/vitest-dev/vitest/issues/9437) = la fuite qui remplit
  le disque, pas notre cas.

## 2. Pistes du départ (toutes tranchées au § 1 bis à 1 quater) (aucune n'est retenue) (aucune n'est retenue)

- **Volume par Chromium** : #1012 parlait de Chromium qui « tombait sous 234 fichiers » ; chaque shard est revenu à
  ~225 fichiers. Mesurer : nombre de fichiers par shard au fil des plantages, rang du fichier où ça casse.
- **Mémoire du runner** : RAM du runner GitHub, mémoire de Chromium au fil du shard.
- **`wrapDynamicImport`** : import dynamique après fermeture d'un contexte ? Trouver quel fichier le déclenche en
  premier (horodatages du log).
- **Un fichier de test qui fait tomber la page** : comparer les fichiers en cours au moment de la coupure, sur
  plusieurs plantages.
