# Chantier « tetraedre-vue » — vue lisible du tétraèdre (` ```solide ` `pyramide triangle`)

> Origine : ligne 15 de [`outils-manquants.md`](outils-manquants.md) (TSPE-334 sur un tétraèdre), relevée au lot 3
> de [`solide-vecteur`](../archive/wip/solide-vecteur-progress.md). Phase 0 validée par David le 2026-11-05
> (« je te suis »).

## Reprendre ici

_Mis à jour le 2026-11-05, après #2400._

- **État** : #2400 mergée (vue du tétraèdre + cote du côté sur [BC]), pas encore en prod ; ligne 15 de
  `outils-manquants.md` passée dans « Livré » ; cote de la hauteur notée en nouvelle ligne (hors périmètre).
- **Prochaine action** : B3 — variation tétraèdre de TSPE-334 (`7ce9936b-…`, encore brouillon), **après le
  `deploy:prod`** qui livre #2392 et #2400 ; nouvelle branche depuis `origin/main` (`content/tspe-334-tetraedre`).
  Hauteur ≤ côté (ex. `pyramide triangle 4 3.27`), sans `cotes:`.
- **En attente de David** : `pnpm deploy:prod` (sur sa demande), puis relecture de TSPE-334.
- **Pièges en cours** : tétraèdre plus haut que large → G et milieu de AC à ~0,3 cm.
- **Worktree / branche** : aucun (supprimés après #2400).

---

## Phase 0 (2026-11-05, validée)

- B1 : base tournée de 60° (arête du fond horizontale, comme dans les manuels), pas 64° (écart max).
- B2 : de gauche à droite A, B (devant), C — validé par David sur l'aperçu (2026-11-05) : vue des manuels, ordre de lecture, tour ABC direct vu du dessus comme ABCD du cube.
- B3 : variation tétraèdre de TSPE-334 dans une PR à part, après `deploy:prod`.
- Prod (MCP, 2026-11-05) : aucun modèle n'utilise `pyramide triangle`.

## Mesures (scène à l'échelle, 4 cm)

| Écart minimal (cm)                       | avant       | après                   |
| ---------------------------------------- | ----------- | ----------------------- |
| sommet – arête qui ne passe pas par lui  | 0,03 à 0,29 | ≥ 0,5 (hauteur ≤ côté)  |
| G, milieux, sommets deux à deux          | 0,13 à 0,36 | ≥ 0,45 (hauteur ≤ côté) |
| idem, plus haut que large (`4 6`, `3 5`) | 0,13 à 0,29 | ≥ 0,3                   |

Balayage des angles (script de session) : 55-60° est le meilleur ; au-delà, l'écart retombe.

## Revue de #2400 (2026-11-05, `code-reviewer` Opus)

- **Important, corrigé** : la cote du côté restait au milieu de [AB], « dessous » ; [AB] étant devenue raide, le trait
  traversait « 4 cm ». Cote sur [BC], `bas-droite` (comme la fuyante du pavé). Test : boîte de la cote (`labelBox`,
  exportée) sans aucun trait, 8 dimensions ; rouge sans le correctif.
- **Hors périmètre, noté** : la cote de la hauteur, au milieu du solide, touche une arête (SC) pour 5 dimensions sur 8 ;
  sur `main` elle en touchait 2 à 4 pour toutes. Aucune position autour de la hauteur (gauche / droite, 0,35 à 0,65)
  ne la dégage : il faudrait la sortir du solide (ligne de rappel). Ligne à ajouter dans `outils-manquants.md`.
- Vérifié par la revue, sans problème : arêtes cachées (`facesEye` par le centre de gravité), `places`, sections
  (pas de pyramide), patrons (même sens de ABC), gestes (indices), PDF (consomme la scène).
