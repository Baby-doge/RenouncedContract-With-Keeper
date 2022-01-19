const { expect } = require("chai");
const { ethers } = require("hardhat");
const { formatEther, parseEther } = require("@ethersproject/units");


//test to create lp tokens
//test to manually call exchange LP
//test to use keeper to call  

describe("Renounced Contract", function () {
  let owner,
    babyDogeReciver,
    bnbReciever,
    keeper,
    addr4,
    addr5,
    factory,
    babyDoge,
    router,
    lpPairAddress, 
    wethContract,
    lpToken, babyDogeBurner;

  //let babydoge = 0xc748673057861a797275CD8A068AbB95A902e8de;
  let uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; 
  let uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  
  it("Should set all the accounts", async function () {
    [owner, babyDogeReciver, bnbReciever, keeper, addr4, addr5, _] = await ethers.getSigners();
  
  });


  it("Should set the uniswap Router", async function () {
    router = await ethers.getContractAt("contracts/interfaces/IUniswapV2Router02.sol:IUniswapV2Router02", uniswapRouter);
    await router.deployed();
    expect(router.address).to.not.equal("")
  });

  it("Should set the uniswap Factory", async function () {
    factory = await ethers.getContractAt("contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory", uniswapFactory);
    await factory.deployed();
    expect(factory.address).to.not.equal("")
  });

  it("Should deploy a fake BabyDoge", async function () {
    const BabyDoge = await ethers.getContractFactory("TestERC20");
    let amount = parseEther("5000000");
    babyDoge = await BabyDoge.deploy(amount, "babydoge", "BDC");

    const FakeWeth = await ethers.getContractFactory("TestERC20");
    amount = parseEther("5000");
    wethContract = await FakeWeth.deploy(amount,"wrapped BNB", "wbnb");

    expect(formatEther(await babyDoge.balanceOf(owner.address))).to.equal(("5000000.0"));
  });

  it("Should add liquidity to factory a fake BabyDoge", async function () {
    await factory.createPair(wethContract.address, babyDoge.address);
    let lastBlock = await ethers.provider.getBlockNumber();
    let lastBlockObj = await ethers.provider.getBlock(lastBlock);
    let lastBlockTime = lastBlockObj.timestamp;
    await wethContract.approve(router.address, parseEther("500"));
    await babyDoge.approve(router.address, parseEther("1000"));
    await router.addLiquidity(babyDoge.address, wethContract.address, parseEther("1000"),parseEther("500"),  "0", "0", owner.address,(lastBlockTime  +1200))
  });

  it("Should make pair token ", async function () {
    let pairAddress = await factory.getPair(babyDoge.address,wethContract.address);
    lpToken = await ethers.getContractAt("contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddress);
    console.log("LP Token Balance",formatEther(await lpToken.balanceOf(owner.address)));
    console.log("BabyDoge Balance of Pair", formatEther(await babyDoge.balanceOf(pairAddress)));
    console.log("BNB Balance of Pair", formatEther(await wethContract.balanceOf(pairAddress)));

    expect(formatEther(await lpToken.balanceOf(owner.address))).to.not.equal("0");
  });


  it("Should deploy the Renounced Contract", async function () {
    const BabyDogeBurner = await ethers.getContractFactory("BabyDogeBurner");
    babyDogeBurner = await BabyDogeBurner.deploy(bnbReciever.address, babyDogeReciver.address, keeper.address, lpToken.address, babyDoge.address, router.address, wethContract.address);
    await babyDogeBurner.deployed();
    console.log("babyDogeBurner Address", babyDogeBurner.address);
    expect(babyDogeBurner.address).to.not.equal("");
  });

  it("Should Load contract with LP Tokens", async function () {
    let totalLps = await lpToken.balanceOf(owner.address);
    await lpToken.transfer(babyDogeBurner.address,totalLps)
    expect(formatEther(await lpToken.balanceOf(babyDogeBurner.address))).to.equal(formatEther(totalLps));
  });

  it("Should Allow owner to call exchangeLP Function ", async function () {
    console.log("babydogeBurner", babyDogeBurner.address);
    await babyDogeBurner.exchangeLP() 

    console.log("BabyDoge Reciever Balance", formatEther(await babyDoge.balanceOf(babyDogeReciver.address)));
    console.log("BNB Reciever Balance", formatEther(await wethContract.balanceOf(bnbReciever.address)));
    console.log("LP Token Balance of Contract", formatEther(await lpToken.balanceOf(babyDogeBurner.address)));
    console.log("BabyDoge Balance of Pair", formatEther(await babyDoge.balanceOf(lpToken.address)));
    console.log("BNB Balance of Pair", formatEther(await wethContract.balanceOf(lpToken.address)));

    expect(formatEther(await babyDoge.balanceOf(babyDogeReciver.address))).to.not.equal("0");
    expect(formatEther(await wethContract.balanceOf(bnbReciever.address))).to.not.equal("0");

  });


  it("Should add more liquidity to factory a fake BabyDoge", async function () {
    let lastBlock = await ethers.provider.getBlockNumber();
    let lastBlockObj = await ethers.provider.getBlock(lastBlock);
    let lastBlockTime = lastBlockObj.timestamp;
    await wethContract.approve(router.address, parseEther("500"));
    await babyDoge.approve(router.address, parseEther("1000"));
    await router.addLiquidity(babyDoge.address, wethContract.address, parseEther("1000"),parseEther("500"),  "0", "0", owner.address,(lastBlockTime  +1200))
  });


  it("Should Load contract with more LP Tokens", async function () {
    let totalLps = await lpToken.balanceOf(owner.address);
    await lpToken.transfer(babyDogeBurner.address,totalLps)
    expect(formatEther(await lpToken.balanceOf(babyDogeBurner.address))).to.equal(formatEther(totalLps));
  });

  it("Should not allow anyone else to call exchangeLP Function ", async function () {
    console.log("Should Revert");
    await babyDogeBurner.connect(addr4).exchangeLP() 
  });

  it("Should Allow keeper to call exchangeLP Function ", async function () {
    await babyDogeBurner.connect(keeper).exchangeLP() 

    console.log("BabyDoge Reciever Balance", formatEther(await babyDoge.balanceOf(babyDogeReciver.address)));
    console.log("BNB Reciever Balance", formatEther(await wethContract.balanceOf(bnbReciever.address)));
    console.log("LP Token Balance of Contract", formatEther(await lpToken.balanceOf(babyDogeBurner.address)));
    console.log("BabyDoge Balance of Pair", formatEther(await babyDoge.balanceOf(lpToken.address)));
    console.log("BNB Balance of Pair", formatEther(await wethContract.balanceOf(lpToken.address)));

    expect(formatEther(await babyDoge.balanceOf(babyDogeReciver.address))).to.not.equal("0");
    expect(formatEther(await wethContract.balanceOf(bnbReciever.address))).to.not.equal("0");
  });


});
