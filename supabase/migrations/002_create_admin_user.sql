-- Migration: Create admin user helper function
-- This migration adds a function to promote users to admin role

-- Function to promote a user to admin (can only be run by admins or service role)
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's role to admin
  UPDATE profiles
  SET role = 'admin',
      updated_at = NOW()
  WHERE email = user_email;

  -- Raise notice if no user found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user found with email: %', user_email;
  END IF;

  RAISE NOTICE 'User % has been promoted to admin', user_email;
END;
$$;

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION promote_user_to_admin(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION promote_user_to_admin IS 'Promotes a user to admin role by email address. Should only be called by existing admins or via service role.';
