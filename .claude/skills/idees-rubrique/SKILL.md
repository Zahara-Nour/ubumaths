---
name: idees-rubrique
description: Reprendre les idées d'exercices d'une rubrique d'une autre plateforme pour compléter nos modèles de questions d'un niveau (relevé, phase 0, gros lot de modèles neufs et de variations de modèles publiés, relecture dans /dev/modeles), une rubrique par session pour travailler en parallèle. Utiliser quand David dit « prends la rubrique fonctions de Seconde », « idées de la rubrique X en 4e », « une session par rubrique », ou tape /idees-rubrique. Exige le niveau et la rubrique.
---

# Idées d'une rubrique, une session par rubrique

Ce skill découle du chantier `ensembles-2de` ([journal](../../../docs/archive/wip/ensembles-2de/ensembles-2de-progress.md)),
qui a couvert les rubriques « nombres et calculs » de Seconde. Chaque session prend **une rubrique d'un
niveau** et la mène jusqu'à la publication. Pour la démarche des lots, il s'appuie sur
[couvrir-un-niveau.md](../../../docs/pratiques/couvrir-un-niveau.md) (étapes, gabarits, pièges du § 9).
Le tableau des rubriques prises, c'est
[idees-ailleurs-repartition.md](../../../docs/wip/idees-ailleurs-repartition.md).

## ⛔ Le nom de la plateforme

**Aucune trace, nulle part** : ni dans un message de commit, une branche, une PR, un artefact, ni
dans **aucun fichier** du dépôt (commentaire, exemple, test compris). Les gardes refusent les
messages de commit (hook `commit-msg`), le contenu des fichiers et leurs chemins (pre-commit et
CI) : voir [git-workflow.md § Noms interdits](../../../docs/pratiques/git-workflow.md#noms-interdits).
Seuls le **nom de branche** et le **titre ou le corps d'une PR** ne sont pas gardés : les choisir
sans le nom. Dans les messages, on écrit « idées reprises d'ailleurs », « l'autre plateforme ».

## La copie locale des exercices

On lit les exercices **dans la copie locale nettoyée**, jamais sur la forge en ligne :
`/Users/david/Coding/js/ubumaths/extern/banque-exercices/`, dans le dépôt principal. Ce dossier est
ignoré par git ; depuis un worktree, on y accède par ce chemin absolu.

- Les exercices sont sous `src/exercices/<niveau>/` et les « flash » sous `src/exercices/can/`.
  Les rubriques et leurs titres sont dans `src/json/` (`codeToThemeList.json`, `allExercice.json`).
- ⛔ On ne copie rien de ce dossier dans le dépôt. Son code est sous une autre licence, et on ne
  garde que des idées. Tout le code est à réécrire.
- On ne fait que lire les fichiers, jamais les exécuter. Le rafraîchissement est décrit dans la
  mémoire `reference_source-plateforme-exercices` ; on ne le lance que sur demande de David.

## 0. Prendre la rubrique

1. Sans niveau ou sans rubrique : lire le tableau de répartition, proposer les rubriques libres du
   niveau, demander. Rubrique absente du tableau, ou niveau absent : lister le dossier du niveau dans la copie
   locale, regrouper par préfixe (`2F`, `4G`…), ajouter les lignes au tableau.
2. **Réserver** dans le dépôt principal :
   1. `git pull --rebase` ;
   2. passer la ligne à « prise » avec le sujet et la date ;
   3. commit direct sur `main` ;
   4. push aussitôt.

   Push refusé (une autre session a poussé avant) : `git pull --rebase`, relire la ligne. Si elle est
   prise, en choisir une autre.
3. Le sujet est `idees-<niveau>-<rubrique>` (ex. `idees-2de-fonctions`). Il nomme le worktree
   `../ubumaths-wt-<sujet>`, le journal `docs/wip/<sujet>-progress.md` (bloc « Reprendre ici ») et la
   session (David : `/rename <sujet>`).
4. Un worktree ne sert qu'à une PR. Pour la PR suivante, en créer un nouveau sur `origin/main`, sous
   le même sujet.

## 1. Relevé (lecture seule)

- Lire le **code source** de chaque exercice de la rubrique dans la copie locale. Les cas tirés,
  les valeurs et les réponses s'y lisent mieux qu'à l'écran. Les `-old` et les `Old` sont ignorés.
- Comparer avec nos modèles **de tous les niveaux**, relevés en prod (MCP en lecture seule) : titres,
  variations, pools. Le BO du niveau se trouve sous `src/lib/server/programmes/transcriptions/`.
- Écrire le relevé dans `docs/wip/<sujet>-releve.md`, sur le gabarit de
  [ensembles-2de-releve-nombres.md](../../../docs/archive/wip/ensembles-2de/ensembles-2de-releve-nombres.md). Une ligne par
  exercice : ce qu'on demande, forme de réponse, nos modèles, verdict ✅ / 🟡 / ❌.
- Une grosse rubrique peut se répartir entre des agents (`model: sonnet`, 10 à 15 exercices chacun,
  brief borné). Je relis leurs verdicts **dans le code**, pas dans leur résumé.

## 2. Phase 0 (attendre David)

- Une **fiche par idée**, avec ma recommandation : nouveau modèle, variation d'un modèle publié,
  variation d'un brouillon, ou rien. Pour chacune : point (un seul, ADR 0020), sous-notion,
  variations, plages, forme de réponse. Le tout va dans une page à cocher en artefact (capacité `db`) :
  c'est son seul usage, les verdicts de relecture viennent de `/dev/modeles` (§ 5).
- **On reprend l'idée, jamais la forme.** Chaque fiche dit « chez eux → chez nous » : la meilleure
  forme que **notre** format permet, choisie dans le catalogue des cases réponses, des blocs et des
  gestes ([couvrir-un-niveau.md § 3 bis](../../../docs/pratiques/couvrir-un-niveau.md), liste
  complète : table « Natures de réponse » de [questions.md § 4](../../../docs/systeme/questions.md)). Exemples :
  un QCM chez eux devient une saisie jugée par nos règles quand la réponse se tape ; « placer un
  point » devient le geste `placer:` sur une droite ou un repère ; une réponse sous une forme imposée
  passe par `requiredForm` ou les règles de validation, pas par une comparaison de texte. Leur forme
  n'est gardée que si la nôtre ne fait pas mieux, et la fiche le dit.
- Le relevé note aussi ce que **leur** format fait et que le nôtre ne sait pas faire (une forme de
  réponse, un affichage). C'est une idée d'outil : `outils-manquants.md`, jamais contournée en
  silence dans un modèle.
- **Hors programme** : la fiche est gardée, le modèle est rangé **sans point**, si David le veut.
  Pour le Seconde, il l'a voulu le 2026-11-20.
- Un outil manque ? Le proposer, et l'ajouter à `docs/wip/outils-manquants.md` (jamais une liste à
  part).
- **Question d'accès** de la migration (en général : personne, on range des modèles).
- Une question sans réponse n'est pas tranchée. Tout consigner dans le journal.

## 2 bis. Programme et bornes (comme `couvrir-niveau`)

Une idée reprise d'ailleurs n'est pas forcément au programme du niveau, ni dans ses bornes :
leur rubrique de Seconde déborde parfois sur la 3e ou sur la 1re. Avant d'écrire, et de nouveau
avant la migration de rangement :

- **Le bon point** : chaque idée au programme reçoit **un** point (ADR 0020), celui du niveau du
  modèle ou d'un niveau **suivant** (permis), jamais d'un niveau précédent. Une idée d'un autre
  niveau va à ce niveau : `grades` porte les deux niveaux, et la fiche le dit.
- **Les règles du tag**, vérifiées en base avant d'écrire la migration (`couvrir-un-niveau.md` § 9) :
  un seul point par programme sur un modèle, et le point **sur le nœud du modèle ou sur sa notion**
  (`question_template_points_check_rules`). Un tag qui les viole est refusé à la migration.
- **Les bornes** : `docs/systeme/programmes/bornes/` (cycles 2 à 4, `lycee/` pour le lycée). Chaque
  variation se vérifie contre les bornes de son point : **plages tirées ET notions du corrigé**
  (`pnpm question:specs --template <uuid> --apercu 5` montre des tirages réels). Une plage qui
  déborde se resserre ; une notion du corrigé hors programme se réécrit.
- **Hors programme** (David l'a voulu pour la Seconde) : le modèle est rangé **sans point**, et la
  fiche dit pourquoi (ce que le BO exclut, citation de `src/lib/server/programmes/transcriptions/`).
  Jamais un tag approximatif pour éviter le « sans point ».
- **Garde des niveaux** avant la publication : `pnpm tsx scripts/questions/garde-niveaux-tags.ts`
  (code 1 si un modèle tagué d'un point n'a pas le niveau de ce point dans `grades`).

## 3. Écrire le gros lot

Tout le lot part d'un coup, pas un cycle par modèle (mémoire `feedback_gros-lots-de-modeles`).

- **Modèles neufs** : script `docs/wip/questions/<sujet>-<x>.py` → `scripts/questions/<sujet>-<x>/`.
  Chaque modèle et chaque variation ajoutée a ses **`testSpecs`** : des réponses justes sous
  plusieurs écritures (acceptées) **et** les erreurs typiques des élèves (refusées), comme dans
  `couvrir-un-niveau.md` § 5, et ces erreurs typiques deviennent des **erreurs prévues** de la
  case (réponse + message à l'élève, même §), que le prof complète ensuite : **trois par case**
  visées (QCM possible), message écrit sous sa forme réécrite (`$10^3$`, `$b - a$`). Chaque
  variation a son **coup de pouce** (`hint`, ou `hintFromFirstStep`), qui ne donne jamais la
  réponse (lu par la prod depuis la 0.101.0, 2026-11-22). Forme : faits vérifiés du même § (motif qui compare
  deux parties, case unique, pas de Oui / Non au hasard, consigne qui dit ce qu'elle refuse,
  réglages du modèle fixés dès la création). Une variation sans spec ne part pas. `create-questions` en
  simulation, `question:specs`, puis essai dans la base **locale**, modèle joué dans l'aperçu
  (réponse juste acceptée, erreur typique refusée).
  ⚠️ `--publier` en local écrit les ids locaux dans les fichiers : les restaurer (`git restore`)
  après avoir vérifié que le diff ne porte que les ids.
- **Variations d'un modèle publié** :
  1. **Réserver le modèle** dans le tableau, comme une rubrique. S'il est déjà pris, noter l'idée
     dans la ligne de la session qui le tient, ou dans « Idées en attente ».
  2. Exporter le modèle de prod dans `scripts/questions/<sujet>-publies/`.
  3. Ajouter les variations **à la fin**.
  4. `pnpm tsx scripts/questions/migration-contenu.ts --dir …` produit la migration, la garde et la
     fixture.
- Niveaux numérotés : les relever en prod juste avant la migration de rangement. Une autre session a
  pu publier dans la même sous-notion entre-temps.

## 4. En prod (David écrit, je vérifie)

1. David lance `create-questions --publier` (brouillons). Je commite les ids écrits en tête des
   fichiers.
2. Migrations de rangement (nœud + tag) et de contenu, **générées** toutes les deux, avec leur
   fixture (aucun test à écrire) : champ `rangement` dans les fichiers puis
   `scripts/questions/migration-rangement.ts --dir …` (modèle neuf : `{ noeud, point }` ; modèle
   publié qui gagne un niveau ou un tag : `{ niveauxAjoutes, pointsAjoutes }` ; un point par
   programme : `"point": ["1SPE-…", "1TECHNO-…"]`), et `migration-contenu.ts --dir …`.
   `security-auditor` sur la PR.
3. `db:migrate` selon les 4 conditions de `CLAUDE.md`. ⚠️ Avec plusieurs sessions,
   `migration list --linked` d'abord : si **une autre** migration est en attente, stop.

## 5. Relecture dans `/dev/modeles`, puis publication

- La relecture se fait dans `/dev/modeles`, pas sur la page à cocher seule (mémoire
  `feedback_relecture-dans-dev-modeles`). Pour les brouillons : `?noeud=` ou `?point=`. Pour les
  publiés complétés : une série de relecture (`scripts/series/creer-serie.ts`, 50 modèles au plus,
  David la publie).
- Je lis les verdicts « À revoir » et leurs commentaires en base (`question_template_reviews`,
  `reviewed_at` postérieur au lot), je les compte, je corrige, puis
  `publier-lot.ts --dir …` en simulation, et David le lance avec `--publier`.

## 6. Finir

- Dans le tableau de répartition : rubrique « publiée », réservations de modèles levées.
- Journal versé selon `couvrir-un-niveau.md`. Les idées reportées (« plus tard ») restent dans le
  tableau, section « Idées en attente ».

## Pièges du parallèle

- **Base locale, serveurs, verrous** :
  - Une seule base Supabase locale pour toutes les sessions. Verrou `supabase` : exit 2 = attendre.
  - Port de dev : 5176 ou plus, libre (`lsof -i :<port>`).
  - Jamais `pnpm kill:servers`.
- **Main partagé** : `git pull --rebase` avant chaque commit de doc, `git commit -- <mes fichiers>`.
- **CI** : un lot de modèles allonge la CI. Mesurer les jobs, ne rien promettre
  (mémoire `feedback_ci-longue-mesurer-pas-promettre`).
