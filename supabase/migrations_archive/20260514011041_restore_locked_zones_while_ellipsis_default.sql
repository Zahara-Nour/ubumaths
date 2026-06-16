-- Migration: Restore `while {{cond | "..."}}` defaults
-- Created: 2026-05-14
--
-- This reverts the previous fix (20260514010325) which forced the
-- `while` zone defaults to `"False"`. Pedagogically, the teacher
-- prefers showing `while ...:` to the student so the "à compléter"
-- signal is explicit. The runtime risk of an infinite loop
-- (`bool(Ellipsis) is True`) is mitigated upstream: the exercise
-- viewer now blocks every action (Run / Vérifier / Soumettre / Appeler)
-- whenever any zone still holds its initial default value — the
-- student must replace every placeholder before the code can be
-- executed.
--
-- Idempotent REPLACE — only touches exercises that still carry the
-- `False` value from the previous fix.

UPDATE python_exercises
SET starter_code = REPLACE(
	starter_code,
	'{{cond | "False"}}',
	'{{cond | "..."}}'
)
WHERE starter_code LIKE '%{{cond | "False"}}%';
