/**
 * DSL Interpreter — walks the AST and produces a Figure.
 *
 * Maps DSL function calls to Figure factory methods via builtins.
 */

import { Figure } from '../graph/figure';
import type { GeoValue } from '../types/geo-value';
import { numeric } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import { geoToNumber } from '../compute/to-number';
import { DslRuntimeError } from './errors';
import { SymbolTable } from './symbol-table';
import type { SymbolEntry } from './symbol-table';
import {
	executeBuiltin,
	BUILTIN_NAMES,
	MATH_FUNCTIONS,
	type ResolvedValue,
	type ResolvedArgs
} from './builtins';
import type { DslProgram, DslStatement, DslExpr, DslFunctionCallExpr } from './types';
import { MacroRegistry } from './macro-registry';

export interface InterpretResult {
	figure: Figure;
	symbols: SymbolTable;
}

export function interpret(program: DslProgram, figure?: Figure): InterpretResult {
	const fig = figure ?? new Figure();
	const symbols = new SymbolTable();
	const macros = new MacroRegistry();
	const interpreter = new Interpreter(fig, symbols, macros);
	interpreter.executeBlock(program.statements);
	return { figure: fig, symbols };
}

class Interpreter {
	constructor(
		private figure: Figure,
		private symbols: SymbolTable,
		private macros: MacroRegistry
	) {}

	executeBlock(statements: DslStatement[]): ResolvedValue | undefined {
		for (const stmt of statements) {
			const result = this.executeStatement(stmt);
			if (result !== undefined) return result; // return from macro
		}
		return undefined;
	}

	private executeStatement(stmt: DslStatement): ResolvedValue | undefined {
		switch (stmt.kind) {
			case 'assignment': {
				const value = this.evaluateExpr(stmt.value, stmt.line);
				this.symbols.set(stmt.name, this.toSymbolEntry(value));
				break;
			}

			case 'indexedAssignment': {
				const index = Math.round(this.evaluateToNumber(stmt.index, stmt.line));
				const value = this.evaluateExpr(stmt.value, stmt.line);
				this.symbols.setIndexed(stmt.name, index, this.toSymbolEntry(value));
				break;
			}

			case 'destructuring': {
				const value = this.evaluateExpr(stmt.value, stmt.line);
				if (value.type !== 'tuple') {
					throw new DslRuntimeError('La destructuration necessite un tuple', stmt.line);
				}
				if (value.elements.length !== stmt.names.length) {
					throw new DslRuntimeError(
						`Attendu ${stmt.names.length} valeurs, recu ${value.elements.length}`,
						stmt.line
					);
				}
				for (let i = 0; i < stmt.names.length; i++) {
					this.symbols.set(stmt.names[i], this.toSymbolEntry(value.elements[i]));
				}
				break;
			}

			case 'exprStatement': {
				this.evaluateExpr(stmt.expr, stmt.line);
				break;
			}

			case 'macroDef': {
				this.macros.define(stmt);
				break;
			}

			case 'forRange': {
				const from = Math.round(this.evaluateToNumber(stmt.from, stmt.line));
				const to = Math.round(this.evaluateToNumber(stmt.to, stmt.line));
				const maxIter = 1000;
				let count = 0;
				for (let i = from; i <= to; i++) {
					if (++count > maxIter) {
						throw new DslRuntimeError('Limite de 1000 iterations atteinte', stmt.line);
					}
					this.symbols.set(stmt.variable, { type: 'nombre', value: i });
					this.executeBlock(stmt.body);
				}
				break;
			}

			case 'forIn': {
				const iterable = this.evaluateExpr(stmt.iterable, stmt.line);
				if (iterable.type !== 'tuple') {
					throw new DslRuntimeError("'pour...dans' necessite une liste", stmt.line);
				}
				const maxIter = 1000;
				let count = 0;
				for (const item of iterable.elements) {
					if (++count > maxIter) {
						throw new DslRuntimeError('Limite de 1000 iterations atteinte', stmt.line);
					}
					this.symbols.set(stmt.variable, this.toSymbolEntry(item));
					this.executeBlock(stmt.body);
				}
				break;
			}

			case 'if': {
				const condition = this.evaluateToNumber(stmt.condition, stmt.line);
				if (condition) {
					this.executeBlock(stmt.body);
				} else if (stmt.elseBody) {
					this.executeBlock(stmt.elseBody);
				}
				break;
			}

			case 'return': {
				return this.evaluateExpr(stmt.value, stmt.line);
			}
		}
		return undefined;
	}

	private evaluateExpr(expr: DslExpr, line: number): ResolvedValue {
		switch (expr.kind) {
			case 'number':
				return { type: 'nombre', value: expr.value };

			case 'string':
				// Strings are treated as resolved values for named args
				return { type: 'nombre', value: 0 } as ResolvedValue & { value: string };

			case 'bool':
				return { type: 'nombre', value: expr.value ? 1 : 0 };

			case 'identifier': {
				const entry = this.symbols.get(expr.name);
				if (!entry) {
					throw new DslRuntimeError(`Variable inconnue : "${expr.name}"`, expr.line);
				}
				return this.fromSymbolEntry(entry);
			}

			case 'indexedAccess': {
				const index = Math.round(this.evaluateToNumber(expr.index, expr.line));
				const entry = this.symbols.getIndexed(expr.name, index);
				if (!entry) {
					throw new DslRuntimeError(`${expr.name}[${index}] n'est pas defini`, expr.line);
				}
				return this.fromSymbolEntry(entry);
			}

			case 'propertyAccess': {
				const entry = this.symbols.get(expr.object);
				if (!entry || !entry.figureId) {
					throw new DslRuntimeError(`"${expr.object}" n'est pas un element geometrique`, expr.line);
				}
				const pos = this.figure.getPosition(entry.figureId);
				if (!pos) {
					throw new DslRuntimeError(`"${expr.object}" n'a pas de position`, expr.line);
				}
				if (expr.property === 'x') return { type: 'nombre', value: geoToNumber(pos.x) };
				if (expr.property === 'y') return { type: 'nombre', value: geoToNumber(pos.y) };
				throw new DslRuntimeError(
					`Propriete inconnue : "${expr.property}" (attendu x ou y)`,
					expr.line
				);
			}

			case 'binary': {
				const left = this.evaluateToNumber(expr.left, expr.line);
				const right = this.evaluateToNumber(expr.right, expr.line);
				switch (expr.op) {
					case '+':
						return { type: 'nombre', value: left + right };
					case '-':
						return { type: 'nombre', value: left - right };
					case '*':
						return { type: 'nombre', value: left * right };
					case '/':
						if (right === 0) throw new DslRuntimeError('Division par zero', expr.line);
						return { type: 'nombre', value: left / right };
					case '%':
						return { type: 'nombre', value: ((left % right) + right) % right };
					case '^':
						return { type: 'nombre', value: Math.pow(left, right) };
					case '==':
						return { type: 'nombre', value: left === right ? 1 : 0 };
					case '!=':
						return { type: 'nombre', value: left !== right ? 1 : 0 };
					case '<':
						return { type: 'nombre', value: left < right ? 1 : 0 };
					case '>':
						return { type: 'nombre', value: left > right ? 1 : 0 };
					case '<=':
						return { type: 'nombre', value: left <= right ? 1 : 0 };
					case '>=':
						return { type: 'nombre', value: left >= right ? 1 : 0 };
					case 'et':
						return { type: 'nombre', value: left && right ? 1 : 0 };
					case 'ou':
						return { type: 'nombre', value: left || right ? 1 : 0 };
					default:
						throw new DslRuntimeError(`Operateur inconnu : ${expr.op}`, expr.line);
				}
			}

			case 'unary': {
				const operand = this.evaluateToNumber(expr.operand, expr.line);
				if (expr.op === '-') return { type: 'nombre', value: -operand };
				if (expr.op === 'non') return { type: 'nombre', value: operand ? 0 : 1 };
				throw new DslRuntimeError(`Operateur unaire inconnu : ${expr.op}`, expr.line);
			}

			case 'call':
				return this.evaluateCall(expr);

			case 'tuple':
				return {
					type: 'tuple',
					elements: expr.elements.map((e) => this.evaluateExpr(e, expr.line))
				};

			case 'list':
				return {
					type: 'tuple',
					elements: expr.elements.map((e) => this.evaluateExpr(e, expr.line))
				};

			default:
				throw new DslRuntimeError(`Expression non supportee : ${(expr as DslExpr).kind}`, line);
		}
	}

	private evaluateCall(expr: DslFunctionCallExpr): ResolvedValue {
		const { name, line } = expr;

		// Math functions
		if (MATH_FUNCTIONS.has(name)) {
			return this.evaluateMathFunction(name, expr);
		}

		// Resolve arguments
		const resolvedArgs = this.resolveArgs(expr);

		// Builtin geometry functions
		if (BUILTIN_NAMES.has(name)) {
			// Determine label from assignment context (set by caller)
			const result = executeBuiltin(
				name,
				resolvedArgs,
				this.figure,
				(v, l) => this.toGeoValue(v, l),
				(x, y, l) => this.toGeoPoint(x, y, l),
				line
			);
			if (result) {
				return { type: 'element', figureId: result.figureId, elementType: result.symbolType };
			}
			return { type: 'nombre', value: 0 }; // style() returns nothing
		}

		// Try macro call
		if (this.macros.has(name)) {
			return this.executeMacroCall(name, resolvedArgs, line);
		}

		throw new DslRuntimeError(`Fonction inconnue : "${name}"`, line);
	}

	private evaluateMathFunction(name: string, expr: DslFunctionCallExpr): ResolvedValue {
		const args = expr.args.map((a) => this.evaluateToNumber(a, expr.line));
		switch (name) {
			case 'sqrt':
				return { type: 'nombre', value: Math.sqrt(args[0]) };
			case 'abs':
				return { type: 'nombre', value: Math.abs(args[0]) };
			case 'sin':
				return { type: 'nombre', value: Math.sin((args[0] * Math.PI) / 180) };
			case 'cos':
				return { type: 'nombre', value: Math.cos((args[0] * Math.PI) / 180) };
			case 'tan':
				return { type: 'nombre', value: Math.tan((args[0] * Math.PI) / 180) };
			case 'asin':
				return { type: 'nombre', value: (Math.asin(args[0]) * 180) / Math.PI };
			case 'acos':
				return { type: 'nombre', value: (Math.acos(args[0]) * 180) / Math.PI };
			case 'atan':
				return { type: 'nombre', value: (Math.atan(args[0]) * 180) / Math.PI };
			default:
				throw new DslRuntimeError(`Fonction math inconnue : "${name}"`, expr.line);
		}
	}

	private executeMacroCall(name: string, args: ResolvedArgs, line: number): ResolvedValue {
		const macro = this.macros.get(name)!;
		this.macros.enterCall(name, line);

		try {
			// Create new scope for the macro
			this.symbols.pushScope();

			// Bind parameters
			const params = macro.params;
			for (let i = 0; i < params.length; i++) {
				const param = params[i];
				let value: ResolvedValue | undefined;

				if (i < args.positional.length) {
					value = args.positional[i];
				} else if (args.named.has(param.name)) {
					value = args.named.get(param.name)!;
				} else if (param.defaultValue) {
					value = this.evaluateExpr(param.defaultValue, line);
				} else {
					throw new DslRuntimeError(
						`Parametre "${param.name}" manquant pour la macro "${name}"`,
						line
					);
				}

				this.symbols.set(param.name, this.toSymbolEntry(value));
			}

			// Execute body
			const result = this.executeBlock(macro.body);

			// Pop scope
			this.symbols.popScope();

			// Return result or empty tuple
			return result ?? { type: 'nombre', value: 0 };
		} finally {
			this.macros.exitCall();
		}
	}

	private resolveArgs(expr: DslFunctionCallExpr): ResolvedArgs {
		const positional = expr.args.map((a) => this.evaluateExpr(a, expr.line));
		const named = new Map<string, ResolvedValue>();
		for (const [key, value] of expr.namedArgs) {
			named.set(key, this.evaluateExpr(value, expr.line));
		}
		return { positional, named };
	}

	private evaluateToNumber(expr: DslExpr, line: number): number {
		const val = this.evaluateExpr(expr, line);
		if (val.type === 'nombre') return val.value;
		if (val.type === 'geoValue') return geoToNumber(val.value);
		throw new DslRuntimeError('Nombre attendu', line);
	}

	private toGeoValue(val: ResolvedValue, line: number): GeoValue {
		if (val.type === 'nombre') return numeric(val.value);
		if (val.type === 'geoValue') return val.value;
		throw new DslRuntimeError('Valeur numerique attendue', line);
	}

	private toGeoPoint(x: ResolvedValue, y: ResolvedValue, line: number): GeoPoint {
		return { x: this.toGeoValue(x, line), y: this.toGeoValue(y, line) };
	}

	private toSymbolEntry(val: ResolvedValue): SymbolEntry {
		if (val.type === 'nombre') return { type: 'nombre', value: val.value };
		if (val.type === 'element') return { type: val.elementType, figureId: val.figureId };
		if (val.type === 'tuple')
			return { type: 'liste', list: val.elements.map((e) => this.toSymbolEntry(e)) };
		if (val.type === 'geoValue') return { type: 'nombre', value: geoToNumber(val.value) };
		return { type: 'nombre', value: 0 };
	}

	private fromSymbolEntry(entry: SymbolEntry): ResolvedValue {
		if (entry.type === 'nombre') return { type: 'nombre', value: entry.value ?? 0 };
		if (entry.type === 'liste') {
			return {
				type: 'tuple',
				elements: (entry.list ?? []).map((e) => this.fromSymbolEntry(e))
			};
		}
		return { type: 'element', figureId: entry.figureId!, elementType: entry.type };
	}
}
