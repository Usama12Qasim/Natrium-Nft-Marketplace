const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat");

describe("Natrium Marketpalce", function() {
    let owner;
    let admin;
    let addr1;
    let addr2;
    let addr3;
    let addr4;
    let addr5;
    let walletAddress;

    let deployedNatriumTicketingContract;
    let deployedNatriumMarketPlaceContract;

    let tokenURI = "www.Eventholder.com";
    let serviceFess = 25; 

    beforeEach(async() => {
        [owner, admin, addr1, addr2, addr3, addr4, addr5, walletAddress] = await ethers.getSigners();

        //Natrium Nft Contract
        const NatriumNftContrac = await ethers.getContractFactory("MyToken");

        deployedNatriumTicketingContract = await upgrades.deployProxy(NatriumNftContrac, [owner.address], { initializer: 'initialize' });
      
        // Wait for the contract to be deployed
        await deployedNatriumTicketingContract.waitForDeployment();
        console.log("NatirumToken deployed to:", deployedNatriumTicketingContract.target);

        //Natrium Nft Marketplace
        const NatirumMarketplace = await ethers.getContractFactory("NatirumMarketplace");

        deployedNatriumMarketPlaceContract = await upgrades.deployProxy(NatirumMarketplace, [], { initializer: 'initialize' });
      
        // Wait for the contract to be deployed
        await deployedNatriumMarketPlaceContract.connect(admin).waitForDeployment();
      
        console.log("NatirumMarketplace deployed to:", deployedNatriumMarketPlaceContract.target);
    });

    describe("Mint Nft", function() {
        it("should mint Nft first", async() => {
            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);
        });
    });

    describe("listNft on Natrium Marketpalce", function() {
        it("should list Nfts on Marketpalce", async() => {
            let _tokenId = 0;
            let price = 100;
            let hostContract = deployedNatriumTicketingContract.target;

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);
            await deployedNatriumTicketingContract.connect(addr1).approve(deployedNatriumMarketPlaceContract, _tokenId)
            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );
        });

        it("should check values is passing in events is correct", async() => {
            let _tokenId = 0;
            let tokenId2 = 1;
            let price = 100;
            let hostContract = deployedNatriumTicketingContract.target;

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);
            await deployedNatriumTicketingContract.safeMint(addr2.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(deployedNatriumMarketPlaceContract, _tokenId);
            await deployedNatriumTicketingContract.connect(addr2).approve(deployedNatriumMarketPlaceContract, tokenId2);

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            let Listproperty = await deployedNatriumMarketPlaceContract.queryFilter("ListNFT");
            let List = Listproperty[0];
            let ListerAddress = List.args.seller;
            let tokenId = List.args.tokenID
            let HostContract = List.args.hostContract
            let Price = List.args.nftPrice
            let Listed = List.args.isListed

            console.log(
                "Seller Address :", ListerAddress, 
                "TokenId :", tokenId, 
                "HostContract", HostContract, 
                "Nft Price", price, 
                "Is Listed", Listed
            );

            expect(ListerAddress).to.be.equal(addr1.address);
            expect(ListerAddress).not.to.be.equal(addr2.address);
            expect(Listed).to.be.equal(true);
        })

        it("should not list again If token is already Listed", async() => {
            let _tokenId = 0;
            let price = 100;
            let hostContract = deployedNatriumTicketingContract.target;

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(deployedNatriumMarketPlaceContract, _tokenId)
            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            await expect(deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            )).to.be.revertedWith("Already Listed");
        });

        it("should revert if tokenId is listed by unknown person", async() => {
            let tokenId1 = 0;
            let tokenId2 = 1;
            let price = 100;
            let hostContract = deployedNatriumTicketingContract.target;

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);
            await deployedNatriumTicketingContract.safeMint(addr2.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(deployedNatriumMarketPlaceContract, tokenId1)
            await deployedNatriumTicketingContract.connect(addr2).approve(deployedNatriumMarketPlaceContract, tokenId2)


            await expect(deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                tokenId2,
                price,
                hostContract
            )).to.be.revertedWith("You are not the owner of this Nft");
        });
    });

    describe("Buy Nft", function() {
        it("should Buy Nft", async() => {
            let _tokenId = 0;
            let price = ethers.parseEther("0.000000000000000025");
            let hostContract = deployedNatriumTicketingContract.target;


            await deployedNatriumMarketPlaceContract.setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(
                deployedNatriumMarketPlaceContract, 
                _tokenId
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

             

            await deployedNatriumMarketPlaceContract.connect(addr2).buyNft(
                _tokenId,
                addr1.address,
                hostContract,
                { value: ethers.parseEther("0.000000000000000025") }
            );

            let addr1Balance = await deployedNatriumMarketPlaceContract.checkBalance(addr1.address);
            let addr2Balance = await deployedNatriumMarketPlaceContract.checkBalance(addr2.address);

            console.log("addr1Balance", addr1Balance, ":", "addr2Balance", addr2Balance);

            let Listproperty = await deployedNatriumMarketPlaceContract.queryFilter("transferServiceFees");
            let List = Listproperty[0];
            let ListerAddress = List.args.owner;
            let tokenId = List.args.serviceFees;

            console.log("OWner :", ListerAddress, "Service Fees :", tokenId);
            console.log("address", owner.address)

            expect(ListerAddress).to.be.equal(owner.address);
        });

        it("should revert if tokenId is not listed", async() => {
            let _tokenId = 0;
            let price = ethers.parseEther("0.000000000000000025");
            let hostContract = deployedNatriumTicketingContract.target;


            await deployedNatriumMarketPlaceContract.setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(
                deployedNatriumMarketPlaceContract, 
                _tokenId
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            let invalidTokenId = 1;
            await expect(deployedNatriumMarketPlaceContract.connect(addr2).buyNft(
                invalidTokenId,
                addr1.address,
                hostContract,
                { value: ethers.parseEther("0.000000000000000025") }
            )).to.be.revertedWith("Invalid Token ID")
        });

        it("should revert if seller doesn't match with owner of tokenId", async() => {
            let _tokenId = 0;
            let price = ethers.parseEther("0.000000000000000025");
            let hostContract = deployedNatriumTicketingContract.target;


            await deployedNatriumMarketPlaceContract.setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(
                deployedNatriumMarketPlaceContract, 
                _tokenId
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            await expect(deployedNatriumMarketPlaceContract.connect(addr2).buyNft(
                _tokenId,
                addr2.address,
                hostContract,
                { value: ethers.parseEther("0.000000000000000025") }
            )).to.be.revertedWith("InValid Seller");
        });
        it("should revert caller not be seller", async() => {
            let _tokenId = 0;
            let price = ethers.parseEther("0.000000000000000025");
            let hostContract = deployedNatriumTicketingContract.target;


            await deployedNatriumMarketPlaceContract.setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(
                deployedNatriumMarketPlaceContract, 
                _tokenId
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            await expect(deployedNatriumMarketPlaceContract.connect(addr1).buyNft(
                _tokenId,
                addr1.address,
                hostContract,
                { value: ethers.parseEther("0.000000000000000025") }
            )).to.be.revertedWith("Can't Self buy");
        });

        it("should revert if price is not equal to require amount", async() => {
            let _tokenId = 0;
            let price = ethers.parseEther("0.000000000000000025");
            let hostContract = deployedNatriumTicketingContract.target;


            await deployedNatriumMarketPlaceContract.setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(
                deployedNatriumMarketPlaceContract, 
                _tokenId
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            await expect(deployedNatriumMarketPlaceContract.connect(addr2).buyNft(
                _tokenId,
                addr1.address,
                hostContract,
                { value: ethers.parseEther("0.000000000000000005") }
            )).to.be.revertedWith("InSufficient Amount");
        });
    });

    describe.only("Create Offer", function() {
        it("should create offer", async() => {
            let _tokenId = 0;
            let price = ethers.parseEther("0.000000000000000025");
            let offerPrice = ethers.parseEther("0.000000000000000015");
            let hostContract = deployedNatriumTicketingContract.target;


            await deployedNatriumMarketPlaceContract.setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(
                deployedNatriumMarketPlaceContract, 
                _tokenId
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            blockTimestamp = getBlock.timestamp;

            let offerExpireTime = blockTimestamp + (2 * 86400)

            await deployedNatriumMarketPlaceContract.connect(addr3).createOffer(
                _tokenId,
                offerPrice,
                offerExpireTime,
                addr1.address,
                {value : ethers.parseEther("0.000000000000000015")}
            );

            let offerdteails = await deployedNatriumMarketPlaceContract.getOfferDetails(addr3.address);
            console.log("Offer Details", offerdteails);
        });
        it("should accept offer by token Owner", async() => {
            let _tokenId = 0;
            let price = ethers.parseEther("0.000000000000000025");
            let offerPrice = ethers.parseEther("0.000000000000000015");
            let hostContract = deployedNatriumTicketingContract.target;


            await deployedNatriumMarketPlaceContract.setServiceFees(serviceFess);

            await deployedNatriumTicketingContract.safeMint(addr1.address, tokenURI);

            await deployedNatriumTicketingContract.connect(addr1).approve(
                deployedNatriumMarketPlaceContract, 
                _tokenId
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).listNft(
                _tokenId,
                price,
                hostContract
            );

            let getBlockNumber = await ethers.provider.getBlockNumber();
            getBlock = await ethers.provider.getBlock(getBlockNumber);
            blockTimestamp = getBlock.timestamp;

            let offerExpireTime = blockTimestamp + (2 * 86400)


            await deployedNatriumMarketPlaceContract.connect(addr3).createOffer(
                _tokenId,
                offerPrice,
                offerExpireTime,
                addr1.address,
                {value : ethers.parseEther("0.000000000000000015")}
            );

            await deployedNatriumMarketPlaceContract.connect(addr1).acceptOffers(
                0, 
                addr3.address
            );

            let contractBalance = await ethers.provider.getBalance(addr1.address);
            console.log("Contract Balance", contractBalance);
        })
    })
})