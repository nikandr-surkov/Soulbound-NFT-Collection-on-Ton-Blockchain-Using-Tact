import "./message.tact";
const minTonsForStorage: Int = ton("0.05");
const gasConsumption: Int = ton("0.05");

contract NftCollection {
    next_item_index: Int as uint32 = 0;
    owner_address: Address;                   
    collection_content: Cell;   
    nft_price: Int;
    authority_address: Address;

    init(owner_address: Address, collection_content: Cell, nft_price: Int){
        self.owner_address = owner_address;
        self.collection_content = collection_content;
        self.nft_price = nft_price;  
        self.authority_address = owner_address;
    }

    receive("Mint"){
        let ctx: Context = context();
        let msgValue: Int = ctx.value;
        let totalCost: Int = self.get_nft_mint_total_cost();
        require(msgValue >= totalCost, "Insufficient funds for minting");
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = minTonsForStorage - min(tonBalanceBeforeMsg, minTonsForStorage);
        msgValue = msgValue - (storageFee + gasConsumption + self.nft_price);

        // Send NFT price to owner
        if (self.nft_price > 0) {
            send(SendParameters{
                to: self.owner_address,
                value: self.nft_price,
                bounce: false,
                mode: SendIgnoreErrors,
                body: "NFT Sale".asComment()
            });
        }

        self.mint(ctx.sender, msgValue);

        emit(LogEventMintRecord{ minter: sender(), item_id: self.next_item_index, generate_number: nativeRandom() }.toCell());
    }

    receive("Withdraw") {
        require(sender() == self.owner_address, "Only owner can withdraw");
        let withdrawAmount: Int = myBalance() - context().value - minTonsForStorage;
        require(withdrawAmount > 0, "No TON to withdraw");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: withdrawAmount,
            mode: SendRemainingValue + SendIgnoreErrors
        });
    }

    // ===== Private Methods ===== //
    fun mint(sender: Address, msgValue: Int) {
        require(self.next_item_index >= 0, "Non-sequential NFTs");
        let nft_init: StateInit = self.getNftItemInit(self.next_item_index);
        send(SendParameters{
                to: contractAddress(nft_init), 
                value: msgValue, 
                bounce: false,
                mode: SendIgnoreErrors,
                body: Transfer {
                    query_id: 0,
                    new_owner: sender,
                    response_destination: self.owner_address,
                    custom_payload: self.collection_content,
                    forward_amount: 0,
                    forward_payload: emptySlice()
                }.toCell(),
                code: nft_init.code,
                data: nft_init.data
            });
        self.next_item_index = self.next_item_index + 1;
    }

    // --------- Get Collection Metadata Function --------- //
    get fun get_collection_data(): CollectionData {     
        let b: StringBuilder = beginString();
        let collectionDataString: String = self.collection_content.asSlice().asString();
        b.append(collectionDataString);
        b.append("meta.json");
        return CollectionData{
            next_item_index: self.next_item_index, 
            collection_content: b.toCell(), 
            owner_address: self.owner_address
        };
    }

    get fun get_nft_mint_total_cost(): Int {
        return (minTonsForStorage + gasConsumption + self.nft_price);
    }

    get fun get_nft_address_by_index(item_index: Int): Address?{      
        let initCode: StateInit = self.getNftItemInit(item_index);
        return contractAddress(initCode);
    }

    get fun getNftItemInit(item_index: Int): StateInit {
        return initOf NftItem(myAddress(), item_index, self.authority_address);
    }
    
    get fun get_nft_content(index: Int, individual_content: Cell): Cell { 
        let b: StringBuilder = beginString();
        let ic: String = individual_content.asSlice().asString();
        b.append(ic);
        return b.toCell();
    }
}

contract NftItem {
    collection_address: Address;
    item_index: Int; 
    is_initialized: Bool;

    owner: Address?;
    individual_content: Cell?;

    authority_address: Address?;
    revoked_at: Int as uint64 = 0;

    init(collection_address: Address, item_index: Int, authority_address: Address){
        require(sender() == collection_address, "Not from collection");
        self.collection_address = collection_address;
        self.item_index = item_index;
        self.is_initialized = false;
        self.authority_address = authority_address;
    }

    receive(msg: Transfer){
        let ctx: Context = context(); 
        let msgValue: Int = self.msgValue(ctx.value);
        
        if (self.is_initialized == false) {  // Initial Transfer, aka the "Minting" of the NFT
            require(ctx.sender == self.collection_address, "Initialized tx need from collection");
            self.is_initialized = true;
            self.owner = msg.new_owner;
            self.individual_content = msg.custom_payload;
            if (msgValue > 0) {
                    send(SendParameters{
                    to: msg.new_owner,
                    value: msgValue,
                    mode: SendPayGasSeparately,
                    body: Excesses { query_id: msg.query_id }.toCell()
                });
            }
        } else {
            require(false, "SBT cannot be transferred");
        }
    }
    
    receive(msg: GetStaticData){ 
        send(SendParameters {
            to: sender(),
            value: 0,
            mode: 64,  // (return msg amount except gas fees) 
            bounce: true,
            body: ReportStaticData{
                query_id: msg.query_id,
                index_id: self.item_index,
                collection: self.collection_address
            }.toCell()
        });
    }

    receive(msg: ProveOwnership) {
        require(sender() == self.owner, "Not owner");
        send(SendParameters{
            to: msg.dest,
            value: 0,
            mode: 64,
            body: OwnershipProof {
                query_id: msg.query_id,
                item_id: self.item_index,
                owner: self.owner!!,
                data: msg.forward_payload,
                revoked_at: self.revoked_at,
                content: msg.with_content ? self.individual_content : null
            }.toCell()
        });
    }

    receive(msg: RequestOwner) {
        send(SendParameters{
            to: msg.dest,
            value: 0,
            mode: 64,
            body: OwnerInfo {
                query_id: msg.query_id,
                item_id: self.item_index,
                initiator: sender(),
                owner: self.owner!!,
                data: msg.forward_payload,
                revoked_at: self.revoked_at,
                content: msg.with_content ? self.individual_content : null
            }.toCell()
        });
    }

    receive("Destroy") {
        require(sender() == self.owner, "Not owner");
        self.owner = null;
        self.authority_address = null;
        self.revoked_at = 0;
        let excess: Int = myBalance() - context().value - minTonsForStorage;

        if (excess > 0) {
            send(SendParameters{
                to: sender(),
                bounce: false,
                value: excess,
                mode: SendRemainingValue + SendIgnoreErrors
            });
        }
    }

    receive(msg: Revoke) {
        require(sender() == self.authority_address, "Not authorized");
        require(self.revoked_at == 0, "Already revoked");
        self.revoked_at = now();
    }

    fun msgValue(value: Int): Int {
        let tonBalanceBeforeMsg: Int = myBalance() - value;
        let storageFee: Int = minTonsForStorage - min(tonBalanceBeforeMsg, minTonsForStorage);
        return value - (storageFee + gasConsumption);
    }

    // --------- Get Item Metadata Function --------- //
    get fun get_nft_data(): GetNftData {
        let b: StringBuilder = beginString();
        let collectionData: String = (self.individual_content!!).asSlice().asString();
        b.append(collectionData);
        b.append("item.json");

        return GetNftData {
            is_initialized: self.is_initialized, 
            index: self.item_index, 
            collection_address: self.collection_address, 
            owner_address: self.owner!!,
            individual_content: b.toCell()
        };
    }

    get fun get_authority_address(): Address? {
        return self.authority_address;
    }

    get fun get_revoked_time(): Int {
        return self.revoked_at;
    }
}