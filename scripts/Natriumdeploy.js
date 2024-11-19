// scripts/deployEventDeployer.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  // Replace with actual token and funds wallet addresses

  const [owner, admin, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();


  //deployment script of Natrium Nft MArketplace


  const NatirumMarketplace = await ethers.getContractFactory("NatirumMarketplace");

  const marketplace = await upgrades.deployProxy(NatirumMarketplace, [], { initializer: 'initialize' });

  // Wait for the contract to be deployed
  await marketplace.connect(admin).waitForDeployment();

  console.log("NatirumMarketplace deployed to:", marketplace.target);

}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
