-- Migration: Fix ALL Typst templates - remove #if conditionals from all templates
-- This migration updates ALL templates that contain #if conditionals, not just system defaults

-- Update all templates that contain the problematic #if syntax
-- We'll use REPLACE to remove the conditional wrappers while keeping the content
UPDATE public.worksheet_templates
SET
    template_content = REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    template_content,
                    -- Remove #if conditionals for total_points
                    E'#if "{{total_points}}" != "" [\n    *Total :* {{total_points}} points\n  ]',
                    '[*Total :* {{total_points}} points]'
                ),
                -- Remove #if conditionals for instructions
                E'#if "{{instructions}}" != "" [\n  *Consignes :* {{instructions}}\n]',
                '*Consignes :* {{instructions}}'
            ),
            -- Also handle variations with different spacing/formatting
            E'#if "{{total_points}}" != "" [',
            '['
        ),
        E'#if "{{instructions}}" != "" [',
        '['
    ),
    updated_at = NOW()
WHERE template_content LIKE '%#if%';

-- Log how many templates were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % templates with #if conditionals', updated_count;
END $$;