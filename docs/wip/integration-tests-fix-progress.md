# Progression — fix de TOUS les tests d'intégration restants

> Branche `chore/local-supabase-baseline` (non pushée). Suite avant ce chantier : **204/302**.
> Décision produit (David) : **un seul prof sur le site** → les tests multi-profs sont obsolètes
> (skip/réécrire en mono-prof). Règle d'or : ne pas réaligner un test sans confirmer le code.
> Diagnostic isolé : `pnpm test:integration <fichier>`. Profs survivants : `docker exec
> supabase_db_ubumaths psql -U postgres -d postgres -tAc "select count(*) from profiles where role='teacher'"`.

## Fichiers à traiter (échecs au dernier run complet)
- [ ] vip-card-teacher-overrides (7) — **multi-profs obsolète**
- [ ] competence-referentiel (16)
- [ ] database/template-triggers (13)
- [ ] database/assignment-triggers (12)
- [ ] database/cleanup-triggers (9)
- [ ] database/updated-at-triggers (8)
- [ ] database/game-triggers (8) — FK monstre
- [ ] database/chat-triggers (5) — trigger last_message
- [ ] database/profile-triggers (4)
- [ ] skill-attempts-endpoint (2)
- [ ] database/vip-card-filters (2)
- [ ] database/sync-triggers (2)
- [ ] vip-card-rarity-distribution (1)
- [ ] vip-card-enabled-filtering (1)
- [ ] sections-crud (1)

## Journal
(en cours)
