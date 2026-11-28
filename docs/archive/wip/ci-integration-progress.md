# Chantier `ci-integration` — tests d'intégration de la CI plus courts

## Reprendre ici

_Mis à jour le 2026-11-21 : chantier clos, journal archivé._

- **État** : clos. A (#2956), F (#2957), B (#2959), C (#2961) mergées ; C mesurée sur #2964
  (§ 10). D écarté par David : il ne rapporterait qu'environ 1 min, et seulement sur les PR en
  suite complète. Règles durables versées dans `docs/pratiques/tests.md` § 3.
- **Correctif de clôture** : le global-setup efface les liens de partage créés par les profs
  avant de les supprimer (§ 3.4 : 23503, rouge puis vert en local).
- **Base locale remise d'accord le 2026-11-21 (après #2965)** : `supabase/.temp/postgres-version`
  imposait l'image 17.6.1.127, qui ne reconstruit plus la base (migration du chat du 2026-10-04, 42501) ; renommé `.bak` (accord de David), stack sur 17.11.0.004 comme la CI. Suite locale
  complète : **584/584 fichiers verts en 12 min 49**.
- **Reste ouvert** : `supabase migration up --local` bute sur une migration de rangement déjà
  jouée (journal `navadra`, 2026-11-18) ; la base locale reprendra du retard. Chantier à part si
  David le veut.
- **Worktree / branche** : aucun (supprimés après le merge de #2965).

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

## 7. F — tests de migration de données hors des PR (validé le 2026-11-21)

Tri des 303 fichiers qui citent une migration (SQL de la migration lu, commentaires et tables
temporaires écartés) :

- **297 tests de migration de données** (copie de la prod, rejeu du fichier, rollback) : leurs
  migrations ne font que ranger, taguer, corriger du contenu → **hors PR**.
- **Restent sur les PR** : `tags-modeles-points` (trigger `security definer`),
  `suppression-ancien-programme` (triggers, fonctions), `automaths-arbre-fin-ancienne-forme`
  (colonnes, vue), `chapter-documents-size-limit` (contrainte, bucket) ;
  `database/assignment-triggers` et `database/template-triggers` (schéma actuel, vieille
  migration citée en commentaire) ; `migrations-contenu-publie` (teste aussi le générateur).

Comportements validés :

1. PR en suite complète : tout sauf les tests marqués `@migration-de-donnees` ; un test marqué
   que la PR ajoute ou modifie tourne, de même qu'un test dont la PR modifie la migration.
2. PR qui touche une migration ni rangement ni contenu, un autre fichier de `supabase/`
   (revue de #2957 : ces tests rejouent sous le schéma courant, triggers de garde compris),
   les fixtures, le global-setup, les configs vitest ou le lockfile : tout. De même l'outillage commun (`tests/helpers/database/migration-rollback.ts`,
   `lot-2bis-migration.ts`, `later-migrations.ts`, `postgres-client.ts`) : tout.
3. PR ciblée (lot + migration + test) : inchangée.
4. Nocturne, lancement à la main : tout. Dans le doute : le test tourne.

Mécanisme : mention `@migration-de-donnees` dans l'en-tête (posée par script, puis par copie
du gabarit dans les skills `couvrir-niveau` / `idees-rubrique`) ; garde : aucun fichier marqué
ne cite une migration qui touche le schéma ou les règles d'accès. 4 morceaux gardés.
Gain estimé : ~5 min de somme, ~7,5 → ~6,3 min de bout en bout.

## 8. B — passage déjà vert non relancé (validé le 2026-11-21)

Comportements validés :

1. Push qui ne touche aucun fichier suivi, après un passage vert : morceaux verts sans relancer les
   tests, message qui renvoie au run d'origine.
2. Push qui touche un fichier suivi : l'empreinte change, la suite tourne.
3. `main` a avancé sur un fichier suivi : l'empreinte change (prise sur le commit de merge).
4. Passage rouge ou annulé : rien n'est gardé.
5. Nuit et lancement à la main : toujours tout, la trace n'est ni lue ni écrite.
6. Dans le doute, la suite tourne (empreinte vide).
7. Les checks gardent leur nom et finissent en ✅, jamais « skipped ».

Mécanisme : `scripts/ci-integration-empreinte.sh` (job `portee`) = hash des fichiers du filtre
`paths` lus sur HEAD (index jetable, motifs en `:(glob)` de git ; le test compare la sélection à
`githubPathPattern` sur le vrai dépôt) + `FICHIERS`, `EXCLURE`, `TOTAL`. `actions/cache/restore`
sur `integration-vert-v1-<empreinte>` ; job `memoriser` (needs : filtre, portée, morceaux) qui
l'enregistre, étapes conditionnées plutôt que le job (sinon « skipped »). Les étapes des morceaux
sont conditionnées de même. « Re-run all jobs » d'un passage déjà vert le saute aussi : pour
forcer, lancement à la main.

## 9. C — tests touchés sur une PR de code (validé le 2026-11-21)

Comportements validés :

1. PR qui ne modifie que `src/` (plus doc, `.md`) : seuls tournent les tests dont les imports
   atteignent un fichier modifié (fermeture PAR test, comme `check:integration-paths`).
2. Fichiers chargés en lot (`import.meta.glob` : articles du Shtam, transcriptions du BO, bornes
   des points — sous `docs/` !) : atteints par les tests qui atteignent leur chargeur.
3. Aucun test atteint : checks ✅ sans démarrer la stack, message « aucun test n'atteint les
   fichiers modifiés » (affichage de B).
4. Code + tests d'intégration ajoutés ou modifiés : tests atteints + ces tests (outillage commun →
   cas 6).
5. Tests `@migration-de-donnees` atteints par le code : laissés de côté (sauf touchés, règle de F).
6. Tout fichier hors `src/`, doc et tests d'intégration → suite complète.
7. Fichier atteint par le global-setup, ou `src/env.ts` → suite complète.
8. Fichier de `src/` supprimé ou renommé → suite complète.
9. Nuit et lancement à la main : tout.
10. Dans le doute (calcul en échec, chargement en lot illisible) : suite complète.
11. ≤ 40 tests sélectionnés : 1 stack ; au-delà, 4 morceaux de la sélection.
12. B inchangé : la sélection entre dans l'empreinte.
13. PR ciblée « migration de rangement + son test » inchangée.

## 10. Mesure de C (2026-11-21, #2964, run 44915248933)

PR `src/` + `docs/` qui touche `src/lib/server/evaluation-question-errors.ts` et
`src/lib/questions/error-kinds.ts` (dans le filtre `paths`). #2963 (composants seuls) ne lançait
pas le workflow : il fallait une PR dans le filtre.

- Tests retenus : 2 (`bilan-controle`, `durees-trop-courtes`) → 1 morceau.
- De bout en bout : 14:41:40 → 14:44:43 = **3 min 03**.
- Job `portee` : 30 s (install 5 s, étape « Tests touchés » 3 s).
- Morceau 1/1 : 2 min 18 = checkout et install 23 s, chargement des images Supabase 43 s,
  démarrage de Supabase avec les migrations 49 s, **tests 10 s**.
- Comparaison, suite complète en 4 morceaux le même jour : #2961 (run 44907250598) 6 min 51,
  #2962 (run 44907952216) 6 min 00 ; morceaux de 3 min 40 à 5 min 42.

Lecture : sur une PR en sélection, le temps est dans le démarrage de Supabase (1 min 32 sur
2 min 18), pas dans les tests. D ne concerne que les PR en suite complète.

## 6. Historique

- **#2956 (A)** : job `portee` + matrice de 4 morceaux `vitest --shard`. Run 44891964659 :
  bout en bout 7,5 min (avant 17,5) ; tests par morceau 222 / 271 / 212 / 318 s ; coût fixe
  ~1 min 50 par morceau. Réponse de David sur les tests de migration : go pour les sortir des
  PR (ils ne prouvent quelque chose qu'avant le `db:migrate`).
- **#2957 (F)** : mention `@migration-de-donnees` sur 297 tests, `scripts/ci-integration-exclusions.sh`
  (job `portee`, `--exclude` avant `--shard`), garde `pnpm check:migrations-de-donnees` (job
  `paths-filter`). Revue : classeur SQL par instruction (chaînes, corps `$$`, triggers de garde) ;
  toute migration ni rangement ni contenu, `supabase/`, fixtures, global-setup, configs vitest,
  lockfile → tous les tests. Run 44898120634 : suite complète (la PR touche la règle), 4 × 146
  fichiers verts, 6,1 à 6,7 min par morceau. Gain non mesuré encore.
- **Mesure de F** (run 44900263857, PR #2959, base avec #2957) : 297 laissés de côté, 4 × 72
  fichiers, tests 127 / 195 / 110 / 200 s, bout en bout **5,9 min** (avant 7,5 ; estimé 6,3).
- **#2959 (B)** : `scripts/ci-integration-empreinte.sh`, job `memoriser`. Revue : `**` collé à
  un nom et espace après le guillemet refusés. Premier passage : empreinte gardée (run 44900263857).
  Push de doc suivant : empreinte retrouvée, 4 morceaux ✅ en 2 à 5 s, run de bout en bout **40 s**.
- **#2961 (C)** : `scripts/ci-integration-touches.ts` (fermeture PAR test, `integrationClosures`
  par parcours du graphe esbuild), `scripts/lib/chargements-en-lot.ts` (`import.meta.glob`, `.md`
  et `.json` seulement ; la garde `check:integration-paths` vérifie aussi ces fichiers : 1625 →
  1696 atteints). Revue : `.md` hors `docs/` et racine → suite complète. Run de la PR : suite
  complète (workflow touché), 4 morceaux de 4 min 17 à 5 min 42 ; push suivant hors filtre :
  passage déjà vert (B), morceaux en 3 à 5 s.
