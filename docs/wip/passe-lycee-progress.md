# Passe lycée — progression

Suite de [arbre-notions](arbre-notions-progress.md) (passe décidée par David le 2026-10-21). Décisions :
[ADR 0020 § 7](../adr/0020-arbre-central-programmes-pointeurs.md). Méthode de l'étape a :
[passe-lycee/METHODE.md](passe-lycee/METHODE.md).

## Reprendre ici

_Mis à jour le 2026-10-22, étape b rédigée._

- **État** : bornes des 1 507 points écrites (`passe-lycee/bornes/<programme>.{md,json}`, générateurs dans
  `bornes/generateurs/`), 61 questions (`bornes/questions-*.json`), 18 libellés signalés « ⚠ libellé ».
  Page à cocher : https://claude.ai/artifact/NqFNoysc54WHsSjopUcSDy (générateur `bornes/page/gen.py`,
  collections `reponses` et `libelles`). Tout est commité sur `main` (docs pur).
- **Prochaine action** : lire les réponses de David (ArtifactData `list` des 2 collections), les reporter dans les
  questions (`decision`, `decide_le`) et dans les bornes (force `décision`), puis étape c.
- **En attente de David** : la page à cocher. Sources : BO seul, définitif (aucun document d'accompagnement
  approprié sur eduscol, David, 2026-10-22).
- **Pièges en cours** : 85 points techno sans borne ni remarque (hérités des bornes générales, à vérifier) ;
  1SPE-243/247/384 absents du nouveau BO (étape a à revoir) ; 1SPE-244 à re-ranger sur « racines » à l'étape c ;
  `undoLaterMigrations` (tests) à compléter pour toute future migration de données.
- **Worktree / branche** : `../ubumaths-wt-passe-lycee` · `feat/passe-lycee-bornes` (rebasée sur `main`, sans
  commit propre : les commits partent sur `main`).

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
- **2026-10-22 — Questions réécrites (David : « ce n'est pas clair »).** Q03/Q04 incomprises : les questions citaient des
  codes sans libellés. Réécrites en `page/questions.json` (BO, point actuel, une option par bouton avec ses libellés).
  Réponses Q01/Q02 « reco » converties en A.
- **2026-10-22 — Réponses et migration.** Page lue : 15 questions répondues (Q03 = B, toutes les autres = A, chaque fois
  la reco), aucune fiche cochée ; David : « tiens-les toutes pour OK et continue ». Générateur
  `generer-migration.py` (modèle : `c5-scissions-generer.py`) → migration, fixture `passe-lycee.json`, fixtures des
  seeds (`--seeds`). Décisions techniques prises en route : codes neufs = max + 1 par grade ; ⚙ en fluence, rubrique
  « Automatismes > <bloc du BO> », rangés en tête de la partie Automatismes ; références par défaut au morceau qui
  garde le code, étendues selon la colonne famille ; invariants des seeds respectés (la 1re reprend la liste de 2de,
  la Tle spé et compl. celle de 1re spé : 2-382 garde ses trois morceaux en 1re/Tle, 2-214 ses deux en Tle compl.) ;
  1SPE-244 garde son nœud (garde des tags en prod). Prod : aucune donnée d'élève sur les points du lycée (0 état,
  0 journal, 0 exercice, 0 signalement). Rollback éprouvé : empreinte identique à l'état d'avant, puis rejeu.
- **2026-10-22 — #1608 mergée, `db:migrate` fait.** Revues : `security-auditor` et `code-reviewer` (Opus), aucun
  bloquant ; corrigé : verrous avant les gardes (migration et rollback), tags de modèles refusés sur un point à
  archiver, rollback refusé si un libellé a changé, nœuds d'avant vérifiés par le test. Question d'accès tranchée
  par David : personne ne gagne d'accès. Empreinte prod = local après migration.
- **2026-10-22 — Étape b lancée (David : « je te suis »).** Sources : BO seul pour l'instant. Eduscol renvoie 403
  aux outils ; les sites académiques (Amiens, Paris) ne listent que les programmes du BO n° 14 du 2026-04-02
  (2de et 1re à la rentrée 2026, terminales à la rentrée 2027 ; maths expertes : texte de 2019). Aucune ressource
  d'accompagnement du lycée trouvée pour ces programmes. Mêmes fichiers et même grille qu'au collège (aspect, force
  BO / accompagnement / déduite / décision, source paginée), aspect `fonctions` ajouté.
- **2026-10-22 — Bornes rédigées (4 agents Opus).** 2de 292 · 1re ES 64 · 1re spé 237 · Tle spé 325 · Tle exp. 176 ·
  Tle compl. 178 · 1re techno 143 · Tle techno 92, codes identiques à l'export (vérifié). Bornes surtout `BO`,
  `déduite` toujours expliquée. 61 questions (l2, l1g, l1s, lts, lte, ltc, l1t, ltt). Hors périmètre, relevés pour
  l'étape a : 1SPE-243 (forme développée), 247 (sommet), 384 (axe de symétrie) absents du nouveau BO de 1re spé ;
  doublons possibles TSPE-304 / 386 (récurrence) et 1SPE-290 / 301 ; capacités de Tle techno sans point (arbres et
  probabilités conditionnelles, espérance, automatismes en italique) ; PPCM absent de tous les BO du lycée.
- **2026-10-22 — Pas de document d'accompagnement (David).** « il n'y a pas de document d'accompagnement approprié
  pour les bornes sur eduscol » : les bornes du lycée reposent sur le BO seul, pas de passe complémentaire.
