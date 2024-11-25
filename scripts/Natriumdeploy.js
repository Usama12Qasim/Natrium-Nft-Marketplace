// scripts/deployEventDeployer.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  // // Replace with actual token and funds wallet addresses
   let [owner, admin, addr1, addr2, addr3, addr4, addr5, walletAddress] = await ethers.getSigners();

  // //Natrium Nft Contract
  // const NatriumNftContrac = await ethers.getContractFactory("MyToken");

  // deployedNatriumTicketingContract = await upgrades.deployProxy(NatriumNftContrac, [owner.address], { initializer: 'initialize' });

  // // Wait for the contract to be deployed
  // await deployedNatriumTicketingContract.waitForDeployment();
  // console.log("NatirumToken deployed to:", deployedNatriumTicketingContract.target);

  //Natrium Nft Marketplace
  const NatirumMarketplace = await ethers.getContractFactory("NatirumMarketplace");

  deployedNatriumMarketPlaceContract = await upgrades.deployProxy(NatirumMarketplace, [], { initializer: 'initialize' });

  // Wait for the contract to be deployed
  await deployedNatriumMarketPlaceContract.connect(owner).waitForDeployment();

  console.log("NatirumMarketplace deployed to:", deployedNatriumMarketPlaceContract.target);

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
