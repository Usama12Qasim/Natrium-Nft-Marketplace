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
                price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
            },
            {
                ticketType: "Admission",
                quantity: 200,
                price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
            }
        ];

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
                Event,
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Ticket,
                TokenAddress,
                walletAddress
            );

            const Tickets = [
                {
                    ticketType: "VVIP",
                    quantity: 50,
                    price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
                },
                {
                    ticketType: "General Admission",
                    quantity: 100,
                    price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
                }
            ];

            await deployedNatriumFactoryContract.connect(minter2).deployNewCollection(
                "Name",
                "Symbol",
                "Event",
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Tickets,
                TokenAddress,
                walletAddress
            );

            let newCollectionAddress1 = await deployedNatriumFactoryContract.contractAddresses(0);
            let newCollectionAddress2 = await deployedNatriumFactoryContract.contractAddresses(1);
            console.log("New Collection Address of minter 1", newCollectionAddress1);
            console.log("New Collection Address of minter 2", newCollectionAddress2);

            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress1);
            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress2);

            let approveContract1 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress1);
            let approveContract2 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress2);

            console.log("Confirm Approve Collection Address of minter1", approveContract1);
            console.log("Confirm Approve Collection Address of minter2", approveContract2);
        });
    });
    describe("Mint Nft Ticekt", function () {
        it("should Mint Nft", async () => {
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

            let tickets = [
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
                Event,
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                tickets,
                TokenAddress,
                walletAddress
            );

            let Tickets = [
                {
                    ticketType: "VVIP",
                    quantity: 50,
                    price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
                },
                {
                    ticketType: "Regular customer",
                    quantity: 100,
                    price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
                }
            ];

            await deployedNatriumFactoryContract.connect(minter2).deployNewCollection(
                "Name",
                "Symbol",
                "Event",
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Tickets,
                TokenAddress,
                walletAddress
            );

            let newCollectionAddress1 = await deployedNatriumFactoryContract.contractAddresses(0);
            let newCollectionAddress2 = await deployedNatriumFactoryContract.contractAddresses(1);
            console.log("New Collection Address of minter 1", newCollectionAddress1);
            console.log("New Collection Address of minter 2", newCollectionAddress2);

            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress1);
            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress2);

            let approveContract1 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress1);
            let approveContract2 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress2);

            console.log("Confirm Approve Collection Address of minter1", approveContract1);
            console.log("Confirm Approve Collection Address of minter2", approveContract2);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);
        })
    });

    describe("List Nft", function() {
        it("should list nft by minter", async() => {
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

            let tickets = [
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
                Event,
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                tickets,
                TokenAddress,
                walletAddress
            );

            let Tickets = [
                {
                    ticketType: "VVIP",
                    quantity: 50,
                    price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
                },
                {
                    ticketType: "Regular customer",
                    quantity: 100,
                    price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
                }
            ];

            await deployedNatriumFactoryContract.connect(minter2).deployNewCollection(
                "Name",
                "Symbol",
                "Event",
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Tickets,
                TokenAddress,
                walletAddress
            );

            let newCollectionAddress1 = await deployedNatriumFactoryContract.contractAddresses(0);
            let newCollectionAddress2 = await deployedNatriumFactoryContract.contractAddresses(1);
            console.log("New Collection Address of minter 1", newCollectionAddress1);
            console.log("New Collection Address of minter 2", newCollectionAddress2);

            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress1);
            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress2);

            let approveContract1 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress1);
            let approveContract2 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress2);

            console.log("Confirm Approve Collection Address of minter1", approveContract1);
            console.log("Confirm Approve Collection Address of minter2", approveContract2);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumFactoryContract.connect(owner).approveContract(deployedNatriumTicketingContract.target);

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFeesAndFactoryContract(serviceFess, deployedNatriumFactoryContract.target);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,1);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0, 
                ethers.parseUnits("0.3"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT1 = ListNFT1[0];
            let Seller1 = NFT1.args.seller;
            let TokenId1 = NFT1.args.tokenID;
            let HostContract1 = NFT1.args.hostContract;
            let Nft1Price = NFT1.args.nftPrice;
            let Listed1 = NFT1.args.isListed;

            console.log("Seller1", Seller1,":",
                "TokenId1",TokenId1, ":",
                "HostContract1", HostContract1, ":",
                "Nft1Price", Nft1Price, ":",
                "Listed1",Listed1
            );

            expect(Seller1).to.be.equal(minter1.address);
            expect(Listed1).to.be.true;

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                1, 
                ethers.parseUnits("0.5"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT2 = ListNFT2[1];
            let Seller2 = NFT2.args.seller;
            let TokenId2 = NFT2.args.tokenID;
            let HostContract2 = NFT2.args.hostContract;
            let Nft2Price = NFT2.args.nftPrice;
            let Listed2 = NFT2.args.isListed;

            console.log("Seller2", Seller2,":",
                "TokenId2",TokenId2, ":",
                "HostContract2", HostContract2, ":",
                "Nft2Price", Nft2Price, ":",
                "Listed2",Listed2
            );       
            
            let NftDetails = await deployedNatriumMarketPlaceContract.getNftDetails(minter1.address, 0);
            console.log("Nft  details", NftDetails);

        })
    });

    describe("Buy Nft", function() {
        it("should buy nft ", async() => {
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

            let tickets = [
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
                Event,
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                tickets,
                TokenAddress,
                walletAddress
            );

            let Tickets = [
                {
                    ticketType: "VVIP",
                    quantity: 50,
                    price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
                },
                {
                    ticketType: "Regular customer",
                    quantity: 100,
                    price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
                }
            ];

            await deployedNatriumFactoryContract.connect(minter2).deployNewCollection(
                "Name",
                "Symbol",
                "Event",
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Tickets,
                TokenAddress,
                walletAddress
            );

            let newCollectionAddress1 = await deployedNatriumFactoryContract.contractAddresses(0);
            let newCollectionAddress2 = await deployedNatriumFactoryContract.contractAddresses(1);
            console.log("New Collection Address of minter 1", newCollectionAddress1);
            console.log("New Collection Address of minter 2", newCollectionAddress2);

            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress1);
            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress2);

            let approveContract1 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress1);
            let approveContract2 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress2);

            console.log("Confirm Approve Collection Address of minter1", approveContract1);
            console.log("Confirm Approve Collection Address of minter2", approveContract2);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumFactoryContract.connect(owner).approveContract(deployedNatriumTicketingContract.target);

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFeesAndFactoryContract(serviceFess, deployedNatriumFactoryContract.target);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,1);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0, 
                ethers.parseUnits("0.3"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT1 = ListNFT1[0];
            let Seller1 = NFT1.args.seller;
            let TokenId1 = NFT1.args.tokenID;
            let HostContract1 = NFT1.args.hostContract;
            let Nft1Price = NFT1.args.nftPrice;
            let Listed1 = NFT1.args.isListed;

            console.log("Seller1", Seller1,":",
                "TokenId1",TokenId1, ":",
                "HostContract1", HostContract1, ":",
                "Nft1Price", Nft1Price, ":",
                "Listed1",Listed1
            );

            expect(Seller1).to.be.equal(minter1.address);
            expect(Listed1).to.be.true;

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                1, 
                ethers.parseUnits("0.5"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT2 = ListNFT2[1];
            let Seller2 = NFT2.args.seller;
            let TokenId2 = NFT2.args.tokenID;
            let HostContract2 = NFT2.args.hostContract;
            let Nft2Price = NFT2.args.nftPrice;
            let Listed2 = NFT2.args.isListed;

            console.log("Seller1", Seller2,":",
                "TokenId1",TokenId2, ":",
                "HostContract1", HostContract2, ":",
                "Nft1Price", Nft2Price, ":",
                "Listed1",Listed2
            );

            await deployedNatriumMarketPlaceContract.connect(buyer1).buyNft(
                0,
                minter1.address,
                deployedNatriumTicketingContract.target,
                {value: ethers.parseUnits("0.3")}
            );

            let BuyNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("buyNFT");
            let BuyNft1 = BuyNFT1[0];
            let Buyer1 = BuyNft1.args.buyer;
            let tokenID1 = BuyNft1.args.tokenID;
            let PaidPrice1 = BuyNft1.args.paidPrice;
            let Timestamp1 = BuyNft1.args.timeStamp;

            console.log("Buyer1", Buyer1,":",
                "tokenID1",tokenID1, ":",
                "PaidPrice1", PaidPrice1, ":",
                "Timestamp1", Timestamp1
            );

            let transferNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferNftPrice");
            let Trasnfer1 = transferNFT1[0];
            let seller1 = Trasnfer1.args.seller;
            let nftprice1 = Trasnfer1.args.nftPrice;
            let timestamp1 = Trasnfer1.args.timeStamp;

            console.log("seller1", seller1,":",
                "nftprice1",nftprice1, ":",
                "PaidPrice1", PaidPrice1, ":",
                "timestamp1", timestamp1
            );

            let serviceFeeNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            let serviceFee1 = serviceFeeNFT1[0];
            let Owner = serviceFee1.args.owner;
            let ServiceAmount = serviceFee1.args.serviceFees;

            console.log("seller1", seller1,":",
                "Owner",Owner, ":",
                "ServiceAmount", ServiceAmount
            );

            await deployedNatriumMarketPlaceContract.connect(buyer2).buyNft(
                1,
                minter2.address,
                deployedNatriumTicketingContract.target,
                {value: ethers.parseUnits("0.5")}
            );

            let BuyNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("buyNFT");
            let BuyNft2 = BuyNFT2[1];
            let Buyer2 = BuyNft2.args.buyer;
            let tokenID2 = BuyNft2.args.tokenID;
            let PaidPrice2 = BuyNft2.args.paidPrice;
            let Timestamp2 = BuyNft2.args.timeStamp;

            console.log("Buyer2", Buyer2,":",
                "tokenID2",tokenID2, ":",
                "PaidPrice2", PaidPrice2, ":",
                "Timestamp2", Timestamp2
            );

            let transferNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("transferNftPrice");
            let Trasnfer2 = transferNFT2[1];
            let seller2 = Trasnfer2.args.seller;
            let nftprice2 = Trasnfer2.args.nftPrice;
            let timestamp2 = Trasnfer2.args.timeStamp;

            console.log("seller2", seller2,":",
                "nftprice2",nftprice2, ":",
                "PaidPrice2", PaidPrice2, ":",
                "timestamp2", timestamp2
            );

            let serviceFeeNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            let serviceFee2 = serviceFeeNFT2[1];
            let Owner2 = serviceFee2.args.owner;
            let ServiceAmount2 = serviceFee2.args.serviceFees;

            console.log(
                "Owner",Owner2, ":",
                "ServiceAmount", ServiceAmount2
            );
        });
    });

    describe("Create Offer", function() {
        it("should Create offer by different user", async() => {
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

            let tickets = [
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
                Event,
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                tickets,
                TokenAddress,
                walletAddress
            );

            let Tickets = [
                {
                    ticketType: "VVIP",
                    quantity: 50,
                    price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
                },
                {
                    ticketType: "Regular customer",
                    quantity: 100,
                    price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
                }
            ];

            await deployedNatriumFactoryContract.connect(minter2).deployNewCollection(
                "Name",
                "Symbol",
                "Event",
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Tickets,
                TokenAddress,
                walletAddress
            );

            let newCollectionAddress1 = await deployedNatriumFactoryContract.contractAddresses(0);
            let newCollectionAddress2 = await deployedNatriumFactoryContract.contractAddresses(1);
            console.log("New Collection Address of minter 1", newCollectionAddress1);
            console.log("New Collection Address of minter 2", newCollectionAddress2);

            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress1);
            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress2);

            let approveContract1 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress1);
            let approveContract2 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress2);

            console.log("Confirm Approve Collection Address of minter1", approveContract1);
            console.log("Confirm Approve Collection Address of minter2", approveContract2);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumFactoryContract.connect(owner).approveContract(deployedNatriumTicketingContract.target);

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFeesAndFactoryContract(serviceFess, deployedNatriumFactoryContract.target);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,1);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0, 
                ethers.parseUnits("0.3"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT1 = ListNFT1[0];
            let Seller1 = NFT1.args.seller;
            let TokenId1 = NFT1.args.tokenID;
            let HostContract1 = NFT1.args.hostContract;
            let Nft1Price = NFT1.args.nftPrice;
            let Listed1 = NFT1.args.isListed;

            console.log("Seller1", Seller1,":",
                "TokenId1",TokenId1, ":",
                "HostContract1", HostContract1, ":",
                "Nft1Price", Nft1Price, ":",
                "Listed1",Listed1
            );

            expect(Seller1).to.be.equal(minter1.address);
            expect(Listed1).to.be.true;

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                1, 
                ethers.parseUnits("0.5"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT2 = ListNFT2[1];
            let Seller2 = NFT2.args.seller;
            let TokenId2 = NFT2.args.tokenID;
            let HostContract2 = NFT2.args.hostContract;
            let Nft2Price = NFT2.args.nftPrice;
            let Listed2 = NFT2.args.isListed;

            console.log("Seller1", Seller2,":",
                "TokenId1",TokenId2, ":",
                "HostContract1", HostContract2, ":",
                "Nft1Price", Nft2Price, ":",
                "Listed1",Listed2
            );

            let getBlockNumber1 = await ethers.provider.getBlockNumber();
            let getBlock1 = await ethers.provider.getBlock(getBlockNumber1);
            let startTime = getBlock1.timestamp;
            let endTime = startTime + (2 * 86400);

            await deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
                0,
                ethers.parseUnits("0.4"),
                endTime,
                minter1.address,
                {value : ethers.parseUnits("0.4")}
            );

            await deployedNatriumMarketPlaceContract.connect(buyer2).createOffer(
                0,
                ethers.parseUnits("0.35"),
                endTime,
                minter1.address,
                {value : ethers.parseUnits("0.35")}
            );

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.2"),
                endTime,
                minter2.address,
                {value : ethers.parseUnits("0.2")}
            );

            let ContractBalance = await ethers.provider.getBalance(deployedNatriumMarketPlaceContract.target);
            console.log("Contract Balance :", ContractBalance);

            let trackBuyer1 = await deployedNatriumMarketPlaceContract.connect(buyer1).trackOfferPrice(buyer1.address);
            let trackBuyer2 = await deployedNatriumMarketPlaceContract.connect(buyer2).trackOfferPrice(buyer2.address);
            let trackBuyer3 = await deployedNatriumMarketPlaceContract.connect(buyer3).trackOfferPrice(buyer3.address);

            console.log("Track Price buyer 1", trackBuyer1);
            console.log("Track Price buyer 2", trackBuyer2);
            console.log("Track Price buyer 3", trackBuyer3);

            let NftDetails = await deployedNatriumMarketPlaceContract.getNftDetails(minter1.address, 0);
            console.log("Nft  details", NftDetails);

            let offerDetails = await deployedNatriumMarketPlaceContract.connect(buyer2).getOfferDetails(0);
            console.log("Offer deatils", offerDetails);
        })
    });

    describe("Accept Offer", function() {
        it("should accept offer by Lister", async() => {
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

            let tickets = [
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
                Event,
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                tickets,
                TokenAddress,
                walletAddress
            );

            let Tickets = [
                {
                    ticketType: "VVIP",
                    quantity: 50,
                    price: ethers.parseUnits("50", 6) // Example: 50 USDT per VIP ticket
                },
                {
                    ticketType: "Regular customer",
                    quantity: 100,
                    price: ethers.parseUnits("20", 6) // Example: 20 USDT per General Admission ticket
                }
            ];

            await deployedNatriumFactoryContract.connect(minter2).deployNewCollection(
                "Name",
                "Symbol",
                "Event",
                EventStartDate,
                EventEndDate,
                TicketBuyStart,
                TicketEndStart,
                Tickets,
                TokenAddress,
                walletAddress
            );

            let newCollectionAddress1 = await deployedNatriumFactoryContract.contractAddresses(0);
            let newCollectionAddress2 = await deployedNatriumFactoryContract.contractAddresses(1);
            console.log("New Collection Address of minter 1", newCollectionAddress1);
            console.log("New Collection Address of minter 2", newCollectionAddress2);

            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress1);
            await deployedNatriumFactoryContract.connect(owner).approveContract(newCollectionAddress2);

            let approveContract1 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress1);
            let approveContract2 = await deployedNatriumFactoryContract.approvedContracts(newCollectionAddress2);

            console.log("Confirm Approve Collection Address of minter1", approveContract1);
            console.log("Confirm Approve Collection Address of minter2", approveContract2);

            await deployedNatriumTicketingContract.connect(minter1).mintTicket(0, tokenURI);
            await deployedNatriumTicketingContract.connect(minter2).mintTicket(1, tokenURI);

            await deployedNatriumFactoryContract.connect(owner).approveContract(deployedNatriumTicketingContract.target);

            await deployedNatriumMarketPlaceContract.connect(owner).setServiceFeesAndFactoryContract(serviceFess, deployedNatriumFactoryContract.target);

            await deployedNatriumTicketingContract.connect(minter1).approve(deployedNatriumMarketPlaceContract.target,0);
            await deployedNatriumTicketingContract.connect(minter2).approve(deployedNatriumMarketPlaceContract.target,1);
            await deployedNatriumMarketPlaceContract.connect(minter1).listNft(
                0, 
                ethers.parseUnits("0.3"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT1 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT1 = ListNFT1[0];
            let Seller1 = NFT1.args.seller;
            let TokenId1 = NFT1.args.tokenID;
            let HostContract1 = NFT1.args.hostContract;
            let Nft1Price = NFT1.args.nftPrice;
            let Listed1 = NFT1.args.isListed;

            console.log("Seller1", Seller1,":",
                "TokenId1",TokenId1, ":",
                "HostContract1", HostContract1, ":",
                "Nft1Price", Nft1Price, ":",
                "Listed1",Listed1
            );

            expect(Seller1).to.be.equal(minter1.address);
            expect(Listed1).to.be.true;

            await deployedNatriumMarketPlaceContract.connect(minter2).listNft(
                1, 
                ethers.parseUnits("0.5"),
                deployedNatriumTicketingContract.target
            );

            let ListNFT2 = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let NFT2 = ListNFT2[1];
            let Seller2 = NFT2.args.seller;
            let TokenId2 = NFT2.args.tokenID;
            let HostContract2 = NFT2.args.hostContract;
            let Nft2Price = NFT2.args.nftPrice;
            let Listed2 = NFT2.args.isListed;

            console.log("Seller1", Seller2,":",
                "TokenId1",TokenId2, ":",
                "HostContract1", HostContract2, ":",
                "Nft1Price", Nft2Price, ":",
                "Listed1",Listed2
            );

            let getBlockNumber1 = await ethers.provider.getBlockNumber();
            let getBlock1 = await ethers.provider.getBlock(getBlockNumber1);
            let startTime = getBlock1.timestamp;
            let endTime = startTime + (2 * 86400);

            await deployedNatriumMarketPlaceContract.connect(buyer1).createOffer(
                0,
                ethers.parseUnits("0.4"),
                endTime,
                minter1.address,
                {value : ethers.parseUnits("0.4")}
            );

            await deployedNatriumMarketPlaceContract.connect(buyer2).createOffer(
                0,
                ethers.parseUnits("0.35"),
                endTime,
                minter1.address,
                {value : ethers.parseUnits("0.35")}
            );

            await deployedNatriumMarketPlaceContract.connect(buyer3).createOffer(
                1,
                ethers.parseUnits("0.2"),
                endTime,
                minter2.address,
                {value : ethers.parseUnits("0.2")}
            );

            let NftDetails = await deployedNatriumMarketPlaceContract.getNftDetails(minter1.address, 0);
            console.log("Nft  details", NftDetails);

            let ContractBalanceBefore = await ethers.provider.getBalance(deployedNatriumMarketPlaceContract.target);
            console.log("Contract Balance Before:", ContractBalanceBefore);

            let trackBuyer1 = await deployedNatriumMarketPlaceContract.connect(buyer1).trackOfferPrice(buyer1.address);
            let trackBuyer2 = await deployedNatriumMarketPlaceContract.connect(buyer2).trackOfferPrice(buyer2.address);
            let trackBuyer3 = await deployedNatriumMarketPlaceContract.connect(buyer3).trackOfferPrice(buyer3.address);

            console.log("Track Price buyer 1 before accept offer", trackBuyer1);
            console.log("Track Price buyer 2 before accept offer", trackBuyer2);
            console.log("Track Price buyer 3 before accept offer", trackBuyer3);

            await deployedNatriumMarketPlaceContract.connect(minter1).acceptOffers(
                0,
                buyer1.address
            );

            await deployedNatriumMarketPlaceContract.connect(buyer2).withDraw(0);
            await deployedNatriumMarketPlaceContract.connect(buyer3).withDraw(1);
            
            let ContractBalance = await ethers.provider.getBalance(deployedNatriumMarketPlaceContract.target);
            console.log("Contract Balance After:", ContractBalance);


            let trackBuyer1Before = await deployedNatriumMarketPlaceContract.connect(buyer1).trackOfferPrice(buyer1.address);
            let trackBuyer2Before = await deployedNatriumMarketPlaceContract.connect(buyer2).trackOfferPrice(buyer2.address);
            let trackBuyer3Before = await deployedNatriumMarketPlaceContract.connect(buyer3).trackOfferPrice(buyer3.address);

            console.log("Track Price buyer 1 after accept offer", trackBuyer1Before);
            console.log("Track Price buyer 2 after accept offer", trackBuyer2Before);
            console.log("Track Price buyer 3 after accept offer", trackBuyer3Before);

            let NftDetails1 = await deployedNatriumMarketPlaceContract.getNftDetails(minter1.address, 0);
            console.log("Nft  details", NftDetails1);

        })
    })
})