export interface TCGGroup {
  groupId: number;
  name: string;
  abbreviation?: string;
}

export interface TCGProductExtendedData {
  name: string;
  displayName: string;
  value: string;
}

export interface TCGProduct {
  productId: number;
  name: string;
  cleanName: string;
  imageUrl?: string;
  groupId: number;
  extendedData?: TCGProductExtendedData[];
}

export interface TCGPrice {
  productId: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  subTypeName: string;
}

export interface IPricingClient {
  getGroups(): Promise<TCGGroup[]>;
  getProducts(groupId: number): Promise<TCGProduct[]>;
  getPrices(groupId: number): Promise<TCGPrice[]>;
}