-- Migration 105: Fix TipTap JSON plain text extraction
-- Description: Create a proper function to extract plain text from TipTap JSON content

-- =====================================================
-- FUNCTION: extract_plain_text_from_tiptap
-- Description: Recursively extracts plain text from TipTap JSON structure
-- =====================================================
CREATE OR REPLACE FUNCTION extract_plain_text_from_tiptap(p_content JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text TEXT := '';
  v_node JSONB;
  v_child JSONB;
BEGIN
  -- Handle null or empty content
  IF p_content IS NULL THEN
    RETURN '';
  END IF;

  -- Check if this node has a text property (leaf node)
  IF p_content ? 'text' THEN
    v_text := p_content->>'text';
    RETURN COALESCE(v_text, '');
  END IF;

  -- Check if this node has content array (parent node)
  IF p_content ? 'content' AND jsonb_typeof(p_content->'content') = 'array' THEN
    -- Iterate through content array
    FOR v_child IN SELECT jsonb_array_elements(p_content->'content')
    LOOP
      v_text := v_text || extract_plain_text_from_tiptap(v_child);

      -- Add space between blocks (paragraphs, headings, etc.)
      IF v_child->>'type' IN ('paragraph', 'heading', 'listItem') THEN
        v_text := v_text || ' ';
      END IF;
    END LOOP;
  END IF;

  RETURN v_text;
END;
$$;

COMMENT ON FUNCTION extract_plain_text_from_tiptap IS 'Extracts plain text from TipTap JSON structure for search and preview';

-- =====================================================
-- Update send_private_message to use new extraction function
-- =====================================================
CREATE OR REPLACE FUNCTION send_private_message(
  p_sender_id UUID,
  p_recipient_ids UUID[],
  p_subject TEXT,
  p_content JSONB,
  p_is_group_message BOOLEAN DEFAULT FALSE,
  p_class_id UUID DEFAULT NULL,
  p_parent_message_id UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
  v_recipient_id UUID;
  v_plain_text TEXT;
  v_thread_root_id UUID;
BEGIN
  -- Validate permissions
  IF p_is_group_message AND p_class_id IS NOT NULL THEN
    -- Validate class message
    IF NOT validate_class_message_recipients(p_sender_id, p_class_id) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to this class';
    END IF;

    -- Get all students in the class
    SELECT array_agg(student_id)
    INTO p_recipient_ids
    FROM get_students_in_class(p_class_id);

  ELSE
    -- Validate individual recipients
    IF NOT validate_message_recipients(p_sender_id, p_recipient_ids) THEN
      RAISE EXCEPTION 'You do not have permission to send messages to one or more recipients';
    END IF;
  END IF;

  -- Extract plain text from TipTap JSON using new function
  v_plain_text := extract_plain_text_from_tiptap(p_content);
  v_plain_text := substring(trim(v_plain_text), 1, 5000); -- Limit length and trim whitespace

  -- Determine thread root
  IF p_parent_message_id IS NOT NULL THEN
    -- Get thread root from parent
    SELECT COALESCE(thread_root_id, id)
    INTO v_thread_root_id
    FROM private_messages
    WHERE id = p_parent_message_id;
  ELSE
    v_thread_root_id := NULL; -- This will be the root
  END IF;

  -- Insert message
  INSERT INTO private_messages (
    sender_id,
    subject,
    content,
    plain_text,
    parent_message_id,
    thread_root_id,
    is_group_message,
    class_id,
    recipient_count
  ) VALUES (
    p_sender_id,
    p_subject,
    p_content,
    v_plain_text,
    p_parent_message_id,
    v_thread_root_id,
    p_is_group_message,
    p_class_id,
    array_length(p_recipient_ids, 1)
  )
  RETURNING id INTO v_message_id;

  -- If this is a root message, set its own thread_root_id
  IF v_thread_root_id IS NULL THEN
    UPDATE private_messages
    SET thread_root_id = v_message_id
    WHERE id = v_message_id;
  END IF;

  -- Create inbox entries for each recipient
  FOREACH v_recipient_id IN ARRAY p_recipient_ids
  LOOP
    INSERT INTO message_inbox (
      message_id,
      recipient_id,
      status
    ) VALUES (
      v_message_id,
      v_recipient_id,
      'inbox'
    );
  END LOOP;

  RETURN v_message_id;
END;
$$;

COMMENT ON FUNCTION send_private_message IS 'Sends a private message with validation and creates inbox entries for recipients';

-- =====================================================
-- Fix existing messages with JSON in plain_text
-- =====================================================
UPDATE private_messages
SET plain_text = substring(trim(extract_plain_text_from_tiptap(content)), 1, 5000)
WHERE plain_text LIKE '{%' OR plain_text LIKE '[%';

COMMENT ON COLUMN private_messages.plain_text IS 'Plain text extracted from TipTap content for search and preview';
