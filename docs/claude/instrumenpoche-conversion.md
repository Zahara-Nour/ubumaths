# InstrumenPoche to UbuMaths Conversion Guide

This document describes the mapping between InstrumenPoche XML format and UbuMaths ConstructionScript JSON format.

## Overview

InstrumenPoche is a JavaScript/SVG-based educational geometry animation player developed by Sesamath. UbuMaths uses a JSON-based ConstructionScript format for defining geometric construction animations.

## Conversion Tools

### Browser-Compatible Converter Module

**Location**: `src/lib/constructions/converter.ts`

The converter module is fully browser-compatible (no Node.js-specific APIs) and can be used in:

- Web UI conversion page
- API endpoints
- Build-time scripts

**Key Features**:

- **Security Protections**:
  - Step count limit (max 1000 steps to prevent DoS)
  - Array bounds validation (max 1000 items per array)
  - XML parsing timeout (10 seconds)
  - Input size limit (5MB max)
- **Comprehensive Testing**: 34 unit tests covering all conversion scenarios
- **Browser/Server Compatible**: Uses platform-agnostic APIs only

### Conversion Page

**Route**: `/constructions/conversion` (Teachers and Admins only)

Interactive web interface for converting InstrumenPoche XML files:

- Upload XML files or paste XML content
- Live preview of conversion results
- JSON editor with syntax highlighting (CodeMirror)
- Preview construction playback before saving
- Add tags for categorization
- Save directly to database

### API Endpoint

**Route**: `POST /api/constructions/convert`

Server endpoint for programmatic conversion:

```typescript
// Request
{
  "xml": "<INSTRUMENPOCHE>...</INSTRUMENPOCHE>",
  "title": "Optional title override",
  "description": "Optional description override"
}

// Response (success)
{
  "success": true,
  "script": { /* ConstructionScript JSON */ },
  "warnings": ["Warning 1", "Warning 2"],
  "errors": []
}

// Response (failure)
{
  "success": false,
  "warnings": ["Warning 1"],
  "errors": ["Critical error"]
}
```

**Access**: Teachers and Admins only (role-based authentication)

### CLI Script

**Location**: `scripts/convert-instrumenpoche.ts`

Build-time script for batch conversion (uses same converter module):

```bash
# Convert to both JSON and SQL
npx tsx scripts/convert-instrumenpoche.ts --output both

# Convert to JSON only
npx tsx scripts/convert-instrumenpoche.ts --output json

# Convert to SQL migration only
npx tsx scripts/convert-instrumenpoche.ts --output sql
```

## Format Comparison

### InstrumenPoche XML Structure

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<INSTRUMENPOCHE version="2" auteur="Author Name" licence="CC-BY-SA">
  <commentaire texteCommentaire="Comment text" />
  <action objet="point" mouvement="creer" id="P1" abscisse="100" ordonnee="200" />
  <action objet="crayon" mouvement="tracer" ... />
</INSTRUMENPOCHE>
```

### UbuMaths JSON Structure

```json
{
	"version": 1,
	"title": "Construction Title",
	"description": "Description",
	"canvas": {
		"width": 800,
		"height": 600,
		"backgroundColor": "#FFFFFF"
	},
	"steps": [
		{ "type": "create", "object": { "kind": "point", "id": "P1", "x": 100, "y": 200 } },
		{ "type": "action", "action": { "kind": "show", "target": "ruler" } }
	]
}
```

## Object Mapping

| InstrumenPoche (`objet`) | UbuMaths (`kind`)       | Notes                        |
| ------------------------ | ----------------------- | ---------------------------- |
| `point`                  | `point`                 | Full support                 |
| `texte`                  | `text`                  | HTML tags stripped           |
| `crayon`                 | `segment`, `polygon`    | Depends on `forme` attribute |
| `regle`                  | Instrument: `ruler`     | Instrument action target     |
| `compas`                 | Instrument: `compass`   | Instrument action target     |
| `equerre`                | Instrument: `setSquare` | Instrument action target     |
| `longueur`               | `point` (cross style)   | Length marks as cross points |
| `angle_droit`            | `angleMark`             | Right angle markers          |
| `marque`                 | `point` (cross style)   | Segment marks                |
| `trait`                  | `segment`               | Line segments                |

## Action Mapping

| InstrumenPoche (`mouvement`) | UbuMaths Action          | Notes                      |
| ---------------------------- | ------------------------ | -------------------------- |
| `creer`                      | `create` step            | Creates objects            |
| `montrer`                    | `show` action            | Shows objects/instruments  |
| `masquer`                    | `hide` action            | Hides objects/instruments  |
| `translation`                | `moveTo` action          | Moves to absolute position |
| `rotation`                   | `rotate` action          | Rotates instruments        |
| `nommer`                     | `create` text object     | Creates label near point   |
| `ecrire`                     | `create` text object     | Creates text at position   |
| `tracer`                     | `create` segment/polygon | Draws lines                |
| `ecarter`                    | `setCompass` action      | Sets compass opening       |
| `zoom`                       | `scale` action           | Scales instruments         |

## Instrument Mapping

| InstrumenPoche | UbuMaths Instrument ID    |
| -------------- | ------------------------- |
| `regle`        | `ruler`                   |
| `compas`       | `compass`                 |
| `equerre`      | `setSquare`               |
| `rapporteur`   | `protractor`              |
| `crayon`       | (objects, not instrument) |

## Drawing Shapes

InstrumenPoche uses `forme` attribute on `crayon` actions:

| `forme`      | UbuMaths Object        |
| ------------ | ---------------------- |
| `polygone`   | `polygon`              |
| `libre`      | `segment` (simplified) |
| `demidroite` | `ray`                  |
| (default)    | `segment`              |

## Color Conversion

InstrumenPoche uses French color names and `0x` hex prefixes:

| InstrumenPoche | UbuMaths (CSS) |
| -------------- | -------------- |
| `noir`         | `#000000`      |
| `blanc`        | `#FFFFFF`      |
| `rouge`        | `#FF0000`      |
| `bleu`         | `#0000FF`      |
| `vert`         | `#00FF00`      |
| `0x006400`     | `#006400`      |
| `forestgreen`  | `#228B22`      |

## Line Style Conversion

| InstrumenPoche (`pointille`) | UbuMaths (`lineStyle`) |
| ---------------------------- | ---------------------- |
| `tiret`                      | `dashed`               |
| `point`                      | `dotted`               |
| (default)                    | `solid`                |

## Tempo and Duration

InstrumenPoche `tempo` attribute (in arbitrary units) is converted:

- Formula: `duration_ms = tempo * 50`
- Maximum duration capped at 30000ms

InstrumenPoche `vitesse` attribute (speed) is converted:

- Formula: `duration_ms = 1000 / vitesse * 100`

## Limitations

### Not Fully Supported

1. **Images** - InstrumenPoche image loading is not converted (warning logged)
2. **MathJax/LaTeX** - Preserved as raw text, may need rendering support
3. **Complex compass operations** - Opening to target point requires expression evaluation
4. **Ruler rotation to target** - Calculating angle to target not implemented
5. **Protractor/rapporteur** - Basic support only

### Workarounds Applied

1. **Free-form drawing** - Converted to first-to-last point segment
2. **Compass arcs** - Use placeholder center when position unknown from context
3. **Point labels** - Created as separate text objects positioned near point

## Converted Examples

The following examples were converted from `extern/instrumenpoche-main/devServer/fixtures/`:

| File  | Title                                       | Steps | Description            |
| ----- | ------------------------------------------- | ----- | ---------------------- |
| 0.xml | Calcul mental : Ajouter 19                  | 82    | Mental math animation  |
| 1.xml | Partage d'un segment en 3 parts egales      | 124   | Geometric construction |
| 2.xml | Calcul mental : Soustraire 99               | 81    | Mental math animation  |
| 3.xml | Axes de symetrie et construction d'un carre | 541   | Complex construction   |
| 4.xml | Exemple MathJax/LaTeX                       | 2     | Text display demo      |
| 5.xml | Exercice de reperage de points              | 24    | Point exercise         |
| 6.xml | Construction d'un parallelogramme           | 169   | Geometric construction |
| 7.xml | Symetrie centrale au compas                 | 72    | Compass construction   |
| 8.xml | Segment avec marque                         | 4     | Simple segment         |

## Output Files

**CLI Script Output**:

- **JSON files**: `scripts/output/constructions/*.json`
- **Migration**: `supabase/migrations/YYYYMMDDHHMMSS_seed_instrumenpoche_examples.sql`

**Web UI Output**:

- Saved directly to `constructions` table via API
- Includes `tags` array for categorization and filtering

## See Also

- [UbuMaths Construction Types](../../src/lib/constructions/types.ts)
- [UbuMaths Construction Schemas](../../src/lib/constructions/schemas.ts)
- [InstrumenPoche Documentation](../../extern/instrumenpoche-main/CLAUDE.md)
