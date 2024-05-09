import { Address, toNano } from '@ton/core';
import { MasterSeller } from '../wrappers/MasterSeller';
import { compile, NetworkProvider } from '@ton/blueprint';

const adminAddress: Address = Address.parse('0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn');

export async function run(provider: NetworkProvider) {
    const MasterSellerConfig = {
        trade_fee: 1,
        admin_address: adminAddress,
        nft_seller_code: await compile('NftSeller'),
    };

    const MasterSellerContract = provider.open(MasterSeller.createFromConfig(MasterSellerConfig, await compile('MasterSeller')));

    await MasterSellerContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(MasterSellerContract.address);

    // run methods on `nftSeller`
}
