-- =============================================================================
-- Fix — delete_exercise_images() bloqué par le garde storage.protect_delete
-- =============================================================================
-- Bug : le trigger `delete_exercise_images()` (AFTER DELETE ON exercises) fait un
--   `DELETE FROM storage.objects` direct. Or Supabase protège storage.objects via
--   `storage.protect_delete()` (trigger `protect_objects_delete`, STATEMENT-level)
--   qui lève « Direct deletion from storage tables is not allowed » SAUF si
--   `current_setting('storage.allow_delete_query') = 'true'`.
--   `delete_exercise_images()` ne pose PAS ce flag → la suppression de
--   storage.objects échoue → **toute suppression d'exercice échoue** (SQLSTATE 42501),
--   y compris en cascade depuis la suppression d'un profil (RGPD / effacement).
--
-- Vérifié : le garde `protect_objects_delete` existe AUSSI en prod EU → bug présent
--   en prod (pas seulement en local). Confirmé : supprimer un exercice même SANS
--   image échoue (le garde est statement-level).
--
-- Correctif : poser `storage.allow_delete_query = 'true'` en portée transaction
--   (set_config(..., true)) avant les DELETE — méthode sanctionnée par Supabase pour
--   les suppressions directes côté serveur. Débloque aussi le cleanup des tests.
--
-- ADDITIF / SAFE TO PUSH (remplace la fonction trigger). NON poussée automatiquement.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_exercise_images() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  storage_path TEXT;
  image_pattern TEXT;
BEGIN
  -- Autorise la suppression directe sur storage.objects pour CETTE transaction
  -- (sinon storage.protect_delete() lève et la suppression de l'exercice échoue).
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  -- Build storage path pattern for this exercise's images
  -- Images are stored at: {userId}/{exerciseId}/{filename}
  storage_path := OLD.created_by || '/' || OLD.id || '/';

  DELETE FROM storage.objects
  WHERE bucket_id = 'exercise-images'
    AND name LIKE storage_path || '%';

  -- Also check for images with exercise ID in the filename (alternate pattern)
  image_pattern := '%' || OLD.id || '%';
  DELETE FROM storage.objects
  WHERE bucket_id = 'exercise-images'
    AND owner = OLD.created_by
    AND name LIKE image_pattern;

  RETURN OLD;
END;
$$;
