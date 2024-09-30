import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, fromNano, beginCell, Address } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import '@ton/test-utils';
import { NftItem } from '../build/NftCollection/tact_NftItem';

describe('NftCollection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;
    let owner: SandboxContract<TreasuryContract>;
    const NFT_PRICE = toNano('0.5');
    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const CONTENT_URL = "https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmRh1kHRC9FdVQvnvZVDKanXYWaSpdYoNC5pUkBB4s5TW2/"; // Replace with your actual content URL

    beforeEach(async () => {
        // Initialize the blockchain and treasury accounts
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        owner = await blockchain.treasury('owner');

        // Prepare the content cell
        const contentCell = beginCell()
            .storeUint(OFFCHAIN_CONTENT_PREFIX, 8)
            .storeStringRefTail(CONTENT_URL)
            .endCell();

        // Initialize the NftCollection contract with the owner, content cell, and NFT price
        nftCollection = blockchain.openContract(await NftCollection.fromInit(owner.address, contentCell, NFT_PRICE));

        const mintResult = await nftCollection.send(
            owner.getSender(),
            {
                value: toNano('1'),
            },
            "Mint"
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy and mint the first NFT upon the first Mint message', async () => {
        // Verify the state after deployment and initial mint
        const collectionData = await nftCollection.getGetCollectionData();
        expect(collectionData.next_item_index).toEqual(1n); // Should be 1 after minting the first NFT
    });

    it('should mint additional NFTs', async () => {
        // Get the total cost required to mint an NFT
        const nftMintTotalCost = await nftCollection.getGetNftMintTotalCost();

        // Mint the second NFT
        const mintResult = await nftCollection.send(
            owner.getSender(),
            {
                value: toNano('0.01') + nftMintTotalCost, // Provide extra funds to cover the cost
            },
            "Mint"
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true,
        });

        // Verify that the next_item_index has incremented
        const collectionData = await nftCollection.getGetCollectionData();
        expect(collectionData.next_item_index).toEqual(2n);

        // Get the NFT address by index
        const nftAddress = await nftCollection.getGetNftAddressByIndex(1n);
        expect(nftAddress).not.toBeNull();

        if (nftAddress === null) {
            throw new Error('NFT address is null');
        }

        console.log('Second minted NFT address:', nftAddress.toString());
        expect(nftAddress).toBeInstanceOf(Address);
    });

    it('should prevent minting with insufficient funds', async () => {
        const nftMintTotalCost = await nftCollection.getGetNftMintTotalCost();

        // Attempt to mint with insufficient funds
        const mintResult = await nftCollection.send(
            owner.getSender(),
            {
                value: nftMintTotalCost - toNano('0.1'), // Less than required
            },
            "Mint"
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: false
        });
    });

    it('should allow the owner to withdraw funds', async () => {
        // Send extra funds to the contract to enable withdrawal
        await deployer.send({
            to: nftCollection.address,
            value: toNano('2'),
        });

        // Owner withdraws the funds
        const withdrawResult = await nftCollection.send(
            owner.getSender(),
            {
                value: toNano('0.1'),
            },
            "Withdraw"
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true,
        });
    });

    it('should prevent non-owners from withdrawing funds', async () => {
        const nonOwner = await blockchain.treasury('nonOwner');

        // Non-owner attempts to withdraw funds
        const withdrawResult = await nftCollection.send(
            nonOwner.getSender(),
            {
                value: toNano('0.1'),
            },
            "Withdraw"
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: nftCollection.address,
            success: false
        });
    });

    it('should return correct collection data', async () => {
        const collectionData = await nftCollection.getGetCollectionData();

        expect(collectionData.owner_address.toString()).toEqual(owner.address.toString());
        expect(collectionData.next_item_index).toEqual(1n); // After the initial mint
        expect(collectionData.collection_content).toBeDefined();
    });

    it('should increment next_item_index after each mint', async () => {
        const nftMintTotalCost = await nftCollection.getGetNftMintTotalCost();

        // Mint second NFT
        await nftCollection.send(
            owner.getSender(),
            {
                value: toNano('0.01') + nftMintTotalCost,
            },
            "Mint"
        );

        let collectionData = await nftCollection.getGetCollectionData();
        expect(collectionData.next_item_index).toEqual(2n);

        // Mint third NFT
        await nftCollection.send(
            owner.getSender(),
            {
                value: toNano('0.01') + nftMintTotalCost,
            },
            "Mint"
        );

        collectionData = await nftCollection.getGetCollectionData();
        expect(collectionData.next_item_index).toEqual(3n);
    });

    it('should not allow transferring SBT (Soulbound Token)', async () => {
        // Assuming the first NFT has already been minted in beforeEach

        // Get the NFT address by index
        const nftAddress = await nftCollection.getGetNftAddressByIndex(0n);
        expect(nftAddress).not.toBeNull();

        if (nftAddress === null) {
            throw new Error('NFT address is null');
        }

        console.log('NFT Address for transfer attempt:', nftAddress.toString());

        const nftItem = blockchain.openContract(NftItem.fromAddress(nftAddress));

        const transferResult = await nftItem.send(
            owner.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'Transfer',
                query_id: 0n,
                new_owner: owner.address,
                response_destination: null,
                custom_payload: null,
                forward_amount: 0n,
                forward_payload: beginCell().endCell().beginParse(),
            }
        );

        expect(transferResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftAddress,
            success: false
        });
    });
});
