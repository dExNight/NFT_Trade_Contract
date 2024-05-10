# NFT Trade Contract
Aim of this contract to reduce fees spent on NFT trading. It will allow users to trade NFTs with minimal fees (bypassing the payment of royalty fees). However admin of the Master Trade contract can set a custom fee for each trade (it will be included into bid value, i.e. `nft_price = amount_seller_will_get + trade_fee`). Trade fee is used to cover transfer fees during the trade process, if trade was canceled, no fees will be charged.

## Actors 
- NFT buyer
- NFT seller (owner)
- Trade contract (via Master Trade contract)

Each Trade contract is defined by the buyer and the NFT item addresses. Hence, there cannot be two bids for the same NFT item from one buyer.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies. Also contains **nft** folder that was used for test purposes.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts, onchain tests

## Trade creation

### Prerequisites
- Master Contract must be deployed first

### Usage

1. Buyer sends a request to the Master Trade contract to create new trade

    `op_code:uint32(1) query_id:uint64 nft_price:(VarUInteger 16) nft_address:MsgAddress = InternalMsgBody;`

    Note: value sent with this message must be equal to the price of the NFT and be greater or equal than **minimal nft price (0.1 TON) + trade fee**.

    **Result**: Trade contract will be initialized with parameters:
    - buyer address
    - nft item address

2. Seller sends nft item to the newly initialized Trade contract

    Note: default NFT transfer method presented in Wallets must not be used. Because for this contract it is crucial to set sufficient `forward_amount` value to cover code execution and transfer fees.

    Instead must be used custom transfer method:
    - nft owner sends message to nft item contract with the following parameters:
    `op_code:uint32(0x5fcc3d14) query_id:uint64 new_owner:MsgAddress(trade contract address) response_destination:MsgAddress custom_payload:(Maybe ^Cell) forward_amount:(VarUInteger 16) forward_payload:(Either Cell ^Cell) = InternalMsgBody;`. **forward_amount** == 0.01 TON is sufficient.

    - nft item contract sends message with `op::ownership_assigned()` opcode to the Trade contract. It is crucial not to fail this step, otherwise trade will not be performed automatically.

    **Result**: Trade will be finished automatically. Buyer will receive NFT item and seller will receive **nft_price - trade fee** TON. Remaining **trade fee** will be sent to the Master Trade contract.

## Trade Cancelation

### Prerequisites
- Master Contract must be deployed first
- Trade contract must be initialized (bid from buyer must be sent)
- No NFT item must be sent to the Trade contract (otherwise Trade is already finished)

### Usage

1. Buyer sends a request to the Master Trade contract to cancel the trade

    `op_code:uint32(0x05438d94) query_id:uint64 nft_address:MsgAddress = InternalMsgBody;`

    **Result**: Trade will be canceled. Buyer will receive back the amount he sent to the Trade contract. Seller will receive back the NFT item. **No fees will be charged**.


