-- On ne se crée pas un profil privilégié
-- ======================================
--
-- `profiles / Allow profile creation` vaut `with check (auth.uid() = id)` :
-- elle vérifie QUI l'on prétend être, jamais QUEL RÔLE l'on se donne. C'est
-- l'unique policy INSERT de la table.
--
-- Deux gardes existaient, et aucune ne couvrait l'insertion :
--   - `guard_profile_role_change_trg` est BEFORE **UPDATE OF role** ;
--   - `trg_enforce_single_teacher` est BEFORE INSERT OR UPDATE, mais sous
--     `when (new.role = 'teacher')` — `admin` passait à côté. Et il ne lève
--     que s'il existe DÉJÀ un professeur : sur une base qui n'en a pas,
--     `teacher` passait aussi.
--
-- Un utilisateur authentifié sans profil pouvait donc s'en insérer un en
-- `admin` — qui voit tout : les élèves, leurs données, l'école entière.
-- Mesuré avant correctif : les deux insertions réussissaient.
--
-- LATENT AU 2026-09-13, PAS FERMÉ. Aucun compte n'est aujourd'hui dépourvu de
-- profil, et `handle_new_user` code `role` en dur à `student`. Mais cette
-- fonction avale ses erreurs (`when others then return new`) : il suffit
-- qu'elle échoue une fois pour qu'un compte sans profil existe.
--
-- QUI PERD QUOI : un utilisateur AUTHENTIFIÉ ne peut plus s'insérer un profil
-- dont le rôle n'est pas `student`. Ne changent pas : l'inscription normale
-- (`handle_new_user` s'exécute avec `auth.uid()` nul), la création
-- administrative par `service_role`, et l'administrateur authentifié — qui de
-- toute façon ne pouvait déjà pas créer de profil pour autrui.
--
-- La logique est celle de `guard_profile_role_change`, dont ceci est le
-- pendant pour l'INSERT : `auth.uid()` nul = contexte interne, autorisé ;
-- administrateur, autorisé ; tout autre appelant, cantonné à `student`.
--
-- ROLLBACK :
--   drop trigger guard_profile_role_on_insert_trg on public.profiles;
--   drop function public.guard_profile_role_on_insert();

create or replace function public.guard_profile_role_on_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	-- `auth.uid()` nul ⇒ service_role ou contexte interne (`handle_new_user`,
	-- scripts d'administration) : autorisé. Un administrateur authentifié :
	-- autorisé. Tout autre utilisateur : cantonné au rôle par défaut.
	if new.role is distinct from 'student'::user_role
		and auth.uid() is not null
		and not public.is_admin()
	then
		raise exception 'creating a privileged profile requires admin privileges'
			using errcode = '42501';
	end if;
	return new;
end;
$function$;

drop trigger if exists guard_profile_role_on_insert_trg on public.profiles;
create trigger guard_profile_role_on_insert_trg
	before insert on public.profiles
	for each row
	execute function public.guard_profile_role_on_insert();

comment on function public.guard_profile_role_on_insert() is
	'Pendant de guard_profile_role_change() pour l''INSERT : un utilisateur authentifié ne peut se créer qu''un profil `student`.';
