-- Voir qui vous envoie une demande d'ami
-- =======================================
--
-- Deuxième pièce du retrait de `Anyone can view profiles for leaderboard`.
-- Sans elle, les 18 demandes d'ami en attente de la production deviennent
-- invisibles ET IRRÉCUPÉRABLES.
--
-- Trouvé par `security-auditor`, mesuré sur les données réelles : sur les 18
-- `pending`, ZÉRO n'a un demandeur encore camarade ACTIF de son destinataire,
-- et zéro n'a par ailleurs une amitié `accepted` entre les deux. Les 18
-- disparaîtraient donc de l'écran.
--
-- ⚠️ Et sans issue : `loadFriendships` lit les profils des demandeurs en un
-- seul `.in('id', …)`, la RLS les filtre SANS erreur, et le code fait
-- `return null` puis `.filter(f => f !== null)` AVANT de répartir entre
-- demandes reçues et envoyées. La ligne s'évapore. Le destinataire ne voit
-- plus la demande et ne peut pas l'accepter ; le demandeur ne peut pas la
-- renvoyer, `unique_friendship` faisant échouer le nouvel INSERT.
--
-- ── Pourquoi À SENS UNIQUE ────────────────────────────────────────────────
--
-- ⚠️ NE PAS étendre `is_friend` à `pending`. Ce serait le réflexe, et il
-- rouvrirait exactement le trou que `20260915480000` vient de fermer :
-- j'envoie une demande, je lis le profil. L'autorisation ne doit voyager que
-- dans le sens ENTRANT — le destinataire voit qui le sollicite, jamais
-- l'inverse.
--
-- Le demandeur, lui, connaît déjà la personne à qui il écrit : on ne trouve
-- quelqu'un à qui envoyer une demande que parmi ses camarades ACTIFS
-- (`FriendsManager.getClassmates` filtre `status = 'active'`), déjà couverts
-- par `are_classmates`.
--
-- QUESTION D'ACCÈS, tranchée par David le 2026-09-15 : on referme les profils
-- en gardant le social fonctionnel. Ceci en est une condition.
--
-- ROLLBACK :
--   drop policy if exists "Addressee can view pending requester profile" on public.profiles;
--   drop function if exists public.has_pending_request_from(uuid);

create or replace function public.has_pending_request_from(p_requester_id uuid)
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
        where f.status = 'pending'
          -- ⚠️ L'ORDRE DES DEUX COLONNES EST LA GARDE. `auth.uid()` doit être
          -- le DESTINATAIRE. L'inverser donnerait au demandeur la lecture du
          -- profil qu'il sollicite, sur simple envoi.
          and f.addressee_id = auth.uid()
          and f.requester_id = p_requester_id
    );
exception
    when others then
        return false;
end;
$$;

comment on function public.has_pending_request_from(uuid) is
    'TRUE si p_requester_id a envoyé à auth.uid() une demande d''ami EN ATTENTE. Sens unique : le destinataire voit qui le sollicite, jamais l''inverse — sinon envoyer une demande suffirait à lire un profil.';

alter function public.has_pending_request_from(uuid) owner to postgres;
revoke all on function public.has_pending_request_from(uuid) from public, anon;
grant execute on function public.has_pending_request_from(uuid) to authenticated, service_role;

drop policy if exists "Addressee can view pending requester profile" on public.profiles;
create policy "Addressee can view pending requester profile"
    on public.profiles for select to authenticated
    using (public.has_pending_request_from(id));
