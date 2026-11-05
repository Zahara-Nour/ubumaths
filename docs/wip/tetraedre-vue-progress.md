# Chantier « tetraedre-vue » — vue lisible du tétraèdre (` ```solide ` `pyramide triangle`)

> Origine : ligne 15 de [`outils-manquants.md`](outils-manquants.md) (TSPE-334 sur un tétraèdre), relevée au lot 3
> de [`solide-vecteur`](../archive/wip/solide-vecteur-progress.md). Phase 0 validée par David le 2026-11-05
> (« je te suis »).

## Reprendre ici

_Mis à jour le 2026-11-05, PR ouverte._

- **État** : correctif commité sur `fix/tetraedre-vue` (tests rouges sans, verts avec ; 315 tests espace verts).
- **Prochaine action** : CI verte → merge → ligne 15 de
  `outils-manquants.md` en « Livré » ; puis B3 (variation tétraèdre de TSPE-334), PR à part, après `deploy:prod`.
- **En attente de David** : rien (B2 validé sur aperçu).
- **Pièges en cours** : tétraèdre plus haut que large → G et milieu de AC à ~0,3 cm (limite de l'échelle à 4 cm,
  aucun angle ne la lève) ; préférer hauteur ≤ côté dans les modèles.
- **Worktree / branche** : `../ubumaths-wt-tetraedre-vue`, `fix/tetraedre-vue`.

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
