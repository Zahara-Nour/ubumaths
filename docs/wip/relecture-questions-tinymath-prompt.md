# Prompt — Relecture et import des anciennes questions TinyMath par Claude

> Rédigé le 2026-09-26 à la demande de David. À coller tel quel dans une **nouvelle session**
> (depuis `/Users/david/Coding/js/ubumaths`). La carte du circuit (§ « Ce qui existe ») a été
> vérifiée ce jour-là dans le code et en base (lecture seule) ; la re-vérifier si du temps a passé.

---

## Le prompt

Tu reprends la migration des **633 anciennes questions TinyMath** vers le nouveau système de
questions (`question_templates`). David (enseignant, propriétaire de l'application) en a relu 41
puis a manqué de temps ; **il te confie la relecture, la vérification et la validation** des
questions en attente, jusqu'à leur import en base. Tu travailles en français avec lui.

Lis d'abord `CLAUDE.md` (règles non négociables : worktree, branche → PR → CI verte → merge,
contrainte mémoire, pas de `pnpm check`/`lint`/`build`, `check:incremental`, prod avec des
données d'élèves mineurs) et ta mémoire (`project_migration-questions-tinymath`).

### Objectif

Chaque question en attente aboutit à UN verdict tracé :

- **approuvée** telle que transformée ;
- **corrigée puis approuvée** (version corrigée enregistrée) ;
- **rejetée**, avec la raison ;
- **à arbitrer par David** (doute pédagogique, pas technique), avec la question précise à lui poser.

Les approuvées sont importées dans `question_templates` en **`status: 'draft'`** (invisibles des
élèves d'après la RLS). **Ne jamais importer en `published`** : David publie lui-même. Un
brouillon peut porter `"status":"published"` dans une version corrigée (cas de #28) : forcer `draft`.

### Ce qui existe (vérifié le 2026-09-26)

**Données**

- Source unique : `.claude/old-questions.json` (633 questions ; index = `_migration.globalIndex`).
  Lecteur : `src/lib/migration/question-data-loader.ts`.
- Transformateur : `transformQuestion(oldQuestion, index)` dans
  `src/lib/migration/question-transformer.ts` (+ `validateTransformedTemplate`). Il rend un
  template camelCase en `status: 'draft'`, **sans `testSpecs`**.
- Exports de relecture : `data/migration-output/export-YYYY-MM-DD/` (dernier : 2026-02-22 ; peut
  ne plus correspondre au transformateur actuel).

**Suivi (base de prod)**

- `migration_tracking` : `old_question_hash` (clé d'upsert), `old_question_index`,
  `migration_status` ∈ {pending, converted, imported, validated, failed}, `review_status` ∈
  {pending, approved, rejected}, `reviewed_by`, `reviewed_at`, `new_template_id`,
  `conversion_errors`…
- `migration_edits` : version corrigée par question (`edited_json`, `old_question_hash` unique).
- État : **41 lignes** (index 0–20, 25–33, 96–106, toutes du thème Entiers). 40 en
  `migration_status='validated'` (ancien schéma = approuvées par David), #20 en `converted`
  (seulement éditée). **Toutes en `review_status='pending'`**. Les 41 ont une version corrigée
  dans `migration_edits`, souvent avec des `testSpecs` écrits par David. **`question_templates` :
  2 brouillons.** Restent **592** questions jamais relues.

**Interface de relecture de David** : `src/routes/(protected)/dashboard/admin/migration/…`
(comparaison ancienne/transformée, instances générées, `TestSpecBatchRunner`) ; endpoints
`POST /api/migration/questions/[globalIndex]/approve | edit | reject`. Bogues connus :
l'affichage lit encore `migration_status` (une approbation actuelle « disparaît » après
rechargement) ; `approve` passe un `editedJson` que `recordQuestionProcessed` ignore. Les endpoints
réécrivent aussi `.claude/migration-state.json` et `.claude/migration-progress.md`.

**Vérification automatique** : `src/lib/questions/test-spec-runner.ts` (`runTestSpec`,
`runAllTestSpecs`) — instance à variables fixées (`generateInstanceWithFixedVariables`) puis
`validateAnswer`, comparés à `expected.status` (correct / incorrect / unoptimal_form / bad_form /
empty). Spec : `{variables, variationIndex, answers | selectedChoices, expected:{status,
constraintViolations?}, description}`. **Aucune commande en ligne** ne lance les specs d'un template.

**Publication — CASSÉE, ne rien lancer tel quel**

- `scripts/migrate-questions-phase1.ts` (`--publier`, sinon simulation) filtre bien
  `review_status='approved'` et `new_template_id` (anti-doublon), MAIS : il **re-transforme** depuis
  `old-questions.json` et **ignore `migration_edits`** (les corrections de David seraient perdues) ;
  il insère le template camelCase dans des colonnes snake_case et n'écrit jamais `test_specs` ; en
  `--publier` il crée d'abord 633 lignes de suivi ; son filtre « phase 1 » exclut les questions à
  images, `testAnswerss`, conditions, `$l{`, variables imbriquées.
- ⛔ `scripts/import-questions-to-db.ts` / `pnpm migration:import` **écrit par défaut** et importe
  TOUT l'export sans relecture. **Ne jamais le lancer.**
- ⛔ `scripts/validate-phase1-questions.ts` : obsolète (champs v1) et **écrit** en base sans simulation.
- `scripts/sql/report-verdicts-relecture.sql` (reporter les 40 verdicts vers `review_status`)
  n'a **jamais** été lancé.
- `scripts/rollback-migration.ts` filtre sur des colonnes NULL en prod ; `pnpm
migrate:phase1:rollback` est une simulation.
- `docs/wip/question-migration-status.md` est **périmé** (recommande des commandes dangereuses,
  renvoie à des docs absentes) : ne pas le suivre, le corriger à la fin.

### Plan (Phase 0 d'abord — CLAUDE.md § Planning)

**Phase 0 — Spécification, à valider par David avant tout code.** Propose en français, avec
cas nominal / limite / erreur :

1. la **grille de relecture** (ci-dessous), à compléter si besoin ;
2. le **chemin d'import sûr** : un seul script neuf, en simulation par défaut (`--publier` pour
   écrire), qui part de la version CORRIGÉE (`migration_edits.edited_json`, sinon transformation
   actuelle), convertit en colonnes snake_case, écrit `test_specs`, force `status='draft'`,
   n'importe que `review_status='approved'` sans `new_template_id`, exige que TOUTES les
   `testSpecs` passent, écrit `new_template_id` et relit chaque ligne écrite (`.select()` : la RLS
   échoue en silence), rejouable sans doublon ;
3. une **commande en ligne** qui lance `runAllTestSpecs` sur un template (depuis un fichier ou la
   base) ;
4. le **traitement des 41** de David : ses verdicts font foi (40 approuvées + #20 à finir) ; tu ne
   rejuges pas leur contenu, tu fais passer leurs `testSpecs` et tu reportes `review_status` ;
5. où stocker TES verdicts : mêmes tables (`migration_tracking.review_status`, `reviewed_by` =
   l'identifiant de David — lui demander s'il préfère un marqueur « relu par Claude » dans
   `conversion_notes`), versions corrigées dans `migration_edits` ;
6. le découpage en **lots** (par thème/sous-domaine, ~20 à 40 questions) et le **lot pilote**
   (par ex. un sous-domaine de niveau collège), que David contrôle avant la suite.

Ce sont des écritures de CONTENU en prod (pas de schéma) : pas de migration SQL nécessaire a priori.
Si une migration s'avérait utile, suivre les 4 conditions de CLAUDE.md et poser la question d'accès.

**Phase 1 — Outillage** (branche + PR, tests d'abord) : commande de tests de specs, script
d'import sûr, correctifs de l'interface si David le demande (affichage du verdict, `editedJson`).
Mettre hors d'état de nuire les commandes dangereuses (`migration:import`, `validate-phase1`) : les
faire passer en simulation par défaut ou les retirer — **demander à David**.

**Phase 2 — Les 41 de David**, puis **lot pilote**, rapport à David, ajustements.

**Phase 3 — Lots suivants**, en autonomie, un rapport court par lot. Import en `draft` au fil de
l'eau ou par lots validés — **selon ce que David décide en Phase 0**.

Tenir `docs/wip/relecture-questions-progress.md` (commité dès le premier commit) : lots faits,
compteurs par verdict, questions « à arbitrer », décisions de David, pièges rencontrés.

### Grille de relecture (par question)

1. **Fidélité** : la question transformée dit la même chose que l'ancienne (énoncé, consigne,
   variantes `enounces2`, choix de QCM, images, unités).
2. **Mathématiques** : la réponse attendue est JUSTE — la recalculer indépendamment (sympy ou
   calcul exact) sur plusieurs instances, y compris aux bornes des variables.
3. **Variables** : tous les tirages donnent une question valide (pas de division par zéro, pas de
   cas dégénéré, conditions respectées, pas d'énoncé absurde) ; générer un nombre suffisant
   d'instances (≥ 50, bornes comprises) avec `generateInstance`.
4. **Validation des réponses** (les élèves sont corrigés automatiquement : une bonne réponse
   refusée est le pire défaut) : écrire des `testSpecs` qui prouvent que la bonne réponse est
   acceptée sous ses formes équivalentes raisonnables, que les erreurs typiques sont refusées, et
   que les contraintes de forme (`requiredForm`, précision, unités, zéros superflus) se comportent
   comme annoncé. Toutes doivent passer.
5. **Rendu** : aucune erreur rouge ni lettre découpée à l'écran (voir `pnpm check:ubumark` et
   `docs/ref/fiches-exercices.md` § 4 pour la notation) ; correction lisible.
6. **Métadonnées** : niveau (`grades`), thème/domaine/sous-domaine, `level` cohérents.
7. **Pédagogie** : énoncé clair et correct en français, vocabulaire du programme
   (`feedback_pedagogical-terminology` en mémoire). En cas de doute de fond → « à arbitrer ».

Toute correction : la plus petite possible, notée (quoi et pourquoi) dans `migration_edits.edit_notes`.

### Règles

- **Ne jamais** lancer `pnpm migration:import`, `scripts/import-questions-to-db.ts`,
  `scripts/validate-phase1-questions.ts`, ni un script qui écrit en base sans l'avoir lu en entier.
- Tout script d'écriture : simulation par défaut, base de prod vérifiée, sauvegarde avant écriture,
  relecture des lignes écrites, rejouable. Aucune suppression sans accord explicite de David.
- `.claude/old-questions.json` est la source figée : ne pas le modifier. Les endpoints et
  `MigrationStateManager` réécrivent `.claude/migration-state.json` : tout test passe un chemin
  temporaire.
- Vérifier avant d'affirmer : un « 0 erreur » d'un outil n'est une preuve que s'il montre combien
  d'éléments il a analysés.
