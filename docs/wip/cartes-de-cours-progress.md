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
- [ ] PR code — implémentée sur `feat/cartes-de-cours` (2026-09-28) ; typecheck 0 erreur, lint propre
- [ ] #617 importée
