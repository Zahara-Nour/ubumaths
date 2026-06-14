# tests/

Tests qui **ne peuvent pas être co-localisés** dans `src/` : ils ont besoin d'une
vraie base Supabase, ou ils fournissent de l'infra partagée à d'autres tests.

> **Architecture complète & règles** : [docs/ref/tests/architecture.md](../docs/ref/tests/architecture.md)
>
> Les tests **unitaires** vivent à côté de leur code dans `src/**/__tests__/`
> (et `scripts/**/__tests__/`), pas ici.

## Contenu

```
tests/
├── integration/          # Tests nécessitant Supabase local (port 54321)
│   ├── *.test.ts         # RLS, RPC, race conditions, endpoints
│   └── database/         # Triggers / RLS / fonctions PL/pgSQL
├── helpers/              # Infra de test partagée
│   ├── supabase/         # Mocks (client, locals, request)
│   ├── fixtures/         # Factories (profiles, marketplace, game)
│   └── database/         # Clients réels + factory pour les tests d'intégration
├── seed-test-data.ts     # Seed du Supabase local pour les e2e (via tsx)
└── cleanup-test-data.ts  # Nettoyage après e2e (via tsx)
```

Les tests e2e (Playwright) sont dans [`e2e/`](../e2e/), pas ici.

## Lancer

```bash
# Intégration (nécessite Supabase local)
pnpm db:start
pnpm test:integration

# Les helpers sont importés via l'alias $tests (ex. import ... from '$tests/helpers')
```

Les tests d'intégration tournent aussi en CI une fois par nuit
(`.github/workflows/nightly-integration.yml`).
