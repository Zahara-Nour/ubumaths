-- Boutique d'avatars : catalogue, collection des élèves, achat et port (PR 1)
-- ==============================================================================
--
-- Phase 0 validée par David le 2026-11-06 (docs/wip/boutique-avatars-progress.md,
-- comportements 1 à 17, Q1 à Q4) :
--   - avatars achetés en gidouilles seulement, à prix fixe, une fois pour toutes ;
--     aucun tirage, aucun gain par déblocage ;
--   - l'avatar porté remplace la photo Google partout (Q1 a) : il est écrit dans
--     `profiles.avatar_url` (adresse de l'image du catalogue) ; la photo Google est
--     gardée dans `profiles.google_avatar_url` et revient au retrait ;
--   - prix en base (Q3), modifiables sans déploiement ; séries de l'Almanach en
--     vente pendant une fenêtre (available_from / available_until) ; un avatar
--     acheté reste portable après sa fenêtre, même retiré de la vente ;
--   - boutique réservée aux élèves ; le prof ne peut ni offrir ni retirer (Q4) ;
--   - achat atomique : solde vérifié, débit, avatar dans la collection, ligne au
--     journal (« Avatar : <nom> acheté », −prix). L'achat n'équipe pas l'avatar.
--     Le consentement parental (comme la boutique VIP et les décorations des
--     Mathoux) est vérifié par la route, avant l'appel.
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-11-06) :
--   - le CATALOGUE (clé, famille, nom, prix, image, fenêtre de vente) est lisible
--     par tout utilisateur connecté ; `anon` n'a AUCUN droit ; personne n'écrit au
--     client (le catalogue s'écrit par migration ou par le serveur) ;
--   - la COLLECTION d'un élève est lisible par l'élève SEUL : ni le prof, ni
--     l'admin (elle figure dans l'export RGPD, fait par le serveur) ; personne
--     n'écrit au client ;
--   - l'AVATAR PORTÉ est vu par ceux qui voient déjà `avatar_url`, ni plus ni
--     moins (c'est la même colonne) ; `worn_avatar` et `google_avatar_url` suivent
--     la ligne `profiles`, lisible par les mêmes personnes qu'aujourd'hui (la photo
--     Google était déjà dans `avatar_url`).
--   Achat et port passent par deux fonctions exécutables par `service_role` seul
--   (droits ET garde dans le corps).
--
-- EN MIROIR (qui perd quoi) : plus personne n'écrit sa propre `avatar_url` à la
-- main (ni `google_avatar_url`, ni `worn_avatar`) par la policy « Users can update
-- own profile ». Un seul code le faisait : le retour OAuth Google
-- (src/routes/(public)/auth/callback/+server.ts) posait la photo Google d'un
-- profil approuvé sans avatar, avec le client de l'utilisateur ; il passe par le
-- client service dans la MÊME PR (updateProfileSchema, lui, n'a aucun appelant).
-- Prod mesurée le 2026-11-06 : 73 élèves + 1 prof avec une photo Google, 9 vides,
-- 0 autre adresse — personne ne perd une image choisie.
-- Et (validé par David le 2026-11-06) : le prof et l'admin ne peuvent plus écrire
-- ces trois colonnes sur le profil d'un élève par l'API (trigger
-- guard_profile_avatar_fields, § 4 bis) ; aucun code ne le fait. Leurs autres
-- écritures (gidouilles, bonus, niveau, statut…) sont inchangées.
-- Enfin, une photo n'est retenue que servie par Google
-- (https://lh3.googleusercontent.com/…), en base comme dans le retour OAuth : une
-- adresse quelconque glissée dans les métadonnées d'inscription n'est plus
-- affichée chez les autres (NULL : avatar par défaut).
--
-- ORDRE DE LIVRAISON : migration au merge (db:migrate), puis le code au
-- deploy:prod. Entre les deux, l'ancien retour OAuth voit son écriture refusée
-- (42501, journalisée, sans effet pour l'élève : la photo est déjà posée par
-- handle_new_user à la création du compte).
--
-- Garanties tenues par la base, pas seulement par les fonctions :
--   - « possédé » : la clé (id, worn_avatar) de `profiles` pointe vers la
--     collection de CE même élève (clé composite, ON DELETE SET NULL sur
--     worn_avatar seule, PG 15+) ;
--   - un avatar possédé ne peut pas disparaître du catalogue (RESTRICT) : on le
--     retire de la vente avec active = false.
--
-- Concurrence : les deux fonctions verrouillent la ligne `profiles` de l'élève
-- (FOR UPDATE) : un double clic se sérialise, le second appel trouve l'avatar
-- déjà acheté et ne débite rien.
--
-- Trigger d'inscription (handle_new_user) : recopie exacte de 20261015090400,
-- sauf (1) google_avatar_url renseignée aux quatre INSERT, (2) branche « profil
-- existant » : google_avatar_url mise à jour, avatar_url jamais écrasée quand un
-- avatar est porté, (3) photo retenue seulement si servie par Google
-- (https://lh3.googleusercontent.com/…), sinon NULL. Rappel : le trigger ne joue qu'à la création de la ligne
-- auth.users (AFTER INSERT), pas à chaque connexion.
--
-- Effacement RGPD : `student_avatars.student_id` en ON DELETE CASCADE.
--
-- Additive : deux tables neuves, deux colonnes nullables, une policy durcie,
-- un corps de trigger étendu, deux fonctions neuves, trois triggers neufs
-- (garde, photo gardée, image du catalogue), un index partiel ; backfill de la seule
-- colonne neuve.
--
-- Preuve : tests/integration/boutique-avatars.test.ts (rouge sans la migration).
--
-- ROLLBACK (à exécuter tel quel) :
--   drop function if exists public.buy_avatar(uuid, text);
--   drop function if exists public.set_worn_avatar(uuid, text);
--   drop trigger if exists guard_profile_avatar_fields_trg on public.profiles;
--   drop function if exists public.guard_profile_avatar_fields();
--   -- policy : recréer celle de 20260902097000 (sans les trois termes avatar)
--   drop policy if exists "Users can update own profile" on public.profiles;
--   create policy "Users can update own profile" on public.profiles
--     for update to authenticated using (auth.uid() = id)
--     with check ((auth.uid() = id)
--       and (role = (select p.role from profiles p where p.id = auth.uid()))
--       and (status = get_user_status(auth.uid()))
--       and (coalesce(gidouilles, 0) <= coalesce((select p.gidouilles from profiles p where p.id = auth.uid()), 0))
--       and (school_id is not distinct from (select p.school_id from profiles p where p.id = auth.uid())));
--   drop trigger if exists keep_google_avatar_url_trg on public.profiles;
--   drop function if exists public.keep_google_avatar_url();
--   drop trigger if exists sync_worn_avatar_image_trg on public.avatar_catalog;
--   drop function if exists public.sync_worn_avatar_image();
--   -- handle_new_user : rejouer la définition précédente, AVANT de supprimer la
--   --   colonne google_avatar_url. Le fichier n'a qu'une instruction, le CREATE OR
--   --   REPLACE FUNCTION public.handle_new_user() :
--   --     \i supabase/migrations/20261015090400_inscription_sans_code_en_attente.sql
--   --   (ou psql -f sur ce fichier) ;
--   -- les élèves qui portaient un avatar retrouvent leur photo :
--   update public.profiles set avatar_url = google_avatar_url where worn_avatar is not null;
--   alter table public.profiles drop constraint if exists profiles_worn_avatar_fkey;
--   alter table public.profiles drop column if exists worn_avatar;
--   alter table public.profiles drop column if exists google_avatar_url;
--   drop table if exists public.student_avatars;
--   drop table if exists public.avatar_catalog;
--   (les gidouilles dépensées restent dépensées, avec leur ligne au journal.)

-- ---------------------------------------------------------------------------
-- 1. Le catalogue
-- ---------------------------------------------------------------------------

create table public.avatar_catalog (
	key text not null,
	family text not null,
	name text not null,
	price integer not null,
	image_path text not null,
	available_from timestamptz,
	available_until timestamptz,
	active boolean not null default true,
	sort_order integer not null default 0,

	constraint avatar_catalog_pkey primary key (key),
	constraint avatar_catalog_key_check check (key ~ '^[a-z0-9_]{1,50}$'),
	constraint avatar_catalog_family_check
		check (family in ('emblem', 'galopin', 'polyhedron', 'creature', 'puppet', 'animal', 'automaton', 'almanac')),
	constraint avatar_catalog_name_check check (length(btrim(name)) between 1 and 80),
	constraint avatar_catalog_price_check check (price >= 0),
	-- Image servie par l'appli (static/avatars/…), jamais une adresse externe
	constraint avatar_catalog_image_path_check
		check (image_path ~ '^/avatars/[A-Za-z0-9_/.-]+\.webp$' and position('..' in image_path) = 0),
	constraint avatar_catalog_window_check
		check (available_from is null or available_until is null or available_from < available_until)
);

comment on table public.avatar_catalog is
	'Catalogue de la boutique d''avatars (prix en gidouilles). Lecture : tout utilisateur connecté. Écriture : migrations et serveur seulement.';
comment on column public.avatar_catalog.key is 'Clé stable de l''avatar (^[a-z0-9_]{1,50}$).';
comment on column public.avatar_catalog.family is
	'Famille : emblem, galopin, polyhedron, creature, puppet, animal, automaton, almanac.';
comment on column public.avatar_catalog.name is 'Nom affiché (et dans le journal des gidouilles).';
comment on column public.avatar_catalog.price is 'Prix en gidouilles.';
comment on column public.avatar_catalog.image_path is
	'Chemin de l''image servie par l''appli (/avatars/….webp). Recopié dans profiles.avatar_url quand l''avatar est porté.';
comment on column public.avatar_catalog.available_from is
	'Début de la fenêtre de vente (séries de l''Almanach) ; NULL = pas de borne.';
comment on column public.avatar_catalog.available_until is
	'Fin de la fenêtre de vente ; NULL = pas de borne. Un avatar acheté reste portable après.';
comment on column public.avatar_catalog.active is
	'En vente. false : retiré de la vente, toujours possédé et portable par qui l''a acheté.';
comment on column public.avatar_catalog.sort_order is 'Ordre d''affichage dans sa famille.';

revoke all on public.avatar_catalog from public, anon, authenticated;
grant select on public.avatar_catalog to authenticated;

alter table public.avatar_catalog enable row level security;

create policy "Authenticated users can view the avatar catalog" on public.avatar_catalog
	for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. La collection des élèves
-- ---------------------------------------------------------------------------

create table public.student_avatars (
	student_id uuid not null references public.profiles (id) on delete cascade,
	avatar_key text not null references public.avatar_catalog (key),
	price_paid integer not null,
	purchased_at timestamptz not null default now(),

	constraint student_avatars_pkey primary key (student_id, avatar_key),
	constraint student_avatars_price_paid_check check (price_paid >= 0)
);

-- La clé vers le catalogue (RESTRICT) se vérifie par avatar_key
create index student_avatars_avatar_key_idx on public.student_avatars (avatar_key);

comment on table public.student_avatars is
	'Avatars achetés par les élèves (une fois chacun). Lecture : l''élève les siens, personne d''autre au client. Écriture : buy_avatar seule (serveur).';
comment on column public.student_avatars.student_id is
	'Élève (profiles.id). Supprimer le compte supprime sa collection (cascade, effacement RGPD).';
comment on column public.student_avatars.avatar_key is 'Clé du catalogue (avatar_catalog.key).';
comment on column public.student_avatars.price_paid is 'Gidouilles débitées à l''achat.';
comment on column public.student_avatars.purchased_at is 'Date de l''achat.';

revoke all on public.student_avatars from public, anon, authenticated;
grant select on public.student_avatars to authenticated;

alter table public.student_avatars enable row level security;

create policy "Students can view their own avatars" on public.student_avatars
	for select to authenticated using (student_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Le profil : photo Google gardée, avatar porté
-- ---------------------------------------------------------------------------

alter table public.profiles
	add column google_avatar_url text,
	add column worn_avatar text;

-- Possédé par CET élève. SET NULL sur la seule colonne worn_avatar (PG 15+).
alter table public.profiles
	add constraint profiles_worn_avatar_fkey
		foreign key (id, worn_avatar)
		references public.student_avatars (student_id, avatar_key)
		on delete set null (worn_avatar);
-- ⚠️ Ce SET NULL laisse avatar_url sur l'image de l'avatar. Il ne joue que si une
-- ligne de student_avatars est supprimée À LA MAIN (aucune fonction ne le fait ; la
-- suppression du compte efface le profil lui-même) : la remettre alors avec
-- `update profiles set avatar_url = google_avatar_url where id = …`.

comment on column public.profiles.google_avatar_url is
	'Photo du compte Google, gardée pour revenir quand l''élève retire son avatar. Écrite par handle_new_user (et le backfill) seulement.';
comment on column public.profiles.worn_avatar is
	'Avatar de la boutique porté (clé du catalogue, de SA collection), NULL si aucun. Écrit par set_worn_avatar seule ; son image est alors dans avatar_url.';

-- Backfill : les photos Google déjà en place
update public.profiles
set google_avatar_url = avatar_url
where avatar_url like 'https://lh3.googleusercontent.com/%';

-- ---------------------------------------------------------------------------
-- 4. Plus d'écriture à la main de l'avatar par l'élève
-- ---------------------------------------------------------------------------
-- Définition de 20260902097000 (identique en local, vérifié le 2026-11-06),
-- trois termes ajoutés : avatar_url, google_avatar_url et worn_avatar figés.

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
	(auth.uid() = id)
	and (role = (select p.role from profiles p where p.id = auth.uid()))
	and (status = get_user_status(auth.uid()))
	-- finding F2: no self-inflation of currency, no self-move across schools.
	and (coalesce(gidouilles, 0) <= coalesce((select p.gidouilles from profiles p where p.id = auth.uid()), 0))
	and (school_id is not distinct from (select p.school_id from profiles p where p.id = auth.uid()))
	-- Boutique d'avatars : l'avatar ne s'écrit que par set_worn_avatar (serveur)
	and (avatar_url is not distinct from (select p.avatar_url from profiles p where p.id = auth.uid()))
	and (google_avatar_url is not distinct from (select p.google_avatar_url from profiles p where p.id = auth.uid()))
	and (worn_avatar is not distinct from (select p.worn_avatar from profiles p where p.id = auth.uid()))
);

comment on policy "Users can update own profile" on public.profiles is
	'Self-update: pins role & status (unchanged), caps gidouilles at current (award only via SECURITY DEFINER RPCs, which bypass RLS), freezes school_id (finding F2, 2026-08-30) and freezes avatar_url, google_avatar_url, worn_avatar (boutique d''avatars, 2026-11-06).';

-- ---------------------------------------------------------------------------
-- 4 bis. Garde : personne n'écrit l'avatar par l'API, prof et admin compris
-- ---------------------------------------------------------------------------
-- La policy ci-dessus ne couvre que l'élève sur son propre profil : les policies
-- « Teachers can update student rewards in their classes » et « Admins can update
-- any profile » laissaient le prof et l'admin écrire avatar_url (adresse externe
-- comprise) et vider worn_avatar d'un élève, contre Q4. Une policy ne voit pas
-- l'ancienne ligne : trigger BEFORE UPDATE.
--
-- Mécanisme : refus dès que l'instruction est exécutée par un rôle de l'API
-- (current_user authenticated ou anon), quel que soit le profil appelant — même
-- convention que guard_profile_reserved_fields (20261001180000). Pourquoi pas une
-- variable de transaction (set_config('app.avatar_write', …)) : set_config est
-- exécutable par PUBLIC, une telle variable se forge ; current_user, lui, ne
-- change que par SECURITY DEFINER ou SET ROLE, hors de portée d'un client.
-- Passent donc : buy_avatar, set_worn_avatar et handle_new_user (SECURITY
-- DEFINER, exécutées en tant que propriétaire, postgres), le backfill ci-dessus
-- (migration, postgres) et le serveur (service_role), qui est de confiance.
-- Seul l'UPDATE est gardé : l'INSERT de profiles est réservé à service_role
-- (policy « Allow profile creation ») et au trigger d'inscription.

create or replace function public.guard_profile_avatar_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if current_user in ('authenticated', 'anon') and (
		new.avatar_url is distinct from old.avatar_url
		or new.google_avatar_url is distinct from old.google_avatar_url
		or new.worn_avatar is distinct from old.worn_avatar
	) then
		raise exception 'L''avatar ne se modifie que par la boutique d''avatars (serveur).'
			using errcode = '42501';
	end if;
	return new;
end;
$$;

comment on function public.guard_profile_avatar_fields() is
	'Refuse aux rôles de l''API (authenticated, anon), prof et admin compris, toute modification de avatar_url, google_avatar_url et worn_avatar (boutique d''avatars, 2026-11-06).';

-- Sans clause OF : couvre aussi un trigger BEFORE qui modifierait NEW.avatar_url,
-- mais seulement s'il s'exécute AVANT celui-ci. Les triggers BEFORE d'une table
-- s'exécutent par ordre alphabétique de nom : sont couverts ceux dont le nom
-- précède « guard_profile_avatar_fields_trg » (audit_profiles, consent_rule_*,
-- guard_profile_consent_fields_trg) ; ceux qui le suivent (guard_profile_reserved_*,
-- guard_profile_role_*, keep_google_avatar_url_trg, trigger_*, update_*) voient
-- passer leurs propres changements. keep_google_avatar_url_trg (§ 4 ter) est
-- nommé exprès APRÈS : la garde juge ce que l'appelant a envoyé.
create trigger guard_profile_avatar_fields_trg
	before update
	on public.profiles
	for each row
	execute function public.guard_profile_avatar_fields();

-- ---------------------------------------------------------------------------
-- 4 ter. Toute photo Google posée dans avatar_url est gardée de côté
-- ---------------------------------------------------------------------------
-- Le retour OAuth (et tout écrit serveur) ne nomme que avatar_url : les types
-- TypeScript, générés depuis la prod, n'auront google_avatar_url qu'après
-- db:types. La base complète donc d'elle-même : à l'INSERT, ou quand avatar_url
-- CHANGE, si la nouvelle valeur est une photo Google et qu'aucun avatar n'est
-- porté, elle est recopiée dans google_avatar_url. Sans effet sur set_worn_avatar
-- (image /avatars/…, ou retour de la photo déjà gardée).
-- Pas de SECURITY DEFINER : ne modifie que NEW. Nommé après la garde (§ 4 bis).

create or replace function public.keep_google_avatar_url()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if new.worn_avatar is null
		and starts_with(coalesce(new.avatar_url, ''), 'https://lh3.googleusercontent.com/')
		and (tg_op = 'INSERT' or new.avatar_url is distinct from old.avatar_url) then
		new.google_avatar_url := new.avatar_url;
	end if;
	return new;
end;
$$;

comment on function public.keep_google_avatar_url() is
	'Recopie dans google_avatar_url une photo Google posée dans avatar_url (aucun avatar porté), pour qu''elle revienne au retrait d''un avatar (boutique d''avatars, 2026-11-06).';

create trigger keep_google_avatar_url_trg
	before insert or update of avatar_url
	on public.profiles
	for each row
	execute function public.keep_google_avatar_url();

-- ---------------------------------------------------------------------------
-- 5. Trigger d'inscription : photo Google gardée, avatar porté respecté
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  pending_student RECORD;
  class_id UUID;
  google_avatar TEXT;
  user_status_value user_status;
  -- Self-registration locals
  v_class_code TEXT;
  v_resolved_class_id UUID;
  v_class RECORD;
  v_terms_version TEXT;
BEGIN
  -- Extract Google avatar URL from user metadata if available
  -- Google OAuth stores avatar in 'picture' field (standard), but check both for compatibility
  google_avatar := COALESCE(
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- Boutique d'avatars : seule une photo servie par Google est retenue (les
  -- métadonnées viennent du client) ; sinon NULL, avatar par défaut.
  IF NOT starts_with(COALESCE(google_avatar, ''), 'https://lh3.googleusercontent.com/') THEN
    google_avatar := NULL;
  END IF;

  -- =========================================================================
  -- PRIORITY BRANCH: student self-registration by class code.
  -- The register action passes `class_code` (the teacher-distributed join code)
  -- + firstname/lastname (+ optional terms_version) in user metadata. The code is
  -- resolved HERE via resolve_open_class_by_code() so the enrolling class is never
  -- attacker-controllable: a bare class UUID in metadata can no longer enroll anyone
  -- (finding H9). resolve_open_class_by_code() returns the class id IFF the code
  -- matches (case-insensitive, trimmed) AND the class is active AND registration_open.
  -- =========================================================================
  v_class_code := NEW.raw_user_meta_data->>'class_code';
  IF v_class_code IS NOT NULL AND v_class_code <> '' THEN
    v_terms_version := NEW.raw_user_meta_data->>'terms_version';

    v_resolved_class_id := public.resolve_open_class_by_code(v_class_code);

    IF v_resolved_class_id IS NOT NULL THEN
      -- Valid, open class → load it and create an approved, enrolled student.
      SELECT c.* INTO v_class
      FROM public.classes c
      WHERE c.id = v_resolved_class_id
      LIMIT 1;

      -- SECURITY: role/status/school_id/grade are NEVER read from raw_user_meta_data
      -- (attacker-controlled). `role` is hardcoded 'student', `status` is derived from the
      -- real class state, and school_id/grade come from the resolved class (v_class). Only
      -- firstname/lastname/terms_version come from metadata (non-authorization data).
      INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, avatar_url, google_avatar_url, status)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
        COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
        'student',
        v_class.school_id,
        v_class.grade,
        google_avatar,
        google_avatar,
        'approved'::user_status
      );

      INSERT INTO public.class_members (class_id, student_id)
      VALUES (v_class.id, NEW.id)
      ON CONFLICT DO NOTHING;

      -- RGPD: record CGU acceptance if the client supplied a version.
      IF v_terms_version IS NOT NULL AND v_terms_version <> '' THEN
        INSERT INTO public.terms_acceptances (user_id, terms_version)
        VALUES (NEW.id, v_terms_version);
      END IF;

      RAISE NOTICE 'Self-registered student % into class % (status: approved)', NEW.email, v_class.id;
    ELSE
      -- class_code supplied but no active/open class matches it:
      -- create a NON-enrolled pending profile (teacher/admin review), never auto-approve.
      INSERT INTO public.profiles (id, email, firstname, lastname, role, avatar_url, google_avatar_url, status)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
        COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
        'student',
        google_avatar,
        google_avatar,
        'pending'::user_status
      );

      RAISE NOTICE 'Self-registration for % with invalid/closed class code → pending', NEW.email;
    END IF;

    RETURN NEW;
  END IF;

  -- Check if this email exists in pending_students (not yet activated)
  SELECT * INTO pending_student
  FROM public.pending_students
  WHERE email = NEW.email AND is_activated = FALSE
  LIMIT 1;

  -- If pending student exists, create profile with pre-populated data
  -- These students were explicitly added by teachers, so they are approved
  IF FOUND THEN
    -- Create profile with pre-populated data (including Google avatar)
    -- Status is 'approved' because teacher explicitly added this student
    -- NOTE: `gender` was intentionally dropped from profiles/pending_students on 2026-01-15
    -- (RGPD minimization). The original trigger still referenced it, which raised 42703 and
    -- was swallowed by the WHEN OTHERS handler → student activation failed silently. Fixed here.
    INSERT INTO public.profiles (id, email, firstname, lastname, role, school_id, grade, class_ids, avatar_url, google_avatar_url, status)
    VALUES (
      NEW.id,
      NEW.email,
      pending_student.firstname,
      pending_student.lastname,
      'student',
      pending_student.school_id,
      pending_student.grade,
      pending_student.class_ids,
      google_avatar,
      google_avatar,
      'approved'::user_status  -- Explicitly approved (teacher added them)
    );

    -- Enroll student in all pre-assigned classes
    IF pending_student.class_ids IS NOT NULL AND array_length(pending_student.class_ids, 1) > 0 THEN
      FOREACH class_id IN ARRAY pending_student.class_ids
      LOOP
        -- Insert into class_members (ignore if already exists)
        INSERT INTO public.class_members (class_id, student_id)
        VALUES (class_id, NEW.id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Mark the pending student as activated
    UPDATE public.pending_students
    SET is_activated = TRUE,
        activated_at = NOW()
    WHERE id = pending_student.id;

    RAISE NOTICE 'Created profile for pre-populated student: % (enrolled in % classes, avatar: %, status: approved)',
                 NEW.email,
                 COALESCE(array_length(pending_student.class_ids, 1), 0),
                 COALESCE(google_avatar, 'none');
  ELSE
    -- No pending student found - create default profile.
    -- B7 (décision de David, 2026-10-10) : sans code de classe valide ni pré-inscription
    -- (signUp GoTrue direct, première connexion Google…), le compte est TOUJOURS en
    -- attente — le prof approuve. Avant : approuvé d'office hors @voltairedoha.com.
    user_status_value := 'pending'::user_status;

    INSERT INTO public.profiles (id, email, firstname, lastname, role, avatar_url, google_avatar_url, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'given_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
      'student',
      google_avatar,
      google_avatar,
      user_status_value
    );

    RAISE NOTICE 'Created default profile for new user: % (avatar: %, status: %)',
                 NEW.email,
                 COALESCE(google_avatar, 'none'),
                 user_status_value;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, update avatar_url if we have one from Google
    IF google_avatar IS NOT NULL THEN
      -- Boutique d'avatars : la photo Google est toujours gardée de côté…
      UPDATE public.profiles
      SET google_avatar_url = google_avatar
      WHERE id = NEW.id AND google_avatar_url IS DISTINCT FROM google_avatar;

      -- … mais n'écrase jamais un avatar porté
      UPDATE public.profiles
      SET avatar_url = google_avatar,
          updated_at = NOW()
      WHERE id = NEW.id AND (avatar_url IS NULL OR avatar_url = '') AND worn_avatar IS NULL;

      RAISE NOTICE 'Updated avatar for existing user: % (avatar: %)', NEW.email, google_avatar;
    END IF;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Achat (sans équiper)
-- ---------------------------------------------------------------------------
-- Rend { ok: true, balance } ou { ok: false, reason[, missing] } ; reason parmi
-- unknown_avatar, not_on_sale (retiré ou hors de sa fenêtre), already_owned,
-- insufficient_funds.

create or replace function public.buy_avatar(
	p_student_id uuid,
	p_avatar text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_item public.avatar_catalog%rowtype;
	v_balance numeric;
	v_class_id uuid;
begin
	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorisé : achat réservé au serveur'
			using errcode = '42501';
	end if;

	-- Verrou de l'élève : sérialise achats et ports (double clic : un seul débit)
	select p.gidouilles into v_balance
	from public.profiles p
	where p.id = p_student_id and p.role = 'student'
	for update;
	if not found then
		raise exception 'Élève introuvable : %', p_student_id;
	end if;

	select c.* into v_item
	from public.avatar_catalog c
	where c.key = p_avatar;
	if not found then
		return jsonb_build_object('ok', false, 'reason', 'unknown_avatar');
	end if;

	if exists (
		select 1 from public.student_avatars s
		where s.student_id = p_student_id and s.avatar_key = p_avatar
	) then
		return jsonb_build_object('ok', false, 'reason', 'already_owned');
	end if;

	if not v_item.active
		or (v_item.available_from is not null and now() < v_item.available_from)
		or (v_item.available_until is not null and now() >= v_item.available_until) then
		return jsonb_build_object('ok', false, 'reason', 'not_on_sale');
	end if;

	if coalesce(v_balance, 0) < v_item.price then
		return jsonb_build_object(
			'ok', false,
			'reason', 'insufficient_funds',
			'missing', ceil(v_item.price - coalesce(v_balance, 0))::integer
		);
	end if;

	-- Classe active : visibilité de la ligne au journal du prof (comme buy_mathou_decoration)
	select cm.class_id into v_class_id
	from public.class_members cm
	where cm.student_id = p_student_id and cm.status = 'active'
	limit 1;

	update public.profiles
	set gidouilles = v_balance - v_item.price
	where id = p_student_id;

	insert into public.student_avatars (student_id, avatar_key, price_paid)
	values (p_student_id, p_avatar, v_item.price);

	insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
	values (p_student_id, v_class_id, -v_item.price, 'Avatar : ' || v_item.name || ' acheté', null);

	return jsonb_build_object('ok', true, 'balance', v_balance - v_item.price);
end;
$function$;

comment on function public.buy_avatar(uuid, text) is
	'Achète un avatar de la boutique (sans l''équiper) : en vente, pas déjà possédé, solde vérifié, débit, ligne au journal, en une transaction. Rend {ok, balance} ou {ok: false, reason, missing?}. Serveur seul (service_role).';

revoke all on function public.buy_avatar(uuid, text) from public, anon, authenticated;
grant execute on function public.buy_avatar(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Porter, retirer (gratuits)
-- ---------------------------------------------------------------------------
-- p_avatar NULL : retire l'avatar, la photo Google revient (ou NULL : avatar par
-- défaut). Sinon l'avatar doit être possédé ; ni active ni la fenêtre de vente ne
-- comptent. Rend { ok: true, avatar_url } ou { ok: false, reason: 'not_owned' }.

create or replace function public.set_worn_avatar(
	p_student_id uuid,
	p_avatar text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_image text;
	v_avatar_url text;
begin
	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorisé : port réservé au serveur'
			using errcode = '42501';
	end if;

	-- Verrou de l'élève : sérialise achats et ports
	perform 1 from public.profiles p
	where p.id = p_student_id and p.role = 'student'
	for update;
	if not found then
		raise exception 'Élève introuvable : %', p_student_id;
	end if;

	if p_avatar is null then
		update public.profiles p
		set worn_avatar = null,
			avatar_url = p.google_avatar_url
		where p.id = p_student_id
		returning p.avatar_url into v_avatar_url;
		return jsonb_build_object('ok', true, 'avatar_url', v_avatar_url);
	end if;

	select c.image_path into v_image
	from public.student_avatars s
	join public.avatar_catalog c on c.key = s.avatar_key
	where s.student_id = p_student_id and s.avatar_key = p_avatar;
	if not found then
		return jsonb_build_object('ok', false, 'reason', 'not_owned');
	end if;

	update public.profiles
	set worn_avatar = p_avatar,
		avatar_url = v_image
	where id = p_student_id;

	return jsonb_build_object('ok', true, 'avatar_url', v_image);
end;
$function$;

comment on function public.set_worn_avatar(uuid, text) is
	'Porte un avatar de la collection (son image passe dans avatar_url) ou le retire (NULL : la photo Google revient). Rend {ok, avatar_url} ou {ok: false, reason}. Serveur seul (service_role).';

revoke all on function public.set_worn_avatar(uuid, text) from public, anon, authenticated;
grant execute on function public.set_worn_avatar(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Image d'un avatar changée au catalogue : les porteurs suivent
-- ---------------------------------------------------------------------------
-- avatar_url garde une COPIE de image_path : sans ce trigger, renommer ou
-- redessiner l'image d'un avatar laisserait ses porteurs sur l'ancienne adresse.
-- Pas de SECURITY DEFINER : seuls le serveur (service_role) et les migrations
-- (postgres) écrivent le catalogue, et la garde guard_profile_avatar_fields les
-- laisse passer ; un rôle de l'API n'a aucun droit d'écriture sur le catalogue.

create or replace function public.sync_worn_avatar_image()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	update public.profiles p
	set avatar_url = new.image_path
	where p.worn_avatar = new.key;
	return null;
end;
$$;

comment on function public.sync_worn_avatar_image() is
	'Recopie la nouvelle image d''un avatar du catalogue dans avatar_url de ceux qui le portent (boutique d''avatars, 2026-11-06).';

create trigger sync_worn_avatar_image_trg
	after update of image_path
	on public.avatar_catalog
	for each row
	when (old.image_path is distinct from new.image_path)
	execute function public.sync_worn_avatar_image();

-- profiles.worn_avatar n'est pas indexé seul (la clé composite commence par id) :
-- index partiel pour ce trigger, minuscule (seuls les porteurs y figurent).
create index profiles_worn_avatar_idx on public.profiles (worn_avatar)
	where worn_avatar is not null;
