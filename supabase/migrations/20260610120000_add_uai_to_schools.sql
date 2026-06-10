-- Add UAI (Unité Administrative Immatriculée, ex-RNE) to schools.
--
-- The UAI is the official French establishment identifier: 8 characters,
-- 7 digits followed by 1 uppercase letter (e.g. 0750001H). It is sourced from
-- the national "Annuaire de l'éducation nationale" open dataset and is required
-- for any LSU / SIECLE export. RNE is the former name of the very same code.
--
-- Nullable: schools without a UAI (foreign establishments, demo accounts) stay valid.

ALTER TABLE schools
	ADD COLUMN IF NOT EXISTS uai TEXT;

-- Format guard: NULL allowed, otherwise exactly 7 digits + 1 uppercase letter.
ALTER TABLE schools
	DROP CONSTRAINT IF EXISTS schools_uai_format;

ALTER TABLE schools
	ADD CONSTRAINT schools_uai_format
	CHECK (uai IS NULL OR uai ~ '^[0-9]{7}[A-Z]$');

-- A UAI uniquely identifies an establishment: two schools must not share one.
-- Partial index keeps multiple NULLs allowed.
DROP INDEX IF EXISTS schools_uai_unique;
CREATE UNIQUE INDEX schools_uai_unique ON schools (uai) WHERE uai IS NOT NULL;

COMMENT ON COLUMN schools.uai IS
	'UAI (Unité Administrative Immatriculée), ex-RNE — official 8-char establishment code (7 digits + 1 uppercase letter, e.g. 0750001H). Source: Annuaire de l''éducation nationale (data.education.gouv.fr).';
