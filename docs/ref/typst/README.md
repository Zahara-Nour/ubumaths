# Module Typst

Module centralisé pour la compilation Typst et la génération de documents PDF.

## Documentation

- [French Decimals](./french-decimals.md) - Format français des nombres (virgule, espaces fines)

## Structure

```
src/lib/typst/
├── index.ts          # API publique
├── types.ts          # Types et interfaces
├── compiler/         # Compilateur WASM singleton
├── cache/            # Cache LRU avec TTL
├── service/          # Service central avec queue
├── generators/       # Générateurs de documents
├── transpiler/       # AST → Typst
├── templates/        # Templates prédéfinis
└── utils/            # Utilitaires
```

## Usage

### Service (recommandé)

```typescript
import { getTypstService, PRIORITY } from '$lib/typst';

const service = getTypstService();

// Compilation simple
const result = await service.compile(typstSource, { format: 'pdf' });
if (result.success) {
	downloadPdf(result.data as Uint8Array);
}

// Compilation prioritaire (téléchargements, impressions)
const urgentResult = await service.compileWithPriority(
	typstSource,
	{ format: 'pdf' },
	PRIORITY.URGENT
);

// État du service
service.onStateChange((state) => {
	console.log('État:', state); // idle | loading | ready | compiling | error
});
```

### Générateurs

```typescript
import { WorksheetGenerator } from '$lib/typst';

const generator = new WorksheetGenerator(
	worksheetConfig,
	{ fontSize: 11, pageLayout: 'A4' },
	{ mode: 'correction', studentName: 'Marie', className: '3ème A' }
);

const { typstContent, metadata } = generator.generate({
	worksheet,
	instance,
	template
});
```

### Fonctions legacy (compatibilité)

```typescript
// Ces imports continuent de fonctionner
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
import { getTypstCompiler } from '$lib/worksheets/typst-compiler';
import { generateTypst } from '$lib/ubumark';
```

## Types principaux

| Type              | Description                       |
| ----------------- | --------------------------------- | ----- | -------- |
| `TypstCompiler`   | Interface du compilateur WASM     |
| `TypstService`    | Service de compilation avec queue |
| `CompileResult`   | Résultat de compilation           |
| `GeneratorConfig` | Configuration des générateurs     |
| `OutputFormat`    | Format de sortie: `'pdf'          | 'svg' | 'typst'` |

## Cache

Le cache LRU évite les recompilations identiques:

- **Taille max**: 50 entrées (configurable)
- **TTL**: 10 minutes (configurable)
- **Clé**: hash FNV-1a du contenu + format

```typescript
const service = getTypstService({
	cacheMaxSize: 100,
	cacheTTL: 30 * 60 * 1000 // 30 minutes
});

// Stats
const stats = service.getCacheStats();
console.log(`Hit rate: ${(stats.hits / (stats.hits + stats.misses)) * 100}%`);
```

## Queue de compilation

Les compilations sont traitées séquentiellement avec priorités:

| Priorité           | Valeur | Usage                            |
| ------------------ | ------ | -------------------------------- |
| `PRIORITY.BATCH`   | 0      | Génération batch en arrière-plan |
| `PRIORITY.NORMAL`  | 1      | Compilations utilisateur         |
| `PRIORITY.PREVIEW` | 2      | Rafraîchissement preview         |
| `PRIORITY.URGENT`  | 3      | Téléchargements, impressions     |

## Tests

```bash
pnpm test:server src/lib/typst  # 178 tests
```
