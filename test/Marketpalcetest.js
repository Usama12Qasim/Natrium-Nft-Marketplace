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
    describe("Create New Collections", function () {
        it("should create New Collections by Different User", async () => {
            let Name = "Nick Jonas";
            let Symbol = "MCT";
            let Event = "Music Concert";
            let EventStartDate;
            let EventEndDate;
            let TicketBuyStart;
            let TicketEndStart;

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            EventStartDate = getBlock.timestamp;
            EventEndDate = EventStartDate + (2 * 86400);

            TicketBuyStart = EventStartDate;
            TicketEndStart = EventEndDate - 86400;

            const Ticket = [
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
            let TokenAddress = addr1.address;

            await deployedNatriumFactoryContract.connect(minter1).deployNewCollection(
                Name,
                Symbol,
                "Collection Uri",
                Event,
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Ticket,
                TokenAddress,
                walletAddress
            );
            let newCollectionAddress1 = await deployedNatriumFactoryContract.contractAddresses(0);

            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress1);
            // await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress2);

            // let approveContract1 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress1);
            // let approveContract2 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress2);

            // console.log("Confirm Approve Collection Address of minter1", approveContract1);
            // console.log("Confirm Approve Collection Address of minter2", approveContract2);

            let approveContract = await deployedNatriumFactoryContract.queryFilter("CollectionApproval");
            let ApproveContract = approveContract[0];
            let CollectionAddress = ApproveContract.args.collectionAddress;
            let IsApprove = ApproveContract.args.isApproved;

            console.log("CollectionAddress", CollectionAddress, "Is Approved", IsApprove);
        });
    });

    describe("List Nfts", function () {
        it("should list Nfts", async () => {
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "tokenURI");
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            EventStartDate = getBlock.timestamp;
            EventEndDate = EventStartDate + (2 * 86400);

            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                ethers.parseUnits("0.3"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("listNfts");
            let NFT2 = ListNFT2[0];
            let tokenid = NFT2.args.tokenID;
            let tickettype = NFT2.args.TicketType;
            let tokenuri = NFT2.args.TokenURI;
            let price = NFT2.args.NftPrice;
            let expiry = NFT2.args.NftExpiration;
            let CollectionAddress = NFT2.args.hostContract;
            let Seller = NFT2.args.seller;

            console.log("Seller", Seller, "TokenID", tokenid, "TicketType", tickettype, "TokenUri", tokenuri, "Nft price", price, "Nft Expires", expiry, "Collection Address", CollectionAddress);

            expect(Seller).to.be.equal(minter1.address);
            expect(CollectionAddress).to.be.equal(deployedNatriumTicketingContract.target);

            let BeforeBuyBalance = await deployedNatriumTicketingContract.balanceOf(deployedNatriumMarketPlaceContract.target);
            console.log("Before Buy Balance", BeforeBuyBalance);

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFeesAndFactoryContract(serviceFess, deployedNatriumFactoryContract.target);

            await deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                0,
                { value: ethers.parseUnits("0.3") }
            );

            let AfterBuyBalance = await deployedNatriumTicketingContract.balanceOf(deployedNatriumMarketPlaceContract.target);
            console.log("After Buy Balance", AfterBuyBalance);

            await deployedNatriumTicketingContract.connect(buyer1).approve(deployedNatriumMarketPlaceContract.target, 0);

            await deployedNatriumMarketPlaceContract.connect(buyer1).listNft(
                0,
                ethers.parseUnits("0.5"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(buyer2).buyNft(
                0,
                { value: ethers.parseUnits("0.5") }
            );

            let buyer2Balance = await deployedNatriumTicketingContract.balanceOf(buyer2.address);
            console.log("Buyer2 balance", buyer2Balance);

            await deployedNatriumTicketingContract.connect(buyer2).approve(deployedNatriumMarketPlaceContract.target, 0);

            await deployedNatriumMarketPlaceContract.connect(buyer2).listNft(
                0,
                ethers.parseUnits("0.8"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.getNft(0);

            let FetchNft = await deployedNatriumMarketPlaceContract.queryFilter("GetNft");
            let fetchNft = FetchNft[0];
            let TokenID = fetchNft.args.tokenID;
            let TokenURI = fetchNft.args.tokenUri;
            let CollectionURI = fetchNft.args.CollectionUri;
            let TICKetType = fetchNft.args.TicketType;
            let PeviouePrice = fetchNft.args.previousPrice;
            let CURENTPrice = fetchNft.args.currentPrice;

            console.log(TokenID, TokenURI, CollectionURI, TICKetType, PeviouePrice, CURENTPrice);

            //await deployedNatriumMarketPlaceContract.connect(buyer2).unListNft(0);

            // let PassedDay = 2 * (24 * 60 * 60);

            // await ethers.provider.send('evm_increaseTime', [PassedDay]);
            // await ethers.provider.send('evm_mine')

            await deployedNatriumMarketPlaceContract.connect(buyer3).buyNft(
                0,
                { value: ethers.parseUnits("0.8") }
            );

            let transferNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferNftPrice");
            let Trasnfer1 = transferNFT1[2];
            let seller1 = Trasnfer1.args.seller;
            let nftprice1 = Trasnfer1.args.nftPrice;
            let timestamp1 = Trasnfer1.args.timeStamp;

            console.log("seller1", seller1, ":",
                "nftprice1", nftprice1, ":",
                "PaidPrice1", nftprice1, ":",
                "timestamp1", timestamp1
            );

            let serviceFeeNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            let serviceFee1 = serviceFeeNFT1[2];
            let Owner = serviceFee1.args.owner;
            let ServiceAmount = serviceFee1.args.serviceFees;

            console.log("seller1", seller1, ":",
                "Owner", Owner, ":",
                "ServiceAmount", ServiceAmount
            );
        });
    });

    describe("Offers", function () {
        it("should make accept an reject offer", async () => {
            //await deployedNatriumFactoryContract.connect(owner).approveContract(deployedNatriumTicketingContract.target);
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "tokenURI");
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            EventStartDate = getBlock.timestamp;
            EventEndDate = EventStartDate + (2 * 86400);

            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                ethers.parseUnits("0.3"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );




            let BeforeBuyBalance = await deployedNatriumTicketingContract.balanceOf(deployedNatriumMarketPlaceContract.target);
            console.log("Before Buy Balance", BeforeBuyBalance);

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFeesAndFactoryContract(serviceFess, deployedNatriumFactoryContract.target);

            await deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                0,
                { value: ethers.parseUnits("0.3") }
            );

            let AfterBuyBalance = await deployedNatriumTicketingContract.balanceOf(deployedNatriumMarketPlaceContract.target);
            console.log("After Buy Balance", AfterBuyBalance);

            await deployedNatriumTicketingContract.connect(buyer1).approve(deployedNatriumMarketPlaceContract.target, 0);

            await deployedNatriumMarketPlaceContract.connect(buyer1).listNft(
                0,
                ethers.parseUnits("0.5"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );



            await deployedNatriumMarketPlaceContract.connect(buyer2).buyNft(
                0,
                { value: ethers.parseUnits("0.5") }
            );

            let buyer2Balance = await deployedNatriumTicketingContract.balanceOf(buyer2.address);
            console.log("Buyer2 balance", buyer2Balance);

            await deployedNatriumTicketingContract.connect(buyer2).approve(deployedNatriumMarketPlaceContract.target, 0);

            await deployedNatriumMarketPlaceContract.connect(buyer2).listNft(
                0,
                ethers.parseUnits("0.8"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT2 = ListNFT2[2];
            let tokenid = NFT2.args.tokenID;
            let tickettype = NFT2.args.TicketType;
            let tokenuri = NFT2.args.tokenUri;
            let price = NFT2.args.nftPrice;
            let expiry = NFT2.args.Expiration;
            let CollectionAddress = NFT2.args.hostContract;
            let Seller = NFT2.args.seller;

            console.log("Seller", Seller, "TokenID", tokenid, "TicketType", tickettype, "TokenUri", tokenuri, "Nft price", price, "Nft Expires", expiry, "Collection Address", CollectionAddress);

            // event ListNFT(
            //     address seller,
            //     uint256 tokenID,
            //     string TicketType,
            //     string tokenUri,
            //     address hostContract,
            //     uint256 nftPrice,
            //     uint256 Expiration
            // );
            await deployedNatriumMarketPlaceContract.getNft(0);

            let FetchNft = await deployedNatriumMarketPlaceContract.queryFilter("GetNft");
            let fetchNft = FetchNft[0];
            let TokenID = fetchNft.args.tokenID;
            let TokenURI = fetchNft.args.tokenUri;
            let CollectionURI = fetchNft.args.CollectionUri;
            let TICKetType = fetchNft.args.TicketType;
            let PeviouePrice = fetchNft.args.previousPrice;
            let CURENTPrice = fetchNft.args.currentPrice;
            let Time = fetchNft.args.timestamps;

            console.log(TokenID, TokenURI, CollectionURI, TICKetType, PeviouePrice, CURENTPrice, Time);



            //await deployedNatriumMarketPlaceContract.connect(buyer2).unListNft(0);

            let OfferEndTime = EventStartDate + (2 * 86400);
            // let PassedDay = 2 * (24 * 60 * 60);

            // await ethers.provider.send('evm_increaseTime', [PassedDay]);
            // await ethers.provider.send('evm_mine')
            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                0,
                ethers.parseUnits("0.35"),
                OfferEndTime,
                { value: ethers.parseUnits("0.35") }
            );

            let trackPrice = await deployedNatriumMarketPlaceContract.trackOfferPrice(buyer3.address);
            console.log("Track price for buyer3", trackPrice);
            // let transferNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferNftPrice");
            // let Trasnfer1 = transferNFT1[2];
            // let seller1 = Trasnfer1.args.seller;
            // let nftprice1 = Trasnfer1.args.nftPrice;
            // let timestamp1 = Trasnfer1.args.timeStamp;

            // console.log("seller1", seller1, ":",
            //     "nftprice1", nftprice1, ":",
            //     "PaidPrice1", nftprice1, ":",
            //     "timestamp1", timestamp1
            // );

            // let serviceFeeNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            // let serviceFee1 = serviceFeeNFT1[2];
            // let Owner = serviceFee1.args.owner;
            // let ServiceAmount = serviceFee1.args.serviceFees;

            // console.log("seller1", seller1, ":",
            //     "Owner", Owner, ":",
            //     "ServiceAmount", ServiceAmount
            // );


        })
    });

    describe.only("List Only", function () {
        it("should list only", async () => {
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "tokenURI");
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(1, "NFTS");
            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, "Natrium");

            await deployedNatriumTicketingContract.connect(minter2).mintTicket(0, "Marketplace");
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(0, "Checks");
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(0, "DEXS");

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 0);
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 1);
            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target, 2);

            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target, 3);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target, 4);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target, 5);

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            EventStartDate = getBlock.timestamp;
            EventEndDate = EventStartDate + (2 * 86400);
            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFees(serviceFess);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0,
                ethers.parseUnits("0.3"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );


            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                1,
                ethers.parseUnits("0.5"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                2,
                ethers.parseUnits("0.8"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                3,
                ethers.parseUnits("0.3"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );
            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                4,
                ethers.parseUnits("0.5"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );
            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                5,
                ethers.parseUnits("1"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(buyer2).buyNft(
                5,
                deployedNatriumTicketingContract.target,
                { value: ethers.parseUnits("1") }
            );

            await deployedNatriumTicketingContract.connect(buyer2).approve(deployedNatriumMarketPlaceContract.target, 5);
            await deployedNatriumMarketPlaceContract.connect(buyer2).listNft(
                5,
                ethers.parseUnits("1.5"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );
            await deployedNatriumMarketPlaceContract.connect(buyer3).buyNft(
                5,
                deployedNatriumTicketingContract.target,
                { value: ethers.parseUnits("1.5") }
            );

            await deployedNatriumTicketingContract.connect(buyer3).approve(deployedNatriumMarketPlaceContract.target, 5);
            await deployedNatriumMarketPlaceContract.connect(buyer3).listNft(
                5,
                ethers.parseUnits("2"),
                EventEndDate,
                deployedNatriumTicketingContract.target
            );

            await deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                5,
                deployedNatriumTicketingContract.target,
                { value: ethers.parseUnits("2") }
            );

           // await deployedNatriumMarketPlaceContract.connect(minter1).unListNft(2, deployedNatriumTicketingContract.target);
        //    await deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(         1,
        //     deployedNatriumTicketingContract.target,
        //     { value: ethers.parseUnits("0.5") })

      //  await deployedNatriumMarketPlaceContract.connect(minter1).unListNft(0, deployedNatriumTicketingContract.target)
            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT2 = ListNFT2[7];
            let tokenid = NFT2.args.tokenID;
            let tickettype = NFT2.args.TicketType;
            let tokenuri = NFT2.args.tokenUri;
            let price = NFT2.args.nftPrice;
            let expiry = NFT2.args.Expiration;

           console.log("TokenID", tokenid, "TicketType", tickettype, "TokenUri", tokenuri, "Nft price", price, "Nft Expires", expiry);

           let FetchNft = await deployedNatriumMarketPlaceContract.queryFilter("GetNft");
           let fetchNft = FetchNft[7];
           let TokenID = fetchNft.args.tokenID;
           let TokenURI = fetchNft.args.tokenUri;
           let CollectionURI = fetchNft.args.CollectionUri;
           let TICKetType = fetchNft.args.TicketType;
           let PeviouePrice = fetchNft.args.previousPrice;
           let CURENTPrice = fetchNft.args.currentPrice;
           let Time = fetchNft.args.timestamps;

           console.log(TokenID, TokenURI, CollectionURI, TICKetType, PeviouePrice, CURENTPrice, Time);

           let BuyNFTS = await deployedNatriumMarketPlaceContract.queryFilter("TransferNft");
           let buyNfts = BuyNFTS[2];
           let From = buyNfts.args.from;
           let To = buyNfts.args.to;
           let Tokenids = buyNfts.args.tokenID;
           let paidprice = buyNfts.args.paidPrice;
           let time = buyNfts.args.timeStamp;

           console.log(From,To,Tokenids,paidprice,time)

        })
    })
});