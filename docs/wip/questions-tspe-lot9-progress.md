# Chantier « questions-tspe-lot9 » — terminale spécialité, espace sur figure (lot 9)

> Suite de [`questions-tspe`](../archive/wip/questions-tspe-progress.md) (journal d'index archivé : relevé § 1,
> classement § 3.3, Q5 au § 5, lot 9 au § 4). Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md)
> (skill `couvrir-niveau`). Bornes : `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points`. En base,
> le niveau est `T_SPE`. Rouvert le 2026-11-03 : le lot 9 attendait le chantier `solides`, clos le 2026-11-01 et en
> prod (release 0.66.0) — le versement l'avait dit à tort « en attente ».

## Reprendre ici

_Mis à jour le 2026-11-03, phase 0 validée (D-L9)._

- **État** : phase 0 du lot 9 **validée** (D-L9 : recos de Q1 à Q5). Aucun fichier, aucune branche.
- **Prochaine action** : worktree `git worktree add -b feat/questions-tspe-lot9 ../ubumaths-wt-questions-tspe-lot9
origin/main` ; script de lot `docs/wip/questions/lot-tspe-9-figure.py` (gabarit `lot-tspe-espace-6a.py`, réponses
  calculées depuis les coordonnées des sommets) → `scripts/questions/tspe-9-figure/` (8 fichiers, F1-F8) ; specs,
  tirages relus, essai en base locale, PR des fichiers seuls.
- **En attente de David** : rien.
- **Pièges en cours** : ceux du § 9 de `couvrir-un-niveau.md` (Rendu, suite ; tag sur le nœud ou sa notion) ;
  ` ```solide ` ne dessine ni flèche, ni diagonale, ni point hors sommet.
- **Worktree / branche** : aucun (à créer).

---

## Relevé (prod, MCP, 2026-11-03)

Aucun des 9 points n'a de tag. Nœuds (branche « Géométrie », notion « Espace ») :

| Point | Libellé                                                                     | Nœud                                 |
| ----- | --------------------------------------------------------------------------- | ------------------------------------ |
| 334   | Représenter des combinaisons linéaires de vecteurs donnés                   | vecteurs de l'espace                 |
| 335   | Exploiter une figure pour exprimer un vecteur comme combinaison linéaire    | coplanarité et décomposition         |
| 337   | Lire sur une figure si deux vecteurs d'un plan forment une base             | coplanarité et décomposition         |
| 338   | Lire sur une figure la décomposition d'un vecteur dans une base             | coplanarité et décomposition         |
| 553   | Lire sur une figure si trois vecteurs de l'espace forment une base          | coplanarité et décomposition         |
| 336   | Décrire la position relative de deux droites                                | positions relatives et intersections |
| 551   | Décrire la position relative d'une droite et d'un plan                      | positions relatives et intersections |
| 552   | Décrire la position relative de deux plans                                  | positions relatives et intersections |
| 339   | Configurations simples (alignement, colinéarité, parallélisme, coplanarité) | Espace (notion)                      |

Catégorie voisine : « Géométrie › Vecteurs, droites et plans de l'espace », 9 modèles `T_SPE` publiés, **aucun avec
` ```solide `** ; sous-domaines pris : À savoir (1, 2), Colinéarité et alignement (1), Colinéarité et coplanarité
(2, 3), Coordonnées dans l'espace (1), Coplanarité, décomposition (2, 3), Translations (1). 68b13d33 « trois
vecteurs forment-ils une base ? » (TSPE-371) travaille en coordonnées, pas sur une figure.

**Outil** : ` ```solide ` (`docs/systeme/ubumark.md` § Solide en perspective cavalière) dessine cube, pavé,
pyramide (dont `pyramide triangle` = tétraèdre régulier) aux sommets nommés — cube / pavé : ABCD en bas, A devant
à gauche, sens direct, EFGH au-dessus, E sur A — et marque faces, arêtes, sommets ; variables `{{…}}` admises dans
le bloc (4-lot-6). Il ne dessine **ni flèche de vecteur, ni diagonale, ni point hors sommet** (milieu…).

## Phase 0 (2026-11-03, à valider)

Un modèle par point, niveau `T_SPE` seul, rangé sur le nœud du point (339 : sur la notion « Espace »). Figure :
cube ABCDEFGH (pavé dans une variation quand le savoir ne dépend pas des longueurs), vecteurs et droites écrits
dans l'énoncé entre sommets, faces ou arêtes concernées marquées. Les réponses sont **calculées par le gabarit**
(coordonnées des sommets, rang, produit mixte), jamais écrites à la main. 8 modèles ; 334 → C.

| #   | Point | Modèle                                             | Variations                                                                                                                    | Réponse                    |
| --- | ----- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| F1  | 335   | Exprimer un vecteur à l'aide d'arêtes du cube      | v0 diagonale d'une face ($\vec{AC}$ = ?) ; v1 grande diagonale ($\vec{AG}$) ; v2 avec un signe moins ($\vec{CE}$)             | choix, 4                   |
| F2  | 338   | Coordonnées d'un vecteur dans la base (AB, AD, AE) | vecteur entre deux sommets quelconques, coefficients dans {−1 ; 0 ; 1} ; v2 base changée ($\vec{AB}$, $\vec{AC}$, $\vec{AE}$) | trois cases (entiers)      |
| F3  | 337   | Deux vecteurs d'un plan forment-ils une base ?     | dans une face : non colinéaires (oui) ; parallèles (non) ; dans le plan diagonal (ACGE)                                       | choix : oui / non + raison |
| F4  | 553   | Trois vecteurs forment-ils une base de l'espace ?  | oui ($\vec{AB}, \vec{AD}, \vec{AE}$ ou $\vec{AB}, \vec{AC}, \vec{AG}$) ; non, coplanaires ; non, deux colinéaires             | choix, 3                   |
| F5  | 336   | Position relative de deux droites                  | sécantes ; parallèles ; non coplanaires (piège : ni parallèles ni sécantes)                                                   | choix, 4                   |
| F6  | 551   | Position relative d'une droite et d'un plan        | sécants ; strictement parallèles ; droite contenue dans le plan                                                               | choix, 3                   |
| F7  | 552   | Position relative de deux plans                    | strictement parallèles ; sécants (selon quelle droite : choix) ; confondus (plan nommé par deux triplets)                     | choix                      |
| F8  | 339   | Points coplanaires, points alignés sur un cube     | quatre sommets coplanaires (ABGH, ACGE) ou non ; parallélisme droite / plan pour conclure                                     | choix                      |

Catégories : deux sous-domaines neufs dans « Vecteurs, droites et plans de l'espace » — **« Sur une figure »**
(F1 1, F2 2, F3 3, F4 4, F8 5) et **« Positions relatives »** (F5 1, F6 2, F7 3) : aucun niveau pris.

### Questions

- **Q1** : 8 modèles sur un cube nommé (vecteurs et droites écrits dans l'énoncé, pas dessinés) ? Reco : oui, c'est
  la figure du BO (« solides usuels du collège ») et des manuels.
- **Q2** : 334 (représenter une combinaison linéaire) classé **C** (geste « tracer un vecteur » sur un solide),
  ligne ajoutée à `outils-manquants.md` ? Reco : oui ; un choix entre vecteurs nommés ferait doublon avec F1.
- **Q3** : deux sous-domaines neufs « Sur une figure » et « Positions relatives » ? Reco : oui (aucune collision de
  niveaux, regroupe les modèles à figure).
- **Q4** : un modèle de 339 rangé sur la notion « Espace » (le point y est), pas sur une sous-notion ? Reco : oui ;
  la garde « notion sans sous-notion » liste alors les sous-notions admises (migration lot 7).
- **Q5 (accès)** : qui pourra lire quoi, qu'il ne pouvait pas lire avant ? Reco : personne (brouillons ; la
  migration ne pose que nœud et tags).

**D-L9 (David, 2026-11-03, « je suis tes recos »)** : Q1 8 modèles sur un cube nommé, vecteurs et droites écrits
dans l'énoncé ; Q2 334 en C (ligne 12 de `outils-manquants.md`) ; Q3 sous-domaines neufs « Sur une figure » et
« Positions relatives » ; Q4 F8 (339) rangé sur la notion « Espace » ; Q5 accès : personne ne gagne ni ne perd
d'accès.
