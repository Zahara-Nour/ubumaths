---
couvre:
  - 'supabase/migrations/*_arbre_des_notions.sql'
  - 'supabase/migrations/*_seed_classification_nodes.sql'
  - 'supabase/migrations/*_nettoyage_facettes_arbre.sql'
  - 'supabase/migrations/*_tags_modeles_points.sql'
  - 'supabase/migrations/*_scission_points_programme.sql'
  - 'supabase/migrations/*_tags_lot_2bis_*.sql'
  - 'supabase/migrations/*_lot_2bis_scissions.sql'
  - 'supabase/migrations/*_passe_lycee_*.sql'
  - 'supabase/migrations/*_passe_points_lycee.sql'
  - 'supabase/migrations/*_tags_lycee.sql'
---

# L'arbre des notions et les points des programmes

> Versement du chantier « arbre des notions » (2026-10-06 → 2026-10-24) et de la passe lycée. Journaux
> archivés : [arbre-notions](../../archive/wip/arbre-notions-progress.md) (et son dossier
> [arbre-notions/](../../archive/wip/arbre-notions/)), [passe-lycee](../../archive/wip/passe-lycee-progress.md).
> Décisions : [ADR 0019](../../adr/0019-classement-branche-notion-sous-notion.md) (classement, amendé),
> [ADR 0020](../../adr/0020-arbre-central-programmes-pointeurs.md) (arbre central, points, tags) — **à lire avant
> de toucher à l'arbre, aux points ou aux tags**. Le code qui les affiche est décrit dans
> [cours-et-chapitres.md](../cours-et-chapitres.md) (programme, carte, avancement) et
> [questions.md](../questions.md) (fiche d'un modèle). Vérifié contre la base de production le 2026-10-24.

## À quoi ça sert

Un seul classement, purement mathématique, pour tous les contenus et tous les niveaux : **branche > notion >
sous-notion** (termes : [CONTEXT.md](../../../CONTEXT.md)). Les programmes officiels ne sont pas des arbres à part :
un programme (un niveau scolaire) est un ensemble de **points** du BO, chacun posé sur un nœud de l'arbre.

- **Ranger** un contenu = lui donner son nœud (un seul pour un modèle de questions, un ou plusieurs pour un
  exercice). C'est ce que lit le filtre.
- **Taguer** un contenu = lui donner ses points (au plus un par programme pour un modèle, plusieurs pour un
  exercice). C'est ce que lisent la progression de l'élève, la couverture du cahier de texte et l'analytique.
- Un contenu rangé sans point est **hors programme** : il reste trouvable, assignable et jouable.

## Où sont les données

| Quoi                                                     | Où                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Les nœuds (source de vérité)                             | `classification_nodes` — 19 branches, 134 notions, 472 sous-notions actives ; 74 archivées |
| Les points des programmes                                | `curriculum_points` (`node_id` NOT NULL, `grade`, `code`, `display_order`, archivage)      |
| Rangement d'un modèle                                    | `question_templates.classification_node_id`                                                |
| Rangement d'un exercice                                  | `exercise_classifications`                                                                 |
| Tags                                                     | `question_template_points`, `exercise_curriculum_points`                                   |
| Automatismes (référence d'un point d'un autre programme) | `curriculum_point_automatismes`, parcours `grade_predecessors`                             |
| Bornes des points (« seulement »)                        | [bornes/](bornes/) — voir plus bas                                                         |
| PDF officiels                                            | `static/programmes/` (servis par le site)                                                  |

Points actifs en prod le 2026-10-24 (avec au moins un modèle tagué / total) : CP 12/84, CE1 17/107, CE2 13/97,
CM1 21/171, CM2 12/158, 6e 26/111, 5e 18/143, 4e 16/82, 3e 8/66, 2de 36/292, 1re spé 91/237, 1re ens. sci.
14/64, 1re techno 31/143, Tle spé 135/326, Tle comp. 78/179, Tle exp. 60/176, Tle techno 1/92.

`arbre-notions.json` (dossier archivé) est une **copie figée** de l'arbre .16 (2026-10-10), toujours égale à la base
à cette date-ci, mais plus tenue : la base fait foi. ⚠️ Aucun test ne la lit (les seeds ont leur copie sous
`tests/integration/fixtures/`).

## Règles en base

Toutes refusent par une exception en français (triggers, migrations `20261007120000`, `20261007230000`,
`20261013120000`) :

- **Forme de l'arbre** : une notion a une branche pour parent, une sous-notion une notion (trois niveaux au plus) ;
  le genre d'un nœud ne change pas ; pas de nœud actif sous un nœud archivé ; on n'archive pas un nœud qui a des
  enfants actifs.
- **Rangement** : un contenu se range sur une notion ou une sous-notion, jamais une branche ni un nœud archivé.
- **Tag** (« règle 1 ») : le point est sur le nœud du contenu ou sur la notion de ce nœud (pour un exercice : l'un
  de ses nœuds ou leur notion). Un contenu non rangé ne prend aucun point. Les gardes valent dans les deux sens :
  on ne déplace ni un modèle, ni un point, ni une sous-notion si un tag en sortait hors règle — retirer le tag
  d'abord.
- **Un modèle a au plus un point par programme.**
- **Automatismes** : une liste d'automatismes ne référence que des points du parcours du programme (niveaux
  antérieurs de la même voie), sans cycle de parcours.
- **Écriture** : admin seul pour l'arbre et les tags de modèles ; l'auteur pour les tags de ses exercices.
  **Lecture** : l'arbre est public (anon compris) ; les tags se lisent par tout connecté.

## Ranger et taguer : les conventions

Le détail est dans les ADR ; ce qui sert au quotidien :

- **Frontières de classement** : une consigne sur une équation → Algèbre, sur une fonction → Fonctions (second
  degré compris) ; un énoncé sur un vecteur → Vecteurs, sur des points, droites, cercles dans un repère →
  Géométrie repérée ; Arithmétique, Nombres complexes, Matrices, Graphes, Dénombrement, Logique, Ensembles sont des
  branches à part. Nombres et calculs est rangé par type de nombre, l'opération en notion ou sous-notion.
- **Une sous-notion découpe par contenu mathématique**, jamais par activité, registre ou outil (ADR 0020 § 3) :
  ce que l'élève fait, ce sont les points qui le disent.
- **Le BO est immuable** : aucun point n'est créé pour accueillir un modèle. Un modèle qu'aucun point ne décrit
  vraiment n'est pas tagué pour ce programme. Un point peut naître d'une ligne d'automatisme (point ⚙).
- **Un modèle ne s'appauvrit pas pour un autre programme** (2026-10-23) : s'il déborde les bornes du point d'un
  autre programme, il reste sans tag pour ce programme (voir `modeles-autre-programme.csv`, plus bas).
- **Scission** d'un point : seulement si elle donne au moins un point évaluable par un modèle, fidèle au BO, et
  pour toute la famille de points des autres années ; le premier garde son code. Une puce large reste un point
  entier (cochable). Un doublon du BO lui-même s'archive (seul cas : 3-002).
- **Inclusion stricte** : un modèle se tague sur un point quand **toutes** ses variations restent dans les bornes
  du point (dossier [bornes/](bornes/)). Sinon : retirer des variations, scinder le modèle, ou ne pas taguer —
  décision par verdict, validée par David sur une page à cocher, puis migration.
- Le `level` d'une question est une gradation **à l'intérieur** d'un point.

## Les bornes des points

[bornes/](bornes/) dit, point par point, **jusqu'où vont les questions** qu'on peut rattacher au point : la
référence pour écrire un modèle neuf ou vérifier un modèle existant.

- `cycle2.md`, `cycle3.md`, `cycle4.md` (+ `.json`) : primaire et collège, lus en prod le 2026-10-18 ;
  `questions.json` : les questions tranchées par David (force `décision`).
- `lycee/` : 2de, 1re spé, 1re ens. sci., 1re techno, Tle spé, comp., exp., techno (`*.md` + `*.json`,
  `points-lycee.csv` = les points lus) ; `questions-*.json` : décisions de David. Bornes du lycée établies sur le BO
  seul.
- Chaque borne a une **force** : `BO` (écrit dans le programme), `acc.` (document d'accompagnement compatible),
  `déduite` (lecture expliquée), `décision` (choix de David). Le BO prime ; un document plus ancien qui le contredit
  ne borne rien.
- `lycee/generateurs/` et `lycee/page/` : les scripts qui ont produit les fichiers. **Figés** : leurs chemins
  pointent l'ancien worktree `ubumaths-wt-passe-lycee`. Une borne se corrige dans le `.json` et le `.md`, ensemble.

Les codes de points cités par les bornes sont ceux de la base au jour du relevé ; une scission postérieure ajoute
des codes, elle n'en renomme pas.

## Comment étendre

- **Changer l'arbre** (créer, renommer, déplacer, archiver un nœud) : migration, avec question d'accès et tests
  d'intégration (CLAUDE.md § Base de données). Un nœud utilisé ne se supprime pas, il s'archive.
- **Taguer des modèles en masse** : la méthode qui a servi (relevé des modèles → verdicts par point en inclusion
  stricte → page à cocher → migration générée avec gardes tout ou rien et rollback) est décrite dans
  [METHODE.md](../../archive/wip/passe-lycee/METHODE.md) et la consigne
  [CONSIGNE.md](../../archive/wip/passe-lycee/analyse/CONSIGNE.md) de la passe lycée.
- **Pièges** : `supabase start` joue les migrations hors transaction (un `LOCK` seulement dans un bloc `do`) ; les
  points de test `TEST-SK-*` n'ont pas de grade, c'est voulu ; dans un worktree neuf, `svelte-kit sync` avant un
  script `tsx` ; `question:specs --file` convertit par `toQuestionTemplate`.

## Tests

Tests d'intégration sous `tests/integration/` : `seed-classification-nodes`, `seed-curriculum-points-*` (un par
programme), `schema-cible-points`, `scission-points-programme`, `tags-lot-2bis`, `lot-2bis-*`,
`rangements-modeles-exercices`. Leurs données sont des copies figées sous `tests/integration/fixtures/`.

## Écarts connus et suites

État au 2026-10-24, rien ne touche un élève :

- **Couverture faible** des programmes (tableau plus haut), surtout primaire, collège et Tle techno. Points qui ont
  perdu leur seul exercice : 2-232, TSPE-432, TSPE-466, TSPE-596 notamment.
- **46 modèles valables pour un autre programme** que le leur, laissés sans tag (39 MODIFIER, 7 TAG_PAR_VARIATION ;
  25 en 1re techno, 18 en 1re ens. sci.) : [modeles-autre-programme.csv](../../archive/wip/arbre-notions/modeles-autre-programme.csv),
  plus `eae2ff6a` (1TECHNO-059). Aucun modèle n'est aujourd'hui de niveau 1re ens. sci. ni techno.
- **Modèles à vérifier** : 11 sans corrigé ; `c9d6c5db` attend une règle de correction ; termes nuls affichés dans
  des corrigés (`646b4cd3`, `93539700`, `f2cc01fc`) et défauts de rendu relevés à l'audit de #1646 (à relancer) ;
  specs rouges `27d77564`, `103cf8d9`, `e02fb162` ; `9a6087c5` (12 tirages sur 600 en échec, jamais examiné).
- **Laissés sans tag par décision** : QCM de cours et vrai/faux à 4 points ou plus ; `f8ccc8b6`, `a80a780f`,
  `318ea542`.
- **51 exercices ne sont rangés nulle part** : aucun écran ne range un exercice (rangements posés par migration),
  donc ils ne peuvent prendre aucun point.

Chantiers à venir, annoncés par David le 2026-10-24 (non lancés) :

1. Page programme : y inclure les programmes officiels (PDF + transcription ubumark).
2. Page de gestion des questions non taguées.
3. Écriture des modèles qui complètent les programmes et les approfondissements.
4. Vérification des modèles actuels (corrections, rendu…) — reprend la liste « Modèles à vérifier ».
