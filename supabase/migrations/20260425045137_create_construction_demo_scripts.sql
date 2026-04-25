-- Table for saving test construction DSL scripts (used only on /construction-demo page).

CREATE TABLE IF NOT EXISTS public.construction_demo_scripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    dsl_script text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE construction_demo_scripts IS 'Test construction DSL scripts for the demo page';
COMMENT ON COLUMN construction_demo_scripts.name IS 'User-chosen name for the script';
COMMENT ON COLUMN construction_demo_scripts.dsl_script IS 'DSL source code';

-- Unique name per user
CREATE UNIQUE INDEX idx_demo_scripts_author_name
    ON construction_demo_scripts(author_id, name);

-- RLS: each user can only access their own scripts
ALTER TABLE construction_demo_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own demo scripts"
    ON construction_demo_scripts FOR ALL
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON construction_demo_scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_demo_scripts TO authenticated;
