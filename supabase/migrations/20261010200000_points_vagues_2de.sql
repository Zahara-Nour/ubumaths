-- ============================================================================
-- Passe « points vagues » sur les points de 2de (seed en prod depuis le 2026-10-08).
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/passe-points-vagues-2de.md (VALIDÉE
-- INTÉGRALEMENT par David le 2026-10-08 : « je valide tout » — P1 retrait de 2-332,
-- P2 nœud de 2-262, cinq libellés spécifiés), reportée dans seed-2de.md.
--   * 5 libellés spécifiés (2-262, 2-277, 2-392, 2-394, 2-395), avec les mots du BO ;
--   * 2-262 passe de « Calcul littéral > expressions fractionnaires » à la notion
--     « Calcul littéral » (son ancien jumeau 2-060 porte 7 modèles de calcul littéral
--     général, que le transfert C5 amènera ici) ;
--   * 2-332 (« Modéliser par des fonctions des situations… », compétence) SUPPRIMÉ.
--
-- ⚠️ DESTRUCTIF (une ligne supprimée) — accord explicite de David le 2026-10-08, après
-- exposé de ce qui serait perdu : la ligne du point et RIEN d'autre (vérifié en prod :
-- 0 modèle, 0 exercice, 0 suivi élève, 0 journal, 0 signalement SRS, 0 référence ; son
-- ancien jumeau 2-128 n'a aucun lien). La garde ci-dessous REFUSE la suppression si un
-- seul usage est apparu depuis : la migration échoue, rien n'est appliqué.
--
-- Rollback (scopé, grade '2') :
--   insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
--   values ($pt$2-332$pt$, $pt$Modéliser par des fonctions des situations issues des mathématiques, des autres disciplines ou de la vie courante ou citoyenne$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Fonctions > Représentation algébrique et graphique des fonctions$pt$, '2', 132, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)));
--   update public.curriculum_points set name = $pt$Exemples simples de calcul sur des expressions algébriques, en particulier sur des expressions fractionnaires$pt$ where code = '2-262' and grade = '2';
--   update public.curriculum_points set name = $pt$Interpréter, selon le contexte, cette comparaison en termes de variation additive ou multiplicative$pt$ where code = '2-277' and grade = '2';
--   update public.curriculum_points set name = $pt$Observer la loi des grands nombres à l'aide d'une simulation sur Python ou tableur$pt$ where code = '2-392' and grade = '2';
--   update public.curriculum_points set name = $pt$Construire un tableau en lien avec une situation donnée$pt$ where code = '2-394' and grade = '2';
--   update public.curriculum_points set name = $pt$Passer du registre de la langue naturelle au registre symbolique et inversement$pt$ where code = '2-395' and grade = '2';
--   update public.curriculum_points set node_id = (select s.id from public.classification_nodes s where s.kind = 'subnotion' and s.name = 'expressions fractionnaires' and s.parent_id = (select n.id from public.classification_nodes n join public.classification_nodes b on b.id = n.parent_id where n.kind = 'notion' and n.name = 'Calcul littéral' and b.kind = 'branch' and b.name = 'Algèbre')) where code = '2-262' and grade = '2';
-- ============================================================================

-- ---- 0. Garde : 2-332 ne doit avoir AUCUN usage -----------------------------
do $garde$
declare
	v_id uuid;
	v_usages integer;
begin
	select id into v_id from public.curriculum_points where code = '2-332' and grade = '2';
	if v_id is null then
		raise exception 'point 2-332 (grade 2) introuvable';
	end if;
	-- Verrou jusqu'à la fin de la transaction : aucun usage ne peut s'insérer entre le
	-- comptage et la suppression (une clé étrangère prend un verrou incompatible).
	perform 1 from public.curriculum_points where id = v_id for update;
	select (select count(*) from public.curriculum_point_automatismes where point_id = v_id)
	     + (select count(*) from public.question_template_points where point_id = v_id)
	     + (select count(*) from public.exercise_curriculum_points where point_id = v_id)
	     + (select count(*) from public.student_point_state where point_id = v_id)
	     + (select count(*) from public.journal_entry_points where point_id = v_id)
	     + (select count(*) from public.srs_anti_fraud_flags where capacity_point_id = v_id)
	  into v_usages;
	if v_usages <> 0 then
		raise exception 'suppression de 2-332 refusée : % usage(s) en base', v_usages;
	end if;
end $garde$;

-- ---- 1. Libellés spécifiés --------------------------------------------------
update public.curriculum_points set name = $pt$Calculer sur des expressions algébriques simples, en particulier sur des expressions fractionnaires$pt$
 where code = '2-262' and grade = '2' and name = $pt$Exemples simples de calcul sur des expressions algébriques, en particulier sur des expressions fractionnaires$pt$;
update public.curriculum_points set name = $pt$Interpréter, selon le contexte, la comparaison de deux quantités par leur différence ou par leur rapport en termes de variation additive ou multiplicative$pt$
 where code = '2-277' and grade = '2' and name = $pt$Interpréter, selon le contexte, cette comparaison en termes de variation additive ou multiplicative$pt$;
update public.curriculum_points set name = $pt$Observer, à l'aide d'une simulation sur Python ou tableur, que lorsque $n$ est grand la fréquence observée est proche de la probabilité (loi des grands nombres)$pt$
 where code = '2-392' and grade = '2' and name = $pt$Observer la loi des grands nombres à l'aide d'une simulation sur Python ou tableur$pt$;
update public.curriculum_points set name = $pt$Construire un tableau croisé d'effectifs en lien avec une situation donnée$pt$
 where code = '2-394' and grade = '2' and name = $pt$Construire un tableau en lien avec une situation donnée$pt$;
update public.curriculum_points set name = $pt$Traduire un énoncé en langage naturel à l'aide des notations des probabilités ($P(A)$, $\bar{A}$, $P(A \cap B)$, $P_A(B)$), et inversement$pt$
 where code = '2-395' and grade = '2' and name = $pt$Passer du registre de la langue naturelle au registre symbolique et inversement$pt$;

-- ---- 2. 2-262 sur la notion « Calcul littéral » ------------------------------
update public.curriculum_points set node_id = (select n.id from public.classification_nodes n join public.classification_nodes b on b.id = n.parent_id where n.kind = 'notion' and n.name = 'Calcul littéral' and b.kind = 'branch' and b.name = 'Algèbre')
 where code = '2-262' and grade = '2';

-- ---- 3. Retrait de 2-332 ----------------------------------------------------
delete from public.curriculum_points where code = '2-332' and grade = '2';

-- ---- 4. Vérifications (la migration échoue si le compte n'y est pas) --------
do $check$
declare
	v_pts integer; v_332 integer; v_noms integer; v_noeud integer; v_anciens integer;
begin
	select count(*) into v_pts from public.curriculum_points where grade = '2';
	select count(*) into v_332 from public.curriculum_points where code = '2-332';
	select count(*) into v_noms from public.curriculum_points where grade = '2' and (
(code = '2-262' and name = $pt$Calculer sur des expressions algébriques simples, en particulier sur des expressions fractionnaires$pt$)
		 or (code = '2-277' and name = $pt$Interpréter, selon le contexte, la comparaison de deux quantités par leur différence ou par leur rapport en termes de variation additive ou multiplicative$pt$)
		 or (code = '2-392' and name = $pt$Observer, à l'aide d'une simulation sur Python ou tableur, que lorsque $n$ est grand la fréquence observée est proche de la probabilité (loi des grands nombres)$pt$)
		 or (code = '2-394' and name = $pt$Construire un tableau croisé d'effectifs en lien avec une situation donnée$pt$)
		 or (code = '2-395' and name = $pt$Traduire un énoncé en langage naturel à l'aide des notations des probabilités ($P(A)$, $\bar{A}$, $P(A \cap B)$, $P_A(B)$), et inversement$pt$));
	select count(*) into v_noeud from public.curriculum_points
	 where code = '2-262' and grade = '2' and node_id = (select n.id from public.classification_nodes n join public.classification_nodes b on b.id = n.parent_id where n.kind = 'notion' and n.name = 'Calcul littéral' and b.kind = 'branch' and b.name = 'Algèbre');
	select count(*) into v_anciens from public.curriculum_points where grade is null and code ~ '^2-(0[0-9][0-9]|1[0-7][0-9]|18[0-5])$';
	if v_pts <> 199 or v_332 <> 0 or v_noms <> 5 or v_noeud <> 1 or v_anciens <> 185 then
		raise exception 'passe points vagues 2de incohérente : points=%, 2-332=%, libellés=%, nœud 2-262=%, anciens=%',
			v_pts, v_332, v_noms, v_noeud, v_anciens;
	end if;
end $check$;
