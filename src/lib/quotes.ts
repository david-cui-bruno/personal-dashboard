// Curated calm quotes for the widget (#119): headlines the "all done" state and
// rotates daily. Deterministic by local day (#011/#083) so the quote is stable all
// day. Lowercase to match the app's voice (#061). Offline, no API.

export type Quote = { text: string; author: string };

export const QUOTES: readonly Quote[] = [
  { text: "how we spend our days is, of course, how we spend our lives.", author: "annie dillard" },
  { text: "we are what we repeatedly do.", author: "will durant" },
  { text: "the journey of a thousand miles begins with a single step.", author: "lao tzu" },
  { text: "do what you can, with what you have, where you are.", author: "theodore roosevelt" },
  { text: "you do not rise to the level of your goals; you fall to the level of your systems.", author: "james clear" },
  { text: "what you do every day matters more than what you do once in a while.", author: "gretchen rubin" },
  { text: "the secret of getting ahead is getting started.", author: "mark twain" },
  { text: "it always seems impossible until it's done.", author: "nelson mandela" },
  { text: "a year from now you may wish you had started today.", author: "karen lamb" },
  { text: "the best time to plant a tree was twenty years ago; the second best time is now.", author: "proverb" },
  { text: "little by little, one travels far.", author: "j.r.r. tolkien" },
  { text: "fall seven times, stand up eight.", author: "japanese proverb" },
  { text: "make each day your masterpiece.", author: "john wooden" },
  { text: "either you run the day, or the day runs you.", author: "jim rohn" },
  { text: "begin anywhere.", author: "john cage" },
  { text: "the days are long but the years are short.", author: "gretchen rubin" },
  { text: "happiness comes from your own actions.", author: "dalai lama" },
  { text: "go as far as you can see; when you get there you'll see further.", author: "thomas carlyle" },
  { text: "motivation gets you going; habit keeps you growing.", author: "john maxwell" },
  { text: "eighty percent of success is showing up.", author: "woody allen" },
  { text: "well done is better than well said.", author: "benjamin franklin" },
  { text: "discipline is the bridge between goals and accomplishment.", author: "jim rohn" },
  { text: "what gets measured gets managed.", author: "peter drucker" },
  { text: "the only way out is through.", author: "robert frost" },
  { text: "quality is not an act, it is a habit.", author: "will durant" },
  { text: "you'll never change your life until you change something you do daily.", author: "john maxwell" },
  { text: "start where you are; use what you have; do what you can.", author: "arthur ashe" },
  { text: "don't count the days; make the days count.", author: "muhammad ali" },
  { text: "small steps, every day.", author: "proverb" },
  { text: "tend the small things and the big things take care of themselves.", author: "proverb" },
];

// Stable FNV-1a hash so a given day always maps to the same quote.
function hashDay(day: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// The quote for a local day string (YYYY-MM-DD).
export function quoteForDay(day: string): Quote {
  return QUOTES[hashDay(day) % QUOTES.length];
}
