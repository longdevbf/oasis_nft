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
    hardhat: {
      chainId: 1337
    },
    // Oasis Sapphire Mainnet
    sapphire: {
      url: "https://sapphire.oasis.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0x5afe, // 23294
      gasPrice: 100000000000, // 100 gwei
    },
    // Oasis Sapphire Testnet
    sapphireTestnet: {
      url: "https://testnet.sapphire.oasis.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0x5aff, // 23295
      gasPrice: 100000000000, // 100 gwei
    },
    // Oasis Sapphire Localnet (nếu chạy local node)
    sapphireLocal: {
      url: "http://localhost:8545",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0x5afd, // 23293
    },
  },
  etherscan: {
    apiKey: {
      sapphire: "abc", // Không cần API key thật cho Sapphire
      sapphireTestnet: "abc",
    },
    customChains: [
      {
        network: "sapphire",
        chainId: 0x5afe,
        urls: {
          apiURL: "https://explorer.oasis.io/mainnet/sapphire/api",
          browserURL: "https://explorer.oasis.io/mainnet/sapphire",
        },
      },
      {
        network: "sapphireTestnet", 
        chainId: 0x5aff,
        urls: {
          apiURL: "https://explorer.oasis.io/testnet/sapphire/api",
          browserURL: "https://explorer.oasis.io/testnet/sapphire",
        },
      },
    ],
  },
};

export default config;