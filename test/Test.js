const { expect } = require("chai");
const { ethers } = require("hardhat");
const { formatEther, parseEther, formatUnits, parseUnits} = require("@ethersproject/units");
const { Web3Provider } = require("@ethersproject/providers");


/* ###### 
All tests are for Kovan Network, 
for the tests to work you need to replace all 
the addresses in the smart contract with Kovan addresses 
   ###### */
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
    lpToken, babyDogeManager, keeperRegister, chainLinkToken;

  //let babydoge = 0xc748673057861a797275CD8A068AbB95A902e8de;
  let uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; 
  let uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  let wethAddress = "0xd0a1e359811322d97991e03f863a0c30c2cf029c"
  
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
    const BabyDoge = await ethers.getContractFactory("contracts/babydoge.sol:CoinToken");
    let amount = parseEther("5000000");
    babyDoge = await BabyDoge.deploy("babydoge", "BDC", "9", "420000000", "5", "5", "500000000","50000000", router.address, owner.address);
//  string memory _NAME, string memory _SYMBOL, uint256 _DECIMALS, uint256 _supply, uint256 _txFee,uint256 _lpFee,uint256 _MAXAMOUNT,uint256 SELLMAXAMOUNT,address routerAddress,address tokenOwner) public {

   
    // const FakeWeth = await ethers.getContractFactory("TestERC20");
    // amount = parseEther("5000");
    // wethContract = await FakeWeth.deploy(amount,"wrapped BNB", "wbnb");

    expect(formatUnits(await babyDoge.balanceOf(owner.address), "9")).to.equal(("420000000.0"));
  });

  it("Should deploy weth contract", async function () {

    wethContract = await ethers.getContractAt("WETH9_", wethAddress);


    await wethContract.deployed();
  })


  it("Should be able to deposit into weth contract", async function () {

    console.log("Owner balance", formatEther(await ethers.provider.getBalance(owner.address)));
    let overrides = {
      value: parseEther("500")
    }
    
    let tx = await wethContract.deposit(overrides);
  })


  it("Should add liquidity to factory a fake BabyDoge", async function () {
    //await factory.getPair(wethContract.address, babyDoge.address);
    let lastBlock = await ethers.provider.getBlockNumber();
    let lastBlockObj = await ethers.provider.getBlock(lastBlock);
    let lastBlockTime = lastBlockObj.timestamp;
    await wethContract.approve(router.address, parseEther("50"));
    await babyDoge.approve(router.address, parseUnits("10000", "9"));
    await router.addLiquidity(babyDoge.address, wethContract.address, parseUnits("10000", "9"),parseEther("50"),  "0", "0", owner.address,(lastBlockTime  +1200))
  });

  it("Should make pair token ", async function () {
    let pairAddress = await factory.getPair(babyDoge.address,wethContract.address);
    lpToken = await ethers.getContractAt("contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair", pairAddress);
    console.log("LP Token Balance",formatEther(await lpToken.balanceOf(owner.address)));
    console.log("BabyDoge Balance of Pair", formatUnits(await babyDoge.balanceOf(pairAddress), "9"));
    console.log("BNB Balance of Pair", formatEther(await wethContract.balanceOf(pairAddress)));

    expect(formatEther(await lpToken.balanceOf(owner.address))).to.not.equal("0");
  });


  it("Should deploy the Renounced Contract", async function () {
    const BabyDogeManager = await ethers.getContractFactory("BabyDogeManager");
    babyDogeManager = await BabyDogeManager.deploy(bnbReciever.address, babyDogeReciver.address, lpToken.address, babyDoge.address, router.address);
    await babyDogeManager.deployed();
    console.log("babyDogeManager Address", babyDogeManager.address);
    expect(babyDogeManager.address).to.not.equal("");
  });

  it("Should Load contract with LP Tokens", async function () {
    let totalLps = await lpToken.balanceOf(owner.address);
    await lpToken.transfer(babyDogeManager.address,totalLps)
    expect(formatEther(await lpToken.balanceOf(babyDogeManager.address))).to.equal(formatEther(totalLps));
  });

  it("Should Allow owner to call exchangeLP Function ", async function () {
    console.log("babydogeBurner", babyDogeManager.address);
    await babyDogeManager.exchangeLP() 

    console.log("BabyDoge Reciever Balance", formatUnits(await babyDoge.balanceOf(babyDogeReciver.address), "9"));
    console.log("BNB Reciever Balance", formatEther(await ethers.provider.getBalance(bnbReciever.address)));
    console.log("LP Token Balance of Contract", formatEther(await lpToken.balanceOf(babyDogeManager.address)));
    console.log("BabyDoge Balance of Pair", formatUnits(await babyDoge.balanceOf(lpToken.address), "9"));
    console.log("BNB Balance of Pair", formatEther(await ethers.provider.getBalance(lpToken.address)));

    expect(formatUnits(await babyDoge.balanceOf(babyDogeReciver.address), "9")).to.not.equal("0");
    expect(formatEther(await ethers.provider.getBalance(bnbReciever.address))).to.not.equal("0");

  });


  it("Should add more liquidity to factory a fake BabyDoge", async function () {
    let lastBlock = await ethers.provider.getBlockNumber();
    let lastBlockObj = await ethers.provider.getBlock(lastBlock);
    let lastBlockTime = lastBlockObj.timestamp;
    await wethContract.approve(router.address, parseEther("50"));
    await babyDoge.approve(router.address, parseUnits("1000", "9"));
    await router.addLiquidity(babyDoge.address, wethContract.address, parseUnits("1000", "9"),parseEther("50"),  "0", "0", owner.address,(lastBlockTime  +1200))
    expect(formatEther(await lpToken.balanceOf(owner.address))).to.not.equal("0");

  });


  it("Should Load contract with more LP Tokens", async function () {
    let totalLps = await lpToken.balanceOf(owner.address);
    await lpToken.transfer(babyDogeManager.address,totalLps)
    expect(formatEther(await lpToken.balanceOf(babyDogeManager.address))).to.equal(formatEther(totalLps));
  });

  it("Should not allow anyone else to call exchangeLP Function ", async function () {
    console.log("Should Revert");
    await expect(babyDogeManager.connect(addr4).exchangeLP()).to.be.reverted;
  });


  //should fail
  it("Should Allow keeper to call exchangeLP Function ", async function () {
    await babyDogeManager.connect(keeper).exchangeLP() 

    console.log("BabyDoge Reciever Balance", formatUnits(await babyDoge.balanceOf(babyDogeReciver.address), "9"));
    console.log("BNB Reciever Balance", formatEther(await ethers.provider.getBalance(bnbReciever.address)));
    console.log("LP Token Balance of Contract", formatEther(await lpToken.balanceOf(babyDogeManager.address)));
    console.log("BabyDoge Balance of Pair", formatUnits(await babyDoge.balanceOf(lpToken.address), "9"));
    console.log("BNB Balance of Pair", formatEther(await ethers.provider.getBalance(lpToken.address)));

    expect(formatUnits(await babyDoge.balanceOf(babyDogeReciver.address), "9")).to.not.equal("0");
    expect(formatEther(await ethers.provider.getBalance(bnbReciever.address))).to.not.equal("0");
  });

  it("Should be able to transfer ownership of babydoge to babyDogeManager", async function () {
    await babyDoge.transferOwnership(babyDogeManager.address)
    expect(await babyDoge.owner()).to.equal(babyDogeManager.address);
  });
    // vvvvvvvvvvvvvvvvvvvv BabyDoge Owner functions vvvvvvvvvvvvvvvvvvvv 

  it("BabyDogeManager Should be able to blacklist someone from rewards", async function () {
    await babyDogeManager.excludeFromReward(addr4.address);
    let isExcluded = await babyDoge.isExcludedFromReward(addr4.address);
    expect(isExcluded).to.equal(true);
  });

  it("BabyDogeManager Should be able to whitelist someone from rewards", async function () {
    await babyDogeManager.includeInReward(addr4.address);
    let isExcluded = await babyDoge.isExcludedFromReward(addr4.address);
    expect(isExcluded).to.equal(false);
  });

  it("BabyDogeManager Should be able to whitelist someone", async function () {
    await babyDogeManager.excludeFromFee(addr4.address);
    let isExcluded = await babyDoge.isExcludedFromFee(addr4.address);
    expect(isExcluded).to.equal(true);
  });

  it("BabyDogeManager Should be able to blacklist someone", async function () {
    await babyDogeManager.includeInFee(addr4.address);
    let isExcluded = await babyDoge.isExcludedFromFee(addr4.address);
    expect(isExcluded).to.equal(false);
  });

  it("BabyDogeManager Should be able to set Tax Fee Percent", async function () {
    await babyDogeManager.setTaxFeePercent("7");
    let taxFee = await babyDoge._taxFee();
    expect(taxFee).to.equal("7");
  });

  it("BabyDogeManager Should be able to set Liquidity Fee Percent", async function () {
    await babyDogeManager.setLiquidityFeePercent("7");
    let taxFee = await babyDoge._liquidityFee();
    expect(taxFee).to.equal("7");
  });

  it("BabyDogeManager Should be able to set Num Tokens Sell To AddToLiquidity", async function () {
    await babyDogeManager.setNumTokensSellToAddToLiquidity("40000000");
    let newLiquidity = await babyDoge.numTokensSellToAddToLiquidity();
    expect(newLiquidity).to.equal(parseUnits("40000000", "9"));
  });

  it("BabyDogeManager Should be able to set Max tx Amount ", async function () {
    console.log(await babyDoge._maxTxAmount());
    await babyDogeManager.setMaxTxPercent("100");
    let maxTxPercent = await babyDoge._maxTxAmount();
    expect(maxTxPercent).to.equal(parseUnits("100", "9"));
  });

  it("BabyDogeManager Should be able to set swap and liquify", async function () {
    await babyDogeManager.setSwapAndLiquifyEnabled(false);
    let swapAndLiquify = await babyDoge.swapAndLiquifyEnabled();
    expect(swapAndLiquify).to.equal(false);
  });
  it("Should be able to send babyDoge some eth", async function () {
      // Send 1 ether to an ens name.
    const tx = await owner.sendTransaction({
      to: babyDoge.address,
      value: ethers.utils.parseEther("1.0")
    });
    
    expect(formatEther(await ethers.provider.getBalance(babyDoge.address))).to.equal("1.0");

  });

  it("BabyDogeManager Should be able to claim tokens", async function () {
    await babyDogeManager.claimTokensInBoth();
    let balanceOfManager = await ethers.provider.getBalance(babyDogeManager.address);
    expect(formatEther(balanceOfManager)).to.equal("0.0");
  });
  

  it("Should be able to transfer ownership of babydoge back to owner", async function () {
    await babyDogeManager.transferBabyDogeOwnership(owner.address)
    expect(await babyDoge.owner()).to.equal(owner.address);
  });

  it("Owner Should be able to blacklist someone", async function () {
    await babyDoge.includeInFee(addr4.address);
    let isExcluded = await babyDoge.isExcludedFromFee(addr4.address);

    expect(isExcluded).to.equal(false);
  });

  // ^^^^^^^^^^^^^^^^^^^^ BabyDoge Owner functions ^^^^^^^^^^^^^^^^^^^^

  // vvvvvvvvvvvvvvvvvvvv chainlink keeper functions vvvvvvvvvvvvvvvvvvvv 

  // it("Should create an instance of the Chainlink token Contract", async function () {
  // // 0xa36085F69e2889c224210F603D836748e7dC0088
  // let ChainLinkAddress = "0xa36085F69e2889c224210F603D836748e7dC0088"
  // chainLinkToken = await ethers.getContractAt("ERC677Token", ChainLinkAddress);
  // await chainLinkToken.deployed();
  // expect(chainLinkToken.address).to.not.equal("")

  // });

  // it("Should create an instance of the Chainlink Keeper Register Contract", async function () {

  //     const keeperRegisterAddress = "0x245211139eb8dec0a2a4b4d7dcc21a0f6b1ce863";
  //     keeperRegister = await ethers.getContractAt("contracts/test/ChainlinkRegister.sol:UpkeepRegistrationRequests", keeperRegisterAddress);
  //     await keeperRegister.deployed();
  //     expect(keeperRegister.address).to.not.equal("")
  // });

  // it("Should Register Manager contract with keeper Register", async function () {
  // //   function register(
  // //     string memory name,
  // //     bytes calldata encryptedEmail,
  // //     address upkeepContract,
  // //     uint32 gasLimit,
  // //     address adminAddress,
  // //     bytes calldata checkData,
  // //     uint96 amount,
  // //     uint8 source
  // // )
  // const emptyBytes = '0x00'
  // const executeGas = "100000"
  // const source = "100"

  // const abiEncodedBytes = keeperRegister.interface.encodeFunctionData(
  //   'keeperRegister',
  //   [
  //     "BabyDogeManager",
  //     emptyBytes,
  //     chainLinkToken.address,
  //     executeGas,
  //     owner.address,
  //     emptyBytes,
  //     parseEther("60"),
  //     source
  //   ],
  // )
  
  // let amount = parseEther("5")
  
  // const tx = await chainLinkToken.transferAndCall(
  //   owner.address,
  //   amount,
  //   abiEncodedBytes,
  // )

  // expect(tx).to.equal(true)

  // });
  // ^^^^^^^^^^^^^^^^^^^^ chainlink keeper functions ^^^^^^^^^^^^^^^^^^^^

  


});
