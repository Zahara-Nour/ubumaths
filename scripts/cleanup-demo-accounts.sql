-- ============================================================================
-- Cleanup : suppression des comptes de démonstration
-- Lot 1 du refactor « professeur unique » (branche refactor/single-teacher)
-- Doc : docs/wip/single-teacher-refactor.md
-- ============================================================================
--
-- Supprime :
--   • 4 comptes professeurs de démo (jamais connectés) :
--       Baguette / Escargot / Fromage / Croissant (@voltairedoha.com)
--   • leurs 4 classes archivées + toutes les class_members associées (cascade)
--   • 20 élèves « démo-only » : rattachés UNIQUEMENT à des classes démo, jamais connectés
--   • clara.rousseau@voltairedoha.com : élève à cheval (classe David archivée + classe démo),
--     jamais connectée — suppression demandée explicitement.
--   → 25 comptes au total.
--
-- Mécanisme : DELETE FROM auth.users  → cascade vérifiée (pg_constraint) :
--     profiles.id           -> auth.users   ON DELETE CASCADE
--     classes.teacher_id     -> profiles    ON DELETE CASCADE
--     class_members.class_id -> classes     ON DELETE CASCADE
--     class_members.student_id -> profiles  ON DELETE CASCADE
--   (Supprimer le profil seul laisserait l'auth.users : on supprime donc l'auth.users.)
--
-- SÉCURITÉ : tout est dans UNE transaction avec garde-fous PRE et POST.
--   Si un compteur dévie de l'attendu, ou si une cible a déjà une connexion,
--   ou si une cible démo appartient à une classe de David → RAISE EXCEPTION → ROLLBACK.
--   Aucune suppression partielle possible.
--
-- EXÉCUTION : lancer UNE FOIS contre la prod (Supabase SQL editor, ou psql en
--   rôle postgres/service). Ne PAS verser dans supabase/migrations/ (nettoyage de
--   données, pas de schéma). En cas d'erreur affichée : la transaction est annulée
--   (faire ROLLBACK; si la session reste en transaction abortée).
-- ============================================================================

BEGIN;

-- David — professeur unique conservé : 97c1d5e4-5fa0-44ce-be83-ed5467f3a424

-- 0) État AVANT (pour les post-checks)
CREATE TEMP TABLE _before ON COMMIT DROP AS
SELECT count(DISTINCT cm.student_id) AS david_active_students
FROM class_members cm
JOIN classes c ON c.id = cm.class_id
WHERE cm.status = 'active'
  AND c.teacher_id = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';

-- 1) Ensemble cible (par critères, pas par UUID en dur sauf David)
CREATE TEMP TABLE _targets ON COMMIT DROP AS
WITH demo_teachers AS (
  SELECT id FROM profiles
  WHERE role = 'teacher'
    AND email IN (
      'jean.baguette@voltairedoha.com',
      'marie.escargot@voltairedoha.com',
      'pierre.fromage@voltairedoha.com',
      'claire.croissant@voltairedoha.com'
    )
),
memberships AS (
  SELECT cm.student_id,
         bool_or(c.teacher_id IN (SELECT id FROM demo_teachers))     AS in_demo,
         bool_or(c.teacher_id NOT IN (SELECT id FROM demo_teachers)) AS in_nondemo
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.status = 'active'
  GROUP BY cm.student_id
),
demo_only_students AS (   -- élèves rattachés UNIQUEMENT à des classes démo
  SELECT student_id AS id FROM memberships WHERE in_demo AND NOT in_nondemo
),
clara AS (
  SELECT id FROM profiles WHERE email = 'clara.rousseau@voltairedoha.com'
)
SELECT id, 'teacher'::text      AS kind FROM demo_teachers
UNION ALL SELECT id, 'demo_student' FROM demo_only_students
UNION ALL SELECT id, 'clara'        FROM clara;

-- 2) Garde-fous PRÉ-suppression
DO $$
DECLARE
  n_teacher int; n_demo int; n_clara int; n_logged int; n_david_owned int;
BEGIN
  SELECT count(*) FILTER (WHERE kind = 'teacher'),
         count(*) FILTER (WHERE kind = 'demo_student'),
         count(*) FILTER (WHERE kind = 'clara')
    INTO n_teacher, n_demo, n_clara
  FROM _targets;

  -- aucun élève « démo » ne doit appartenir à une classe de David
  SELECT count(DISTINCT cm.student_id)
    INTO n_david_owned
  FROM _targets t
  JOIN class_members cm ON cm.student_id = t.id AND cm.status = 'active'
  JOIN classes c ON c.id = cm.class_id
  WHERE t.kind = 'demo_student'
    AND c.teacher_id = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';

  -- aucune cible ne doit avoir de connexion
  SELECT count(*)
    INTO n_logged
  FROM _targets t
  JOIN auth.users u ON u.id = t.id
  WHERE u.last_sign_in_at IS NOT NULL;

  IF n_teacher     <> 4  THEN RAISE EXCEPTION 'PRE: attendu 4 profs démo, trouvé %', n_teacher; END IF;
  IF n_demo        <> 20 THEN RAISE EXCEPTION 'PRE: attendu 20 élèves démo-only, trouvé %', n_demo; END IF;
  IF n_clara       <> 1  THEN RAISE EXCEPTION 'PRE: attendu 1 clara rousseau, trouvé %', n_clara; END IF;
  IF n_david_owned <> 0  THEN RAISE EXCEPTION 'PRE: % élève(s) démo appartiennent à une classe de David (interdit)', n_david_owned; END IF;
  IF n_logged      <> 0  THEN RAISE EXCEPTION 'PRE: % cible(s) ont déjà une connexion, abandon', n_logged; END IF;

  RAISE NOTICE 'PRE OK : 4 profs + 20 élèves démo + clara = 25 comptes, 0 connexion.';
END $$;

-- 3) Suppression (cascade via auth.users)
DELETE FROM auth.users WHERE id IN (SELECT id FROM _targets);

-- 4) Garde-fous POST-suppression
DO $$
DECLARE
  n_teacher_left int; n_david_classes int; n_david_students int; n_before int;
BEGIN
  SELECT count(*) INTO n_teacher_left FROM profiles WHERE role = 'teacher';
  IF n_teacher_left <> 1 THEN RAISE EXCEPTION 'POST: attendu 1 prof (David), trouvé %', n_teacher_left; END IF;

  SELECT count(*) INTO n_david_classes
  FROM classes WHERE teacher_id = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
  IF n_david_classes <> 6 THEN RAISE EXCEPTION 'POST: classes de David = % (attendu 6)', n_david_classes; END IF;

  SELECT david_active_students INTO n_before FROM _before;
  SELECT count(DISTINCT cm.student_id) INTO n_david_students
  FROM class_members cm JOIN classes c ON c.id = cm.class_id
  WHERE cm.status = 'active' AND c.teacher_id = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';

  -- David ne doit perdre QUE clara (un seul élève)
  IF n_david_students <> n_before - 1 THEN
    RAISE EXCEPTION 'POST: élèves actifs David = % (attendu % = avant - 1)', n_david_students, n_before - 1;
  END IF;

  RAISE NOTICE 'POST OK : 1 prof, 6 classes David, % élèves actifs David (-1 = clara).', n_david_students;
END $$;

-- Tout est validé → COMMIT.
COMMIT;
