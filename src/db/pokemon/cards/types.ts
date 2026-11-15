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
  findByCardNumberAndSet(cardNumber: string, setName: string, variant: string): PokemonCardEntity | null;
}