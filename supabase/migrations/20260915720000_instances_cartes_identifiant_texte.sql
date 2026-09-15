-- INCIDENT : la place de marché rend 500 depuis ce matin
-- ======================================================
--
-- `resolve_card_instances`, livrée par `20260915600000`, traduit une instance
-- de carte en identifiant de MODÈLE. Elle le castait en `uuid` :
--
--     select k.key, (k.value ->> 'cardId')::uuid
--
-- Or `vip_card_templates.id` est du **texte**, et les 49 modèles de la
-- production portent des identifiants lisibles : `soldes`, `bougeotte`,
-- `mathemo-letter`, `2048-freeze-spawn`… Aucun n'a la forme d'un uuid.
--
-- Vérifié sur les données réelles le 2026-09-15 :
--
--     ERROR: 22P02: invalid input syntax for type uuid: "soldes"
--
-- La fonction lève donc sur **toute carte réelle**. Ses deux appelants
-- (`enrichListingsWithCardData`, `enrichProposalsWithCardData`) transforment
-- l'erreur en exception — délibérément, pour ne jamais afficher un troc amputé.
-- Conséquence : `GET /api/marketplace/listings` et la liste des propositions
-- répondent **500** dès qu'une annonce visible offre une carte. Cinq annonces
-- sur treize sont dans ce cas.
--
-- ⚠️ POURQUOI LES TESTS N'ONT RIEN VU : le test d'intégration de la fonction
-- fabrique son modèle avec `crypto.randomUUID()`. Le décor ne ressemblait pas à
-- la production, et le cast n'a donc jamais été exercé sur un identifiant réel.
-- Le décor est corrigé dans le même lot.
--
-- ── Ce que fait cette migration ────────────────────────────────────────────
--
-- Le type de retour change (`uuid` → `text`), et PostgreSQL n'autorise pas
-- `create or replace` dans ce cas : il faut supprimer puis recréer. Aucune
-- donnée n'est touchée — c'est une fonction, créée ce matin.
--
-- INVENTAIRE DES USAGES avant le `drop` (grep du 2026-09-15) :
--
--   src/lib/types/database.ts:16617           (auto-généré)
--   src/lib/server/marketplace/helpers.ts:611
--   src/lib/server/marketplace/helpers.ts:765
--   src/routes/api/marketplace/listings/[id]/proposals/+server.ts:104
--   tests/integration/resolution-instances-cartes.test.ts:34
--
-- Aucune jointure PostgREST, aucun schéma Zod ne la nomme : c'est une RPC,
-- appelée par son nom. Les cinq appelants attendent une chaîne côté TypeScript
-- (`uuid` et `text` s'y projettent tous deux en `string`), donc `database.ts`
-- ne change pas.
--
-- ROLLBACK : `drop function public.resolve_card_instances(text[]);` puis
-- rejouer `20260915600000`. Ce serait rétablir la panne.

drop function if exists public.resolve_card_instances(text[]);

create or replace function public.resolve_card_instances(p_instance_ids text[])
returns table (instance_id text, card_id text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
    -- ⚠️ Pas de cast. `vip_card_templates.id` est du texte, et `cardId` porte
    -- un slug. Contraindre ici le type d'une donnée écrite ailleurs, c'est
    -- faire dépendre la disponibilité du marché d'une convention de nommage.
    select k.key, k.value ->> 'cardId'
    from public.profiles p,
         -- ⚠️ `jsonb_each` LÈVE sur un jsonb qui n'est pas un objet — un
         -- tableau, une chaîne, un nombre. Et `vip_cards is not null` ne teste
         -- que le NULL SQL, pas la forme.
         --
         -- Le couplage serait dangereux : cette fonction scanne TOUS les
         -- profils, donc UNE seule ligne malformée la ferait lever pour tous
         -- les appelants, et le marché rendrait 500 à toute l'école. C'est
         -- exactement ce que le cast en uuid a produit.
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
    'Traduit des identifiants d''instance de carte en identifiants de MODÈLE (texte : les modèles portent des slugs, pas des uuid), sans rendre aucune colonne de profil. Nécessaire parce que la correspondance vit dans profiles.vip_cards du vendeur, que l''acheteur ne peut plus lire depuis 20260915580000. N''AJOUTER AUCUNE COLONNE : ni le propriétaire, ni son école.';

-- ⚠️ Un `drop` emporte les droits avec lui : sans ces trois lignes, la fonction
-- fraîchement créée accorderait EXECUTE à PUBLIC (défaut de PostgreSQL) — la
-- cause racine de l'audit d'août.
alter function public.resolve_card_instances(text[]) owner to postgres;
revoke all on function public.resolve_card_instances(text[]) from public, anon;
grant execute on function public.resolve_card_instances(text[]) to authenticated, service_role;

-- ── Garde : le retour est bien du texte ────────────────────────────────────
-- Sans elle, un futur `create or replace` pourrait réintroduire le cast sans
-- que rien ne le signale avant la production.

do $$
declare
	v_type text;
begin
	select t.typname into v_type
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	join unnest(p.proallargtypes) with ordinality as a(oid, ord) on a.ord = 2
	join pg_type t on t.oid = a.oid
	where n.nspname = 'public' and p.proname = 'resolve_card_instances';

	if v_type is distinct from 'text' then
		raise exception 'resolve_card_instances rend card_id en % : les modèles de cartes portent des slugs, pas des uuid', v_type;
	end if;
end
$$;
