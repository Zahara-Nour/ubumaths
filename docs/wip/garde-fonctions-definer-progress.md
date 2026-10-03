# Garde-fou fonctions SECURITY DEFINER (Q145) — progression

- [x] Test `tests/integration/garde-fonctions-security-definer.test.ts` + liste `tests/integration/fixtures/fonctions-definer-verifiees.ts` (183 entrées vérifiées).
- [x] Preuves rouges (fonction non listée, anon non prévu, entrée périmée, search_path sans pg_temp) puis retour au vert.
- [x] Local = prod (droits, search_path, md5 des corps), hors `rls_auto_enable` (event trigger, sorti du périmètre).
- [ ] **ROUGE volontaire** : 24 fonctions sans contrôle de l'appelant, en attente de décision de David (liste en tête du fichier de liste). Ne pas merger avant.
