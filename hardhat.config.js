require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
//require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
//require("@nomiclabs/hardhat-waffle");
//require("hardhat-gas-reporter");
// require("hardhat-contract-sizer");
//require('solidity-coverage');
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-verify");

const PRIVATE_KEY = process.env.PRIVATE_KEY;

const GOERLI_API_KEY = process.env.ETHEREUM_API_KEY;
const SEPOLIA_API_KEY = process.env.SEPOLIA_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const AVALANCHE_API_KEY = process.env.AVALANCHE_API_KEY;
const BSC_API_KEY = process.env.BSC_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
   solidity: {
      version: "0.8.26",
      settings: {
         viaIR: false,
         optimizer: {
            enabled: true,
            runs: 200,
         },
      },
   },

   defaultNetwork: "hardhat",
   networks: {
      hardhat: {},
      polygonAmoy: {
         url: `https://polygon-amoy.g.alchemy.com/v2/KEqO1Xo32EGjs6a2bIk1fDBfHaX--Euv`,
         accounts: [process.env.PRIVATE_KEY]
      },

      bscT: {
         url: `https://rpc.ankr.com/bsc`,
         accounts: [process.env.PRIVATE_KEY],
         gasPrice: 20000000000,
      },

      avalancheT: {
         url: `https://rpc.ankr.com/avalanche_fuji`,
         accounts: [process.env.PRIVATE_KEY],
      },

      goerli: {
         url: `https://rpc.ankr.com/eth_goerli`,
         accounts: [process.env.PRIVATE_KEY],
         gasLimit: 10000,
      },

         sepolia: {
            url: `https://eth-sepolia.g.alchemy.com/v2/7VlDOMiN8n9ZsfwWTZbxr8KSzkpO8QzF`,
            accounts: [PRIVATE_KEY],
         },
      },

      etherscan: {
         apiKey: {
            goerli: GOERLI_API_KEY,
            bscTestnet: BSC_API_KEY,
            polygonMumbai: POLYGON_API_KEY,
            avalancheFujiTestnet: AVALANCHE_API_KEY,
            sepolia: SEPOLIA_API_KEY
         },
   },

   paths: {
      sources: "./contracts",
      tests: "./test",
      cache: "./cache",
      artifacts: "./artifacts",
   },

   mocha: {
      timeout: 4000000,
   },

   // gasReporter: {
   //    enabled: true,
   //    currency: 'USD',
   //    gasPrice: 3000000,
   // },
};
