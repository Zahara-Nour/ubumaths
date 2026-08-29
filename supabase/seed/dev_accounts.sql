-- ==============================================================================
-- Comptes de développement — LOCAL UNIQUEMENT
-- ==============================================================================
-- Recréés à chaque `pnpm db:reset`, qui repart d'une base vide.
--
-- Pourquoi ils existent : la connexion Google ne fonctionne pas contre un
-- Supabase local, et les pages prof exigent le rôle `teacher`. Sans compte
-- mot de passe, /dashboard/teacher/* est inatteignable en développement.
--
-- ⚠️ Ces identifiants sont publics et c'est assumé : ils n'ouvrent que le
-- Postgres Docker sur 127.0.0.1:54322, dont les clés d'API sont elles-mêmes
-- publiques et fixes. Ne JAMAIS reprendre ces adresses ni ces mots de passe
-- pour un compte réel — le domaine `.test` est réservé par la RFC 2606
-- justement pour qu'ils ne puissent désigner personne.
--
--   teacher@local.test / local-teacher   → rôle teacher
--   student@local.test / local-student   → rôle student
-- ==============================================================================

-- Les triggers sont neutralisés par seed.sql (session_replication_role) ; on
-- crée donc le profil explicitement plutôt que de compter sur
-- `on_auth_user_created`.

do $dev_accounts$
DECLARE
    a record;
BEGIN
    FOR a IN
        SELECT * FROM (VALUES
            ('11111111-1111-4111-8111-111111111111'::uuid,
             'teacher@local.test', 'local-teacher', 'teacher', 'Prof Local'),
            ('22222222-2222-4222-8222-222222222222'::uuid,
             'student@local.test', 'local-student', 'student', 'Élève Local')
        ) AS t(id, email, password, role, full_name)
    LOOP
        -- Les colonnes de jetons doivent valoir '' et non NULL : GoTrue les lit
        -- en `string` Go et échoue sinon avec « Database error querying schema ».
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at,
            raw_app_meta_data, raw_user_meta_data,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            email_change_token_current, phone_change, phone_change_token,
            reauthentication_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated',
            a.email, extensions.crypt(a.password, extensions.gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', a.full_name, 'email_verified', true),
            '', '', '', '', '', '', '', ''
        )
        ON CONFLICT (id) DO NOTHING;

        -- GoTrue exige une identité `email` pour autoriser la connexion par
        -- mot de passe : sans elle, l'utilisateur existe mais ne peut pas entrer.
        INSERT INTO auth.identities (
            provider_id, user_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            a.id::text, a.id,
            jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true),
            'email', now(), now(), now()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;

        INSERT INTO public.profiles (id, email, role, full_name)
        VALUES (a.id, a.email, a.role::public.user_role, a.full_name)
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
    END LOOP;
END $dev_accounts$;
