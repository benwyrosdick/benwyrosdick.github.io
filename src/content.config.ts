import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,markdown}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    image2: z.string().optional(),
    excerpt: z.string().optional(),
    author: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { blog };
