// Compares a bank-resolved account name against the name a farmer typed
// during sign-up (build spec section 7.8). Banks return names like
// "ADEYEMI JOHN OLUWASEUN"; users type "John Adeyemi" — exact string
// comparison would reject the overwhelming majority of legitimate users, so
// this is order-insensitive and per-token fuzzy instead.
//
// This copy is used only for live UI feedback in bank-details.tsx while
// typing. supabase/functions/_shared/nameMatch.ts is a duplicate used by the
// submit-bank-account Edge Function, which is the actual source of truth for
// what gets persisted — keep both in sync if this algorithm changes.

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // strip diacritics
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(name: string): string[] {
  return normalize(name).split(' ').filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export type NameMatchStatus = 'verified' | 'review' | 'blocked';

export type NameMatchResult = {
  score: number;
  status: NameMatchStatus;
};

export function matchNames(resolvedName: string, typedName: string): NameMatchResult {
  const resolvedTokens = tokenize(resolvedName);
  const typedTokens = tokenize(typedName);

  if (resolvedTokens.length === 0 || typedTokens.length === 0) {
    return { score: 0, status: 'blocked' };
  }

  // Greedy best-match per typed token against unused resolved tokens —
  // order-insensitive, and each resolved token can only satisfy one typed
  // token (so "John John" can't double-count against a single "John").
  let exactMatches = 0;
  let totalSimilarity = 0;
  const consumed = new Set<number>();

  for (const typedToken of typedTokens) {
    let bestScore = 0;
    let bestIndex = -1;
    resolvedTokens.forEach((resolvedToken, index) => {
      if (consumed.has(index)) return;
      const similarity = tokenSimilarity(typedToken, resolvedToken);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestIndex = index;
      }
    });
    if (bestIndex !== -1) {
      consumed.add(bestIndex);
      totalSimilarity += bestScore;
      if (bestScore === 1) {
        exactMatches += 1;
      }
    }
  }

  const sharedTokenRatio = consumed.size / Math.max(resolvedTokens.length, typedTokens.length);
  const avgSimilarity = totalSimilarity / typedTokens.length;
  const score = Math.round(((sharedTokenRatio + avgSimilarity) / 2) * 100) / 100;

  let status: NameMatchStatus;
  if (score >= 0.8 || exactMatches >= 2) {
    status = 'verified';
  } else if (score >= 0.5) {
    status = 'review';
  } else {
    status = 'blocked';
  }

  return { score, status };
}
