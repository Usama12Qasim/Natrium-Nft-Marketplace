//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Natrium.sol";
import "./TicktingContract.sol";

contract NatirumMarketplace is
    NatriumInternalCalculations,
    ReentrancyGuard,
    EventDeployer
{
    enum Offer {
        makeOffer,
        acceptOffer,
        rejectOffer
    }

    Offer public currentOffer;

    struct NftDetails {
        address seller;
        uint256 tokenID;
        address hostContract;
        uint256 nftPrice;
        bool isListed;
    }

    struct OfferDetails {
        address buyer;
        uint256 tokenID;
        uint256 offerPrice;
        uint256 offerExpire;
        Offer currentOffer;
    }

    mapping(address => NftDetails) nftInfo;
    mapping(address => OfferDetails) offererInfo;
    mapping(address => uint256) trackOfferPrice;

    uint8 private serviceFees;

    event ListNFT(
        address seller,
        uint256 tokenID,
        address hostContract,
        uint256 nftPrice,
        bool isListed
    );

    event UnListNFT(
        address seller,
        uint256 tokenID,
        address hostContract,
        bool isUnlisted
    );
    event buyNFT(
        address buyer,
        uint256 tokenID,
        uint256 paidPrice,
        uint256 timeStamp
    );
    event makeOffer(address buyer, uint256 offerPrice);

    event acceptOffer(
        address buyer,
        uint256 acceptedPrice,
        uint256 tokenId,
        bool isAccepted
    );

    event CancelOffer(address buyer, uint256 offerPrice, bool isCancel);

    event servicePercentage(address admin, uint8 serviceFee);

    function initialize() public override initializer {
        __Ownable_init(msg.sender);
        NatriumInternalCalculations.initialize();
    }

    function listNft(
        uint256 _tokenId,
        uint256 _price,
        address _hostContract,
        address _newCollectionAddress
    ) external nonReentrant {
        EventTicket hostContract = EventTicket(_hostContract);
        NftDetails storage info = nftInfo[msg.sender];

        require(
            approvedContracts[_newCollectionAddress],
            "Not approve by factory contract"
        );

        require(
            hostContract.ownerOf(_tokenId) == msg.sender,
            "You are not the owner of this Nft"
        );
        require(!info.isListed, "Already Listed");

        info.hostContract = _hostContract;
        info.seller = msg.sender;
        info.nftPrice = _price;
        info.tokenID = _tokenId;
        info.isListed = true;

        hostContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit ListNFT(
            msg.sender,
            _tokenId,
            _hostContract,
            _price,
            info.isListed
        );
    }

    function unListNft(uint256 _tokenId) external nonReentrant {
        require(
            nftInfo[msg.sender].seller == msg.sender,
            "Only Seller can unList his own Nft"
        );

        require(nftInfo[msg.sender].isListed, "Nft is not Listed");

        _unListNft(_tokenId);

        delete nftInfo[msg.sender];
    }

    function _unListNft(uint256 _tokenId) internal {
        address _hostContract = nftInfo[msg.sender].hostContract;

        EventTicket hostContract = EventTicket(_hostContract);

        hostContract.safeTransferFrom(
            address(this),
            nftInfo[msg.sender].seller,
            _tokenId
        );

        emit UnListNFT(
            nftInfo[msg.sender].seller,
            _tokenId,
            nftInfo[msg.sender].hostContract,
            true
        );
    }

    function buyNft(
        uint256 _tokenId,
        address _seller,
        address _hostContract
    ) external payable nonReentrant {
        uint256 NftPrice = nftInfo[_seller].nftPrice;

        require(nftInfo[_seller].isListed, "Nft: Not Listed");
        require(nftInfo[_seller].seller == _seller, "Invalid Seller");
        require(msg.value == NftPrice && NftPrice != 0, "InSufficient Amount");
        require(nftInfo[_seller].seller != msg.sender, "Can't Self buy");

        _transferNftAndFee(
            _tokenId,
            msg.sender,
            _hostContract,
            NftPrice,
            _seller
        );

        emit buyNFT(msg.sender, _tokenId, msg.value, block.timestamp);

        delete nftInfo[_seller];
    }

    function createOffer(
        uint256 _tokenId,
        uint256 _offerPrice,
        uint256 _offerExpiry,
        address _seller
    ) external payable nonReentrant {
        NftDetails memory info = nftInfo[_seller];
        OfferDetails storage details = offererInfo[msg.sender];

        require(info.tokenID == _tokenId, "This token is not Listed");
        require(info.seller == _seller, "Invalid Address");
        require(_offerExpiry > block.timestamp, "Time Error");
        require(msg.value == _offerPrice, "Invalid amount");

        trackOfferPrice[msg.sender] += msg.value;

        details.buyer = msg.sender;
        details.offerPrice = _offerPrice;
        details.offerExpire = _offerExpiry;
        details.tokenID = _tokenId;
        details.currentOffer = Offer(0);

        emit makeOffer(msg.sender, msg.value);
    }

    function acceptOffers(
        uint256 _tokenId,
        address _buyer
    ) external nonReentrant {
        NftDetails memory info = nftInfo[msg.sender];
        OfferDetails memory details = offererInfo[_buyer];

        require(info.seller == msg.sender, "Only Seller can accept the offer");
        require(trackOfferPrice[_buyer] > 0, "Doesn't receive offer");
        require(block.timestamp < details.offerExpire, "Offer Expired");
        require(details.tokenID == _tokenId, "This token has no offer");

        offererInfo[_buyer].currentOffer = Offer(1);

        uint256 offerPrice = trackOfferPrice[_buyer];
        trackOfferPrice[_buyer] = 0;

        _transferNftAndFee(
            _tokenId,
            _buyer,
            info.hostContract,
            offerPrice,
            msg.sender
        );

        emit acceptOffer(_buyer, details.offerPrice, _tokenId, true);

        delete nftInfo[msg.sender];
        delete offererInfo[_buyer];
    }

    function rejectOffer(
        uint256 _tokenId,
        address _buyer
    ) external nonReentrant {
        OfferDetails memory details = offererInfo[_buyer];
        NftDetails memory info = nftInfo[msg.sender];

        require(details.offerPrice > 0, "No Offer has received on this token");
        require(details.buyer == _buyer, "InValid Buyer Address");
        require(msg.sender == info.seller, "Only Seller can reject this offer");
        require(details.tokenID == _tokenId, "InValid token Id");

        offererInfo[_buyer].currentOffer = Offer(2);

        uint256 offerPrice = trackOfferPrice[_buyer];
        trackOfferPrice[_buyer] = 0;

        payable(details.buyer).transfer(offerPrice);

        delete offererInfo[_buyer];
    }

    function setServiceFees(uint8 _serviceFees) external onlyOwner {
        require(_serviceFees > 0, "Service Fees must be greater than zero");

        serviceFees = _serviceFees;

        emit servicePercentage(msg.sender, _serviceFees);
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
        address listerAddress
    ) public view returns (NftDetails memory) {
        return nftInfo[listerAddress];
    }

    function getOfferDetails(
        address _buyer
    ) public view returns (OfferDetails memory) {
        return offererInfo[_buyer];
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
