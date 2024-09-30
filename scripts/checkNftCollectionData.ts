import { Address, beginCell, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.fromAddress(Address.parse('Provide NFT collection address here')));  //Provide NFT

    console.log('Querying NFT addresses for indices 0 to 3:');

    for (let i = 0; i < 4; i++) {
        try {
            const nftAddress = await nftCollection.getGetNftAddressByIndex(BigInt(i));
            console.log(`NFT at index ${i}: ${nftAddress}`);

            // Optionally, you can also fetch more data about each NFT
            // This depends on what methods are available in your NftItem contract
            // For example, if you have a method to get NFT data:
            // const nftData = await nftCollection.getGetNftContent(BigInt(i), ...);
            // console.log(`NFT ${i} data:`, nftData);

        } catch (error) {
            console.error(`Error fetching NFT at index ${i}:`, error);
        }
    }

    console.log('NFT address querying completed');
}