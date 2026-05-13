-- Migration: Fix the locked-zones `while` defaults left as `...` (Ellipsis)
-- Created: 2026-05-14
--
-- The previous locked-zones migration (20260513215211) preserved the
-- expression captured from the original starter as the marker default —
-- including the placeholder `...` that some Bac authors used on the
-- `while` line. Trouble: `bool(Ellipsis) is True` in Python, so the
-- rendered initial code `while ...:` is an infinite loop. As soon as
-- the student clicks "Vérifier" or the "Tester ma fonction" button
-- without first replacing the zone, Pyodide spins until the 5s worker
-- timeout (then the 10s client timeout surfaces as a generic error).
--
-- This migration replaces the dangerous marker `{{cond | "..."}}` with
-- `{{cond | "False"}}` everywhere it occurs in `starter_code`. The
-- `while False:` form is always runtime-safe: the loop simply does
-- nothing on the first iteration, the function returns immediately.
--
-- Other Ellipsis-as-default patterns (`u = {{... | "..."}}`,
-- `return {{result | "..."}}`) are NOT touched: they yield an
-- Ellipsis value that breaks the next computation, which surfaces as
-- a TypeError immediately rather than an infinite loop — bad UX, but
-- not a deadlock.

UPDATE python_exercises
SET starter_code = REPLACE(
	starter_code,
	'{{cond | "..."}}',
	'{{cond | "False"}}'
)
WHERE starter_code LIKE '%{{cond | "..."}}%';
