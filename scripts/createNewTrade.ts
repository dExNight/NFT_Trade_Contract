import { Address, TupleBuilder, beginCell, toNano } from '@ton/core';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { TonClient4 } from '@ton/ton';
import qs from 'qs';
import qrcode from 'qrcode-terminal';

const contractAddress: Address = Address.parse('EQBRG0MxHGJBeHXqdshxPjsaYrVTdEWSQKe31GftpQq5uRFk');
const nft_address: Address = Address.parse('EQCBqoGGtvNaIJkj22j3W-_X5NoxT6clMpD79OoMIN1WNvBE');

const buyerAddress = Address.parse('0QCqVeyHMmYKvpx-ouVZP9blvaZc9YngGsUAqQKVNRaiFOYl');

async function onchainTestScript() {
    console.log('Contract address : ', contractAddress);

    // Client configuration
    const endpoint = await getHttpV4Endpoint({
        network: 'testnet',
    });
    const client4 = new TonClient4({ endpoint });

    let latestBlock = await client4.getLastBlock();
    let status = await client4.getAccount(latestBlock.last.seqno, contractAddress);

    if (status.account.state.type !== 'active') {
        console.log('Contract is not active');
        return;
    }

    // QR-code for deposit to participating in raffle generation
    const contract_address: string = contractAddress.toString({ testOnly: true });

    const msg_body = beginCell()
        .storeUint(1, 32) // op_code
        .storeUint(123, 64) // query_id
        .storeCoins(toNano(2))
        .storeAddress(nft_address)
        .endCell();

    const tons_to_send = toNano(2);

    let link =
        `https://app.tonkeeper.com/transfer/` +
        contract_address +
        '?' +
        qs.stringify({
            amount: tons_to_send.toString(10),
            bin: msg_body.toBoc({ idx: false }).toString('base64'),
        });

    console.log('Scan QR-code to create Trade');
    qrcode.generate(link, { small: true }, (code) => {
        console.log(code);
    });

    // Trade Contract Address getting

    const tuple_builder = new TupleBuilder();
    tuple_builder.writeAddress(buyerAddress);
    tuple_builder.writeAddress(nft_address);

    latestBlock = await client4.getLastBlock();
    let { exitCode: masgExitCode, result: MsgResult } = await client4.runMethod(
        latestBlock.last.seqno,
        contractAddress,
        'calculate_trade_contract_address',
        tuple_builder.build(),
    );

    if (masgExitCode !== 0) {
        console.log('Running getter method failed');
        return;
    }
    if (MsgResult[0].type !== 'slice') {
        console.log('Unknown result type (should be slice), got: ', MsgResult[0].type);
        return;
    }

    console.log(MsgResult[0].cell.beginParse().loadAddress());
}

onchainTestScript();
