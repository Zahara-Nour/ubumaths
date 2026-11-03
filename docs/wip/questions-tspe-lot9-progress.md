# Chantier « questions-tspe-lot9 » — terminale spécialité, espace sur figure (lot 9)

> Suite de [`questions-tspe`](../archive/wip/questions-tspe-progress.md) (journal d'index archivé : relevé § 1,
> classement § 3.3, Q5 au § 5, lot 9 au § 4). Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md)
> (skill `couvrir-niveau`). Bornes : `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points`. En base,
> le niveau est `T_SPE`. Rouvert le 2026-11-03 : le lot 9 attendait le chantier `solides`, clos le 2026-11-01 et en
> prod (release 0.66.0) — le versement l'avait dit à tort « en attente ».

## Reprendre ici

_Mis à jour le 2026-11-03, PR du rangement #2315 ouverte (audit sécurité : aucun bloquant)._

- **État** : 8 brouillons en prod (créés par David le 2026-11-03, ids au § « En prod ») ; migration nœud + tag
  `20261103131044_questions_tspe_lot9_rangement_tags.sql` écrite, test d'intégration 12/12 vert (8 rouges
  sans elle), PR #2315 ouverte, `security-auditor` sans bloquant.
- **Prochaine action** : `security-auditor` sans bloquant, CI verte, `pnpm check:migrations --pr <n>`, merge,
  `pnpm db:migrate` depuis le dépôt principal, vérifier en prod ; page à cocher (après la migration : elle lit
  nœud et points en prod) ; publication.
- **En attente de David** : rien avant la page à cocher.
- **Pièges en cours** : ` ```solide ` sans flèche, diagonale ni point hors sommet ; F8 (TSPE-339) va sur la
  NOTION « Espace », ses 6 sous-notions admises par la garde.
- **Worktree / branche** : `../ubumaths-wt-questions-tspe-lot9-rangement` · `feat/questions-tspe-lot9-rangement`.
  L'ancien worktree `../ubumaths-wt-questions-tspe-lot9` (branche mergée, #2312) reste à retirer.

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
dans l'énoncé ; Q2 334 en C (ligne 13 de `outils-manquants.md`) ; Q3 sous-domaines neufs « Sur une figure » et
« Positions relatives » ; Q4 F8 (339) rangé sur la notion « Espace » ; Q5 accès : personne ne gagne ni ne perd
d'accès.

## Lot écrit (2026-11-03)

Script `docs/wip/questions/lot-tspe-9-figure.py` : cube A(0;0;0)…H, coordonnées dans (AB, AD, AE) ;
chaque cas tiré est `k` (textes en `{{if:k==…}}` à plat, réponses en variables), `p` choisit cube ou pavé
droit (`pave 5 3 2`). Réponses et corrigés calculés (Chasles le long des arêtes, colinéarité, produit
mixte, résolution de `w = x u + y v` sur deux coordonnées), chaque cas vérifié par une assertion.

| #   | Fichier                      | Variations                                                                  |
| --- | ---------------------------- | --------------------------------------------------------------------------- |
| F1  | `1-exprimer-vecteur`         | diagonale de face sans moins (6) ; grande diagonale (8) ; avec un moins (8) |
| F2  | `2-coordonnees-base`         | (AB, AD, AE) coefficients ≥ 0 (8) ; avec négatifs (8) ; (AB, AC, AE) (8)    |
| F3  | `3-base-du-plan`             | face, oui (6) ; face, non (6) ; plan diagonal, mêlé (6)                     |
| F4  | `4-base-espace`              | base (6) ; coplanaires (6) ; deux colinéaires (5)                           |
| F5  | `5-droites`                  | sécantes (6) ; strictement parallèles (6) ; non coplanaires (6)             |
| F6  | `6-droite-plan`              | sécants (6) ; strictement parallèles (6) ; contenue (6)                     |
| F7  | `7-deux-plans`               | parallèles (6) ; sécants, quelle droite (7) ; confondus (6)                 |
| F8  | `8-coplanarite-parallelisme` | quatre sommets coplanaires ? (8, mêlé) ; droite ∥ plan ? (8, mêlé)          |

Écart au tableau de phase 0, sans effet sur D-L9 :
F8 v1 (« parallélisme droite / plan ») passe par `MN = x XY + y XZ`, pas par F6.

## En prod (2026-11-03)

David a lancé `create-questions --publier` le 2026-11-03 : 8 brouillons `T_SPE`, sans nœud ni tag (relevé MCP).

| #   | id                                     | Point    | Nœud                                                |
| --- | -------------------------------------- | -------- | --------------------------------------------------- |
| F1  | `d7a361ca-3a71-430a-82e4-720a1b14c0ad` | TSPE-335 | Géométrie > Espace > coplanarité et décomposition   |
| F2  | `63669e60-3140-4f55-8d5e-cc9d390adaf1` | TSPE-338 | Géométrie > Espace > coplanarité et décomposition   |
| F3  | `4c19f2cb-1c90-4b43-83ad-521ee4edb1f0` | TSPE-337 | Géométrie > Espace > coplanarité et décomposition   |
| F4  | `f9df1cd9-9791-42a3-bb5f-c0c84ad84d9c` | TSPE-553 | Géométrie > Espace > coplanarité et décomposition   |
| F5  | `d6d9d5f7-8af1-45ba-aa9f-fb5f9e0fc82e` | TSPE-336 | Géométrie > Espace > positions relatives et inters. |
| F6  | `f61cd451-0435-4fa7-ba72-93b1f98f65b8` | TSPE-551 | Géométrie > Espace > positions relatives et inters. |
| F7  | `14a02a32-092f-4c1c-83cc-44f912c66f43` | TSPE-552 | Géométrie > Espace > positions relatives et inters. |
| F8  | `a45a315b-9610-4452-9ab3-df00d5eb24bf` | TSPE-339 | Géométrie > Espace (notion, 6 sous-notions admises) |

Migration `20261103131044_questions_tspe_lot9_rangement_tags.sql` (gabarit du lot 10) et son test
`tests/integration/questions-tspe-lot9-rangement-tags.test.ts` : 12/12 verts, 8 rouges sans la migration
(fichier remplacé par `select 1;`, restauré d'une copie, md5 identique).
