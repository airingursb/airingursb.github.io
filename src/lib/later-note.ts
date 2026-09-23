import { z } from 'astro/zod';

export const laterNoteSchema = z.object({
  date: z.string().date(),
  title: z.string().trim().min(1),
  paragraphs: z.array(z.string().trim().min(1)).min(1),
});

export type LaterNoteContent = Readonly<z.infer<typeof laterNoteSchema>>;
