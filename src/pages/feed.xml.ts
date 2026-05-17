import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteConfig } from '../site.config';
import { getSortedPosts } from '../lib/posts';
import { excerpt } from '../lib/format';

export async function GET(context: APIContext) {
  const posts = (await getSortedPosts()).slice(0, 10);

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt ?? excerpt(post.body ?? '', 80),
      link: `/posts/${post.id}/`,
      categories: [
        ...(post.data.tags ?? []),
        ...(post.data.category ? [post.data.category] : []),
      ],
    })),
  });
}
