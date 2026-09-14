-- L'annuaire du personnel : nom et avatar, jamais l'e-mail
-- ========================================================
--
-- Prérequis du retrait de `Anyone can view profiles for leaderboard`. Une fois
-- ce `using (true)` parti, AUCUN élève ne peut plus lire le profil de son
-- professeur : `are_classmates` ne couvre que les élèves (0 membre non-élève
-- dans `class_members`), et un prof n'est ni un ami ni un co-participant de
-- tournoi.
--
-- Six écrans élève y perdaient le nom du professeur — attribution des cours,
-- cahier de texte, expéditeur d'une notification (« Utilisateur inconnu »),
-- message de chat en temps réel, sélecteur d'assignés du kanban, auteur d'un
-- notebook Python.
--
-- QUESTION D'ACCÈS, posée et tranchée par David le 2026-09-15 : un élève voit
-- le NOM et l'AVATAR de son professeur, rien d'autre.
--
-- ⚠️ Pourquoi une fonction et pas une policy. Une policy
-- `using (role in ('teacher','admin'))` aurait suffi en une ligne — mais la
-- RLS est par LIGNE, pas par colonne : elle aurait aussi exposé l'e-mail du
-- professeur à tous les élèves connectés. Ouvrir une colonne par une règle
-- large est exactement le défaut qu'on est en train de corriger ; on ne le
-- réintroduit pas du même geste.
--
-- Le personnel tient en deux ou trois lignes (modèle mono-professeur) : la
-- fonction rend l'annuaire entier, et chaque écran y retrouve le nom dont il a
-- besoin. Pas de paramètre, donc pas d'oracle d'existence.
--
-- ROLLBACK :
--   drop function if exists public.get_staff_directory();

create or replace function public.get_staff_directory()
returns table (
    id uuid,
    full_name text,
    firstname text,
    lastname text,
    avatar_url text,
    role user_role
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
    -- ⚠️ La liste des colonnes EST la garde. Ajouter `email` ici rendrait
    -- inutile tout le chantier de restriction des profils.
    select p.id, p.full_name, p.firstname, p.lastname, p.avatar_url, p.role
    from public.profiles p
    where p.role in ('teacher', 'admin');
$$;

comment on function public.get_staff_directory() is
    'Nom et avatar du personnel (professeur, admin), pour que les élèves puissent l''attribuer à l''écran. SECURITY DEFINER parce que la RLS de profiles ne leur laisse plus lire ces lignes. N''AJOUTER AUCUNE COLONNE SENSIBLE : cette fonction est lisible par tout compte connecté, et l''e-mail en est volontairement absent.';

alter function public.get_staff_directory() owner to postgres;
revoke all on function public.get_staff_directory() from public, anon;
grant execute on function public.get_staff_directory() to authenticated, service_role;
