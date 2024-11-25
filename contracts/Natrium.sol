//SPDX-License-Identifier:MIT
pragma solidity ^ 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NatriumInternalCalculations is Initializable, OwnableUpgradeable
{
    address public contractOwner;
    event transferServiceFees(address owner, uint serviceFees);
    event transferNftPrice(address seller, uint256 nftPrice, uint256 timeStamp);
    
    function initialize() public virtual onlyInitializing {
        contractOwner = msg.sender;
        __Ownable_init(msg.sender);
    }

    function _transferAmountToSeller(uint256 _nftPrice, uint8 _serviceFees, address _seller) internal 
    {
        require(_serviceFees > 0 ,
        "MarketPlace not set service fees yet");
        
        uint totalNFTPrice = _nftPrice;
        uint ServiceFees = _marketplaceServiceFess(_nftPrice, _serviceFees);

        totalNFTPrice = totalNFTPrice - ServiceFees;

        payable(_seller).transfer(totalNFTPrice);

        emit transferNftPrice(_seller, totalNFTPrice, block.timestamp);
        
    }

    function _marketplaceServiceFess(uint256 _price, uint8 _serviceFess) internal returns(uint256)
    {
        uint serviceFeeAmount = (_price * _serviceFess) / 100;
        payable(contractOwner).transfer(serviceFeeAmount);

        emit transferServiceFees(contractOwner, serviceFeeAmount);

        return serviceFeeAmount;
    }
}