-- ============================================================================
-- Migration: srs_deck_sections + is_auto_managed + UNIQUE deck × template
-- Date:      2026-06-10
-- Plan:      ~/.claude/plans/immutable-painting-cake.md (Phase 1, lot L3)
-- Spec TDD:  docs/wip/srs-fsrs-spec-tdd.md (§4, §6)
-- Cible:     docs/wip/srs-fsrs-architecture-cible.md (§3.4, §3.5, §3.6)
-- Depends on: 080_create_srs_tables.sql
-- ============================================================================
-- Ajoute trois éléments pour le chantier refonte SRS / FSRS / Référentiel :
--
--   1. Table srs_deck_sections (sous-sections manuelles dans les decks personnels).
--   2. Colonne srs_cards.section_id (FK nullable vers srs_deck_sections).
--   3. Colonne srs_decks.is_auto_managed (true pour le deck Programme auto-géré).
--   4. Index UNIQUE srs_cards (deck_id, template_id) pour permettre
--      ON CONFLICT DO NOTHING dans le helper ensureProgrammeDeckCard.
--
-- Le deck "Programme" (1 par élève) utilise is_auto_managed=true pour bloquer
-- les opérations utilisateur (UPDATE/DELETE refusées par RLS). Ses sections
-- sont calculées dynamiquement à la lecture (À remédier / À renforcer / etc.),
-- elles ne sont jamais persistées dans srs_deck_sections.
--
-- Les decks personnels (is_auto_managed=false) peuvent avoir des sections
-- manuelles via srs_deck_sections. Les cartes pointent vers leur section via
-- srs_cards.section_id (NULL = "non rangées" dans le deck).
-- ============================================================================


-- ============================================================================
-- 1. Table srs_deck_sections
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.srs_deck_sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id         UUID NOT NULL REFERENCES public.srs_decks(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_srs_deck_sections_deck_name UNIQUE (deck_id, name),
    CONSTRAINT chk_srs_deck_sections_name_len CHECK (
        char_length(name) BETWEEN 1 AND 50
    )
);

COMMENT ON TABLE public.srs_deck_sections IS
    'Sous-sections manuelles dans un deck personnel. Interdites sur les decks '
    'auto-gérés (Programme) — voir RLS ci-dessous. Les cartes pointent vers '
    'leur section via srs_cards.section_id (NULL = non rangées).';

COMMENT ON COLUMN public.srs_deck_sections.display_order IS
    'Ordre d''affichage croissant dans le deck.';

CREATE INDEX IF NOT EXISTS idx_srs_deck_sections_deck_order
    ON public.srs_deck_sections(deck_id, display_order);


-- ============================================================================
-- 2. srs_decks.is_auto_managed
-- ============================================================================

ALTER TABLE public.srs_decks
    ADD COLUMN IF NOT EXISTS is_auto_managed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.srs_decks.is_auto_managed IS
    'true = deck géré automatiquement par le système (cas du deck Programme). '
    'L''élève ne peut ni modifier ses cartes ni ajouter de sections manuelles. '
    'Refonte 2026-06-10.';

CREATE INDEX IF NOT EXISTS idx_srs_decks_auto_managed
    ON public.srs_decks(owner_id)
    WHERE is_auto_managed = TRUE;


-- ============================================================================
-- 3. srs_cards.section_id
-- ============================================================================

ALTER TABLE public.srs_cards
    ADD COLUMN IF NOT EXISTS section_id UUID
        REFERENCES public.srs_deck_sections(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.srs_cards.section_id IS
    'FK optionnelle vers une sous-section manuelle (decks personnels uniquement). '
    'NULL = carte non rangée dans une section spécifique. '
    'Toujours NULL dans le deck Programme (auto-géré). Refonte 2026-06-10.';

CREATE INDEX IF NOT EXISTS idx_srs_cards_section_id
    ON public.srs_cards(section_id)
    WHERE section_id IS NOT NULL;


-- ============================================================================
-- 4. UNIQUE (deck_id, template_id) pour ON CONFLICT DO NOTHING
-- ============================================================================
-- Nécessaire pour le helper ensureProgrammeDeckCard (Phase 2) qui veut faire
-- INSERT ... ON CONFLICT (deck_id, template_id) DO NOTHING.
--
-- Hypothèse : aujourd'hui aucun deck ne contient le même template deux fois.
-- Si néanmoins des doublons existent (cas pathologique), on déduplique avant.
-- ============================================================================

-- Sécurité : déduplication préalable des doublons éventuels
DELETE FROM public.srs_cards a
 USING public.srs_cards b
 WHERE a.id > b.id
   AND a.deck_id = b.deck_id
   AND a.template_id = b.template_id
   AND a.template_id IS NOT NULL
   AND a.card_type = 'template';

CREATE UNIQUE INDEX IF NOT EXISTS uq_srs_cards_deck_template
    ON public.srs_cards(deck_id, template_id)
    WHERE template_id IS NOT NULL AND card_type = 'template';

COMMENT ON INDEX public.uq_srs_cards_deck_template IS
    'Garantit unicité (deck, template) parmi les cartes template-based. '
    'Permet ON CONFLICT DO NOTHING dans ensureProgrammeDeckCard.';


-- ============================================================================
-- 5. RLS sur srs_deck_sections
-- ============================================================================

ALTER TABLE public.srs_deck_sections ENABLE ROW LEVEL SECURITY;

-- SELECT : owner du deck
CREATE POLICY "Users can view sections of their decks"
    ON public.srs_deck_sections FOR SELECT
    TO authenticated
    USING (
        deck_id IN (
            SELECT id FROM public.srs_decks WHERE owner_id = auth.uid()
        )
    );

-- INSERT : owner du deck, sur deck non-assigné et non-auto-managé
CREATE POLICY "Users can create sections in their editable decks"
    ON public.srs_deck_sections FOR INSERT
    TO authenticated
    WITH CHECK (
        deck_id IN (
            SELECT id FROM public.srs_decks
             WHERE owner_id = auth.uid()
               AND is_assigned = false
               AND is_auto_managed = false
        )
    );

-- UPDATE : idem INSERT
CREATE POLICY "Users can update sections in their editable decks"
    ON public.srs_deck_sections FOR UPDATE
    TO authenticated
    USING (
        deck_id IN (
            SELECT id FROM public.srs_decks
             WHERE owner_id = auth.uid()
               AND is_assigned = false
               AND is_auto_managed = false
        )
    );

-- DELETE : idem
CREATE POLICY "Users can delete sections in their editable decks"
    ON public.srs_deck_sections FOR DELETE
    TO authenticated
    USING (
        deck_id IN (
            SELECT id FROM public.srs_decks
             WHERE owner_id = auth.uid()
               AND is_assigned = false
               AND is_auto_managed = false
        )
    );

-- Admin override
CREATE POLICY "Admins can manage all srs_deck_sections"
    ON public.srs_deck_sections
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ============================================================================
-- 6. Mise à jour RLS sur srs_decks pour bloquer modifications quand is_auto_managed
-- ============================================================================
-- La policy actuelle "Users can update their own non-assigned decks" autorise
-- l'UPDATE des decks personnels non assignés. On l'étend pour bloquer aussi
-- les decks auto-managés. Idem pour DELETE.
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own non-assigned decks" ON public.srs_decks;
CREATE POLICY "Users can update their own non-assigned decks"
    ON public.srs_decks FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = owner_id
        AND is_assigned = false
        AND is_auto_managed = false
    );

DROP POLICY IF EXISTS "Users can delete their own non-assigned decks" ON public.srs_decks;
CREATE POLICY "Users can delete their own non-assigned decks"
    ON public.srs_decks FOR DELETE
    TO authenticated
    USING (
        auth.uid() = owner_id
        AND is_assigned = false
        AND is_auto_managed = false
    );


-- ============================================================================
-- 7. Mise à jour RLS sur srs_cards pour bloquer modifications quand deck auto-managé
-- ============================================================================
-- Idem pour les cartes : l'élève ne doit pas pouvoir modifier les cartes du
-- deck Programme.
-- ============================================================================

DROP POLICY IF EXISTS "Users can create cards in their non-assigned decks" ON public.srs_cards;
CREATE POLICY "Users can create cards in their non-assigned decks"
    ON public.srs_cards FOR INSERT
    TO authenticated
    WITH CHECK (
        deck_id IN (
            SELECT id FROM public.srs_decks
             WHERE owner_id = auth.uid()
               AND is_assigned = false
               AND is_auto_managed = false
        )
    );

DROP POLICY IF EXISTS "Users can update cards in their non-assigned decks" ON public.srs_cards;
CREATE POLICY "Users can update cards in their non-assigned decks"
    ON public.srs_cards FOR UPDATE
    TO authenticated
    USING (
        deck_id IN (
            SELECT id FROM public.srs_decks
             WHERE owner_id = auth.uid()
               AND is_assigned = false
               AND is_auto_managed = false
        )
    );

DROP POLICY IF EXISTS "Users can delete cards in their non-assigned decks" ON public.srs_cards;
CREATE POLICY "Users can delete cards in their non-assigned decks"
    ON public.srs_cards FOR DELETE
    TO authenticated
    USING (
        deck_id IN (
            SELECT id FROM public.srs_decks
             WHERE owner_id = auth.uid()
               AND is_assigned = false
               AND is_auto_managed = false
        )
    );


-- ============================================================================
-- 8. Trigger update_updated_at sur srs_deck_sections
-- ============================================================================

CREATE TRIGGER update_srs_deck_sections_updated_at
BEFORE UPDATE ON public.srs_deck_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 9. GRANTs
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.srs_deck_sections TO authenticated;


-- ============================================================================
-- FIN
-- ============================================================================
