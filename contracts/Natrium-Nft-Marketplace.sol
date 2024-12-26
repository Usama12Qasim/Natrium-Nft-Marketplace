//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./Natrium.sol";
import "./TicktingContract.sol";
import "./EventDeployer.sol";

contract NatirumMarketplace is
    NatriumInternalCalculations,
    ReentrancyGuardUpgradeable
{
    struct NftDetails {
        address seller;
        uint256 tokenID;
        address hostContract;
        uint256 nftPrice;
        uint256 Expiration;
        bool isListed;
    }

    struct OfferDetails {
        address buyer;
        uint256 tokenID;
        uint256 offerPrice;
        uint256 offerExpire;
        bool offerPlaced;
    }

    mapping(address => mapping(uint256 => NftDetails)) nftInfo;
    mapping(address => mapping(uint256 => OfferDetails)) offererInfo;
    mapping(address => uint256) public trackOfferPrice;

    uint8 private serviceFees;
    address private factoryAddress;

    event ListNFT(
        address seller,
        uint256 tokenID,
        string TicketType,
        string tokenUri,
        address hostContract,
        uint256 nftPrice,
        uint256 Expiration,
        bool isListed
    );

    event UnListNFT(
        address seller,
        uint256 tokenID,
        address hostContract,
        bool isUnlisted
    );
    event TransferNft(
        address from,
        address to,
        uint256 tokenID,
        uint256 paidPrice,
        uint256 timeStamp
    );
    event makeOffer(address buyer, uint256 offerPrice, uint256 tokenId);

    event acceptOffer(
        address buyer,
        uint256 acceptedPrice,
        uint256 tokenId,
        bool isAccepted
    );

    event RejectOffer(address buyer, uint256 offerPrice, bool isRejected);

    event serviceFeesAndFactoryContract(
        address admin,
        uint8 serviceFee,
        address FactoryAddress
    );

    event withdraw(address buyer, uint256 amount, uint256 timeStamp);

    function initialize() public override initializer {
        __Ownable_init(msg.sender);
        NatriumInternalCalculations.initialize();
        ReentrancyGuardUpgradeable.__ReentrancyGuard_init();
    }

    function listNft(
        uint256 _tokenId,
        uint256 _price,
        uint256 _NftExpiration,
        address _hostContract
    ) external {
        EventTicket hostContract = EventTicket(_hostContract);
        //EventDeployer factory = EventDeployer(_hostContract);
        NftDetails storage info = nftInfo[msg.sender][_tokenId];

        // require(
        //     factory.approvedContracts(_hostContract),
        //     "HostContract isn't created in Event deployer factory"
        // );

        require(
            hostContract.ownerOf(_tokenId) == msg.sender,
            "You are not the owner of this Nft"
        );

        require(!info.isListed, "Already Listed");

        require(_NftExpiration > block.timestamp, "Time Error");

        info.hostContract = _hostContract;
        info.seller = msg.sender;
        info.nftPrice = _price;
        info.tokenID = _tokenId;
        info.isListed = true;
        info.Expiration = _NftExpiration;

        string memory TokenUri = hostContract.tokenURI(_tokenId);
        (string memory Ticketype, , ) = EventTicket(hostContract).ticketInfo(
            _tokenId
        );

        hostContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit ListNFT(
            msg.sender,
            _tokenId,
            Ticketype,
            TokenUri,
            _hostContract,
            _price,
            _NftExpiration,
            info.isListed
        );
    }

    function unListNft(uint256 _tokenId) external {
        require(
            nftInfo[msg.sender][_tokenId].seller == msg.sender,
            "Only Seller can unList his own Nft"
        );

        require(nftInfo[msg.sender][_tokenId].isListed, "Nft is not Listed");

        _unListNft(_tokenId);

        delete nftInfo[msg.sender][_tokenId];
    }

    function _unListNft(uint256 _tokenId) internal {
        address _hostContract = nftInfo[msg.sender][_tokenId].hostContract;

        EventTicket hostContract = EventTicket(_hostContract);

        hostContract.safeTransferFrom(
            address(this),
            nftInfo[msg.sender][_tokenId].seller,
            _tokenId
        );

        emit UnListNFT(
            nftInfo[msg.sender][_tokenId].seller,
            _tokenId,
            nftInfo[msg.sender][_tokenId].hostContract,
            true
        );
    }

    function buyNft(uint256 _tokenId, address _seller) external payable {
        uint256 NftPrice = nftInfo[_seller][_tokenId].nftPrice;
        address _hostContract = nftInfo[_seller][_tokenId].hostContract;

        require(nftInfo[_seller][_tokenId].seller == _seller, "Invalid Seller");
        require(msg.value == NftPrice && NftPrice != 0, "InSufficient Amount");
        require(
            nftInfo[_seller][_tokenId].seller != msg.sender,
            "Can't Self buy"
        );

        require(
            block.timestamp < nftInfo[_seller][_tokenId].Expiration,
            "Nft Expired"
        );

        _transferNftAndFee(
            _tokenId,
            msg.sender,
            _hostContract,
            NftPrice,
            _seller
        );

        emit TransferNft(
            _seller,
            msg.sender,
            _tokenId,
            NftPrice,
            block.timestamp
        );

        delete nftInfo[_seller][_tokenId];
    }

    function createOffer(
        uint256 _tokenId,
        uint256 _offerPrice,
        uint256 _offerExpiry,
        address _seller
    ) external payable {
        OfferDetails storage details = offererInfo[msg.sender][_tokenId];
        NftDetails storage info = nftInfo[_seller][_tokenId];

        require(info.isListed, "This token is not Listed");
        require(block.timestamp < info.Expiration, "Nft Expired");
        require(_offerExpiry > block.timestamp, "Time Error");
        require(msg.value == _offerPrice, "Invalid amount");
        require(!details.offerPlaced, "Already Placed Offer");

        trackOfferPrice[msg.sender] = msg.value;

        details.buyer = msg.sender;
        details.offerPrice = _offerPrice;
        details.offerExpire = _offerExpiry;
        details.tokenID = _tokenId;
        details.offerPlaced = true;

        emit makeOffer(msg.sender, _offerPrice, _tokenId);
    }

    function acceptOffers(uint256 _tokenId, address _buyer) external {
        NftDetails memory info = nftInfo[msg.sender][_tokenId];
        OfferDetails memory details = offererInfo[_buyer][_tokenId];

        require(trackOfferPrice[_buyer] > 0, "Doesn't receive offer");
        require(info.seller == msg.sender, "Only Seller can accept the offer");
        require(details.offerPlaced, "This token has no offer");
        require(block.timestamp < details.offerExpire, "Offer Expired");

        uint256 offerPrice = trackOfferPrice[_buyer];
        trackOfferPrice[_buyer] = 0;

        _transferNftAndFee(
            _tokenId,
            _buyer,
            info.hostContract,
            offerPrice,
            msg.sender
        );

        emit acceptOffer(_buyer, offerPrice, _tokenId, true);

        delete nftInfo[msg.sender][_tokenId];
        delete offererInfo[_buyer][_tokenId];
    }

    function rejectOffer(
        uint256 _tokenId,
        address _buyer
    ) external nonReentrant {
        OfferDetails memory details = offererInfo[_buyer][_tokenId];
        NftDetails memory info = nftInfo[msg.sender][_tokenId];

        require(details.tokenID == _tokenId, "Invalid token Id");
        require(
            trackOfferPrice[_buyer] > 0,
            "No Offer has received on this token"
        );
        require(details.buyer == _buyer, "InValid Buyer Address");
        require(msg.sender == info.seller, "Only Seller can reject this offer");

        uint256 offerPrice = trackOfferPrice[_buyer];
        trackOfferPrice[_buyer] = 0;

        payable(details.buyer).transfer(offerPrice);

        emit RejectOffer(_buyer, offerPrice, true);

        delete offererInfo[_buyer][_tokenId];
    }

    function withDraw(uint256 _tokenId) external nonReentrant {
        OfferDetails memory details = offererInfo[msg.sender][_tokenId];

        require(
            details.buyer == msg.sender,
            "Only buyer withdraw his own amount"
        );
        require(trackOfferPrice[msg.sender] > 0, "Already With-Draw Amount");

        uint256 offerPrice = trackOfferPrice[msg.sender];
        trackOfferPrice[msg.sender] = 0;

        payable(msg.sender).transfer(offerPrice);

        emit withdraw(msg.sender, offerPrice, block.timestamp);
    }

    function setServiceFeesAndFactoryContract(
        uint8 _serviceFees,
        address _factoryAddress
    ) external onlyOwner {
        require(_serviceFees > 0, "Service Fees must be greater than zero");
        require(_factoryAddress != address(0), "Invalid Factory Address");
        factoryAddress = _factoryAddress;
        serviceFees = _serviceFees;

        emit serviceFeesAndFactoryContract(
            msg.sender,
            _serviceFees,
            _factoryAddress
        );
    }

    function _transferNftAndFee(
        uint256 _tokenId,
        address _buyerAddress,
        address _hostContract,
        uint256 _price,
        address _seller
    ) internal {
        EventTicket hostContract = EventTicket(_hostContract);

        _transferAmountToSeller(_price, serviceFees, _seller);

        hostContract.safeTransferFrom(address(this), _buyerAddress, _tokenId);
    }

    function getNftDetails(
        address _seller,
        uint256 _tokenId
    )
        external
        view
        returns (
            address Seller,
            uint256 TokenId,
            address hostContract,
            uint256 NftPrice,
            bool Listed
        )
    {
        NftDetails memory details = nftInfo[_seller][_tokenId];
        return (
            details.seller,
            details.tokenID,
            details.hostContract,
            details.nftPrice,
            details.isListed
        );
    }

    function getOfferDetails(
        uint256 _tokenId
    ) public view returns (OfferDetails memory) {
        return offererInfo[msg.sender][_tokenId];
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
