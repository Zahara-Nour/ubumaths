/**
 * Riddle Auto-Select Tests
 * Tests daily riddle selection algorithm with difficulty rotation and recency filtering
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { autoSelectRiddleOfTheDay, checkAndAutoSelectToday } from './riddle-auto-select';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabase = () => {
	return {
		from: vi.fn(),
		rpc: vi.fn()
	} as unknown as SupabaseClient;
};

describe('autoSelectRiddleOfTheDay', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	describe('Date Already Has Riddle', () => {
		it('should return error if riddle already exists for target date', async () => {
			const targetDate = '2025-01-15';

			// Mock: Riddle already exists
			(mockSupabase.from as Mock).mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { riddle_id: 'existing-riddle-123' },
							error: null
						})
					})
				})
			});

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Une énigme du jour existe déjà pour cette date');
		});
	});

	describe('Difficulty Rotation Algorithm', () => {
		it('should rotate difficulty 1 -> 2 -> 3 -> 1', async () => {
			const targetDate = '2025-01-15';

			// Track which query we're on for riddle_of_the_day table
			let riddleOfDayQueryCount = 0;

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					riddleOfDayQueryCount++;

					if (riddleOfDayQueryCount === 1) {
						// First query: Check if riddle exists for target date
						return {
							select: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: null,
										error: null
									})
								})
							})
						};
					} else if (riddleOfDayQueryCount === 2) {
						// Second query: Get recent riddles
						return {
							select: vi.fn().mockReturnValue({
								gte: vi.fn().mockResolvedValue({
									data: [],
									error: null
								})
							})
						};
					} else {
						// Third query: Get last riddle for difficulty rotation
						return {
							select: vi.fn().mockReturnValue({
								lt: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockReturnValue({
											single: vi.fn().mockResolvedValue({
												data: {
													riddle: { difficulty: 2 }
												},
												error: null
											})
										})
									})
								})
							})
						};
					}
				} else if (table === 'riddles') {
					// Query for eligible riddles
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockImplementation((field: string, _value: unknown) => {
								if (field === 'status') {
									return {
										eq: vi.fn().mockImplementation((f: string, v: number) => {
											if (f === 'difficulty' && v === 3) {
												// Next should be 3 (since last was 2)
												return Promise.resolve({
													data: [{ id: 'riddle-diff-3' }],
													error: null
												});
											}
											return Promise.resolve({
												data: [],
												error: null
											});
										})
									};
								}
								return {
									eq: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								};
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({
				data: null,
				error: null
			});

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(true);
			expect(result.riddleId).toBe('riddle-diff-3');
		});

		it('should wrap from difficulty 3 to difficulty 1', async () => {
			const targetDate = '2025-01-15';

			let riddleOfDayQueryCount = 0;

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					riddleOfDayQueryCount++;

					if (riddleOfDayQueryCount === 1) {
						// First query: Check if riddle exists for target date
						return {
							select: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: null,
										error: null
									})
								})
							})
						};
					} else if (riddleOfDayQueryCount === 2) {
						// Second query: Get recent riddles
						return {
							select: vi.fn().mockReturnValue({
								gte: vi.fn().mockResolvedValue({
									data: [],
									error: null
								})
							})
						};
					} else {
						// Third query: Get last riddle for difficulty rotation
						return {
							select: vi.fn().mockReturnValue({
								lt: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockReturnValue({
											single: vi.fn().mockResolvedValue({
												data: { riddle: { difficulty: 3 } },
												error: null
											})
										})
									})
								})
							})
						};
					}
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockImplementation((field: string, _value: unknown) => {
								if (field === 'status') {
									return {
										eq: vi.fn().mockImplementation((f: string, v: number) => {
											if (f === 'difficulty' && v === 1) {
												// Should wrap to 1
												return Promise.resolve({
													data: [{ id: 'riddle-diff-1' }],
													error: null
												});
											}
											return Promise.resolve({
												data: [],
												error: null
											});
										})
									};
								}
								return {
									eq: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								};
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(true);
			expect(result.riddleId).toBe('riddle-diff-1');
		});

		it('should default to difficulty 1 when no previous riddle', async () => {
			const targetDate = '2025-01-15';

			let riddleOfDayQueryCount = 0;

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					riddleOfDayQueryCount++;

					if (riddleOfDayQueryCount === 1) {
						// First query: Check if riddle exists for target date
						return {
							select: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: null,
										error: null
									})
								})
							})
						};
					} else if (riddleOfDayQueryCount === 2) {
						// Second query: Get recent riddles
						return {
							select: vi.fn().mockReturnValue({
								gte: vi.fn().mockResolvedValue({
									data: [],
									error: null
								})
							})
						};
					} else {
						// Third query: Get last riddle for difficulty rotation
						return {
							select: vi.fn().mockReturnValue({
								lt: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockReturnValue({
											single: vi.fn().mockResolvedValue({
												data: null, // No previous riddle
												error: null
											})
										})
									})
								})
							})
						};
					}
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockImplementation((field: string, _value: unknown) => {
								if (field === 'status') {
									return {
										eq: vi.fn().mockImplementation((f: string, v: number) => {
											if (f === 'difficulty' && v === 1) {
												return Promise.resolve({
													data: [{ id: 'riddle-diff-1-default' }],
													error: null
												});
											}
											return Promise.resolve({
												data: [],
												error: null
											});
										})
									};
								}
								return {
									eq: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								};
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(true);
			expect(result.riddleId).toBe('riddle-diff-1-default');
		});
	});

	describe('30-Day Recency Filter', () => {
		it('should exclude riddles used in last 30 days', async () => {
			const targetDate = '2025-01-15';

			const recentRiddleIds = ['riddle-1', 'riddle-2', 'riddle-3'];

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({
								data: recentRiddleIds.map((id) => ({ riddle_id: id })),
								error: null
							}),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									not: vi.fn().mockReturnValue({
										// Should filter out recent riddles
										data: [{ id: 'riddle-new-eligible' }],
										error: null
									})
								})
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(true);
			expect(result.riddleId).toBe('riddle-new-eligible');
		});

		it('should handle case with no recent riddles', async () => {
			const targetDate = '2025-01-15';

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({
								data: [], // No recent riddles
								error: null
							}),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									// No 'not' filter should be applied
									data: [{ id: 'riddle-1' }, { id: 'riddle-2' }],
									error: null
								})
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(true);
			expect(['riddle-1', 'riddle-2']).toContain(result.riddleId);
		});
	});

	describe('Random Selection', () => {
		it('should randomly select from multiple eligible riddles', async () => {
			const targetDate = '2025-01-15';

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({ data: [], error: null }),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									data: [
										{ id: 'riddle-A' },
										{ id: 'riddle-B' },
										{ id: 'riddle-C' },
										{ id: 'riddle-D' },
										{ id: 'riddle-E' }
									],
									error: null
								})
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			// Run multiple times to check randomness
			const selectedIds = new Set<string>();
			for (let i = 0; i < 20; i++) {
				const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);
				if (result.riddleId) {
					selectedIds.add(result.riddleId);
				}
			}

			// Should select at least 2 different riddles in 20 runs (very high probability)
			expect(selectedIds.size).toBeGreaterThanOrEqual(2);
		});
	});

	describe('Fallback Mechanism', () => {
		it('should fallback to any difficulty if no riddles at target difficulty', async () => {
			const targetDate = '2025-01-15';

			let riddleOfDayQueryCount = 0;
			let riddlesQueryCount = 0;

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					riddleOfDayQueryCount++;

					if (riddleOfDayQueryCount === 1) {
						// First query: Check if riddle exists for target date
						return {
							select: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: null,
										error: null
									})
								})
							})
						};
					} else if (riddleOfDayQueryCount === 2) {
						// Second query: Get recent riddles
						return {
							select: vi.fn().mockReturnValue({
								gte: vi.fn().mockResolvedValue({
									data: [],
									error: null
								})
							})
						};
					} else {
						// Third query: Get last riddle for difficulty rotation
						return {
							select: vi.fn().mockReturnValue({
								lt: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockReturnValue({
											single: vi.fn().mockResolvedValue({
												data: { riddle: { difficulty: 2 } },
												error: null
											})
										})
									})
								})
							})
						};
					}
				} else if (table === 'riddles') {
					riddlesQueryCount++;

					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockImplementation((field: string, _value: unknown) => {
								if (field === 'status' && riddlesQueryCount === 1) {
									// First riddles query - target difficulty 3 (2+1)
									return {
										eq: vi.fn().mockResolvedValue({
											data: [], // No riddles at target difficulty
											error: null
										})
									};
								} else if (field === 'status' && riddlesQueryCount === 2) {
									// Fallback query (no difficulty filter)
									return Promise.resolve({
										data: [{ id: 'fallback-riddle-any-difficulty' }],
										error: null
									});
								}
								return {
									eq: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								};
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(true);
			expect(result.riddleId).toBe('fallback-riddle-any-difficulty');
		});

		it('should return error if no eligible riddles at all', async () => {
			const targetDate = '2025-01-15';

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({ data: [], error: null }),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									data: [], // No riddles at target difficulty
									error: null
								}),
								data: [], // No riddles in fallback either
								error: null
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Aucune énigme éligible disponible');
		});
	});

	describe('Published Status Filter', () => {
		it('should only select published riddles', async () => {
			const targetDate = '2025-01-15';

			let statusFilter: string | undefined;

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({ data: [], error: null }),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockImplementation((field: string, value: unknown) => {
								if (field === 'status') {
									statusFilter = value as string;
								}
								return {
									eq: vi.fn().mockReturnValue({
										data: [{ id: 'published-riddle' }],
										error: null
									})
								};
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(statusFilter).toBe('published');
		});
	});

	describe('RPC Function Call', () => {
		it('should call set_riddle_of_the_day RPC with correct parameters', async () => {
			const targetDate = '2025-01-15';
			const selectedId = 'selected-riddle-123';

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({ data: [], error: null }),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									data: [{ id: selectedId }],
									error: null
								})
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(mockSupabase.rpc).toHaveBeenCalledWith('set_riddle_of_the_day', {
				p_riddle_id: selectedId,
				p_assignment_date: targetDate
			});
		});

		it('should handle RPC errors', async () => {
			const targetDate = '2025-01-15';

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({ data: [], error: null }),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									data: [{ id: 'riddle-123' }],
									error: null
								})
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({
				data: null,
				error: { message: 'RPC failed' }
			});

			const result = await autoSelectRiddleOfTheDay(mockSupabase, targetDate);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Erreur lors de la définition de l'énigme");
		});
	});

	describe('Default Date', () => {
		it('should use today as default date when not specified', async () => {
			const today = new Date().toISOString().split('T')[0];

			(mockSupabase.from as Mock).mockImplementation((table: string) => {
				if (table === 'riddle_of_the_day') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockImplementation((field: string, value: string) => {
								expect(value).toBe(today);
								return {
									single: vi.fn().mockResolvedValue({ data: null, error: null })
								};
							}),
							gte: vi.fn().mockReturnValue({ data: [], error: null }),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				} else if (table === 'riddles') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									data: [{ id: 'riddle-today' }],
									error: null
								})
							})
						})
					};
				}
				return { select: vi.fn() };
			});

			(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

			await autoSelectRiddleOfTheDay(mockSupabase);
		});
	});

	describe('Error Handling', () => {
		it('should handle database errors gracefully', async () => {
			(mockSupabase.from as Mock).mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockRejectedValue(new Error('Database connection failed'))
					})
				})
			});

			const result = await autoSelectRiddleOfTheDay(mockSupabase, '2025-01-15');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Erreur inattendue');
		});
	});
});

describe('checkAndAutoSelectToday', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should skip selection if riddle already exists for today', async () => {
		const _today = new Date().toISOString().split('T')[0];

		(mockSupabase.from as Mock).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { riddle_id: 'existing-riddle' },
						error: null
					})
				})
			})
		});

		const result = await checkAndAutoSelectToday(mockSupabase);

		expect(result.success).toBe(true);
		expect(result.message).toBe('Énigme du jour déjà définie');
	});

	it('should auto-select if no riddle exists for today', async () => {
		const _today = new Date().toISOString().split('T')[0];

		let callCount = 0;
		(mockSupabase.from as Mock).mockImplementation((table: string) => {
			if (table === 'riddle_of_the_day') {
				callCount++;
				if (callCount === 1) {
					// First call in checkAndAutoSelectToday
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: null, // No existing riddle
									error: null
								})
							})
						})
					};
				} else {
					// Subsequent calls in autoSelectRiddleOfTheDay
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: null, error: null })
							}),
							gte: vi.fn().mockReturnValue({ data: [], error: null }),
							lt: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({
											data: { riddle: { difficulty: 1 } },
											error: null
										})
									})
								})
							})
						})
					};
				}
			} else if (table === 'riddles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								data: [{ id: 'auto-selected-riddle' }],
								error: null
							})
						})
					})
				};
			}
			return { select: vi.fn() };
		});

		(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

		const result = await checkAndAutoSelectToday(mockSupabase);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Énigme du jour sélectionnée automatiquement');
		expect(result.message).toContain('auto-selected-riddle');
	});

	it('should return error message if auto-selection fails', async () => {
		(mockSupabase.from as Mock).mockImplementation((table: string) => {
			if (table === 'riddle_of_the_day') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({ data: null, error: null })
						}),
						gte: vi.fn().mockReturnValue({ data: [], error: null }),
						lt: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: { riddle: { difficulty: 1 } },
										error: null
									})
								})
							})
						})
					})
				};
			} else if (table === 'riddles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								data: [], // No riddles available
								error: null
							}),
							data: [],
							error: null
						})
					})
				};
			}
			return { select: vi.fn() };
		});

		const result = await checkAndAutoSelectToday(mockSupabase);

		expect(result.success).toBe(false);
		expect(result.message).toBe('Aucune énigme éligible disponible');
	});
});
