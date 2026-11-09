# Chantier « questions-1spe-raisonnements » — relire les points « compétence » et la logique de 1re spé

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bilan de départ :
> [1spe.md](../systeme/programmes/bornes/lycee/1spe.md) § « Couverture en modèles de questions ». Journaux clos :
> `docs/archive/wip/questions-1spe-progress.md`, `questions-1spe-logique-progress.md`, `logique-1spe-progress.md`.

## Reprendre ici

_Mis à jour le 2026-11-09, relecture faite (aucune PR)._

- **État** : relecture faite (§ 3), phase 0 écrite (§ 4) et soumise.
- **Prochaine action** : selon les réponses, worktree `questions-1spe-raisonnements`, modèles, migration nœud + tag.
- **En attente de David** : Q1-Q4 du § 4 (disjonction/absurde, `1_SPE` sur les modèles de 2de, 435, logique
  en chapitre ou transversal).
- **Pièges en cours** : relevé MCP en prod (lecture seule) ; nouveaux points ou tags = migration (question d'accès
  d'abord) ; un modèle porte au plus UN point (ADR 0020).
- **Worktree / branche** : aucun (lecture seule pour l'instant).

## 1. Pourquoi ce chantier (2026-11-09)

- **1SPE-205** « Produire un raisonnement par contraposée » est classé « point-compétence, aucun grain
  questionnable » dans `1spe.md`, donc compté parmi les 17 points « voulus » sans modèle. **David conteste** : ce
  n'est pas une compétence. Le BO (`src/lib/server/programmes/transcriptions/1_SPE.md:124`) : « Par ailleurs, les
  élèves produisent des raisonnements par disjonction des cas, par l'absurde, par contraposée, et en découvrent la
  structure. » Un modèle est possible, comme les 14 démonstrations à trous (contraposée en case, étape clé en case
  choix, étapes à ranger).
- **Disjonction des cas et absurde** : même phrase du BO, **aucun point 1SPE**.
- **BO l. 115-118** (connecteurs « et »/« ou », contre-exemple, implication et équivalence, réciproque et
  contraposée) : **aucun point 1SPE** non plus. Le relevé de 2de en a au moins un (`2de.json` : « Formuler la
  réciproque d'une implication ») → sans doute repris de seconde, NON vérifié point par point.
- Même règle de classement « point-compétence » pour **284** (optimisation : « un problème guidé reste possible »
  d'après le journal clos), **435, 436, 437** → à relire aussi.
- Le chantier `logique-1spe` (octobre) a une catégorie « Raisonnements » (reconnaissance par QCM) ; `93f9ecdf`
  « Reconnaître un type de raisonnement » était en brouillon au relevé du 2026-10-27. À relever : statut, tag.

Relevé MCP du 2026-11-09 (modèles publiés) : 201 `e5205176`, 202 `536c01bb`, 203 `dd9a33b7`, 204 `0ab3faa5`,
366 `fb3b536c`, 206 `344a2248`, 207 `5d17692b`, 208 `de42b303`, 209 `2f7d637b`, 210 `051ff81f`, 367 `63849c41` ;
205, 362, 365 : aucun.

## 2. À faire (relecture)

1. Lire 284, 435, 436, 437 et 205 contre le BO ; pour chacun, dire s'il est questionnable (et comment) ou non.
2. BO l. 115-124 : pour chaque capacité, point de 2de qui la porte (`2de.json`) et modèle publié ; sinon trou en 1re.
3. Modèles du thème « Logique › Raisonnements » en prod : statut, tags (contraposée, absurde, disjonction).
4. Phase 0 : liste des modèles à créer ou à taguer, points à ajouter (migration) ; validation de David.
5. Corriger le classement de `1spe.md` (§ Couverture et points) dans la PR qui livre.

## 3. Relecture (2026-11-09, lecture seule, MCP prod)

**Points « compétence » contre le BO** — tous questionnables sauf 435 :

| Point                          | BO                                                                                      | Verdict                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 205 contraposée                | p.4 : « produisent des raisonnements … par contraposée, et en découvrent la structure » | **questionnable** : démonstration à trous (contraposée en case choix, étape clé en case) + « étapes à ranger », comme les 14 démonstrations |
| 284 optimisation               | p.8, rubrique Variations (voisins 401 « extrémums » : 2 modèles, 402 : 1)               | **questionnable** : problème guidé (aire, volume de boîte) : exprimer f(x), x optimal, valeur optimale, en cases                            |
| 435 modéliser une suite        | p.6, 1re phrase de la capacité ; la 2e est portée par 222 et 376                        | **couvert par ses voisins** : 370, 222, 376 (motifs, 1 modèle chacun), 230 (2), 379 (3), 297 (1)                                            |
| 436 produit scalaire, problème | p.9 ; voisins 318 (2), 319 (2), 320 (2) font l'outil, pas le problème                   | **questionnable** : problème guidé à trous (carré, rectangle : montrer une orthogonalité, une longueur)                                     |
| 437 repère, configuration      | p.9 ; aucun voisin ne fait choisir le repère                                            | **questionnable** : problème guidé (choisir le repère, coordonnées, conclure)                                                               |

**BO l. 115-124, capacité par capacité** — aucun point 1SPE ; tout est porté par des points de 2de, modèles en
`grades = ['2']` seulement, sauf le contre-exemple :

| Capacité                                                          | Point 2de                    | Modèle publié                                    | `1_SPE` ? |
| ----------------------------------------------------------------- | ---------------------------- | ------------------------------------------------ | --------- |
| « et »                                                            | 2-210                        | 219c9470, 6c3ee9e6                               | non       |
| « ou »                                                            | 2-408                        | 1e9a534f, 55341e85                               | non       |
| contre-exemple                                                    | 2-212                        | f98164b1                                         | **oui**   |
| formuler une implication                                          | 2-213                        | 214f7500                                         | non       |
| formuler une équivalence                                          | 2-409                        | 75d0fc89                                         | non       |
| implication dans un raisonnement simple                           | 2-410                        | e05203b0                                         | non       |
| réciproque                                                        | 2-214                        | 5426cead                                         | non       |
| contraposée (formuler)                                            | 2-411                        | bed58c24                                         | non       |
| pour tout / il existe                                             | 2-215, 2-412                 | 61d0571e, 24fd6a10                               | non       |
| CN/CS, identité, lettres, quantif. implicite, négation quantifiée | 1SPE-201, 202, 366, 203, 204 | e5205176, 536c01bb, fb3b536c, dd9a33b7, 0ab3faa5 | oui       |
| **disjonction des cas**                                           | 2-216 (compétence)           | **aucun**                                        | —         |
| **absurde**                                                       | 2-217 (compétence)           | **aucun**                                        | —         |
| **contraposée (produire)**                                        | 1SPE-205                     | **aucun**                                        | —         |

**Logique › Raisonnements** en prod : `93f9ecdf` « Reconnaître un type de raisonnement » **publié** (niveau 2,
`['1_SPE']`, **sans tag**) : 5 cas (direct, absurde, contraposée, disjonction, contre-exemple), case choix ;
`f98164b1` « Donner un contre-exemple » (sous-nœud contre-exemple, tag 2-212). Rien d'autre.

## 4. Phase 0 (soumise le 2026-11-09)

À créer (un modèle = un point, ADR 0020), nœud « Logique › Raisonnements » pour les trois premiers :

1. **Démontrer par contraposée** → 1SPE-205. Nominal : implication sur les entiers (parité, divisibilité), on
   choisit la contraposée parmi 4 (réciproque, contraposée, négation, implication inverse), puis l'étape clé en
   case. Limite : « étapes à ranger ». Erreur : réciproque choisie → correction qui dit la différence.
2. **Raisonner par disjonction des cas** et 3. **par l'absurde** → point selon la réponse de David (Q1).
3. **Problème d'optimisation guidé** → 1SPE-284 (Fonctions › Dérivation › catégorie existante à repérer).
4. **Problème géométrique par le produit scalaire** → 1SPE-436 ; 6. **Configuration en repère** → 1SPE-437.

Questions à David : Q1 disjonction et absurde (points 1SPE neufs ou points de 2de + `1_SPE`) ; Q2 `1_SPE` sur les
9 modèles de 2de ; Q3 435 voisins ou modèle ; Q4 logique en chapitre ou en transversal (fiches). `93f9ecdf` :
reco le laisser sans tag (5 types, aucun point ne le porte seul).
