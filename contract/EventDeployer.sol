// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {EventTicket} from "./TicktingContract.sol";

contract EventDeployer is OwnableUpgradeable {
    using SafeERC20 for IERC20;
    using Address for address payable;

    IERC20 public tokenAddress;
    address public fundsWallet;
    uint256 public deploymentFee;
    mapping(uint256 => address) public contractAddresses;
    mapping(address => bool) public approvedContracts;
    uint256 public contractCount; // Track the number of deployed contracts

    function initialize(address _tokenAddress, address _fundsWallet)
        public
        initializer
    {
        __Ownable_init(msg.sender);
        tokenAddress = IERC20(_tokenAddress);
        fundsWallet = _fundsWallet;
    }

    function setTokenAddress(address _tokenAddress) public onlyOwner {
        tokenAddress = IERC20(_tokenAddress);
    }

    function setFundsWallet(address _fundsWallet) public onlyOwner {
        fundsWallet = _fundsWallet;
    }

    function setDeploymentFee(uint256 _deploymentFee) public onlyOwner {
        deploymentFee = _deploymentFee;
    }

    function deployNewCollection(
        string memory name,
        string memory symbol,
        string memory eventName,
        uint256 startTime,
        uint256 endTime,
        uint256 ticketStartBuyDate,
        uint256 ticketEndBuyDate,
        EventTicket.Ticket[] memory tickets,
        IERC20 _Token,
        address _fundsWallet
    ) public returns (address) {
        // Deploy the EventTicket contract
        EventTicket newCollection = new EventTicket();
        newCollection.initialize(
            name,
            symbol,
            address(_Token),
            eventName,
            startTime,
            endTime,
            ticketStartBuyDate,
            ticketEndBuyDate,
            tickets,
            _fundsWallet,
            msg.sender,
            address(this)
        );

        // Store the address of the deployed contract
        contractAddresses[contractCount] = address(newCollection);
        contractCount++;
        return address(newCollection);
    }

    function approveContract(address contractAddress) public onlyOwner {
        approvedContracts[contractAddress] = true;
    }

    function revokeContract(address contractAddress) public onlyOwner {
        approvedContracts[contractAddress] = false;
    }

    
}