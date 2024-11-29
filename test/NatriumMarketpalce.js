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

    describe("Create Offer", function() {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                0,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.17")}
            );

            let contractBalance = await deployedNatriumMarketPlaceContract.getBalance();
            console.log("Contract Balance", contractBalance);
        });

        it("should revert if token is not list on Marketplace", async() => {
            let nftPrice1 = ethers.parseUnits("0.3");
            let nftPrice2 = ethers.parseUnits("0.2");

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target, 1);

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            let offerStart = getBlock.timestamp;
            let offerEnd = offerStart + (2 * 86400);

            await expect(deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
                0,
                ethers.parseUnits("0.15"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.15")}
            )).to.be.revertedWith("This token is not Listed");
        });
        it("should revert if msg.value is not equal to offer price", async() => {
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

            await expect(deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
                0,
                ethers.parseUnits("0.15"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.11")}
            )).to.be.revertedWith("Invalid amount")
        });
        it("should revert on Time Error", async() => {
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

            await expect(deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
                0,
                ethers.parseUnits("0.15"),
                offerStart,
                minter1.address,
                {value: ethers.parseUnits("0.11")}
            )).to.be.revertedWith("Time Error")
        });
        it("should revert if already create offer on that specific Nft", async() => {
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

            await expect(deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
                0,
                ethers.parseUnits("0.15"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.15")}
            )).to.be.revertedWith("Already Placed Offer")
        })
    });

    describe.only("accept Offer", function() {
        it("should accept offer only by Lister", async() => {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                0,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.17")}
            );

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter2.address,
                {value: ethers.parseUnits("0.17")}
            );

            let ContractBalancebefore = await deployedNatriumMarketPlaceContract.getBalance();
            console.log("Contract Balance Before", ContractBalancebefore);

            await deployedNatriumMarketPlaceContract.connect(minter1).acceptOffers(
                0,
                buyer2.address
            );

            // await deployedNatriumMarketPlaceContract.connect(minter2).acceptOffers(
            //     1,
            //     buyer3.address
            // )

            let offerMapping = await deployedNatriumMarketPlaceContract.connect(buyer2).getOfferDetails(0);
            console.log("Offer Array", offerMapping);

            let ContractBalanceAfter = await deployedNatriumMarketPlaceContract.getBalance();
            console.log("Contract Balance After", ContractBalanceAfter);

            let trackBalance = await deployedNatriumMarketPlaceContract.trackOfferPrice(buyer3.address);
            console.log("User Remaining Balance", trackBalance);

            let Nft = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            let nft = Nft[0];

            let Owner = nft.args.owner
            let ServiceFees = nft.args.serviceFees;

            console.log("Contract Owner", Owner, ":", "Service Fees", ServiceFees);

            expect(Owner).to.be.equal(owner.address)

            let nFt = await deployedNatriumMarketPlaceContract.queryFilter("transferNftPrice");
            let nfT = nFt[0];

            let ListerAddress = nfT.args.seller
            let NftAmount = nfT.args.nftPrice;

            console.log("Lister Address", ListerAddress, ":", "Total Nft Price After tax deduction", NftAmount);

            expect(ListerAddress).to.be.equal(minter1.address)


        });

        it("should revert if Seller is not Lister", async() => {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter2.address,
                {value: ethers.parseUnits("0.17")}
            );

            await expect(deployedNatriumMarketPlaceContract.connect(minter2).acceptOffers(
                0,
                buyer3.address
            )).to.be.revertedWith("Only Seller can accept the offer");
        });

        it("should revert if no amount is received from Buyer", async() => {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter2.address,
                {value: ethers.parseUnits("0.17")}
            );

            await deployedNatriumMarketPlaceContract.connect(minter1).acceptOffers(
                0,
                buyer2.address
            )

            await expect(deployedNatriumMarketPlaceContract.connect(minter1).acceptOffers(
                0,
                buyer2.address
            )).to.be.revertedWith("Doesn't receive offer");
        });

        it("should revert if offer time is over", async() => {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter2.address,
                {value: ethers.parseUnits("0.17")}
            );

            let PassedDay = 3 * (24 * 60 * 60);

            await ethers.provider.send('evm_increaseTime', [PassedDay]);
            await ethers.provider.send('evm_mine')

            await expect(deployedNatriumMarketPlaceContract.connect(minter1).acceptOffers(
                0,
                buyer2.address
            )).to.be.revertedWith("Offer Expired");
        });

        it("should revert if token has not received the offer", async() => {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                0,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter1.address,
                {value: ethers.parseUnits("0.17")}
            );

            await expect(deployedNatriumMarketPlaceContract.connect(minter2).acceptOffers(
                1,
                buyer1.address
            )).to.be.revertedWith("This token has no offer");
        });
    });

    describe("Reject Offer", function() {
        it("should rejected only by Seller", async() => {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter2.address,
                {value: ethers.parseUnits("0.17")}
            );

            await deployedNatriumMarketPlaceContract.connect(minter1).rejectOffer(
                0,
                buyer1.address
            );
        });
    });

    describe("With-Draw Amount", function(){
        it("should withDraw amount by buyer", async() => {
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

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.17"),
                offerEnd,
                minter2.address,
                {value: ethers.parseUnits("0.17")}
            );

            await deployedNatriumMarketPlaceContract.connect(buyer1).withDraw(0);
            await deployedNatriumMarketPlaceContract.connect(buyer2).withDraw(0);
            await deployedNatriumMarketPlaceContract.connect(buyer3).withDraw(1);
            
            let ContractBalance = await deployedNatriumMarketPlaceContract.getBalance();
            console.log("Contract Balance", ContractBalance);

            let TrackBuyerBalance =await deployedNatriumMarketPlaceContract.trackOfferPrice(buyer3.address);
            console.log("Track Buyer Balance", TrackBuyerBalance);
        });
    });
})