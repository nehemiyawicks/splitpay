import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseUnits } from "viem";

describe("SplitPay", function () {
  async function deployFixture() {
    const [alice, bob, carol, dave] = await hre.viem.getWalletClients();

    const splitpay = await hre.viem.deployContract("SplitPay");
    const usdc = await hre.viem.deployContract("MockERC20", ["USD Coin", "USDC"]);

    const publicClient = await hre.viem.getPublicClient();
    return { splitpay, usdc, alice, bob, carol, dave, publicClient };
  }

  async function createABCGroup(fixture: Awaited<ReturnType<typeof deployFixture>>) {
    const { splitpay, alice, bob, carol } = fixture;
    const members = [
      getAddress(alice.account.address),
      getAddress(bob.account.address),
      getAddress(carol.account.address),
    ];
    const hash = await splitpay.write.createGroup([members]);
    await fixture.publicClient.waitForTransactionReceipt({ hash });
    const events = await splitpay.getEvents.GroupCreated();
    return events[0].args.groupId as `0x${string}`;
  }

  describe("createGroup", function () {
    it("emits GroupCreated with the deterministic id", async function () {
      const fx = await loadFixture(deployFixture);
      const groupId = await createABCGroup(fx);
      const stored = await fx.splitpay.read.getMembers([groupId]);
      expect(stored.length).to.equal(3);
    });

    it("rejects fewer than 2 members", async function () {
      const fx = await loadFixture(deployFixture);
      await expect(
        fx.splitpay.write.createGroup([[getAddress(fx.alice.account.address)]])
      ).to.be.rejectedWith("TooFewMembers");
    });

    it("rejects when creator is not in the member list", async function () {
      const fx = await loadFixture(deployFixture);
      await expect(
        fx.splitpay.write.createGroup([[
          getAddress(fx.bob.account.address),
          getAddress(fx.carol.account.address),
        ]])
      ).to.be.rejectedWith("CreatorNotInMembers");
    });

    it("rejects duplicate members", async function () {
      const fx = await loadFixture(deployFixture);
      await expect(
        fx.splitpay.write.createGroup([[
          getAddress(fx.alice.account.address),
          getAddress(fx.bob.account.address),
          getAddress(fx.bob.account.address),
        ]])
      ).to.be.rejectedWith("DuplicateMember");
    });
  });

  describe("addExpense", function () {
    it("updates balances: payer credited, debtors debited", async function () {
      const fx = await loadFixture(deployFixture);
      const groupId = await createABCGroup(fx);
      const shares = [parseUnits("10", 6), parseUnits("10", 6), parseUnits("10", 6)];
      const debtors = [
        getAddress(fx.alice.account.address),
        getAddress(fx.bob.account.address),
        getAddress(fx.carol.account.address),
      ];

      await fx.splitpay.write.addExpense([
        groupId,
        parseUnits("30", 6),
        debtors,
        shares,
        "dinner",
      ]);

      // Alice paid, was in debtors, so her share cancels; net owed by Bob+Carol = 20
      const aliceBalance = await fx.splitpay.read.getBalance([
        groupId,
        getAddress(fx.alice.account.address),
      ]);
      expect(aliceBalance).to.equal(parseUnits("20", 6));

      const bobBalance = await fx.splitpay.read.getBalance([
        groupId,
        getAddress(fx.bob.account.address),
      ]);
      expect(bobBalance).to.equal(-parseUnits("10", 6));
    });

    it("rejects non-member payer", async function () {
      const fx = await loadFixture(deployFixture);
      const groupId = await createABCGroup(fx);
      const splitpayAsDave = await hre.viem.getContractAt("SplitPay", fx.splitpay.address, {
        client: { wallet: fx.dave },
      });
      await expect(
        splitpayAsDave.write.addExpense([
          groupId,
          parseUnits("10", 6),
          [getAddress(fx.alice.account.address)],
          [parseUnits("10", 6)],
          "hi",
        ])
      ).to.be.rejectedWith("NotAMember");
    });

    it("rejects non-member debtor", async function () {
      const fx = await loadFixture(deployFixture);
      const groupId = await createABCGroup(fx);
      await expect(
        fx.splitpay.write.addExpense([
          groupId,
          parseUnits("10", 6),
          [getAddress(fx.dave.account.address)],
          [parseUnits("10", 6)],
          "hi",
        ])
      ).to.be.rejectedWith("NotAMember");
    });
  });

  describe("settle", function () {
    it("transfers tokens and updates balances", async function () {
      const fx = await loadFixture(deployFixture);
      const groupId = await createABCGroup(fx);
      const debtors = [
        getAddress(fx.alice.account.address),
        getAddress(fx.bob.account.address),
        getAddress(fx.carol.account.address),
      ];
      await fx.splitpay.write.addExpense([
        groupId,
        parseUnits("30", 6),
        debtors,
        [parseUnits("10", 6), parseUnits("10", 6), parseUnits("10", 6)],
        "dinner",
      ]);

      // Bob mints himself USDC + approves + settles his $10 to Alice
      const usdcAsBob = await hre.viem.getContractAt("MockERC20", fx.usdc.address, {
        client: { wallet: fx.bob },
      });
      await usdcAsBob.write.mint([getAddress(fx.bob.account.address), parseUnits("10", 6)]);
      await usdcAsBob.write.approve([fx.splitpay.address, parseUnits("10", 6)]);

      const splitpayAsBob = await hre.viem.getContractAt("SplitPay", fx.splitpay.address, {
        client: { wallet: fx.bob },
      });
      await splitpayAsBob.write.settle([
        groupId,
        getAddress(fx.alice.account.address),
        fx.usdc.address,
        parseUnits("10", 6),
      ]);

      const bobBalance = await fx.splitpay.read.getBalance([
        groupId,
        getAddress(fx.bob.account.address),
      ]);
      expect(bobBalance).to.equal(0n);

      const aliceBalance = await fx.splitpay.read.getBalance([
        groupId,
        getAddress(fx.alice.account.address),
      ]);
      expect(aliceBalance).to.equal(parseUnits("10", 6));

      const aliceUsdc = await fx.usdc.read.balanceOf([getAddress(fx.alice.account.address)]);
      expect(aliceUsdc).to.equal(parseUnits("10", 6));
    });

    it("rejects settle between non-members", async function () {
      const fx = await loadFixture(deployFixture);
      const groupId = await createABCGroup(fx);
      const splitpayAsDave = await hre.viem.getContractAt("SplitPay", fx.splitpay.address, {
        client: { wallet: fx.dave },
      });
      await expect(
        splitpayAsDave.write.settle([
          groupId,
          getAddress(fx.alice.account.address),
          fx.usdc.address,
          parseUnits("10", 6),
        ])
      ).to.be.rejectedWith("NotAMember");
    });
  });
});
