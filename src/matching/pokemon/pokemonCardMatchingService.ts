import type { ICardRepository, PokemonCardEntity } from "../../db/pokemon/cards/types";
import type { CardVariant, ParsedCardListing } from "../../parser/types";

export class PokemonCardMatchingService {
  constructor(private cardRepository: ICardRepository) {}

  public findMatch(parsed: ParsedCardListing): PokemonCardEntity | null {
    if (!parsed.isValidSingleCard || !parsed.canonicalName) {
      return null;
    }

    const hasCardNumber = Boolean(parsed.cardNumber && parsed.cardNumber.toLowerCase() !== "none");
    const cardNumberNum = hasCardNumber
      ? parsed.cardNumber.trim().split("/")[0]?.replace(/^([a-z]*)0+(\d+)$/i, "$1$2")
      : null;
    const hasSetName = Boolean(parsed.setName && parsed.setName.trim().length > 0);
    const setPattern = hasSetName ? `%${parsed.setName!.toLowerCase().trim()}%` : null;

    // 1. Issue independent queries for each present attribute
    const byName = this.cardRepository.findByNameBidirectional(parsed.canonicalName.toLowerCase().trim());
    const byNumber = cardNumberNum ? this.cardRepository.findByNumber(cardNumberNum) : [];
    const bySet = setPattern ? this.cardRepository.findBySetLike(setPattern) : [];

    // 2. If all 3 attributes are present, try intersecting all 3 first
    if (byName.length > 0 && byNumber.length > 0 && bySet.length > 0) {
      const tripleIntersection = this.intersect(this.intersect(byName, byNumber), bySet);
      if (tripleIntersection.length > 0) {
        return this.resolveCandidates(tripleIntersection, parsed.variant);
      }
    }

    // 3. Fallback to pairwise intersections in priority order:
    //    1) name + number
    //    2) set + number
    //    3) name + set
    const pairCandidates: PokemonCardEntity[][] = [
      this.intersect(byName, byNumber),
      this.intersect(bySet, byNumber),
      this.intersect(byName, bySet),
    ];

    for (const pairResult of pairCandidates) {
      if (pairResult.length > 0) {
        return this.resolveCandidates(pairResult, parsed.variant);
      }
    }

    // 4. No pair intersection yielded results -> insufficient matching data
    return null;
  }

  private resolveCandidates(candidates: PokemonCardEntity[], variant: CardVariant): PokemonCardEntity {
    if (candidates.length === 1) {
      return candidates[0]!!;
    }

    const candidateVariants = this.getCandidateVariants(variant).map((v) => v.toLowerCase());
    const variantMatches = candidates.filter((c) =>
      candidateVariants.includes(c.variant.toLowerCase())
    );

    if (variantMatches.length === 1) {
      return variantMatches[0]!!;
    }

    // If variant filter yields 0 matches, fall back to the unfiltered intersection pool;
    // if > 1 matches remain, pick the highest-priced card among them.
    const pool = variantMatches.length > 1 ? variantMatches : candidates;
    return this.selectMostExpensive(pool);
  }

  private intersect(listA: PokemonCardEntity[], listB: PokemonCardEntity[]): PokemonCardEntity[] {
    if (listA.length === 0 || listB.length === 0) {
      return [];
    }

    const keysInB = new Set(listB.map((item) => this.getCardKey(item)));
    const seen = new Set<string>();
    const result: PokemonCardEntity[] = [];

    for (const item of listA) {
      const key = this.getCardKey(item);
      if (keysInB.has(key) && !seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  }

  private getCardKey(card: PokemonCardEntity): string {
    return `${card.productId}::${card.variant.toLowerCase()}`;
  }

  private selectMostExpensive(candidates: PokemonCardEntity[]): PokemonCardEntity {
    return [...candidates].sort((a, b) => {
      const priceA = a.marketPrice ?? a.midPrice ?? -1;
      const priceB = b.marketPrice ?? b.midPrice ?? -1;
      return priceB - priceA;
    })[0]!!;
  }

  private getCandidateVariants(primary: CardVariant): string[] {
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
}