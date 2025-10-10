-- Create schools table for managing educational institutions
-- Migration 008: Schools Management
-- A school is uniquely identified by name, city, and country
-- Only admin users can manage schools

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,

  -- Optional fields
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure unique schools per (name, city, country) combination
  CONSTRAINT unique_school UNIQUE (name, city, country)
);

-- Add school_id to profiles table
ALTER TABLE profiles
ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_school_id ON profiles(school_id);

-- Enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view schools (needed for registration/selection)
CREATE POLICY "Anyone can view schools"
  ON schools
  FOR SELECT
  USING (true);

-- RLS Policy: Only admins can insert schools
CREATE POLICY "Only admins can insert schools"
  ON schools
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Only admins can update schools
CREATE POLICY "Only admins can update schools"
  ON schools
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Only admins can delete schools
CREATE POLICY "Only admins can delete schools"
  ON schools
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE schools IS 'Educational institutions where students and teachers belong';
COMMENT ON COLUMN profiles.school_id IS 'Foreign key linking users to their school';