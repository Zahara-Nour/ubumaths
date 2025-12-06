/**
 * Unit tests for InstrumenPoche XML to UbuMaths JSON Converter
 *
 * Tests the conversion of InstrumenPoche XML construction scripts to UbuMaths format.
 * Covers main conversion paths, validation, error handling, and options.
 */

import { describe, it, expect } from 'vitest';
import { convertInstrumenPoche, validateInstrumenPocheXml } from './converter';

// =============================================================================
// Test Data
// =============================================================================

const validXmlWithPoint = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
</INSTRUMENPOCHE>`;

const validXmlWithCustomCanvas = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="1024" height="768"/>
  <action objet="point" mouvement="creer" id="P1" abscisse="50" ordonnee="50"/>
</INSTRUMENPOCHE>`;

const validXmlWithAuthor = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2" auteur="Test Author">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
</INSTRUMENPOCHE>`;

const validXmlWithImage = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
  <action objet="image" mouvement="chargement" url="http://example.com/test.jpg"/>
</INSTRUMENPOCHE>`;

const validXmlWithMultipleActions = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
  <action objet="point" mouvement="creer" id="B" abscisse="300" ordonnee="400"/>
  <action objet="texte" mouvement="creer" id="T1" abscisse="150" ordonnee="250"/>
  <action objet="texte" mouvement="ecrire" id="T1" texte="Hello World"/>
</INSTRUMENPOCHE>`;

const emptyXml = '';

const invalidXmlSyntax = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
</INSTRUMENPOCHE>`;

const nonInstrumenPocheXml = `<?xml version="1.0"?>
<someOtherRoot>
  <data>Not InstrumenPoche</data>
</someOtherRoot>`;

const xmlWithUnbalancedTags = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
`;

// =============================================================================
// Basic Conversion Tests
// =============================================================================

describe('convertInstrumenPoche - Basic Conversion', () => {
	it('should successfully convert valid XML with a point', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint);

		expect(result.success).toBe(true);
		expect(result.script).toBeDefined();
		expect(result.errors).toHaveLength(0);
	});

	it('should create script with correct structure', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint);

		expect(result.script).toMatchObject({
			version: 1,
			title: expect.any(String),
			canvas: {
				width: expect.any(Number),
				height: expect.any(Number),
				backgroundColor: expect.any(String)
			},
			steps: expect.any(Array)
		});
	});

	it('should extract canvas dimensions correctly', async () => {
		const result = await convertInstrumenPoche(validXmlWithCustomCanvas);

		expect(result.script?.canvas.width).toBe(1024);
		expect(result.script?.canvas.height).toBe(768);
	});

	it('should use default canvas dimensions when viewBox is missing', async () => {
		const xmlWithoutViewBox = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithoutViewBox);

		expect(result.script?.canvas.width).toBe(800);
		expect(result.script?.canvas.height).toBe(600);
	});

	it('should convert point action to create step', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint);

		expect(result.script?.steps).toHaveLength(1);
		expect(result.script?.steps[0]).toMatchObject({
			type: 'create',
			object: {
				kind: 'point',
				x: 100,
				y: 200
			}
		});
	});

	it('should handle multiple actions correctly', async () => {
		const result = await convertInstrumenPoche(validXmlWithMultipleActions);

		expect(result.script?.steps.length).toBeGreaterThan(1);
		// Should have at least 2 point creations and 1 text creation
		const createSteps = result.script?.steps.filter((s) => s.type === 'create');
		expect(createSteps?.length).toBeGreaterThanOrEqual(3);
	});
});

// =============================================================================
// Empty/Invalid XML Tests
// =============================================================================

describe('convertInstrumenPoche - Empty/Invalid XML', () => {
	it('should return error for empty string', async () => {
		const result = await convertInstrumenPoche(emptyXml);

		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.script).toBeUndefined();
	});

	it('should return error for invalid XML syntax', async () => {
		const result = await convertInstrumenPoche(invalidXmlSyntax);

		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0]).toContain('XML parsing error');
	});

	it('should return error for non-InstrumenPoche XML', async () => {
		const result = await convertInstrumenPoche(nonInstrumenPocheXml);

		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0]).toContain('INSTRUMENPOCHE');
	});

	it('should return error for null input', async () => {
		const result = await convertInstrumenPoche(null as unknown as string);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toContain('Invalid input');
	});

	it('should return error for non-string input', async () => {
		const result = await convertInstrumenPoche(123 as unknown as string);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toContain('Invalid input');
	});
});

// =============================================================================
// Warnings for Unsupported Features
// =============================================================================

describe('convertInstrumenPoche - Unsupported Features', () => {
	it('should return success with warning for image elements', async () => {
		const result = await convertInstrumenPoche(validXmlWithImage);

		expect(result.success).toBe(true);
		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings.some((w) => w.includes('Image'))).toBe(true);
	});

	it('should still convert other elements when image is present', async () => {
		const result = await convertInstrumenPoche(validXmlWithImage);

		expect(result.script?.steps).toBeDefined();
		// Should have point creation step
		const createSteps = result.script?.steps.filter((s) => s.type === 'create');
		expect(createSteps?.length).toBeGreaterThanOrEqual(1);
	});

	it('should add warning for empty script steps', async () => {
		const xmlWithNoActions = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithNoActions);

		expect(result.success).toBe(true);
		expect(result.warnings.some((w) => w.includes('no steps'))).toBe(true);
	});
});

// =============================================================================
// Options Handling Tests
// =============================================================================

describe('convertInstrumenPoche - Options Handling', () => {
	it('should override title with options.title', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint, {
			title: 'Custom Title'
		});

		expect(result.script?.title).toBe('Custom Title');
	});

	it('should override description with options.description', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint, {
			description: 'Custom Description'
		});

		expect(result.script?.description).toBe('Custom Description');
	});

	it('should use both title and description from options', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint, {
			title: 'My Construction',
			description: 'This is a test construction'
		});

		expect(result.script?.title).toBe('My Construction');
		expect(result.script?.description).toBe('This is a test construction');
	});

	it('should extract author and include in description when no description option', async () => {
		const result = await convertInstrumenPoche(validXmlWithAuthor);

		expect(result.script?.description).toContain('Test Author');
		expect(result.script?.description).toContain('Auteur');
	});

	it('should append author to custom description when both present', async () => {
		const result = await convertInstrumenPoche(validXmlWithAuthor, {
			description: 'My custom description'
		});

		expect(result.script?.description).toContain('My custom description');
		expect(result.script?.description).toContain('Test Author');
	});

	it('should use default title when options.title is not provided', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint);

		expect(result.script?.title).toBe('Imported Construction');
	});
});

// =============================================================================
// validateInstrumenPocheXml Function Tests
// =============================================================================

describe('validateInstrumenPocheXml', () => {
	it('should return isValid: true for valid InstrumenPoche XML', () => {
		const result = validateInstrumenPocheXml(validXmlWithPoint);

		expect(result.isValid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('should return isValid: false for empty string', () => {
		const result = validateInstrumenPocheXml(emptyXml);

		expect(result.isValid).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('non-empty string');
	});

	it('should return isValid: false for non-InstrumenPoche XML', () => {
		const result = validateInstrumenPocheXml(nonInstrumenPocheXml);

		expect(result.isValid).toBe(false);
		expect(result.error).toContain('INSTRUMENPOCHE');
	});

	it('should return isValid: false for unbalanced tags', () => {
		const result = validateInstrumenPocheXml(xmlWithUnbalancedTags);

		expect(result.isValid).toBe(false);
		expect(result.error).toContain('Unbalanced');
	});

	it('should accept lowercase instrumenpoche tag', () => {
		const lowercaseXml = validXmlWithPoint.replace('INSTRUMENPOCHE', 'instrumenpoche');
		const result = validateInstrumenPocheXml(lowercaseXml);

		expect(result.isValid).toBe(true);
	});

	it('should return isValid: false for null input', () => {
		const result = validateInstrumenPocheXml(null as unknown as string);

		expect(result.isValid).toBe(false);
		expect(result.error).toContain('non-empty string');
	});

	it('should return isValid: false for non-string input', () => {
		const result = validateInstrumenPocheXml({ xml: 'test' } as unknown as string);

		expect(result.isValid).toBe(false);
		expect(result.error).toContain('non-empty string');
	});
});

// =============================================================================
// Edge Cases and Complex Scenarios
// =============================================================================

describe('convertInstrumenPoche - Edge Cases', () => {
	it('should handle XML with special characters in text', async () => {
		const xmlWithSpecialChars = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="texte" mouvement="creer" id="T1" abscisse="100" ordonnee="100"/>
  <action objet="texte" mouvement="ecrire" id="T1" texte="£lt£Hello£gt£"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithSpecialChars);

		expect(result.success).toBe(true);
		expect(result.script?.steps).toBeDefined();
	});

	it('should handle XML with multiple viewBox attributes', async () => {
		const result = await convertInstrumenPoche(validXmlWithCustomCanvas);

		expect(result.success).toBe(true);
		expect(result.script?.canvas).toBeDefined();
	});

	it('should handle very large canvas dimensions', async () => {
		const xmlWithLargeCanvas = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="10000" height="10000"/>
  <action objet="point" mouvement="creer" id="A" abscisse="5000" ordonnee="5000"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithLargeCanvas);

		expect(result.success).toBe(true);
		expect(result.script?.canvas.width).toBe(10000);
		expect(result.script?.canvas.height).toBe(10000);
	});

	it('should handle point with color attribute', async () => {
		const xmlWithColor = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200" couleur="rouge"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithColor);

		expect(result.success).toBe(true);
		const createStep = result.script?.steps[0];
		expect(createStep?.type).toBe('create');
		if (createStep?.type === 'create') {
			expect(createStep.object.style?.color).toBeDefined();
		}
	});

	it('should handle pencil drawing actions', async () => {
		const xmlWithPencil = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="crayon" mouvement="montrer" abscisse="100" ordonnee="100"/>
  <action objet="crayon" mouvement="tracer" abscisse="200" ordonnee="200"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithPencil);

		expect(result.success).toBe(true);
		expect(result.script?.steps.length).toBeGreaterThan(0);
	});

	it('should handle compass actions', async () => {
		const xmlWithCompass = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="compas" mouvement="montrer" abscisse="400" ordonnee="300"/>
  <action objet="compas" mouvement="ecarter" ecart="100"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithCompass);

		expect(result.success).toBe(true);
		expect(result.script?.steps.length).toBeGreaterThan(0);
	});

	it('should handle ruler actions', async () => {
		const xmlWithRuler = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="regle" mouvement="montrer" abscisse="200" ordonnee="200"/>
  <action objet="regle" mouvement="translation" abscisse="300" ordonnee="300"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithRuler);

		expect(result.success).toBe(true);
		expect(result.script?.steps.length).toBeGreaterThan(0);
	});
});
