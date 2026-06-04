import { z } from 'zod';

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'done']);

const optionalDateTimeSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), {
    message: 'Use a valid date/time.',
  })
  .transform((value) => (value ? new Date(value).toISOString() : null));

export const createTaskSchema = z.object({
  tripId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters.'),
  description: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable(),
  assignedTo: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .refine((value) => value === null || z.string().uuid().safeParse(value).success, {
      message: 'Assignee must be a trip member.',
    }),
  dueAt: optionalDateTimeSchema,
});

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: taskStatusSchema,
});

export const createPlanningNoteSchema = z.object({
  tripId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable(),
  body: z.string().trim().min(2, 'Note must be at least 2 characters.'),
  pinned: z.boolean(),
});

export const createPackingItemSchema = z.object({
  tripId: z.string().uuid(),
  createdBy: z.string().uuid(),
  label: z.string().trim().min(2, 'Item must be at least 2 characters.'),
  quantity: z
    .string()
    .trim()
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => Number.isInteger(value) && value > 0, {
      message: 'Quantity must be a positive whole number.',
    }),
  assignedTo: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .refine((value) => value === null || z.string().uuid().safeParse(value).success, {
      message: 'Assignee must be a trip member.',
    }),
});

export type CreateTaskFormValues = z.input<typeof createTaskSchema>;
export type ParsedCreateTaskFormValues = z.output<typeof createTaskSchema>;
export type UpdateTaskStatusFormValues = z.infer<typeof updateTaskStatusSchema>;
export type CreatePlanningNoteFormValues = z.input<typeof createPlanningNoteSchema>;
export type ParsedCreatePlanningNoteFormValues = z.output<typeof createPlanningNoteSchema>;
export type CreatePackingItemFormValues = z.input<typeof createPackingItemSchema>;
export type ParsedCreatePackingItemFormValues = z.output<typeof createPackingItemSchema>;
