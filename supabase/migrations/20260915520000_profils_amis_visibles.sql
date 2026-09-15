-- Voir le profil de ses amis
-- ==========================
--
-- Première moitié d'un correctif en deux temps. Elle n'OUVRE rien qui ne soit
-- déjà ouvert : `Anyone can view profiles for leaderboard` rend aujourd'hui
-- TOUS les profils lisibles à tout compte connecté. Cette policy prépare son
-- retrait (`20260915460000`), qui est la moitié qui referme.
--
-- Pourquoi une policy dédiée : une amitié SURVIT au changement de classe. Sans
-- elle, retirer le `using (true)` viderait la liste d'amis de tout élève dont
-- l'ami n'est plus un camarade ACTIF — soit, en production aujourd'hui, la
-- totalité : 112 amitiés, aucune entre deux camarades actifs, parce que 77
-- adhésions sur 78 sont archivées (les classes de l'an dernier).
--
-- ── Portée : « accepted » seulement, et c'est délibéré ────────────────────
--
-- Une demande `pending` n'ouvre RIEN. On ne trouve quelqu'un à qui envoyer une
-- demande que parmi ses camarades actifs (`FriendsManager.getClassmates` filtre
-- `status = 'active'`), et ceux-là sont déjà visibles via `are_classmates`.
-- Couvrir `pending` créerait un chemin d'accès par simple envoi de demande,
-- sans besoin démontré.
--
-- QUESTION D'ACCÈS, posée et tranchée par David le 2026-09-15 : un élève garde
-- la vue du profil de quelqu'un avec qui il a une amitié ACCEPTÉE, même s'ils
-- ne partagent plus de classe.
--
-- ROLLBACK :
--   drop policy if exists "Users can view friends profiles" on public.profiles;
--   drop function if exists public.is_friend(uuid);

create or replace function public.is_friend(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    -- SECURITY DEFINER pour éviter la récursion RLS : `friendships` a ses
    -- propres policies, qui liraient `profiles`, qui appellerait ceci.
    return exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (
              (f.requester_id = auth.uid() and f.addressee_id = p_user_id)
              or (f.addressee_id = auth.uid() and f.requester_id = p_user_id)
          )
    );
exception
    -- Fail-closed, comme ses voisines `are_classmates` et `is_class_member`.
    when others then
        return false;
end;
$$;

comment on function public.is_friend(uuid) is
    'TRUE si auth.uid() et p_user_id ont une amitié ACCEPTÉE, dans un sens ou dans l''autre. Volontairement insensible aux demandes en attente : on ne trouve un ami que parmi ses camarades actifs, déjà couverts par are_classmates.';

alter function public.is_friend(uuid) owner to postgres;
revoke all on function public.is_friend(uuid) from public, anon;
grant execute on function public.is_friend(uuid) to authenticated, service_role;

drop policy if exists "Users can view friends profiles" on public.profiles;
create policy "Users can view friends profiles"
    on public.profiles for select to authenticated
    using (public.is_friend(id));
