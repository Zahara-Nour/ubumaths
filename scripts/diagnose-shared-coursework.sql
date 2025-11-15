-- Diagnostic Script for Shared Coursework
-- =========================================
-- Run this in Supabase SQL Editor to debug why shared coursework isn't showing

-- 1. Check if there are any shared coursework records
SELECT
    sc.id,
    sc.visible,
    sc.class_id,
    c.name as class_name,
    gcw.title as coursework_title,
    p.email as shared_by_teacher
FROM shared_coursework sc
JOIN classes c ON c.id = sc.class_id
JOIN google_classroom_coursework gcw ON gcw.id = sc.coursework_id
JOIN profiles p ON p.id = sc.shared_by
ORDER BY sc.created_at DESC
LIMIT 10;

-- 2. Check class members (students in classes where coursework is shared)
SELECT
    cm.student_id,
    p.email as student_email,
    p.firstname,
    p.lastname,
    c.name as class_name,
    c.id as class_id
FROM class_members cm
JOIN profiles p ON p.id = cm.student_id
JOIN classes c ON c.id = cm.class_id
WHERE c.id IN (
    SELECT DISTINCT class_id FROM shared_coursework
)
ORDER BY c.name, p.lastname;

-- 3. Check full join: which students should see which coursework
SELECT
    p.email as student_email,
    p.firstname || ' ' || p.lastname as student_name,
    c.name as class_name,
    gcw.title as coursework_title,
    sc.visible,
    sc.created_at as shared_at
FROM class_members cm
JOIN profiles p ON p.id = cm.student_id
JOIN classes c ON c.id = cm.class_id
JOIN shared_coursework sc ON sc.class_id = cm.class_id
JOIN google_classroom_coursework gcw ON gcw.id = sc.coursework_id
WHERE sc.visible = true
ORDER BY p.email, sc.created_at DESC;

-- 4. Count shared coursework by class
SELECT
    c.name as class_name,
    COUNT(*) as total_shared,
    SUM(CASE WHEN sc.visible THEN 1 ELSE 0 END) as visible_count
FROM shared_coursework sc
JOIN classes c ON c.id = sc.class_id
GROUP BY c.name
ORDER BY c.name;
