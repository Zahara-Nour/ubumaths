-- =============================================================================
-- RPC urgente : classes du professeur (Q139)
-- =============================================================================
--
-- Décision de David (question d'accès tranchée le 2026-10-03) :
--
-- Q139 — get_teacher_classes_with_students(boolean), SECURITY DEFINER, ne
--   contrôlait pas l'appelant : tout élève connecté lisait TOUTES les classes
--   (join_code, noms, gidouilles et vip_cards de tous les élèves).
--   → réservée au professeur / à l'admin (is_teacher_or_admin(), sinon 42501).
--   Seul appelant : src/lib/server/students.ts (pages /dashboard/teacher/**).
--
-- Qui perd quel accès : les élèves ne peuvent plus appeler cette RPC.
-- Personne ne gagne d'accès.
--
-- (Q140, accept_proposal_atomic, est traitée dans une PR séparée.)
--
-- Corps repris de la production (pg_get_functiondef, 2026-10-03) ; md5(prosrc)
-- identique en local et en prod avant migration :
--   get_teacher_classes_with_students  87129e93e5cd9e80bb8314b93030a9ea
-- CREATE OR REPLACE conserve propriétaire (postgres), SECURITY DEFINER,
-- search_path et droits. Droits d'origine en prod (proacl) :
--   {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
-- (déjà sans PUBLIC ni anon : le REVOKE ci-dessous est idempotent.)
--
-- Migration additive (CREATE OR REPLACE + REVOKE/GRANT), aucune donnée touchée.
--
-- ROLLBACK : rejouer la définition d'origine ci-dessous (les droits ne
-- changent pas avec CREATE OR REPLACE).
--
-- CREATE OR REPLACE FUNCTION public.get_teacher_classes_with_students(p_is_test_mode boolean DEFAULT false)
--  RETURNS TABLE(id uuid, name text, description text, join_code text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, students jsonb)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     c.id,
--     c.name,
--     c.description,
--     c.join_code,
--     c.is_active,
--     c.created_at,
--     c.updated_at,
--     -- Aggregate students into JSONB array with all required fields
--     -- Filter by is_test to match the requested mode
--     COALESCE(
--       JSONB_AGG(
--         JSONB_BUILD_OBJECT(
--           'id', p.id,
--           'firstname', p.firstname,
--           'lastname', p.lastname,
--           'full_name', p.full_name,
--           'avatar_url', p.avatar_url,
--           'gidouilles', p.gidouilles,
--           'vip_cards', p.vip_cards,
--           'role', p.role,
--           'is_test', p.is_test
--         )
--         ORDER BY p.firstname NULLS LAST
--       ) FILTER (WHERE p.id IS NOT NULL AND p.is_test = p_is_test_mode),
--       '[]'::JSONB
--     ) AS students
--   FROM classes c
--   LEFT JOIN class_members cm ON c.id = cm.class_id
--   LEFT JOIN profiles p ON cm.student_id = p.id
--   WHERE c.is_active = TRUE
--   GROUP BY c.id, c.name, c.description, c.join_code,
--            c.is_active, c.created_at, c.updated_at
--   ORDER BY c.name;
-- END;
-- $function$;
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_teacher_classes_with_students(p_is_test_mode boolean DEFAULT false)
 RETURNS TABLE(id uuid, name text, description text, join_code text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, students jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Q139 : réservé au professeur / à l'admin (avant : tout compte connecté
  -- lisait toutes les classes, codes d'accès et inventaires compris).
  IF NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès réservé au professeur' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.join_code,
    c.is_active,
    c.created_at,
    c.updated_at,
    -- Aggregate students into JSONB array with all required fields
    -- Filter by is_test to match the requested mode
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', p.id,
          'firstname', p.firstname,
          'lastname', p.lastname,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'gidouilles', p.gidouilles,
          'vip_cards', p.vip_cards,
          'role', p.role,
          'is_test', p.is_test
        )
        ORDER BY p.firstname NULLS LAST
      ) FILTER (WHERE p.id IS NOT NULL AND p.is_test = p_is_test_mode),
      '[]'::JSONB
    ) AS students
  FROM classes c
  LEFT JOIN class_members cm ON c.id = cm.class_id
  LEFT JOIN profiles p ON cm.student_id = p.id
  WHERE c.is_active = TRUE
  GROUP BY c.id, c.name, c.description, c.join_code,
           c.is_active, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_teacher_classes_with_students(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_classes_with_students(boolean) TO authenticated, service_role;
