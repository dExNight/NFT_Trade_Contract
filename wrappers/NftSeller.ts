import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type NftSellerConfig = {};

export class NftSeller implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NftSeller(address);
    }

    // GET methods
    async getTradeData(provider: ContractProvider) {
        const { stack } = await provider.get('get_trade_data', []);

        const initiated = stack.readBoolean();

        const master_address = stack.readAddress();
        const nft_buyer_address = stack.readAddress();
        const nft_item_address = stack.readAddress();

        if (initiated) {
            const nft_price = stack.readBigNumber();
            const trade_fee = stack.readBigNumber();

            const trade_finilized = stack.readBoolean();

            if (trade_finilized) {
                const seller_address = stack.readAddress();
                return {
                    initiated,
                    master_address,
                    nft_buyer_address,
                    nft_item_address,
                    nft_price,
                    trade_fee,
                    trade_finilized,
                    seller_address,
                };
            }

            return {
                initiated,
                master_address,
                nft_buyer_address,
                nft_item_address,
                nft_price,
                trade_fee,
                trade_finilized,
            };
        }

        return {
            initiated,
            master_address,
            nft_buyer_address,
            nft_item_address,
        };
    }
}
