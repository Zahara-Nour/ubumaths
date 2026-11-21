# jsdom-sanitize-url — le markdown ne charge plus jsdom au rendu serveur

## Reprendre ici

_Mis à jour le 2026-11-21, à l'ouverture de la PR._

- **État** : PR ouverte (`sanitizeUrl` sorti dans `src/lib/utils/sanitize-url.ts`, test de garde `markdown-sans-dompurify.test.ts`) · **Prochaine action** : merger à CI verte, puis archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-jsdom-sanitize-url`, `perf/jsdom-sanitize-url`

## Constat (2026-11-21)

Suite du chantier `amelioration` (`docs/wip/amelioration-progress.md`, « Reste, hors PR » de la PR 2).

- Les composants de markdown n'utilisent que `sanitizeUrl` (une expression régulière), mais
  l'importaient de `sanitize.ts`, qui importe `isomorphic-dompurify`, donc jsdom côté serveur.
- Build locale du 2026-11-11 : 79 pages sur 338 chargeaient jsdom à leur rendu serveur (Atelier,
  Automaths et son test, exercice public, Shtam, glossaire, grapheur, cahier…).
- Coût mesuré sur le Mac mini : import 140 à 230 ms, 640 modules, ~70 Mo de mémoire, payé à chaque
  réveil de la fonction.

## Remède

- `sanitizeUrl` déplacée telle quelle dans `sanitize-url.ts` (aucun import) ; 6 composants de
  markdown et `sanitize-url.test.ts` pointent dessus.
- Test de garde vérifié rouge en remettant un import de `sanitize.ts` dans `ImageDisplay.svelte`.

## Reste à regarder (non traité)

Chargent encore jsdom au rendu serveur : `ReportErrorDialog` (`sanitizePlainText`, fiche de
l'élève), `CellOutputs` (`sanitizeHtml`, notebook), les deux pages de modèles de messages, la page
des notifications. Après le prochain `deploy:prod`, compter de nouveau les pages concernées sur une
build fraîche.
