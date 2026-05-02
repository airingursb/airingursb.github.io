import type { APIContext } from 'astro';
import articles from '../../data/articles.json';
import music from '../../data/music.json';
import nowplaying from '../../data/nowplaying.json';
import raindrop from '../../data/raindrop.json';
import highlights from '../../data/highlights.json';
import github from '../../data/github.json';
import channel from '../../data/telegram.json';
import douban from '../../../data/douban.json';
import localData from '../../data/local_data.json';
import photos from '../../data/photos.json';

// Slim photo summary for downstream consumers (AI chat live state, etc.)
// Only 8 most recent dated photos; drop heavy fields like histogram/variants.
const recentPhotos = (photos as Array<any>)
  .filter((p) => p.takenAt)
  .slice(0, 8)
  .map((p) => ({
    slug: p.slug,
    title: p.title || null,
    takenAt: p.takenAt,
    city: p.place?.city ?? null,
    country: p.place?.country ?? null,
  }));

export async function GET(_context: APIContext) {
  const data = {
    articles,
    music: {
      totalScrobbles: music.totalScrobbles,
      registeredYear: music.registeredYear,
      periods: music.periods,
    },
    nowplaying,
    bookmarks: raindrop.bookmarks,
    highlights: {
      total: highlights.total,
      highlights: highlights.highlights,
    },
    github,
    channel,
    books: douban.books,
    movies: douban.movies,
    vibe: localData.vibeCoding,
    photos: recentPhotos,
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
