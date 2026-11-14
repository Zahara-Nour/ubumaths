import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { describe, expect, it } from 'vitest';

import { construireSourceSandbox } from '$lib/workers/js-sandbox-source';
import { installerGenerateursChiphre, wrapJavaScriptCode } from '../javascript';

// Bloc « print » de Blockly : `window.alert(…)` par défaut, or `window` est bloqué dans le
// sandbox. Il doit écrire dans la console de l'élève.
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
	it('écrit dans la console du sandbox, sans passer par window.alert', () => {
		installerGenerateursChiphre();
		const code = codeDuBlocPrint();
		expect(code).not.toContain('alert');

		const sortie: string[] = [];
		const console = { log: (...args: unknown[]) => sortie.push(args.join(' ')) };
		new Function(construireSourceSandbox(['console', 'window'], wrapJavaScriptCode(code))).apply(
			null,
			[console, undefined]
		);
		expect(sortie).toEqual(['abc']);
	});
});
