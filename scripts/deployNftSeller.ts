import { toNano } from '@ton/core';
import { NftSeller } from '../wrappers/NftSeller';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftSeller = provider.open(NftSeller.createFromConfig({}, await compile('NftSeller')));

    await nftSeller.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(nftSeller.address);

    // run methods on `nftSeller`
}
