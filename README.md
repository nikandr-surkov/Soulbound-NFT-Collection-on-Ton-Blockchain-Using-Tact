# Soulbound NFT Collection on Ton Blockchain Using Tact

This project implements a Soulbound NFT (Non-Fungible Token) collection smart contract on the TON blockchain using Tact. Soulbound NFTs are non-transferrable tokens, often used for credentials, achievements, or memberships that are intrinsically tied to a specific address.

Check my Youtube [Nikandr Surkov](https://www.youtube.com/@NikandrSurkov) for more tutorials and guides.

## About Tact

Tact is a high-level, statically-typed language designed specifically for writing smart contracts on the TON blockchain. It offers a more developer-friendly syntax compared to FunC (the native low-level language of TON), while still compiling down to efficient FunC code. This project showcases the use of Tact for creating complex smart contract systems like Soulbound NFTs.

## Project Structure

- `contracts`: Source code of the smart contracts written in Tact.
- `wrappers`: Wrapper classes for the contracts, including serialization primitives and compilation functions.
- `tests`: Test suite for the contracts.
- `scripts`: Utility scripts, including deployment and minting scripts.

## Prerequisites

- Node.js (v14 or newer recommended)
- Yarn or NPM
- TON development environment (follow [TON documentation](https://ton.org/docs/) for setup)
- Tact compiler (installed as a project dependency)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/nikandr-surkov/Soulbound-NFT-Collection-on-Ton-Blockchain-Using-Tact.git
   cd Soulbound-NFT-Collection-on-Ton-Blockchain-Using-Tact
   ```

2. Install dependencies:
   ```
   yarn install
   ```
   or
   ```
   npm install
   ```

## Building the Contract

To build the smart contract (this compiles Tact to FunC, then to Fift, and finally to a cell (BOC) file):

```
npx blueprint build
```

or

```
yarn blueprint build
```

## Testing

Run the test suite with:

```
npx blueprint test
```

or

```
yarn blueprint test
```

## Preparing Metadata

Before deploying your Soulbound NFT collection, you need to prepare the metadata. This involves creating JSON files for both the collection and individual items, and uploading them to IPFS. Follow these steps:

1. Create a folder for your metadata.

2. In this folder, create two JSON files:

   a. `meta.json` - metadata for the NFT collection:

   ```json
   {
     "name": "SBT Collection by Nikandr Surkov",
     "description": "SBT collection created by Nikandr Surkov. Check the Nikandr Surkov YouTube channel for more details.",
     "image": "https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmUgZ3kWg36tCVSZeVKXkvsdXkn6dqigqjoBZto9Y8h37z",
     "cover_image": "https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmTcULBo1eAFnSFpWdKsrxLUCHRWH3zR4Ut8UJNMgkuEW6",
     "social_links": [
       {
         "name": "YouTube",
         "url": "https://www.youtube.com/@NikandrSurkov"
       },
       {
         "name": "Website",
         "url": "https://nikandr.com"
       },
       {
         "name": "Telegram",
         "url": "https://t.me/nikandr_s"
       },
       {
         "name": "Twitter",
         "url": "https://x.com/NikandrSurkov"
       },
       {
         "name": "GitHub",
         "url": "https://github.com/nikandr-surkov"
       }
     ]
   }
   ```

   b. `item.json` - metadata for each NFT item:

   ```json
   {
     "name": "SBT Item",
     "description": "SBT item from SBT collection created by Nikandr Surkov. Check the Nikandr Surkov YouTube channel for more details.",
     "image": "https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmUgZ3kWg36tCVSZeVKXkvsdXkn6dqigqjoBZto9Y8h37z"
   }
   ```

3. Upload your images to IPFS (you can use services like Pinata) and replace the placeholder URLs in your JSON files with the actual IPFS URLs of your images.

4. Upload the entire folder containing both JSON files to IPFS.

5. Use the IPFS URL of the uploaded folder as the `CONTENT_URL` in your deployment script (`scripts/deployNftCollection.ts`).

Note: Make sure to replace the placeholder URLs and information in the JSON files with your own content and IPFS links.

## Deployment

To deploy the NFT collection:

1. Ensure you have sufficient TON in your deployer wallet.
2. Update the `CONTENT_URL` in the deployment script (`scripts/deployNftCollection.ts`) with your NFT metadata URL.
3. Run the deployment script:

```
npx blueprint run deployNftCollection
```

The script will output the deployed collection address and the address of the first minted NFT.

## Minting New NFTs

To mint additional NFTs:

1. Update the NFT collection address in the minting script (`scripts/mintNewNft.ts`).
2. Run the minting script:

```
npx blueprint run mintNewNft
```

The script will output the newly minted NFT's index and address.

## Smart Contract Details

The Soulbound NFT collection, written in Tact, consists of two main contracts:

1. `NftCollection`: Manages the collection of NFTs.
2. `NftItem`: Represents individual NFT items.

Key features:
- Non-transferrable NFTs (Soulbound)
- Minting functionality
- Ownership proof mechanism
- Revocation capability by authority

## License

This project is licensed under the MIT License.