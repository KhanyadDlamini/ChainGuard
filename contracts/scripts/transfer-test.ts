import { network } from "hardhat";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const deploymentPath = resolve("deployments/chainguard-local.json");
const deployment = JSON.parse(await readFile(deploymentPath, "utf8"));
const amountText = "50";

if (!/^\d+(\.\d+)?$/.test(amountText) || Number(amountText) <= 0) {
  throw new Error("Amount must be a positive token amount, e.g. 50 or 12.5");
}

const { ethers } = await network.connect();
const signers = await ethers.getSigners();

if (signers.length < 2) {
  throw new Error("Ganache must provide at least two unlocked accounts");
}

const sender = signers[0];
const recipient = signers[1];
const token = await ethers.getContractAt(
  "ChainGuardToken",
  deployment.contractAddress,
  sender
);

const amount = ethers.parseUnits(amountText, deployment.decimals);
const tx = await token.transfer(await recipient.getAddress(), amount);
const receipt = await tx.wait();

if (!receipt || receipt.status !== 1) {
  throw new Error("Token transfer did not succeed");
}

const evidence = {
  project: "ChainGuard",
  scenario: "NORMAL_TRANSFER",
  chainId: deployment.chainId,
  tokenAddress: deployment.contractAddress,
  transactionHash: receipt.hash,
  blockNumber: receipt.blockNumber,
  sender: await sender.getAddress(),
  recipient: await recipient.getAddress(),
  amount: amountText,
  amountRaw: amount.toString(),
  receiptStatus: receipt.status
};

const outputPath = resolve("deployments/last-transfer.json");
await writeFile(outputPath, JSON.stringify(evidence, null, 2) + "\n");

console.log(JSON.stringify(evidence, null, 2));
console.log(`Evidence saved to ${outputPath}`);
