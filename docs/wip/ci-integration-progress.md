# Chantier `ci-integration` — tests d'intégration de la CI plus courts

## Reprendre ici

_Mis à jour le 2026-11-21, après #2956._

- **État** : A mergée (4 morceaux) : 17,5 → 7,5 min (run 44891964659). Go de David sur A → F → B → C
  et sur le correctif du global-setup (2026-11-21).
- **Prochaine action** : F = tests de migration de données hors des PR (trier d'abord les 307
  fichiers qui lisent une migration : données de modèles / règles d'accès), puis B, puis C.
- **En attente de David** : rien.
- **Pièges en cours** : suite locale cassée au global-setup par les liens de partage du prof de dev
  (§ 3.4 ; clés sans `ON DELETE` : `class_journal_share_tokens`, `class_course_share_tokens`,
  `exercise_share_tokens`…) ; morceaux déséquilibrés (212 à 318 s) → D si besoin.
- **Worktree / branche** : `../ubumaths-wt-ci-integration`, `ci/integration-rapide` (mergée).

## 1. Ce que coûte la suite aujourd'hui (mesuré)

Run 44889439723 (PR #2955, 2026-11-21), job de 1031 s :

| Étape                                 | Durée |
| ------------------------------------- | ----: |
| checkout + pnpm + node + install      |  25 s |
| cache des images Docker (restaurer)   |   7 s |
| chargement des images (`docker load`) |  43 s |
| `supabase start`                      |  48 s |
| tests (`vitest run`)                  | 900 s |

Dans `supabase start` (horodatages du log) : démarrage de la base 21 s, schéma 5 s,
**628 migrations en 9 s**, attente des services 11 s.

Vitest : 584 fichiers, `tests 766 s` (somme des fichiers), `import 69 s`, durée 898 s.
Réglage `vitest.base.config.ts` : `pool: 'forks'`, `maxWorkers: 1` → **un fichier à la fois**.
Surcoût par fichier hors tests (processus + import) : (898 − 766) / 584 ≈ 0,23 s.

### Où passent les 766 s

| Groupe                                                                       | Fichiers | Temps |
| ---------------------------------------------------------------------------- | -------: | ----: |
| Tests qui rejouent une migration de données (lisent `supabase/migrations/…`) |      303 | 229 s |
| Temps réel (`realtime-*`)                                                    |        4 | 148 s |
| Tout le reste                                                                |      277 | 389 s |

Répartition : 454 fichiers sous 1 s, 79 entre 1 et 2 s, 32 entre 2 et 5 s, 19 au-delà.
Les 10 plus lents font 211 s : `realtime-trade-prive` 82 s, `realtime-chat-prive` 46 s,
`vip-card-enabled-filtering` 14 s, `realtime-chat-client-prive` 12 s,
`competence-referentiel` 10 s, `database/vip-card-filters` 10 s, `vip-card-rarity-distribution`
10 s, `curriculum-coverage` 9 s, `traces-lieu-durees-reponses` 8 s, `nettoyage-facettes` 8 s.

Temps réel : attentes fixes. Chaque refus = abonnement refusé + attentes de 2,5 s (« le message
n'arrive pas ») ≈ 7,5 s ; « topic mal formé » = 3 abonnements en série qui attendent chacun le
délai du client (10 s) → 30 s et 20 s.

Fichier type de migration de données (~0,7 s) : 4 `cleanupAllTestData()` (≈ 30 DELETE par
REST + SQL direct) et 2 créations de compte auth, pour ~10 tests instantanés.

## 2. Pourquoi 3 min en local et 15 min en CI ? (mesuré)

Ce n'est pas un écart local / CI : **la suite a été multipliée par 4,4 en sept semaines.**

| Nuit       | Fichiers | Durée vitest |
| ---------- | -------: | -----------: |
| 2026-10-01 |      132 |        282 s |
| 2026-10-16 |      237 |        444 s |
| 2026-10-31 |      360 |        723 s |
| 2026-11-15 |      493 |        729 s |
| 2026-11-20 |      581 |        986 s |

Les « 180 s en local » datent du 2026-09-29 : 121 fichiers (1,5 s / fichier). La CI du
2026-10-01 : 132 fichiers en 282 s (2,1 s / fichier). La CI est ~1,4 fois plus lente par fichier
(runner public 4 vCPU contre Mac mini ; la suite est en série, les cœurs ne servent pas).
La croissance vient surtout des 303 tests de migration de données (278 `questions-*`, ajoutés
lot par lot depuis le 2026-11-04).

## 3. Les pistes

### 3.1 Paralléliser DANS une stack : bloqué

`cleanupAllTestData()` (appelé par 524 fichiers) supprime TOUTES les classes et tous les comptes
`@test.com` ; le trigger mono-professeur n'admet qu'un prof en base ; le global-setup supprime
tous les profs. Deux fichiers en parallèle se détruiraient l'un l'autre. Le lever = réécrire
l'isolation de toute la suite. Non recommandé.

### 3.2 Découper en jobs (une stack par job) — simulé sur les durées mesurées

Coût fixe par job ≈ 125 s (mesuré). Simulation sur les 584 durées réelles :

| Morceaux | Par durée (glouton) | Par nombre de fichiers (`--shard`) | Minutes-runner |
| -------: | ------------------: | ---------------------------------: | -------------: |
|        1 |            17,1 min |                           17,1 min |             17 |
|        2 |             9,6 min |                           10,1 min |             19 |
|        3 |             7,1 min |                            8,4 min |             21 |
|        4 |             5,8 min |                            6,5 min |             23 |
|        6 |             4,6 min |                            5,6 min |             28 |

Dépôt public : minutes gratuites, mais 20 jobs simultanés au plus pour tout le compte.

### 3.3 Démarrage de la stack : presque rien à gagner (mesuré)

Les migrations ne prennent que 9 s : un instantané de la base migrée ne gagnerait pas plus.
Les services inutiles sont déjà exclus (`-x` de 7 services) ; ceux qui restent servent
(realtime, storage, auth, rest, kong). Le `docker load` (43 s) pourrait tourner pendant
l'install : ~10 s par job, estimé.

### 3.4 Écart local : suite locale cassée par une donnée de dev (mesuré)

`pnpm test:integration` local échoue au global-setup (`23503`) : 2 liens de partage du cahier de
texte créés le 2026-11-20 par le prof de dev (`class_journal_share_tokens.created_by`, clé sans
`ON DELETE`) empêchent la suppression des profs. La CI ne le voit jamais (base neuve). Correctif
possible dans le global-setup (purger ces liens avant les profs). Essai local à refaire après.

### 3.5 Ne lancer que les tests touchés (mesuré sur les PR mergées)

Fermeture des imports PAR fichier de test (esbuild, comme `check:integration-paths`), appliquée
aux 37 dernières PR qui ont lancé la suite :

- PR qui ne touchent que `src/` : **0 à 20 fichiers, 0 à 42 s de tests** au lieu de 900 s
  (#2955 : 5 fichiers ; #2949, #2936, #2898 : aucun — le filtre par dossier les attrapait
  sans qu'aucun test n'atteigne le fichier modifié).
- PR qui touchent `supabase/`, `tests/helpers`, `package.json`, un workflow… : suite complète
  (normal pour une migration de schéma ; 3 PR ne touchaient que des scripts de `package.json`).
- Angle mort : les fichiers LUS à l'exécution (fixtures, `scripts/`) ; règle sûre : tout
  changement hors `src/` → suite complète. Filet : la nocturne complète.

### 3.6 Ne pas refaire un passage déjà vert (mesuré)

Le filtre `paths` d'une PR porte sur TOUT son diff : une fois la PR dans le filtre, chaque push
relance la suite. Sur 37 pushes de correction : **20 ne touchaient aucun fichier du filtre**
(54 %), et ont relancé 16 à 20 min pour un résultat identique. Clé de cache = empreinte des
fichiers atteints (fermeture + `supabase/**` + `tests/**` + lockfile + workflow) sur le commit de
merge (si `main` bouge, l'empreinte change) ; succès enregistré → push suivant ~1 min.

## 4. Tableau de décision

| Piste                                        | Gain                                                   | Risque              | Effort              |
| -------------------------------------------- | ------------------------------------------------------ | ------------------- | ------------------- |
| A. 4 morceaux (`--shard`)                    | complet 17 → ~6,5 min (simulé)                         | faible              | petit               |
| B. Passage déjà vert (empreinte)             | 54 % des re-pushes : 17 → ~1 min (mesuré sur 37)       | faible              | petit               |
| C. Tests touchés (PR `src/` seul)            | 17 → ~2,5 min sur ces PR (mesuré sur les PR mergées)   | moyen               | moyen               |
| D. Morceaux par durée (au lieu de `--shard`) | 6,5 → 5,8 min (simulé)                                 | faible              | petit               |
| E. Attentes du temps réel en parallèle       | ~−80 s de somme, peu sur un job découpé (estimé)       | moyen (instabilité) | petit               |
| F. Tests de migration hors PR (§ 5)          | ~5 min de la suite complète (mesuré : 229 s + surcoût) | décision de David   | petit               |
| G. Instantané de la base migrée              | ≤ 9 s (mesuré)                                         | —                   | moyen → **non**     |
| H. Parallèle dans une stack                  | —                                                      | élevé               | très gros → **non** |

**Recommandation** : A, puis B, puis C ; D et E seulement si le plus long morceau dépasse ;
correctif du global-setup (§ 3.4) en petite PR à part. Chaque PR : durée avant / après sur un
vrai run, ligne au tableau de `docs/pratiques/environnement-de-dev.md`. Nocturne complète et
`check:integration-paths` inchangés.

## 5. Question ouverte

Les 303 tests qui rejouent une migration de données (rangement, tags, contenu de modèles) servent
avant le `db:migrate`. Une fois la migration passée en prod, le fichier SQL ne change plus :
faut-il encore les rejouer sur chaque PR, ou seulement la nuit (et sur la PR qui les ajoute) ?

## 6. Historique

- **#2956 (A)** : job `portee` + matrice de 4 morceaux `vitest --shard`. Run 44891964659 :
  bout en bout 7,5 min (avant 17,5) ; tests par morceau 222 / 271 / 212 / 318 s ; coût fixe
  ~1 min 50 par morceau. Réponse de David sur les tests de migration : go pour les sortir des
  PR (ils ne prouvent quelque chose qu'avant le `db:migrate`).
