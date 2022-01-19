const { formatEther, parseEther } = require("@ethersproject/units");

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  let name = "fWrappedBnb";
  let symbol = "WETH";
  let total = parseEther("50000");

  // We get the contract to deploy

  //vvvvvvvvvvvvvv Fake WBNB vvvvvvvvvvvvvv

  const WBNB = await hre.ethers.getContractFactory("TestERC20");
  const wbnb = await WBNB.deploy(total,name, symbol);
  await wbnb.deployed();
  console.log("WBNB Token deployed to:", wbnb.address);

  //vvvvvvvvvvvvvv Fake BabyDoge vvvvvvvvvvvvvv
  let name2 = "fBabyDoge";
  let symbol2 = "fBDC";
  let total2 = parseEther("5000000");

  const BabyDoge = await hre.ethers.getContractFactory("TestERC20");
  const babyDoge = await BabyDoge.deploy(total2,name2, symbol2);
  await babyDoge.deployed();
  console.log("BabyDoge Token deployed to:", babyDoge.address);

  //vvvvvvvvvvvvvv Factory & Router vvvvvvvvvvvvvv
  let uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; 
  let uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  factory = await ethers.getContractAt("contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory", uniswapFactory);
  await factory.deployed();

  router = await ethers.getContractAt("contracts/interfaces/IUniswapV2Router02.sol:IUniswapV2Router02", uniswapRouter);
  await router.deployed();

  //vvvvvvvvvvvvvv Add Liquidity vvvvvvvvvvvvvv

  await factory.createPair(wbnb.address, babyDoge.address);
  let lastBlock = await ethers.provider.getBlockNumber();
  let lastBlockObj = await ethers.provider.getBlock(lastBlock);
  let lastBlockTime = lastBlockObj.timestamp;
  await wbnb.approve(router.address, parseEther("500"));
  await babyDoge.approve(router.address, parseEther("1000"));
  await router.addLiquidity(babyDoge.address, wbnb.address, parseEther("1000"),parseEther("500"),  "0", "0", "0x85d30747868a5081f53BC7B9450301e761620a4f",(lastBlockTime  +1200))
  let pairAddress = await factory.getPair(babyDoge.address,wbnb.address);

  //vvvvvvvvvvvvvv deploy renouncedContract vvvvvvvvvvvvvv


  await delay(15000);

  try {
    await hre.run("verify:verify", {
      address: wbnb.address,
      constructorArguments: [total, name, symbol],
    });

    await hre.run("verify:verify", {
      address: babyDoge.address,
      constructorArguments: [total2, name2, symbol2],
    });

    await hre.run("verify:verify", {
      address: babyDoge.address,
      constructorArguments: [total2, name2, symbol2],
    });
  } catch (e) {
    console.log(e);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
