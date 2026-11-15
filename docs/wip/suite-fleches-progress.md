# Chantier `suite-fleches` — suite de flèches à produire (outils-manquants n° 9)

> Demande de David du 2026-11-15 (n° 9 de [`outils-manquants.md`](outils-manquants.md)). Point visé : CE1-080
> (« coder un déplacement », volet « produire »). Aujourd'hui, les modèles `08-le-robot-pivote` (e3bacfdc) et
> `09-le-long-code` (8cbd4fb3) du lot 10 de [`questions-ce1`](questions-ce1-progress.md) (§ 3 C 4, l. 807) font
> choisir le bon code parmi trois (QCM). Piste notée alors : glisser-déposer (`StructureField`), **pas Blockly** (le
> BO ne parle que d'un robot « si un robot est disponible », d'aucun logiciel).

## Reprendre ici

_Mis à jour le 2026-11-15, à l'ouverture du chantier._

- **État** : worktree ouvert, rien de codé · **Prochaine action** : lire le code (bloc du robot sur quadrillage de CP-067 `f7167af7` et des modèles e3bacfdc / 8cbd4fb3, `StructureField` et le glisser-déposer, la tortue du chantier `blockly` pour ne pas doublonner), puis écrire la **phase 0** (comportements nominal / limite / erreur, flèches absolues et codage relatif « avance / pivote ») et l'attendre validée · **En attente de David** : rien encore · **Pièges en cours** : code en dehors de `blockly` (chantier ouvert à côté, worktree `ubumaths-wt-blockly`) · **Worktree / branche** : `ubumaths-wt-suite-fleches` (`feat/suite-fleches`)

## Journal

- 2026-11-15 : worktree ouvert. À reporter dans la 1re PR : le commentaire d'en-tête de
  `src/lib/questions/construction/__tests__/construction-triangle-cm.test.ts` pointe encore vers
  `docs/wip/triangle-cote-cm-progress.md`, archivé le 2026-11-15 sous `docs/archive/wip/`.
