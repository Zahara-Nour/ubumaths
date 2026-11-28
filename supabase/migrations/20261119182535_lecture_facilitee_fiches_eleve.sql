-- Lecture facilitée des fiches, par élève (accessibilité : élèves dys)
-- ====================================================================
--
-- Le PDF d'une fiche sort en Luciole (texte) et Luciole Math (formules) quand
-- le réglage de l'élève est allumé. Il rejoint la taille du texte dans
-- `student_print_settings`, table à part de `profiles` (un ami lit la ligne
-- `profiles` entière) : ce réglage laisse deviner un trouble de la lecture.
--
-- Question d'accès (David, 2026-11-19, D10 du chantier `lecture-facilitee`) :
-- personne de nouveau ne lit quoi que ce soit. La colonne hérite des policies
-- de la table : l'élève lui-même, son professeur et l'admin (`is_my_student`) ;
-- ni un autre élève (même ami), ni anon.
--
-- Qui gagne quoi : rien de neuf, une colonne de plus dans une ligne déjà lue
-- par les mêmes personnes. Migration additive : les lignes existantes prennent
-- `false` (réglage éteint), aucune donnée touchée.
--
-- ROLLBACK :
--   alter table public.student_print_settings drop column if exists easy_reading;

alter table public.student_print_settings
	add column easy_reading boolean not null default false;

comment on column public.student_print_settings.easy_reading is
	'Lecture facilitée des PDF de fiche : texte en Luciole et formules en Luciole Math.';
