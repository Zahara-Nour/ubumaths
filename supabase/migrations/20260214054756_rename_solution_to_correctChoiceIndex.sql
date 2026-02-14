-- Rename 'solution' key to 'correctChoiceIndex' in JSONB variations array
UPDATE question_templates SET variations = (
  SELECT jsonb_agg(
    CASE WHEN v ? 'solution'
    THEN (v - 'solution') || jsonb_build_object('correctChoiceIndex', v->'solution')
    ELSE v END
  ) FROM jsonb_array_elements(variations) AS v
) WHERE variations IS NOT NULL;

-- Rename 'solution' key to 'correctChoiceIndex' in JSONB shared column
UPDATE question_templates SET shared =
  (shared - 'solution') || jsonb_build_object('correctChoiceIndex', shared->'solution')
WHERE shared IS NOT NULL AND shared ? 'solution';
