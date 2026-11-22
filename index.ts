import { SQLiteCardRepository } from "./src/db/pokemon/cards/sqlitePokemonCardRepository";
import { PokemonCardMatchingService } from "./src/matching/pokemon/pokemonCardMatchingService";
import { GroqProvider } from "./src/llm/groq";
import { ListingParserService } from "./src/parser/listingParserService";

const repo = new SQLiteCardRepository();
const matchingService = new PokemonCardMatchingService(repo);
const llm = new GroqProvider();
const parser = new ListingParserService(llm);

const sampleListing = {
  source: "ebay" as const,
  title: "Pokemon Infernape LV.X DP10 Holo Promo Diamond and Pearl Promos Pokemon MP B",
  price: 20,
  itemSpecifics: {
    Condition: "Ungraded - Moderately played (Very good): Not in original packaging or professionally graded",
    Set: "Diamond and Pearl Promos",
    "Card Name": "Infernape LV.X",
    "Card Number": "DP10",
    Finish: "Holo",
    Language: "English",
    Rarity: "Promo"
  },
};

// 2. Parse the raw listing using LLM + normalization rules
const parsed = await parser.parseListing(sampleListing);

console.log("Parsed LLM Output:", parsed);

// 3. Find the match using the new wave-based matching service
const matchedCard = matchingService.findMatch(parsed);
console.log("Matched DB Card:", matchedCard);