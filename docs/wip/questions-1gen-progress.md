# Chantier « questions-1gen » — couvrir les maths de l'enseignement scientifique de 1re

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Niveau : `1_GEN`, « module spécifique » de mathématiques intégré à l'enseignement scientifique de 1re générale
> (BO n° 14 du 2026-04-02). Bornes : `docs/systeme/programmes/bornes/lycee/1gen.json` → `["1_GEN"].points`,
> lecture et décisions l1g-1, l1g-2 dans `1gen.md` et `questions-2de-1gen.json`.

## Reprendre ici

_Mis à jour le 2026-11-17, ouverture (relevé, état des lieux, classement)._

- **État** : relevé prod fait (§ 1), existant vérifié contre les bornes (§ 2), 42 points sans modèle classés (§ 3).
  Aucun code, aucune écriture en base.
- **Prochaine action** : réponses de David aux questions Q1 à Q7 (§ 5), puis phase 0 du premier lot.
- **En attente de David** : Q1 à Q7.
- **Pièges en cours** : la plupart des modèles de suites géométriques de 1re spé tirent des termes négatifs → pas
  taguables 1GEN tels quels (§ 2.2).
- **Worktree / branche** : aucun (journal seul, sur `main`).

## 1. Relevé (prod, 2026-11-17)

- **64 points** `1_GEN` actifs ; **22** ont au moins un modèle, **42** aucun.
- **31 modèles** `'1_GEN' = any(grades)`, tous publiés, tous rangés sur un nœud. Tous sont partagés avec la 1re spé
  et/ou la 1re techno (un point par programme, ADR 0020), sauf 7 qui ne portent aucun point 1GEN :
  9852d62c (5-113), 5397c20f (1SPE-432), 7f82d15a (2-349), f5585668 (2-314), 1c86d122 (5-135), 95ee57c8 (2-448),
  0f673c27 (2-328) — niveau `1_GEN` sans point du niveau (Q2).

Points couverts (nombre de modèles) : 062, 063, 064, 045, 008, 046, 012, 047, 013 (3), 014 (5), 015, 049, 050,
021, 022, 026 (2), 061.

## 2. L'existant contre les bornes

Vérifié le 2026-11-17 (lecture seule, prod) : plages des variables, énoncés et corrigés des 24 modèles tagués 1GEN et
de 28 modèles de 1re spé candidats à un tag 1GEN.

### 2.1 Modèles tagués 1GEN

- **OK** (23) : a8b51d16, 7247dbb0, 8ed02829, 337d31c3, 1315d326, c23840b6, 1b1a6d7b, 18e26873, 1c65d58e, d5780995,
  0af4bf32, a573d517, 8d4e5302, 7d6cf480, 36010981 et ebe7e788 (indépendance par le produit, admise par l1g-1),
  5cb7f6ce, eb9517ed, 0b686e01, 33dffa7a, 65e96f31, 373fc5b4, dc5d7cb6.
  - Remarque 1b1a6d7b / 18e26873 (026) : le corrigé conclut « du signe de a à l'extérieur des racines » sans
    tableau de signes des facteurs ; admissible.
- **Hors borne** : **1acb6d47** (022, « nature de l'extremum ») — var. 1 : corrigé « α = −b/(2a), β = f(α) »
  (formule du sommet, exclue) ; var. 3 : forme canonique (hors des trois formes du BO). Var. 2, 4, 5 conformes (Q3).

### 2.2 Modèles de 1re spé candidats

- **Taguables tels quels** : d1010214 (058, 038), f3100c29 (038, 056 ; corrigé par u₁² = u₀u₂, élémentaire),
  aeb1389d (056, 029), afe51ac4 (055, 027), 42bb2d66 (011, 046), f2ed0ea0 (010, 046), 70e682f9 (017),
  bd27e002 (018, 050, 016).
- **Avec réserve** : 21f42c7f (009 ; var. 1 pose la définition par le produit, celle du BO vient en second) ;
  2f4f4ae0, fe6f5606 (012 ; deux épreuves indépendantes mais pas identiques, donc pas 046).
- **À reprendre** : 4f8f420a (distracteurs a·(−2)ⁿ, raison négative) ; b535b8fd (var. 3 : dé, pièce, urne → pas
  046).
- **Hors borne** : toutes les suites géométriques « calculer / raison / terme général / reconnaître »
  (279cf28f, ab4d55f7, cf51cb93, 727fb88a, 85afd455, 349e1be5, e67b1cbd, eca755e6, 5042401b, fcf1057e, 84114cb2,
  cea65372 : raison ou premier terme tirés négatifs) ; 22141fa4 (eˣ) ; 8a7e39b7 (dérivée, forme développée) ;
  8cbfcf4b (discriminant, forme canonique).

## 3. Points sans modèle (42) — classement

Outils vérifiés au catalogue (`couvrir-un-niveau.md` § 3 bis, `ubumark.md`) : ` ```nuage ` (ajustement, point moyen,
prévoir), ` ```tableau-croise `, barres, circulaire, ` ```probtree ` (à compléter), ` ```variation ` (à compléter),
` ```courbe ` (lecture, `données:`, `placer:` de points, `tracer:` d'une **droite** seulement), ` ```associer ` avec
courbes, case choix (en prod). **Aucun geste ne trace une courbe non affine** (Q5).

| Thème                          | Points                                                                                                                                                         | Classe                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Statistiques à deux caractères | 001 (croisement, tableau croisé, barres, circulaire), 002 (nuage), 003, 004, 005, 007 (au jugé = `tracer:` sur `données:` ; Mayer et moindres carrés = calcul) | B                                                                |
| Tableur                        | 006                                                                                                                                                            | A (formule en texte, comme 3-032) — Q6                           |
| Probabilités                   | 009 (contenu indépendance), 010 (répétition)                                                                                                                   | A ; 011 (arbre n ⩽ 4) : B (`probtree` à compléter)               |
| Croissance linéaire            | 017, 048, 018                                                                                                                                                  | A                                                                |
|                                | 016, 019 (placer les termes), 020 (`tracer:`), 051 (lecture)                                                                                                   | B                                                                |
| Second degré                   | 023, 025, 052, 053 (axe par f(x) = c, sommet par symétrie)                                                                                                     | A                                                                |
|                                | 054 (tableau de variations), 055, 027 (tableau de signes), 024 (`associer` parabole ↔ expression)                                                              | B                                                                |
| Suites géométriques > 0        | 028, 029, 030, 039, 057                                                                                                                                        | A                                                                |
|                                | 031, 041 (placer les termes), 058 (lecture)                                                                                                                    | B                                                                |
| Fonctions aˣ, taux moyen       | 032, 033, 034, 036, 037, 040, 043                                                                                                                              | A                                                                |
|                                | 035 (associer, lecture)                                                                                                                                        | B                                                                |
| Phénomènes exponentiels        | 038, 056, 044 (seuil par le calcul, sans logarithme : essais successifs)                                                                                       | A                                                                |
|                                | 059, 060 (lecture, seuil sur la courbe)                                                                                                                        | B                                                                |
|                                | 042 (réaliser la courbe d'une exponentielle)                                                                                                                   | B (placer les points d'un tableau) ou C (tracer une courbe) — Q5 |

Aucun point en D.

## 4. Découpage proposé (à valider, Q7)

1. **Suites géométriques à termes > 0** : 028, 029, 030, 039, 057, 031, 041, 058 — modèles neufs propres au 1GEN.
2. **Fonctions aˣ et taux moyen** : 032 à 037, 040, 043.
3. **Phénomènes exponentiels et seuils** : 038, 056, 044, 059, 060, 042.
4. **Second degré** : 022 (modèle propre), 023, 024, 025, 027, 052 à 055.
5. **Croissance linéaire et affines** : 016 à 020, 048, 051.
6. **Statistiques à deux caractères** : 001 à 007.
7. **Probabilités** : 009, 010, 011.

- **Migration de tags** des modèles de 1re spé du § 2.2 (une seule migration, avant ou avec le lot qui les concerne).

## 5. Questions à David

- **Q1** — « Première spécifique » = `1_GEN` (module spécifique de l'enseignement scientifique) : confirmé ?
- **Q2** — 7 modèles portent le niveau `1_GEN` sans aucun point 1GEN (liste § 1) : retirer `1_GEN` de leurs niveaux,
  ou leur trouver un point (5397c20f → 062 ? 95ee57c8 → 060 ?) ?
- **Q3** — 1acb6d47 (var. 1 et 3 hors borne) : retirer son tag 1GEN-022 et écrire un modèle 1GEN propre
  (recommandé), ou scinder ses variations ?
- **Q4** — Taguer 1GEN les 8 modèles de 1re spé « tels quels » et les 3 « avec réserve » (§ 2.2) par une migration ?
  4f8f420a et b535b8fd : laissés à la 1re spé (recommandé) ou corrigés ?
- **Q5** — 042 « réaliser la courbe d'une exponentielle » : placer les points d'un tableau de valeurs dans un repère
  (outil existant, recommandé), ou un geste neuf « tracer une courbe » (chantier à part, servirait aussi aux
  paraboles) ?
- **Q6** — 006 (tableur) : formule écrite en texte, comparée après normalisation, comme 3-032 ?
- **Q7** — Ordre des lots du § 4 ?
