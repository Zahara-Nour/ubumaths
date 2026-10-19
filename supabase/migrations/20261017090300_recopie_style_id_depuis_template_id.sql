-- Recopie worksheets.style_id ← template_id (issue #1529, ADR 0028)
--
-- Première des trois étapes du retrait de la colonne worksheets.template_id :
-- chaque fiche qui ne désigne son style que par template_id reçoit le même
-- identifiant dans style_id. Le style lu (`styleIdOf` : style_id ?? template_id)
-- ne change pour aucune fiche, son PDF reste identique.
--
-- Prod au 2026-10-19 : 26 fiches concernées, toutes sur un style de Chiphre
-- (owner_id null) ; aucune divergente (style_id ≠ template_id).
--
-- Accès : aucun changement. Une valeur passe d'une colonne à l'autre de la
-- même ligne ; aucune policy n'est touchée.
--
-- Une fiche dont le gabarit n'est pas un style (gabarit libre, sans ligne de
-- même identifiant dans worksheet_styles) reste sans style_id : la clé
-- étrangère le refuserait.
--
-- La date de modification des fiches est gardée : le trigger updated_at est
-- coupé le temps de la recopie.
--
-- Idempotente : rejouée, elle ne trouve plus de fiche à recopier.
--
-- Rollback : rien à défaire. Après la recopie, style_id = template_id sur les
-- lignes touchées, et `styleIdOf` rend le même style avec ou sans elle.

alter table public.worksheets disable trigger update_worksheets_updated_at;

update public.worksheets w
set style_id = w.template_id
where w.style_id is null
	and w.template_id is not null
	and exists (select 1 from public.worksheet_styles s where s.id = w.template_id);

alter table public.worksheets enable trigger update_worksheets_updated_at;
