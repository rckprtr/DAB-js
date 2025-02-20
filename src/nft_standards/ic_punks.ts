import { Actor, ActorSubclass, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

import NFT_ICPUNKS, { TokenDesc } from '../interfaces/icpunks';
import IDL from '../idls/icpunks.did';
import NFT from './default';
import { NFTDetails } from '../interfaces/nft';
import { NFT_CANISTERS } from '../constants/canisters';
import { NFT as NFTStandard} from '../constants/standards';

const getICPBunnyCanisterId = (index) =>
  NFT_CANISTERS.ICP_BUNNY_STORAGE[index % 10];

const imageUrl = (canisterId: string, index: number, tokenDataUrl: string) =>
  ({
    [NFT_CANISTERS.ICP_BUNNY_MAIN]: `https://${getICPBunnyCanisterId(
      index
    )}.raw.ic0.app/Token/${index}`,
  }[canisterId] || `https://${canisterId}.raw.ic0.app${tokenDataUrl}`);
export default class ICPUNKS extends NFT {
  standard = NFTStandard.icpunks;

  actor: ActorSubclass<NFT_ICPUNKS>;

  constructor(canisterId: string, agent: HttpAgent) {
    super(canisterId, agent);

    this.actor = Actor.createActor(IDL, {
      agent,
      canisterId,
    });
  }

  async getUserTokens(principal: Principal): Promise<NFTDetails[]> {
    const tokensIndexes = await this.actor.user_tokens(principal);

    const tokensData = await Promise.all(
      tokensIndexes.map((tokenIndex) => this.actor.data_of(tokenIndex))
    );

    return tokensData.map((token) => this.serializeTokenData(token));
  }

  async transfer(to: Principal, tokenIndex: number): Promise<void> {
    const success = await this.actor.transfer_to(to, BigInt(tokenIndex));
    if (!success) {
      throw new Error('Error transfering token');
    }
  }

  async details(tokenIndex: number): Promise<NFTDetails> {
    const tokenData = await this.actor.data_of(BigInt(tokenIndex));

    return this.serializeTokenData(tokenData);
  }

  private serializeTokenData = (tokenData: TokenDesc): NFTDetails => ({
    index: BigInt(tokenData.id),
    canister: this.canisterId,
    url: imageUrl(
      this.canisterId,
      Number.parseInt(tokenData.id.toString(), 10),
      tokenData.url
    ),
    name: tokenData.name,
    metadata: tokenData,
    standard: this.standard,
  });
}
