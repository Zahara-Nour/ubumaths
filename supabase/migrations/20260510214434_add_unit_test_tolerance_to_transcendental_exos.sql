-- Migration: Add unit_test tolerance to exos using transcendentals
-- Created: 2026-05-10
--
-- math.exp / math.log are not mandated correctly-rounded by IEEE 754, so
-- Pyodide's WebAssembly libm can drift by 1 ULP from the test author's
-- environment (node) over multiple iterations. The "Approximation de
-- ln(2)" exo iterates `u = 2*u*exp(-u)` 11 times: bit-level drift accumulates,
-- the displayed strings match (`[0.6931009075876846, 11]`) but Python's
-- strict `==` returns False.
--
-- Add a per-behavior `tolerance` field (eps_abs / eps_rel) to the worker
-- comparison, and set sane values on the two affected exos.
--
-- For these exos, the second element of the tuple is an integer (n) which
-- compares strictly regardless of tolerance — so a wrong n still fails as
-- expected. Only the float component is tolerant.

UPDATE python_exercises
SET validation_config = jsonb_set(
	validation_config,
	'{behavior,tolerance}',
	'{"eps_abs": 0.000001, "eps_rel": 0.000001}'::jsonb
)
WHERE title = 'Approximation de ln(2)';

UPDATE python_exercises
SET validation_config = jsonb_set(
	validation_config,
	'{behavior,tolerance}',
	'{"eps_abs": 0.0001, "eps_rel": 0.0001}'::jsonb
)
WHERE title = 'Suites entrelacées exp — termes(n)';
