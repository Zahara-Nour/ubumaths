-- Seed Data: Default Message Templates
-- Description: Creates default system templates for common messaging scenarios
-- Run this after migration 097 is applied

-- Note: These templates use a system admin user ID
-- You'll need to replace 'SYSTEM_ADMIN_ID' with an actual admin user ID from your profiles table

-- Get the first admin user ID (or create a system user)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Try to find an admin user
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  -- If no admin found, we'll use a placeholder that should be updated
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found. Please update created_by values after creating an admin user.';
    admin_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- =====================================================
  -- Template 1: Question sur Assessment
  -- =====================================================
  INSERT INTO message_templates (
    title,
    description,
    subject_template,
    body_template,
    trigger_type,
    trigger_config,
    scope,
    created_by,
    variables,
    is_active
  ) VALUES (
    'Question sur évaluation',
    'Template pour poser une question au professeur concernant une évaluation',
    'Question sur {{assessment_title}}',
    '<p>Bonjour {{teacher_name}},</p><p>J''ai une question concernant l''évaluation <strong>{{assessment_title}}</strong> :</p><p>{{student_question}}</p><p>🔗 <a href="{{assessment_link}}">Lien vers l''évaluation</a></p><p>Merci d''avance pour votre aide,<br>{{student_name}}<br>{{class_name}} - {{today_date}}</p>',
    'assessment_question',
    '{}',
    'system',
    admin_id,
    '[
      {"name": "assessment_title", "label": "Titre de l''évaluation", "example": "Devoir Maison #3", "required": true},
      {"name": "assessment_link", "label": "Lien vers l''évaluation", "example": "https://ubumaths.com/assessments/123", "required": true},
      {"name": "student_question", "label": "Question de l''étudiant", "example": "[Saisie par l''étudiant]", "required": true, "userInput": true},
      {"name": "teacher_name", "label": "Nom du professeur", "example": "M. Martin"},
      {"name": "student_name", "label": "Nom de l''étudiant", "example": "Marie Dubois"},
      {"name": "class_name", "label": "Nom de la classe", "example": "6ème A"},
      {"name": "today_date", "label": "Date du jour", "example": "22 octobre 2025"}
    ]'::jsonb,
    true
  );

  -- =====================================================
  -- Template 2: Demande d'aide SRS
  -- =====================================================
  INSERT INTO message_templates (
    title,
    description,
    subject_template,
    body_template,
    trigger_type,
    trigger_config,
    scope,
    created_by,
    variables,
    is_active
  ) VALUES (
    'Demande d''aide - SRS',
    'Template pour demander de l''aide concernant un deck de révision',
    'Aide pour le deck {{deck_name}}',
    '<p>Bonjour {{teacher_name}},</p><p>J''ai besoin d''aide concernant le deck de révision <strong>{{deck_name}}</strong>.</p><p>{{student_message}}</p><p>🔗 <a href="{{deck_link}}">Lien vers le deck</a></p><p>Merci pour votre aide,<br>{{student_name}}<br>{{class_name}} - {{today_date}}</p>',
    'srs_help',
    '{}',
    'system',
    admin_id,
    '[
      {"name": "deck_name", "label": "Nom du deck", "example": "Fractions - Niveau 6ème", "required": true},
      {"name": "deck_link", "label": "Lien vers le deck", "example": "https://ubumaths.com/srs/decks/456", "required": true},
      {"name": "student_message", "label": "Message de l''étudiant", "example": "[Saisie par l''étudiant]", "required": true, "userInput": true},
      {"name": "teacher_name", "label": "Nom du professeur", "example": "M. Martin"},
      {"name": "student_name", "label": "Nom de l''étudiant", "example": "Marie Dubois"},
      {"name": "class_name", "label": "Nom de la classe", "example": "6ème A"},
      {"name": "today_date", "label": "Date du jour", "example": "22 octobre 2025"}
    ]'::jsonb,
    true
  );

  -- =====================================================
  -- Template 3: Notification système
  -- =====================================================
  INSERT INTO message_templates (
    title,
    description,
    subject_template,
    body_template,
    trigger_type,
    trigger_config,
    scope,
    created_by,
    variables,
    is_active
  ) VALUES (
    'Notification système',
    'Template pour les notifications automatiques du système',
    'Notification : {{notification_title}}',
    '<p>Bonjour {{student_name}},</p><p>{{notification_body}}</p><p>🔗 <a href="{{notification_link}}">Voir plus de détails</a></p><p>Cordialement,<br>L''équipe Ubumaths<br>{{today_date}}</p>',
    'system_notification',
    '{}',
    'system',
    admin_id,
    '[
      {"name": "notification_title", "label": "Titre de la notification", "example": "Nouvelle évaluation disponible", "required": true},
      {"name": "notification_body", "label": "Corps de la notification", "example": "Une nouvelle évaluation a été assignée à votre classe.", "required": true},
      {"name": "notification_link", "label": "Lien d''action", "example": "https://ubumaths.com/dashboard"},
      {"name": "student_name", "label": "Nom de l''étudiant", "example": "Marie Dubois"},
      {"name": "today_date", "label": "Date du jour", "example": "22 octobre 2025"}
    ]'::jsonb,
    true
  );

  -- =====================================================
  -- Template 4: Message général
  -- =====================================================
  INSERT INTO message_templates (
    title,
    description,
    subject_template,
    body_template,
    trigger_type,
    trigger_config,
    scope,
    created_by,
    variables,
    is_active
  ) VALUES (
    'Message général',
    'Template général pour toute communication avec le professeur',
    '{{custom_subject}}',
    '<p>Bonjour {{teacher_name}},</p><p>{{custom_message}}</p><p>Cordialement,<br>{{student_name}}<br>{{class_name}} - {{today_date}}</p>',
    'general',
    '{}',
    'system',
    admin_id,
    '[
      {"name": "custom_subject", "label": "Sujet personnalisé", "example": "Question sur le cours", "required": true, "userInput": true},
      {"name": "custom_message", "label": "Message personnalisé", "example": "[Saisie par l''étudiant]", "required": true, "userInput": true},
      {"name": "teacher_name", "label": "Nom du professeur", "example": "M. Martin"},
      {"name": "student_name", "label": "Nom de l''étudiant", "example": "Marie Dubois"},
      {"name": "class_name", "label": "Nom de la classe", "example": "6ème A"},
      {"name": "today_date", "label": "Date du jour", "example": "22 octobre 2025"}
    ]'::jsonb,
    true
  );

  -- =====================================================
  -- Template 5: Réponse à énigme (future feature)
  -- =====================================================
  INSERT INTO message_templates (
    title,
    description,
    subject_template,
    body_template,
    trigger_type,
    trigger_config,
    scope,
    created_by,
    variables,
    is_active
  ) VALUES (
    'Soumission de réponse - Énigme',
    'Template pour soumettre une réponse à une énigme (fonctionnalité future)',
    'Réponse Énigme #{{enigma_number}}',
    '<p>Bonjour {{teacher_name}},</p><p>Je vous soumets ma réponse à l''énigme n°<strong>{{enigma_number}}</strong> :</p><p>📝 <strong>Ma réponse :</strong><br>{{student_answer}}</p><p>🔗 <a href="{{enigma_link}}">Lien vers l''énigme avec correction</a></p><p>Cordialement,<br>{{student_name}}<br>{{class_name}} - {{today_date}}</p>',
    'enigma_answer',
    '{}',
    'system',
    admin_id,
    '[
      {"name": "enigma_number", "label": "Numéro de l''énigme", "example": "42", "required": true},
      {"name": "enigma_link", "label": "Lien vers l''énigme", "example": "https://ubumaths.com/enigma/789", "required": true},
      {"name": "student_answer", "label": "Réponse de l''étudiant", "example": "[Saisie par l''étudiant]", "required": true, "userInput": true},
      {"name": "teacher_name", "label": "Nom du professeur", "example": "M. Martin"},
      {"name": "student_name", "label": "Nom de l''étudiant", "example": "Marie Dubois"},
      {"name": "class_name", "label": "Nom de la classe", "example": "6ème A"},
      {"name": "today_date", "label": "Date du jour", "example": "22 octobre 2025"}
    ]'::jsonb,
    false  -- Inactive by default since enigma feature doesn't exist yet
  );

  RAISE NOTICE 'Successfully created 5 default message templates';
END $$;
