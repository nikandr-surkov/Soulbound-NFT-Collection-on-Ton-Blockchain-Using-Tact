import { Address, beginCell, fromNano, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const CONTENT_URL = "https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmRh1kHRC9FdVQvnvZVDKanXYWaSpdYoNC5pUkBB4s5TW2/"; // Change to your content URL
    const NFT_PRICE = toNano('0.5');
    
    const contentCell = beginCell().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(CONTENT_URL).endCell();

    // Use the sender's address as the owner
    const owner = provider.sender().address;

    if (!owner) {
        console.log("Owner address is undefined");
        return;
    }

    const nftCollection = provider.open(await NftCollection.fromInit(owner, contentCell, NFT_PRICE));

    console.log('NFT collection will be deployed at:', nftCollection.address);

    // Deploy the contract and mint the first NFT
    await nftCollection.send(
        provider.sender(),
        {
            value: toNano('0.3') + NFT_PRICE,
        },
        "Mint"
    );

    await provider.waitForDeploy(nftCollection.address);

    console.log('NFT Collection deployed');

    // Get collection data
    const collectionData = await nftCollection.getGetCollectionData();
    console.log('Collection data:', collectionData);

    // Get the latest index ID
    const latestIndexId = collectionData.next_item_index;
    console.log("Latest indexID:", latestIndexId);

    // Get NFT address by index
    const itemAddress = await nftCollection.getGetNftAddressByIndex(latestIndexId - 1n);
    console.log('Minted NFT Item address:', itemAddress);
}