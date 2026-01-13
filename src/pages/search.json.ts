import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('posts');
  
  const searchIndex = posts
    .filter(post => !post.data.draft)
    .map(post => {
      const slug = post.data.slug || post.id;
      return {
        title: post.data.title,
        description: post.data.description,
        url: `/posts/${slug}.html`,
        date: post.data.published,
        tags: post.data.tags
      };
    });

  return new Response(JSON.stringify(searchIndex), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
