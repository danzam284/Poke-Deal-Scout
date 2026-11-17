const JUNK_KEYWORDS = [
  "lot",
  "bulk",
  "binder",
  "collection",
  "box",
  "pack",
  "tins",
  "psa",
  "bgs",
  "cgc",
  "sgc",
  "graded",
  "slab",
  "code",
  "custom",
  "proxy",
  "replica",
];

export function shouldSkipListing(title: string): boolean {
  const lower = title.toLowerCase();

  for (const word of JUNK_KEYWORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) {
      return true;
    }
  }

  return false;
}