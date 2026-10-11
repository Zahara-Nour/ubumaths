# Garde-fou fonctions SECURITY DEFINER (Q145) — progression

- [x] Test `tests/integration/garde-fonctions-security-definer.test.ts` + liste `tests/integration/fixtures/fonctions-definer-verifiees.ts` (183 entrées vérifiées).
- [x] Preuves rouges (fonction non listée, anon non prévu, entrée périmée, search_path sans pg_temp) puis retour au vert.
- [x] Local = prod (droits, search_path, md5 des corps), hors `rls_auto_enable` (event trigger, sorti du périmètre).
- [x] Lot 5 (`20261003230000_rpc_lot5_gardes_restantes.sql`) : 8 gardes + 16 REVOKE ; tests `rpc-lot5-gardes-restantes.test.ts` (rouges sans la migration) ; garde-fou VERT ; 36 suites voisines vertes.
- [ ] Après merge : `db:migrate` (aucun code ne change, ordre libre), puis relancer le garde-fou contre la prod (MCP) pour reconfirmer local = prod.
