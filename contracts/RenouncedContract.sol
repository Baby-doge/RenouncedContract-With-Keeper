// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "contracts/interfaces/IUniswapV2Router02.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

//0xc748673057861a797275CD8A068AbB95A902e8de babydoge
//weth 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
//lp token: 0xc736cA3d9b1E90Af4230BD8F9626528B3D4e0Ee0
// lp tokens are 18 decimal places
//once a month
//set up chainlink keeper

contract BabyDogeBurner is Ownable, KeeperCompatibleInterface {
    address public babyDogeAddress;
    address public lpTokenAddress;

    mapping(address => bool) public whiteListed;

    address public PancakeRouter;
    address public bnbReciever;
    address public keeperAddress;
    address public babyDogeReciever;

    address public immutable WBNB;

    constructor(
        address _bnbReciever,
        address _babyDogeReciever,
        address _keeperContract,
        address _lpTokenAddress,
        address _babyDoge,
        address _router,
        address _WBNB
    ) public {
        babyDogeAddress = _babyDoge;
        lpTokenAddress = _lpTokenAddress;
        PancakeRouter = _router; //uniswap testnet 
        WBNB = _WBNB;
        bnbReciever = _bnbReciever;
        babyDogeReciever = _babyDogeReciever;
        keeperAddress = _keeperContract;
    }

    receive() external payable {}

    fallback() external payable {}

    modifier onlyKeeperOrOwner() {
        require(
            keeperAddress == _msgSender() || owner() == _msgSender(),
            "Caller is not the Keeper or the Owner"
        );
        _;
    }

    function exchangeLP() public onlyKeeperOrOwner {
        uint256 lpAmount = IERC20(lpTokenAddress).balanceOf(address(this));

        IERC20(lpTokenAddress).approve(PancakeRouter, lpAmount);
        (, uint256 wbnbamount) = IUniswapV2Router02(PancakeRouter)
            .removeLiquidity(
                address(babyDogeAddress),
                WBNB,
                lpAmount,
                1,
                1,
                address(this),
                block.timestamp + 1200
            );

        // IWETH(WBNB).withdraw(wbnbamount);

        uint256 babyDogebalance = IERC20(babyDogeAddress).balanceOf(
            address(this)
        );

        IERC20(babyDogeAddress).transfer(babyDogeReciever, babyDogebalance);

        uint256 bnbBalance = IERC20(WBNB).balanceOf(address(this));

        IERC20(WBNB).transfer(bnbReciever, bnbBalance);

        (bool sent, bytes memory data) = msg.sender.call{
            value: address(this).balance
        }("");
        require(sent, "Failed to send Ether");
    }

    function setRouter(address _router) public onlyOwner {
        PancakeRouter = _router;
    }

    function setBNBReciever(address _bnbReciever) public onlyOwner {
        bnbReciever = _bnbReciever;
    }

    function setBabyDogeReciever(address _babyDogeReciever) public onlyOwner {
        babyDogeReciever = _babyDogeReciever;
    }

    function setKeeper(address _keeperAddress) public onlyOwner {
        keeperAddress = _keeperAddress;
    }

    // chainlink keeper functions 
    function checkUpkeep(bytes calldata /* checkData */) external override returns (bool upkeepNeeded, bytes memory /* performData */) {
        upkeepNeeded = IERC20(lpTokenAddress).balanceOf(address(this)) >= (40 * 10**18); // change on actualy deployment to 10k
        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
    }

    function performUpkeep(bytes calldata /* performData */) external override {
      
      exchangeLP();
        // We don't use the performData in this example. The performData is generated by the Keeper's call to your checkUpkeep function
    }
}

interface IWETH {
    function deposit() external payable;

    function transfer(address to, uint256 value) external returns (bool);

    function withdraw(uint256) external;
}