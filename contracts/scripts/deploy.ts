import { network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const { ethers } = await network.connect();

const initialSupply = ethers.parseUnits("1000000", 18);
const token = await ethers.deployContract("ChainGuardToken", [initialSupply]);

await token.waitForDeployment();

const address = await token.getAddress();
const deployer = await token.runner!.getAddress();
const deploymentTx = token.deploymentTransaction();

const provider = token.runner!.provider!;
const networkInfo = await provider.getNetwork();
const latestBlock = await provider.getBlockNumber();

const deployment = {
  project: "ChainGuard",
  network: "ganache-local",
  chainId: Number(networkInfo.chainId),
  contractName: "ChainGuardToken",
  tokenName: await token.name(),
  tokenSymbol: await token.symbol(),
  decimals: Number(await token.decimals()),
  initialSupply: "1000000",
  contractAddress: address,
  deployerAddress: deployer,
  deploymentTransactionHash: deploymentTx?.hash ?? null,
  deploymentBlock: deploymentTx
    ? (await deploymentTx.wait())?.blockNumber ?? null
    : null,
  recordedAtBlock: latestBlock
};

const outputPath = resolve("deployments/chainguard-local.json");

await mkdir(resolve("deployments"), { recursive: true });
await writeFile(outputPath, JSON.stringify(deployment, null, 2) + "\n");

console.log(JSON.stringify(deployment, null, 2));
console.log(`Deployment record saved to ${outputPath}`);
