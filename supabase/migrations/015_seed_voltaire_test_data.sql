-- Seed test data for Lycée Franco-Qatari Voltaire
-- Migration: 015_seed_voltaire_test_data
-- Creates: 4 teachers, 5 classes, 25 students with proper relationships

-- Note: These users will NOT be able to authenticate via Google OAuth
-- They serve as test data for development and UI testing

-- Ensure pgcrypto extension is enabled (for gen_salt and crypt functions)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Get the school ID for Lycée Franco-Qatari Voltaire
DO $$
DECLARE
  v_school_id UUID;
  v_teacher1_id UUID;
  v_teacher2_id UUID;
  v_teacher3_id UUID;
  v_teacher4_id UUID;
  v_existing_teacher_id UUID;
  v_class1_id UUID;
  v_class2_id UUID;
  v_class3_id UUID;
  v_class4_id UUID;
  v_class5_id UUID;
  v_student_ids UUID[];
  v_student_id UUID;
  i INTEGER;
BEGIN
  -- Get or create school ID
  SELECT id INTO v_school_id
  FROM schools
  WHERE name = 'Lycée Franco-Qatari Voltaire'
  LIMIT 1;

  IF v_school_id IS NULL THEN
    -- Create the school if it doesn't exist
    INSERT INTO schools (name, country, city)
    VALUES ('Lycée Franco-Qatari Voltaire', 'Qatar', 'Doha')
    RETURNING id INTO v_school_id;

    RAISE NOTICE 'Created school "Lycée Franco-Qatari Voltaire" with ID: %', v_school_id;
  ELSE
    RAISE NOTICE 'Using existing school_id: %', v_school_id;
  END IF;

  -- ============================================================
  -- PART 1: CREATE 4 NEW TEACHERS
  -- ============================================================

  -- Teacher 1: Prof. Jean Baguette
  v_teacher1_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  ) VALUES (
    v_teacher1_id,
    '00000000-0000-0000-0000-000000000000',
    'prof.baguette@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(),
    jsonb_build_object('full_name', 'Jean Baguette'),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (
    id,
    email,
    firstname,
    lastname,
    role,
    school_id,
    grade,
    gidouilles,
    vip_cards,
    class_ids,
    created_at,
    updated_at
  ) VALUES (
    v_teacher1_id,
    'prof.baguette@voltairedoha.com',
    'Jean',
    'Baguette',
    'teacher',
    v_school_id,
    NULL,
    0,
    '{}'::jsonb,
    ARRAY[]::UUID[],
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Teacher 2: Mme. Claire Croissant
  v_teacher2_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  ) VALUES (
    v_teacher2_id,
    '00000000-0000-0000-0000-000000000000',
    'mme.croissant@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(),
    jsonb_build_object('full_name', 'Claire Croissant'),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (
    id,
    email,
    firstname,
    lastname,
    role,
    school_id,
    grade,
    gidouilles,
    vip_cards,
    class_ids,
    created_at,
    updated_at
  ) VALUES (
    v_teacher2_id,
    'mme.croissant@voltairedoha.com',
    'Claire',
    'Croissant',
    'teacher',
    v_school_id,
    NULL,
    0,
    '{}'::jsonb,
    ARRAY[]::UUID[],
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Teacher 3: M. Pierre Fromage
  v_teacher3_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  ) VALUES (
    v_teacher3_id,
    '00000000-0000-0000-0000-000000000000',
    'm.fromage@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(),
    jsonb_build_object('full_name', 'Pierre Fromage'),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (
    id,
    email,
    firstname,
    lastname,
    role,
    school_id,
    grade,
    gidouilles,
    vip_cards,
    class_ids,
    created_at,
    updated_at
  ) VALUES (
    v_teacher3_id,
    'm.fromage@voltairedoha.com',
    'Pierre',
    'Fromage',
    'teacher',
    v_school_id,
    NULL,
    0,
    '{}'::jsonb,
    ARRAY[]::UUID[],
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Teacher 4: Prof. Marie Escargot
  v_teacher4_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  ) VALUES (
    v_teacher4_id,
    '00000000-0000-0000-0000-000000000000',
    'prof.escargot@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(),
    jsonb_build_object('full_name', 'Marie Escargot'),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (
    id,
    email,
    firstname,
    lastname,
    role,
    school_id,
    grade,
    gidouilles,
    vip_cards,
    class_ids,
    created_at,
    updated_at
  ) VALUES (
    v_teacher4_id,
    'prof.escargot@voltairedoha.com',
    'Marie',
    'Escargot',
    'teacher',
    v_school_id,
    NULL,
    0,
    '{}'::jsonb,
    ARRAY[]::UUID[],
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Get existing teacher ID
  SELECT id INTO v_existing_teacher_id
  FROM profiles
  WHERE email = 'd.lejolly@voltairedoha.com'
  LIMIT 1;

  IF v_existing_teacher_id IS NULL THEN
    RAISE NOTICE 'Existing teacher d.lejolly@voltairedoha.com not found, skipping 2nde class';
  END IF;

  RAISE NOTICE 'Created 4 new teachers';

  -- ============================================================
  -- PART 2: CREATE 5 CLASSES
  -- ============================================================

  -- Class 1: 6ème Maths
  v_class1_id := gen_random_uuid();
  INSERT INTO classes (
    id,
    teacher_id,
    school_id,
    name,
    description,
    join_code,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_class1_id,
    v_teacher1_id,
    v_school_id,
    '6ème Maths',
    'Classe de mathématiques niveau 6ème',
    'MATH6A',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (join_code) DO NOTHING;

  -- Class 2: 5ème Maths
  v_class2_id := gen_random_uuid();
  INSERT INTO classes (
    id,
    teacher_id,
    school_id,
    name,
    description,
    join_code,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_class2_id,
    v_teacher2_id,
    v_school_id,
    '5ème Maths',
    'Classe de mathématiques niveau 5ème',
    'MATH5B',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (join_code) DO NOTHING;

  -- Class 3: 4ème Maths
  v_class3_id := gen_random_uuid();
  INSERT INTO classes (
    id,
    teacher_id,
    school_id,
    name,
    description,
    join_code,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_class3_id,
    v_teacher3_id,
    v_school_id,
    '4ème Maths',
    'Classe de mathématiques niveau 4ème',
    'MATH4C',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (join_code) DO NOTHING;

  -- Class 4: 3ème Maths
  v_class4_id := gen_random_uuid();
  INSERT INTO classes (
    id,
    teacher_id,
    school_id,
    name,
    description,
    join_code,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_class4_id,
    v_teacher4_id,
    v_school_id,
    '3ème Maths',
    'Classe de mathématiques niveau 3ème',
    'MATH3D',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (join_code) DO NOTHING;

  -- Class 5: 2nde Maths (only if existing teacher found)
  IF v_existing_teacher_id IS NOT NULL THEN
    v_class5_id := gen_random_uuid();
    INSERT INTO classes (
      id,
      teacher_id,
      school_id,
      name,
      description,
      join_code,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      v_class5_id,
      v_existing_teacher_id,
      v_school_id,
      '2nde Maths',
      'Classe de mathématiques niveau 2nde',
      'MATH2E',
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (join_code) DO NOTHING;
  END IF;

  RAISE NOTICE 'Created 5 classes';

  -- ============================================================
  -- PART 3: CREATE 25 STUDENTS (5 per class)
  -- ============================================================

  -- Class 1 (6ème) - 5 students
  v_student_ids := ARRAY[]::UUID[];

  -- Student 1: Léa Dubois
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'lea.dubois@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Léa Dubois'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'lea.dubois@voltairedoha.com', 'Léa', 'Dubois', 'student', v_school_id, '6ème', 0, '{}'::jsonb, ARRAY[v_class1_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class1_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 2: Lucas Martin
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'lucas.martin@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Lucas Martin'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'lucas.martin@voltairedoha.com', 'Lucas', 'Martin', 'student', v_school_id, '6ème', 0, '{}'::jsonb, ARRAY[v_class1_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class1_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 3: Emma Bernard
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'emma.bernard@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Emma Bernard'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'emma.bernard@voltairedoha.com', 'Emma', 'Bernard', 'student', v_school_id, '6ème', 0, '{}'::jsonb, ARRAY[v_class1_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class1_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 4: Hugo Petit
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'hugo.petit@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Hugo Petit'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'hugo.petit@voltairedoha.com', 'Hugo', 'Petit', 'student', v_school_id, '6ème', 0, '{}'::jsonb, ARRAY[v_class1_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class1_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 5: Camille Roux
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'camille.roux@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Camille Roux'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'camille.roux@voltairedoha.com', 'Camille', 'Roux', 'student', v_school_id, '6ème', 0, '{}'::jsonb, ARRAY[v_class1_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class1_id, v_student_id) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 5 students for 6ème';

  -- Class 2 (5ème) - 5 students
  v_student_ids := ARRAY[]::UUID[];

  -- Student 1: Chloé Thomas
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'chloe.thomas@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Chloé Thomas'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'chloe.thomas@voltairedoha.com', 'Chloé', 'Thomas', 'student', v_school_id, '5ème', 0, '{}'::jsonb, ARRAY[v_class2_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class2_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 2: Nathan Robert
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'nathan.robert@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Nathan Robert'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'nathan.robert@voltairedoha.com', 'Nathan', 'Robert', 'student', v_school_id, '5ème', 0, '{}'::jsonb, ARRAY[v_class2_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class2_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 3: Manon Richard
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'manon.richard@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Manon Richard'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'manon.richard@voltairedoha.com', 'Manon', 'Richard', 'student', v_school_id, '5ème', 0, '{}'::jsonb, ARRAY[v_class2_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class2_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 4: Enzo Durand
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'enzo.durand@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Enzo Durand'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'enzo.durand@voltairedoha.com', 'Enzo', 'Durand', 'student', v_school_id, '5ème', 0, '{}'::jsonb, ARRAY[v_class2_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class2_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 5: Inès Moreau
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'ines.moreau@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Inès Moreau'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'ines.moreau@voltairedoha.com', 'Inès', 'Moreau', 'student', v_school_id, '5ème', 0, '{}'::jsonb, ARRAY[v_class2_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class2_id, v_student_id) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 5 students for 5ème';

  -- Class 3 (4ème) - 5 students
  v_student_ids := ARRAY[]::UUID[];

  -- Student 1: Gabriel Simon
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'gabriel.simon@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Gabriel Simon'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'gabriel.simon@voltairedoha.com', 'Gabriel', 'Simon', 'student', v_school_id, '4ème', 0, '{}'::jsonb, ARRAY[v_class3_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class3_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 2: Zoé Laurent
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'zoe.laurent@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Zoé Laurent'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'zoe.laurent@voltairedoha.com', 'Zoé', 'Laurent', 'student', v_school_id, '4ème', 0, '{}'::jsonb, ARRAY[v_class3_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class3_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 3: Tom Lefebvre
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'tom.lefebvre@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Tom Lefebvre'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'tom.lefebvre@voltairedoha.com', 'Tom', 'Lefebvre', 'student', v_school_id, '4ème', 0, '{}'::jsonb, ARRAY[v_class3_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class3_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 4: Sarah Leroy
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'sarah.leroy@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Sarah Leroy'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'sarah.leroy@voltairedoha.com', 'Sarah', 'Leroy', 'student', v_school_id, '4ème', 0, '{}'::jsonb, ARRAY[v_class3_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class3_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 5: Maxime Garnier
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'maxime.garnier@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Maxime Garnier'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'maxime.garnier@voltairedoha.com', 'Maxime', 'Garnier', 'student', v_school_id, '4ème', 0, '{}'::jsonb, ARRAY[v_class3_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class3_id, v_student_id) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 5 students for 4ème';

  -- Class 4 (3ème) - 5 students
  v_student_ids := ARRAY[]::UUID[];

  -- Student 1: Juliette Chevalier
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'juliette.chevalier@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Juliette Chevalier'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'juliette.chevalier@voltairedoha.com', 'Juliette', 'Chevalier', 'student', v_school_id, '3ème', 0, '{}'::jsonb, ARRAY[v_class4_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class4_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 2: Louis Girard
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'louis.girard@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Louis Girard'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'louis.girard@voltairedoha.com', 'Louis', 'Girard', 'student', v_school_id, '3ème', 0, '{}'::jsonb, ARRAY[v_class4_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class4_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 3: Jade Bonnet
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'jade.bonnet@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Jade Bonnet'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'jade.bonnet@voltairedoha.com', 'Jade', 'Bonnet', 'student', v_school_id, '3ème', 0, '{}'::jsonb, ARRAY[v_class4_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class4_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 4: Arthur Faure
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'arthur.faure@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Arthur Faure'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'arthur.faure@voltairedoha.com', 'Arthur', 'Faure', 'student', v_school_id, '3ème', 0, '{}'::jsonb, ARRAY[v_class4_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class4_id, v_student_id) ON CONFLICT DO NOTHING;

  -- Student 5: Lola Blanc
  v_student_id := gen_random_uuid();
  v_student_ids := array_append(v_student_ids, v_student_id);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, role, aud, created_at, updated_at
  ) VALUES (
    v_student_id, '00000000-0000-0000-0000-000000000000',
    'lola.blanc@voltairedoha.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    NOW(), jsonb_build_object('full_name', 'Lola Blanc'),
    'authenticated', 'authenticated', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
  VALUES (v_student_id, 'lola.blanc@voltairedoha.com', 'Lola', 'Blanc', 'student', v_school_id, '3ème', 0, '{}'::jsonb, ARRAY[v_class4_id])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO class_members (class_id, student_id) VALUES (v_class4_id, v_student_id) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 5 students for 3ème';

  -- Class 5 (2nde) - 5 students (only if class exists)
  IF v_class5_id IS NOT NULL THEN
    v_student_ids := ARRAY[]::UUID[];

    -- Student 1: Antoine Muller
    v_student_id := gen_random_uuid();
    v_student_ids := array_append(v_student_ids, v_student_id);

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      v_student_id, '00000000-0000-0000-0000-000000000000',
      'antoine.muller@voltairedoha.com',
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      NOW(), jsonb_build_object('full_name', 'Antoine Muller'),
      'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
    VALUES (v_student_id, 'antoine.muller@voltairedoha.com', 'Antoine', 'Muller', 'student', v_school_id, '2nde', 0, '{}'::jsonb, ARRAY[v_class5_id])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO class_members (class_id, student_id) VALUES (v_class5_id, v_student_id) ON CONFLICT DO NOTHING;

    -- Student 2: Océane Guerin
    v_student_id := gen_random_uuid();
    v_student_ids := array_append(v_student_ids, v_student_id);

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      v_student_id, '00000000-0000-0000-0000-000000000000',
      'oceane.guerin@voltairedoha.com',
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      NOW(), jsonb_build_object('full_name', 'Océane Guerin'),
      'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
    VALUES (v_student_id, 'oceane.guerin@voltairedoha.com', 'Océane', 'Guerin', 'student', v_school_id, '2nde', 0, '{}'::jsonb, ARRAY[v_class5_id])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO class_members (class_id, student_id) VALUES (v_class5_id, v_student_id) ON CONFLICT DO NOTHING;

    -- Student 3: Mathis Boyer
    v_student_id := gen_random_uuid();
    v_student_ids := array_append(v_student_ids, v_student_id);

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      v_student_id, '00000000-0000-0000-0000-000000000000',
      'mathis.boyer@voltairedoha.com',
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      NOW(), jsonb_build_object('full_name', 'Mathis Boyer'),
      'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
    VALUES (v_student_id, 'mathis.boyer@voltairedoha.com', 'Mathis', 'Boyer', 'student', v_school_id, '2nde', 0, '{}'::jsonb, ARRAY[v_class5_id])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO class_members (class_id, student_id) VALUES (v_class5_id, v_student_id) ON CONFLICT DO NOTHING;

    -- Student 4: Clara Rousseau
    v_student_id := gen_random_uuid();
    v_student_ids := array_append(v_student_ids, v_student_id);

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      v_student_id, '00000000-0000-0000-0000-000000000000',
      'clara.rousseau@voltairedoha.com',
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      NOW(), jsonb_build_object('full_name', 'Clara Rousseau'),
      'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
    VALUES (v_student_id, 'clara.rousseau@voltairedoha.com', 'Clara', 'Rousseau', 'student', v_school_id, '2nde', 0, '{}'::jsonb, ARRAY[v_class5_id])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO class_members (class_id, student_id) VALUES (v_class5_id, v_student_id) ON CONFLICT DO NOTHING;

    -- Student 5: Théo Lambert
    v_student_id := gen_random_uuid();
    v_student_ids := array_append(v_student_ids, v_student_id);

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      v_student_id, '00000000-0000-0000-0000-000000000000',
      'theo.lambert@voltairedoha.com',
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      NOW(), jsonb_build_object('full_name', 'Théo Lambert'),
      'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, email, firstname, lastname, role, school_id, grade, gidouilles, vip_cards, class_ids)
    VALUES (v_student_id, 'theo.lambert@voltairedoha.com', 'Théo', 'Lambert', 'student', v_school_id, '2nde', 0, '{}'::jsonb, ARRAY[v_class5_id])
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO class_members (class_id, student_id) VALUES (v_class5_id, v_student_id) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created 5 students for 2nde';
  END IF;

  -- ============================================================
  -- PART 4: UPDATE TEACHER CLASS_IDS ARRAYS
  -- ============================================================

  UPDATE profiles SET class_ids = ARRAY[v_class1_id] WHERE id = v_teacher1_id;
  UPDATE profiles SET class_ids = ARRAY[v_class2_id] WHERE id = v_teacher2_id;
  UPDATE profiles SET class_ids = ARRAY[v_class3_id] WHERE id = v_teacher3_id;
  UPDATE profiles SET class_ids = ARRAY[v_class4_id] WHERE id = v_teacher4_id;

  IF v_existing_teacher_id IS NOT NULL AND v_class5_id IS NOT NULL THEN
    UPDATE profiles
    SET class_ids = array_append(class_ids, v_class5_id)
    WHERE id = v_existing_teacher_id;
  END IF;

  RAISE NOTICE '=== SEED COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 4 new teachers';
  RAISE NOTICE '  - 5 classes (with unique join codes)';
  RAISE NOTICE '  - 25 students (5 per class)';
  RAISE NOTICE '  - All class_members relationships';
  RAISE NOTICE '  - All class_ids arrays updated';

END $$;
