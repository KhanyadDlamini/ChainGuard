import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

export default defineConfig({
  plugins: [hardhatEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "shanghai"
    }
  },
  networks: {
    ganache: {
      type: "http",
      chainType: "l1",
      url: process.env.GANACHE_RPC_URL ?? ("http" + "://" + "127.0.0.1:8545"),
      chainId: 1337
    }
  }
});
