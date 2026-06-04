import { createPackingItemSchema, createPlanningNoteSchema, createTaskSchema } from './planning';

const uuid = '00000000-0000-4000-8000-000000000001';

describe('planning validation', () => {
  it('parses task due dates to ISO strings', () => {
    const parsed = createTaskSchema.parse({
      tripId: uuid,
      createdBy: uuid,
      title: 'Book train',
      description: '',
      assignedTo: '',
      dueAt: '2026-07-01T10:00:00Z',
    });

    expect(parsed.description).toBeNull();
    expect(parsed.assignedTo).toBeNull();
    expect(parsed.dueAt).toBe('2026-07-01T10:00:00.000Z');
  });

  it('requires useful note content', () => {
    expect(() =>
      createPlanningNoteSchema.parse({
        tripId: uuid,
        createdBy: uuid,
        title: '',
        body: ' ',
        pinned: false,
      }),
    ).toThrow();
  });

  it('requires a positive packing quantity', () => {
    expect(() =>
      createPackingItemSchema.parse({
        tripId: uuid,
        createdBy: uuid,
        label: 'Sunscreen',
        quantity: '0',
        assignedTo: null,
      }),
    ).toThrow();
  });
});
