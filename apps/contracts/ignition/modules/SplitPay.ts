import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SplitPayModule = buildModule("SplitPayModule", (m) => {
  const splitpay = m.contract("SplitPay");
  return { splitpay };
});

export default SplitPayModule;
