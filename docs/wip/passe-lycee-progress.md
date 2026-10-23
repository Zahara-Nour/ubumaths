# Passe lycée — progression

Suite de [arbre-notions](arbre-notions-progress.md) (passe décidée par David le 2026-10-21). Décisions :
[ADR 0020 § 7](../adr/0020-arbre-central-programmes-pointeurs.md). Méthode de l'étape a :
[passe-lycee/METHODE.md](passe-lycee/METHODE.md).

## Reprendre ici

_Mis à jour le 2026-10-23, après #1635 et son `db:migrate`._

- **État** : étape e close. #1632 (tags) et #1635 (4 libellés, TSPE-626 et TCOMP-379) mergées et **jouées en prod**,
  vérifiées par le MCP (libellés, places 201 et 53, grades numérotés 1..326 et 1..179). Worktree supprimé.
- **Prochaine action** : à choisir par David parmi les restes : lot MODIFIER + scissions des TAG_PAR_VARIATION ;
  1SPE-244 à re-ranger sur « racines » puis taguer eae2ff6a ; automatisme 1re spé BO l. 274 sans point ; 85
  points techno sans borne ; `9a6087c5` 2 % d'échecs.
- **En attente de David** : ce choix ; vérification #1635 notée dans `verifications-manuelles.md`.
- **Pièges en cours** : instantané `analyse/etat-prod-2026-10-23/` périmé (tags, nœuds, points) : en reprendre un
  avant tout nouveau lot. Base locale : `20261022200000` et `20261023150000` notées jouées (`migration repair
--local`, policies déjà en place).
- **Worktree / branche** : aucun.

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
- **2026-10-23 — Libellés tranchés (page à cocher, 15/15).** Corriger : 2-273 (« par exemple » rétabli),
  1GEN-029/030/031 (« à termes strictement positifs »). Laisser : les 11 autres, dont 1SPE-243/247/384 absents du
  nouveau BO (gardés). Questions de David : (1) lecture graphique du sommet — aucun point de 1re spé ; en 2de,
  2-350 « déterminer graphiquement les extrémums » ; en 1re ES/techno, 1GEN-053 et 1TECHNO-124 (« coordonnées du
  sommet en lien avec la symétrie ») ; (2) TSPE-444 : exponentielle → point en Tle ou renvoi en 1re, à trancher.
- **2026-10-23 — TSPE-444 : option A (David).** Point neuf « Utiliser l'équation fonctionnelle de l'exponentielle
  pour transformer une écriture » en Tle spé et en Tle compl. (à côté de TCOMP-236), créé à l'étape e.
- **2026-10-23 — Questions l2-1 à l2-10 reportées.** Toutes = la reco. `decision`/`decide_le` dans
  `questions-2de-1gen.json` ; dans `2de.json`/`.md` : 7 bornes générales et 6 bornes de point (2-246, 302, 306, 394,
  400, 431) en force `décision`, renvois « question l2-N » des remarques devenus « décision l2-N ».
- **2026-10-23 — 51 questions restantes reportées (étape b close).** 59/61 = la reco ; écarts : **l1s-2 = entiers**
  (forme canonique : coefficient de x² quelconque si b/(2a) entier ou demi-entier simple) et **lts-5 = première**
  (limites : seulement celles de 1re ; ln relève de TSPE-441/443). Une borne générale `décision` par question et par
  programme (l1t-1, l1t-3 : 1re et Tle techno), titre + option choisie (l1s-3, l1s-6, l1s-7 reformulées pour se lire
  seules) ; remarques qui citent une question suffixées « → décision X : choix ». Script :
  scratchpad de session (non gardé), reproductible depuis la collection `reponses`.
- **2026-10-23 — Étape c : relevé des modèles.** Lot = les 432 modèles de niveau lycée en prod (420 tagués au lycée,
  dont 52 TSPE + TCOMP et 1 sur 2de + 1SPE ; 12 sans point ; 365 brouillons). Instantané pris par le MCP en lecture
  seule (la clé anonyme ne voit pas les brouillons ; la clé de service a été refusée par le classifieur du mode auto).
  `releve.ts` du collège copié dans `passe-lycee/releves/` : 1 638 variations × 300 tirages en 114 s, 0 erreur de
  conversion, un seul modèle en échec partiel (`9a6087c5`, 12/600). Aucun modèle de niveau 1re ES ni techno.
- **2026-10-23 — Étape d : programmes candidats, option A (David).** Un modèle est jugé contre tous les programmes du
  lycée où sa tâche existe (1re ES, techno compris), au plus un point par programme, en inclusion stricte contre les
  bornes de chacun. Consigne `passe-lycee/analyse/CONSIGNE.md` (celle du collège, adaptée) ; 6 lots (`lots.csv`) :
  2de 37, 1re spé 101 + 101, Tle spé 71, Tle spé + compl. 65, Tle expertes 57.
- **2026-10-23 — Étape d : verdicts.** 6 agents Opus + 1 de rattrapage (lot 1re spé a contre la 2de, oublié dans mon
  brief). 650 lignes : 445 TAG, 72 TAG_PAR_VARIATION, 52 MODIFIER, 46 A_TRANCHER (+4 au rattrapage), 25
  HORS_PROGRAMME. Contrôles par script : chaque lot couvre exactement ses modèles, une ligne par programme de niveau,
  aucun doublon, tous les codes existent et sont du bon programme. Constats : 21 % des tags actuels retiennent un
  autre point (souvent un voisin d'avant le découpage) ; découpage fin → beaucoup de TAG_PAR_VARIATION (Tle compl.
  surtout) ; bornes contradictoires sur le produit cartésien (question m-1spe-b-7) ; anomalies de modèles notées dans
  les notes (f796ffc0 V4 choix identiques, e02fb162 V1 signe manquant, 0d2edda7 réponse figée…). Incident : agents en
  parallèle dans un même dossier temporaire, un a écrasé la liste d'un autre (repris, vérifié).
- **2026-10-23 — Étape e : page à cocher publiée.** Questions mises en forme par un agent Opus (31 dont 2 pour
  information, aucune A_TRANCHER orpheline) ; générateur du collège adapté (une ligne par modèle et programme).
- **2026-10-23 — Page à cocher : recos validées en bloc (David).** « je ne peux pas vérifier à la main c'est trop
  long. je valide tes recos » : les 29 questions = la reco, les 650 verdicts tels quels. Puis, pour la migration :
  (1) **TAG_PAR_VARIATION → pas de tag**, scission des modèles dans un lot à part, après la migration (comme les
  MODIFIER, tagués seulement après modification) ; (2) **tags non confirmés retirés** (≈ 197 des 473, ≈ 92 modèles
  sans tag ; prod : 0 état, 0 journal, 0 exercice sur un point du lycée) ; (3) **question d'accès : personne ne gagne
  d'accès** (aucune règle ne change).
- **2026-10-23 — Recos reportées dans les CSV** (agent Sonnet, contrôlé) : 55 lignes changées, plus aucune
  A_TRANCHER ; 650 lignes = 478 TAG, 60 MODIFIER, 81 TAG_PAR_VARIATION, 31 HORS_PROGRAMME. Choix d'application notés
  dans son rapport : m-1spe-a-3 en TAG_PAR_VARIATION sans répartition par variation ; d683e906 laissé sur 1SPE-355.
  Contrôle des nœuds (`compat-noeuds.py`) : 54 tags sur 538 refusés par le trigger en l'état.
- **2026-10-23 — Nœuds des 54 tags refusés tranchés (David : « je suis tes recos », puis « oui, retrait forcé pour
  les 3 »).** Règle de l'ADR 0020 § 7 (un nœud par modèle, ses points y appartiennent). DEPLACER (R2) : le modèle
  passe sur le nœud de son point — sous-notions sœurs, et groupe A (tous ses tags refusés : 14 modèles, dont les
  tangente/dérivée de exp et dérivée de ln qui quittent leur sous-notion pour Dérivation). RETIRER : eae2ff6a (R1,
  1TECHNO-059 ; à taguer 1SPE-244 une fois re-rangé sur « racines ») ; groupe B, **retrait forcé** (le point décrit
  bien le modèle mais vit sur un autre nœud, conflit entre programmes ; le modèle reste sur son point le plus
  précis) : 12 modèles + 3 détectés au contrôle (e814175b TCOMP-261, 50feeefd TCOMP-229, 4ff9d049 TSPE-618, dont
  le déplacement R2 cassait l'autre tag). Duplication de modèles citée, non retenue. Points qui perdent leur seul
  exercice : 2-232, TSPE-432, TSPE-466, TSPE-596 notamment. Bilan : 32 modèles déplacés, 17 tags retirés, 521 posés.
- **2026-10-23 — Migration des tags écrite (PR 1/2 de l'étape e).** Instantané vérifié par empreintes md5 (MCP) :
  nœuds (699), points du lycée (1 509), modèles (432) et tags (473 = ceux de la migration du 2026-10-13) identiques
  à la prod. Bilan réel (les ≈ 197 / ≈ 92 du 2026-10-23 étaient des estimations d'avant le report des recos) : 463
  tags finaux, 288 actuels gardés, 185 retirés, 175 posés ; 221 modèles touchés, 32 déplacés ; 80 modèles sans tag.
  Ordre : retraits → déplacements → poses, gardes des tags actives. Points (libellés, 2 neufs) : PR 2, à part (elle
  touche aussi les seeds).
- **2026-10-23 — #1632 mergée.** Revues Opus : `security-auditor` sans bloquant (0 donnée d'élève sur ces modèles
  et points, mesuré en prod) ; `code-reviewer` : **bloquant corrigé** — `lock table` refusé par `db push` hors bloc
  de transaction (le test, sous `begin`, ne le voyait pas) → verrous consultatifs des triggers + `for update` ;
  garde étendue à tous les niveaux (prod : 0 tag hors lycée sur ces modèles), garde « + » testée, repose du rollback
  comptée. Preuve hors transaction : `psql -f` (ancienne version 25P01, nouvelle passe). 11 tests, CI verte.
- **2026-10-23 — `db:migrate` de #1632 fait (go de David).** Seule migration en attente en prod. Vérifié par le MCP :
  463 tags du lycée, empreinte = celle calculée depuis la fixture ; nœuds des 432 modèles = empreinte attendue ;
  0 `updated_at` modifié.
- **2026-10-23 — PR 2 de l'étape e écrite.** Question d'accès tranchée par David : personne ne gagne d'accès.
  État prod relu par le MCP (libellés, ordres : TSPE-444 en 200/325, TCOMP-236 en 52/178 ; codes max TSPE-625,
  TCOMP-378). Migration écrite à la main (petite), gardes : libellés actuels exacts, codes neufs libres, nœud
  unique, grades numérotés 1..N avec effectif et jumeau à sa place. Points neufs : attributs du jumeau logarithme
  (rubrique comprise), nœud de 1SPE-294 (Fonction exponentielle > propriétés algébriques), affichés juste après le
  jumeau. `generer-libelles-points.py` écrit la fixture et transforme les seeds. `later-migrations.ts` :
  `undoLaterMigrations(pg, after)` défait seulement ce qui suit une migration ; `passe-points-lycee` lit ainsi
  l'état qu'ELLE laisse. Jouée en local par `db push` (hors test), rollback éprouvé (y compris son refus si un
  usage s'accroche à un point neuf).
- **2026-10-23 — Revues de la PR 2 (Opus).** `security-auditor` et `code-reviewer` : aucun bloquant. Corrigé : le
  rollback verrouille aussi les 4 points renommés et ne rend un libellé que s'il est encore celui de la migration ;
  la vérification finale contrôle `rang` ; `passe-points-lycee` importe `PASSE_LYCEE`. Laissé : refus du rollback
  prouvé sur une seule des 6 tables d'usages (les 6 sont lues par la garde) ; après un rollback, le numéro
  automatique max + 1 redonnerait TSPE-626 / TCOMP-379.
- **2026-10-23 — #1635 mergée, `db:migrate` fait.** CI verte ; seule migration en attente en prod ; vérifiée par le
  MCP (4 libellés, TSPE-626 en 201, TCOMP-379 en 53, nœud exponentielle > propriétés algébriques, grades 1..N).
