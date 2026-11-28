---
title: Lot d'écarts « cache »
date: 2026-11-28
status: en cours
---

# Lot d'écarts `cache`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR 1._

- **État** : PR 1 (branche `fix/ecarts-cache`) corrige M28, M29, M30, L44, L45, L47, L48, L54.
- **Prochaine action** : revue, PR, merge ; puis L43 (PR 2) selon la réponse de David.
- **En attente de David** : la question de phase 0 de L43 (ci-dessous).
- **Pièges en cours** : `schedule-write-verdict.test.ts` échoue parfois quand il tourne avec tout
  `dashboard/teacher` (passe seul, 4/4) : sans lien avec le lot.
- **Worktree / branche** : `../ubumaths-wt-ecarts-cache` · `fix/ecarts-cache`.

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

## L43 : question de phase 0 (en attente de David)

L'heure n'est pas réactive : un écran qui affiche les gidouilles garde la valeur après ses
10 minutes de vie, puis la perd d'un coup au prochain recalcul. Les pages boutique, marché,
historique lisent le cache **sans jamais le relire**. Si on rend seulement l'expiration réactive,
ces pages afficheraient 0 gidouille au bout de 10 minutes : pire qu'avant.

Ma proposition : à l'échéance, le cache se relit tout seul (récompenses, avertissements lus) et
l'écran garde l'ancienne valeur jusqu'à l'arrivée de la nouvelle. Coût : un onglet élève ouvert
fait une lecture toutes les 10 minutes.
