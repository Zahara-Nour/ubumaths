/**
 * Unit tests for InstrumenPoche XML to UbuMaths JSON Converter
 *
 * Tests the conversion of InstrumenPoche XML construction scripts to UbuMaths format.
 * Covers main conversion paths, validation, error handling, and options.
 *
 * New flat format:
 * - Objects: { point: "A", at: [100, 200] }
 * - Instruments: { move: "pencil", to: [100, 200] }
 * - Control: { pause: 1000 }
 */

import { describe, it, expect } from 'vitest';
import { convertInstrumenPoche, validateInstrumenPocheXml } from './converter';
import {
	isPointStep,
	isTextStep,
	isLabelStep,
	isShowStep,
	isMoveStep,
	isSpreadStep,
	isRotateStep,
	isLineStep,
	isArcStep,
	type StepInput
} from './schemas';

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
// Helper functions
// =============================================================================

function countStepsByType(steps: StepInput[], predicate: (step: StepInput) => boolean): number {
	return steps.filter(predicate).length;
}

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

	it('should convert point action to point step with new format', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint);

		expect(result.script?.steps).toBeDefined();
		// Find the point step (may have instrument steps before it)
		const pointSteps = result.script!.steps.filter(isPointStep);
		expect(pointSteps.length).toBeGreaterThanOrEqual(1);

		const pointStep = pointSteps[0];
		expect(pointStep.point).toBe('A');
		expect(pointStep.at).toEqual([100, 200]);
	});

	it('should handle multiple actions correctly', async () => {
		const result = await convertInstrumenPoche(validXmlWithMultipleActions);

		expect(result.script?.steps.length).toBeGreaterThan(1);
		// Should have at least 2 point creations and 1 text creation
		const pointCount = countStepsByType(result.script!.steps, isPointStep);
		const textCount = countStepsByType(result.script!.steps, isTextStep);
		expect(pointCount).toBeGreaterThanOrEqual(2);
		expect(textCount).toBeGreaterThanOrEqual(1);
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
		const pointCount = countStepsByType(result.script!.steps, isPointStep);
		expect(pointCount).toBeGreaterThanOrEqual(1);
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

	it('should handle large canvas dimensions (up to 4000)', async () => {
		// Canvas max is 4000 as per schema validation
		const xmlWithLargeCanvas = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="4000" height="4000"/>
  <action objet="point" mouvement="creer" id="A" abscisse="2000" ordonnee="2000"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithLargeCanvas);

		expect(result.success).toBe(true);
		expect(result.script?.canvas.width).toBe(4000);
		expect(result.script?.canvas.height).toBe(4000);
	});

	it('should reject canvas dimensions exceeding max', async () => {
		// Canvas max is 4000 as per schema validation
		const xmlWithTooLargeCanvas = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="10000" height="10000"/>
  <action objet="point" mouvement="creer" id="A" abscisse="5000" ordonnee="5000"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithTooLargeCanvas);

		// Now properly rejected by Zod validation
		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0]).toContain('Width too large');
	});

	it('should handle point with color attribute', async () => {
		const xmlWithColor = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200" couleur="rouge"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithColor);

		expect(result.success).toBe(true);
		const pointSteps = result.script!.steps.filter(isPointStep);
		expect(pointSteps.length).toBeGreaterThanOrEqual(1);
		// Check that color property exists on the point step
		expect(pointSteps[0].color).toBeDefined();
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
		// Should have show step and line step
		const showSteps = countStepsByType(result.script!.steps, isShowStep);
		const lineSteps = countStepsByType(result.script!.steps, isLineStep);
		expect(showSteps).toBeGreaterThanOrEqual(1);
		expect(lineSteps).toBeGreaterThanOrEqual(1);
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
		// Should have show step and spread step
		const showSteps = countStepsByType(result.script!.steps, isShowStep);
		const spreadSteps = countStepsByType(result.script!.steps, isSpreadStep);
		expect(showSteps).toBeGreaterThanOrEqual(1);
		expect(spreadSteps).toBeGreaterThanOrEqual(1);
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
		// Should have show step and move step
		const showSteps = countStepsByType(result.script!.steps, isShowStep);
		const moveSteps = countStepsByType(result.script!.steps, isMoveStep);
		expect(showSteps).toBeGreaterThanOrEqual(1);
		expect(moveSteps).toBeGreaterThanOrEqual(1);
	});
});

// =============================================================================
// New Format Specific Tests
// =============================================================================

describe('convertInstrumenPoche - New Format Structure', () => {
	it('should generate point steps with "point" key and "at" coordinates', async () => {
		const result = await convertInstrumenPoche(validXmlWithPoint);
		const pointStep = result.script!.steps.find(isPointStep);

		expect(pointStep).toBeDefined();
		expect(pointStep!.point).toBe('A');
		expect(pointStep!.at).toEqual([100, 200]);
	});

	it('should generate line steps without "from" property (implicit)', async () => {
		const xmlWithLine = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="crayon" mouvement="montrer" abscisse="100" ordonnee="100"/>
  <action objet="crayon" mouvement="tracer" abscisse="200" ordonnee="200"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithLine);
		const lineStep = result.script!.steps.find(isLineStep);

		expect(lineStep).toBeDefined();
		expect(lineStep!.to).toBeDefined();
		// In new format, "from" is not present - it uses current pencil position
		expect('from' in lineStep!).toBe(false);
	});

	it('should generate arc steps with "sweep" property', async () => {
		const xmlWithArc = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="compas" mouvement="montrer" abscisse="400" ordonnee="300"/>
  <action objet="compas" mouvement="ecarter" ecart="100"/>
  <action objet="compas" mouvement="tracer" sens="1" amp="90"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithArc);
		const arcStep = result.script!.steps.find(isArcStep);

		expect(arcStep).toBeDefined();
		expect(arcStep!.sweep).toBeDefined();
		// In new format, center is not present - it uses current compass position
		expect('center' in arcStep!).toBe(false);
	});

	it('should generate show/hide steps with instrument name as value', async () => {
		const xmlWithInstruments = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="regle" mouvement="montrer" abscisse="200" ordonnee="200"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithInstruments);
		const showStep = result.script!.steps.find(isShowStep);

		expect(showStep).toBeDefined();
		expect(showStep!.show).toBe('ruler');
	});

	it('should generate move steps with target in "to" property', async () => {
		// Test pencil move via montrer (showing pencil at a position generates a move step)
		const xmlWithMove = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="crayon" mouvement="montrer" abscisse="100" ordonnee="100"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithMove);
		const moveSteps = result.script!.steps.filter(isMoveStep);

		// The montrer with coordinates generates a move step before showing
		expect(moveSteps.length).toBeGreaterThanOrEqual(1);
		const moveStep = moveSteps[0];
		expect(moveStep.move).toBe('pencil');
		expect(moveStep.to).toEqual([100, 100]);
	});

	it('should generate spread steps for compass opening', async () => {
		const xmlWithSpread = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="compas" mouvement="montrer" abscisse="400" ordonnee="300"/>
  <action objet="compas" mouvement="ecarter" ecart="150"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithSpread);
		const spreadStep = result.script!.steps.find(isSpreadStep);

		expect(spreadStep).toBeDefined();
		expect(spreadStep!.spread).toBe('compass');
		expect(spreadStep!.radius).toBe(150);
	});

	it('should generate rotate steps for instrument rotation', async () => {
		const xmlWithRotate = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="compas" mouvement="montrer" abscisse="400" ordonnee="300"/>
  <action objet="compas" mouvement="rotation" angle="45"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithRotate);
		const rotateStep = result.script!.steps.find(isRotateStep);

		expect(rotateStep).toBeDefined();
		expect(rotateStep!.rotate).toBe('compass');
		expect(rotateStep!.to).toBe(45);
	});

	it('should create separate label step for nommer (regardless of order)', async () => {
		// Labels are now separate steps that reference points via label_X convention
		const xmlWithLabel = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="A" abscisse="100" ordonnee="200"/>
  <action objet="point" mouvement="nommer" id="A" nom="Point A" abscisse="10" ordonnee="-10"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithLabel);
		expect(result.success).toBe(true);

		const pointStep = result.script!.steps.find(isPointStep);
		const labelStep = result.script!.steps.find(isLabelStep);

		expect(pointStep).toBeDefined();
		expect(labelStep).toBeDefined();
		expect(labelStep!.label).toBe('label_A');
		expect(labelStep!.offset).toEqual([10, -10]);
	});

	it('should use default offset for label when not specified', async () => {
		const xmlWithLabelNoOffset = `<?xml version="1.0"?>
<INSTRUMENPOCHE version="2">
  <viewBox width="800" height="600"/>
  <action objet="point" mouvement="creer" id="B" abscisse="200" ordonnee="300"/>
  <action objet="point" mouvement="nommer" id="B" nom="Point B"/>
</INSTRUMENPOCHE>`;

		const result = await convertInstrumenPoche(xmlWithLabelNoOffset);
		expect(result.success).toBe(true);

		const labelStep = result.script!.steps.find(isLabelStep);

		expect(labelStep).toBeDefined();
		expect(labelStep!.label).toBe('label_B');
		expect(labelStep!.offset).toEqual([10, -10]); // Default offset
	});
});
