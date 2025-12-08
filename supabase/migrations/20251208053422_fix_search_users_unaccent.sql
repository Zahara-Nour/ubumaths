  -- Drop and recreate the function with fixes
  DROP FUNCTION IF EXISTS search_users_unaccent(TEXT, INTEGER);

  CREATE OR REPLACE FUNCTION search_users_unaccent(
      search_term TEXT,
      result_limit INTEGER DEFAULT 50
  )
  RETURNS TABLE (
      id UUID,
      email TEXT,
      firstname TEXT,
      lastname TEXT,
      role user_role,
      school_id UUID,
      grade TEXT,
      is_test BOOLEAN,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      school_name TEXT,
      class_ids UUID[]
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
      RETURN QUERY
      SELECT
          p.id,
          p.email,
          p.firstname,
          p.lastname,
          p.role,
          p.school_id,
          p.grade,
          p.is_test,
          p.created_at,
          p.updated_at,
          s.name AS school_name,
          COALESCE(
              ARRAY_AGG(cm.class_id) FILTER (WHERE cm.class_id IS NOT NULL),
              '{}'::UUID[]
          ) AS class_ids
      FROM profiles p
      LEFT JOIN schools s ON p.school_id = s.id
      LEFT JOIN class_members cm ON p.id = cm.student_id
      WHERE
          unaccent(LOWER(p.email)) LIKE '%' || unaccent(LOWER(search_term)) || '%'
          OR unaccent(LOWER(COALESCE(p.firstname, ''))) LIKE '%' || unaccent(LOWER(search_term)) || '%'
          OR unaccent(LOWER(COALESCE(p.lastname, ''))) LIKE '%' || unaccent(LOWER(search_term)) || '%'
      GROUP BY p.id, p.email, p.firstname, p.lastname, p.role, p.school_id,
               p.grade, p.is_test, p.created_at, p.updated_at, s.name
      ORDER BY p.lastname ASC, p.firstname ASC
      LIMIT result_limit;
  END;
  $$;

  GRANT EXECUTE ON FUNCTION search_users_unaccent(TEXT, INTEGER) TO authenticated;