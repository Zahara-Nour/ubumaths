-- Qui est en face : le nom des participants du marché
-- ====================================================
--
-- Dernière pièce du retrait de `Anyone can view profiles for leaderboard`.
--
-- ── Ce qui disparaîtrait sans elle ───────────────────────────────────────
--
-- Le marché est à l'échelle de l'ÉCOLE (`.eq('school_id', …)`), alors qu'après
-- `20260915580000` un élève ne lit plus que lui-même, ses camarades ACTIFS,
-- ses amis, ses co-participants de tournoi, et le personnel. Les jointures qui
-- résolvent les PERSONNES — `creator:creator_id(...)`, `proposer:profiles!...`
-- — rendraient donc `null`.
--
-- ⚠️ Sans erreur. Tous les accès sont en `?.` et retombent sur « Anonyme » :
-- rien ne casserait, rien ne serait signalé.
--
-- Mesuré en production le 2026-09-15 :
--
--   · 1040 couples (13 annonces actives × 80 élèves) ;
--   · nom du vendeur encore visible par la CLASSE active : ZÉRO — 77 adhésions
--     sur 78 sont archivées, c'est la raison même de `20260915520000` ;
--   · encore visible par AMITIÉ : 91, soit 8,7 % ;
--   · donc 949 couples sur 1040 (91 %) afficheraient « Anonyme » ;
--   · et 10 propositions sur 31, dont 3 encore en attente.
--
-- QUESTION D'ACCÈS, posée et tranchée par David le 2026-09-15 : on rend le nom
-- par une fonction bornée. Savoir AVEC QUI on échange fait partie du
-- consentement, et le marché est déjà à l'échelle de l'école par conception —
-- ceci n'ouvre donc rien de neuf.
--
-- ── Ce qu'elle rend, et ce qu'elle ne rend pas ───────────────────────────
--
-- ⚠️ Jamais l'e-mail. Et le nom est PSEUDONYMISÉ — « Marie D. », comme
-- `get_achievement_leaderboard` — parce qu'un marché n'a pas besoin de l'état
-- civil complet d'un mineur pour qu'on sache à qui on parle.
--
-- ⚠️ Et elle ne rend QUE des participants : l'identifiant demandé doit
-- apparaître comme `creator_id` d'une annonce ou `proposer_id` d'une
-- proposition. Ce n'est donc pas un annuaire des élèves — passer un id au
-- hasard ne rend rien.
--
-- ROLLBACK :
--   drop function if exists public.resolve_marketplace_participants(uuid[]);

create or replace function public.resolve_marketplace_participants(p_user_ids uuid[])
returns table (id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
    select p.id,
           -- Pseudonymisé, comme le classement des succès.
           coalesce(p.firstname || ' ' || left(p.lastname, 1) || '.', 'Élève') as display_name,
           p.avatar_url
    from public.profiles p
    where p.id = any(p_user_ids)
      and array_length(p_user_ids, 1) <= 200
      -- ⚠️ LA garde : seuls les gens qui participent réellement au marché.
      -- Sans elle, la fonction deviendrait un annuaire de tous les élèves.
      and (
          exists (select 1 from public.marketplace_listings l where l.creator_id = p.id)
          or exists (select 1 from public.marketplace_proposals mp where mp.proposer_id = p.id)
      );
$$;

comment on function public.resolve_marketplace_participants(uuid[]) is
    'Nom pseudonymisé et avatar des participants du marché (vendeurs et proposants), pour que l''élève sache avec qui il échange. N''AJOUTER AUCUNE COLONNE SENSIBLE : ni e-mail, ni école, ni niveau. La condition d''existence est la garde — sans elle, ce serait un annuaire des élèves.';

alter function public.resolve_marketplace_participants(uuid[]) owner to postgres;
revoke all on function public.resolve_marketplace_participants(uuid[]) from public, anon;
grant execute on function public.resolve_marketplace_participants(uuid[]) to authenticated, service_role;
