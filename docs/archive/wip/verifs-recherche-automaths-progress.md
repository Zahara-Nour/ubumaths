# Chantier `verifs-recherche-automaths` : vérifications de la recherche Automaths remises à jour

## Reprendre ici

_Mis à jour le 2026-11-27, après #3215 : chantier clos, journal archivé._

- **État** : clos. #3215 mergée le 2026-11-27 : trois tests de `e2e/verifs/automaths-paquet8.spec.ts` (#2847 : « double distributivité », « aire », 4e + « pythagore ») réécrits sur la règle de recherche du 2026-11-26 (`src/lib/questions/catalogue-search.ts`), accord de David du 2026-11-27. Aucun code d'appli changé.
- **Prochaine action** : aucune. À la nuit suivante, ces trois tests doivent être verts.
- **En attente de David** : rien.
- **Pièges** : le recomptage du test est écrit exprès à part de `searchCatalogue` (seul `plainMarkdownText` vient de l'appli) : si la règle de recherche change encore, ces trois tests sont à reprendre.
- **Worktree / branche** : aucun.

## Ce qui a été vu

- Page de la base locale, serveur de dev du worktree : la page et le recomptage donnent les mêmes nombres (« aire » : 62 bons résultats ; 4e + « pythagore » : 4 ; « double distributivité » : aucun bon résultat, 4 dans « Aussi dans les corrigés et le programme »).
- `pnpm test:verifs e2e/verifs/automaths-paquet8.spec.ts` : 19/19 sous Chrome ; les tests #2847 : 32/32 sous Safari, Firefox, iPhone, Android.
- Les autres rouges nouveaux de la nuit du 2026-11-27 ne sont pas regardés ici.
