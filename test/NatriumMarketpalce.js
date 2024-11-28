const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat");

describe("Natrium Marketpalce", function () {

    let owner;
    let admin;
    let addr1;
    let minter1;
    let minter2;
    let minter3
    let buyer1;
    let buyer2;
    let buyer3;

    let deployedNatriumTicketingContract;
    let deployedNatriumMarketPlaceContract;
    let deployedNatriumFactoryContract;

    let name = "Dragon ball Super";
    let symbol = "DBS";
    let _usdtTokenAddress;
    let _eventName = "Dragon ball Premiere";
    let _startDate;
    let _endDate;
    let _ticketStartBuyDate;
    let _ticketEndBuyDate;
    let walletAddress;

    const tickets = [
        {
            ticketType: "VIP",
            quantity: 100,
            price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
        },
        {
            ticketType: "General Admission",
            quantity: 200,
            price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
        }
    ];

    let tokenURI = "www.Eventholder.com";
    let serviceFess = 10;

    beforeEach(async () => {
        [
            owner,
            admin,
            addr1,
            minter1,
            minter2,
            minter3,
            buyer1,
            buyer2,
            buyer3,
            walletAddress,
            _usdtTokenAddress
        ] = await ethers.getSigners();

        // Natrium Factory Contract.

        const NatriumFactoryContract = await ethers.getContractFactory("EventDeployer");
        deployedNatriumFactoryContract = await upgrades.deployProxy(NatriumFactoryContract, [_usdtTokenAddress.address, walletAddress.address], { initializer: 'initialize' });
        await deployedNatriumFactoryContract.connect(owner).waitForDeployment();

        //console.log("Natrium Factory Contract deployed to:", deployedNatriumFactoryContract.target);

        //Natrium Ticketing Nft Contract
        let getBlockNumber = await ethers.provider.getBlockNumber();
        getBlock = await ethers.provider.getBlock(getBlockNumber);
        _startDate = getBlock.timestamp;
        _endDate = _startDate + (2 * 86400);

        _ticketStartBuyDate = _startDate;
        _ticketEndBuyDate = _endDate - 86400;

        const NatriumNftContract = await ethers.getContractFactory("EventTicket");

        deployedNatriumTicketingContract = await upgrades.deployProxy(NatriumNftContract, [
            name,
            symbol,
            _usdtTokenAddress.address,
            _eventName,
            _startDate,
            _endDate,
            _ticketStartBuyDate,
            _ticketEndBuyDate,
            tickets,
            walletAddress.address,
            addr1.address,
            deployedNatriumFactoryContract.target

        ], { initializer: 'initialize' });

        // Wait for the contract to be deployed
        await deployedNatriumTicketingContract.connect(owner).waitForDeployment();
        //console.log("NatirumToken deployed to:", deployedNatriumTicketingContract.target);

        //Natrium Nft Marketplace
        const NatirumMarketplace = await ethers.getContractFactory("NatirumMarketplace");

        deployedNatriumMarketPlaceContract = await upgrades.deployProxy(NatirumMarketplace, [], { initializer: 'initialize' });

        // Wait for the contract to be deployed
        await deployedNatriumMarketPlaceContract.connect(owner).waitForDeployment();

        //console.log("NatirumMarketplace deployed to:", deployedNatriumMarketPlaceContract.target);
    });

    describe("mint Ticket", function () {
        it("should mint Nft", async () => {
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            let tickets = await deployedNatriumTicketingContract.getTickets();
            tickets.forEach(ticket => {
                console.log(`Ticket Type: ${ticket.ticketType}`);
                console.log(`Quantity: ${ticket.quantity.toString()}`); // Convert BigNumber to string
                console.log(`Price: ${ethers.formatUnits(ticket.price, 6)} USDT`); // Convert price from BigNumber to string
            });
        });
    });

    describe("List Ticket Nft", function () {
        it("should list Nft by host contract only", async () => {
            let nftPrice = ethers.parseUnits("1");
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                nftPrice,
                deployedNatriumTicketingContract.target
            );

            let PurchaseTokens = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let Tokens = PurchaseTokens[0];
            let SellerAddress = Tokens.args.seller
            let TokenId = Tokens.args.tokenID
            let TicketContract = Tokens.args.hostContract;
            let NftPrice = Tokens.args.nftPrice;
            let Bool = Tokens.args.isListed;

            console.log("Seller Address :", SellerAddress,
                "Token Id :", TokenId,
                "Ticketing Contract :", TicketContract,
                "Nft Price", NftPrice,
                "Bool is listed", Bool
            );

            expect(SellerAddress).to.be.equal(minter1);
            expect(Bool).not.to.be.equal(false);
        });

        it("should check if already listed", async () => {
            let nftPrice = ethers.parseUnits("1");

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                nftPrice,
                deployedNatriumTicketingContract.target
            );

            await expect(deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                nftPrice,
                deployedNatriumTicketingContract.target
            )).to.be.revertedWith("Already Listed");
        });
        it("should revert if token id not listed by owner", async () => {
            let nftPrice = ethers.parseUnits("1");

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);

            await expect(deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                0,
                nftPrice,
                deployedNatriumTicketingContract.target
            )).to.be.revertedWith("You are not the owner of this Nft");
        });
    });

    describe("Buy Nft", function () {
        it("should purchase nfts by Buyer's", async () => {
            let nftPrice = ethers.parseUnits("0.3");
            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                nftPrice,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                0,
                minter1.address,
                deployedNatriumTicketingContract.target,
                { value: ethers.parseUnits("0.3") }
            );

            let PurchaseTokens = await deployedNatriumMarketPlaceContract.queryFilter("buyNFT");
            let Tokens = PurchaseTokens[0];
            let BuyerAddress = Tokens.args.buyer
            let TokenId = Tokens.args.tokenID
            let PayPrice = Tokens.args.paidPrice;
            let purchaseTime = Tokens.args.timeStamp;

            console.log("Buyrer Address :", BuyerAddress,
                "Token Id :", TokenId,
                "Purchasing amount :", PayPrice,
                "Purchase Time", purchaseTime
            );
            expect(BuyerAddress).to.be.equal(buyer1.address);

            //Now Check If service fees successfully transfer to Marketplace Wallet.

            let ServiceFees = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            let Fees = ServiceFees[0];

            let MarketplaceOwner = Fees.args.owner
            let ServiceFee = Fees.args.serviceFees

            console.log("MarketplaceOwner :", MarketplaceOwner, ":", "ServiceFee", ServiceFee);

            expect(MarketplaceOwner).to.be.equal(owner.address);
            expect(MarketplaceOwner).not.to.be.equal(minter1.address);

            //Also check If Nft price is transfer to seller wallet along with tax deduction.

            let Nft = await deployedNatriumMarketPlaceContract.queryFilter("transferNftPrice");
            let nft = Nft[0];

            let seller = nft.args.seller
            let price = nft.args.nftPrice

            console.log("Seller Address", seller, ":", "Nft price after deduction", price);
            expect(seller).to.be.equal(minter1.address);
            expect(seller).not.to.equal(MarketplaceOwner);

        });
        it("should revert if seller is invalid", async() => {
            let nftPrice = ethers.parseUnits("0.3");

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target, 1);

            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                nftPrice,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                1,
                nftPrice,
                deployedNatriumTicketingContract.target
            );

            await expect(deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                0,
                minter2.address,
                deployedNatriumTicketingContract.target,
                { value: ethers.parseUnits("0.3") }
            )).to.be.revertedWith("Invalid Seller");
        });

        it("should revert if msg.value < Nft price", async() => {
            let nftPrice = ethers.parseUnits("0.3");

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target, 1);

            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                nftPrice,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                1,
                nftPrice,
                deployedNatriumTicketingContract.target
            );

            await expect(deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                0,
                minter1.address,
                deployedNatriumTicketingContract.target,
                { value: ethers.parseUnits("0.1") }
            )).to.be.revertedWith("InSufficient Amount");
        });
    });

    describe.only("Create Offer", function() {
        it("should create offer by different buyers", async() => {
            let nftPrice1 = ethers.parseUnits("0.3");
            let nftPrice2 = ethers.parseUnits("0.2");

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target, 1);

            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                nftPrice1,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                1,
                nftPrice2,
                deployedNatriumTicketingContract.target
            );

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            let offerStart = getBlock.timestamp;
            let offerEnd = offerStart + (2 * 86400);

            await deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
                0,
                ethers.parseUnits("0.15"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.15")}
            );

            await deployedNatriumMarketPlaceContract.connect(buyer2).createOffer(
                0,
                ethers.parseUnits("0.19"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.19")}
            );

            let getNFTDetails = await deployedNatriumMarketPlaceContract.getNftDetails();
            let teackprice  = await deployedNatriumMarketPlaceContract.trackOfferPrice(buyer2.address);
            console.log("Nft Details", teackprice);
        })
    })
})