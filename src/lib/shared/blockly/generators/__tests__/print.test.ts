import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { describe, expect, it } from 'vitest';

import { installerGenerateursChiphre } from '../javascript';

// Bloc « print » de Blockly : `window.alert(…)` par défaut. L'aperçu JavaScript montre
// `console.log`, l'écriture d'un programme (jamais exécuté par Chiphre, ADR 0039).
function codeDuBlocPrint(): string {
	const workspace = new Blockly.Workspace();
	Blockly.serialization.workspaces.load(
		{
			blocks: {
				blocks: [
					{
						type: 'text_print',
						inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'abc' } } } }
					}
				]
			}
		},
		workspace
	);
	const code = javascriptGenerator.workspaceToCode(workspace);
	workspace.dispose();
	return code;
}

describe('bloc print (JavaScript)', () => {
	it('s’écrit console.log dans l’aperçu, jamais window.alert', () => {
		installerGenerateursChiphre();
		const code = codeDuBlocPrint();
		expect(code).not.toContain('alert');
		expect(code).toContain("console.log('abc')");
	});
});
