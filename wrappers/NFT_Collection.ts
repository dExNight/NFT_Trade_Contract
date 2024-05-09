import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, TupleBuilder } from '@ton/core';

const OFFCHAIN_CONTENT_PREFIX = 0x01;

export type CollectionContent = {
    uri: string;
    base: string;
};

export type RoyaltyParams = {
    numerator: number;
    denominator: number;
    destination_address: Address;
};

export type MainConfig = {
    owner_address: Address;
    next_item_index: number;
    collection_content: CollectionContent;
    nft_item_code: Cell;
    royalty_params: RoyaltyParams;
};

export function collectionContentToCell(content: CollectionContent): Cell {
    const offchain_data: Cell = beginCell()
        .storeUint(OFFCHAIN_CONTENT_PREFIX, 8)
        .storeStringTail(content.uri)
        .endCell();
    const base: Cell = beginCell().storeStringTail(content.base).endCell();

    return beginCell().storeRef(offchain_data).storeRef(base).endCell();
}

export function royaltyParamsToCell(params: RoyaltyParams): Cell {
    return beginCell()
        .storeUint(params.numerator, 16)
        .storeUint(params.denominator, 16)
        .storeAddress(params.destination_address)
        .endCell();
}

export function mainConfigToCell(config: MainConfig): Cell {
    const contentCell = collectionContentToCell(config.collection_content);
    const royaltyCell = royaltyParamsToCell(config.royalty_params);

    return beginCell()
        .storeAddress(config.owner_address)
        .storeUint(config.next_item_index, 64)
        .storeRef(contentCell)
        .storeRef(config.nft_item_code)
        .storeRef(royaltyCell)
        .endCell();
}

export class NFT_Collection implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NFT_Collection(address);
    }

    static createFromConfig(config: MainConfig, code: Cell, workchain = 0) {
        const data = mainConfigToCell(config);
        const init = { code, data };
        return new NFT_Collection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMintRequest(provider: ContractProvider, via: Sender, value: bigint, msg_body: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: msg_body,
        });
    }

    async sendTransaction(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    // GET methods
    async getNftAddress(provider: ContractProvider, index: number) {
        const tuple_builder = new TupleBuilder();
        tuple_builder.writeNumber(index);
        
        const { stack } = await provider.get('get_nft_address_by_index', tuple_builder.build());

        return stack.readAddress();
    }
}
