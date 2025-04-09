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

    let tokenURI = "www.Eventholder.com";
    let serviceFess = 10;
    let walletAddress;
    let _usdtTokenAddress;

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

        let name = "Dragon ball Super";
        let symbol = "DBS";

        let _eventName = "Dragon ball Premiere";
        let _startDate;
        let _endDate;
        let _ticketStartBuyDate;
        let _ticketEndBuyDate;


        const tickets = [
            {
                ticketType: "VIP",
                quantity: 100,
                price: ethers.parseUnits("50", 6)
            },
            {
                ticketType: "Admission",
                quantity: 200,
                price: ethers.parseUnits("20", 6)
            }
        ];

        const NatriumFactoryContract = await ethers.getContractFactory("EventDeployer");
        deployedNatriumFactoryContract = await upgrades.deployProxy(NatriumFactoryContract, [_usdtTokenAddress.address, walletAddress.address], { initializer: 'initialize' });
        await deployedNatriumFactoryContract.connect(owner).waitForDeployment();

        //        console.log("Natrium Factory Contract deployed to:", deployedNatriumFactoryContract.target);

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
            "Collections",
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
        console.log("NatirumToken deployed to:", deployedNatriumTicketingContract.target);

        //Natrium Nft Marketplace
        const NatirumMarketplace = await ethers.getContractFactory("NatirumMarketplace");

        deployedNatriumMarketPlaceContract = await upgrades.deployProxy(NatirumMarketplace, [], { initializer: 'initialize' });

        // Wait for the contract to be deployed
        await deployedNatriumMarketPlaceContract.connect(owner).waitForDeployment();

        //    console.log("NatirumMarketplace deployed to:", deployedNatriumMarketPlaceContract.target);

    });
    // describe("List Nft", function () {
    //     it("should list nft by minter", async () => {
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "tokenURI");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "TOKENS");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "NFTS");
    //         await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, "www.nft.com");
    //         await deployedNatriumTicketingContract.connect(minter2).mintTicket(0, "www.nft.com");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "tokenURI");

    //         let getBlockNumber = await ethers.provider.getBlockNumber();
    //         getBlock = await ethers.provider.getBlock(getBlockNumber);
    //         _startDate = getBlock.timestamp;
    //         let endDate = _startDate + (50 * 86400);

    //         // let ListNFT1 = await deployedNatriumFactoryContract.queryFilter("CollectionMinted");
    //         // let NFT1 = ListNFT1[5];
    //         // let Seller1 = NFT1.args.CollectionUri;
    //         // let TokenId1 = NFT1.args.ticketAddress;
    //         // let HostContract1 = NFT1.args.ticketIndex;
    //         // let Nft1Price = NFT1.args.tokenIds;
    //         // let Listed1 = NFT1.args.tokenURIs;

    //         // console.log("Seller1", Seller1, ":",
    //         //     "TokenId1", TokenId1, ":",
    //         //     "HostContract1", HostContract1, ":",
    //         //     "Nft1Price", Nft1Price, ":",
    //         //     "Listed1", Listed1
    //         // );

    //         await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

    //         await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
    //         await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,3);
    //         await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
    //             0, 
    //             ethers.parseUnits("0.3"),
    //             endDate,
    //             deployedNatriumTicketingContract.target
    //         );

    //         await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
    //             3, 
    //             ethers.parseUnits("0.5"),
    //             endDate,
    //             deployedNatriumTicketingContract.target
    //         );

    //         let ListNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
    //         let NFT1 = ListNFT1[1];
    //         let Seller1 = NFT1.args.seller;
    //         let TokenId1 = NFT1.args.tokenID;
    //         let HostContract1 = NFT1.args.hostContract;
    //         let Nft1Price = NFT1.args.nftPrice;

    //         console.log("Seller1", Seller1,":",
    //             "TokenId1",TokenId1, ":",
    //             "HostContract1", HostContract1, ":",
    //             "Nft1Price", Nft1Price
    //         );


    //         // await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
    //         //     3, 
    //         //     ethers.parseUnits("0.5"),
    //         //     endDate,
    //         //     deployedNatriumTicketingContract.target
    //         // );

     

    //     })
    // });

    describe("Buy Nft", function () {
        it("should buy nft ", async () => {

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "tokenURI");
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "TOKENS");
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "NFTS");
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, "www.nft.com");
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(0, "www.nft.com");
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "tokenURI");

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            let EventStartDate = getBlock.timestamp;
           let  EventEndDate = EventStartDate + (2 * 86400);

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,3);
            
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0, 
                ethers.parseUnits("0.3"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            // let ListNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            // let NFT1 = ListNFT1[0];
            // let Seller1 = NFT1.args.seller;
            // let TokenId1 = NFT1.args.tokenID;
            // let HostContract1 = NFT1.args.hostContract;
            // let Nft1Price = NFT1.args.nftPrice;

            // console.log("Seller1", Seller1,":",
            //     "TokenId1",TokenId1, ":",
            //     "HostContract1", HostContract1, ":",
            //     "Nft1Price", Nft1Price
            // );


            await deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                0,
                deployedNatriumTicketingContract.target,
                { value: ethers.parseUnits("0.3") }
            );

            await deployedNatriumTicketingContract.connect(buyer1).approve(deployedNatriumMarketPlaceContract.target,0);

            await deployedNatriumMarketPlaceContract.connect(buyer1).listNft(
                0, 
                ethers.parseUnits("0.7"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("GetNft");
            let NFT2 = ListNFT2[1];
            let Seller2 = NFT2.args.owner;
            let TokenId2 = NFT2.args.hostContract;
            let HostContract2 = NFT2.args.tokenID;
            let Nft2Price = NFT2.args.tokenUri;
            let CURI = NFT2.args.CollectionUri;
            let TT = NFT2.args.TicketType;
            let PP = NFT2.args.previousPrice;
            let CP = NFT2.args.currentPrice;

            console.log("Seller2", Seller2,":",
                "TokenId2",TokenId2, ":",
                "HostContract2", HostContract2, ":",
                "Nft2Price", Nft2Price,
                CURI,
                TT,
                PP,CP

            );  

            let BuyNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("TransferNft");
            let BuyNft1 = BuyNFT1[0];
            let User = BuyNft1.args.from;
            let Buyer1 = BuyNft1.args.to;
            let tokenID1 = BuyNft1.args.tokenID;
            let PaidPrice1 = BuyNft1.args.paidPrice;
            let Timestamp1 = BuyNft1.args.timeStamp;

            expect(User).to.be.equal(minter1.address)

            console.log(
                "seller", User,
                "Buyer1", Buyer1, ":",
                "tokenID1", tokenID1, ":",
                "PaidPrice1", PaidPrice1, ":",
                "Timestamp1", Timestamp1
            );

            let transferNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferNftPrice");
            let Trasnfer1 = transferNFT1[0];
            let seller1 = Trasnfer1.args.seller;
            let nftprice1 = Trasnfer1.args.nftPrice;
            let timestamp1 = Trasnfer1.args.timeStamp;

            console.log("seller1", seller1, ":",
                "nftprice1", nftprice1, ":",
                "PaidPrice1", PaidPrice1, ":",
                "timestamp1", timestamp1
            );

            let serviceFeeNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            let serviceFee1 = serviceFeeNFT1[0];
            let Owner = serviceFee1.args.owner;
            let ServiceAmount = serviceFee1.args.serviceFees;

            console.log("seller1", seller1, ":",
                "Owner", Owner, ":",
                "ServiceAmount", ServiceAmount
            );
        });
    });

    // describe("Create Offer", function () {
    //     it("should Create offer by different user", async () => {

    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "tokenURI");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "TOKENS");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "NFTS");
    //         await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, "www.nft.com");
    //         await deployedNatriumTicketingContract.connect(minter2).mintTicket(0, "www.nft.com");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "tokenURI");

    //         let getBlockNumber = await ethers.provider.getBlockNumber();
    //         getBlock = await ethers.provider.getBlock(getBlockNumber);
    //         let EventStartDate = getBlock.timestamp;
    //        let  EventEndDate = EventStartDate + (30 * 86400);

    //         await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

    //         await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
    //         await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,3);
            
    //         await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
    //             0, 
    //             ethers.parseUnits("0.3"),
    //             EventEndDate,
    //             deployedNatriumTicketingContract.target
    //         );

    //         let getBlockNumber1 = await ethers.provider.getBlockNumber();
    //         let getBlock1 = await ethers.provider.getBlock(getBlockNumber1);
    //         let startTime = getBlock1.timestamp;
    //         let endTime = startTime + (3 * 86400);

    //         await deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
    //             0,
    //             deployedNatriumTicketingContract.target,
    //             ethers.parseUnits("0.4"),
    //             endTime,
    //             { value: ethers.parseUnits("0.4") }
    //         );

    //         await deployedNatriumMarketPlaceContract.connect(buyer2).createOffer(
    //             0,
    //             deployedNatriumTicketingContract.target,
    //             ethers.parseUnits("0.35"),
    //             endTime,
    //             { value: ethers.parseUnits("0.35") }
    //         );

    //         await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
    //             0,
    //             deployedNatriumTicketingContract.target,
    //             ethers.parseUnits("0.6"),
    //             endTime,
    //             { value: ethers.parseUnits("0.6") }
    //         );


    //         let Offer = await deployedNatriumMarketPlaceContract.queryFilter("makeOffer");
    //         let offer = Offer[2];
    //         let Offerer = offer.args.buyer;
    //         let OffererPrice = offer.args.offerPrice;
    //         let TokenId = offer.args.tokenId;

    //         console.log("Offerer address", Offerer, ":", "Offerer Price", OffererPrice, ":", "TokenId", TokenId)

    //         let ContractBalance = await ethers.provider.getBalance(deployedNatriumMarketPlaceContract.target);
    //         console.log("Contract Balance :", ContractBalance);

    //         let trackBuyer1 = await deployedNatriumMarketPlaceContract.connect(buyer1).trackOfferPrice(buyer1.address);
    //         let trackBuyer2 = await deployedNatriumMarketPlaceContract.connect(buyer2).trackOfferPrice(buyer2.address);
    //         let trackBuyer3 = await deployedNatriumMarketPlaceContract.connect(buyer3).trackOfferPrice(buyer3.address);

    //         console.log("Track Price buyer 1", trackBuyer1);
    //         console.log("Track Price buyer 2", trackBuyer2);
    //         console.log("Track Price buyer 3", trackBuyer3);
    //     })
    // });

    // describe("Accept Offer", function () {
    //     it("should accept offer by Lister", async () => {
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "tokenURI");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "TOKENS");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "NFTS");
    //         await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, "www.nft.com");
    //         await deployedNatriumTicketingContract.connect(minter2).mintTicket(0, "www.nft.com");
    //         await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "tokenURI");

    //         let getBlockNumber = await ethers.provider.getBlockNumber();
    //         getBlock = await ethers.provider.getBlock(getBlockNumber);
    //         let EventStartDate = getBlock.timestamp;
    //        let  EventEndDate = EventStartDate + (30 * 86400);

    //         await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);

    //         await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
    //         await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,3);
            
    //         await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
    //             0, 
    //             ethers.parseUnits("0.3"),
    //             EventEndDate,
    //             deployedNatriumTicketingContract.target
    //         );

    //         let getBlockNumber1 = await ethers.provider.getBlockNumber();
    //         let getBlock1 = await ethers.provider.getBlock(getBlockNumber1);
    //         let startTime = getBlock1.timestamp;
    //         let endTime = startTime + (3 * 86400);

    //         await deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
    //             0,
    //             deployedNatriumTicketingContract.target,
    //             ethers.parseUnits("0.4"),
    //             endTime,
    //             { value: ethers.parseUnits("0.4") }
    //         );

    //         await deployedNatriumMarketPlaceContract.connect(buyer2).createOffer(
    //             0,
    //             deployedNatriumTicketingContract.target,
    //             ethers.parseUnits("0.35"),
    //             endTime,
    //             { value: ethers.parseUnits("0.35") }
    //         );

    //         await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
    //             0,
    //             deployedNatriumTicketingContract.target,
    //             ethers.parseUnits("0.6"),
    //             endTime,
    //             { value: ethers.parseUnits("0.6") }
    //         );

    //         await deployedNatriumMarketPlaceContract.connect(minter1).acceptOffers(
    //             0,
    //             buyer1.address,
    //             deployedNatriumTicketingContract.target
    //         );

    //         await deployedNatriumMarketPlaceContract.connect(buyer2).withDraw(0);
    //       //  await deployedNatriumMarketPlaceContract.connect(buyer3).withDraw(0);

    //         let ContractBalance = await ethers.provider.getBalance(deployedNatriumMarketPlaceContract.target);
    //         console.log("Contract Balance After:", ContractBalance);


    //         let trackBuyer1Before = await deployedNatriumMarketPlaceContract.connect(buyer1).trackOfferPrice(buyer1.address);
    //         let trackBuyer2Before = await deployedNatriumMarketPlaceContract.connect(buyer2).trackOfferPrice(buyer2.address);
    //         let trackBuyer3Before = await deployedNatriumMarketPlaceContract.connect(buyer3).trackOfferPrice(buyer3.address);

    //         console.log("Track Price buyer 1 after accept offer", trackBuyer1Before);
    //         console.log("Track Price buyer 2 after accept offer", trackBuyer2Before);
    //         console.log("Track Price buyer 3 after accept offer", trackBuyer3Before);


    //     })
    // });
});
