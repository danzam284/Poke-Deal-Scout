export type CardCondition = "NM" | "LP" | "MP" | "HP" | "DMG" | "UNKNOWN";

export type CardVariant =
  | "Normal"
  | "Holofoil"
  | "Reverse Holofoil"
  | "1st Edition"
  | "1st Edition Holofoil"
  | "Unlimited"
  | "Unlimited Holofoil";

export interface RawMarketplaceListing {
  source: "ebay" | "tcgplayer" | "facebook";
  title: string;
  price: number;
  shippingCost?: number;
  description?: string;
  itemSpecifics?: Record<string, string>;
}

export interface ParsedCardListing {
  isValidSingleCard: boolean;
  rejectReason?: string;
  canonicalName: string;
  cardNumber: string;
  setName: string | null;
  variant: CardVariant;
  condition: CardCondition;
  language: string;
}