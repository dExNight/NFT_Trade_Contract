import { Address, TupleBuilder, beginCell, toNano } from '@ton/core';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { TonClient4 } from '@ton/ton';
import qs from 'qs';
import qrcode from 'qrcode-terminal';

const tradeContractAddress: Address = Address.parse("EQCwhU0iEYJ0lTpnlyXxgvH9fghmp3PykCMTs9iM8g3hWfue");
const nft_address: Address = Address.parse('EQCydlfkhqDBcrCvsSJEpUMHoOb1Xs2SeWCCcQKktpY7ll2Y');
const nft_owner: Address = Address.parse('0QCE6FJD8ZnCCp9ImNGPnf0W0Jp8Qr8TPpg-njUR26dOKB3z');

async function onchainTestScript() {
    console.log('Trade Contract address : ', tradeContractAddress);

    // Client configuration
    const endpoint = await getHttpV4Endpoint({
        network: 'testnet',
    });
    const client4 = new TonClient4({ endpoint });

    let latestBlock = await client4.getLastBlock();
    let status = await client4.getAccount(latestBlock.last.seqno, nft_address);

    if (status.account.state.type !== 'active') {
        console.log('Contract is not active');
        return;
    }

    // QR-code for deposit to participating in raffle generation
    const nft_item_address: string = nft_address.toString({ testOnly: true });

    const forward_amount: number = 0.01;

    const msg_body = beginCell()
        .storeUint(0x5fcc3d14, 32) // op_code
        .storeUint(123, 64) // query_id
        .storeAddress(tradeContractAddress)
        .storeAddress(nft_owner)
        .storeUint(0, 1)
        .storeCoins(toNano(forward_amount))
        .storeUint(1, 1)
        .endCell();

    const tons_to_send = toNano(0.1);

    let link =
        `https://app.tonkeeper.com/transfer/` +
        nft_item_address +
        '?' +
        qs.stringify({
            amount: tons_to_send.toString(10),
            bin: msg_body.toBoc({ idx: false }).toString('base64'),
        });

    console.log('Scan QR-code to send NFT item');
    qrcode.generate(link, { small: true }, (code) => {
        console.log(code);
    });
}

onchainTestScript();
