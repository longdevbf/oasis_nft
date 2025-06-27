import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sapphire: {
      url: "https://sapphire.oasis.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0x5afe,
    },
    sapphireTestnet: {
      url: "https://testnet.sapphire.oasis.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0x5aff,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: {
      sapphire: "test",
      sapphireTestnet: "test",
    },
    customChains: [
      {
        network: "sapphire",
        chainId: 0x5afe,
        urls: {
          apiURL: "https://explorer.oasis.io/api/v1/sapphire",
          browserURL: "https://explorer.oasis.io/mainnet/sapphire",
        },
      },
      {
        network: "sapphireTestnet", 
        chainId: 0x5aff,
        urls: {
          apiURL: "https://explorer.oasis.io/api/v1/sapphire/testnet",
          browserURL: "https://explorer.oasis.io/testnet/sapphire",
        },
      },
    ],
  },
};

export default config;