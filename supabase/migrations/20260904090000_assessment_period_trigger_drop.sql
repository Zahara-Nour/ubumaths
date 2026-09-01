-- ============================================================================
-- Création d'une évaluation : lever le trigger qui la rendait impossible
-- ============================================================================
-- `auto_assign_assessment_to_period` lit `NEW.class_id`, colonne qui n'existe
-- pas sur `assessments` — et n'a jamais existé : une évaluation n'appartient
-- pas à une classe, elle lui est assignée par `assessment_assignments`.
--
-- PL/pgSQL ne résout les champs de NEW qu'à l'exécution, donc l'erreur ne se
-- voyait pas à la création du trigger : elle se voit à chaque INSERT, sous la
-- forme « record "new" has no field "class_id" ». Autrement dit, aucune
-- évaluation n'a jamais pu être créée. La prod en compte zéro, ce qui est
-- cohérent avec un POST /api/assessments qui échoue systématiquement.
--
-- Trouvé en écrivant les tests d'intégration du cahier de texte, qui avaient
-- besoin de créer une évaluation.
--
-- On supprime plutôt que de réparer : le rattachement automatique à une période
-- passait par l'école de la classe, chemin qui n'existe pas. Le déduire de
-- l'année scolaire active ne suffirait pas non plus — il y a deux écoles et
-- deux années actives en base, donc la période serait ambiguë. Choisir sa
-- source demande une décision produit, pas une réparation mécanique ; d'ici là
-- `academic_period_id` reste renseignable explicitement.
-- ============================================================================

drop trigger if exists auto_assign_assessment_period on public.assessments;
drop function if exists public.auto_assign_assessment_to_period();
