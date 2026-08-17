import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  console.log("Deployer:", deployer.account.address);

  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Balance:", balance.toString(), "wei");

  const splitpay = await hre.viem.deployContract("SplitPay");
  console.log("SplitPay deployed to:", splitpay.address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
