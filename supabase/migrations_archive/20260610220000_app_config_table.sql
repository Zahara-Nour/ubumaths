-- ============================================================================
-- Migration: app_config table + anti_fraud_enabled feature flag
-- Date:      2026-06-10
-- Plan:      ~/.claude/plans/immutable-painting-cake.md (Phase 1, lot L1.2)
-- Spec TDD:  docs/wip/srs-anti-fraud-spec-tdd.md (§B7)
-- ============================================================================
-- Table générique app_config pour les feature flags + paramètres app globaux.
--
-- Premier usage : feature flag `anti_fraud_enabled` (false par défaut, le job
-- anti-fraud SRS reste OFF en prod tant que le pool de templates taggés est
-- insuffisant — cf. spec §V2 du doc audit sécurité).
--
-- Schéma minimal (clé/valeur string) pour rester souple sans surcouche typée.
-- Le serveur lit via le helper `app_is_anti_fraud_enabled()` (SECURITY DEFINER)
-- ou via une simple query SELECT côté API admin/job.
-- ============================================================================


-- ============================================================================
-- 1. Table app_config
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    CONSTRAINT chk_app_config_key_len CHECK (char_length(key) BETWEEN 1 AND 100),
    CONSTRAINT chk_app_config_value_len CHECK (char_length(value) <= 4000)
);

COMMENT ON TABLE public.app_config IS
    'Feature flags et paramètres globaux app. Clé string, valeur string. '
    'Lecture : tout authenticated. Écriture : admin uniquement.';

COMMENT ON COLUMN public.app_config.value IS
    'Valeur en string brut. Les consommateurs castent côté code '
    '(boolean → comparaison case-insensitive ''true'').';


-- ============================================================================
-- 2. Seed initial : anti_fraud_enabled = false
-- ============================================================================

INSERT INTO public.app_config (key, value, description)
VALUES (
    'anti_fraud_enabled',
    'false',
    'Active le job de détection anti-fraud SRS. À passer à ''true'' uniquement '
    'quand ≥ 20 templates 6ᵉ sont taggés ET ≥ 5 capacités ont ≥ 2 templates distincts. '
    'Sinon faux positifs garantis.'
)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- 3. Helper SQL SECURITY DEFINER pour lecture rapide
-- ============================================================================

CREATE OR REPLACE FUNCTION public.app_is_anti_fraud_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value
    FROM public.app_config
    WHERE key = 'anti_fraud_enabled'
    LIMIT 1;

    -- Case-insensitive : 'true' / 'TRUE' / 'True' acceptés.
    RETURN lower(coalesce(v_value, 'false')) = 'true';
EXCEPTION
    WHEN OTHERS THEN
        -- Fail-safe : si problème de lecture, on considère désactivé.
        RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.app_is_anti_fraud_enabled() IS
    'Lit app_config.anti_fraud_enabled. Retourne true si value=''true'' (case-insensitive). '
    'Fail-safe : false si table ou row absente.';


-- ============================================================================
-- 4. RLS
-- ============================================================================

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Lecture : tout authenticated (les feature flags ne sont pas secrets).
CREATE POLICY "app_config_select_authenticated"
ON public.app_config
FOR SELECT
TO authenticated
USING (TRUE);

-- Écriture : admin uniquement.
CREATE POLICY "app_config_insert_admin_only"
ON public.app_config
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "app_config_update_admin_only"
ON public.app_config
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "app_config_delete_admin_only"
ON public.app_config
FOR DELETE
TO authenticated
USING (is_admin());


-- ============================================================================
-- 5. GRANTs
-- ============================================================================

GRANT SELECT ON public.app_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_config TO authenticated; -- contrôlé par RLS
GRANT EXECUTE ON FUNCTION public.app_is_anti_fraud_enabled() TO authenticated;
