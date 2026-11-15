import type { IPricingClient, TCGGroup, TCGPrice, TCGProduct } from "./types";

export class TCGCSVClient implements IPricingClient {
  private baseUrl = "https://tcgcsv.com/tcgplayer/3";
  private headers = {
    "User-Agent": "PokeDealScout/1.0.0",
    "Accept": "application/json",
  };

  async getGroups(): Promise<TCGGroup[]> {
    const res = await fetch(`${this.baseUrl}/groups`, { headers: this.headers });
    console.log(res)
    if (!res.ok) throw new Error(`Failed to fetch groups: ${res.statusText}`);
    const data = await res.json();
    return (data as any).results || [];
  }

  async getProducts(groupId: number): Promise<TCGProduct[]> {
    const res = await fetch(`${this.baseUrl}/${groupId}/products`, { headers: this.headers });
    if (!res.ok) throw new Error(`Failed to fetch products for group ${groupId}: ${res.statusText}`);
    const data = await res.json();
    return (data as any).results || [];
  }

  async getPrices(groupId: number): Promise<TCGPrice[]> {
    const res = await fetch(`${this.baseUrl}/${groupId}/prices`, { headers: this.headers });
    if (!res.ok) throw new Error(`Failed to fetch prices for group ${groupId}: ${res.statusText}`);
    const data = await res.json();
    return (data as any).results || [];
  }
}