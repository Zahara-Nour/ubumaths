# Progression — fix de TOUS les tests d'intégration restants — ✅ TERMINÉ

> Branche `chore/local-supabase-baseline` (non pushée). **Résultat : suite complète VERTE.** > **Avant ce chantier (début session test) : 77 passants. Après : 285 passants | 14 skip | 0 échec**
> (`Test Files 21 passed (21)`, exit 0). Décision produit : **un seul prof** → tests multi-profs skip/réécrits.

## Fichiers traités (tous verts)

- [x] game-triggers — factory : monstre seedé (FK) + retrait artefact game_players non-students
- [x] vip-card-teacher-overrides — cleanupAllTestData/beforeEach + 3 blocs multi-profs skip + snapshot/restore cartes
- [x] chat-triggers — **bug prod #5** : process_message_content btrim plain_text (espace de fin)
- [x] template-triggers — profils via factory + scope 'system' + trigger_type valides
- [x] assignment-triggers — factory + colonnes exercises réelles + view_count>=1 skip + timestamp instant
- [x] updated-at-triggers — private_messages retiré (pas d'updated_at), updateField 'title', assertion DEFAULT now()
- [x] cleanup-triggers — **bug prod #4** : delete_exercise_images set_config storage.allow_delete_query ; accès storage.objects via pg
- [x] profile-triggers — signup via pg (auth.users), handle_new_user réel (given_name/family_name)
- [x] sync-triggers — class_ids défaut []
- [x] sections-crud — **fix API** : updateSectionSchema retire .default(0) (PATCH vide → 400)
- [x] vip-card-enabled-filtering — nombre cartes non hardcodé + snapshot/restore cartes
- [x] vip-card-rarity-distribution — seed vip_card_config (puis vert via restore cartes)
- [x] vip-card-filters — earnedAt timestamp valide (pas string-compare Z vs +00:00)
- [x] competence-referentiel — insertKnowledgeAttempt Famille A (tag + sans skill_id), vue needs_remediation, 2 skip
- [x] skill-attempts-endpoint — view needs_remediation + 'migration 2.1' skip (0 tagging en prod)

## Bugs prod réels trouvés cette session (tous NON poussés — David `db:migrate`)

4. `delete_exercise_images()` — `DELETE storage.objects` sans `storage.allow_delete_query='true'`
   → bloqué par `storage.protect_delete` (présent en prod) → **suppression d'exercice impossible**
   (et cascade depuis profil → RGPD). Migration `20260616260000`.
5. `process_message_content()` — `plain_text` avec espace de fin (aperçus/recherche). Migration `20260616250000`.
   (+ 1 fix API non-DB : `updateSectionSchema` .default(0) sur PATCH.)

Total **5 bugs prod** sur l'ensemble du chantier (2 RPC `rank`→`rk` + FK private_messages + 2 ci-dessus), **aucun poussé**.

## Données de référence (seed)

`supabase/seed.sql` = **8 tables non-PII** : skill_themes, skill_objectives, math_competences,
math_competence_subdimensions, skills, vip_card_templates, vip_card_config, game_monsters.

## Reste (hors-périmètre)

- Pousser les 5 fixes prod (`pnpm db:migrate`) + le baseline (réconciliation EU déjà faite).
- 14 tests skip (scénarios multi-profs obsolètes, comportements/données absents en prod) — documentés inline.
