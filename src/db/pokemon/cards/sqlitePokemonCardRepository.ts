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

  public findByNameBidirectional(cardName: string): PokemonCardEntity[] {
  const clean = cardName.toLowerCase().trim();
  if (!clean) return [];

  const escaped = this.escapeLike(clean);
  const listingPattern = `%${escaped}%`;
  const dbLikePattern = `%${escaped}%`;

  const rows = this.db
    .query(`
      SELECT * FROM pokemon_cards
      WHERE (
        LOWER(canonical_name) LIKE $listingPattern ESCAPE '\\'
        OR $cleanName LIKE $dbLikePattern ESCAPE '\\'
      )
      AND (market_price IS NOT NULL OR mid_price IS NOT NULL)
    `)
    .all({
      $listingPattern: listingPattern,
      $cleanName: clean,
      $dbLikePattern: dbLikePattern,
    }) as Record<string, any>[];

  return rows.map(this.mapRowToEntity);
}

  public findByNumber(cardNumberNum: string): PokemonCardEntity[] {
    const rows = this.db
      .query(`
        SELECT * FROM pokemon_cards
        WHERE (LOWER(card_number) = LOWER($num) OR LOWER(card_number) LIKE LOWER($num) || '/%')
          AND (market_price IS NOT NULL OR mid_price IS NOT NULL)
      `)
      .all({ $num: cardNumberNum }) as Record<string, any>[];

    return rows.map(this.mapRowToEntity);
  }

  public findBySetLike(setPattern: string): PokemonCardEntity[] {
    const rows = this.db
      .query(`
        SELECT * FROM pokemon_cards
        WHERE LOWER(set_name) LIKE LOWER($setPattern)
          AND (market_price IS NOT NULL OR mid_price IS NOT NULL)
      `)
      .all({ $setPattern: setPattern }) as Record<string, any>[];

    return rows.map(this.mapRowToEntity);
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

    private escapeLike(value: string): string {
        return value.replace(/[\\%_]/g, "\\$&");
    }
}