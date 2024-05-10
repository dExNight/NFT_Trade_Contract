import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano, TupleBuilder } from '@ton/core';

export type MasterSellerConfig = {
    trade_fee: number,
    admin_address: Address,
    nft_seller_code: Cell
};

export function nftSellerConfigToCell(config: MasterSellerConfig): Cell {
    return beginCell()
        .storeCoins(toNano(config.trade_fee))
        .storeAddress(config.admin_address)
        .storeRef(config.nft_seller_code)
        .endCell();
}

export class MasterSeller implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new MasterSeller(address);
    }

    static createFromConfig(config: MasterSellerConfig, code: Cell, workchain = 0) {
        const data = nftSellerConfigToCell(config);
        const init = { code, data };
        return new MasterSeller(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    // Creating new trade
    async sendCreateTradeRequest(provider: ContractProvider, via: Sender, value: bigint, query_id: number, nft_price: number, nft_address: Address) {
        const op_code: number = 1;

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(op_code, 32)
                .storeUint(query_id, 64)
                .storeCoins(toNano(nft_price))
                .storeAddress(nft_address)
                .endCell(),
        });
    }

    // Cancelling new trade
    async sendCancelTradeRequest(provider: ContractProvider, via: Sender, value: bigint, query_id: number, nft_address: Address) {
        const op_code: number = 0x05438d94;

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(op_code, 32)
                .storeUint(query_id, 64)
                .storeAddress(nft_address)
                .endCell(),
        });
    }

    // GET methods
    async getTradeContractAddress(provider: ContractProvider, nft_buyer_address: Address, nft_item_address: Address) {
        const tuple_builder = new TupleBuilder();
        tuple_builder.writeAddress(nft_buyer_address);
        tuple_builder.writeAddress(nft_item_address);
        
        const { stack } = await provider.get('calculate_trade_contract_address', tuple_builder.build());

        return stack.readAddress();
    }
}
