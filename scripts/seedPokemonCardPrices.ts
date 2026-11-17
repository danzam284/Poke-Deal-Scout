import { SQLiteCardRepository } from "../src/db/pokemon/cards/sqlitePokemonCardRepository";
import type { PokemonCardEntity } from "../src/db/pokemon/cards/types";
import { TCGCSVClient } from "../src/pricing/pokemon/client/tscgsvClient";
import { PokemonPricingService } from "../src/pricing/pokemon/pokemonPricingService";


function normalizeName(name: string): string {
  // Strip trailing set numbers like " - 003/167" and punctuation
  const cleaned = name.replace(/\s*-\s*\d+.*$/, "");
  return cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function normalizeCardNumber(num: string): string {
  if (!num || num.toLowerCase() === "none") return "none";
  
  const raw = num.trim();
  const parts = raw.replace(/\s*\/\s*/g, "/").split("/");
  
  // Strip leading zeros from numerator (keeping any alpha prefix like "tg")
  const cleanNum = parts[0]!!.toLowerCase().replace(/^([a-z]*)0+(\d+)$/, "$1$2");
  // Strip leading zeros from denominator if present
  const cleanDen = parts[1] ? parts[1].replace(/^0+(\d+)$/, "$1") : null;
  
  return cleanDen ? `${cleanNum}/${cleanDen}` : cleanNum;
}

async function seedDatabase() {
  console.log("Starting Pokémon card database seeding...");
  const client = new TCGCSVClient();
  const pricingService = new PokemonPricingService(client);
  const repository = new SQLiteCardRepository();

  console.log("Wiping existing card records...");
  repository.clearAll();

  const groups = await pricingService.fetchAllSets();
  console.log(`Found ${groups.length} sets/groups to process.`);

  let totalInserted = 0;

  for (const group of groups) {
    try {
      console.log(`Processing set: ${group.name} (ID: ${group.groupId})`);
      const { products, prices } = await pricingService.fetchSetCatalog(group.groupId);

      const cardEntities: PokemonCardEntity[] = [];
      const updatedAt = new Date().toISOString();

      for (const product of products) {
        // Filter out non-cards (booster packs, boxes, tins lack "Number" and "Rarity")
        const extData: Record<string, string> = {};
        if (product.extendedData) {
          for (const item of product.extendedData) {
            extData[item.name] = item.value;
          }
        }

        if (!extData["Number"] && !extData["Rarity"]) {
          continue; // Skip sealed products
        }

        const cardNumber = extData["Number"] ? normalizeCardNumber(extData["Number"]) : "none";
        const rarity = extData["Rarity"] || undefined;
        const canonicalName = normalizeName(product.name);

        const productPrices = prices.filter(p => p.productId === product.productId);

        if (productPrices.length === 0) {
          cardEntities.push({
            productId: product.productId,
            name: product.name,
            canonicalName,
            cardNumber,
            setName: group.name,
            setAbbr: group.abbreviation,
            rarity,
            variant: "Normal",
            updatedAt,
          });
        } else {
          for (const p of productPrices) {
            cardEntities.push({
              productId: product.productId,
              name: product.name,
              canonicalName,
              cardNumber,
              setName: group.name,
              setAbbr: group.abbreviation,
              rarity,
              variant: p.subTypeName || "Normal",
              marketPrice: p.marketPrice,
              lowPrice: p.lowPrice,
              midPrice: p.midPrice,
              highPrice: p.highPrice,
              imageUrl: product.imageUrl,
              updatedAt,
            });
          }
        }
      }

      if (cardEntities.length > 0) {
        repository.upsertCards(cardEntities);
        totalInserted += cardEntities.length;
        console.log(`-> Stored ${cardEntities.length} card variants for ${group.name}`);
      }
    } catch (error) {
      console.error(`Error processing group ${group.name} (${group.groupId}):`, error);
    }
  }

  console.log(`Seeding complete! Total card variants stored: ${totalInserted}`);
}

seedDatabase().catch(console.error);