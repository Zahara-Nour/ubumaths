---
title: Lot d'écarts « cache »
date: 2026-11-28
status: en cours
---

# Lot d'écarts `cache`

## Reprendre ici

_Mis à jour le 2026-11-28, PR 2 (L43) prête._

- **État** : PR 1 #3277 (8 écarts) : CI verte, merge en attente de la fin d'un `deploy:prod` (tâche
  de fond `pr:merger`). PR 2 (L43), branche `fix/ecarts-cache-l43` partie de `fix/ecarts-cache`.
- **Prochaine action** : merger #3277, puis mettre `fix/ecarts-cache-l43` à jour sur `main`
  (`git merge origin/main`), revue, PR 2 ; puis barrer les 9 lignes au registre et clore le lot.
- **En attente de David** : rien (L43 : option 1 suivie le 2026-11-28).
- **Pièges en cours** : `schedule-write-verdict.test.ts` instable en lot (passe seul).
- **Worktrees / branches** : `../ubumaths-wt-ecarts-cache` (`fix/ecarts-cache`),
  `../ubumaths-wt-ecarts-cache-l43` (`fix/ecarts-cache-l43`).

## Lot

L43, L44, L45, L47, L48, L54, M28, M29, M30 (pris le 2026-11-28, `docs/wip/ecarts-lots.md`).

## PR 1 : ce qui est fait

- **M28** (code mort) : `teacherCache.getClassInfo` / `getSchoolInfo` et leurs `fetch*` qui levaient
  toujours, retirés avec leurs tests.
- **L48** : le cache d'école (rempli avec un mauvais identifiant, jamais lu) est retiré en entier :
  `schoolCache`, `hydrateSchoolInfo`, `invalidateSchool`, types `SchoolInfo` / `CachedSchool`, appel
  de `teacher/classes/+page.svelte`. Aucun lecteur, donc rien à « réparer ».
- **M29** : `depends('teacher:classes')` sans `invalidate` correspondant, retiré.
- **M30** : cache de profil élève (`getProfile`, `getProfileSync`, `hydrateProfile`,
  `invalidateProfile`, `fetchProfile`), route `GET /api/student/profile` (seul appelant :
  `fetchProfile`), lecture des classes de l'élève dans `student/+layout.server.ts` (ne servait qu'au
  profil), et fonctions sans appelant de `cache-sync.ts` (`syncWarnings`, `invalidate*`, `refetch*`).
- **L54** : la requête `recentExercises` de l'accueil (bloc en commentaire) est retirée.
- **L47** : `TeacherDashboard` appelle `reconcileSelectedClass` après une lecture réussie de
  `/api/teacher/classes`, et recopie la classe corrigée dans sa copie locale.
- **L44** : les mises à jour optimistes des récompenses font repartir l'échéance (`fetchedAt` à
  maintenant), élève et prof (chez le prof : l'entrée de toute la classe). Preuve devenue test
  ordinaire : `src/lib/stores/__tests__/cache-optimiste-echeance.test.ts`
  (`tests/ecarts/coquille.test.ts` supprimé, il ne portait que L44).
- **L45** : les deux layouts versent leurs données au cache dans un `$effect` (et plus `onMount`),
  seulement quand la donnée est neuve (comparaison par référence) : `data` change aussi quand un
  layout parent est relu, et réécrire l'ancienne lecture effacerait les mises à jour optimistes.
- Preuve L43 réécrite sur les récompenses (le profil n'existe plus), toujours `it.fails`.
- Revue (`code-reviewer`) : une lecture en échec au serveur ne verse plus de valeur de repli au
  cache (`rewards: null`, `buddy: undefined`) ; sinon chaque relecture du layout aurait affiché
  0 gidouille. Garde par référence testée (« même liste ») ; périodes du layout prof gardées de même.

## L43 : question de phase 0 (option 1 suivie par David le 2026-11-28)

L'heure n'est pas réactive : un écran qui affiche les gidouilles garde la valeur après ses
10 minutes de vie, puis la perd d'un coup au prochain recalcul. Les pages boutique, marché,
historique lisent le cache **sans jamais le relire**. Si on rend seulement l'expiration réactive,
ces pages afficheraient 0 gidouille au bout de 10 minutes : pire qu'avant.

Ma proposition : à l'échéance, le cache se relit tout seul (récompenses, avertissements lus) et
l'écran garde l'ancienne valeur jusqu'à l'arrivée de la nouvelle. Coût : un onglet élève ouvert
fait une lecture toutes les 10 minutes.

Trois options proposées le 2026-11-28 : (1) relecture à l'échéance, onglets visibles seulement ;
(2) plus d'expiration de l'affichage, sans relecture ; (3) expiration seule, écartée (0 gidouille
affiché). Recommandation de Claude : (1). Réponse de David : « je te suis ».

## PR 2 : L43

- `studentDashboardCache` : une minuterie par entrée lue (récompenses, avertissements d'une
  période), réarmée à chaque écriture ; à l'échéance, relecture si l'onglet est visible, sinon au
  retour sur l'onglet (`visibilitychange`). `getRewardsSync` / `getWarningsSync` rendent la dernière
  valeur connue. Échec de relecture : cache inchangé. Invalidation : minuterie annulée.
  `destroy()` pour les tests.
- Palotin non relu (pas de lecture d'API dans ce cache) : hors du constat de L43.
- Tests : `studentDashboardCache-relecture.svelte.test.ts` (7 cas, 3 rouges sans le correctif).
  L'ancienne preuve `it.fails` « écart L43 » est retirée de `ecarts-coquille.svelte.test.ts`.
