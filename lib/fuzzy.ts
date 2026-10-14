/**
 * Typo-tolerant matching for place search.
 *
 * "jabi laek" → Jabi Lake Mall, "sheratn" → Sheraton, "nat hosp" → National Hospital,
 * "aminu kano cres" → Aminu Kano Crescent, "wusemarket" → Wuse Market.
 */

/** Common abbreviations people type in Abuja addresses. */
const ABBREV: Record<string, string> = {
  rd: "road",
  st: "street",
  str: "street",
  cres: "crescent",
  cresc: "crescent",
  ave: "avenue",
  av: "avenue",
  jn: "junction",
  jnc: "junction",
  jct: "junction",
  junc: "junction",
  mkt: "market",
  hosp: "hospital",
  gen: "general",
  univ: "university",
  uni: "university",
  est: "estate",
  rbt: "roundabout",
  nat: "national",
  natl: "national",
  intl: "international",
  sch: "school",
  govt: "government",
  fed: "federal",
  sec: "secretariat",
  plz: "plaza",
  expy: "expressway",
  expwy: "expressway",
  ph: "phase",
}

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter(Boolean)
    .map((t) => ABBREV[t] ?? t)
}

/**
 * Optimal-string-alignment distance (Levenshtein + adjacent swaps), giving up early once it
 * exceeds `max`. Returns max + 1 when the strings are further apart than that.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur.push(v)
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

/** How many typos we forgive for a word of this length. */
export function allowedTypos(len: number) {
  if (len <= 3) return 0
  if (len <= 5) return 1
  if (len <= 8) return 2
  return 3
}

/**
 * How well a typed word matches a word in a place name (0–1).
 * `typing` is true for the last word, which may be unfinished.
 */
export function wordScore(q: string, w: string, typing: boolean): number {
  if (q === w) return 1
  if (w.startsWith(q)) {
    if (typing) return 0.88 + 0.1 * (q.length / w.length)
    if (q.length >= 3) return 0.8
  }
  const typos = allowedTypos(q.length)
  if (typos > 0) {
    const d = editDistance(q, w, typos)
    if (d <= typos) return Math.max(0.5, 0.86 - 0.14 * d)
    // Unfinished word with a typo: compare against the start of the name word.
    if (typing && q.length >= 4 && w.length > q.length) {
      const t = allowedTypos(q.length)
      const dp = Math.min(editDistance(q, w.slice(0, q.length), t), editDistance(q, w.slice(0, q.length + 1), t))
      if (dp <= t) return Math.max(0.5, 0.78 - 0.14 * dp)
    }
  }
  if (q.length >= 4 && w.includes(q)) return 0.6
  return 0
}

export interface Searchable {
  /** Token lists to match against: the name first, then any aliases. */
  tokenSets: string[][]
  /** tokenSets passed through expandTokens(), precomputed for speed */
  expanded?: string[][]
  /** Words describing where it is ("Street, Gwarinpa"); they can match but count for less. */
  context?: string[]
}

/** Words people add that don't identify a place; a query may contain one that matches nothing. */
const GENERIC = new Set([
  "avenue", "street", "road", "close", "crescent", "way", "drive", "lane", "junction", "by", "near", "opposite",
  "beside", "behind", "off", "the", "of", "in", "at", "and", "abuja", "fct", "nigeria", "plot", "no", "number",
  "house", "estate", "phase", "district", "area", "zone", "garki", "wuse",
])

/** Words in a name plus adjacent pairs joined, so "wusemarket" matches "Wuse Market". */
export function expandTokens(tokens: string[]) {
  const out = [...tokens]
  for (let i = 0; i < tokens.length - 1; i++) out.push(tokens[i] + tokens[i + 1])
  return out
}

/**
 * Score a query against one place (0–1). Every typed word must match something, except
 * that one stray word is forgiven in queries of three or more words.
 */
/** One cache per typed word: name word → score. Reuse it across all places for one query. */
export type ScoreCache = Map<string, number>[]

function cachedScore(cache: ScoreCache, i: number, q: string, w: string, typing: boolean) {
  const m = (cache[i] ??= new Map())
  let s = m.get(w)
  if (s === undefined) {
    s = wordScore(q, w, typing)
    m.set(w, s)
  }
  return s
}

export function matchScore(query: string[], item: Searchable, cache: ScoreCache, lenient = false): number {
  if (!query.length) return 0
  let best = 0
  for (let t = 0; t < item.tokenSets.length; t++) {
    const tokens = item.tokenSets[t]
    const words = item.expanded?.[t] ?? expandTokens(tokens)
    let sum = 0
    let missed = 0
    let missedDistinctive = 0
    let distinctiveSum = 0
    let distinctiveCount = 0
    for (let i = 0; i < query.length; i++) {
      const q = query[i]
      const typing = i === query.length - 1
      let top = 0
      for (const w of words) {
        const s = cachedScore(cache, i, q, w, typing)
        if (s > top) top = s
        if (top === 1) break
      }
      // Not in the name? It may name the area: "gwarinpa" for an avenue in Gwarinpa.
      // Only a near-exact area word counts, so "kubwa" doesn't match somewhere in "Kukwaba".
      if (top < 0.8 && item.context) {
        for (const w of item.context) {
          const c = cachedScore(cache, i, q, w, typing)
          if (c >= 0.85) top = Math.max(top, c * 0.75)
        }
      }
      const distinctive = !GENERIC.has(q) && !/^\d/.test(q)
      if (distinctive) {
        distinctiveCount++
        distinctiveSum += top
      }
      if (top === 0) {
        missed++
        if (distinctive) missedDistinctive++
      }
      sum += top
    }
    // Lenient mode (used only when nothing matches fully): partial matches like "gwarinpa 3rd" → Gwarinpa.
    // It scores only the distinctive words, so "3rd avenue" alone can't pull in an avenue elsewhere.
    if (lenient ? missedDistinctive > 0 || !distinctiveCount : missed > (query.length >= 3 ? 1 : 0) || missedDistinctive > 0) continue
    let score = lenient ? (distinctiveSum / distinctiveCount) * 0.6 : sum / query.length - missed * 0.2
    // Prefer names that start the way the query starts, and that don't have lots of extra words.
    if (wordScore(query[0], tokens[0] ?? "", query.length === 1) >= 0.8) score += 0.06
    score -= Math.min(0.12, Math.max(0, tokens.length - query.length) * 0.03)
    if (score > best) best = score
  }
  return Math.min(1, best)
}

/**
 * Replace misspelled words with the closest word we know (from place names), so the online
 * search gets "jabi lake" instead of "jabi laek".
 */
export function correctWords(query: string[], vocabulary: Map<string, number>): string[] {
  return query.map((q) => {
    if (vocabulary.has(q) || q.length < 4) return q
    let best: { w: string; d: number; f: number } | null = null
    const typos = allowedTypos(q.length)
    for (const [w, f] of vocabulary) {
      if (Math.abs(w.length - q.length) > typos) continue
      const d = editDistance(q, w, typos)
      if (d <= typos && (!best || d < best.d || (d === best.d && f > best.f))) best = { w, d, f }
    }
    return best?.w ?? q
  })
}
