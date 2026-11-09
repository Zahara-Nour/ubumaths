# Chantier « questions-1spe-raisonnements » — relire les points « compétence » et la logique de 1re spé

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bilan de départ :
> [1spe.md](../systeme/programmes/bornes/lycee/1spe.md) § « Couverture en modèles de questions ». Journaux clos :
> `docs/archive/wip/questions-1spe-progress.md`, `questions-1spe-logique-progress.md`, `logique-1spe-progress.md`.

## Reprendre ici

_Mis à jour le 2026-11-09, ouverture du chantier (aucune PR)._

- **État** : ouvert, rien fait. Point 1 validé par David le 2026-11-09 (« oui »).
- **Prochaine action** : relecture en lecture seule (§ 2), puis phase 0 écrite ici et soumise à David.
- **En attente de David** : la validation de la phase 0. Question à poser : la logique, il la fait en chapitre ou en
  transversal ? Elle décide de la paire de fiches « Logique » (reco : modèles seuls si transversal).
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
