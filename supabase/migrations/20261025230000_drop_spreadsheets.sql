-- Tableur V4 : la table `spreadsheets` est supprimée, avec sa fonction de trigger.
--
-- `/spreadsheet` est retiré depuis #1692 (livré en prod par le deploy:prod v0.47.0,
-- 2026-10-25) : la grille de l'atelier le remplace, et plus aucun code ne lit ni n'écrit
-- la table (grep `spreadsheets` dans src/ : seuls les types générés de database.ts).
--
-- Données perdues (prod, relevé du 2026-10-25) : UNE ligne, « Nouveau tableur », créée
-- par un élève le 2025-12-04, 12 cellules (536 octets de jsonb). Plus accessible depuis
-- le retrait de la page.
--
-- Dépendances relevées en prod : aucune vue, aucune clé étrangère entrante, aucune
-- publication realtime, aucune fonction qui cite la table. Le `DROP TABLE` emporte ses
-- 4 policies, ses 2 index, son trigger et sa clé étrangère vers `profiles`.
-- `update_spreadsheets_updated_at()` ne sert qu'à ce trigger : elle part avec.
--
-- Question d'accès en miroir (« qui ne pourra plus lire ce qu'il lisait ? ») : personne.
-- Les policies ne donnaient à chacun que SES tableurs, et la page qui les ouvrait n'existe
-- plus.
--
-- Destructif : ne jouer en prod (`db:migrate`) qu'avec l'accord de David.
--
-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- La structure se recrée (baseline 20260616220000) ; la ligne perdue, non.
-- create table public.spreadsheets (
-- 	id uuid default gen_random_uuid() not null primary key,
-- 	user_id uuid not null references public.profiles(id) on delete cascade,
-- 	name varchar(255) default 'Sans titre' not null,
-- 	description text,
-- 	data jsonb default '{"cells": {}, "version": 1, "metadata": {"cols": 20, "name": "Sans titre", "rows": 20}}'::jsonb not null,
-- 	created_at timestamptz default now() not null,
-- 	updated_at timestamptz default now() not null
-- );
-- Puis, depuis la baseline : la fonction `update_spreadsheets_updated_at()` avec son
-- `set search_path`, son trigger, les 2 index, `enable row level security` et les 4 policies
-- « own » (`auth.uid() = user_id`). Ne PAS rejouer les `grant all ... to anon` de la baseline :
-- 20261001170000_anon_retrait_droits_herites.sql les a retirés.

drop table public.spreadsheets;

drop function public.update_spreadsheets_updated_at();
