import { getCollection } from 'astro:content';
import photos from '../../data/photos.json';
import { latestTravelPhoto } from './content';

/** Shared build snapshot for both desk scenes and their keepsake previews. */
export async function getDeskContent() {
  const generatedAt = Date.now();
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .filter(post => !post.id.startsWith('en/') && post.data.date.getTime() <= generatedAt)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const latest = posts[0];
  const post = latest ? { href: encodeURI('/posts/' + latest.id + '/'), title: latest.data.title, publishedAt: latest.data.date.getTime() } : null;
  const photo = latestTravelPhoto(photos, generatedAt);
  const selectedPhoto = photos.find(item => photo?.href === `/photos/${encodeURIComponent(item.slug)}/`);
  const postPreview = latest && post ? {
    title: post.title, href: post.href,
    dateLabel: latest.data.date.toISOString().slice(0, 10).replaceAll('-', '.'),
    excerpt: latest.data.description || '',
  } : null;
  const photoPreview = photo && selectedPhoto ? {
    title: photo.title, href: photo.href,
    dateLabel: selectedPhoto.takenAt.slice(0, 10).replaceAll('-', '.'),
    imageSrc: selectedPhoto.variants.medium.webp, imageAlt: photo.title,
    width: selectedPhoto.width, height: selectedPhoto.height,
  } : null;
  return { generatedAt, post, photo, postPreview, photoPreview };
}
