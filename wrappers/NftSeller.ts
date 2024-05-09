import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type NftSellerConfig = {};

export function nftSellerConfigToCell(config: NftSellerConfig): Cell {
    return beginCell().endCell();
}

export class NftSeller implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new NftSeller(address);
    }

    static createFromConfig(config: NftSellerConfig, code: Cell, workchain = 0) {
        const data = nftSellerConfigToCell(config);
        const init = { code, data };
        return new NftSeller(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
