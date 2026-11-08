# Chantier « relier-points » — courbe de données (points reliés)

> Ligne n° 6 de [outils-manquants.md](outils-manquants.md). Débouchés : **CM2-125** (« Lire une donnée sur une
> courbe : quelle température à 14 h ? ») et **CM2-159** (« Interpréter les données d'une courbe : entre quelles
> heures la température augmente-t-elle ? ») ; aussi CM2-108 (problèmes sur une courbe). Ouvert le 2026-11-08 à la
> demande de David (« fait le 6 »).

## Reprendre ici

_Mis à jour le 2026-11-08, PR ouverte._

- **État** : clé `données:` codée (parseur, scène, écran, PDF, doc `ubumark.md`), PR ouverte (§ 2) ·
  **Prochaine action** : revue `code-reviewer` + CI, merge ; puis ligne n° 6 de `outils-manquants.md` en « Livré » ;
  les modèles CM2-125, 159 reviennent à la session `questions-cm2` · **En attente de David** : rien · **Pièges en cours** : rien encore · **Worktree / branche** :
  `../ubumaths-wt-relier-points`, `feat/relier-points`.

## 1. Phase 0 (validée par David le 2026-11-08)

**Question d'accès** : aucune — rendu d'un bloc ubumark, ni table, ni policy, ni route.

**Constat (code du 2026-11-08)** : aucun bloc ne dessine une ligne brisée de données. ` ```courbe ` trace des
fonctions (`f(x) = …`), des suites et des **points isolés** (`points:`) ; ` ```nuage ` des points et un ajustement
affine. ` ```courbe ` a déjà la fenêtre (`x:`, `y:`), la grille (`grille:`), les titres d'axes (`axes:`), les axes
ramenés au bord quand 0 est hors fenêtre (`courbe-scene.ts` l. 614), le PDF (`courbe-typst.ts`).

**Le BO ne demande pas à l'élève de relier** pour 125 et 159 : il **lit** une courbe toute faite. Le geste
« l'élève relie » relève de CM2-122 (« points éventuellement reliés »), déjà couvert par `placer:`.

### Comportements

Nominal :

- ` ```courbe ` avec `x: 6 ; 20`, `y: 0 ; 25`, `grille: 2 ; 5`, `axes: heure ; température (°C)` et
  `données: (6 ; 8) ; (8 ; 11) ; (10 ; 15) ; (12 ; 19) ; (14 ; 21) ; (16 ; 20) ; (18 ; 16) ; (20 ; 12)` :
  les points sont marqués et reliés par des segments, dans l'ordre des abscisses, à l'écran et au PDF.
- La question se pose à côté, dans une case ordinaire (« À 14 h, il fait ? °C ») : rien de neuf côté réponse.

Limite :

- Points donnés dans le désordre : triés par abscisse (une courbe de données va de gauche à droite).
- Point hors fenêtre : le segment est coupé au bord, comme une fonction.
- Au plus N points (proposé : 25), plusieurs séries refusées dans un premier temps (voir Q3).

Erreur (refus à la publication, message en français) :

- deux points de même abscisse ; moins de deux points ; coordonnée qui n'est pas un nombre ; `données:` avec
  `placer:` / `tracer:` (le geste et la courbe toute faite ne se mélangent pas, voir Q2).

### Questions

- **Q1 — hôte** : (a) **nouvelle clé `données:` de ` ```courbe `** (recommandé : grille, titres d'axes, PDF déjà
  là) ; (b) option `relier: oui` de ` ```nuage ` (bloc statistique, ni grille réglable ni titres d'axes).
- **Q2 — `placer:` à côté** : refuser pour l'instant (recommandé), ou permettre « place le point manquant de la
  courbe » ?
- **Q3 — plusieurs séries** (deux villes, deux couleurs, légende) : plus tard (recommandé, aucun point ne le
  demande au CM2), ou tout de suite ?
- **Q4 — correction** : rien de plus que la case (recommandé), ou des traits de lecture en pointillés vers les
  axes (`lecture: x = 14`) dans le corrigé ?

**Tranché (David, 2026-11-08)** : Q1 (a) clé `données:` de ` ```courbe ` ; Q2 `placer:` refusé pour l'instant ;
Q3 une seule série ; Q4 la case seulement.

## 2. PR 1 — clé `données:` (2026-11-08)

- Tests : `courbe-donnees.test.ts` (15, 13 rouges avant le code) ; `Courbe.svelte.test.ts` (rendu dans un document,
  rouge prouvé avec `Courbe.svelte` d'`origin/main`).
- Description accessible : les valeurs elles-mêmes (`Courbe de données de 8 points : (6 ; 8), …`), sinon la question
  ne se lit pas au lecteur d'écran.
- Couleur fixe `COURBE_DATA_COLOR` (bleu), une seule série (Q3).
- Revue `code-reviewer` (sonnet) : aucun bloquant ; corrigés : abscisses égales à l'arrondi près (`toPrecision(12)`),
  « Données : … » en prose hors d'un bloc non fermé (clé reconnue seulement suivie de `(`). Laissés : virgule
  décimale et séparatrice dans la description accessible, « é » décomposé (clé inconnue, diagnosticable).
