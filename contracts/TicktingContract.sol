// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EventDeployer} from "./EventDeployer.sol";

/// @title EventTicket Contract
/// @notice This contract allows the creation and sale of event tickets as ERC721 tokens.
/// @dev The contract is upgradeable and uses OpenZeppelin libraries.
contract EventTicket is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    /// @notice A struct representing a ticket type for the event.
    /// @param ticketType The type/category of the ticket (e.g., VIP, General Admission).
    /// @param quantity The number of tickets available for this type.
    /// @param price The price of a single ticket in USDT.
    struct Ticket {
        string ticketType;
        uint256 quantity;
        uint256 price;
    }
    /// @notice Public address of the event deployer

    address public eventDeployer;

    /// @notice A struct representing the details of the event.
    /// @param eventName The name of the event.
    /// @param startDate The start date of the event (in UNIX timestamp).
    /// @param endDate The end date of the event (in UNIX timestamp).
    /// @param ticketStartBuyDate The start date for ticket sales (in UNIX timestamp).
    /// @param ticketEndBuyDate The end date for ticket sales (in UNIX timestamp).
    /// @param tickets An array of Ticket structs representing the different ticket types.
    struct EventDetail {
        string eventName;
        uint256 startDate;
        uint256 endDate;
        uint256 ticketStartBuyDate;
        uint256 ticketEndBuyDate;
        Ticket[] tickets;
    }

    /// @notice The details of the event.
    EventDetail public eventDetail;

    /// @notice The ERC20 token used for payments (USDT).
    IERC20 public usdtToken;

    /// @notice The userAddress to recieve the funds.

    address public fundsWallet;

    /// @notice A mapping from tokenId to Ticket struct representing the ticket information for each minted token.
    mapping(uint256 => Ticket) public ticketInfo;

    /// @notice A mapping from tokenId to the metadata URI for each token.
    mapping(uint256 => string) private _tokenURIs;

    /// @notice The next tokenId to be minted.
    uint256 private nextTokenId;

    /// @notice Custom error for handling non-existent tokens.
    error TokenDoesNotExist();

    /// @notice Initializes the contract with the event details and ticket types.
    /// @param name The name of the ERC721 token.
    /// @param symbol The symbol of the ERC721 token.
    /// @param _usdtTokenAddress The address of the USDT token contract.
    /// @param _eventName The name of the event.
    /// @param _startDate The start date of the event (in UNIX timestamp).
    /// @param _endDate The end date of the event (in UNIX timestamp).
    /// @param _ticketStartBuyDate The start date for ticket sales (in UNIX timestamp).
    /// @param _ticketEndBuyDate The end date for ticket sales (in UNIX timestamp).
    /// @param _tickets An array of Ticket structs representing the different ticket types.
    function initialize(
        string memory name,
        string memory symbol,
        address _usdtTokenAddress,
        string memory _eventName,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _ticketStartBuyDate,
        uint256 _ticketEndBuyDate,
        Ticket[] memory _tickets,
        address _fundsWallet,
        address _owner,
        address _eventDeployer
    ) public initializer {
        __ERC721_init(name, symbol);
        __Ownable_init(_owner);

        usdtToken = IERC20(_usdtTokenAddress);
        eventDeployer = _eventDeployer;
        fundsWallet=_fundsWallet;

        eventDetail.eventName = _eventName;
        eventDetail.startDate = _startDate;
        eventDetail.endDate = _endDate;
        eventDetail.ticketStartBuyDate = _ticketStartBuyDate;
        eventDetail.ticketEndBuyDate = _ticketEndBuyDate;

        // Copy each ticket from memory to storage
        for (uint256 i = 0; i < _tickets.length; i++) {
            eventDetail.tickets.push(_tickets[i]);
        }

        nextTokenId = 0;
    }

    /// @notice Mints a ticket for the specified ticket type and assigns a metadata URI.
    /// @dev Requires that the ticket sales period is active and that the ticket type is valid and available.
    /// @param ticketIndex The index of the ticket type in the eventDetail.tickets array.
    /// @param _tokenURI The metadata URI associated with the minted token.
    function mintTicket(uint256 ticketIndex, string memory _tokenURI) external {
        require(
            block.timestamp >= eventDetail.ticketStartBuyDate,
            "Ticket sales have not started yet"
        );
        require(
            block.timestamp <= eventDetail.ticketEndBuyDate,
            "Ticket sales have ended"
        );
        require(
            ticketIndex < eventDetail.tickets.length,
            "Invalid ticket type"
        );

        Ticket storage selectedTicket = eventDetail.tickets[ticketIndex];
        require(selectedTicket.quantity > 0, "Ticket sold out");

        // uint256 price = selectedTicket.price;
        // require(
        //     usdtToken.transferFrom(msg.sender, address(this), price),
        //     "USDT payment failed"
        // );

        selectedTicket.quantity -= 1;
        uint256 tokenId = nextTokenId;
        nextTokenId += 1;

        _safeMint(msg.sender, tokenId); // Mint the NFT with the new tokenId
        _setTokenURI(tokenId, _tokenURI); // Set the specific URI for this tokenId
        ticketInfo[tokenId] = selectedTicket;
    }

    /// @notice Sets the metadata URI for a given token ID.
    /// @dev Can only be called internally. Reverts if the token does not exist.
    /// @param tokenId The ID of the token.
    /// @param _tokenURI The metadata URI to be associated with the token.
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist();
        }
        _tokenURIs[tokenId] = _tokenURI;
    }

    /// @notice Returns the metadata URI associated with a given token ID.
    /// @dev Reverts if the token does not exist.
    /// @param tokenId The ID of the token.
    /// @return The metadata URI associated with the token.
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist();
        }
        return _tokenURIs[tokenId];
    }

    function setEventDeployer(address _eventDeployer) public onlyOwner {
        eventDeployer = _eventDeployer;
    }

    /// @notice Returns the list of all ticket types for the event.
    /// @return An array of Ticket structs representing the available ticket types.
    function getTickets() external view returns (Ticket[] memory) {
        return eventDetail.tickets;
    }

    function withdrawFunds() public onlyOwner {
        require(
            EventDeployer(eventDeployer).approvedContracts(address(this)),
            "This contract is not approved for withdrawals"
        );

        uint256 balance = usdtToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");

        usdtToken.safeTransfer(fundsWallet, balance);
    }
}