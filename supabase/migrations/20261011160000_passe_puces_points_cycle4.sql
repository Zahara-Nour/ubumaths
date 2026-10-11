-- ============================================================================
-- Passe « puces et points » sur les points du cycle 4 (5e, 4e, 3e — seed en prod).
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/passe-cycle4.md (VALIDÉE par David le
-- 2026-10-09 : « cycle 3 puis cycle 4 », doutes = recos — dont la scission de 5-073 —,
-- retraits compris), reportée dans seed-cycle4.md et dans les listes de références.
-- Fichier GÉNÉRÉ — ne pas éditer à la main.
--   * 13 puces scindées : la première partie garde le point d'origine — celle que visent
--     les références existantes (ainsi 4-025 garde « résoudre », 5-077 garde « graphiques »,
--     4-034 et 3-022 gardent le théorème direct) ; 17 parties neuves (5-107…115, 4-070…072,
--     3-052…056), rangées après leur 1re partie ;
--   * 12 points vagues spécifiés avec les mots du BO ; 4 libellés remis au mot près du BO
--     (4-001, 4-003, 4-013, 4-020) ;
--   * 42 références d'automatismes AJOUTÉES (la ligne qui visait le point d'origine couvre
--     aussi la nouvelle partie) : 5-108 (×7), 5-110 et 5-111 (×7 chacune), 4-070 (×8),
--     3-052 (×7), 3-056 (×6) ;
--   * ⚠️ 2 points SUPPRIMÉS : 5-081 (« Aborder les questions relatives au hasard… ») et
--     3-031 (« Comprendre et interpréter des données statistiques ») — accord de David après
--     exposé de la perte (la ligne seule : 0 usage mesuré en prod) ; garde ci-dessous.
--   * ordre d'affichage renuméroté par grade.
--
-- Rollback (scopé) :
--   delete from public.curriculum_point_automatismes a using public.curriculum_points p
--    where a.point_id = p.id and p.code in ('3-052', '3-056', '4-070', '5-108', '5-110', '5-111');
--   delete from public.curriculum_points where code in ('5-107', '5-108', '5-115', '5-109', '5-110', '5-111', '5-112', '5-113', '5-114', '4-070', '4-071', '4-072', '3-052', '3-053', '3-054', '3-055', '3-056');
--   insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
--   values ($pt$5-081$pt$, $pt$Aborder les questions relatives au hasard à partir de problèmes simples.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Probabilités$pt$, '5', 81, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Expériences aléatoires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$)));
--   insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
--   values ($pt$3-031$pt$, $pt$Comprendre et interpréter des données statistiques.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '3', 31, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Indicateurs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)));
--   update public.curriculum_points set name = $pt$Connaitre le sens et les situations d'emploi de ces opérations.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Décimaux : calculs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$)) where code = '5-002' and grade = '5';
--   update public.curriculum_points set name = $pt$Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour factoriser, ou développer une expression littérale.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)) where code = '5-038' and grade = '5';
--   update public.curriculum_points set name = $pt$Calculer le volume du cube, du pavé droit, du prisme droit.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Volumes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Grandeurs et mesures$pt$)) where code = '5-050' and grade = '5';
--   update public.curriculum_points set name = $pt$Utiliser ces propriétés dans le cas de triangles particuliers.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$triangles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))) where code = '5-066' and grade = '5';
--   update public.curriculum_points set name = $pt$Connaitre les propriétés caractéristiques des côtés opposés et des diagonales.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parallélogrammes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))) where code = '5-069' and grade = '5';
--   update public.curriculum_points set name = $pt$Utiliser une propriété caractéristique sur les diagonales ou les côtés pour les construire ou donner la nature du quadrilatère.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parallélogrammes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))) where code = '5-070' and grade = '5';
--   update public.curriculum_points set name = $pt$Connaitre les propriétés caractéristiques.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parallélogrammes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Figures planes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))) where code = '5-072' and grade = '5';
--   update public.curriculum_points set name = $pt$Savoir calculer l'aire d'un parallélogramme et de figures complexes.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$parallélogramme$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Aires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Grandeurs et mesures$pt$))) where code = '5-073' and grade = '5';
--   update public.curriculum_points set name = $pt$Lire et interpréter des informations présentées sous forme de tableaux, de diagrammes et de graphiques.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)) where code = '5-077' and grade = '5';
--   update public.curriculum_points set name = $pt$Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un tableau, d'un diagramme (diagramme en barres, diagramme circulaire) ou d'un graphique cartésien.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)) where code = '5-078' and grade = '5';
--   update public.curriculum_points set name = $pt$Introduire l'expression : « en fonction de » dans des contextes concrets ou mathématiques.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)) where code = '5-092' and grade = '5';
--   update public.curriculum_points set name = $pt$Multiplier deux nombres relatifs : d'abord dans le cas où un seul des facteurs est négatif, puis, grâce à la distributivité, dans le cas où deux facteurs sont négatifs.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$produit$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Relatifs : calculs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$))) where code = '4-001' and grade = '4';
--   update public.curriculum_points set name = $pt$Savoir calculer un enchainement d'opérations avec les nombres relatifs.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Relatifs : calculs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$)) where code = '4-003' and grade = '4';
--   update public.curriculum_points set name = $pt$Calculer la valeur d'expressions comportant plusieurs opérations avec les fractions.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fractions : calculs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$)) where code = '4-013' and grade = '4';
--   update public.curriculum_points set name = $pt$Encadrer la racine carrée d'un entier par deux entiers consécutifs.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$définition$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Racines carrées : sens et écritures$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$))) where code = '4-020' and grade = '4';
--   update public.curriculum_points set name = $pt$Connaitre et utiliser la distributivité simple pour développer et factoriser une expression algébrique.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)) where code = '4-022' and grade = '4';
--   update public.curriculum_points set name = $pt$Mettre en équation un problème et le résoudre à l'aide d'une équation du premier degré du type ax + b = cx + d.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Équations : premier degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)) where code = '4-025' and grade = '4';
--   update public.curriculum_points set name = $pt$Faire le lien avec les parallélogrammes, les angles.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Translations$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$)) where code = '4-031' and grade = '4';
--   update public.curriculum_points set name = $pt$Connaitre le théorème de Pythagore, sa réciproque, sa contraposée.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Théorème de Pythagore$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$)) where code = '4-034' and grade = '4';
--   update public.curriculum_points set name = $pt$Mener un travail de logique sur la réciproque et la contraposée.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$réciproque$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Théorème de Pythagore$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))) where code = '4-035' and grade = '4';
--   update public.curriculum_points set name = $pt$Exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.).$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Expériences aléatoires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Probabilités$pt$)) where code = '4-049' and grade = '4';
--   update public.curriculum_points set name = $pt$Comprendre la dépendance d'une grandeur en fonction d'une autre.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)) where code = '4-064' and grade = '4';
--   update public.curriculum_points set name = $pt$Multiplier et diviser des puissances.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Puissances : calculs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$)) where code = '3-005' and grade = '3';
--   update public.curriculum_points set name = $pt$Résoudre analytiquement et graphiquement des équations de la forme x² = a.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$x² = a$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Équations : produit et quotient$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$))) where code = '3-008' and grade = '3';
--   update public.curriculum_points set name = $pt$Utiliser la double distributivité pour développer et factoriser des expressions dont le facteur est apparent.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)) where code = '3-013' and grade = '3';
--   update public.curriculum_points set name = $pt$Définir les grands cercles, le diamètre.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$reconnaître et décrire$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Solides$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))) where code = '3-019' and grade = '3';
--   update public.curriculum_points set name = $pt$Connaitre et appliquer le théorème de Thalès, sa réciproque, sa contraposée (configurations des triangles emboités et configuration dite du papillon).$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Théorème de Thalès$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$)) where code = '3-022' and grade = '3';
--   update public.curriculum_points set name = $pt$Donner les quartiles et la médiane d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$quartiles$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Indicateurs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))) where code = '3-029' and grade = '3';
--   update public.curriculum_points set name = $pt$Utiliser les différentes représentations d'une fonction.$pt$, node_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Généralités sur les fonctions$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$)) where code = '3-039' and grade = '3';
--   update public.curriculum_points set display_order = substring(code from '[0-9]+$')::int where grade in ('5', '4', '3');
-- ⚠️ Ce rollback n'est anodin que tant qu'AUCUN usage ne s'accroche aux 17 points neufs.
-- Supprimer un point efface EN SILENCE (ON DELETE CASCADE) : le suivi élève
-- (student_point_state), les rattachements d'exercices du prof (exercise_curriculum_points),
-- journal_entry_points, srs_anti_fraud_flags et les références d'automatismes ;
-- question_template_points (ON DELETE RESTRICT) fait échouer le rollback. Dès qu'un usage
-- existe : DESTRUCTIF (données d'élèves mineurs) — arrêt obligatoire et accord explicite de
-- David (règle CLAUDE.md).
-- ============================================================================

-- ---- 0. Garde : les points retirés ne doivent avoir AUCUN usage ------------------
do $garde$
declare
	v_id uuid; v_code text; v_usages integer;
begin
	foreach v_code in array array['5-081', '3-031'] loop
		select id into v_id from public.curriculum_points where code = v_code and grade is not null;
		if v_id is null then
			raise exception 'point % introuvable', v_code;
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
			raise exception 'suppression de % refusée : % usage(s) en base', v_code, v_usages;
		end if;
	end loop;
end $garde$;

-- ---- 1. Points existants : libellés et nœuds -----------------------------------
update public.curriculum_points set name = $pt$Connaitre le sens et les situations d'emploi de l'addition, de la soustraction, de la multiplication et de la division.$pt$
 where code = '5-002' and grade = '5' and name = $pt$Connaitre le sens et les situations d'emploi de ces opérations.$pt$;
update public.curriculum_points set name = $pt$Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour factoriser une expression littérale.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$factoriser$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)))
 where code = '5-038' and grade = '5' and name = $pt$Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour factoriser, ou développer une expression littérale.$pt$;
update public.curriculum_points set name = $pt$Calculer le volume du cube, du pavé droit.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$cube et pavé$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Volumes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Grandeurs et mesures$pt$)))
 where code = '5-050' and grade = '5' and name = $pt$Calculer le volume du cube, du pavé droit, du prisme droit.$pt$;
update public.curriculum_points set name = $pt$Utiliser les propriétés des hauteurs et des médianes dans le cas de triangles particuliers.$pt$
 where code = '5-066' and grade = '5' and name = $pt$Utiliser ces propriétés dans le cas de triangles particuliers.$pt$;
update public.curriculum_points set name = $pt$Connaitre les propriétés caractéristiques des côtés opposés et des diagonales d'un parallélogramme.$pt$
 where code = '5-069' and grade = '5' and name = $pt$Connaitre les propriétés caractéristiques des côtés opposés et des diagonales.$pt$;
update public.curriculum_points set name = $pt$Utiliser une propriété caractéristique sur les diagonales ou les côtés pour construire des parallélogrammes ou donner la nature du quadrilatère.$pt$
 where code = '5-070' and grade = '5' and name = $pt$Utiliser une propriété caractéristique sur les diagonales ou les côtés pour les construire ou donner la nature du quadrilatère.$pt$;
update public.curriculum_points set name = $pt$Connaitre les propriétés caractéristiques des parallélogrammes particuliers (rectangle, losange, carré).$pt$
 where code = '5-072' and grade = '5' and name = $pt$Connaitre les propriétés caractéristiques.$pt$;
update public.curriculum_points set name = $pt$Savoir calculer l'aire d'un parallélogramme.$pt$
 where code = '5-073' and grade = '5' and name = $pt$Savoir calculer l'aire d'un parallélogramme et de figures complexes.$pt$;
update public.curriculum_points set name = $pt$Lire et interpréter des informations présentées sous forme de graphiques.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$courbes et repères$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)))
 where code = '5-077' and grade = '5' and name = $pt$Lire et interpréter des informations présentées sous forme de tableaux, de diagrammes et de graphiques.$pt$;
update public.curriculum_points set name = $pt$Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un tableau.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$tableaux$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$)))
 where code = '5-078' and grade = '5' and name = $pt$Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un tableau, d'un diagramme (diagramme en barres, diagramme circulaire) ou d'un graphique cartésien.$pt$;
update public.curriculum_points set name = $pt$Employer l'expression « en fonction de » dans des contextes concrets ou mathématiques.$pt$
 where code = '5-092' and grade = '5' and name = $pt$Introduire l'expression : « en fonction de » dans des contextes concrets ou mathématiques.$pt$;
update public.curriculum_points set name = $pt$Multiplier deux nombres relatifs : d'abord dans le cas où un seul des facteurs est négatif, puis, grâce à la distributivité, dans le cas où les deux facteurs sont négatifs.$pt$
 where code = '4-001' and grade = '4' and name = $pt$Multiplier deux nombres relatifs : d'abord dans le cas où un seul des facteurs est négatif, puis, grâce à la distributivité, dans le cas où deux facteurs sont négatifs.$pt$;
update public.curriculum_points set name = $pt$Savoir calculer un enchainement d'opérations avec des nombres relatifs.$pt$
 where code = '4-003' and grade = '4' and name = $pt$Savoir calculer un enchainement d'opérations avec les nombres relatifs.$pt$;
update public.curriculum_points set name = $pt$Calculer la valeur d'expressions comportant plusieurs opérations avec des fractions.$pt$
 where code = '4-013' and grade = '4' and name = $pt$Calculer la valeur d'expressions comportant plusieurs opérations avec les fractions.$pt$;
update public.curriculum_points set name = $pt$Encadrer la racine carrée d'un entier par deux nombres entiers consécutifs.$pt$
 where code = '4-020' and grade = '4' and name = $pt$Encadrer la racine carrée d'un entier par deux entiers consécutifs.$pt$;
update public.curriculum_points set name = $pt$Connaitre et utiliser la distributivité simple pour développer une expression algébrique.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$développer$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)))
 where code = '4-022' and grade = '4' and name = $pt$Connaitre et utiliser la distributivité simple pour développer et factoriser une expression algébrique.$pt$;
update public.curriculum_points set name = $pt$Résoudre une équation du premier degré du type ax + b = cx + d.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$ax + b = cx + d$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Équations : premier degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)))
 where code = '4-025' and grade = '4' and name = $pt$Mettre en équation un problème et le résoudre à l'aide d'une équation du premier degré du type ax + b = cx + d.$pt$;
update public.curriculum_points set name = $pt$Faire le lien entre la translation et les parallélogrammes, les angles.$pt$
 where code = '4-031' and grade = '4' and name = $pt$Faire le lien avec les parallélogrammes, les angles.$pt$;
update public.curriculum_points set name = $pt$Connaitre le théorème de Pythagore.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$calculer une longueur$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Théorème de Pythagore$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$)))
 where code = '4-034' and grade = '4' and name = $pt$Connaitre le théorème de Pythagore, sa réciproque, sa contraposée.$pt$;
update public.curriculum_points set name = $pt$Mener un travail de logique sur la réciproque et la contraposée : savoir que si une propriété est vraie alors sa contraposée l'est aussi, sans pour autant que sa réciproque soit vraie.$pt$
 where code = '4-035' and grade = '4' and name = $pt$Mener un travail de logique sur la réciproque et la contraposée.$pt$;
update public.curriculum_points set name = $pt$Calculer la probabilité d'un évènement dans des exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.).$pt$
 where code = '4-049' and grade = '4' and name = $pt$Exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.).$pt$;
update public.curriculum_points set name = $pt$Comprendre qu'une formule, un graphique ou un tableau de valeurs traduisent la dépendance d'une grandeur en fonction d'une autre.$pt$
 where code = '4-064' and grade = '4' and name = $pt$Comprendre la dépendance d'une grandeur en fonction d'une autre.$pt$;
update public.curriculum_points set name = $pt$Multiplier des puissances.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$multiplier$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Puissances : calculs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$)))
 where code = '3-005' and grade = '3' and name = $pt$Multiplier et diviser des puissances.$pt$;
update public.curriculum_points set name = $pt$Résoudre analytiquement des équations de la forme x² = a.$pt$
 where code = '3-008' and grade = '3' and name = $pt$Résoudre analytiquement et graphiquement des équations de la forme x² = a.$pt$;
update public.curriculum_points set name = $pt$Utiliser la double distributivité pour développer des expressions.$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$développer$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$)))
 where code = '3-013' and grade = '3' and name = $pt$Utiliser la double distributivité pour développer et factoriser des expressions dont le facteur est apparent.$pt$;
update public.curriculum_points set name = $pt$Définir les grands cercles et le diamètre d'une sphère.$pt$
 where code = '3-019' and grade = '3' and name = $pt$Définir les grands cercles, le diamètre.$pt$;
update public.curriculum_points set name = $pt$Connaitre et appliquer le théorème de Thalès (configurations des triangles emboités et configuration dite du papillon).$pt$, node_id = (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$calculer une longueur$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Théorème de Thalès$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$)))
 where code = '3-022' and grade = '3' and name = $pt$Connaitre et appliquer le théorème de Thalès, sa réciproque, sa contraposée (configurations des triangles emboités et configuration dite du papillon).$pt$;
update public.curriculum_points set name = $pt$Donner les quartiles d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.$pt$
 where code = '3-029' and grade = '3' and name = $pt$Donner les quartiles et la médiane d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.$pt$;
update public.curriculum_points set name = $pt$Utiliser les différentes représentations d'une fonction : formule, graphique, tableau de valeurs.$pt$
 where code = '3-039' and grade = '3' and name = $pt$Utiliser les différentes représentations d'une fonction.$pt$;

-- ---- 2. Parties neuves -------------------------------------------------------
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-107$pt$, $pt$Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour développer une expression littérale.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Nombres et calculs > Calcul littéral et algébrique$pt$, '5', 39, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$développer$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-108$pt$, $pt$Calculer le volume du prisme droit.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Espace et géométrie > Représentation de l'espace$pt$, '5', 52, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$prisme et cylindre$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Volumes$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Grandeurs et mesures$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-115$pt$, $pt$Savoir calculer l'aire de figures complexes.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Espace et géométrie > Parallélogrammes$pt$, '5', 76, (select id from public.classification_nodes where kind = 'notion' and name = $pt$Aires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Grandeurs et mesures$pt$)));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-109$pt$, $pt$Lire et interpréter des informations présentées sous forme de tableaux.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '5', 81, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$tableaux$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-110$pt$, $pt$Lire et interpréter des informations présentées sous forme de diagrammes en barres.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '5', 82, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$diagrammes en barres$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-111$pt$, $pt$Lire et interpréter des informations présentées sous forme de diagrammes circulaires.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '5', 83, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$diagrammes circulaires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-112$pt$, $pt$Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un diagramme en barres.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '5', 85, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$diagrammes en barres$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-113$pt$, $pt$Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un diagramme circulaire.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '5', 86, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$diagrammes circulaires$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$5-114$pt$, $pt$Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un graphique cartésien.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '5', 87, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$courbes et repères$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Représenter des données$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$4-070$pt$, $pt$Connaitre et utiliser la distributivité simple pour factoriser une expression algébrique.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Nombres et calculs > Calcul littéral et algébrique$pt$, '4', 23, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$factoriser$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$4-071$pt$, $pt$Mettre en équation un problème à l'aide d'une équation du premier degré du type ax + b = cx + d.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Nombres et calculs > Calcul littéral et algébrique$pt$, '4', 27, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$mettre en équation$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Équations : premier degré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$4-072$pt$, $pt$Connaitre la réciproque et la contraposée du théorème de Pythagore.$pt$, 'connaissance', 'attendu', 'diversite', $pt$Espace et géométrie > Triangles$pt$, '4', 37, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$réciproque$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Théorème de Pythagore$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$3-052$pt$, $pt$Diviser des puissances.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Nombres et calculs > Puissances$pt$, '3', 6, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$diviser$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Puissances : calculs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Nombres et calculs$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$3-053$pt$, $pt$Résoudre graphiquement des équations de la forme x² = a.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Nombres et calculs > Racine carrée$pt$, '3', 10, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$x² = k, x² < k$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Fonction carré$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Fonctions$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$3-054$pt$, $pt$Utiliser la double distributivité pour factoriser des expressions dont le facteur est apparent.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Nombres et calculs > Calcul littéral et algébrique$pt$, '3', 16, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$factoriser$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Calcul littéral$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Algèbre$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$3-055$pt$, $pt$Connaitre et appliquer la réciproque et la contraposée du théorème de Thalès (configurations des triangles emboités et configuration dite du papillon).$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Espace et géométrie > Triangles$pt$, '3', 26, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$réciproque$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Théorème de Thalès$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Géométrie$pt$))));
insert into public.curriculum_points (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
values ($pt$3-056$pt$, $pt$Donner la médiane d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.$pt$, 'savoir_faire', 'attendu', 'diversite', $pt$Organisation et gestion de données et probabilités > Statistiques$pt$, '3', 34, (select id from public.classification_nodes where kind = 'subnotion' and name = $pt$médiane$pt$ and parent_id = (select id from public.classification_nodes where kind = 'notion' and name = $pt$Indicateurs$pt$ and parent_id = (select id from public.classification_nodes where kind = 'branch' and name = $pt$Statistiques$pt$))));

-- ---- 3. Points retirés (gardés par le bloc 0) ----------------------------------
delete from public.curriculum_points where code = '5-081' and grade = '5' and name = $pt$Aborder les questions relatives au hasard à partir de problèmes simples.$pt$;
delete from public.curriculum_points where code = '3-031' and grade = '3' and name = $pt$Comprendre et interpréter des données statistiques.$pt$;

-- ---- 4. Références ajoutées (même grade que la référence vers la 1re partie) -----
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '4' from public.curriculum_points p where p.code = $pt$5-108$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '3' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '2' from public.curriculum_points p where p.code = $pt$5-108$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '2' from public.curriculum_points p where p.code = $pt$5-110$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '2' from public.curriculum_points p where p.code = $pt$5-111$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '2' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '2' from public.curriculum_points p where p.code = $pt$3-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '2' from public.curriculum_points p where p.code = $pt$3-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_SPE' from public.curriculum_points p where p.code = $pt$5-108$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_SPE' from public.curriculum_points p where p.code = $pt$5-110$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_SPE' from public.curriculum_points p where p.code = $pt$5-111$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_SPE' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_SPE' from public.curriculum_points p where p.code = $pt$3-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_SPE' from public.curriculum_points p where p.code = $pt$3-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-108$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-110$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$5-111$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_GEN' from public.curriculum_points p where p.code = $pt$3-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-108$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-110$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$5-111$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, '1_TECHNO' from public.curriculum_points p where p.code = $pt$3-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_COMP' from public.curriculum_points p where p.code = $pt$5-108$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_COMP' from public.curriculum_points p where p.code = $pt$5-110$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_COMP' from public.curriculum_points p where p.code = $pt$5-111$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_COMP' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_COMP' from public.curriculum_points p where p.code = $pt$3-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_COMP' from public.curriculum_points p where p.code = $pt$3-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_SPE' from public.curriculum_points p where p.code = $pt$5-108$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_SPE' from public.curriculum_points p where p.code = $pt$5-110$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_SPE' from public.curriculum_points p where p.code = $pt$5-111$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_SPE' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_SPE' from public.curriculum_points p where p.code = $pt$3-052$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_SPE' from public.curriculum_points p where p.code = $pt$3-056$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-110$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$5-111$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$4-070$pt$ and p.grade is not null;
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, 'T_TECHNO' from public.curriculum_points p where p.code = $pt$3-052$pt$ and p.grade is not null;

-- ---- 5. Ordre d'affichage -------------------------------------------------------
update public.curriculum_points p set display_order = v.o
  from (values ('5-039', 40), ('5-040', 41), ('5-041', 42), ('5-042', 43), ('5-043', 44), ('5-044', 45), ('5-045', 46), ('5-046', 47), ('5-047', 48), ('5-048', 49), ('5-049', 50), ('5-050', 51), ('5-051', 53), ('5-052', 54), ('5-053', 55), ('5-054', 56), ('5-055', 57), ('5-056', 58), ('5-057', 59), ('5-058', 60), ('5-059', 61), ('5-060', 62), ('5-061', 63), ('5-062', 64), ('5-063', 65), ('5-064', 66), ('5-065', 67), ('5-066', 68), ('5-067', 69), ('5-068', 70), ('5-069', 71), ('5-070', 72), ('5-071', 73), ('5-072', 74), ('5-073', 75), ('5-074', 77), ('5-075', 78), ('5-076', 79), ('5-077', 80), ('5-078', 84), ('5-079', 88), ('5-080', 89), ('5-082', 90), ('5-083', 91), ('5-084', 92), ('5-085', 93), ('5-086', 94), ('5-087', 95), ('5-088', 96), ('5-089', 97), ('5-090', 98), ('5-091', 99), ('5-092', 100), ('5-093', 101), ('5-094', 102), ('5-095', 103), ('5-096', 104), ('5-097', 105), ('5-098', 106), ('5-099', 107), ('5-100', 108), ('5-101', 109), ('5-102', 110), ('5-103', 111), ('5-104', 112), ('5-105', 113), ('5-106', 114)) as v(code, o)
 where p.code = v.code and p.grade = '5';
update public.curriculum_points p set display_order = v.o
  from (values ('4-023', 24), ('4-024', 25), ('4-025', 26), ('4-026', 28), ('4-027', 29), ('4-028', 30), ('4-029', 31), ('4-030', 32), ('4-031', 33), ('4-032', 34), ('4-033', 35), ('4-034', 36), ('4-035', 38), ('4-036', 39), ('4-037', 40), ('4-038', 41), ('4-039', 42), ('4-040', 43), ('4-041', 44), ('4-042', 45), ('4-043', 46), ('4-044', 47), ('4-045', 48), ('4-046', 49), ('4-047', 50), ('4-048', 51), ('4-049', 52), ('4-050', 53), ('4-051', 54), ('4-052', 55), ('4-053', 56), ('4-054', 57), ('4-055', 58), ('4-056', 59), ('4-057', 60), ('4-058', 61), ('4-059', 62), ('4-060', 63), ('4-061', 64), ('4-062', 65), ('4-063', 66), ('4-064', 67), ('4-065', 68), ('4-066', 69), ('4-067', 70), ('4-068', 71), ('4-069', 72)) as v(code, o)
 where p.code = v.code and p.grade = '4';
update public.curriculum_points p set display_order = v.o
  from (values ('3-006', 7), ('3-007', 8), ('3-008', 9), ('3-009', 11), ('3-010', 12), ('3-011', 13), ('3-012', 14), ('3-013', 15), ('3-014', 17), ('3-015', 18), ('3-016', 19), ('3-017', 20), ('3-018', 21), ('3-019', 22), ('3-020', 23), ('3-021', 24), ('3-022', 25), ('3-023', 27), ('3-024', 28), ('3-025', 29), ('3-026', 30), ('3-027', 31), ('3-028', 32), ('3-029', 33), ('3-030', 35), ('3-032', 36), ('3-033', 37), ('3-034', 38), ('3-035', 39), ('3-036', 40), ('3-037', 41), ('3-038', 42), ('3-039', 43), ('3-040', 44), ('3-041', 45), ('3-042', 46), ('3-043', 47), ('3-044', 48), ('3-045', 49), ('3-046', 50), ('3-047', 51), ('3-048', 52), ('3-049', 53), ('3-050', 54), ('3-051', 55)) as v(code, o)
 where p.code = v.code and p.grade = '3';

-- ---- 6. Vérifications (la migration échoue si le compte n'y est pas) --------
do $check$
declare
	v_5 integer; v_4 integer; v_3 integer; v_sans_noeud integer; v_noms integer;
	v_retires integer; v_refs integer; v_ordre integer;
begin
	select count(*) into v_5 from public.curriculum_points where grade = '5';
	select count(*) into v_4 from public.curriculum_points where grade = '4';
	select count(*) into v_3 from public.curriculum_points where grade = '3';
	select count(*) into v_sans_noeud from public.curriculum_points where grade in ('5', '4', '3') and node_id is null;
	select count(*) into v_noms from public.curriculum_points where grade in ('5', '4', '3') and ((code = '5-002' and name = $pt$Connaitre le sens et les situations d'emploi de l'addition, de la soustraction, de la multiplication et de la division.$pt$) or (code = '5-038' and name = $pt$Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour factoriser une expression littérale.$pt$) or (code = '5-050' and name = $pt$Calculer le volume du cube, du pavé droit.$pt$) or (code = '5-066' and name = $pt$Utiliser les propriétés des hauteurs et des médianes dans le cas de triangles particuliers.$pt$) or (code = '5-069' and name = $pt$Connaitre les propriétés caractéristiques des côtés opposés et des diagonales d'un parallélogramme.$pt$) or (code = '5-070' and name = $pt$Utiliser une propriété caractéristique sur les diagonales ou les côtés pour construire des parallélogrammes ou donner la nature du quadrilatère.$pt$) or (code = '5-072' and name = $pt$Connaitre les propriétés caractéristiques des parallélogrammes particuliers (rectangle, losange, carré).$pt$) or (code = '5-073' and name = $pt$Savoir calculer l'aire d'un parallélogramme.$pt$) or (code = '5-077' and name = $pt$Lire et interpréter des informations présentées sous forme de graphiques.$pt$) or (code = '5-078' and name = $pt$Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un tableau.$pt$) or (code = '5-092' and name = $pt$Employer l'expression « en fonction de » dans des contextes concrets ou mathématiques.$pt$) or (code = '4-001' and name = $pt$Multiplier deux nombres relatifs : d'abord dans le cas où un seul des facteurs est négatif, puis, grâce à la distributivité, dans le cas où les deux facteurs sont négatifs.$pt$) or (code = '4-003' and name = $pt$Savoir calculer un enchainement d'opérations avec des nombres relatifs.$pt$) or (code = '4-013' and name = $pt$Calculer la valeur d'expressions comportant plusieurs opérations avec des fractions.$pt$) or (code = '4-020' and name = $pt$Encadrer la racine carrée d'un entier par deux nombres entiers consécutifs.$pt$) or (code = '4-022' and name = $pt$Connaitre et utiliser la distributivité simple pour développer une expression algébrique.$pt$) or (code = '4-025' and name = $pt$Résoudre une équation du premier degré du type ax + b = cx + d.$pt$) or (code = '4-031' and name = $pt$Faire le lien entre la translation et les parallélogrammes, les angles.$pt$) or (code = '4-034' and name = $pt$Connaitre le théorème de Pythagore.$pt$) or (code = '4-035' and name = $pt$Mener un travail de logique sur la réciproque et la contraposée : savoir que si une propriété est vraie alors sa contraposée l'est aussi, sans pour autant que sa réciproque soit vraie.$pt$) or (code = '4-049' and name = $pt$Calculer la probabilité d'un évènement dans des exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.).$pt$) or (code = '4-064' and name = $pt$Comprendre qu'une formule, un graphique ou un tableau de valeurs traduisent la dépendance d'une grandeur en fonction d'une autre.$pt$) or (code = '3-005' and name = $pt$Multiplier des puissances.$pt$) or (code = '3-008' and name = $pt$Résoudre analytiquement des équations de la forme x² = a.$pt$) or (code = '3-013' and name = $pt$Utiliser la double distributivité pour développer des expressions.$pt$) or (code = '3-019' and name = $pt$Définir les grands cercles et le diamètre d'une sphère.$pt$) or (code = '3-022' and name = $pt$Connaitre et appliquer le théorème de Thalès (configurations des triangles emboités et configuration dite du papillon).$pt$) or (code = '3-029' and name = $pt$Donner les quartiles d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres.$pt$) or (code = '3-039' and name = $pt$Utiliser les différentes représentations d'une fonction : formule, graphique, tableau de valeurs.$pt$));
	select count(*) into v_retires from public.curriculum_points where code in ('5-081', '3-031');
	select count(*) into v_refs from public.curriculum_point_automatismes a join public.curriculum_points p on p.id = a.point_id where (p.code = '5-108' and a.grade = '4') or (p.code = '4-070' and a.grade = '3') or (p.code = '5-108' and a.grade = '2') or (p.code = '5-110' and a.grade = '2') or (p.code = '5-111' and a.grade = '2') or (p.code = '4-070' and a.grade = '2') or (p.code = '3-052' and a.grade = '2') or (p.code = '3-056' and a.grade = '2') or (p.code = '5-108' and a.grade = '1_SPE') or (p.code = '5-110' and a.grade = '1_SPE') or (p.code = '5-111' and a.grade = '1_SPE') or (p.code = '4-070' and a.grade = '1_SPE') or (p.code = '3-052' and a.grade = '1_SPE') or (p.code = '3-056' and a.grade = '1_SPE') or (p.code = '5-108' and a.grade = '1_GEN') or (p.code = '5-110' and a.grade = '1_GEN') or (p.code = '5-111' and a.grade = '1_GEN') or (p.code = '4-070' and a.grade = '1_GEN') or (p.code = '3-052' and a.grade = '1_GEN') or (p.code = '3-056' and a.grade = '1_GEN') or (p.code = '5-108' and a.grade = '1_TECHNO') or (p.code = '5-110' and a.grade = '1_TECHNO') or (p.code = '5-111' and a.grade = '1_TECHNO') or (p.code = '4-070' and a.grade = '1_TECHNO') or (p.code = '3-052' and a.grade = '1_TECHNO') or (p.code = '3-056' and a.grade = '1_TECHNO') or (p.code = '5-108' and a.grade = 'T_COMP') or (p.code = '5-110' and a.grade = 'T_COMP') or (p.code = '5-111' and a.grade = 'T_COMP') or (p.code = '4-070' and a.grade = 'T_COMP') or (p.code = '3-052' and a.grade = 'T_COMP') or (p.code = '3-056' and a.grade = 'T_COMP') or (p.code = '5-108' and a.grade = 'T_SPE') or (p.code = '5-110' and a.grade = 'T_SPE') or (p.code = '5-111' and a.grade = 'T_SPE') or (p.code = '4-070' and a.grade = 'T_SPE') or (p.code = '3-052' and a.grade = 'T_SPE') or (p.code = '3-056' and a.grade = 'T_SPE') or (p.code = '5-110' and a.grade = 'T_TECHNO') or (p.code = '5-111' and a.grade = 'T_TECHNO') or (p.code = '4-070' and a.grade = 'T_TECHNO') or (p.code = '3-052' and a.grade = 'T_TECHNO');
	select count(*) into v_ordre from (
		select grade, count(distinct display_order) = count(*) and min(display_order) = 1 and max(display_order) = count(*) as ok
		  from public.curriculum_points where grade in ('5', '4', '3') group by grade) s where ok;
	if v_5 <> 114 or v_4 <> 72 or v_3 <> 55 or v_sans_noeud <> 0 or v_noms <> 29
	   or v_retires <> 0 or v_refs <> 42 or v_ordre <> 3 then
		raise exception 'passe cycle 4 incohérente : 5e=%, 4e=%, 3e=%, sans nœud=%, libellés=%, retirés restants=%, réfs ajoutées=%, ordres valides=%',
			v_5, v_4, v_3, v_sans_noeud, v_noms, v_retires, v_refs, v_ordre;
	end if;
end $check$;
