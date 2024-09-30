import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/nft_collection.tact',
    options: {
        debug: true,
    },
};
