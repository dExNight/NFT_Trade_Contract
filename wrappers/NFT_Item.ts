import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';

export class NFT_Item implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NFT_Item(address);
    }

    async sendTransferRequest(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        query_id: number,
        new_owner_address: Address,
    ) {
        const op_code: number = 0x5fcc3d14;

        const forward_amount: bigint = toNano('0.01');

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(op_code, 32)
                .storeUint(query_id, 64)
                .storeAddress(new_owner_address)
                .storeAddress(via.address)
                .storeUint(0, 1)
                .storeCoins(forward_amount)
                .storeUint(1, 1)
                .endCell(),
        });
    }

    // GET methods
    async getNftData(provider: ContractProvider) {
        const { stack } = await provider.get('get_nft_data', []);

        return {
            initiated: stack.readNumber(),
            index: stack.readNumber(),
            collection_address: stack.readAddress(),
            owner_address: stack.readAddress(),
            content: stack.readCell(),
        };
    }
}
