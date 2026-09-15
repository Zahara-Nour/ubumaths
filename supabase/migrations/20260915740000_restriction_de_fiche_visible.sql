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

-- ── La restriction doit couvrir le CONTENU, pas seulement la ligne parente ──
--
-- ⚠️ Trouvé par l'audit du 2026-09-15, après une première version de cette
-- migration qui ne fermait que `shared_coursework`.
--
-- Masquer la ligne parente ne masque pas ce qu'elle désigne. Les policies élève
-- de ces deux tables ne consultaient jamais la liste des destinataires : un
-- élève ACTIF non nommé lisait donc, en interrogeant PostgREST directement, le
-- titre, la consigne et l'échéance du devoir réservé à ses camarades — et les
-- `file_url` de ses documents. Sans deviner aucun identifiant : le `select` non
-- filtré était autorisé.
--
-- L'écran, lui, ne montrait rien : il part de `shared_coursework`. La frontière
-- réelle était donc la RLS seule, et elle était ouverte.

alter policy "Students can view coursework shared with their classes" on public.google_classroom_coursework
using (
	exists (
		select 1
		from public.shared_coursework sc
		join public.class_members cm on cm.class_id = sc.class_id
		where sc.coursework_id = google_classroom_coursework.id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and sc.visible = true
			and (
				not public.shared_coursework_is_restricted(sc.id)
				or exists (
					select 1 from public.shared_coursework_students scs
					where scs.shared_coursework_id = sc.id
						and scs.student_id = auth.uid()
				)
			)
	)
);

alter policy "Students can view materials for shared coursework" on public.coursework_materials
using (
	exists (
		select 1
		from public.shared_coursework sc
		join public.class_members cm on cm.class_id = sc.class_id
		where sc.coursework_id = coursework_materials.coursework_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and sc.visible = true
			and (
				not public.shared_coursework_is_restricted(sc.id)
				or exists (
					select 1 from public.shared_coursework_students scs
					where scs.shared_coursework_id = sc.id
						and scs.student_id = auth.uid()
				)
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

	-- Les autres conditions doivent avoir survécu à la réécriture.
	if position('visible = true' in v_qual) = 0 or position('status = ''active''' in v_qual) = 0 then
		raise exception 'Une condition a été perdue en réécrivant la policy des fiches partagées';
	end if;

	-- Sans cette branche, le destinataire NOMMÉ perdrait sa propre fiche : échec
	-- fermé, donc pas un trou, mais un service cassé sans rien faire rougir.
	if position('scs.student_id = auth.uid()' in v_qual) = 0 then
		raise exception 'La branche « destinataire nommé » a disparu : plus personne ne verrait une fiche restreinte';
	end if;

	-- Et le contenu doit être fermé comme la ligne parente.
	for v_qual in
		select qual from pg_policies
		where schemaname = 'public'
			and (tablename, policyname) in (
				('google_classroom_coursework', 'Students can view coursework shared with their classes'),
				('coursework_materials', 'Students can view materials for shared coursework')
			)
	loop
		if position('shared_coursework_is_restricted' in v_qual) = 0 then
			raise exception 'Le contenu d’une fiche restreinte reste lisible : la policy fille ne consulte pas les destinataires';
		end if;
	end loop;
end
$$;

-- ⚠️ Ces gardes vérifient le VOCABULAIRE, pas la structure : un `not` oublié ou
-- un parenthésage perdu les passerait au vert. La garde réelle est
-- `tests/integration/fiche-partagee-restreinte.test.ts`, qui éprouve les trois
-- cas — destinataire, camarade, et fiche sans destinataire.
