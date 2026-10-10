# Base de données — tables par domaine (généré)

> ⚠️ **Fichier généré** par `scripts/generate-db-doc.ts` depuis `src/lib/types/database.ts`
> (`pnpm db:types` régénère les deux, depuis la **production**). Ne pas éditer à la main :
> le texte explicatif vit dans [base-de-donnees.md](base-de-donnees.md).

220 tables · 25 vues · 313 fonctions. Colonne suivie de `?` : peut être nulle.

## Établissement et personnes (20)

### `academic_periods`

`color?` · `created_at?` · `end_date` · `id` · `metadata?` · `name` · `period_order` · `school_year_id` · `start_date` · `type` · `updated_at?`

Liens : `school_year_id` → `school_years`

### `account_deletion_audit`

`cleanup_result?` · `completed_at?` · `email_hash` · `error_message?` · `id` · `ip_address` · `requested_at` · `status` · `user_agent?` · `user_id?`

### `class_members`

`class_id` · `id` · `joined_at` · `left_at?` · `status` · `student_id`

Liens : `class_id` → `classes` · `student_id` → `profiles`

### `class_schedules`

`class_id` · `created_at` · `day_of_week` · `end_time` · `id` · `notes?` · `period_number?` · `room?` · `start_time` · `subject?` · `updated_at`

Liens : `class_id` → `classes`

### `classes`

`created_at` · `description?` · `google_classroom_course_id?` · `grade?` · `id` · `is_active` · `join_code` · `name` · `registration_open` · `school_id?` · `school_year_id?` · `tutor_config?` · `updated_at`

Liens : `google_classroom_course_id` → `google_classroom_courses` · `school_id` → `schools` · `school_year_id` → `school_years`

### `friendships`

`addressee_id` · `created_at` · `friendship_type` · `id` · `requester_id` · `status` · `updated_at`

Liens : `addressee_id` → `profiles` · `requester_id` → `profiles`

### `parental_consents`

`consent_given_at?` · `consent_ip` · `consent_token` · `consent_user_agent?` · `created_at` · `email_count` · `expires_at` · `id` · `last_email_sent_at?` · `parent_email` · `parent_name?` · `status` · `student_id` · `updated_at`

Liens : `student_id` → `profiles`

### `pending_students`

`activated_at?` · `class_ids?` · `created_at?` · `email` · `firstname` · `grade?` · `id` · `is_activated?` · `lastname` · `parent_email?` · `school_id?` · `updated_at?`

Liens : `school_id` → `schools`

### `profiles`

`age_declaration?` · `age_declared_at?` · `avatar_url?` · `bonus` · `class_ids?` · `consent_grace_period_ends?` · `consent_granted_at?` · `consent_required` · `consent_rule_pending` · `created_at` · `email` · `firstname?` · `full_name?` · `gidouilles` · `grade?` · `id` · `is_test` · `lastname?` · `python_settings?` · `rejection_reason?` · `role` · `school_id?` · `status` · `status_changed_at?` · `status_changed_by?` · `updated_at` · `vip_cards` · `vip_cards_history`

Liens : `school_id` → `schools` · `status_changed_by` → `profiles`

### `school_holidays`

`created_at?` · `end_date` · `id` · `name` · `school_year_id` · `start_date` · `updated_at?`

Liens : `school_year_id` → `school_years`

### `school_year_closures`

`class_ids` · `class_member_ids` · `closed_at` · `closed_by?` · `school_year_id`

Liens : `closed_by` → `profiles` · `school_year_id` → `school_years`

### `school_years`

`created_at?` · `end_date` · `id` · `is_active?` · `metadata?` · `name` · `purge_after?` · `school_id` · `start_date` · `updated_at?`

Liens : `school_id` → `schools`

### `schools`

`address?` · `city` · `country` · `created_at?` · `id` · `is_active?` · `logo_url?` · `name` · `timetable?` · `timezone` · `uai?` · `updated_at?`

### `student_warnings`

`academic_period_id` · `class_id` · `created_at?` · `created_by` · `deleted_at?` · `deleted_by?` · `deletion_context?` · `id` · `student_id` · `updated_at?` · `warning_type`

Liens : `academic_period_id` → `academic_periods` · `class_id` → `classes` · `created_by` → `profiles` · `deleted_by` → `profiles` · `student_id` → `profiles`

### `terms_acceptances`

`accepted_at` · `id` · `terms_version` · `user_id`

### `user_folders`

`color?` · `created_at` · `icon?` · `id` · `message_count?` · `name` · `sort_order?` · `updated_at` · `user_id`

Liens : `user_id` → `profiles`

### `user_preferences`

`created_at` · `test_mode_enabled` · `updated_at` · `user_id`

### `user_presence`

`last_heartbeat` · `status` · `updated_at` · `user_id`

Liens : `user_id` → `profiles`

### `user_restrictions`

`created_at` · `expires_at?` · `id` · `reason` · `restricted_by` · `restriction_type` · `scope_id?` · `scope_type` · `updated_at` · `user_id`

Liens : `restricted_by` → `profiles` · `scope_id` → `conversations` · `user_id` → `profiles`

### `welcome_emails_sent`

`id` · `sent_at` · `sent_by` · `student_id`

Liens : `sent_by` → `profiles` · `student_id` → `profiles`

## Programme et suivi par compétences (16)

### `classification_nodes`

`archived_at?` · `created_at` · `id` · `kind` · `name` · `parent_id?` · `position` · `updated_at`

Liens : `parent_id` → `classification_nodes`

### `curriculum_objectives`

`created_at` · `description?` · `display_order` · `id` · `name` · `theme_id` · `updated_at`

Liens : `theme_id` → `curriculum_themes`

### `curriculum_point_automatismes`

`created_at` · `grade` · `point_id`

Liens : `point_id` → `curriculum_points`

### `curriculum_points`

`archived_at?` · `code` · `created_at` · `display_order` · `exigence` · `grade?` · `id` · `kind` · `name` · `node_id?` · `objective_id?` · `rang?` · `regime_acquisition` · `rubrique?` · `updated_at`

Liens : `node_id` → `classification_nodes` · `objective_id` → `curriculum_objectives`

### `curriculum_themes`

`code?` · `created_at` · `display_order` · `grade` · `id` · `name` · `updated_at`

### `grade_predecessors`

`created_at` · `grade` · `previous_grade`

### `math_competence_subdimensions`

`created_at` · `description?` · `display_order` · `id` · `letter` · `math_competence_id` · `name` · `updated_at`

Liens : `math_competence_id` → `math_competences`

### `math_competences`

`code` · `created_at` · `description?` · `display_order` · `gloss_for_student` · `id` · `name` · `updated_at`

### `observables`

`created_at` · `display_order` · `id` · `name` · `observable_code` · `subdimension_id` · `teacher_grid_text?` · `updated_at`

Liens : `subdimension_id` → `math_competence_subdimensions`

### `resource_tags`

`created_at` · `resource_id` · `resource_kind` · `tag_id`

Liens : `tag_id` → `tags`

### `skill_attempts`

`code?` · `created_at` · `grade?` · `id` · `observable_id?` · `phase_blocage?` · `source` · `source_ref?` · `student_id` · `success?` · `task_id?` · `template_id?` · `with_help`

Liens : `observable_id` → `observables` · `student_id` → `profiles` · `task_id` → `evaluation_tasks` · `template_id` → `question_templates`

### `source_types`

`archived_at?` · `created_at` · `id` · `name` · `position`

### `student_competence_level`

`last_recalc_at` · `math_competence_id` · `missing_for_next?` · `niveau` · `student_id` · `task_count?` · `validated_observables?`

Liens : `math_competence_id` → `math_competences` · `student_id` → `profiles`

### `student_observable_state`

`count_minus` · `count_plus` · `is_acquis` · `last_attempt_at?` · `observable_id` · `student_id` · `updated_at`

Liens : `observable_id` → `observables` · `student_id` → `profiles`

### `student_point_state`

`distinct_template_successes` · `is_acquired` · `last_attempt_at?` · `last_success_at?` · `needs_remediation` · `point_id` · `student_id` · `total_successes` · `updated_at`

Liens : `point_id` → `curriculum_points` · `student_id` → `profiles`

### `tags`

`created_at` · `created_by?` · `id` · `name` · `slug?`

## Questions et exercices (18)

### `exercise_assignments`

`assigned_at` · `assigned_by` · `assigned_to_type` · `class_id?` · `exercise_id` · `id` · `is_active` · `notes?` · `optional_deadline?` · `student_id?`

Liens : `assigned_by` → `profiles` · `class_id` → `classes` · `exercise_id` → `exercises` · `student_id` → `profiles`

### `exercise_classifications`

`created_at` · `exercise_id` · `is_primary` · `node_id` · `position`

Liens : `exercise_id` → `exercises` · `node_id` → `classification_nodes`

### `exercise_completions`

`assignment_id?` · `completed_at?` · `created_at` · `exercise_id` · `id` · `last_viewed_at` · `student_id` · `view_count`

Liens : `assignment_id` → `exercise_assignments` · `exercise_id` → `exercises` · `student_id` → `profiles`

### `exercise_curriculum_points`

`created_at` · `exercise_id` · `point_id`

Liens : `exercise_id` → `exercises` · `point_id` → `curriculum_points`

### `exercise_favorites`

`created_at` · `exercise_id` · `user_id`

Liens : `exercise_id` → `exercises` · `user_id` → `profiles`

### `exercise_share_tokens`

`access_count` · `created_at` · `created_by` · `exercise_id` · `expires_at?` · `id` · `is_active` · `last_accessed_at?` · `token`

Liens : `created_by` → `profiles` · `exercise_id` → `exercises`

### `exercise_templates`

`created_at` · `created_by?` · `description?` · `id` · `is_system` · `template_data` · `title` · `updated_at`

Liens : `created_by` → `profiles`

### `exercises`

`category` · `created_at` · `created_by` · `distribution_mode` · `generic_functions?` · `grades?` · `id` · `is_public` · `resources?` · `shared?` · `slug?` · `source?` · `source_type_id?` · `title?` · `topic?` · `updated_at` · `variables` · `variations?`

Liens : `created_by` → `profiles` · `source_type_id` → `source_types`

### `migration_edits`

`created_at?` · `edit_notes?` · `edited_json` · `editor_id` · `id` · `migration_tracking_id` · `old_question_hash` · `updated_at?`

Liens : `editor_id` → `profiles` · `migration_tracking_id` → `migration_tracking`

### `migration_images`

`created_at?` · `error_message?` · `file_size?` · `id` · `migrated_at?` · `migration_status` · `new_path` · `old_path`

### `migration_tracking`

`conversion_errors?` · `conversion_notes?` · `converted_at?` · `created_at?` · `domain?` · `id` · `imported_at?` · `level?` · `migration_status` · `new_template_id?` · `old_description` · `old_question_hash` · `old_question_index` · `old_question_json?` · `phase?` · `review_status?` · `reviewed_at?` · `reviewed_by?` · `subdomain?` · `theme?` · `transformed_json?` · `updated_at?` · `validated_at?`

Liens : `new_template_id` → `question_templates` · `reviewed_by` → `profiles`

### `question_template_points`

`created_at` · `point_id` · `template_id`

Liens : `point_id` → `curriculum_points` · `template_id` → `question_templates`

### `question_templates`

`classification_node_id?` · `created_at?` · `created_by?` · `default_display_options?` · `delay?` · `description?` · `domain` · `exercise_instruction?` · `grades` · `id` · `level` · `multiple_answers?` · `options?` · `precision?` · `shared?` · `status` · `subdomain?` · `test_specs?` · `theme` · `title` · `type` · `updated_at?` · `variations`

Liens : `classification_node_id` → `classification_nodes` · `created_by` → `profiles`

### `series`

`categories` · `created_at` · `created_by` · `description?` · `grade` · `id` · `title` · `updated_at`

Liens : `created_by` → `profiles`

### `student_exercise_mastery`

`exercise_id` · `id` · `status` · `student_id` · `updated_at`

Liens : `exercise_id` → `exercises` · `student_id` → `profiles`

### `template_audit_log`

`action` · `changes?` · `id` · `ip_address` · `metadata?` · `performed_at` · `performed_by` · `template_id?` · `user_agent?`

Liens : `performed_by` → `profiles` · `template_id` → `message_templates`

### `template_usage_stats`

`class_id?` · `completed?` · `id` · `template_id` · `time_to_complete?` · `used_at` · `user_id`

Liens : `class_id` → `classes` · `template_id` → `message_templates` · `user_id` → `profiles`

### `user_favorite_templates`

`created_at` · `template_id` · `user_id`

Liens : `template_id` → `message_templates` · `user_id` → `profiles`

## Chapitres et cahier de texte (17)

### `chapter_checklist_items`

`chapter_id` · `content` · `created_at` · `description?` · `display_order` · `id` · `published_at?` · `section_id?` · `section_order` · `updated_at`

Liens : `chapter_id` → `class_chapters` · `section_id, chapter_id` → `chapter_sections`

### `chapter_decks`

`chapter_id` · `created_at` · `deck_id` · `deck_section_id?` · `display_order` · `id` · `mode` · `published_at?` · `section_id?` · `section_order`

Liens : `chapter_id` → `class_chapters` · `deck_id` → `srs_decks` · `deck_section_id, deck_id` → `srs_deck_sections` · `section_id, chapter_id` → `chapter_sections`

### `chapter_documents`

`chapter_id` · `created_at` · `description?` · `display_order` · `file_name?` · `file_size?` · `google_drive_url?` · `google_file_id?` · `id` · `mime_type?` · `published_at?` · `section_id?` · `section_order` · `source_type` · `storage_path?` · `thumbnail_url?` · `title` · `updated_at`

Liens : `chapter_id` → `class_chapters` · `section_id, chapter_id` → `chapter_sections`

### `chapter_exercises`

`chapter_id` · `created_at` · `display_order` · `exercise_id` · `id` · `published_at?` · `section_id?` · `section_order`

Liens : `chapter_id` → `class_chapters` · `exercise_id` → `exercises` · `section_id, chapter_id` → `chapter_sections`

### `chapter_sections`

`chapter_id` · `created_at` · `display_order` · `id` · `title` · `updated_at`

Liens : `chapter_id` → `class_chapters`

### `chapter_series`

`chapter_id` · `created_at` · `display_order` · `form` · `id` · `published_at?` · `section_id?` · `section_order` · `series_id`

Liens : `chapter_id` → `class_chapters` · `section_id, chapter_id` → `chapter_sections` · `series_id` → `series`

### `chapter_template_instantiations`

`chapter_id` · `current_template_version?` · `id` · `instantiated_at` · `is_detached` · `last_migrated_at?` · `template_id?` · `template_version`

Liens : `chapter_id` → `class_chapters` · `template_id` → `chapter_templates`

### `chapter_template_versions`

`change_summary?` · `content_snapshot` · `created_at` · `created_by` · `diff?` · `id` · `template_id` · `version_number`

Liens : `created_by` → `profiles` · `template_id` → `chapter_templates`

### `chapter_templates`

`color?` · `content_snapshot` · `created_at` · `created_by` · `current_version` · `description?` · `grades` · `icon?` · `id` · `instantiation_count` · `status` · `title` · `updated_at`

Liens : `created_by` → `profiles`

### `chapter_worksheets`

`chapter_id` · `created_at` · `display_order` · `id` · `published_at?` · `section_id?` · `section_order` · `worksheet_id`

Liens : `chapter_id` → `class_chapters` · `section_id, chapter_id` → `chapter_sections` · `worksheet_id` → `worksheets`

### `class_chapters`

`class_id` · `color?` · `created_at` · `description?` · `display_order` · `icon?` · `id` · `is_visible` · `title` · `updated_at`

Liens : `class_id` → `classes`

### `class_journal_entries`

`class_id` · `created_at` · `entry_date` · `id` · `is_published` · `lesson_content?` · `updated_at`

Liens : `class_id` → `classes`

### `class_journal_share_tokens`

`access_count` · `class_id` · `created_at` · `created_by?` · `expires_at?` · `id` · `is_active` · `last_accessed_at?` · `token`

Liens : `class_id` → `classes` · `created_by` → `profiles`

### `journal_entry_activities`

`chapter_id?` · `created_at` · `display_order` · `entry_id` · `evaluation_id?` · `exercise_id?` · `id` · `kind` · `label?` · `question_template_id?` · `textbook_ref?`

Liens : `chapter_id` → `class_chapters` · `entry_id` → `class_journal_entries` · `evaluation_id` → `evaluations` · `exercise_id` → `exercises` · `question_template_id` → `question_templates`

### `journal_entry_homework`

`content` · `created_at` · `display_order` · `due_date?` · `entry_id` · `id` · `updated_at`

Liens : `entry_id` → `class_journal_entries`

### `journal_entry_points`

`created_at` · `entry_id` · `id` · `point_id` · `source`

Liens : `entry_id` → `class_journal_entries` · `point_id` → `curriculum_points`

### `student_checklist_progress`

`checklist_item_id` · `completed_at?` · `created_at` · `id` · `is_completed` · `student_id` · `updated_at`

Liens : `checklist_item_id` → `chapter_checklist_items` · `student_id` → `profiles`

## Fiches (10)

### `worksheet_assignment_classes`

`assignment_id` · `class_id` · `created_at` · `id`

Liens : `assignment_id` → `worksheet_assignments` · `class_id` → `classes`

### `worksheet_assignment_exercise_settings`

`assignment_id` · `created_at` · `id` · `show_correction` · `updated_at` · `worksheet_exercise_id`

Liens : `worksheet_exercise_id` → `worksheet_exercises` · `assignment_id` → `worksheet_assignments`

### `worksheet_assignment_students`

`assignment_id` · `created_at` · `id` · `student_id`

Liens : `assignment_id` → `worksheet_assignments` · `student_id` → `profiles`

### `worksheet_assignments`

`assigned_at` · `available_from?` · `closes_at?` · `correction_release_at?` · `correction_release_mode?` · `created_at` · `created_by` · `id` · `individualized?` · `instructions?` · `show_corrections?` · `status?` · `title?` · `updated_at` · `worksheet_id`

Liens : `created_by` → `profiles` · `worksheet_id` → `worksheets`

### `worksheet_error_reports`

`assignment_id` · `created_at` · `description` · `id` · `response?` · `reviewed_at?` · `reviewed_by?` · `seed?` · `status` · `student_id` · `updated_at` · `variation_index?` · `worksheet_exercise_id`

Liens : `assignment_id` → `worksheet_assignments` · `reviewed_by` → `profiles` · `student_id` → `profiles` · `worksheet_exercise_id` → `worksheet_exercises`

### `worksheet_exercises`

`correction_visible?` · `created_at` · `custom_instructions?` · `exercise_id` · `id` · `is_essential` · `points?` · `position` · `section_id?` · `translations?` · `updated_at` · `variant_config?` · `variant_mode?` · `variation_index?` · `worksheet_id`

Liens : `exercise_id` → `exercises` · `section_id` → `worksheet_sections` · `worksheet_id` → `worksheets`

### `worksheet_instances`

`created_at` · `generated_at` · `id` · `instance_data` · `status?` · `student_id` · `updated_at` · `variant_seed` · `variant_version?` · `worksheet_id`

Liens : `student_id` → `profiles` · `worksheet_id` → `worksheets`

### `worksheet_sections`

`created_at` · `id` · `instructions?` · `points_total?` · `position` · `title` · `translations?` · `updated_at` · `worksheet_id`

Liens : `worksheet_id` → `worksheets`

### `worksheet_templates`

`created_at` · `created_by?` · `description?` · `id` · `name` · `placeholders?` · `template_content` · `updated_at`

Liens : `created_by` → `profiles`

### `worksheets`

`archived_at?` · `config?` · `created_at` · `created_by` · `description?` · `estimated_duration_minutes?` · `grades?` · `id` · `published_at?` · `school_id?` · `status` · `template_id?` · `title` · `total_points?` · `translations?` · `type` · `updated_at` · `version?`

Liens : `created_by` → `profiles` · `school_id` → `schools` · `template_id` → `worksheet_templates`

## Évaluations (8)

### `evaluation_assignments`

`assigned_at` · `assigned_by` · `class_id?` · `evaluation_id` · `id` · `student_id?`

Liens : `assigned_by` → `profiles` · `class_id` → `classes` · `evaluation_id` → `evaluations` · `student_id` → `profiles`

### `evaluation_attempt_questions`

`category_key` · `created_at` · `delay_seconds` · `instance?` · `position` · `seed` · `template_id` · `test_session_id`

Liens : `template_id` → `question_templates` · `test_session_id` → `test_sessions`

### `evaluation_task_perimeter`

`observable_id` · `task_id`

Liens : `observable_id` → `observables` · `task_id` → `evaluation_tasks`

### `evaluation_tasks`

`class_id?` · `created_at` · `description?` · `evaluation_id?` · `exercise_id?` · `id` · `name` · `niveau_scolaire` · `task_date?` · `updated_at` · `worksheet_id?`

Liens : `class_id` → `classes` · `evaluation_id` → `evaluations` · `exercise_id` → `exercises` · `worksheet_id` → `worksheets`

### `evaluations`

`academic_period_id?` · `created_at` · `created_by` · `deadline?` · `form` · `id` · `legacy_assessment_id?` · `max_attempts?` · `series_id` · `shuffle_questions` · `status` · `time_limit?` · `updated_at`

Liens : `academic_period_id` → `academic_periods` · `created_by` → `profiles` · `series_id` → `series`

### `parody_evaluations`

`created_at` · `created_by?` · `description?` · `file_name` · `file_size` · `grade_levels` · `id` · `mime_type` · `storage_path` · `title` · `updated_at`

Liens : `created_by` → `profiles`

### `test_answers`

`attempts?` · `created_at?` · `id` · `is_correct?` · `points?` · `question_instance` · `status?` · `template_id?` · `test_session_id` · `time_spent?` · `user_answer?`

Liens : `test_session_id` → `test_sessions`

### `test_sessions`

`categories` · `completed_at?` · `created_at?` · `evaluation_id?` · `grade?` · `id` · `mode` · `points_earned?` · `score?` · `time_limit?` · `time_spent?` · `total_questions` · `user_id?`

Liens : `evaluation_id` → `evaluations`

## Dictionnaire (mots mathématiques) (2)

### `dictionary_entries`

`auto_link` · `created_at` · `definitions?` · `derived_from?` · `exemples?` · `forms` · `grade` · `hidden` · `history?` · `id` · `image?` · `position` · `see_also?` · `sense?` · `shared_with` · `synonyms` · `tags` · `term` · `updated_at` · `updated_by?`

### `dictionary_entry_versions`

`entry` · `entry_id` · `id` · `saved_at` · `saved_by?`

Liens : `entry_id` → `dictionary_entries`

## Révisions (SRS) (7)

### `srs_anti_fraud_flags`

`capacity_point_id?` · `created_at` · `details` · `flag_type` · `id` · `resolved` · `resolved_at?` · `resolved_by?` · `sample_size` · `score` · `severity` · `student_id` · `window_end` · `window_start`

Liens : `capacity_point_id` → `curriculum_points` · `resolved_by` → `profiles` · `student_id` → `profiles`

### `srs_card_stats`

`card_reference_id` · `card_reference_type` · `created_at` · `difficulty` · `id` · `last_review?` · `next_review` · `review_history` · `stability` · `state` · `total_reviews` · `updated_at` · `user_id`

Liens : `user_id` → `profiles`

### `srs_cards`

`back_content?` · `card_type` · `created_at` · `deck_id` · `front_content?` · `id` · `section_id?` · `template_id?` · `updated_at`

Liens : `deck_id` → `srs_decks` · `section_id` → `srs_deck_sections` · `template_id` → `question_templates`

### `srs_deck_assignments`

`assigned_at` · `assigned_by` · `assigned_to` · `assignment_type` · `id` · `source_deck_id`

Liens : `assigned_by` → `profiles` · `source_deck_id` → `srs_decks`

### `srs_deck_sections`

`created_at` · `deck_id` · `description?` · `display_order` · `id` · `name` · `updated_at`

Liens : `deck_id` → `srs_decks`

### `srs_decks`

`config` · `created_at` · `deck_type` · `description?` · `id` · `is_assigned` · `is_auto_managed` · `name` · `owner_id` · `source_deck_id?` · `updated_at`

Liens : `owner_id` → `profiles` · `source_deck_id` → `srs_decks`

### `srs_review_sessions`

`average_time` · `cards_reviewed` · `completed_at?` · `correct_count` · `deck_id` · `id` · `started_at` · `total_time` · `user_id`

Liens : `deck_id` → `srs_decks` · `user_id` → `profiles`

## Python (10)

### `python_exercise_assignments`

`assigned_by` · `class_id?` · `created_at` · `due_date?` · `exercise_id` · `id` · `max_attempts?` · `student_id?`

Liens : `assigned_by` → `profiles` · `class_id` → `classes` · `exercise_id` → `python_exercises` · `student_id` → `profiles`

### `python_exercise_mastery`

`exercise_id` · `id` · `status` · `student_id` · `updated_at`

Liens : `exercise_id` → `python_exercises` · `student_id` → `profiles`

### `python_exercise_submissions`

`assignment_id?` · `attempt_number` · `code` · `created_at` · `execution_time_ms?` · `exercise_id` · `id` · `is_correct` · `student_id` · `validation_result`

Liens : `assignment_id` → `python_exercise_assignments` · `exercise_id` → `python_exercises` · `student_id` → `profiles`

### `python_exercises`

`author_id` · `created_at` · `description?` · `id` · `instructions?` · `is_public?` · `level` · `solution_code` · `source?` · `starter_code?` · `title` · `updated_at` · `validation_config`

Liens : `author_id` → `profiles`

### `python_file_assignments`

`assigned_at` · `assigned_by` · `class_id` · `due_date?` · `file_id` · `id` · `instructions?`

Liens : `assigned_by` → `profiles` · `class_id` → `classes` · `file_id` → `python_files`

### `python_files`

`code` · `created_at` · `description?` · `id` · `is_public?` · `owner_id` · `title` · `updated_at`

Liens : `owner_id` → `profiles`

### `python_notebook_assignments`

`class_id` · `created_at` · `id` · `notebook_id` · `readonly?` · `shared_by`

Liens : `class_id` → `classes` · `notebook_id` → `python_notebooks` · `shared_by` → `profiles`

### `python_notebook_checkpoint_runs`

`attempt_count` · `cell_id` · `error_message?` · `first_attempted_at?` · `hint_revealed` · `notebook_id` · `ran_at` · `status` · `succeeded_at?` · `user_id`

Liens : `notebook_id` → `python_notebooks` · `user_id` → `profiles`

### `python_notebooks`

`author_id` · `content` · `created_at` · `description?` · `id` · `is_public?` · `is_template` · `template_category?` · `title` · `updated_at`

Liens : `author_id` → `profiles`

### `python_submission_server_verdicts`

`created_at` · `server_is_correct?` · `server_validation_result?` · `submission_id` · `verification_status` · `verified_at?`

Liens : `submission_id` → `python_exercise_submissions`

## Messagerie, notifications, modération (17)

### `conversation_participants`

`conversation_id` · `id` · `is_archived?` · `is_muted?` · `joined_at?` · `last_read_at?` · `last_read_message_id?` · `user_id`

Liens : `conversation_id` → `conversations` · `user_id` → `profiles`

### `conversations`

`class_id?` · `created_at?` · `created_by?` · `id` · `is_group?` · `last_message_at?` · `last_message_id?` · `last_message_preview?` · `name?` · `updated_at?`

Liens : `class_id` → `classes` · `created_by` → `profiles` · `last_message_id` → `messages`

### `message_attachments`

`created_at?` · `file_name` · `file_size` · `file_type` · `id` · `message_id` · `public_url` · `storage_path` · `uploaded_by`

Liens : `message_id` → `messages` · `uploaded_by` → `profiles`

### `message_attachments_v2`

`file_name` · `file_size` · `file_type` · `id` · `message_id` · `public_url?` · `storage_path` · `uploaded_at` · `uploaded_by`

Liens : `message_id` → `private_messages` · `uploaded_by` → `profiles`

### `message_drafts`

`author_id` · `class_id?` · `content?` · `created_at` · `id` · `is_group_message?` · `last_autosave_at?` · `recipient_ids?` · `replying_to_message_id?` · `subject?` · `updated_at`

Liens : `author_id` → `profiles` · `class_id` → `classes` · `replying_to_message_id` → `private_messages`

### `message_inbox`

`deleted?` · `folder_id?` · `id` · `is_starred?` · `message_id` · `read_at?` · `received_at` · `recipient_id` · `status`

Liens : `folder_id` → `user_folders` · `message_id` → `private_messages` · `recipient_id` → `profiles`

### `message_moderation_logs`

`action` · `class_id?` · `created_at` · `id` · `message_id?` · `moderator_id` · `reason?` · `student_id?`

Liens : `class_id` → `classes` · `message_id` → `private_messages` · `moderator_id` → `profiles` · `student_id` → `profiles`

### `message_reactions`

`created_at?` · `emoji` · `id` · `message_id` · `user_id`

Liens : `message_id` → `messages` · `user_id` → `profiles`

### `message_reports`

`created_at?` · `details?` · `id` · `message_id` · `reason` · `reported_by` · `review_notes?` · `reviewed_at?` · `reviewed_by?` · `status?`

Liens : `message_id` → `messages` · `reported_by` → `profiles` · `reviewed_by` → `profiles`

### `message_search_index`

`content_tsv` · `has_attachments?` · `message_id` · `recipient_count?` · `search_tsv` · `sender_name` · `sender_role` · `sent_at` · `subject_tsv`

Liens : `message_id` → `private_messages`

### `message_template_versions`

`body_template` · `change_summary?` · `description?` · `id` · `modified_at` · `modified_by` · `scope` · `subject_template` · `tags?` · `template_id` · `title` · `trigger_type` · `variables?` · `version_number`

Liens : `modified_by` → `profiles` · `template_id` → `message_templates`

### `message_templates`

`approval_status?` · `body_template` · `class_id?` · `created_at` · `created_by` · `description?` · `id` · `is_active?` · `review_notes?` · `reviewed_at?` · `reviewed_by?` · `scope` · `search_vector` · `subject_template` · `tags?` · `title` · `trigger_config?` · `trigger_type` · `updated_at` · `variables?`

Liens : `class_id` → `classes` · `created_by` → `profiles` · `reviewed_by` → `profiles`

### `messages`

`content` · `conversation_id` · `created_at?` · `deleted_at?` · `edited_at?` · `flag_reason?` · `id` · `is_flagged?` · `is_reported?` · `plain_text?` · `sender_id?`

Liens : `conversation_id` → `conversations` · `sender_id` → `profiles`

### `moderation_logs`

`action` · `created_at` · `id` · `metadata?` · `moderator_id?` · `reason?` · `target_id` · `target_type`

Liens : `moderator_id` → `profiles`

### `notification_reads`

`created_at` · `id` · `notification_id` · `read_at` · `user_id`

Liens : `notification_id` → `notifications` · `user_id` → `profiles`

### `notifications`

`action_label?` · `action_url?` · `created_at` · `created_by?` · `deleted_at?` · `expires_at` · `id` · `is_system` · `message` · `metadata?` · `priority` · `system_event_type?` · `target_class_ids?` · `target_roles?` · `target_type` · `target_user_ids?` · `title` · `type`

Liens : `created_by` → `profiles`

### `private_messages`

`class_id?` · `content` · `deleted_by_sender?` · `edited_at?` · `id` · `is_group_message?` · `parent_message_id?` · `plain_text?` · `recipient_count?` · `sender_id` · `sent_at` · `subject` · `thread_root_id?`

Liens : `class_id` → `classes` · `parent_message_id` → `private_messages` · `sender_id` → `profiles` · `thread_root_id` → `private_messages`

## Marché (échanges entre élèves) (8)

### `marketplace_chat_messages`

`created_at` · `flagged_reason?` · `id` · `is_flagged?` · `message` · `sender_id` · `trade_id`

Liens : `sender_id` → `profiles` · `trade_id` → `marketplace_trades`

### `marketplace_config`

`class_id?` · `created_at` · `enabled_for_class?` · `enabled_globally?` · `id` · `listing_duration_days?` · `max_listings_per_student?` · `max_trades_per_day?` · `school_id?` · `updated_at` · `updated_by?`

Liens : `class_id` → `classes` · `school_id` → `schools`

### `marketplace_listing_views`

`id` · `listing_id` · `user_id` · `viewed_at`

Liens : `listing_id` → `marketplace_listings` · `user_id` → `profiles`

### `marketplace_listings`

`cancelled_at?` · `completed_at?` · `created_at` · `creator_id` · `expires_at` · `id` · `listing_type` · `max_proposals?` · `offered_card_ids?` · `offered_gidouilles?` · `proposal_count?` · `school_id` · `status` · `view_count?` · `wanted_card_template_ids?` · `wanted_gidouilles?`

Liens : `creator_id` → `profiles` · `school_id` → `schools`

### `marketplace_locked_cards`

`card_instance_id` · `id` · `locked_at` · `locked_entity_id` · `locked_for` · `student_id`

Liens : `student_id` → `profiles`

### `marketplace_proposals`

`created_at` · `id` · `listing_id` · `message?` · `offered_card_ids?` · `offered_gidouilles?` · `proposer_id` · `responded_at?` · `response_message?` · `status` · `withdrawn_at?`

Liens : `listing_id` → `marketplace_listings` · `proposer_id` → `profiles`

### `marketplace_trade_offers`

`created_at` · `id` · `initiator_cards?` · `initiator_gidouilles?` · `message?` · `offer_number` · `offered_by` · `partner_cards?` · `partner_gidouilles?` · `responded_at?` · `status` · `trade_id`

Liens : `offered_by` → `profiles` · `trade_id` → `marketplace_trades`

### `marketplace_trades`

`cancelled_at?` · `completed_at?` · `confirmation_started_at?` · `confirmed_by_initiator?` · `confirmed_by_partner?` · `conversation_id?` · `created_at` · `current_offer?` · `final_trade?` · `id` · `initiator_id` · `last_offer_by?` · `listing_id?` · `partner_id` · `proposal_id?` · `status` · `trade_type` · `updated_at` · `validated_at?` · `validated_by_initiator` · `validated_by_partner`

Liens : `initiator_id` → `profiles` · `last_offer_by` → `profiles` · `listing_id` → `marketplace_listings` · `partner_id` → `profiles` · `proposal_id` → `marketplace_proposals`

## Jeux, défis et récompenses (48)

### `achievement_events`

`created_at` · `event_data` · `event_type` · `id` · `processed` · `processed_at?` · `processing_error?` · `student_id`

Liens : `student_id` → `profiles`

### `achievement_migrations`

`id` · `metadata?` · `migrated_at` · `migration_name` · `records_migrated?`

### `achievement_progress`

`achievement_id` · `completed_at?` · `context_key?` · `current_value` · `id` · `is_active` · `progress_percentage?` · `started_at` · `student_id` · `target_value` · `updated_at`

Liens : `achievement_id` → `achievements` · `student_id` → `profiles`

### `achievement_stats_metadata`

`changes_since_refresh` · `id` · `last_refresh`

### `achievements`

`category?` · `context` · `created_at` · `description` · `display_order` · `icon` · `id` · `is_active` · `metadata` · `name` · `unlock_type` · `updated_at`

### `bonus_history`

`class_id?` · `created_at` · `created_by?` · `delta` · `id` · `reason?` · `student_id`

Liens : `class_id` → `classes` · `created_by` → `profiles` · `student_id` → `profiles`

### `buddy_skins`

`description?` · `id` · `image_path` · `is_enabled` · `name` · `palotin_type` · `sort_order` · `unlock_method` · `unlock_requirement`

### `daily_game_rewards`

`actual_reward` · `created_at` · `game_date` · `game_id` · `game_type` · `id` · `is_first_win_of_day` · `student_id` · `theoretical_reward` · `week_start`

Liens : `student_id` → `profiles`

### `game_2048_scores`

`best_score` · `created_at` · `games_played` · `id` · `tiles_2048_reached` · `tiles_4096_reached` · `updated_at` · `user_id`

### `game_achievements`

`category` · `created_at` · `description` · `element?` · `gidouilles_reward` · `icon_url` · `id` · `name` · `prestige_reward` · `requirement_type` · `requirement_value` · `slug`

### `game_challenge_attempts`

`answer_given` · `attempted_at` · `challenge_id` · `challenge_instance` · `combat_id?` · `correct_answer` · `id` · `success` · `time_taken` · `user_id`

Liens : `challenge_id` → `game_challenges` · `combat_id` → `game_combats` · `user_id` → `profiles`

### `game_challenges`

`answer` · `avg_time_taken?` · `category` · `challenge_type` · `created_at` · `created_by?` · `difficulty` · `element` · `hint?` · `id` · `is_active` · `question` · `show_answer?` · `slug` · `timer` · `times_attempted` · `times_succeeded` · `updated_at` · `variables` · `view_config`

Liens : `created_by` → `profiles`

### `game_class_settings`

`base_difficulty` · `challenge_timer_multiplier` · `class_id` · `created_at` · `gidouilles_multiplier` · `id` · `leaderboard_enabled` · `multiplayer_enabled` · `updated_at` · `xp_multiplier`

Liens : `class_id` → `classes`

### `game_combats`

`combat_flow` · `completed_at?` · `created_at` · `current_round` · `current_turn` · `id` · `invited_player_ids` · `monster_endurance_remaining?` · `monster_id` · `monster_snapshot` · `organizer_id` · `outcome?` · `player_snapshots` · `prestige_gained?` · `pyrs_gained?` · `ready_player_ids` · `started_at?` · `status` · `turn_order` · `updated_at` · `xp_gained?`

Liens : `monster_id` → `game_monsters` · `organizer_id` → `profiles`

### `game_leaderboards`

`challenges_completed` · `combats_won` · `created_at` · `id` · `prestige_earned` · `rank?` · `season_identifier` · `updated_at` · `user_id`

Liens : `user_id` → `profiles`

### `game_monsters`

`attack_coefficient` · `category` · `created_at` · `defeated_at?` · `defeated_by?` · `element` · `id` · `img_head_url` · `img_url` · `is_dead` · `level` · `max_endurance` · `name` · `position?` · `spawned_at` · `spawned_by?` · `updated_at`

Liens : `defeated_by` → `profiles` · `spawned_by` → `profiles`

### `game_player_achievements`

`achievement_id` · `completed` · `completed_at?` · `created_at` · `id` · `progress` · `updated_at` · `user_id`

Liens : `achievement_id` → `game_achievements` · `user_id` → `profiles`

### `game_players`

`combats_lost` · `combats_won` · `created_at` · `help_bubbles_enabled` · `help_bubbles_seen` · `id` · `last_played_at?` · `level` · `music_settings` · `prestige` · `pyrs_earth` · `pyrs_earth_spent` · `pyrs_fire` · `pyrs_fire_spent` · `pyrs_water` · `pyrs_water_spent` · `pyrs_wind` · `pyrs_wind_spent` · `total_combats` · `tutorial_completed_at?` · `tutorial_stage` · `updated_at` · `user_id` · `xp`

Liens : `user_id` → `profiles`

### `game_spell_decks`

`created_at` · `deck_name` · `id` · `is_active` · `spell_ids` · `updated_at` · `user_id`

Liens : `user_id` → `profiles`

### `game_spells`

`created_at` · `element` · `id` · `last_upgraded_at?` · `level` · `power` · `spell_num` · `type` · `unlocked_at` · `updated_at` · `user_id`

Liens : `user_id` → `profiles`

### `game_timeslots`

`challenge_ids` · `class_id` · `created_at` · `difficulty` · `ends_at` · `id` · `is_active` · `name` · `starts_at` · `updated_at`

Liens : `class_id` → `classes`

### `gidouilles_activity`

`class_id?` · `created_at` · `created_by?` · `delta` · `id` · `reason?` · `student_id`

Liens : `class_id` → `classes` · `created_by` → `profiles` · `student_id` → `profiles`

### `mathemo_scores`

`best_word_length` · `created_at` · `first_try_count` · `games_played` · `games_won` · `id` · `total_score` · `updated_at` · `user_id`

### `minesweeper_achievements`

`created_at` · `description` · `difficulty_specific` · `icon` · `id` · `name` · `unlock_condition`

### `minesweeper_games`

`cells_revealed?` · `completed_at?` · `created_at` · `difficulty` · `flags_used?` · `gidouilles_awarded?` · `grid_state` · `hint_penalty_applied` · `hints_used` · `id` · `mines_count` · `points_earned` · `reduced_penalty_hints` · `started_at?` · `status` · `student_id?` · `time_seconds?` · `undo_used`

Liens : `student_id` → `profiles`

### `minesweeper_multiplayer_game_state`

`cells_revealed?` · `flags_used?` · `last_action?` · `match_id` · `player_id` · `time_elapsed?` · `updated_at`

Liens : `match_id` → `minesweeper_multiplayer_matches`

### `minesweeper_multiplayer_matches`

`completed_at?` · `created_at` · `difficulty` · `duration_seconds?` · `elo_change?` · `id` · `loser_reward?` · `match_type` · `player1_gidouilles?` · `player1_id` · `player1_time?` · `player2_gidouilles?` · `player2_id` · `player2_time?` · `seed` · `started_at?` · `status` · `winner_id?` · `winner_reward?`

### `minesweeper_multiplayer_queue`

`difficulty` · `id` · `joined_at` · `match_type` · `rank?` · `status` · `student_id`

### `minesweeper_player_stats`

`best_win_streak?` · `created_at` · `games_played?` · `games_won?` · `quick_losses?` · `quick_wins?` · `rank?` · `ranked_best_streak?` · `ranked_losses?` · `ranked_win_streak?` · `ranked_wins?` · `season` · `student_id` · `total_gidouilles_earned?` · `total_matches?` · `updated_at` · `win_streak?`

### `minesweeper_reference_times`

`calculated_at?` · `created_at` · `cycle` · `difficulty` · `fallback_time` · `max_bound` · `min_bound` · `min_samples` · `reference_time` · `sample_count?` · `updated_at`

### `minesweeper_reference_times_history`

`created_at` · `cycle` · `difficulty` · `id` · `reference_time` · `sample_count` · `week_end` · `week_start`

### `minesweeper_student_achievements`

`achievement_id` · `difficulty?` · `game_id?` · `id` · `student_id` · `unlocked_at`

Liens : `achievement_id` → `minesweeper_achievements` · `game_id` → `minesweeper_games` · `student_id` → `profiles`

### `minesweeper_tournament_3bv_reference`

`cycle` · `difficulty` · `reference_3bvs` · `sample_count` · `updated_at`

### `minesweeper_tournament_classes`

`class_id` · `tournament_id`

Liens : `class_id` → `classes` · `tournament_id` → `minesweeper_tournaments`

### `minesweeper_tournament_games`

`completed_at?` · `game_number` · `grid_3bv?` · `grid_state?` · `id` · `score?` · `seed` · `started_at` · `status` · `student_id` · `time_seconds?` · `tournament_id`

Liens : `student_id` → `profiles` · `tournament_id` → `minesweeper_tournaments`

### `minesweeper_tournaments`

`created_at` · `creator_id` · `creator_role` · `description?` · `difficulty` · `end_date` · `id` · `name` · `podium_places` · `podium_rewards` · `scope` · `start_date` · `status` · `top_x_games` · `updated_at`

Liens : `creator_id` → `profiles`

### `reward_events`

`amount?` · `class_id?` · `created_at` · `created_by?` · `description` · `event_type` · `id` · `item_name?` · `metadata?` · `reward_type` · `source_id?` · `source_table` · `student_id`

Liens : `class_id` → `classes` · `created_by` → `profiles` · `student_id` → `profiles`

### `riddle_assignments`

`assigned_at` · `assigned_by` · `class_id?` · `id` · `riddle_id` · `student_id?`

Liens : `assigned_by` → `profiles` · `class_id` → `classes` · `riddle_id` → `riddles` · `student_id` → `profiles`

### `riddle_attempts`

`attempt_number` · `created_at` · `gidouilles_awarded` · `id` · `is_correct?` · `riddle_id` · `student_id` · `submitted_answer` · `validated_at?` · `validated_by?`

Liens : `riddle_id` → `riddles` · `student_id` → `profiles` · `validated_by` → `profiles`

### `riddle_of_the_day`

`auto_selected` · `created_at` · `date` · `id` · `riddle_id` · `selected_by?`

Liens : `riddle_id` → `riddles` · `selected_by` → `profiles`

### `riddles`

`answer?` · `correction` · `created_at` · `created_by` · `difficulty` · `genre?` · `id` · `image_url?` · `riddle_number` · `statement` · `status` · `title` · `updated_at`

Liens : `created_by` → `profiles`

### `student_achievements`

`achievement_id` · `context_data?` · `gidouilles_awarded` · `id` · `points_awarded` · `student_id` · `unlock_reason?` · `unlocked_at` · `unlocked_by?`

Liens : `achievement_id` → `achievements` · `student_id` → `profiles` · `unlocked_by` → `profiles`

### `student_buddies`

`change_count` · `created_at` · `current_streak` · `equipped_skin_id?` · `last_activity_date?` · `last_xp_date?` · `level` · `longest_streak` · `palotin_type` · `student_id` · `themes_explored` · `updated_at` · `xp` · `xp_earned_today`

Liens : `equipped_skin_id` → `buddy_skins` · `student_id` → `profiles`

### `vip_card_config`

`common_probability` · `config_name` · `created_at` · `description?` · `epic_probability` · `id` · `is_active` · `legendary_probability` · `rare_probability` · `updated_at` · `valid_from?` · `valid_until?`

### `vip_card_templates`

`action?` · `base_price` · `category?` · `created_at` · `description` · `id` · `image_path` · `is_enabled` · `is_purchasable` · `max_owned_per_student` · `name` · `rarity` · `sell_price?` · `sort_order?` · `updated_at` · `uses_total?`

### `vip_cards_activity`

`action` · `card_instance_id` · `card_template_id` · `created_at` · `id` · `metadata?` · `student_id`

Liens : `student_id` → `profiles`

### `weekly_best_rewards`

`best_reward_game_id?` · `best_reward_game_type` · `best_theoretical_reward` · `bonus_awarded?` · `bonus_awarded_at?` · `created_at` · `id` · `student_id` · `updated_at` · `week_end` · `week_start`

Liens : `student_id` → `profiles`

### `weekly_rewards`

`class_id` · `created_at` · `gidouilles_awarded?` · `id` · `reason?` · `student_id` · `week_end` · `week_start`

Liens : `class_id` → `classes` · `student_id` → `profiles`

## Google Classroom (12)

### `class_google_classroom_links`

`class_id` · `created_at` · `created_by` · `google_course_id` · `id`

Liens : `class_id` → `classes` · `created_by` → `profiles` · `google_course_id` → `google_classroom_courses`

### `coursework_categories`

`class_id` · `color?` · `created_at` · `created_by` · `display_order` · `icon?` · `id` · `name` · `updated_at`

Liens : `class_id` → `classes` · `created_by` → `profiles`

### `coursework_materials`

`coursework_id` · `created_at` · `file_name` · `file_url` · `google_file_id?` · `id` · `material_type` · `mime_type?` · `thumbnail_url?` · `title?`

Liens : `coursework_id` → `google_classroom_coursework`

### `google_classroom_courses`

`alternate_link?` · `course_state` · `created_at` · `description_heading?` · `enrollment_code?` · `google_course_id` · `id` · `last_synced_at` · `name` · `room?` · `section?` · `teacher_id` · `updated_at`

Liens : `teacher_id` → `profiles`

### `google_classroom_coursework`

`alternate_link?` · `coursework_type` · `created_at` · `created_time` · `description?` · `due_date?` · `due_time?` · `google_course_id` · `google_coursework_id` · `id` · `last_synced_at` · `max_points?` · `state` · `title` · `topic_id?` · `updated_at` · `updated_time` · `work_type`

Liens : `google_course_id` → `google_classroom_courses` · `topic_id` → `google_classroom_topics`

### `google_classroom_material_attachments`

`created_at` · `file_name` · `file_url` · `google_file_id?` · `google_material_id` · `id` · `material_type` · `mime_type?` · `thumbnail_url?` · `title?`

Liens : `google_material_id` → `google_classroom_materials`

### `google_classroom_materials`

`alternate_link?` · `created_at` · `created_time` · `description?` · `google_course_id` · `google_material_id` · `id` · `last_synced_at` · `state` · `title` · `topic_id?` · `updated_at` · `updated_time`

Liens : `google_course_id` → `google_classroom_courses` · `topic_id` → `google_classroom_topics`

### `google_classroom_topics`

`created_at` · `google_course_id` · `google_topic_id` · `id` · `last_synced_at` · `name` · `updated_at` · `updated_time`

Liens : `google_course_id` → `google_classroom_courses`

### `google_integrations`

`access_token` · `created_at` · `google_email` · `id` · `last_sync_at?` · `refresh_token` · `scopes` · `teacher_id` · `token_expiry` · `updated_at`

Liens : `teacher_id` → `profiles`

### `shared_coursework`

`category_id?` · `class_id` · `course_name?` · `coursework_id` · `created_at` · `description_override?` · `display_order` · `id` · `shared_by` · `teacher_name?` · `topic_id?` · `updated_at` · `visible`

Liens : `category_id` → `coursework_categories` · `class_id` → `classes` · `coursework_id` → `google_classroom_coursework` · `shared_by` → `profiles` · `topic_id` → `google_classroom_topics`

### `shared_coursework_students`

`created_at` · `id` · `shared_coursework_id` · `student_id`

Liens : `shared_coursework_id` → `shared_coursework` · `student_id` → `profiles`

### `shared_materials`

`category_id?` · `class_id` · `course_name?` · `created_at` · `description_override?` · `id` · `material_id` · `shared_by` · `teacher_name?` · `topic_id?` · `updated_at` · `visible`

Liens : `category_id` → `coursework_categories` · `class_id` → `classes` · `material_id` → `google_classroom_materials` · `shared_by` → `profiles` · `topic_id` → `google_classroom_topics`

## Outils du professeur (kanban, tableau blanc, tableur, constructions) (12)

### `construction_demo_scripts`

`author_id` · `created_at?` · `dsl_script` · `id` · `name` · `updated_at?`

Liens : `author_id` → `profiles`

### `constructions`

`author_id?` · `created_at?` · `description?` · `dsl_script?` · `format` · `id` · `is_public?` · `script` · `title` · `updated_at?`

Liens : `author_id` → `profiles`

### `kanban_boards`

`class_id?` · `created_at` · `id` · `owner_id` · `title` · `updated_at`

Liens : `class_id` → `classes` · `owner_id` → `profiles`

### `kanban_card_assignees`

`assigned_at` · `assigned_by?` · `card_id` · `user_id`

Liens : `assigned_by` → `profiles` · `card_id` → `kanban_cards` · `user_id` → `profiles`

### `kanban_card_tags`

`card_id` · `created_at` · `tag_id`

Liens : `card_id` → `kanban_cards` · `tag_id` → `kanban_tags`

### `kanban_cards`

`column_id` · `created_at` · `description?` · `due_date?` · `id` · `position` · `title` · `updated_at`

Liens : `column_id` → `kanban_columns`

### `kanban_columns`

`board_id` · `created_at` · `id` · `position` · `title`

Liens : `board_id` → `kanban_boards`

### `kanban_tags`

`board_id` · `color` · `created_at` · `id` · `name`

Liens : `board_id` → `kanban_boards`

### `spreadsheets`

`created_at` · `data` · `description?` · `id` · `name` · `updated_at` · `user_id`

Liens : `user_id` → `profiles`

### `user_whiteboard_template_favorites`

`created_at` · `template_id` · `user_id`

Liens : `template_id` → `whiteboard_templates` · `user_id` → `profiles`

### `whiteboard_export_counters`

`class_id` · `counter` · `created_at` · `export_date` · `id` · `updated_at`

Liens : `class_id` → `classes`

### `whiteboard_templates`

`category` · `created_at` · `created_by?` · `description?` · `id` · `is_public` · `is_system` · `name` · `page_data` · `thumbnail?` · `updated_at`

Liens : `created_by` → `profiles`

## Tuteur et recherche documentaire (RAG) (4)

### `rag_chunks`

`chunk_index` · `content` · `document_id` · `embedding?` · `id` · `metadata?` · `search_vector`

Liens : `document_id` → `rag_documents`

### `rag_documents`

`content` · `content_hash` · `created_at` · `enabled_for_rag?` · `grades?` · `id` · `metadata?` · `source_id?` · `source_type` · `teacher_id?` · `title` · `topics?` · `updated_at`

Liens : `teacher_id` → `profiles`

### `tutor_conversations`

`assignment_id?` · `class_id?` · `created_at?` · `effort_score?` · `ended_at?` · `exercise_correction?` · `exercise_id?` · `exercise_statement?` · `exercise_topic?` · `id` · `is_active?` · `max_help_level_reached?` · `message_count?` · `started_at?` · `student_id` · `topics_covered?` · `updated_at?`

Liens : `assignment_id` → `worksheet_assignments` · `class_id` → `classes` · `student_id` → `profiles`

### `tutor_messages`

`cheat_detected?` · `content` · `conversation_id` · `created_at?` · `help_level?` · `help_method_used?` · `id` · `response_time_ms?` · `role` · `tokens_used?`

Liens : `conversation_id` → `tutor_conversations`

## Exploitation (journaux, configuration, cache) (11)

### `app_config`

`description?` · `key` · `updated_at` · `updated_by?` · `value`

### `audit_logs`

`action` · `created_at` · `id` · `ip_address?` · `new_values?` · `old_values?` · `record_id?` · `table_name` · `user_agent?` · `user_id?`

### `background_job_runs`

`completed_at?` · `error_message?` · `execution_time_ms?` · `id` · `job_name` · `metadata?` · `started_at` · `status`

### `bug_reports`

`auto_generated?` · `category` · `created_at` · `description` · `id` · `page_url?` · `resolution_notes?` · `resolved_at?` · `resolved_by?` · `screenshot_path?` · `screenshot_url?` · `session_context?` · `severity` · `status` · `title` · `updated_at` · `user_agent?` · `user_id` · `viewport_size?`

Liens : `resolved_by` → `profiles` · `user_id` → `profiles`

### `bug_reports_config`

`auto_report_enabled` · `fab_enabled` · `freeze_detection_enabled` · `freeze_prompt_enabled` · `id` · `singleton_key` · `updated_at` · `updated_by?`

Liens : `updated_by` → `profiles`

### `daily_summaries`

`bonus_gained?` · `bonus_used?` · `class_id` · `created_at` · `gidouilles_gained?` · `gidouilles_lost?` · `id` · `sent_at?` · `student_id` · `summary_date` · `updated_at` · `vip_cards_gained?` · `vip_cards_used?` · `warnings_issued?` · `warnings_removed?`

Liens : `class_id` → `classes` · `student_id` → `profiles`

### `error_logs`

`browser_name?` · `browser_version?` · `column_number?` · `context?` · `created_at` · `device_type?` · `error_name?` · `error_signature?` · `error_type` · `file_path?` · `id` · `line_number?` · `message` · `os_name?` · `request_body?` · `request_headers?` · `request_method?` · `resolution_notes?` · `resolved?` · `resolved_at?` · `resolved_by?` · `response_time?` · `session_id?` · `severity` · `stack_trace?` · `status_code?` · `tags?` · `url` · `user_agent?` · `user_id?` · `user_role?` · `viewport_height?` · `viewport_width?`

Liens : `resolved_by` → `profiles` · `user_id` → `profiles`

### `error_occurrences`

`created_at` · `error_signature` · `error_type` · `file_path?` · `first_seen` · `id` · `is_resolved?` · `last_error_log_id?` · `last_seen` · `line_number?` · `message` · `occurrence_count` · `severity` · `updated_at` · `url?`

Liens : `last_error_log_id` → `error_logs`

### `orphaned_documents`

`file_name` · `file_size?` · `id` · `mime_type?` · `original_chapter_id` · `original_class_id` · `original_created_at?` · `original_document_id` · `orphaned_at` · `orphaned_storage_path` · `teacher_id` · `title`

Liens : `teacher_id` → `profiles`

### `rate_limits`

`count` · `created_at?` · `expires_at` · `id` · `key`

### `server_cache`

`created_at?` · `expires_at` · `key` · `value`

## Vues (25)

`active_student_warnings` · `admin_content_stats` · `admin_error_stats_24h` · `admin_job_failures` · `admin_job_status` · `admin_online_users` · `admin_pg_cron_jobs` · `admin_user_activity` · `deck_stats_view` · `game_scores_unified` · `migration_review_tree` · `minesweeper_achievements_compat` · `minesweeper_leaderboard` · `minesweeper_multiplayer_leaderboard` · `minesweeper_student_achievement_progress` · `minesweeper_student_achievements_compat` · `minesweeper_tournament_standings` · `resources` · `riddle_progress` · `riddle_stats` · `riddle_student_history` · `student_achievement_stats` · `student_coursework_view` · `student_point_state_v` · `user_conversations_view`

## Fonctions (313)

`abandon_multiplayer_match` · `abandon_tournament_game` · `accept_proposal_atomic` · `add_buddy_xp` · `add_student_gidouilles` · `add_warning` · `add_warnings_bulk` · `admin_compose_class` · `app_is_anti_fraud_enabled` · `approve_vip_card` · `are_classmates` · `assert_can_read_student` · `assert_teacher_or_admin` · `auto_accept_exact_proposal` · `auto_activate_scheduled_tournaments` · `auto_complete_ended_tournaments` · `auto_expire_listings` · `award_achievement_manual` · `award_random_vip_card` · `award_vip_card_no_cost` · `award_vip_cards_with_filters` · `award_weekly_best_bonuses` · `award_weekly_reward` · `backfill_tournament_scores` · `calculate_3bv` · `calculate_daily_challenge_gidouilles` · `calculate_elo_change` · `calculate_minesweeper_gidouilles` · `calculate_minesweeper_points` · `calculate_riddle_gidouilles` · `calculate_tournament_score` · `calculate_week_boundaries` · `calculate_worksheet_total_points` · `can_access_assignment` · `can_access_kanban_board` · `can_access_kanban_column` · `can_assign_kanban_card` · `can_grant_kanban_card_assignment` · `can_manage_kanban_card_tag` · `can_moderate_message` · `can_participate_in_tournament` · `can_read_assignment` · `can_view_student_profile` · `check_achievement_prerequisites` · `check_and_increment_rate_limit` · `check_and_unlock_achievements` · `check_daily_trade_limit` · `check_expired_items` · `check_gidouilles_balance` · `check_marketplace_enabled` · `check_match_status` · `check_profanity_simple` · `cleanup_abandoned_minesweeper_games` · `cleanup_account_deletion_audit` · `cleanup_expired_cache` · `cleanup_expired_rate_limits` · `cleanup_old_audit_logs` · `cleanup_old_errors` · `cleanup_old_job_runs` · `cleanup_stale_presence` · `cleanup_stale_queue_entries` · `cleanup_stale_trades` · `cleanup_stuck_job_runs` · `close_school_year` · `complete_job_run` · `complete_minesweeper_game` · `complete_multiplayer_match` · `complete_tournament_game` · `compute_calculer_level` · `compute_chercher_level` · `compute_communiquer_level` · `compute_competence_level` · `compute_daily_summary` · `compute_modeliser_level` · `compute_raisonner_level` · `compute_representer_level` · `count_student_active_cards` · `count_user_notebooks` · `count_user_python_files` · `create_1on1_chat` · `create_tournament` · `current_school_year` · `curriculum_point_reference_counts` · `curriculum_referenced_points` · `delete_all_resolved_errors` · `delete_attachment` · `delete_user_account` · `discard_vip_cards` · `draw_multiple_vip_cards` · `duplicate_template` · `ensure_player_stats_exist` · `execute_trade` · `exercise_has_multiple_variations` · `exercise_has_valid_share_token` · `exercise_variation_count` · `exercises_search_vector` · `extract_plain_text_from_tiptap` · `finalize_tournament` · `game_leaderboard` · `generate_error_signature` · `generate_join_code` · `generate_reward_event_description` · `generate_share_token` · `generate_variant_seed` · `get_2048_user_rank` · `get_accessible_kanban_boards` · `get_achievement_leaderboard` · `get_all_exercise_assignments` · `get_allowed_recipients` · `get_assignment_completion_stats` · `get_class_journal_by_share_token` · `get_classes_by_user_grade` · `get_consent_info` · `get_conversation_participants` · `get_cycle_for_grade` · `get_database_stats` · `get_deck_stats` · `get_due_cards_for_deck` · `get_error_stats` · `get_exercise_by_share_token` · `get_exercise_completion_stats` · `get_friend_ids` · `get_match_state` · `get_mathemo_user_rank` · `get_message_attachments` · `get_message_context_for_moderation` · `get_message_details` · `get_message_reaction_counts` · `get_message_thread` · `get_messages_paginated` · `get_minesweeper_reference_time` · `get_my_error_reports` · `get_my_exercise_assignments` · `get_next_export_counter` · `get_next_riddle_attempt_number` · `get_pending_reports_count` · `get_private_messages_unread_count` · `get_reaction_users` · `get_reports_for_moderation` · `get_riddle_of_the_day` · `get_shop_item_detail` · `get_shop_items` · `get_staff_directory` · `get_student_exercises` · `get_student_week_best` · `get_students_in_class` · `get_students_in_class_by_grade` · `get_teacher_assignment_stats` · `get_teacher_classes_for_messaging` · `get_teacher_classes_with_data` · `get_teacher_classes_with_students` · `get_teacher_exercise_assignments` · `get_template_statistics` · `get_templates_for_context` · `get_tournament_details` · `get_unread_count` · `get_user_conversations` · `get_user_frequent_templates` · `get_user_inbox` · `get_user_moderation_history` · `get_user_sent_messages` · `get_user_status` · `get_whiteboard_templates` · `get_worksheet_by_share_token` · `grade_ancestors` · `grant_parental_consent` · `grant_specific_vip_card` · `grant_vip_cards_after_action` · `had_class_access_to_assignment` · `has_full_access` · `has_individual_assignment` · `has_pending_request_from` · `has_proposal_on_listing` · `increment_rate_limit` · `initialize_default_categories` · `insert_tutor_messages` · `is_admin` · `is_assignment_creator` · `is_class_member` · `is_class_student` · `is_class_teacher` · `is_classmate` · `is_conversation_participant` · `is_evaluation_owner` · `is_exercise_parameterized` · `is_file_assigned_to_student` · `is_friend` · `is_in_assigned_class` · `is_kanban_board_member` · `is_my_student` · `is_notebook_assigned_to_student` · `is_riddle_assigned_to_student` · `is_riddle_of_the_day` · `is_series_owner` · `is_student` · `is_student_in_class` · `is_teacher_for_shared_coursework` · `is_teacher_of_class` · `is_teacher_of_student` · `is_teacher_or_admin` · `is_user_restricted` · `is_valid_grade_array` · `join_multiplayer_queue` · `leave_multiplayer_queue` · `lock_cards` · `log_moderation_action` · `log_template_action` · `mark_checkpoint_hint_revealed` · `mark_conversation_read` · `mark_message_as_read` · `marketplace_hidden_creators` · `minesweeper_scoped_leaderboard` · `move_message_to_folder` · `my_school` · `next_curriculum_point_code` · `normalize_grade_array` · `normalize_grade_value` · `process_achievement_event` · `process_weekly_rewards` · `promote_user_to_admin` · `purchase_shop_item` · `purchase_vip_card` · `rag_hybrid_search` · `recalculate_minesweeper_reference_times` · `record_game_reward` · `record_listing_view` · `record_listing_views_batch` · `record_minesweeper_loss` · `redistribute_tournament_rewards` · `refresh_achievement_stats` · `refresh_achievement_stats_if_needed` · `reject_vip_card` · `remove_student_vip_card` · `remove_vip_card` · `remove_warnings_bulk` · `reopen_school_year` · `reorder_curriculum_objectives` · `reorder_curriculum_points` · `reorder_curriculum_themes` · `reorder_worksheet_exercises` · `reorder_worksheet_sections` · `report_message` · `request_vip_card_activation` · `resolve_card_instances` · `resolve_error` · `resolve_error_by_signature` · `resolve_marketplace_participants` · `resolve_open_class_by_code` · `resolve_tag_ids` · `restore_vip_card_instance` · `review_report` · `run_cleanup_all` · `run_cleanup_expired_data` · `run_daily_summaries` · `run_flag_stale_python_rechecks` · `run_recalculate_minesweeper_ref_times` · `run_weekly_best_bonuses` · `run_weekly_rewards` · `same_school` · `search_private_messages` · `search_resources` · `search_users_unaccent` · `sell_vip_card` · `send_private_message` · `set_journal_entry_homework` · `set_riddle_of_the_day` · `shared_coursework_is_restricted` · `shares_tournament` · `soft_delete_message` · `soft_delete_warning` · `start_job_run` · `start_match` · `start_tournament_game` · `student_can_read_evaluation` · `student_can_read_series` · `student_has_exercise_access` · `student_has_worksheet_access` · `submit_riddle_attempt` · `tag_slug` · `teacher_owns_riddle` · `toggle_message_star` · `toggle_reaction` · `unaccent` · `unlock_cards` · `unlock_specific_cards` · `update_achievement_progress` · `update_class_gidouilles` · `update_game_state` · `update_message_status` · `update_student_bonus` · `update_student_competence_level` · `update_student_gidouilles` · `update_student_observable_state` · `update_student_point_state` · `update_tutor_conversation_stats` · `upsert_2048_score` · `upsert_checkpoint_run` · `upsert_error_occurrence` · `upsert_mathemo_score` · `upsert_user_presence` · `use_2048_power` · `use_detector` · `use_hint` · `use_item` · `use_mathemo_power` · `use_minesweeper_undo` · `use_vip_card` · `validate_1on1_chat_creation` · `validate_attachment_upload` · `validate_class_message_recipients` · `validate_message_recipients` · `validate_minesweeper_win` · `validate_riddle_attempt`
