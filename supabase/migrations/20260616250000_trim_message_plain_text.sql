-- =============================================================================
-- Fix — messages.plain_text : espace de fin parasite
-- =============================================================================
-- `extract_plain_text_from_tiptap()` ajoute un espace APRÈS chaque bloc
-- (paragraph/heading/listItem) pour séparer les blocs → le dernier bloc laisse un
-- **espace en fin**. `plain_text` sert aux aperçus de conversation et à la recherche :
-- un espace de fin (ou de début) est indésirable.
--
-- Correctif : `btrim()` du texte assemblé dans `process_message_content` (le caller),
-- pas dans l'extracteur récursif — pour ne PAS rogner les espaces intentionnels des
-- nœuds texte internes. Détecté par tests/integration/database/chat-triggers.test.ts.
--
-- ADDITIF / SAFE TO PUSH (remplace une fonction trigger par sa version corrigée).
-- NON poussée automatiquement.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_message_content() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_plain_text TEXT;
  v_has_profanity BOOLEAN;
BEGIN
  -- Extract plain text from TipTap JSON, trimming leading/trailing whitespace
  -- (extract_plain_text_from_tiptap appends a separator space after each block).
  v_plain_text := btrim(extract_plain_text_from_tiptap(NEW.content));
  NEW.plain_text := v_plain_text;

  -- Check for profanity (basic check, server-side will do more sophisticated checking)
  v_has_profanity := check_profanity_simple(v_plain_text);

  IF v_has_profanity THEN
    NEW.is_flagged := true;
    NEW.flag_reason := 'Profanité détectée automatiquement';
  END IF;

  RETURN NEW;
END;
$$;
