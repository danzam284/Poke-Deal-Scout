import type { IPricingClient, TCGGroup, TCGPrice, TCGProduct } from "./client/types";


export class PokemonPricingService {
  constructor(private client: IPricingClient) {}

  async fetchAllSets(): Promise<TCGGroup[]> {
    return await this.client.getGroups();
  }

  async fetchSetCatalog(groupId: number): Promise<{ products: TCGProduct[]; prices: TCGPrice[] }> {
    const [products, prices] = await Promise.all([
      this.client.getProducts(groupId),
      this.client.getPrices(groupId),
    ]);
    return { products, prices };
  }
}