import { Address, beginCell, fromNano, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.fromAddress(Address.parse('Provide NFT collection address here')));  //Provide NFT collection address here

    const nftMintTotalCost = await nftCollection.getGetNftMintTotalCost();

    console.log('NFT mint total cost: ' + fromNano(nftMintTotalCost) + ' TON');

    // Get the current next_item_index before minting
    const collectionDataBefore = await nftCollection.getGetCollectionData();
    const indexBeforeMint = collectionDataBefore.next_item_index;

    // Mint the NFT
    await nftCollection.send(
        provider.sender(),
        {
            value: toNano('0.01') + nftMintTotalCost,
        },
        "Mint"
    );
    console.log(`Additional NFT minting initiated`);

    // Wait for a short period to allow the transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 20000));  // Wait for 20 seconds

    // Get the updated collection data
    const collectionDataAfter = await nftCollection.getGetCollectionData();
    const indexAfterMint = collectionDataAfter.next_item_index;

    if (indexAfterMint > indexBeforeMint) {
        // The new NFT index is indexAfterMint - 1
        const newNftIndex = indexAfterMint - 1n;

        // Get the address of the newly minted NFT
        const newNftAddress = await nftCollection.getGetNftAddressByIndex(newNftIndex);

        console.log(`New NFT minted at index: ${newNftIndex}`);
        console.log(`New NFT address: ${newNftAddress}`);
    } else {
        console.log("Minting may not have completed yet or failed. Please check the collection state.");
    }
}