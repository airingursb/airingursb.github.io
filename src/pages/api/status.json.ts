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
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
