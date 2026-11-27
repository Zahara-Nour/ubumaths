# Chantier `verifs-recherche-automaths` : vérifications de la recherche Automaths remises à jour

## Reprendre ici

_Mis à jour le 2026-11-27, avant l'ouverture de la PR._

- **État** : une seule PR, branche `test/verifs-recherche-automaths`. Trois tests de `e2e/verifs/automaths-paquet8.spec.ts` (#2847 : « double distributivité », « aire », 4e + « pythagore ») recomptaient les résultats avec la recherche d'avant #3172 et étaient rouges à la nuit du 2026-11-27. Réécrits sur la règle du 2026-11-26 (`src/lib/questions/catalogue-search.ts`), accord de David du 2026-11-27. Aucun code d'appli changé.
- **Prochaine action** : merger quand la CI est verte, puis archiver ce journal.
- **En attente de David** : rien.
- **Pièges en cours** : le recomptage du test est écrit exprès à part de `searchCatalogue` (seul `plainMarkdownText` vient de l'appli) : si la règle de recherche change encore, ces trois tests sont à reprendre.
- **Worktree / branche** : `../ubumaths-wt-verifs-recherche-automaths`, `test/verifs-recherche-automaths`.

## Ce qui a été vu

- Page de la base locale, serveur de dev du worktree : la page et le recomptage donnent les mêmes nombres (« aire » : 62 bons résultats ; 4e + « pythagore » : 4 ; « double distributivité » : aucun bon résultat, 4 dans « Aussi dans les corrigés et le programme »).
- `pnpm test:verifs e2e/verifs/automaths-paquet8.spec.ts` : 19/19 sous Chrome ; les tests #2847 : 32/32 sous Safari, Firefox, iPhone, Android.
- Les autres rouges nouveaux de la nuit du 2026-11-27 ne sont pas regardés ici.
