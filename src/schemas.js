import { z } from 'zod';

export const EmailSchema = z.object({
  sender: z.string().max(1_000).optional().default(''),
  subject: z.string().max(2_000).optional().default(''),
  body: z.string().max(50_000).optional().default(''),
});

export const ClassificationSchema = z.object({
  category: z.enum(['technical', 'management']),
  priority: z.enum(['high', 'medium', 'low']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  reasons: z.array(z.string()),
  action_items: z.array(z.string()),
});
