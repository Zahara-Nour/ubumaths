-- Une amitié ne se déclare pas tout seul
-- =======================================
--
-- Prérequis du chantier « profils » : la policy `is_friend` (20260915440000)
-- fait de `friendships` une table d'AUTORISATION — une amitié acceptée ouvre
-- le profil de l'autre. Il faut donc qu'une amitié ne puisse pas être forgée,
-- sans quoi la restriction des profils ne protégerait rien.
--
-- Trouvé par `security-auditor`, vérifié en production avant d'écrire :
--
-- ── Trou 1 : `status` n'est pas contraint à l'INSERT ─────────────────────
--
--   with check ((auth.uid() = requester_id) and same_school(addressee_id))
--
-- `status` est `text not null` SANS `default`, avec un simple
-- `check (status in ('pending','accepted','rejected'))`. Un élève pouvait donc
-- insérer directement `status = 'accepted'` : une boucle sur les 76 autres
-- élèves de son école (`same_school`) lui ouvrait 76 profils complets,
-- adresses e-mail comprises. Les UUID s'obtiennent par les RPC de classement,
-- qui rendent `user_id`.
--
-- ── Trou 2 : l'UPDATE n'a pas de `with check` ────────────────────────────
--
--   using (auth.uid() = addressee_id)   -- et rien d'autre
--
-- ⚠️ Quand une policy UPDATE n'a pas de `with check`, Postgres réutilise son
-- `using` sur la NOUVELLE ligne. L'addressee ne peut donc pas se retirer
-- lui-même — mais rien ne l'empêche de réécrire `requester_id` vers un UUID
-- arbitraire et de passer la ligne en `accepted`. Même résultat, un cran plus
-- discret.
--
-- Un `with check` ne suffit pas à le fermer : une policy ne peut pas comparer
-- la nouvelle ligne à l'ancienne. D'où un trigger `before update`, seul endroit
-- où `old` et `new` coexistent.
--
-- ── Ce qui ne change pas ─────────────────────────────────────────────────
--
-- Le flux légitime est intact — vérifié : `FriendsManager.sendFriendRequest`
-- insère `status: 'pending'`, et accepter/refuser n'écrit que `status`
-- (`friends.svelte.ts:190`, `:220`, `:249`). Personne ne perd un accès qu'il
-- avait légitimement ; on retire un chemin d'auto-octroi.
--
-- ROLLBACK :
--   drop trigger if exists friendships_freeze_parties on public.friendships;
--   drop function if exists public.friendships_freeze_parties();
--   drop policy if exists "Users can create friendship requests" on public.friendships;
--   create policy "Users can create friendship requests"
--       on public.friendships for insert to authenticated
--       with check ((auth.uid() = requester_id) and same_school(addressee_id));

-- 1. Une demande naît TOUJOURS en attente.
drop policy if exists "Users can create friendship requests" on public.friendships;
create policy "Users can create friendship requests"
    on public.friendships for insert to authenticated
    with check (
        auth.uid() = requester_id
        and same_school(addressee_id)
        -- Le seul ajout : on ne s'auto-déclare pas ami. L'autre doit accepter.
        and status = 'pending'
    );

-- 2. Les parties d'une amitié sont figées pour la vie de la ligne.
create or replace function public.friendships_freeze_parties()
returns trigger
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $$
begin
    -- Seul `status` (et `updated_at`) doit pouvoir bouger. Changer une partie
    -- reviendrait à fabriquer une amitié avec quelqu'un qui n'a rien demandé.
    if new.requester_id is distinct from old.requester_id
       or new.addressee_id is distinct from old.addressee_id then
        raise exception 'Les parties d''une amitié ne peuvent pas être modifiées'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

comment on function public.friendships_freeze_parties() is
    'Empêche de réécrire requester_id/addressee_id sur une amitié existante. Une policy ne peut pas comparer NEW à OLD, d''où le trigger : sans lui, la policy UPDATE (sans with check) laisse l''addressee se fabriquer une amitié acceptée avec n''importe qui.';

drop trigger if exists friendships_freeze_parties on public.friendships;
create trigger friendships_freeze_parties
    before update on public.friendships
    for each row execute function public.friendships_freeze_parties();
