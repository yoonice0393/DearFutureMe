/**
 * Small mailcheck-style typo suggester. Compares the domain against a list of
 * common providers (including Philippine ones and school domains) and suggests
 * the closest match when it's a near miss.
 */

const DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.com.ph",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  // Real providers that sit one typo away from a bigger one; listed so they
  // are never "corrected" (mail.com -> gmail.com).
  "mail.com",
  "gmx.com",
  "zoho.com",
  "yandex.com",
  "email.com",
  "msn.com",
  // Philippine schools and government
  "up.edu.ph",
  "dlsu.edu.ph",
  "ateneo.edu",
  "obf.ateneo.edu",
  "student.ateneo.edu",
  "ust.edu.ph",
  "pup.edu.ph",
  "iskolarngbayan.pup.edu.ph",
  "feu.edu.ph",
  "mapua.edu.ph",
  "mymail.mapua.edu.ph",
  "plm.edu.ph",
  "adamson.edu.ph",
  "ue.edu.ph",
  "deped.gov.ph",
];

const TLDS = ["com", "com.ph", "ph", "edu.ph", "edu", "gov.ph", "net", "org", "me", "co"];

/** Optimal string alignment distance (Levenshtein + adjacent transpositions). */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function closest(value: string, list: string[], maxDist: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const candidate of list) {
    if (candidate === value) return null; // exact match: nothing to suggest
    const dist = distance(value, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return bestDist <= maxDist ? best : null;
}

/** Returns a corrected full address, or null if the address looks fine. */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (DOMAINS.includes(domain)) return null;

  // Whole-domain near miss (gmial.com, yahooo.com, gmail.co).
  const maxDist = domain.length <= 6 ? 1 : 2;
  const full = closest(domain, DOMAINS, maxDist);
  if (full) return `${local}@${full}`;

  // Unknown provider with a mistyped TLD (example.con -> example.com).
  const dot = domain.indexOf(".");
  if (dot > 0) {
    const name = domain.slice(0, dot);
    const tld = domain.slice(dot + 1);
    if (!TLDS.includes(tld)) {
      const fixed = closest(tld, TLDS, 1);
      if (fixed) return `${local}@${name}.${fixed}`;
    }
  }
  return null;
}
