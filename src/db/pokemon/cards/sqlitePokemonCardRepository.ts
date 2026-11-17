import type { CardVariant, ParsedCardListing } from "../../../parser/types";
import type { ICardRepository, PokemonCardEntity } from "./types";
import { Database } from "bun:sqlite";

export class SQLiteCardRepository implements ICardRepository {
  private db: Database;

  constructor(dbPath: string = "cards.db") {
    this.db = new Database(dbPath);
    this.initTable();
  }

  private initTable(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pokemon_cards (
        product_id INTEGER,
        variant TEXT,
        name TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        card_number TEXT NOT NULL,
        set_name TEXT NOT NULL,
        set_abbr TEXT,
        rarity TEXT,
        market_price REAL,
        low_price REAL,
        mid_price REAL,
        high_price REAL,
        image_url TEXT,
        updated_at TEXT,
        PRIMARY KEY (product_id, variant)
      );
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_lookup ON pokemon_cards (canonical_name, card_number, variant);`);
  }

  public clearAll(): void {
    this.db.run(`DELETE FROM pokemon_cards;`);
  }

  public upsertCards(cards: PokemonCardEntity[]): void {
    const insert = this.db.prepare(`
      INSERT INTO pokemon_cards (
        product_id, variant, name, canonical_name, card_number, 
        set_name, set_abbr, rarity, market_price, low_price, 
        mid_price, high_price, image_url, updated_at
      ) VALUES (
        $productId, $variant, $name, $canonicalName, $cardNumber, 
        $setName, $setAbbr, $rarity, $marketPrice, $lowPrice, 
        $midPrice, $highPrice, $imageUrl, $updatedAt
      )
      ON CONFLICT(product_id, variant) DO UPDATE SET
        market_price = excluded.market_price,
        low_price = excluded.low_price,
        mid_price = excluded.mid_price,
        high_price = excluded.high_price,
        image_url = excluded.image_url,
        updated_at = excluded.updated_at;
    `);

    const insertMany = this.db.transaction((items: PokemonCardEntity[]) => {
      for (const card of items) {
        insert.run({
          $productId: card.productId,
          $variant: card.variant,
          $name: card.name,
          $canonicalName: card.canonicalName,
          $cardNumber: card.cardNumber,
          $setName: card.setName,
          $setAbbr: card.setAbbr || null,
          $rarity: card.rarity || null,
          $marketPrice: card.marketPrice ?? null,
          $lowPrice: card.lowPrice ?? null,
          $midPrice: card.midPrice ?? null,
          $highPrice: card.highPrice ?? null,
          $imageUrl: card.imageUrl || null,
          $updatedAt: card.updatedAt,
        });
      }
    });

    insertMany(cards);
  }

  public findMatch(parsed: ParsedCardListing): PokemonCardEntity | null {
    if (!parsed.isValidSingleCard || !parsed.canonicalName) {
      return null;
    }

    const candidateVariants = this.getCandidateVariants(parsed.variant);
    const hasCardNumber = parsed.cardNumber && parsed.cardNumber !== "none";
    const cleanSetPattern = parsed.setName
      ? `%${parsed.setName.toLowerCase().trim()}%`
      : null;

    for (const variant of candidateVariants) {
      // Tier 1: Exact name + card number + fuzzy set name + variant
      if (hasCardNumber && cleanSetPattern) {
        const row = this.db
          .query(`
            SELECT * FROM pokemon_cards
            WHERE canonical_name = $name
              AND (card_number = $number OR card_number LIKE $number || '/%')
              AND LOWER(set_name) LIKE $setPattern
              AND variant = $variant
              AND (market_price IS NOT NULL OR mid_price IS NOT NULL)
            LIMIT 1;
          `)
          .get({
            $name: parsed.canonicalName,
            $number: parsed.cardNumber,
            $setPattern: cleanSetPattern,
            $variant: variant,
          }) as Record<string, any> | null;

        if (row) return this.mapRowToEntity(row);
      }

      // Tier 2: Card number + fuzzy set name + variant (handles slight name variations like "Team Rocket's Meowth" vs "Meowth")
      if (hasCardNumber && cleanSetPattern) {
        const row = this.db
          .query(`
            SELECT * FROM pokemon_cards
            WHERE card_number = $number
              AND LOWER(set_name) LIKE $setPattern
              AND variant = $variant
              AND (market_price IS NOT NULL OR mid_price IS NOT NULL)
            LIMIT 1;
          `)
          .get({
            $number: parsed.cardNumber,
            $setPattern: cleanSetPattern,
            $variant: variant,
          }) as Record<string, any> | null;

        if (row) return this.mapRowToEntity(row);
      }

      // Tier 3: Name + card number + variant (when seller omits the set name entirely)
      if (hasCardNumber) {
        const rows = this.db
          .query(`
            SELECT * FROM pokemon_cards
            WHERE canonical_name = $name
              AND card_number = $number
              AND variant = $variant
              AND (market_price IS NOT NULL OR mid_price IS NOT NULL)
            LIMIT 2;
          `)
          .all({
            $name: parsed.canonicalName,
            $number: parsed.cardNumber,
            $variant: variant,
          }) as Record<string, any>[];

        // Only accept set-less match if unambiguous (1 unique productId)
        const uniqueProductIds = new Set(rows.map((r) => r.product_id));
        if (uniqueProductIds.size === 1) {
          return this.mapRowToEntity(rows[0] || {});
        }
      }
    }

    return null;
  }

  private getCandidateVariants(primary: CardVariant): string[] {
    // Sellers rarely write "Unlimited Holofoil" or "Unlimited"—fall back automatically
    switch (primary) {
      case "Holofoil":
        return ["Holofoil", "Unlimited Holofoil"];
      case "Normal":
        return ["Normal", "Unlimited"];
      case "Unlimited Holofoil":
        return ["Unlimited Holofoil", "Holofoil"];
      case "Unlimited":
        return ["Unlimited", "Normal"];
      default:
        return [primary];
    }
  }

  private mapRowToEntity(row: Record<string, any>): PokemonCardEntity {
    return {
      productId: row.product_id,
      name: row.name,
      canonicalName: row.canonical_name,
      cardNumber: row.card_number,
      setName: row.set_name,
      setAbbr: row.set_abbr ?? undefined,
      rarity: row.rarity ?? undefined,
      variant: row.variant,
      marketPrice: row.market_price ?? undefined,
      lowPrice: row.low_price ?? undefined,
      midPrice: row.mid_price ?? undefined,
      highPrice: row.high_price ?? undefined,
      imageUrl: row.image_url ?? undefined,
      updatedAt: row.updated_at,
    };
  }
};