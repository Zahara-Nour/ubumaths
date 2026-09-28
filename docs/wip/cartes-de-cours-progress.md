# Cartes de cours — suivi

Chantier ouvert le 2026-09-28 pour #617 (Fonctions : questions de cours « Flash » de TinyMath, sans
case ni choix, destinées au SRS). Une question sans case ni choix est aujourd'hui refusée à la
génération (`template-validator.ts` : « fill_in_blanks requires blanks[] ») ; la révision SRS sait déjà
retourner une carte et auto-évaluer (FlashCard non interactif + FSRSButtons).

## Décisions de David (2026-09-28)

1. Nom : **« Carte de cours »**.
2. **Tests et évaluations notés : exclues.**
3. **Entraînement libre (automaths) : auto-évaluation ENREGISTRÉE** (comme en SRS).
4. **#617 → 4 cartes distinctes**, 4e réponse corrigée (« On commence par déterminer son ensemble de
   définition. »).

5. **Score de session : les cartes n'y entrent pas** (ni justes ni fausses) ; affichage à part
   « N carte(s) révisée(s) » ; `test_sessions.score` / `total_questions` recalculés côté serveur hors
   cartes (inchangés s'il n'y a pas de carte).
6. **XP du compagnon : aucune** pour une carte.
7. **Trace à chaque utilisation** (`skill_attempts`, `student_self`, même plusieurs fois par jour) ;
   **fiche FSRS** (`srs_card_stats`, clé `template_id` — retrouvée si la carte est ajoutée plus tard à un
   paquet) mise à jour par le même pipeline (`applyFsrsReview`), Good / Again, **au plus une fois par
   carte et par jour** (jour de Paris), écriture vérifiée ; **jamais ajoutée à un paquet** (ni deck
   Programme) → n'apparaît pas dans les révisions dues (`get_due_cards_for_deck` part de `srs_cards`).
8. **Course aux nombres : cartes exclues** de la sélection.

9. **Indicateurs : l'auto-évaluation n'y compte pas** (option b) — badges de capacité
   (`update_student_point_state`), vue de classe (`class-knowledge.ts`, carte d'activité), anti-fraude
   (`anti-fraud/runner.ts`). Mesure prod le 2026-09-28 : `skill_attempts` est VIDE → aucun badge ni
   aucune statistique existante ne change. Périmètre exact (révisions SRS d'une carte, activité de la
   carte de chaleur) : phase 0 en attente de David.

(Décisions 5 à 9 : David, 2026-09-28.)

⚠️ **Constat (2026-09-28)** : `POST /api/tests/save` rejette en 400 TOUTE instance réelle — le schéma
Zod `questionInstanceSchema` (`src/lib/server/validation/tests.ts`) exige `answer` et un `type` de
l'ancien format, absents de `QuestionInstance` (sonde : `generateInstance` → `validateSaveTest` →
« instance.answer : Invalid input », « instance.type : Invalid option »). Les décisions 5 à 7 sont
codées et testées, mais **aucune session automaths n'est enregistrée tant que ce schéma n'est pas
corrigé** — correction qui réactiverait l'enregistrement de TOUTES les questions (sessions,
`skill_attempts`, FSRS, XP, deck Programme) : décision de David à prendre, hors de cette PR.

## Spécification (phase 0 validée)

- **Type explicite** `course_card` (pas d'inférence « ni case ni choix ») : marqueur persistant dans le
  template (`options.courseCard: true`), lu par `getQuestionType`, qui écrit `type = 'course_card'`
  dans la colonne `question_templates.type` → **migration additive** : ajout de la valeur à la
  contrainte CHECK `question_templates_type_check` (rollback en commentaire). Question d'accès :
  personne ne peut lire quoi que ce soit de nouveau (aucune policy touchée).
- **Contenu** : recto = énoncé (`statement`), verso = correction (`correction.steps`) ; ni `blanks` ni
  `choices` ; variables et variations permises.
- **Modes** :
  - SRS : recto → retournement → verso → Again/Hard/Good/Easy (existant) ;
  - entraînement libre : recto → « Voir la réponse » → verso → auto-évaluation (« Je savais / Je ne
    savais pas » ou les 4 notes), enregistrée dans `skill_attempts` (source `student_self`) ;
  - tests/évaluations notés : exclues (filtres de sélection) ;
  - aperçu/banque/admin : badge « Carte de cours », recto + verso.
- **Relecture/vérification** (`checkTemplate`, lanceur de specs) : pas de spec de réponse ; génération
  (50 tirages) + recto et verso non vides.
- **Éditeur** : type « Carte de cours » → pas d'éditeur de réponses ; « Recto » / « Verso ».
- **Au passage** : la révision SRS saute sans trace une carte dont la génération échoue → la tracer.

## Plan

1. PR migration (CHECK + test d'intégration qui échoue sans elle), `security-auditor`, merge,
   `db:migrate`, `db:types` (règle des deux PR : `db:types` lit la prod).
2. PR code (types, génération, correcteur, vérification, affichage, modes, éditeur, SRS).
3. #617 : 4 cartes, import en brouillon.

## Avancement

- [x] Phase 0 validée (2026-09-28)
- [x] PR migration (#493) : appliquée en prod le 2026-09-28 (contrainte vérifiée, 602 questions intactes). `db:types` lancé : aucun changement (`type` est un `string`).
- [x] PR code (#494) mergée le 2026-09-28
- [x] #617 importée le 2026-09-28 : 4 cartes `course_card` en brouillon (vérifié en base), la 1re reliée au suivi
