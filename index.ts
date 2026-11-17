import { SQLiteCardRepository } from "./src/db/pokemon/cards/sqlitePokemonCardRepository";
import { GroqProvider } from "./src/llm/groq";
import { ListingParserService } from "./src/parser/listingParserService";


const repo = new SQLiteCardRepository();
const llm = new GroqProvider();
const parser = new ListingParserService(llm);

const sampleListing = {
  source: "ebay" as const,
  title: "Dragonite 19/62 Fossil Regular",
  price: 4.5,
  itemSpecifics: {
    Condition: "Ungraded - Lightly played (Excellent): Not in original packaging or professionally graded",
    Set: "Fossil",
    "Card Name": "Dragonite",
    "Card Number": "19/62",
    Finish: "Regular",
  },
};

const parsed = await parser.parseListing(sampleListing);
console.log("Parsed LLM Output:", parsed);

const matchedCard = repo.findMatch(parsed);
console.log("Matched DB Card:", matchedCard);