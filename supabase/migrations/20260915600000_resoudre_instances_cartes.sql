-- Traduire un identifiant d'instance de carte en modèle, sans lire de profil
-- ==========================================================================
--
-- Prérequis du retrait de `Anyone can view profiles for leaderboard`
-- (`20260915580000`). Sans cette fonction, la place de marché s'affiche
-- AMPUTÉE à la seconde où la policy tombe.
--
-- ── Le mécanisme ──────────────────────────────────────────────────────────
--
-- Une annonce porte des `offered_card_ids`, qui sont des identifiants
-- d'INSTANCE. Les traduire en modèles de cartes demande de lire
-- `profiles.vip_cards` DU VENDEUR — avec le client de l'élève, donc sous RLS.
--
-- ⚠️ Une lecture filtrée par la RLS ne rend AUCUNE erreur : elle rend zéro
-- ligne. La garde écrite dans `helpers.ts` (« on préfère une erreur visible à
-- une offre amputée ») ne se déclenche donc jamais, et la boucle de
-- construction n'ajoute simplement aucune carte à l'offre.
--
-- Mesuré en production le 2026-09-15, sur les 13 annonces actives : 5 portent
-- des cartes, et seuls 1 à 12 élèves sur 76 peuvent lire le profil de leur
-- vendeur. Les autres verraient une proposition d'échange VIDE — et
-- l'accepteraient sans voir ce qu'on leur propose. Le transfert, lui, passe
-- par `execute_trade` et déplace les vraies cartes : l'écart porte sur le
-- CONSENTEMENT, pas sur l'intégrité.
--
-- ── Ce que la fonction rend, et ce qu'elle ne rend pas ────────────────────
--
-- ⚠️ Aucune colonne de `profiles`. Ni l'identité du propriétaire, ni son
-- école, ni rien d'autre : seulement la correspondance instance → modèle. Un
-- élève peut déjà voir ces modèles, ils sont publics dans
-- `vip_card_templates` ; ce qu'il ne doit pas voir, c'est à QUI appartient
-- quoi, et cette fonction ne le dit pas.
--
-- Elle ne rend que les instances explicitement demandées : pas d'énumération
-- possible, et le plafond borne le coût.
--
-- ROLLBACK :
--   drop function if exists public.resolve_card_instances(text[]);

create or replace function public.resolve_card_instances(p_instance_ids text[])
returns table (instance_id text, card_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
    select k.key, (k.value ->> 'cardId')::uuid
    from public.profiles p,
         -- ⚠️ `jsonb_each` LÈVE sur un jsonb qui n'est pas un objet — un
         -- tableau, une chaîne, un nombre. Et `vip_cards is not null` ne teste
         -- que le NULL SQL, pas la forme.
         --
         -- Le couplage serait dangereux : cette fonction scanne TOUS les
         -- profils, donc UNE seule ligne malformée la ferait lever pour tous
         -- les appelants, et le marché rendrait 500 à toute l'école.
         --
         -- Aujourd'hui aucun élève ne peut écrire ça — le trigger
         -- `update_vip_cards_history_trigger` est BEFORE UPDATE sur toute la
         -- table et appelle lui-même `jsonb_each`, donc il refuse l'écriture
         -- avant qu'elle aboutisse (vérifié le 2026-09-15). Mais on ne fait pas
         -- dépendre la disponibilité du marché d'un trigger voisin : le `case`
         -- ne dépend de rien.
         --
         -- ⚠️ Dans le FROM, pas dans le WHERE : un `jsonb_typeof(...) = 'object'`
         -- en prédicat ne serait correct que si le planificateur le pousse sous
         -- la jointure latérale. Il le fait, mais on ne s'appuie pas dessus.
         lateral jsonb_each(
             case when jsonb_typeof(p.vip_cards) = 'object'
                  then p.vip_cards
                  else '{}'::jsonb end
         ) k
    -- ⚠️ Le filtre EST la garde : sans lui, la fonction déverserait la
    -- totalité des inventaires de la base.
    where k.key = any(p_instance_ids)
      -- Échoue FERMÉ : `array_length` rend NULL sur un tableau vide ou NULL,
      -- donc le prédicat vaut NULL et la fonction ne rend rien.
      and array_length(p_instance_ids, 1) <= 500;
$$;

comment on function public.resolve_card_instances(text[]) is
    'Traduit des identifiants d''instance de carte en identifiants de MODÈLE, sans rendre aucune colonne de profil. Nécessaire parce que la correspondance vit dans profiles.vip_cards du vendeur, que l''acheteur ne peut plus lire depuis 20260915580000. N''AJOUTER AUCUNE COLONNE : ni le propriétaire, ni son école.';

alter function public.resolve_card_instances(text[]) owner to postgres;
revoke all on function public.resolve_card_instances(text[]) from public, anon;
grant execute on function public.resolve_card_instances(text[]) to authenticated, service_role;
