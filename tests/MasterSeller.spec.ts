import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, beginCell, fromNano, toNano } from '@ton/core';
import { MasterSeller } from '../wrappers/MasterSeller';
import { NFT_Collection } from '../wrappers/NFT_Collection';
import { NFT_Item } from '../wrappers/NFT_Item';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { NftSeller } from '../wrappers/NftSeller';

const NFT_COLLECTION_METADATA =
    'https://raw.githubusercontent.com/Amir23714/BeautifulChairs/main/collection_metadata.json';
const NFT_COLLECTION_METADATA_BASE = 'https://raw.githubusercontent.com/Amir23714/BeautifulChairs/main/';

const OWNER_ADDRESS = Address.parse('0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn');

function createMintMsgBody(nft_owner: Address, query_id: number, index: number) {
    const nft_content = beginCell().storeStringTail('item_5.json').endCell();

    const cell = beginCell().storeAddress(nft_owner).storeRef(nft_content).endCell();

    const msg_body = beginCell()
        .storeUint(1, 32)
        .storeUint(query_id, 64)
        .storeUint(index, 64) // item index
        .storeCoins(toNano('0.005')) // forward amount
        .storeRef(cell)
        .endCell();

    return msg_body;
}

describe('MasterSeller', () => {
    let MasterCode: Cell;
    let nftSellerCode: Cell;
    let nftCollectionCode: Cell;
    let nftItemCode: Cell;

    beforeAll(async () => {
        MasterCode = await compile('MasterSeller');
        nftSellerCode = await compile('NftSeller');
        nftCollectionCode = await compile('NFT_Collection');
        nftItemCode = await compile('NFT_Item');
    });

    let blockchain: Blockchain;
    let adminWallet: SandboxContract<TreasuryContract>;
    let masterSellerContract: SandboxContract<MasterSeller>;
    let nftCollectionContract: SandboxContract<NFT_Collection>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        adminWallet = await blockchain.treasury('deployer');

        const MasterSellerConfig = {
            trade_fee: 1,
            admin_address: adminWallet.address,
            nft_seller_code: nftSellerCode,
        };

        masterSellerContract = blockchain.openContract(MasterSeller.createFromConfig(MasterSellerConfig, MasterCode));

        const deployResult = await masterSellerContract.sendDeploy(adminWallet.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: adminWallet.address,
            to: masterSellerContract.address,
            deploy: true,
            success: true,
        });

        const collection_content = {
            uri: NFT_COLLECTION_METADATA,
            base: NFT_COLLECTION_METADATA_BASE,
        };

        const royalty_params = {
            numerator: 20,
            denominator: 100,
            destination_address: adminWallet.address,
        };

        const config = {
            owner_address: adminWallet.address,
            next_item_index: 0,
            collection_content: collection_content,
            nft_item_code: nftItemCode,
            royalty_params: royalty_params,
        };

        nftCollectionContract = blockchain.openContract(NFT_Collection.createFromConfig(config, nftCollectionCode));

        const deployResult2 = await nftCollectionContract.sendDeploy(adminWallet.getSender(), toNano('0.05'));

        expect(deployResult2.transactions).toHaveTransaction({
            from: adminWallet.address,
            to: nftCollectionContract.address,
            deploy: true,
            success: true,
        });
    });

    it('Trade must be successful', async () => {
        const buyerWallet = await blockchain.treasury('buyer');
        const sellerWallet = await blockchain.treasury('seller');

        const query_id = 1;
        const nft_price = 10;

        const nftItemAddress = await nftCollectionContract.getNftAddress(0);
        const tradeContractAddress = await masterSellerContract.getTradeContractAddress(
            buyerWallet.address,
            nftItemAddress,
        );

        console.log('Buyer address: ', buyerWallet.address);
        console.log('Item address: ', nftItemAddress);
        console.log('Trade contract address: ', tradeContractAddress);
        console.log('Seller address: ', sellerWallet.address);

        console.log("Master Seller's address: ", masterSellerContract.address);
        console.log("NFT Collection's address: ", nftCollectionContract.address);

        // Trade initialization

        const createTradeResult = await masterSellerContract.sendCreateTradeRequest(
            buyerWallet.getSender(),
            toNano(nft_price),
            query_id,
            nft_price,
            nftItemAddress,
        );

        expect(createTradeResult.transactions).toHaveTransaction({
            from: buyerWallet.address,
            to: masterSellerContract.address,
            success: true,
        });

        expect(createTradeResult.transactions).toHaveTransaction({
            from: masterSellerContract.address,
            to: tradeContractAddress,
            success: true,
        });

        // NFT item minting
        const mintMsgBody = createMintMsgBody(sellerWallet.address, query_id, 0);

        const mintResult = await nftCollectionContract.sendMintRequest(
            sellerWallet.getSender(),
            toNano(0.05),
            mintMsgBody,
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: sellerWallet.address,
            to: nftCollectionContract.address,
            success: true,
        });

        expect(mintResult.transactions).toHaveTransaction({
            from: nftCollectionContract.address,
            to: nftItemAddress,
            success: true,
        });

        // NFT transfering to Trade Contract
        const nftItemContract: SandboxContract<NFT_Item> = blockchain.openContract(
            NFT_Item.createFromAddress(nftItemAddress),
        );

        const tradeContract: SandboxContract<NftSeller> = blockchain.openContract(
            NftSeller.createFromAddress(tradeContractAddress),
        );

        const tradeData = await tradeContract.getTradeData();

        console.log('Trade data: ', tradeData);

        const adminBalanceBefore = await adminWallet.getBalance();

        const transferResult = await nftItemContract.sendTransferRequest(
            sellerWallet.getSender(),
            toNano(0.1),
            query_id,
            tradeContractAddress,
        );

        expect(transferResult.transactions).toHaveTransaction({
            from: sellerWallet.address,
            to: nftItemAddress,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: nftItemAddress,
            to: tradeContractAddress,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: tradeContractAddress,
            to: nftItemAddress,
            success: true,
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: tradeContractAddress,
            to: sellerWallet.address,
            success: true,
            value: toNano(nft_price - 1),
        });

        expect(transferResult.transactions).toHaveTransaction({
            from: masterSellerContract.address,
            to: adminWallet.address,
            success: true
        });

        const adminBalanceAfter = await adminWallet.getBalance();
        console.log("Admin received: ", fromNano(adminBalanceAfter - adminBalanceBefore));

        const tradeData2 = await tradeContract.getTradeData();

        console.log('Trade data: ', tradeData2);
    });
    
    it('Trade may be cancelled', async () => {
        const buyerWallet = await blockchain.treasury('buyer');

        const query_id = 1;
        const nft_price = 10;
        
        // We do not even need to mint nft item, just create a trade and cancel it
        const nftItemAddress = await nftCollectionContract.getNftAddress(0);
        const tradeContractAddress = await masterSellerContract.getTradeContractAddress(
            buyerWallet.address,
            nftItemAddress,
        );

        console.log('Buyer address: ', buyerWallet.address);
        console.log('Item address: ', nftItemAddress);
        console.log('Trade contract address: ', tradeContractAddress);

        console.log("Master Seller's address: ", masterSellerContract.address);
        console.log("NFT Collection's address: ", nftCollectionContract.address);

        // Trade initialization

        const createTradeResult = await masterSellerContract.sendCreateTradeRequest(
            buyerWallet.getSender(),
            toNano(nft_price),
            query_id,
            nft_price,
            nftItemAddress,
        );

        expect(createTradeResult.transactions).toHaveTransaction({
            from: buyerWallet.address,
            to: masterSellerContract.address,
            success: true,
        });

        expect(createTradeResult.transactions).toHaveTransaction({
            from: masterSellerContract.address,
            to: tradeContractAddress,
            success: true,
        });

        const buyerBalanceBefore = await buyerWallet.getBalance();

        const cancelTradeResult = await masterSellerContract.sendCancelTradeRequest(
            buyerWallet.getSender(),
            toNano("0.015"),
            query_id,
            nftItemAddress,
        );

        expect(cancelTradeResult.transactions).toHaveTransaction({
            from: buyerWallet.address,
            to: masterSellerContract.address,
            success: true,
        });

        expect(cancelTradeResult.transactions).toHaveTransaction({
            from: masterSellerContract.address,
            to: tradeContractAddress,
            success: true,
        });

        expect(cancelTradeResult.transactions).toHaveTransaction({
            from: tradeContractAddress,
            to: buyerWallet.address,
            success: true,
        });

        const buyerBalanceAfter = await buyerWallet.getBalance();

        console.log("Buyer received: ", fromNano(buyerBalanceAfter - buyerBalanceBefore));
        
    });

});
