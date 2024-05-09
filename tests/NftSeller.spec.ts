import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { NftSeller } from '../wrappers/NftSeller';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('NftSeller', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('NftSeller');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nftSeller: SandboxContract<NftSeller>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        nftSeller = blockchain.openContract(NftSeller.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await nftSeller.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftSeller.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and nftSeller are ready to use
    });
});
