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
-- le NOM et l'AVATAR de son professeur.
--
-- La signature rend aussi `role`, et il faut le dire plutôt que de laisser le
-- commentaire mentir : `fetchBoardMembers` en a besoin pour distinguer le
-- professeur des élèves dans le sélecteur d'assignés du kanban. Ce n'est pas
-- une donnée personnelle, mais ça désigne nommément l'unique compte admin de
-- la plateforme — à savoir, si la question du hameçonnage se pose un jour.
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
-- besoin. Pas de paramètre, donc pas d'oracle d'existence — et pas de SQL
-- dynamique, donc aucune surface d'injection.
--
-- ⚠️ L'ABSENCE DE FILTRE PAR ÉCOLE EST UN CHOIX, pas un oubli. L'école est la
-- frontière sociale du projet, et filtrer dessus paraît prudent — ce serait un
-- bug : le `school_id` du personnel ne décrit pas les classes qu'il enseigne.
-- Mesuré le 2026-09-15 : l'unique professeur est rattaché au Lycée Blaise
-- Pascal, où il n'y a qu'un élève, tandis que 77 élèves sur 81 sont au Lycée
-- Franco-Qatari Voltaire. Un filtre par école viderait donc l'annuaire pour la
-- quasi-totalité des élèves, et recasserait les six écrans exactement comme le
-- retrait de la policy.
--
-- ⚠️ Ce que cette fonction expose suit `profiles.role` : promouvoir un compte
-- élève en `teacher`/`admin` le fait entrer dans l'annuaire, nom compris,
-- lisible par tous les comptes connectés. La protection des noms de mineurs
-- dépend donc aussi de qui a le droit d'ÉCRIRE `role`.
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
