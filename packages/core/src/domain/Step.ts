import type { StepSchema } from '../yaml/schema';
import type { z } from 'zod';

export type BaseStep = z.infer<typeof StepSchema>;
export type StepAction = BaseStep['action'];
