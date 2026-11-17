import type { LLMProvider } from "../llm/types";
import { shouldSkipListing } from "./listingPreFilter";
import type { ParsedCardListing, RawMarketplaceListing } from "./types";

const SYSTEM_PROMPT = `You are a Pokémon TCG data normalization engine. Extract structured card attributes from messy marketplace listings and return ONLY a valid JSON object matching this exact schema:

{
  "isValidSingleCard": boolean,
  "rejectReason": string | null,
  "canonicalName": string,
  "cardNumber": string,
  "setName": string | null,
  "variant": "Normal" | "Holofoil" | "Reverse Holofoil" | "1st Edition" | "1st Edition Holofoil" | "Unlimited" | "Unlimited Holofoil",
  "condition": "NM" | "LP" | "MP" | "HP" | "DMG" | "UNKNOWN",
  "language": string
}

STRICT RULES:
1. "isValidSingleCard": Set to false if the listing is a lot/bundle of multiple cards, sealed booster pack/box, graded slab (PSA, BGS, CGC, SGC), digital code card, proxy/custom/fan-art card, or empty binder/coin. Explain briefly in "rejectReason".
2. "canonicalName": The Pokémon or Trainer/Energy card name ONLY. Include mechanic suffixes like "ex", "EX", "GX", "V", "VMAX", "VSTAR", "LV.X". Strip set names, card numbers, rarities, and words like "Holo" or "Mint". Lowercase, no punctuation (e.g. "Charizard ex - 223/197" -> "charizard ex").
3. "cardNumber": Extract ONLY the collector number numerator before the slash, stripping leading zeros (e.g. "166/159" -> "166", "003/167" -> "3", "TG05/TG30" -> "tg5"). If none exists, output "none".
4. "setName": Extract the English expansion set name without set codes if possible (e.g. "Sv09: Journey Together" -> "Journey Together", "SWSH12 Silver Tempest" -> "Silver Tempest"). Null if unknown.
5. "variant": Map the finish strictly to one of the 7 allowed enum values. Default to "Holofoil" if "Holo" is mentioned on modern cards, or "Normal" if unmentioned. For vintage Wizards of the Coast cards (1999-2003), use "1st Edition Holofoil" / "Unlimited Holofoil" / "1st Edition" / "Unlimited".
6. "condition": Map seller condition to NM (Near Mint/Mint), LP (Lightly Played/Excellent), MP (Moderately Played/Good), HP (Heavily Played), DMG (Damaged/Creased), or UNKNOWN.`;

export class ListingParserService {
  constructor(private llm: LLMProvider) {}

  async parseListing(listing: RawMarketplaceListing): Promise<ParsedCardListing> {
    const prompt = this.buildUserPrompt(listing);

    const rawResponse = await this.llm.sendText(prompt, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.1,
      jsonMode: true,
    });

    const parsed = JSON.parse(rawResponse) as ParsedCardListing;
    return this.postProcess(parsed);
  }

  private buildUserPrompt(listing: RawMarketplaceListing): string {
    const specificsText = listing.itemSpecifics
      ? Object.entries(listing.itemSpecifics)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
      : "None provided";

    return [
      `Source: ${listing.source}`,
      `Title: ${listing.title}`,
      `Item Specifics:\n${specificsText}`,
      `Description: ${listing.description?.slice(0, 600) || "None"}`,
    ].join("\n\n");
  }

  private postProcess(data: ParsedCardListing): ParsedCardListing {
    // Enforce deterministic normalization in code as a safety net over the 8B LLM
    const cleanName = (data?.canonicalName || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    let rawNum = (data.cardNumber || "none").trim();
    if (rawNum.toLowerCase() !== "none") {
        // Normalize spacing around slashes (e.g., " 03 / 167 " -> "03/167")
        const parts = rawNum.replace(/\s*\/\s*/g, "/").split("/");
        const cleanNum = parts[0]!!.replace(/^([a-z]*)0+(\d+)$/, "$1$2"); // Remove leading zeros
        const cleanDen = parts[1] ? parts[1].replace(/^0+(\d+)$/, "$1") : null;
        
        rawNum = cleanDen ? `${cleanNum}/${cleanDen}` : cleanNum;
    }


    return {
      ...data,
      canonicalName: cleanName,
      cardNumber: rawNum || "none",
      language: data.language || "English",
    };
  }
}