import { TCGCSVClient } from "./src/pricing/pokemon/client/tscgsvClient";
import { PokemonPricingService } from "./src/pricing/pokemon/pokemonPricingService";

const client = new TCGCSVClient();
const svc = new PokemonPricingService(client);

const sets = await svc.fetchAllSets();
console.log(sets);
