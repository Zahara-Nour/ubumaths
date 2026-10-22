# Passe lycée — progression

Suite de [arbre-notions](arbre-notions-progress.md) (passe décidée par David le 2026-10-21). Décisions :
[ADR 0020 § 7](../adr/0020-arbre-central-programmes-pointeurs.md). Méthode de l'étape a :
[passe-lycee/METHODE.md](passe-lycee/METHODE.md).

## Reprendre ici

_Mis à jour le 2026-10-22, page à cocher de l'étape a publiée._

- **État** : étape a consolidée (`passe-lycee/propositions.tsv`, 367 propositions ; `questions.md` Q1-Q15 ;
  `bilan.md` : 1 105 → 1 495 points si tout passe). Page à cocher : https://claude.ai/artifact/NuDHhVAh5K5VUMQuCBKt3o
  (base de l'artifact, collection `reponses`, un document par Qnn / Pnnn ; générée par `passe-lycee/page/generer.py`).
- **Prochaine action** : lire les réponses (`ArtifactData list reponses`, compter avant de dire « tout est relu »),
  appliquer, puis écrire la migration additive (points neufs, ⚙, rétablis, archivés, références) + tests d'intégration.
- **En attente de David** : ses réponses sur la page (15 questions, 350 fiches).
- **Pièges en cours** : Tle = textes de la rentrée 2027, expertes = 2019 ; 85 points coupés portent 167 tags (étape c) ;
  Q4 déplace une référence (exception à « aucune référence déplacée »).
- **Worktree / branche** : `../ubumaths-wt-passe-lycee` · `refactor/passe-lycee`.

## Les 5 étapes

a. Passe des points (critère de scission) · b. bornes par point · c. relevé des modèles · d. verdicts en inclusion
stricte · e. page à cocher puis migration des tags. Les 12 modèles sans point s'y traitent.

## Journal

- **2026-10-22 — Ouverture.** David : « dans ce chantier, on ne va travailler uniquement qu'avec les nouveaux
  programmes ». Précision sur la question 1 : deux niveaux — (1a) le point recopie une ligne du BO qui contient
  plusieurs points → **on coupe toujours** ; (1b) puis le critère d'évaluabilité (ADR 0020 § 7).
  Écran de rangement des exercices (51) : noté pour plus tard, hors de ce chantier.
- **2026-10-22 — Puces larges : on les garde (David).** « Il faut garder ce genre de point même s'ils sont larges : on ne
  pourra tout simplement pas les évaluer avec des questions, mais ils font partie du programme. On est plus sur
  l'évaluation par compétence ici. » Consigné dans l'ADR 0020 § 7. Ma reco « laisser la l. 421 retirée » était
  fausse (le retrait du seed, P1 du 2026-10-08, précède les principes du 2026-10-17). À rétablir : puces écartées au
  seed comme trop larges ou « modéliser » — 2de ex-2-099, ex-2-100, 2-332 ; 1re spé ex-129, ex-142, ex-033 ; 1re techno
  « modéliser … suite », « … fonction » ; Tle compl. ex-007, ex-030 ; Tle spé ex-083 (l. 421). Autre catégorie, à
  trancher à part : non repris parce que le BO dit « pas un objectif » ou phrase de présentation / redondance
  (TSPE ex-007, 008, 009, 025 ; TCOMP ex-131 ; 1SPE-062, 1SPE-017, ex-012a).
- **2026-10-22 — Règles transversales tranchées (David : « je suis tes reco »).**
  - T1 **Énumérations d'objets** (limites de six fonctions, chiffrements, techniques de limites…) : un point par objet
    (1a à la lettre ; précédent 5-077 au collège).
  - T2 **« graphiquement ou algébriquement »** : on coupe selon la méthode (famille du collège, 3-008).
  - T3 **Non-coupes validées au seed du 2026-10-08** (1SPE-264, 230, 283, 292, 305, 1GEN-022, 1TECHNO-057,
    TTECHNO-034, 042…) : la règle 1a prime, on coupe.
  - T4 **Doublons du BO** : on archive celui qu'aucune référence ne vise (2-373, 2-374, et non 2-380, 2-381) ; un
    doublon né d'une coupe (notation Σ, Tle techno) n'est pas créé.
  - T5 **⚙ des automatismes de 1re** : un jumeau dans chacun des trois programmes (1SPE, 1GEN, 1TECHNO).
  - T6 **Puces larges** : rétablies (l. 421 de Tle spé comprise ; un point ou quatre grandeurs : sur la page).
- **2026-10-22 — Consolidation et page à cocher.** 5 agents (un par lot de programmes) puis un agent de consolidation
  (T1-T6, familles harmonisées, 7 conflits résolus). Vérifié : citations retrouvées dans `bo/`, codes existants, 211
  nœuds proposés tous présents dans l'arbre. Page publiée (15 questions + 350 fiches ; les 32 fiches « à trancher »
  renvoient aux questions).
