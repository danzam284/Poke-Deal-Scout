import type { ParsedCardListing } from "../../../parser/types";

export interface PokemonCardEntity {
  productId: number;
  name: string;
  canonicalName: string;
  cardNumber: string;
  setName: string;
  setAbbr?: string;
  rarity?: string;
  variant: string;
  marketPrice?: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  imageUrl?: string;
  updatedAt: string;
}

export interface ICardRepository {
  upsertCards(cards: PokemonCardEntity[]): void;
  clearAll(): void;

  findByNameBidirectional(cardName: string): PokemonCardEntity[];
  findByNumber(cardNumberNum: string): PokemonCardEntity[];
  findBySetLike(setPattern: string): PokemonCardEntity[];
}