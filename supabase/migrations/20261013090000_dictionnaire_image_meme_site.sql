-- ============================================================================
-- Dictionnaire : une image vient du site, jamais d'un autre hôte (ADR 0022)
-- ============================================================================
--
-- La contrainte de 20261012153000 (`^/[A-Za-z0-9/_.-]+$`) laisse passer
-- `//exemple.fr/a.png` : une adresse sans protocole, que le navigateur va
-- chercher sur un autre site (pistage des visiteurs). Relevé en écrivant la
-- validation Zod de la lecture (dictionary/entry-schema.ts), qui l'écarte déjà.
--
-- Aucun accès changé : ni lecture, ni écriture nouvelle ; l'admin ne peut plus
-- enregistrer une telle image. Aucune entrée n'a d'image aujourd'hui (vérifié
-- en production le 2026-10-10 : 0 ligne avec `image` non nulle).
--
-- Additive (une contrainte de plus, l'ancienne reste). Rollback :
--   alter table public.dictionary_entries drop constraint dictionary_entries_image_same_site;

alter table public.dictionary_entries
	add constraint dictionary_entries_image_same_site
	check (image is null or image !~ '^//');
