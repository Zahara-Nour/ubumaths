# Révisions espacées (SRS / FSRS)

> Remplace les sept fichiers de [`srs/`](../archive/systeme-2026-06/srs/README.md) (juin 2026, archivés), écrits au temps de la
> « famille A » du référentiel, abandonnée ([ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md)).
> Vérifié contre le code le 2026-10-10.

## À quoi ça sert

Faire revenir une question au moment où l'élève est sur le point de l'oublier. Chaque
**modèle de question** répondu par un élève a une **mémoire de révision** (difficulté,
stabilité, prochaine échéance) calculée par l'algorithme **FSRS-6**. Les révisions se font par
**paquets** (decks) de cartes, notées Again / Hard / Good / Easy (1 à 4).

Termes ([CONTEXT.md](../../CONTEXT.md)) : **SRS / révision**, **Deck** (paquet), **Auto-évaluation**,
**Question de cours**, **Carte de cours**, **Flash-cards**, **Tentative**, **Point du programme**.
⚠️ « Mode Révision » d'une série = _en classe_, rien à voir avec le SRS.

Quatre sortes de paquets :

| Paquet                   | Où il vit                                                         | Qui le remplit                                             |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| **Personnel**            | `srs_decks` (`is_assigned = false`, `is_auto_managed = false`)    | l'élève (ou le prof pour ses paquets sources)              |
| **Assigné**              | `srs_decks.is_assigned = true`, `source_deck_id` = paquet du prof | le serveur, en COPIANT le paquet du prof pour chaque élève |
| **Programme**            | `srs_decks.is_auto_managed = true`, un seul par élève             | le serveur seul, à chaque réponse sur un modèle tagué      |
| **Paquet d'un chapitre** | rien en base : **calculé** à chaque usage                         | personne — dérivé des séries publiées du chapitre          |

## Carte du code

### Cœur algorithmique — `src/lib/srs/`

| Fichier            | Rôle                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `fsrs.ts`          | Classe `FSRS` (21 paramètres `w`, `initCard`, `reviewCard`, `calculateRetrievability`, `calculateInterval`). Pur, sans base.              |
| `config.ts`        | `DEFAULT_FSRS_PARAMS`, `RETENTION_PROFILES`, `DEFAULT_DESIRED_RETENTION` (0,9), `DEFAULT_MAXIMUM_INTERVAL` (36 500 j), `GRADE_LABELS`.    |
| `types.ts`         | `Grade` (enum 1-4), `CardState` (`new`/`learning`/`review`/`relearning`), `CardStats`, `ReviewHistoryEntry`, `ReviewSnapshot`, `Deck`…    |
| `generator.ts`     | `generateSRSInstance(template)` : une nouvelle graine à chaque révision (la question varie).                                              |
| `review-source.ts` | `ReviewSource` (`deck` ou `chapter`) → `dueUrl`, `submitRequest`, `toSessionPayload` : l'écran de séance ignore d'où viennent les cartes. |

### Serveur — `src/lib/server/srs/`

| Fichier                    | Rôle                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fsrs-actions.ts`          | **Seul écrivain de la mémoire** : `applyFsrsReview` (lit → `reviewCard` → écrit), `loadOrInitCardStats`, `upsertCardStats` (client service).                        |
| `best-of-day.ts`           | `reviewBestOfDay` : auto-évaluation, un seul résultat par jour et par question, le meilleur ([ADR 0016](../adr/0016-auto-evaluation-meilleur-resultat-du-jour.md)). |
| `srs-attempt.ts`           | `recordSrsReviewAttempt` : la trace `skill_attempts` (source `srs`) d'une révision de modèle.                                                                       |
| `record-series-reviews.ts` | `recordSeriesReviews` : FSRS + Programme pour une séance de série (`/api/tests/save`) ou une évaluation (`evaluation-attempts.ts`).                                 |
| `programme-deck.ts`        | `ensureProgrammeDeck`, `ensureProgrammeDeckCard` : crée le paquet Programme et y ajoute une carte, au client service, idempotent (23505 = déjà là).                 |
| `programme-deck-rule.ts`   | `entersProgrammeDeck` : la règle unique d'entrée au Programme (modèle publié, jamais une question de cours — décision Q113).                                        |
| `chapter-deck.ts`          | Paquet calculé d'un chapitre : `loadChapterDeck`, `loadChapterDecks`, `selectChapterSession`, `summarizeChapterDecks`, `CHAPTER_SESSION_NEW_LIMIT` (10).            |
| `deck-copy.ts`             | Copie d'un paquet assigné : `planDeckCopies`, `planSectionCopies`, `resolveCardSection`, `findAssignedDeckCopy` (par `source_deck_id`, jamais par le nom).          |
| `capacity-badge.ts`        | Badge de mémoire d'un point du programme : `templateToBadge`, `worstBadge`, `aggregateBadge` (purs), `computePointBadges` (lit la base).                            |

Validation Zod : `src/lib/server/validation/srs.ts` (paquets, cartes, sections, `submitReviewSchema`,
`dueCardsQuerySchema`, `chapterReviewSubmitSchema`…) et `src/lib/server/validation/skill-attempts.ts`.

### Composants — `src/lib/components/srs/`

`ReviewSession.svelte` (la séance, pour toute `ReviewSource`) · `FSRSButtons.svelte` (les 4 notes) ·
`CustomFlashCard.svelte` / `CustomCardEditor.svelte` (cartes libres recto/verso) ·
`TemplateSelector.svelte` (ajouter un modèle à un paquet) · `DeckCard.svelte` (liste des paquets) ·
`CapacityFsrsBadge.svelte` (badge de mémoire, utilisé par `ObjectifsPanel.svelte` et
`dashboard/student/objectifs/[id]`).

### Routes API

| Route                                          | Méthodes                     | Rôle                                                                                                  |
| ---------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `api/skill-attempts`                           | POST                         | Réponse à une question interactive : FSRS **puis** trace (`auto` ou `student_self`), puis Programme.  |
| `api/srs/review/due`                           | GET                          | Cartes dues d'un paquet (RPC `get_due_cards_for_deck`), filtres `states` et `all` (révision forcée).  |
| `api/srs/review/submit`                        | POST                         | Révision d'une carte de paquet : FSRS, trace `srs`, Programme, statistiques `srs_review_sessions`.    |
| `api/srs/chapters/[chapterId]/due`             | GET                          | Séance du paquet calculé d'un chapitre (élève seul).                                                  |
| `api/srs/chapters/[chapterId]/submit`          | POST                         | Réponse dans ce paquet : recalcul du paquet (modèle hors paquet → 403), FSRS meilleur-du-jour, trace. |
| `api/srs/decks`, `api/srs/decks/[id]`          | GET, POST / GET, PUT, DELETE | Paquets ; un paquet assigné ne se modifie ni ne se supprime. Statistiques par RPC `get_deck_stats`.   |
| `api/srs/decks/[id]/assign`                    | POST                         | Prof : copie le paquet pour chaque élève (cartes, sections, mémoire), au client service.              |
| `api/srs/decks/[id]/sections`, `…/[sectionId]` | GET, POST / PATCH, DELETE    | Sections manuelles d'un paquet personnel.                                                             |
| `api/srs/cards`, `api/srs/cards/[id]`          | GET, POST / GET, PUT, DELETE | Cartes ; 403 sur un paquet assigné (création et modification : aussi sur le Programme).               |

### Pages

- Élève, `src/routes/(protected)/dashboard/revisions/` : liste des paquets + une entrée par chapitre
  visible (`+page.server.ts`), `create/`, `decks/[id]/` (sections et cartes), `decks/[id]/study/`
  (séance, `?states=`), `decks/programme/` (Programme en 4 sections), `chapitres/[chapterId]/`.
- Prof, `src/routes/(protected)/dashboard/teacher/srs/decks/` : `create/`, `[id]/edit/`,
  `[id]/assign/`, `[id]/assignments/` (copie de chaque élève par `findAssignedDeckCopy`).

### Anti-triche — `src/lib/server/anti-fraud/`

`detectors.ts` (5 détecteurs purs + `composeSignals`) · `runner.ts` (`runAntiFraudJob`) · `types.ts` ·
`index.ts`. Validation : `src/lib/server/validation/anti-fraud.ts`. Routes :
`api/admin/anti-fraud/run` (POST, admin), `api/teacher/classes/[classId]/anti-fraud/flags`
(GET), `…/flags/[flagId]` (PATCH, « Marquer comme OK »), `…/anti-fraud/count` (GET), gardées
par `requireTeacherOfClass`. UI : `src/lib/components/teacher/anti-fraud/`
(`AntiFraudFlagsList`, `FlagDetailsDialog`, `AntiFraudFilters`), onglet « Surveillance » de
`dashboard/teacher/classes/[classId]/analytics`.

## Le modèle

### FSRS et la mémoire

- Une mémoire par (élève, type, référence) : `srs_card_stats`, unique sur
  `(user_id, card_reference_type, card_reference_id)`. Type `template` → la référence est l'id du
  **modèle** ; type `custom` → l'id de la carte libre. **La mémoire d'un modèle est partagée
  entre tous les paquets** (Programme, paquet assigné, paquet du chapitre — décision Q165) :
  réviser une question dans un paquet avance son échéance partout.
- Première révision : `loadOrInitCardStats` part de `FSRS.initCard()` (stabilité 0).
- `review_history` (JSONB) garde chaque révision ; pour une auto-évaluation, l'entrée porte
  aussi `before`, l'état de la fiche juste avant (ce qui permet de la remplacer dans la journée).
- Tous les chemins instancient `new FSRS()` : paramètres et rétention **par défaut**
  (0,9). `deck.config` n'est plus lu à la révision (décision du 2026-06-10).

### Note ↔ réussite

| Chemin                                      | Note FSRS                                                   | Trace `skill_attempts`                 |
| ------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| Question interactive (`api/skill-attempts`) | juste → Good (3), faux → Again (1)                          | `success`, source `auto`               |
| Carte de cours (même route)                 | idem, **meilleur du jour**                                  | source `student_self` (toutes gardées) |
| Révision d'un paquet / d'un chapitre        | note choisie (1-4)                                          | `success = note ≥ 2`, source `srs`     |
| Série, évaluation (`recordSeriesReviews`)   | juste → Good, faux → Again ; flash-cards = meilleur du jour | `auto` ou `student_self`               |

Le trigger `skill_attempts_after_insert` recalcule ensuite `student_point_state` pour chaque
point tagué du modèle (`question_template_points`) via `update_student_point_state`. Il ne
touche jamais `srs_card_stats` : **FSRS n'existe qu'en TypeScript**.

### Paquet Programme

Créé à la première réponse sur un modèle tagué à un point du programme ; nom « Programme » ;
un par élève (index unique `uq_srs_decks_one_programme_per_owner`). Une carte y entre si le modèle
est tagué **et** `entersProgrammeDeck` (publié, pas une question de cours). Trois portes
d'entrée, une seule règle : `api/skill-attempts`, `api/srs/review/submit`, `recordSeriesReviews`.
Le paquet d'un chapitre n'ajoute **rien** au Programme.

La page `decks/programme` range les cartes en 4 sections calculées à la lecture
(`templateToBadge`) ; « À remédier » et « À renforcer » lancent une séance filtrée
(`?states=learning,relearning`, `?states=review`) :

| Badge                | Règle (par carte)                                |
| -------------------- | ------------------------------------------------ |
| `a_remedier`         | échue, état `learning` ou `relearning`           |
| `a_renforcer`        | échue, état `review`                             |
| `en_apprentissage`   | état `new`, ou `learning`/`relearning` non échue |
| `acquise_en_memoire` | état `review` non échue                          |

Sur un point du programme (`computePointBadges`), le badge est le **pire** de ses modèles
(`worstBadge`, ordre ci-dessus), `non_commencee` s'il n'en a aucune mémoire. Il s'affiche **à
côté** du verdict d'acquisition du référentiel (`student_point_state`) : les deux peuvent
diverger sans se contredire (acquis, mais en train d'être oublié).

### Paquets personnels, sections

Sections manuelles dans `srs_deck_sections` (nom 1-50 caractères, unique par paquet) ;
`srs_cards.section_id` NULL = « non rangée ». Pas de section sur un paquet assigné ni sur le
Programme (RLS). Supprimer une section libère ses cartes (`ON DELETE SET NULL`).

### Paquets assignés

`api/srs/decks/[id]/assign` crée une copie par élève (`planDeckCopies`, `source_deck_id` posé),
recopie les sections (`display_order` renuméroté : c'est la clé qui retrouve la copie d'une
section, `srs_cards` n'ayant pas de clé étrangère `(section_id, deck_id)`), les cartes, puis
`srs_deck_assignments` (seule trace de l'assignation, obligatoire) et enfin la mémoire.
Un chapitre peut désigner un paquet SOURCE (`chapter_decks`, modes algorithme / toutes les
cartes) ; chaque élève y résout sa copie par `source_deck_id`.

### Paquet d'un chapitre (questions de cours)

Calculé à chaque appel (`loadChapterDeck`), pas de copie par élève (Q112) : chapitres visibles
de l'élève → séries publiées → catégories → modèles publiés (même résolution que les séries,
`templatesOfCategory`). Séance = toutes les questions dues + au plus 10 jamais vues (Q166).
Toutes les lectures passent par le client de l'élève, sous RLS, et reposent aussi les filtres
dans la requête.

### Séances

`ReviewSession.svelte` lit `dueUrl(source)`, présente chaque carte (instance neuve pour un
modèle), envoie la note par `submitRequest`. Côté paquet, `srs_review_sessions` cumule par jour
cartes revues, bonnes réponses (note ≥ 3) et temps ; une panne de ces statistiques n'annule pas
la révision.

## Anti-triche

**Éteint en production** (`app_config.anti_fraud_enabled = 'false'`), et **ne fonctionnerait
pas rallumé tel quel** : `listScanPairs` (`runner.ts`) interroge encore
`question_template_points.skill_id` et `skills(family)`, supprimés par la fusion du
référentiel (`20260829100000`). La correction à faire est décrite en tête de `runner.ts`
(sélectionner `point_id`, retirer le filtre `family`, regrouper par élève × point).

Ce qu'il détecte (passif : un drapeau pour le prof, aucun effet côté élève) :

| Signal            | Déclenche si                                    | Gravité | Score | Échantillon min.  |
| ----------------- | ----------------------------------------------- | ------- | ----- | ----------------- |
| `high_easy_ratio` | > 90 % de Easy                                  | 2       | 0,5   | 20 révisions      |
| `no_again`        | ≥ 30 révisions consécutives sans Again          | 3       | 0,7   | 30                |
| `fast_timeSpent`  | médiane du temps < 2 s                          | 3       | 0,7   | 10 avec temps     |
| `burst`           | > 15 révisions en 60 s                          | 4       | 0,85  | 16                |
| `srs_vs_quiz_gap` | réussite SRS − réussite interactive > 50 points | 5       | 0,9   | 10 de chaque côté |

`composeSignals` : ≥ 2 signaux, moyenne des scores pondérée (1, 2, 2, 3, 3) ; drapeau
`composite` (gravité 5) si > 0,7. Le runner lit les révisions dans `review_history` sur 7 jours,
saute un drapeau identique non résolu de moins de 7 jours, écrit dans `srs_anti_fraud_flags`
(par élève × `capacity_point_id`, pas par classe : le résoudre le masque partout). Pas de
« dé-résolution », pas de message à l'élève (décision : un faux positif accuse un enfant de
10-12 ans ; le bon canal est la discussion en classe).

## Invariants

1. **Mémoire écrite par le serveur seul** (Q171, `20261003233000_srs_memoire_serveur`) : INSERT /
   UPDATE / DELETE de `srs_card_stats` révoqués aux comptes connectés. Écrivains :
   `upsertCardStats` (client service) et `api/srs/decks/[id]/assign`. Le `userId` vient
   **toujours** de la session, jamais du corps de la requête.
2. **Paquets Programme et assignés créés par le serveur seul** (`20261004213000_carnets_srs_acces`) :
   aucun compte connecté ne pose `is_assigned`, `is_auto_managed` ni `source_deck_id`.
   Les cartes du Programme aussi (`20261003100000_srs_cards_insert_policy_service_role`).
3. **FSRS avant la trace** sur `api/skill-attempts` : si la mémoire échoue → 500, pas de
   `skill_attempts` (fail-loud). Sur les révisions, l'ordre est le même, mais une trace ratée
   n'annule pas la révision (et la carte n'entre alors pas au Programme).
4. **Auto-évaluation = meilleur résultat du jour** pour FSRS ; les traces gardent tout
   ([ADR 0016](../adr/0016-auto-evaluation-meilleur-resultat-du-jour.md)).
5. **Une seule règle d'entrée au Programme** : `entersProgrammeDeck`, jamais recopiée.
6. **RLS silencieuse** : toute écriture vérifie ses lignes (`.select()`, `verifyWrite`,
   `inserted.length === 1`) — cf. [rls-echecs-silencieux](../pratiques/rls-echecs-silencieux.md).
7. **`get_deck_stats` exige un paquet lisible** par l'appelant (le sien, ou une copie qu'il a
   assignée), sinon 42501 (`20261004230000_srs_stats_echanges_delai`).
8. Une copie assignée se retrouve par `source_deck_id`, **jamais par le nom**.

## Comment étendre

- **Nouveau chemin qui fait réviser** : passer par `applyFsrsReview` (et `bestOfDay` si l'élève
  se juge lui-même), puis une trace ; pour le Programme, `entersProgrammeDeck` +
  `ensureProgrammeDeckCard`. Ne jamais écrire `srs_card_stats` à la main.
- **Nouvelle source de séance** : un cas de `ReviewSource` dans `review-source.ts` (URL des dues,
  corps de réponse, schéma de la réponse) ; `ReviewSession.svelte` ne change pas.
- **Nouveau badge** : `CapacityBadge`, `BADGE_PRIORITY`, `BADGE_LABEL`, `BADGE_VISUAL`,
  `templateToBadge` (`capacity-badge.ts`), puis `CapacityFsrsBadge.svelte` et `ProgrammeBadge`
  (`decks/programme/+page.server.ts`).
- **Nouvelle route** : Zod dans `validation/srs.ts`, vérification de propriété explicite (la RLS
  rend 0 ligne, pas une erreur), 403 explicite sur paquet assigné / Programme.
- **Toucher à la RLS des `srs_*`** : question d'accès d'abord, tests d'intégration rouges sans la
  migration (CLAUDE.md, §Migrations).

## Tests

| Où                                                                                                                                                                        | Quoi                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/srs/__tests__/` (`fsrs`, `config`, `generator`, `review-source`)                                                                                                 | algorithme FSRS-6, constantes, instances, traduction des réponses de séance                                                                                                                                                                                                                                                |
| `src/lib/server/srs/__tests__/`                                                                                                                                           | `best-of-day`, `capacity-badge`, `chapter-deck`, `deck-copy`, `fsrs-actions`, `programme-deck`, `programme-deck-rule`                                                                                                                                                                                                      |
| `src/lib/server/anti-fraud/__tests__/` (`detectors`, `runner`)                                                                                                            | seuils des 5 signaux, composite, runner (base simulée)                                                                                                                                                                                                                                                                     |
| `src/lib/server/validation/__tests__/` (`srs`, `srs-chantier`, `anti-fraud`)                                                                                              | schémas Zod                                                                                                                                                                                                                                                                                                                |
| `src/lib/components/srs/__tests__/`, `src/lib/components/teacher/anti-fraud/__tests__/`                                                                                   | `ReviewSession`, `CapacityFsrsBadge`, liste / filtres / détail des drapeaux                                                                                                                                                                                                                                                |
| `src/routes/api/srs/__tests__/api-routes.test.ts`, `…/review/submit/__tests__/questions-de-cours.test.ts`                                                                 | routes SRS ; question de cours hors Programme                                                                                                                                                                                                                                                                              |
| `src/routes/api/skill-attempts/__tests__/`, `src/routes/api/tests/save/__tests__/fsrs-sur-evaluation.test.ts`, `src/lib/server/__tests__/evaluation-attempts-srs.test.ts` | FSRS depuis les réponses, séries et évaluations                                                                                                                                                                                                                                                                            |
| `src/routes/(protected)/dashboard/revisions/decks/programme/__tests__/`                                                                                                   | sections du Programme                                                                                                                                                                                                                                                                                                      |
| `tests/integration/` (Supabase local, `pnpm test:integration`)                                                                                                            | `skill-attempts-endpoint`, `srs-memoire-serveur`, `srs-paquets-crees-par-le-serveur`, `paquet-programme-rempli-par-le-serveur`, `paquet-revision-chapitre`, `chapter-decks`, `copie-sections-deck-assigne`, `revision-forcee-deck`, `srs-stats-echanges-delai`, `carnets-srs-acces`, `archived-member-exercise-srs-access` |

## Tables

`srs_decks`, `srs_cards`, `srs_card_stats`, `srs_deck_sections`, `srs_deck_assignments`,
`srs_review_sessions`, `chapter_decks`, `srs_anti_fraud_flags`, `app_config` ; vue
`deck_stats_view` ; RPC `get_due_cards_for_deck(p_user_id, p_deck_id, p_all)` et
`get_deck_stats`. Côté référentiel : `skill_attempts`, `question_template_points`,
`curriculum_points`, `student_point_state` (+ `student_point_state_v`).
Colonnes et policies : [base-de-donnees-tables.md](base-de-donnees-tables.md) et
[base-de-donnees.md](base-de-donnees.md#srs--fsrs--spaced-repetition-system-refonte-2026-06-10).

## Décisions

- [ADR 0001](../adr/0001-correction-cote-client.md) — correction côté navigateur : le verdict
  envoyé à `api/skill-attempts` n'est pas revérifié ;
  [ADR 0014](../adr/0014-acquisition-sur-verdict-client-a-reetudier.md) le remet en question.
- [ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md) — plus de « capacités » famille A :
  le Programme et les badges s'accrochent aux points du programme.
- [ADR 0009](../adr/0009-carte-de-cours-type-explicite.md) — carte de cours (auto-évaluée).
- [ADR 0015](../adr/0015-evaluation-notee-correction-serveur.md) — évaluation notée corrigée
  par le serveur, qui alimente FSRS par `recordSeriesReviews`.
- [ADR 0016](../adr/0016-auto-evaluation-meilleur-resultat-du-jour.md) — meilleur résultat du jour.
- Décisions sans ADR, citées dans le code : Q112 (paquet de chapitre calculé), Q113 (règle
  d'entrée au Programme), Q165 (mémoire unique), Q166 (10 nouvelles par séance), Q171 (mémoire
  écrite par le serveur). Historique : `docs/archive/wip/srs-fsrs-spec-tdd.md`,
  `docs/archive/wip/srs-anti-fraud-spec-tdd.md` (rédigées pour la famille A : le pourquoi, pas
  le code actuel).

## Écarts connus

- **Anti-triche cassé** (voir plus haut) : à réparer avant tout rallumage.
- **Rétention par paquet sans effet** : `create/` et `teacher/srs/decks/…` enregistrent un profil
  de `RETENTION_PROFILES` dans `deck.config`, mais toutes les révisions utilisent `new FSRS()`
  par défaut ; `fsrsConfigSchema` n'est plus importé hors de son fichier.
- **Révision forcée sans bouton** : `api/srs/review/due` accepte `all=true`, mais aucun écran ne
  le passe (`decks/[id]/study` ne transmet que `states`).
- **`chapter_decks` sans écran** : table, policies et tests d'intégration existent, aucune route
  ni page ne la lit ou ne l'écrit.
- **Suppressions sans `.select()`** : `DELETE` de `api/srs/cards/[id]`, `api/srs/decks/[id]` et
  `…/sections/[sectionId]` ne vérifient pas les lignes supprimées. Sur le Programme, la RLS
  refuse en silence (0 ligne) et la route répond quand même « supprimé ».
- Des en-têtes de code (renvois corrigés par la PR #1027) parlent encore de
  « famille A » (`capacity-badge.ts`, `programme-deck.ts`, `decks/programme/+page.server.ts`,
  `api/skill-attempts`).

---

Vérifié contre le code le 2026-10-10.
