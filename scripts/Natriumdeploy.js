// scripts/deployEventDeployer.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  // // Replace with actual token and funds wallet addresses
   let [owner, admin, addr1, addr2, addr3, addr4, addr5, walletAddress] = await ethers.getSigners();

   const NatriumFactoryContract = await ethers.getContractFactory("EventDeployer");
   let deployedNatriumFactoryContract = await NatriumFactoryContract.deploy();
   await deployedNatriumFactoryContract.connect(owner).waitForDeployment();

   console.log("Natrium Factory Contract deployed to:", deployedNatriumFactoryContract.target);

   //Natrium Ticketing Nft Contract
   const NatriumNftContract = await ethers.getContractFactory("EventTicket");

   let deployedNatriumTicketingContract = await NatriumNftContract.deploy();

   // Wait for the contract to be deployed
   await deployedNatriumTicketingContract.connect(owner).waitForDeployment();
   console.log("NatirumToken deployed to:", deployedNatriumTicketingContract.target);

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
