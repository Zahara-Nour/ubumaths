-- Une fiche restreinte à certains élèves l'est vraiment
-- =====================================================
--
-- La policy « Students can view visible shared coursework for their classes »
-- réserve une fiche partagée aux élèves nommés, quand il y en a :
--
--     not exists (select 1 from shared_coursework_students
--                 where shared_coursework_id = shared_coursework.id)
--     or exists (... and scs.student_id = auth.uid())
--
-- ⚠️ Le `not exists` est évalué SOUS LA RLS de `shared_coursework_students`,
-- dont la seule policy élève est `using (student_id = auth.uid())`. Un élève ne
-- voit donc jamais les lignes de restriction des AUTRES : pour une fiche
-- réservée à ses camarades, la sous-requête rend zéro ligne, le `not exists`
-- vaut **true**, et la fiche lui est lisible.
--
-- Autrement dit : la restriction ne restreint personne d'autre que celui qu'on
-- a nommé. C'est la première forme des échecs silencieux de la RLS — une
-- lecture filtrée rend zéro ligne, et ce zéro est ici interprété comme
-- « aucune restriction ».
--
-- Trouvé par l'audit du 2026-09-15, corrigé sur décision de David le même jour.
--
-- ── Qui perd quoi ─────────────────────────────────────────────────────────
--
-- Un élève ACTIF de la classe qui n'est PAS dans la liste des destinataires ne
-- verra plus les fiches réservées à d'autres. C'est le comportement que la
-- fonctionnalité annonce depuis le début.
--
-- Exposition réelle mesurée avant écriture (prod, 2026-09-15) : 1 fiche
-- partagée en base, **0 ligne de restriction**. Personne n'est donc affecté
-- aujourd'hui — on répare la garde avant qu'elle serve, pas après.
--
-- ROLLBACK : rejouer l'`alter policy` en remplaçant
-- `not public.shared_coursework_is_restricted(shared_coursework.id)` par le
-- `not exists (...)` d'origine, puis
-- `drop function public.shared_coursework_is_restricted(uuid);`.

-- La question « cette fiche est-elle réservée à quelqu'un ? » ne regarde
-- personne en particulier : elle doit donc s'affranchir de la RLS. La fonction
-- ne rend qu'un booléen — ni qui, ni combien.
create or replace function public.shared_coursework_is_restricted(p_shared_coursework_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
    select exists (
        select 1
        from public.shared_coursework_students
        where shared_coursework_id = p_shared_coursework_id
    );
$$;

comment on function public.shared_coursework_is_restricted(uuid) is
    'Dit si une fiche partagée est réservée à des élèves nommés. SECURITY DEFINER parce que la question ne concerne personne en particulier : sous la RLS, un élève ne voit que SA propre ligne de restriction, et une fiche réservée à d''autres lui paraissait donc sans restriction. NE RIEN RENDRE D''AUTRE qu''un booléen.';

-- ⚠️ Une fonction neuve accorde EXECUTE à PUBLIC par défaut — cause racine de
-- l'audit d'août.
alter function public.shared_coursework_is_restricted(uuid) owner to postgres;
revoke all on function public.shared_coursework_is_restricted(uuid) from public, anon;
grant execute on function public.shared_coursework_is_restricted(uuid) to authenticated, service_role;

alter policy "Students can view visible shared coursework for their classes" on public.shared_coursework
using (
	visible = true
	and exists (
		select 1 from public.class_members
		where class_members.class_id = shared_coursework.class_id
			and class_members.student_id = auth.uid()
			and class_members.status = 'active'
	)
	and (
		-- Pas de destinataires nommés : la fiche est pour toute la classe.
		not public.shared_coursework_is_restricted(shared_coursework.id)
		-- Sinon, il faut être nommé. Cette sous-requête-ci PEUT rester sous la
		-- RLS : elle ne cherche que la ligne de l'appelant, la seule qu'il voie.
		or exists (
			select 1 from public.shared_coursework_students scs
			where scs.shared_coursework_id = shared_coursework.id
				and scs.student_id = auth.uid()
		)
	)
);

-- ── Garde : la policy ne doit plus tester l'existence sous la RLS ──────────

do $$
declare
	v_qual text;
begin
	select qual into v_qual
	from pg_policies
	where schemaname = 'public'
		and tablename = 'shared_coursework'
		and policyname = 'Students can view visible shared coursework for their classes';

	if v_qual is null then
		raise exception 'La policy des fiches partagées a disparu';
	end if;

	if position('shared_coursework_is_restricted' in v_qual) = 0 then
		raise exception 'La policy ne passe pas par shared_coursework_is_restricted : la restriction resterait invisible';
	end if;

	-- Les deux autres conditions doivent avoir survécu à la réécriture.
	if position('visible' in v_qual) = 0 or position('status = ''active''' in v_qual) = 0 then
		raise exception 'Une condition a été perdue en réécrivant la policy des fiches partagées';
	end if;
end
$$;
