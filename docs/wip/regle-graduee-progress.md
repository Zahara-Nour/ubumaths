# Chantier « regle-graduee » — règle graduée (cm, mm) dans la case « figure »

> Ligne n° 18 de [outils-manquants.md](outils-manquants.md) (« à décider avec David : la taille réelle à l'écran est
> le nœud »). Débouchés : CE2-039 (tracer un segment de 6 cm, 5 cm 3 mm, 72 mm), CE2-070 coté (rectangle 7 cm × 3 cm,
> carré de 6 cm, cercle de rayon 4 cm, triangle rectangle 10 cm et 4 cm), peut-être CP-035 et CE1-044 (mesurer un
> segment à la règle graduée). Ouvert le 2026-11-08 depuis la session `questions-ce2`, à la demande de David.
> Vérifié le 2026-11-08 : aucune règle graduée dans `src/lib/ubumark` ni `src/lib/questions` (seul le rapporteur
> existe, `constructions-v2/instruments/components/Protractor.svelte`).

## Reprendre ici

_Mis à jour le 2026-11-08, phase 0 validée._

- **État** : phase 0 tranchée (§ 1) ; pas de code.
- **Prochaine action** : ADR « cm de la figure » (skill `domain-modeling`), puis comportements détaillés du
  tracé d'un segment (039) et tests rouges ; après le n° 19 de `cercle-triangle-rectangle` (mêmes fichiers).
- **En attente de David** : rien.
- **Pièges en cours** : correction des réponses → tests d'abord, revue `code-reviewer` en `model: opus` ; le chantier
  `cercle-triangle-rectangle` (n° 19, 20) touche les mêmes fichiers de `src/lib/questions/construction/`.
- **Worktree / branche** : `../ubumaths-wt-regle-graduee`, `feat/regle-graduee`.

## 1. Phase 0 — le nœud et les questions (tranchée le 2026-11-08)

**Question d'accès** : aucune — code de la case « figure », ni table, ni policy, ni route.

**Le nœud** : on ne connaît pas la taille réelle d'un pixel (écran, zoom du navigateur, tablette ou téléphone) ; un
« vrai » centimètre à l'écran ne se garantit pas.

### Questions à David

- **Q1** — Quel centimètre ?
  - **A (reco)** : le cm **de la figure** : 1 unité de la figure = 1 cm ; la règle est dessinée et graduée à l'échelle
    de la figure, comme sur une photocopie réduite. Règle et figure restent d'accord sur tout écran.
  - B : vraie taille, après un étalonnage (l'élève pose une carte au format bancaire sur l'écran). Lourd, fragile.
- **Q2** — Précision au mm sur téléphone : à 320 px de large, une figure de 12 cm donne ~2,5 px par mm, trop fin pour
  le doigt. Reco : l'élève **pose la règle** (comme le rapporteur), puis le bout du segment **s'aimante à la
  graduation du mm** la plus proche ; plus une loupe à la pose. Juste = longueur exacte au mm près.
- **Q3** — Périmètre du chantier : (a) tracer un segment de longueur donnée (039) ; (b) mesurer un segment et écrire
  sa longueur (CP-035, CE1-044 : y a-t-il déjà des modèles par image ?) ; (c) constructions cotées (070 : carré,
  rectangle, triangle rectangle cotés ; cercle de rayon donné, compas ouvert sur la règle). Reco : (a) puis (c) ;
  (b) seulement si les modèles actuels en manquent.
- **Q4** — Supports : papier uni seulement (sur quadrillage, le carreau fait déjà l'unité) ? Reco : oui.

**Décisions de David (« je suis tes recos », 2026-11-08)** : Q1 cm de la figure (1 unité = 1 cm, règle à l'échelle
de la figure, pas d'étalonnage) ; Q2 règle posée comme le rapporteur, bout du segment aimanté au mm, loupe ; Q3 (a)
tracer un segment (039) puis (c) constructions cotées (070), (b) mesurer après relevé des modèles existants ; Q4
papier uni seulement.
