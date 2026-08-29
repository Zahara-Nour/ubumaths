-- ==============================================================================
-- SEED — données de référence pour les tests d'intégration locaux
-- ==============================================================================
-- Contenu : 6 tables de contenu du schéma `public` + la configuration des
--   buckets de stockage. AUCUNE donnée personnelle.
--     math_competences · math_competence_subdimensions · observables
--     vip_card_templates · vip_card_config · game_monsters · storage.buckets
--
-- Pourquoi : le baseline de migrations est schéma-seul ; ces tables de contenu
--   sont requises par la suite d'intégration.
--
-- ⚠️ RÉGÉNÉRATION — lire avant de relancer un dump
--   La version du 2026-06-16 se voulait « non-PII » et l'annonçait dans cet
--   en-tête, mais `supabase db dump --linked --data-only` ne se limite pas aux
--   tables citées en commentaire : il a aussi vidé les schémas `auth` et
--   `storage`. Le fichier a donc contenu, dans un dépôt PUBLIC, 82 comptes
--   réels (noms, e-mails et photos d'élèves mineurs), 79 identités Google et
--   8 jetons de rafraîchissement. Nettoyé le 2026-08-29.
--
--   Ne jamais dumper un schéma entier vers ce fichier. Sélectionner les tables
--   une par une, puis VÉRIFIER avant de commiter :
--     grep -cE '@|auth\.|storage\."objects"' supabase/seed.sql   # doit valoir 0
--
-- Le dump active session_replication_role=replica (FK/triggers neutralisés).
-- ==============================================================================

SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict BD7mpx14Ic1KgpUho81pVKTFa45yFTNbjjm17MaELIF35uA2gw1cQnwvegvxVpf

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--







--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--







--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--





--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: game_monsters; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."game_monsters" ("id", "name", "element", "level", "category", "max_endurance", "attack_coefficient", "img_url", "img_head_url", "position", "spawned_by", "spawned_at", "is_dead", "defeated_by", "defeated_at", "created_at", "updated_at") VALUES
	('c920179d-9b11-4a9c-a921-22b7cbfc06ed', 'wind Monster', 'wind', 4, 'elite', 320, 1.3, 'monsters/wind_elite.png', 'monsters/wind_head.png', NULL, NULL, '2025-10-15 03:06:25.887+00', false, NULL, NULL, '2025-10-15 03:06:26.137146+00', '2025-10-15 03:06:26.137146+00'),
	('e2c10d37-9391-4c09-8944-6974b785405b', 'Cobra', 'fire', 4, 'common', 220, 1, 'cobra.png', 'cobra_tete.png', NULL, NULL, '2025-10-15 04:47:20.136+00', false, NULL, NULL, '2025-10-15 04:47:20.465597+00', '2025-10-15 04:47:20.465597+00'),
	('daba5b2f-70b9-4227-ac20-e4400207b075', 'Varan', 'water', 3, 'common', 190, 1, 'varan.png', 'varan_tete.png', NULL, NULL, '2025-10-16 05:12:23.017+00', false, NULL, NULL, '2025-10-16 05:12:23.403146+00', '2025-10-16 05:12:23.403146+00'),
	('3d666728-261a-47e1-8f43-77ff6d55946c', '🐛 Dard Mortel DEBUG', 'fire', 1, 'common', 1, 0.1, 'dard_mortel.png', 'dard_mortel_tete.png', NULL, NULL, '2025-10-17 04:08:02.24+00', false, NULL, NULL, '2025-10-17 04:08:02.735074+00', '2025-10-17 04:08:02.735074+00');


--
-- Data for Name: math_competences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."math_competences" ("id", "code", "name", "description", "gloss_for_student", "display_order", "created_at", "updated_at") VALUES
	('0109df21-a7f6-408b-834c-c8123d2d494c', 'chercher', 'Chercher', NULL, 'essayer des pistes, persévérer', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('efed9cb7-9e74-46cf-8347-c4ebae24974a', 'calculer', 'Calculer', NULL, 'calculer juste, vérifier', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('8fdbb87d-7490-4716-9a76-32c4892f9ebb', 'raisonner', 'Raisonner', NULL, 'justifier mes affirmations', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('27dff8c8-3f73-4aa7-9a8b-b67ce34a1772', 'communiquer', 'Communiquer', NULL, 'expliquer ma démarche', 4, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('d60b8a7b-aa8c-4ff4-947e-9517c740dfa7', 'modeliser', 'Modéliser', NULL, 'traduire en maths', 5, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('cdbda81e-c64c-4263-a1fa-db9615e17833', 'representer', 'Représenter', NULL, 'schémas, tableaux, figures', 6, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00');


--
-- Data for Name: math_competence_subdimensions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."math_competence_subdimensions" ("id", "math_competence_id", "letter", "name", "description", "display_order", "created_at", "updated_at") VALUES
	('ab0c7eb9-3efa-4524-9232-f4ef93799817', '0109df21-a7f6-408b-834c-c8123d2d494c', 'A', 'S''approprier le problème', NULL, 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('8bd06682-a7ea-4015-84db-cc317c61b714', '0109df21-a7f6-408b-834c-c8123d2d494c', 'B', 'S''engager et explorer', NULL, 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('cb7e2786-6486-46ab-b54f-43bb6f6763d7', '0109df21-a7f6-408b-834c-c8123d2d494c', 'C', 'Conduire et réorienter', NULL, 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('97ac5ebc-c646-41e3-be40-f6a0255a89ff', '0109df21-a7f6-408b-834c-c8123d2d494c', 'D', 'Mobiliser des ressources', NULL, 4, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('bc7f0d67-86ee-4ddf-8771-b0267bb4d47b', 'efed9cb7-9e74-46cf-8347-c4ebae24974a', 'A', 'Choisir une stratégie de calcul', NULL, 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('c3a8d121-22d1-4600-8c67-8d0bc3c04d78', 'efed9cb7-9e74-46cf-8347-c4ebae24974a', 'B', 'Exécuter le calcul', NULL, 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('a881fbd0-8ea9-4ed5-ad82-92ee5107cc5d', 'efed9cb7-9e74-46cf-8347-c4ebae24974a', 'C', 'Calculer avec des lettres', NULL, 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('585e1dc5-89d7-4392-b872-6f4b5555ebf1', 'efed9cb7-9e74-46cf-8347-c4ebae24974a', 'D', 'Contrôler le résultat', NULL, 4, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('5251fa36-5202-4b7c-b563-e7dc6fb59ce7', '8fdbb87d-7490-4716-9a76-32c4892f9ebb', 'A', 'Organiser', NULL, 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('8e40f4ae-1946-4253-854e-312938e4795f', '8fdbb87d-7490-4716-9a76-32c4892f9ebb', 'B', 'Justifier et démontrer', NULL, 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('ec138bac-3ecd-4098-a47b-9e872a3f1ee2', '8fdbb87d-7490-4716-9a76-32c4892f9ebb', 'C', 'Utiliser des outils logiques', NULL, 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('51d309a2-e695-4b78-a17e-500fc88e409f', '8fdbb87d-7490-4716-9a76-32c4892f9ebb', 'D', 'Valider et critiquer', NULL, 4, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('bd9c639b-df3c-4d14-86c3-8cb1903cd183', '27dff8c8-3f73-4aa7-9a8b-b67ce34a1772', 'A', 'Employer un langage mathématique correct', NULL, 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('5114362d-a5cb-4ffc-82f2-ea0f79d81af9', '27dff8c8-3f73-4aa7-9a8b-b67ce34a1772', 'B', 'Expliquer ma démarche', NULL, 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('6f5b2412-9767-455d-90d2-569e4e30a1be', '27dff8c8-3f73-4aa7-9a8b-b67ce34a1772', 'C', 'Comprendre et échanger', NULL, 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('9884909c-4298-4867-9053-05b472a87282', 'd60b8a7b-aa8c-4ff4-947e-9517c740dfa7', 'A', 'Mathématiser la situation', NULL, 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('15f35847-9d47-415a-90b7-a642b1968b28', 'd60b8a7b-aa8c-4ff4-947e-9517c740dfa7', 'B', 'Revenir à la situation réelle', NULL, 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('52560511-304d-4611-ba6a-5ec740598531', 'd60b8a7b-aa8c-4ff4-947e-9517c740dfa7', 'C', 'Valider et ajuster le modèle', NULL, 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('e716c738-5041-4a5f-9ebe-50d2eeaceb5f', 'cdbda81e-c64c-4263-a1fa-db9615e17833', 'A', 'Lire et interpréter', NULL, 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('81ce152d-04c0-48b5-b595-4ac0f2e9543d', 'cdbda81e-c64c-4263-a1fa-db9615e17833', 'B', 'Produire une représentation', NULL, 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('a847ebf7-a945-4dc5-aa47-c1808e96e10c', 'cdbda81e-c64c-4263-a1fa-db9615e17833', 'C', 'Convertir et mettre en relation', NULL, 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('cd4cba7f-e920-4dfd-bf38-46beb1e7c2fc', 'cdbda81e-c64c-4263-a1fa-db9615e17833', 'D', 'Choisir et exploiter', NULL, 4, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00');


--
-- Data for Name: observables; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."observables" ("id", "subdimension_id", "observable_code", "name", "teacher_grid_text", "display_order", "created_at", "updated_at") VALUES
	('30640a49-0060-45f3-9fcb-2a3ff76a5372', 'ab0c7eb9-3efa-4524-9232-f4ef93799817', 'A1', 'Je reformule ce qui est demandé.', 'Reformule la question avec ses propres mots, sans recopier l''énoncé.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('59e0f68c-d491-4061-bb0c-9e09ac90dc9d', 'ab0c7eb9-3efa-4524-9232-f4ef93799817', 'A2', 'Je trie les informations utiles.', 'Distingue les informations utiles des données inutiles ou distractrices.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('a7f58f48-d4ce-4eca-81b9-65a788a498c2', 'ab0c7eb9-3efa-4524-9232-f4ef93799817', 'A3', 'Je produis une représentation pour comprendre.', 'Construit une représentation (schéma, figure, tableau) pour clarifier la situation.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('add552ab-ec5b-4456-8532-943c82548614', '8bd06682-a7ea-4015-84db-cc317c61b714', 'B1', 'Je produis un premier essai sans aide.', 'Produit une première tentative personnelle avant toute demande de méthode.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('b25779b7-9cac-46c2-9dcb-6843039b56be', '8bd06682-a7ea-4015-84db-cc317c61b714', 'B2', 'J''essaie sur des cas simples.', 'Explore en traitant des cas particuliers ou simplifiés.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('503be9a3-f1e2-4941-86b5-93d289e84497', '8bd06682-a7ea-4015-84db-cc317c61b714', 'B3', 'J''émets une conjecture.', 'Formule une hypothèse ou une affirmation à vérifier.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('2a34314a-4800-4030-b84c-7f214300f605', '8bd06682-a7ea-4015-84db-cc317c61b714', 'B4', 'J''expérimente pour produire des données.', 'Manipule, calcule ou teste pour produire des données exploitables.', 4, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('956d546e-553f-4e58-a7b9-9290868795aa', '8bd06682-a7ea-4015-84db-cc317c61b714', 'B5', 'Je détecte des invariants ou des régularités.', 'Repère une régularité, un motif ou une propriété qui se répète.', 5, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('4c61acba-9092-4baf-ad7c-40068573127d', 'cb7e2786-6486-46ab-b54f-43bb6f6763d7', 'C1', 'J''organise ma démarche, par exemple en la découpant en étapes ou en sous-problèmes.', 'Structure sa recherche de façon visible (étapes ordonnées, sous-problèmes), plutôt que d''accumuler des essais épars.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('9d987f17-a5ef-4f33-ae7a-8489fde1ffb6', 'cb7e2786-6486-46ab-b54f-43bb6f6763d7', 'C2', 'Je teste une autre piste quand je suis bloqué.', 'Face à un blocage, abandonne la voie en cours et engage une autre piste, plutôt que de rester figé.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('595ba2ad-52b1-447a-b931-9a668fbdeff8', '97ac5ebc-c646-41e3-be40-f6a0255a89ff', 'D1', 'Je mobilise une connaissance utile (une propriété, une définition, un résultat déjà appris).', 'Convoque à bon escient une connaissance ponctuelle (propriété, définition, résultat).', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('22db8110-3b4a-465d-aaa1-dee7df6ecef1', '97ac5ebc-c646-41e3-be40-f6a0255a89ff', 'D2', 'Je mobilise un outil adapté (instrument, logiciel, technique, représentation).', 'Met en œuvre un outil adapté (instrument, logiciel, technique, représentation).', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('faa7dc5b-9469-4ec1-b1a8-0b1f5dcd555f', '97ac5ebc-c646-41e3-be40-f6a0255a89ff', 'D3', 'Je rapproche ce problème d''un problème déjà rencontré.', 'Reconnaît que la situation entière est analogue à un problème antérieur.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('580d8325-8dd8-495c-8b38-d9bc0f02268d', 'bc7f0d67-86ee-4ddf-8771-b0267bb4d47b', 'A1', 'Je choisis un mode de calcul adapté (mental, posé, calculatrice, tableur).', 'Choisit un mode de calcul adapté à la situation (mental, posé, instrumenté) plutôt qu''un mode imposé par habitude.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('4b8d0d8a-503c-4e00-bd33-380a25462cd9', 'bc7f0d67-86ee-4ddf-8771-b0267bb4d47b', 'A2', 'Je décide si un résultat exact ou approché est nécessaire.', 'Juge si la situation appelle un résultat exact ou une valeur approchée, et tranche en conséquence.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('e3b52106-82fc-4fcd-bee9-e9d7eab4704f', 'bc7f0d67-86ee-4ddf-8771-b0267bb4d47b', 'A3', 'J''organise un calcul en plusieurs étapes.', 'Décompose un calcul complexe en étapes ordonnées, avec des résultats intermédiaires.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('cfefd2a0-b7fb-4a50-9a97-004415ac432e', 'c3a8d121-22d1-4600-8c67-8d0bc3c04d78', 'B1', 'Je calcule de tête de façon sûre.', 'Effectue un calcul mental fiable sur les nombres en jeu.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('ed3aeede-41ad-441e-bb11-78dda72a9c96', 'c3a8d121-22d1-4600-8c67-8d0bc3c04d78', 'B2', 'Je pose et j''effectue une opération correctement.', 'Pose et exécute une opération écrite sans erreur de technique.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('f198aecb-a9de-4653-89ae-a67ba59b74a8', 'c3a8d121-22d1-4600-8c67-8d0bc3c04d78', 'B3', 'J''utilise la calculatrice ou le tableur pour écrire un calcul et lire le résultat.', 'Écrit un calcul à la calculatrice ou au tableur, en lit le résultat, et y recourt à bon escient.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('2ac66434-54aa-40a2-b924-1930ef23cf74', 'c3a8d121-22d1-4600-8c67-8d0bc3c04d78', 'B4', 'J''applique une procédure ou un algorithme connu.', 'Met en œuvre une procédure ou un algorithme connu (conversion, formule, suite d''opérations).', 4, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('ef46a6bd-333d-4bab-9aab-28405d79c954', 'c3a8d121-22d1-4600-8c67-8d0bc3c04d78', 'B5', 'Je mène mes calculs en gérant correctement les unités (conversions, cohérence).', 'Gère les unités au cours du calcul : convertit, suit la cohérence dimensionnelle, n''additionne pas des grandeurs hétérogènes.', 5, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('dfc4b994-ce26-44d9-98d0-468dbdbd7d67', 'a881fbd0-8ea9-4ed5-ad82-92ee5107cc5d', 'C1', 'Je calcule la valeur d''une expression en remplaçant les lettres.', 'Substitue des valeurs aux lettres et calcule l''expression numérique obtenue.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('9dc1fa7d-06bb-4ca7-9665-e8e85ef606a9', 'a881fbd0-8ea9-4ed5-ad82-92ee5107cc5d', 'C2', 'Je transforme une expression littérale (développer, factoriser, réduire).', 'Transforme une expression littérale (développe, factorise, réduit) sans erreur.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('fcfc0873-a72a-480b-83a8-36c7452eb9c5', 'a881fbd0-8ea9-4ed5-ad82-92ee5107cc5d', 'C3', 'Je calcule avec des lettres pour établir une expression générale.', 'Conduit un calcul littéral pour produire une expression ou une formule générale.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('ec04a8cb-727a-4a5b-811f-3467357e1daf', '585e1dc5-89d7-4392-b872-6f4b5555ebf1', 'D1', 'Je vérifie que mon résultat est plausible (ordre de grandeur, signe, unité).', 'Apprécie la plausibilité du résultat : ordre de grandeur, signe, unité, taille attendue.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('e3ad8c9f-5f2c-4158-89c6-4f285f9fd14b', '585e1dc5-89d7-4392-b872-6f4b5555ebf1', 'D2', 'Je contrôle mon résultat par un autre moyen (opération inverse, second calcul).', 'Vérifie par un moyen indépendant (opération inverse, autre méthode, second calcul).', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('812c84b3-71d4-4672-ad35-33036ebfc74e', '5251fa36-5202-4b7c-b563-e7dc6fb59ce7', 'A1', 'J''organise mon raisonnement en étapes enchaînées dans un ordre logique.', 'Enchaîne les étapes de son raisonnement dans un ordre où chacune prépare logiquement la suivante.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('4714cf11-43d4-4dd6-be2d-d40b1d0960f3', '8e40f4ae-1946-4253-854e-312938e4795f', 'B1', 'Je justifie mes affirmations en m''appuyant sur des résultats connus.', 'Fonde chaque affirmation sur un résultat établi (propriété, théorème, définition, donnée), et en tire la conséquence.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('f7f74f6c-2700-4707-a668-744a1e72a457', '8e40f4ae-1946-4253-854e-312938e4795f', 'B2', 'Je raisonne sur le cas général, pas seulement sur des exemples.', 'Conduit son raisonnement sur un objet ou un cas général, sans se limiter à la vérification sur des exemples.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('ede6738f-4d01-4279-9d4a-72666c3a109b', 'ec138bac-3ecd-4098-a47b-9e872a3f1ee2', 'C1', 'Je trouve un contre-exemple pour montrer qu''une affirmation est fausse.', 'Produit un contre-exemple pertinent pour réfuter une affirmation.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('b4ac8903-c20d-474b-a639-e5ff61473cea', 'ec138bac-3ecd-4098-a47b-9e872a3f1ee2', 'C2', 'J''utilise les outils de la logique : disjonction de cas, « si… alors », contraposée, raisonnement par l''absurde.', 'Mobilise un mode de raisonnement logique : disjonction de cas, implication « si… alors », contraposée, raisonnement par l''absurde.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('f9aeb8d6-32f3-4b01-9634-03add028e214', 'ec138bac-3ecd-4098-a47b-9e872a3f1ee2', 'C3', 'Je distingue une propriété de sa réciproque, et je ne confonds pas les deux sens d''une implication.', 'Distingue une propriété de sa réciproque ; n''infère pas l''une de l''autre sans justification.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('5a236a90-2688-40b8-8f15-33ef9d7d478c', '51d309a2-e695-4b78-a17e-500fc88e409f', 'D1', 'Je distingue ce qui est démontré de ce qui est seulement vérifié sur des exemples.', 'Distingue une vérification empirique (sur des exemples) d''une démonstration (valable en général).', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('5cfb0ecb-51d9-4939-9852-8bb848af5218', '51d309a2-e695-4b78-a17e-500fc88e409f', 'D2', 'Je relis un raisonnement d''un œil critique pour repérer et corriger les erreurs.', 'Relit un raisonnement — le sien ou celui d''autrui — pour y détecter et corriger une erreur ou une faille.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('cdbfdbbc-54e0-4109-8ad8-0b6427a25d96', 'bd9c639b-df3c-4d14-86c3-8cb1903cd183', 'A1', 'J''emploie le vocabulaire mathématique précis.', 'Emploie le vocabulaire mathématique exact et à propos (et non un terme approximatif ou courant).', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('4d1f7bb7-ad17-42d5-a653-aeb61d1ea070', 'bd9c639b-df3c-4d14-86c3-8cb1903cd183', 'A2', 'J''utilise correctement les symboles et les notations.', 'Écrit symboles et notations correctement (signes, parenthèses, égalités, unités).', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('9e44218e-0df0-44e4-b41b-cb729e2b2cd3', '5114362d-a5cb-4ffc-82f2-ea0f79d81af9', 'B1', 'J''explique ma démarche ou mon résultat par écrit, de façon claire et structurée.', 'Rédige une explication claire et structurée de sa démarche ou de son résultat, compréhensible sans commentaire oral.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('249e1196-fba3-496b-b1e4-6bf9675c6036', '5114362d-a5cb-4ffc-82f2-ea0f79d81af9', 'B2', 'J''explique ma démarche à l''oral, de façon claire et structurée.', 'Expose oralement sa démarche de façon claire, structurée et audible.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('a8d1d9f1-4ad0-4cbf-816c-4686b2ec0e81', '6f5b2412-9767-455d-90d2-569e4e30a1be', 'C1', 'Je reformule ou je questionne pour clarifier.', 'Reformule ce qu''il a compris, ou pose une question pertinente pour lever une ambiguïté.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('6f0abecf-4b27-4034-8b95-abcf5fdbd58d', '6f5b2412-9767-455d-90d2-569e4e30a1be', 'C2', 'J''argumente dans l''échange : je défends mon point et je réponds aux objections.', 'Argumente dans l''échange : défend sa position, prend en compte et répond aux objections.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('c95a181a-276f-48cd-ba09-d7be982c80c9', '9884909c-4298-4867-9053-05b472a87282', 'A1', 'Je tente de traduire la situation en mathématiques.', 'Amorce un traitement mathématique de la situation : quantifie, esquisse une mise en équation ou un schéma, même imparfait ou inadapté.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('04da35be-607f-444f-8e41-bbcd87e7d46a', '9884909c-4298-4867-9053-05b472a87282', 'A2', 'J''identifie les grandeurs et les relations utiles, et je néglige ce qui ne l''est pas.', 'Sélectionne les grandeurs et relations pertinentes, écarte le superflu, pose au besoin des hypothèses simplificatrices.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('762af479-5eda-4409-9f9f-f9d32ece0734', '9884909c-4298-4867-9053-05b472a87282', 'A3', 'Je construis un modèle mathématique fidèle à la situation.', 'Aboutit à un modèle mathématique fidèle à la situation : les grandeurs et les relations du réel y sont correctement rendues (équation, fonction, configuration, modèle probabiliste...).', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('6ecbda13-5a53-466c-9ffb-6c1958557173', '15f35847-9d47-415a-90b7-a642b1968b28', 'B1', 'J''interprète le résultat mathématique dans le contexte de la situation.', 'Réexprime le résultat mathématique dans les termes de la situation réelle (et non comme un nombre nu).', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('ed8b4741-5247-4a1e-bba8-6f712f03da9d', '15f35847-9d47-415a-90b7-a642b1968b28', 'B2', 'Je vérifie que ma réponse est vraisemblable dans la situation.', 'Apprécie la plausibilité concrète du résultat (ordre de grandeur, sens physique, cohérence avec la situation).', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('b1f922a1-5e79-4afa-a899-ecfbcdd238e1', '52560511-304d-4611-ba6a-5ec740598531', 'C1', 'Je confronte le modèle à la réalité et je le valide ou je l''invalide.', 'Confronte le modèle aux faits et juge s''il convient : le valide ou l''invalide.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('03c63034-066c-40cf-abbc-196d06f09adc', '52560511-304d-4611-ba6a-5ec740598531', 'C2', 'J''identifie les hypothèses et les limites du modèle.', 'Explicite les hypothèses retenues et les limites du modèle (domaine de validité, simplifications).', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('f63cdf70-91c6-49b7-ac57-1075e00c1a95', '52560511-304d-4611-ba6a-5ec740598531', 'C3', 'J''ajuste le modèle ou j''en propose un meilleur.', 'Corrige le modèle, l''affine ou en propose un plus pertinent.', 3, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('6427453c-cfc7-41ae-a24a-4dc6fc584264', 'e716c738-5041-4a5f-9ebe-50d2eeaceb5f', 'A1', 'Je lis une représentation pour en extraire une information.', 'Extrait une information exacte d''une représentation donnée (graphique, tableau, figure, écriture).', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('f3ad55ad-2f05-4fd7-91a8-55d42bb55fe8', 'e716c738-5041-4a5f-9ebe-50d2eeaceb5f', 'A2', 'J''interprète une représentation : je comprends ce qu''elle décrit, au-delà de la lecture brute.', 'Dégage la signification de la représentation — ce qu''elle décrit, sa tendance, sa structure — au-delà de la valeur lue.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('a3dde6c3-2502-45ec-b63a-b0e2019b1396', '81ce152d-04c0-48b5-b595-4ac0f2e9543d', 'B1', 'Ma représentation est correcte sur la forme (codages, en-têtes, échelle, perspective…).', 'Produit une représentation correcte sur la forme : codages sur figure, en-têtes et unités d''un tableau, axes / échelle / légende d''un graphique, règles de perspective.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('924f8c24-fac9-43c3-94a7-144cb97c1a59', '81ce152d-04c0-48b5-b595-4ac0f2e9543d', 'B2', 'Ma représentation est fidèle à l''objet ou aux données représentés.', 'Produit une représentation fidèle à l''objet ou aux données : ce qui est représenté correspond à ce qui devait l''être.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('ce6cbda0-7158-42cc-9625-8d7d3258f104', 'a847ebf7-a945-4dc5-aa47-c1808e96e10c', 'C1', 'Je passe d''une représentation à une autre du même objet.', 'Convertit une représentation en une autre du même objet, sans en altérer le sens (formule ↔ courbe, tableau ↔ graphique, figure ↔ coordonnées...).', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('4c599563-9e5d-4b68-80ae-b41b96e894da', 'a847ebf7-a945-4dc5-aa47-c1808e96e10c', 'C2', 'Je mets en relation plusieurs représentations du même objet et je contrôle qu''elles s''accordent.', 'Fait correspondre plusieurs représentations du même objet et vérifie leur cohérence mutuelle.', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('450952b1-867c-4c41-88f2-fcc5dcf5b136', 'cd4cba7f-e920-4dfd-bf38-46beb1e7c2fc', 'D1', 'Je choisis la représentation la plus adaptée, au besoin en en comparant plusieurs.', 'Choisit la représentation qui rend le problème le plus traitable, le cas échéant après en avoir comparé plusieurs.', 1, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00'),
	('0c234cb8-4b96-4e36-bc11-64dd41b36b54', 'cd4cba7f-e920-4dfd-bf38-46beb1e7c2fc', 'D2', 'Je m''appuie sur une représentation pour faire avancer mon travail (recherche, calcul).', 'Mobilise une représentation comme appui pour progresser (orienter une recherche, conduire un calcul).', 2, '2026-06-09 08:26:43.917936+00', '2026-06-09 08:26:43.917936+00');


--
-- Data for Name: vip_card_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."vip_card_config" ("id", "config_name", "common_probability", "rare_probability", "epic_probability", "legendary_probability", "is_active", "description", "valid_from", "valid_until", "created_at", "updated_at") VALUES
	('da4279a9-3ae7-49fd-9f58-ccb0ce4af9e5', 'default', 60, 25, 12, 3, true, 'Default rarity distribution for normal gameplay', NULL, NULL, '2025-11-04 09:23:30.113803+00', '2025-11-04 09:23:30.113803+00');


--
-- Data for Name: vip_card_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."vip_card_templates" ("id", "name", "description", "image_path", "category", "rarity", "is_enabled", "action", "sort_order", "created_at", "updated_at", "base_price", "is_purchasable", "max_owned_per_student", "uses_total", "sell_price") VALUES
	('mathemo-letter', 'Lettre Bonus', 'Revele une lettre aleatoire du mot a trouver dans Mathemo. Utilisable 1 fois par partie.', '/images/vip-cards/mathemo-letter.webp', 'power', 'rare', true, '{"type": "hint", "context": "mathemo"}', 300, '2026-04-19 12:05:15.711604+00', '2026-04-19 12:05:15.711604+00', 5, true, 5, 1, NULL),
	('mathemo-undo', 'Retour en Arriere', 'Annule le dernier essai soumis dans Mathemo et recupere la tentative. Utilisable 1 fois par partie.', '/images/vip-cards/mathemo-undo.webp', 'power', 'rare', true, '{"type": "undo", "context": "mathemo"}', 310, '2026-04-19 12:05:15.711604+00', '2026-04-19 12:05:15.711604+00', 5, true, 5, 1, NULL),
	('mathemo-vowels', 'Voyelles Revelees', 'Revele 2 voyelles aleatoires du mot a trouver dans Mathemo. Utilisable 1 fois par partie.', '/images/vip-cards/mathemo-vowels.webp', 'power', 'epic', true, '{"type": "reveal_vowels", "context": "mathemo"}', 320, '2026-04-19 12:05:15.711604+00', '2026-04-19 12:05:15.711604+00', 8, true, 3, 1, NULL),
	('mathemo-multiplier', 'Multiplicateur x1.5', 'Multiplie par 1.5 le score de la partie de Mathemo. Utilisable 1 fois par partie.', '/images/vip-cards/mathemo-multiplier.webp', 'power', 'epic', true, '{"type": "multiplier", "factor": 1.5, "context": "mathemo"}', 330, '2026-04-19 12:05:15.711604+00', '2026-04-19 12:05:15.711604+00', 15, true, 3, 1, NULL),
	('bougeotte', 'Bougeotte', 'Choisis ta place pour un cours', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/bougeotte@0.5x.webp', 'privilege', 'common', true, NULL, 30, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, NULL, 1),
	('candy', 'Candy', '', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/candy@0.5x.webp', 'privilege', 'common', false, NULL, 70, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, NULL, 1),
	('lalalalala', 'Lalalalala', 'Choisis une chanson pour l''entrée ou la sortie en classe', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/lalalalala@0.5x.webp', 'privilege', 'common', true, NULL, 150, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, NULL, 1),
	('batman', 'Batman and Robin', 'Deviens le super-assistant du prof', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/batman@0.5x.webp', 'power', 'common', true, NULL, 260, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, NULL, 1),
	('fame', 'Voltaire''s got talent', 'C''est ton heure de gloire', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/fame@0.5x.webp', 'social', 'common', true, NULL, 230, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, NULL, 1),
	('mathemagie', 'Mathémagie', 'Deviens l''assistant de Daoudini', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/mathemagie@0.5x.webp', 'power', 'common', true, NULL, 170, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 10, true, 5, NULL, 1),
	('fortune', 'Roue de la Fortune', 'Remplace tes cartes VIP par des nouvelles', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/fortune@0.5x.webp', 'power', 'legendary', true, '{"type": "exchange_cards", "exchange": {"mode": "replace_random", "maxCount": 20}}', 310, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 20, true, 5, NULL, 15),
	('2048-bomb', 'Bombe (1)', 'Supprime une tuile de valeur 2 ou 4 dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-bomb@0.5x.webp', 'power', 'common', true, '{"type": "bomb", "context": "2048", "max_target_value": 4}', 210, '2026-04-15 17:19:38.586624+00', '2026-06-14 20:20:06.293512+00', 3, true, 5, 1, NULL),
	('2048-freeze-spawn', 'Gel de Spawn', 'Le prochain coup ne genere pas de nouvelle tuile dans le 2048. Utilisable 2 fois par partie.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-freeze-spawn@0.5x.webp', 'power', 'common', true, '{"type": "freeze_spawn", "context": "2048"}', 220, '2026-04-15 17:19:38.586624+00', '2026-06-14 20:20:06.293512+00', 3, true, 5, 1, NULL),
	('2048-undo', 'Retour en Arriere', 'Annule le dernier coup dans le 2048. Utilisable 2 fois par partie.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-undo@0.5x.webp', 'power', 'rare', true, '{"type": "undo", "context": "2048"}', 200, '2026-04-15 17:19:38.586624+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, 1, NULL),
	('minesweeper-hint', 'Indice Demineur (1)', 'Revele une case sure dans le Demineur sans penalite. Utilisable une fois par carte.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-hint@0.5x.webp', 'power', 'common', true, '{"type": "hint", "context": "minesweeper"}', 0, '2026-01-03 08:37:28.450592+00', '2026-06-14 20:20:06.293512+00', 3, true, 5, 1, 1),
	('captain', 'Capitaine', 'Devient capitaine d''équipe pour un projet', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/captain@0.5x.webp', 'social', 'common', false, NULL, 80, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, NULL, 1),
	('minesweeper-hint-2', 'Indice Demineur (2)', 'Revele une case sure dans le Demineur sans penalite. Utilisable deux fois par carte.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-hint-2@0.5x.webp', 'power', 'rare', true, '{"type": "hint", "context": "minesweeper"}', 0, '2026-03-02 18:14:28.258636+00', '2026-06-14 20:20:06.293512+00', 5, true, 5, 2, 3),
	('minesweeper-undo', 'Seconde Chance', 'Annule un coup fatal dans le Démineur. Utilisable une seule fois par partie.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-undo@0.5x.webp', 'power', 'rare', true, '{"type": "undo", "context": "minesweeper"}', 20, '2026-03-02 07:00:04.083392+00', '2026-06-14 20:20:06.293512+00', 8, true, 10, 1, 3),
	('minesweeper-detector', 'Détecteur (1)', 'Détecte une mine et pose un drapeau dessus. Pénalité réduite.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-detector@0.5x.webp', 'power', 'rare', true, '{"type": "detector", "context": "minesweeper"}', 0, '2026-04-03 09:14:17.436839+00', '2026-06-14 20:20:06.293512+00', 8, true, 5, 1, 3),
	('minesweeper-detector-2', 'Détecteur (2)', 'Détecte une mine et pose un drapeau dessus. 2 utilisations. Pénalité réduite.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-detector-2@0.5x.webp', 'power', 'epic', true, '{"type": "detector", "context": "minesweeper"}', 0, '2026-04-03 09:14:17.436839+00', '2026-06-14 20:20:06.293512+00', 12, true, 5, 2, 8),
	('2048-bomb-2', 'Bombe (2)', 'Supprime une tuile de valeur 16 ou moins dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-bomb-2@0.5x.webp', 'power', 'rare', true, '{"type": "bomb", "context": "2048", "max_target_value": 16}', 211, '2026-04-15 17:19:38.586624+00', '2026-06-14 20:20:06.293512+00', 8, true, 5, 1, NULL),
	('2048-bomb-3', 'Bombe (3)', 'Supprime une tuile de valeur 64 ou moins dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-bomb-3@0.5x.webp', 'power', 'epic', false, '{"type": "bomb", "context": "2048", "max_target_value": 64}', 212, '2026-04-15 17:19:38.586624+00', '2026-06-14 20:20:06.293512+00', 15, true, 5, 1, NULL),
	('tranquilou', 'Tranquilou', 'Tu es excusé d''avoir "oublié" de faire tes devoirs', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/tranquilou@0.5x.webp', 'privilege', 'common', true, NULL, 140, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 10, true, 5, NULL, 1),
	('throne', 'Game of throne', 'Prends le fauteuil du prof', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/throne@0.5x.webp', 'privilege', 'rare', true, NULL, 220, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 12, true, 5, NULL, 3),
	('soldes', 'Soldes', 'Pioche 2 nouvelles cartes VIP', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/soldes@0.5x.webp', 'bonus', 'rare', true, '{"type": "draw_cards", "count": 2}', 50, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 25, true, 5, NULL, 3),
	('bonus', 'Bonus', '+1 sur un devoir au choixxxx', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/bonus@0.5x.webp', 'bonus', 'rare', true, NULL, 10, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 10, true, 5, NULL, 3),
	('memoire', 'Trou de mémoire', 'Utilise tes cahiers pendant l''évaluation', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/memoire@0.5x.webp', 'power', 'rare', true, NULL, 240, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 10, true, 5, NULL, 3),
	('minesweeper-freeze', 'Gel Temporaire', 'Gele le timer du Demineur pendant 60 secondes. Utilisable une seule fois par partie.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-freeze@0.5x.webp', 'power', 'rare', true, '{"type": "freeze_timer", "context": "minesweeper", "duration": 60}', 21, '2026-03-06 20:28:29.288669+00', '2026-06-14 20:20:06.293512+00', 12, true, 5, 1, 3),
	('super-bougeotte', 'Super Bougeotte', 'Choisis ta place pendant une semaine', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/super-bougeotte@0.5x.webp', 'privilege', 'rare', true, NULL, 130, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 15, true, 5, NULL, 3),
	('help', 'Help !', 'Fais toi aider par ton professeur pendant l''évaluation', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/help@0.5x.webp', 'power', 'rare', true, NULL, 160, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 15, true, 5, NULL, 3),
	('team', 'My team', 'Choisis ton groupe pour un travail de groupe', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/team@0.5x.webp', 'social', 'rare', false, NULL, 210, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 15, true, 5, NULL, 3),
	('ecrabouilleur', 'Écrabouilleur', 'Enlève un avertissement', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/ecrabouilleur@0.5x.webp', 'power', 'rare', true, '{"type": "remove_warnings", "count": 1}', 180, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 15, true, 5, NULL, 3),
	('super-soldes', 'Super Soldes', 'Pioche 3 nouvelles cartes VIP', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/super-soldes@0.5x.webp', 'bonus', 'epic', true, '{"type": "draw_cards", "count": 3}', 60, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 40, true, 5, NULL, 8),
	('minesweeper-hint-3', 'Indice Demineur (3)', 'Revele une case sure dans le Demineur sans penalite. Utilisable trois par carte.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-hint-3@0.5x.webp', 'power', 'epic', true, '{"type": "hint", "context": "minesweeper"}', 0, '2026-03-02 18:18:31.745306+00', '2026-06-14 20:20:06.293512+00', 6, true, 5, 3, 8),
	('minesweeper-chronostase', 'Chronostase', 'Gele le timer du Demineur pendant 2 minutes. Utilisable une seule fois par partie.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/minesweeper-chronostase@0.5x.webp', 'power', 'epic', true, '{"type": "freeze_timer", "context": "minesweeper", "duration": 120}', 22, '2026-03-06 20:43:40.637568+00', '2026-06-14 20:20:06.293512+00', 25, true, 5, 1, 8),
	('jeu', 'Jeu', 'Choisis le jeu mathématique (avec des avantages !)', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/jeu@0.5x.webp', 'privilege', 'epic', true, NULL, 40, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 30, true, 5, NULL, 8),
	('super-bonus', 'Super Bonus', '+2 sur un devoir au choix', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/super-bonus@0.5x.webp', 'bonus', 'epic', true, NULL, 110, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 30, true, 5, NULL, 8),
	('alchimie', 'Alchimie', 'Transforme 3 cartes VIP en une carte Bonus', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/alchimie@0.5x.webp', 'power', 'epic', true, '{"type": "exchange_cards", "exchange": {"mode": "discard_for_specific", "discardCount": 3, "targetCardId": "bonus"}}', 250, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 10, true, 5, NULL, 8),
	('inventeur', 'Inventeur', 'Propose une nouvelle carte VIP', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/inventeur@0.5x.webp', 'power', 'legendary', true, NULL, 190, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 40, true, 5, NULL, 15),
	('coup-double', 'Coup Double', 'Choisis une évaluation qui comptera 2 fois dans ta moyenne ce trimestre.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/coup-double@0.5x.webp', 'bonus', 'legendary', true, NULL, 120, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 50, true, 5, NULL, 15),
	('mega-bonus', 'Méga Bonus', '+3 points bonus sur un devoir au choix', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/mega-bonus@0.5x.webp', 'bonus', 'legendary', true, NULL, 210, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 60, true, 5, NULL, 15),
	('mega-soldes', 'Méga Soldes', 'Pioche 4 nouvelles cartes VIP', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/mega-soldes@0.5x.webp', 'bonus', 'legendary', true, '{"type": "draw_cards", "count": 4}', 200, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 50, true, 5, NULL, 15),
	('choix', 'Libre choix', 'Choisis ta place en classe pour une semaine', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/choix@0.5x.webp', 'privilege', 'legendary', true, '{"type": "choose_card", "count": 1}', 20, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 80, true, 5, NULL, 15),
	('Sheikh', 'Sheikh - Sheikha', 'Prends le fauteuil du professeur, bois un karak, et fais toi appeler Sheikh ou Sheikha par ton professeur', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/Sheikh@0.5x.webp', 'power', 'legendary', true, '{"type": "add_gidouilles", "amount": 50}', 320, '2025-11-04 09:23:30.113803+00', '2026-06-14 20:20:06.293512+00', 120, false, 5, NULL, 15),
	('2048-vision', 'Vision', 'Affiche la position et valeur du prochain spawn pendant 3 coups dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-vision@0.5x.webp', 'power', 'common', true, '{"type": "vision", "context": "2048", "duration": 3}', 250, '2026-04-15 17:45:50.340838+00', '2026-06-14 20:20:06.293512+00', 3, true, 5, 1, NULL),
	('2048-joker', 'Joker', 'Change la valeur d''une tuile pour matcher son plus grand voisin dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-joker@0.5x.webp', 'power', 'rare', true, '{"type": "joker", "context": "2048"}', 240, '2026-04-15 17:45:50.340838+00', '2026-06-14 20:20:06.293512+00', 10, true, 3, 1, NULL),
	('2048-merge', 'Fusion Forcee', 'Fusionne 2 tuiles identiques adjacentes sans mouvement global dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-merge@0.5x.webp', 'power', 'epic', true, '{"type": "fusion", "context": "2048"}', 230, '2026-04-15 17:45:50.340838+00', '2026-06-14 20:20:06.293512+00', 15, true, 3, 1, NULL),
	('2048-multiplier', 'Multiplicateur x1.5', 'Chaque fusion rapporte x1.5 points pour le reste de la partie dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-multiplier@0.5x.webp', 'power', 'epic', true, '{"type": "multiplier", "factor": 1.5, "context": "2048"}', 260, '2026-04-15 17:45:50.340838+00', '2026-06-14 20:20:06.293512+00', 20, true, 3, 1, NULL),
	('2048-multiplier-2', 'Multiplicateur x2', 'Chaque fusion rapporte x2 points pour le reste de la partie dans le 2048.', 'https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/2048-multiplier-2@0.5x.webp', 'power', 'legendary', true, '{"type": "multiplier", "factor": 2, "context": "2048"}', 261, '2026-04-15 17:45:50.340838+00', '2026-06-14 20:20:06.293512+00', 40, true, 3, 1, NULL);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('chat-attachments', 'chat-attachments', NULL, '2025-10-14 21:17:54.061284+00', '2025-10-14 21:17:54.061284+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('exercise-images', 'exercise-images', NULL, '2025-10-26 10:22:11.202631+00', '2025-10-26 10:22:11.202631+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('vip-card-images', 'vip-card-images', NULL, '2025-11-04 12:50:45.05456+00', '2025-11-04 12:50:45.05456+00', true, false, 5242880, '{image/jpeg,image/png,image/webp,image/gif,image/svg+xml}', NULL, 'STANDARD'),
	('question-images', 'question-images', NULL, '2025-11-27 06:44:27.522315+00', '2025-11-27 06:44:27.522315+00', true, false, 5242880, NULL, NULL, 'STANDARD'),
	('chapter-documents', 'chapter-documents', NULL, '2025-12-09 21:52:46.666937+00', '2025-12-09 21:52:46.666937+00', false, false, 10485760, '{application/pdf,image/png,image/jpeg,image/jpg,image/gif}', NULL, 'STANDARD'),
	('parody-evaluations', 'parody-evaluations', NULL, '2026-05-23 23:25:16.178047+00', '2026-05-23 23:25:16.178047+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('bug-report-screenshots', 'bug-report-screenshots', NULL, '2025-12-29 13:53:45.851184+00', '2025-12-29 13:53:45.851184+00', false, false, 5242880, '{image/jpeg,image/png,image/gif,image/webp}', NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--





--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--





--
-- Name: riddles_riddle_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."riddles_riddle_number_seq"', 5, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict BD7mpx14Ic1KgpUho81pVKTFa45yFTNbjjm17MaELIF35uA2gw1cQnwvegvxVpf

RESET ALL;
