-- `profiles.class_ids` ne concerne que les élèves
-- ==============================================
--
-- La colonne est dénormalisée depuis `class_members`, qui ne porte que des
-- adhésions d'ÉLÈVES. Pour un professeur elle ne veut donc rien dire — et la
-- migration 20260912200000 a dû exclure explicitement les non-élèves de son
-- rattrapage pour ne pas écrire dans des lignes que sa source ne décrit pas.
--
-- CE QUI EST EFFACÉ : un unique professeur porte `class_ids = ['b00a8060…']`
-- (« 2nde Maths »), résidu d'une écriture ancienne. Vérifié en production le
-- 2026-09-12 :
--   - il n'a aucune adhésion dans `class_members` ;
--   - la classe visée est DÉSACTIVÉE ;
--   - aucune notification ne la cible ;
--   - la policy de `notifications` lui refuserait de toute façon les annonces
--     de classe, faute d'adhésion active.
-- La valeur n'a donc aucun effet observable, dans un sens comme dans l'autre.
--
-- CE QUI N'EST PAS PERDU : `classes` ne porte plus de colonne de lien vers un
-- professeur depuis le passage au modèle mono-professeur
-- (20260620090000_drop_class_teacher_id_mono_teacher). Le lien « ce professeur
-- enseigne cette classe » n'était donc pas porté ici non plus : dans ce
-- modèle, l'unique professeur a toutes les classes.
--
-- CE QUI N'EST PAS FAIT : aucune contrainte n'interdit à un non-élève de
-- reprendre un `class_ids`. Le trigger de synchronisation ne peut pas le
-- produire — il ne s'active que sur un changement d'adhésion, et un
-- professeur n'en a pas — donc une contrainte serait une rigidité sans cause
-- constatée.
--
-- ROLLBACK : la valeur effacée est
--   update public.profiles set class_ids = array['b00a8060-f4d9-4f41-9297-093e13ec71e1'::uuid]
--   where id = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';

update public.profiles
set class_ids = array[]::uuid[]
where role <> 'student'
	and coalesce(array_length(class_ids, 1), 0) > 0;
