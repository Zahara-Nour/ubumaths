-- =============================================================================
-- Modèles « Graphes et matrices » : sens de deux majuscules collées déclaré
-- =============================================================================
--
-- ADR 0035 (chantier `automaths-arbre`, lot 3a). Le sens « produit » de `AB`
-- (matrices) était déduit du THÈME `Graphes et matrices` (src/lib/questions/
-- capital-pairs.ts). Un modèle copié (bouton Dupliquer) ou neuf n'a plus de
-- thème : il perdrait ce sens. L'éditeur écrit désormais la déclaration
-- `shared.capitalPairs = 'product'` quand la branche l'impose ; cette migration
-- fait de même pour les modèles existants de ce thème qui ne déclarent rien.
-- Le générateur et la correction ne changent pas (déclaration -> thème ->
-- longueur) : le sens rendu est le même avant et après.
--
-- Relevé de la prod au 2026-11-04 : 21 brouillons de ce thème, 0 déclaré, aucun
-- publié. Données d'élèves : aucune.
--
-- Question d'accès (confirmée par David le 2026-11-04) : personne ne gagne de
-- lecture ; brouillons visibles des seuls admin/profs, sens rendu inchangé.
-- Aucune policy ni droit touché. Additive (une clé jsonb ajoutée).
--
-- `updated_at` : le trigger habituel le fait avancer sur les lignes touchées
-- (acceptable : le contenu des modèles est inchangé).
--
-- Rollback (retire la clé posée ; limite : il ne distingue pas une clé posée par
-- cette migration d'un `product` déclaré à la main ou par l'éditeur depuis, sur
-- un modèle de ce thème. Le sens rendu reste le même, le thème le redonnant) :
-- ROLLBACK:BEGIN
-- update public.question_templates
--    set shared = shared - 'capitalPairs'
--  where theme = 'Graphes et matrices'
--    and shared ->> 'capitalPairs' = 'product';
-- ROLLBACK:END
-- =============================================================================

update public.question_templates
   set shared = coalesce(shared, '{}'::jsonb) || jsonb_build_object('capitalPairs', 'product')
 where theme = 'Graphes et matrices'
   and not (coalesce(shared, '{}'::jsonb) ? 'capitalPairs');
