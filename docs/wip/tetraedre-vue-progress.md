# Chantier « tetraedre-vue » — vue lisible du tétraèdre (` ```solide ` `pyramide triangle`)

> Origine : ligne 15 de [`outils-manquants.md`](outils-manquants.md) (TSPE-334 sur un tétraèdre), relevée au lot 3
> de [`solide-vecteur`](../archive/wip/solide-vecteur-progress.md). Phase 0 validée par David le 2026-11-05
> (« je te suis »).

## Reprendre ici

_Mis à jour le 2026-11-05, B3 en PR._

- **État** : B3 écrite — variation v4 (tétraèdre SABC, u = SA, v = SB, w = SC, I milieu BC, J milieu AB, G centre
  ABC, 5 cas) ajoutée au script de TSPE-334 ; le script garde l'`id` et n'écrit plus le quadruplet. PR à merger.
- **Prochaine action** : merger la PR B3 ; puis plus rien de mon côté (chantier clos au merge : journal à archiver).
- **En attente de David** : `pnpm deploy:prod` (livre #2392 et #2400), puis `create-questions --dir
scripts/questions/tspe-334-tracer --publier --mettre-a-jour`, relecture de TSPE-334 et publication
  (ligne de `verifications-manuelles.md`).
- **Pièges en cours** : un milieu de [SA], [SB] ou [SC] tombe sur le nom de u, v ou w → aucun dans v4.
- **Worktree / branche** : `../ubumaths-wt-tetraedre-vue` · `content/tspe-334-tetraedre`.

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

## B3 — variation tétraèdre de TSPE-334 (2026-11-05)

- Script `docs/wip/questions/lot-tspe-334-tracer.py` : v4 `pyramide triangle 4 3.27` (tétraèdre régulier,
  hauteur ≤ côté), `points: I milieu BC, J milieu AB, G centre ABC`, `vecteurs: u = SA, v = SB, w = SC`, origine
  imposée. Cas : ½v + ½w depuis S (I) ; ⅓(u + v + w) depuis S (G) ; ½v + ½w − u depuis A (I) ; −u + v depuis A
  (B) ; ½u + ½v − w depuis C (J). Extrémités et règles (milieu, centre de gravité) vérifiées par assertion.
- Corrigé : u, v, w rappelés ; règle du milieu (SI = ½SB + ½SC) ou du centre de gravité (GA + GB + GC = 0) ;
  Chasles depuis l'origine imposée.
- J d'abord milieu de [SA] : collé au nom « u » (écrit au milieu de la flèche) sur la page à cocher → milieu de
  [AB], dégagé de G et de I.
- Le script réécrivait le quadruplet (`theme`, `domain`, `subdomain`) et perdait l'`id` (format changé par
  `ed0cd5caf`) : corrigé, le fichier sort avec l'`id` du brouillon, sans quadruplet.
- `create-questions` simulation (prod) : 38 specs vertes (10 nouvelles : justes, leurres I / G, sens inversé) ;
  une spec cassée exprès → « 1 spec(s) rouge(s) sur 38 ». Fichier de `main` = brouillon en prod (pas de
  « contenu différent ») : `--mettre-a-jour` n'ajoute que v4 et la description.
- Base locale, aperçu admin (Chrome, port 5176) : flèches u, v, w dessinées ; G juste (« Juste », corrigé lu) ;
  I sur ⅓(u + v + w) → « Faux », « Ta flèche représente SI, pas … », flèche juste en vert.
