//SPDX-License-Identifier:MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./Natrium.sol";
import "./Nft.sol";

contract NatirumMarketplace is
    NatriumInternalCalculations,
    ReentrancyGuardUpgradeable
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

    mapping(address => mapping(uint256 => NftDetails)) public nftInfo;
    mapping(address => OfferDetails) public offererInfo;

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
        __ReentrancyGuard_init();
        NatriumInternalCalculations.initialize();
    }

    function listNft(
        uint256 _tokenId,
        uint256 _price,
        address _hostContract
    ) external nonReentrant {
        MyToken hostContract = MyToken(_hostContract);
        NftDetails storage info = nftInfo[msg.sender][_tokenId];

        require(!info.isListed, "Already Listed");

        require(
            hostContract.ownerOf(_tokenId) == msg.sender,
            "You are not the owner of this Nft"
        );

        info.hostContract = _hostContract;
        info.seller = msg.sender;
        info.nftPrice = _price;
        info.tokenID = _tokenId;
        info.isListed = true;

        hostContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit ListNFT(
            msg.sender,
            info.tokenID,
            _hostContract,
            _price,
            info.isListed
        );
    }

    function unListNft(uint256 _tokenId) external nonReentrant {
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

        MyToken hostContract = MyToken(_hostContract);

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

    function buyNft(
        uint256 _tokenId,
        address _seller,
        address _hostContract
    ) external payable nonReentrant {
        //require(nftInfo[_seller][_tokenId].isListed, "Nft: Not Listed");
        require(
            nftInfo[_seller][_tokenId].tokenID == _tokenId,
            "Invalid Token ID"
        );
        require(nftInfo[_seller][_tokenId].seller == _seller, "InValid Seller");
        require(
            msg.value == nftInfo[_seller][_tokenId].nftPrice,
            "InSufficient Amount"
        );
        // require(
        //     msg.sender == nftInfo[_seller][_tokenId].seller ,
        //     "Can't Self buy"
        // );

        _transferNftAndFee(
            _tokenId,
            msg.sender,
            _hostContract,
            nftInfo[_seller][_tokenId].nftPrice,
            _seller
        );

        emit buyNFT(msg.sender, _tokenId, msg.value, block.timestamp);

        delete nftInfo[_seller][_tokenId];
    }
    function checkBalance(address user) public view returns(uint256)
    {
        return user.balance;
    }

    function createOffer(
        uint256 _tokenId,
        uint256 _offerPrice,
        uint256 _offerExpiry,
        address _seller
    ) external payable nonReentrant {
        NftDetails memory info = nftInfo[_seller][_tokenId];
        OfferDetails storage details = offererInfo[msg.sender];

        require(info.tokenID == _tokenId, "This token is not Listed");
        require(info.seller == _seller, "InValid Address");
        require(_offerExpiry > block.timestamp, "Time Error");
        require(msg.value == _offerPrice, "Invalid amount");

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
        NftDetails memory info = nftInfo[msg.sender][_tokenId];
        OfferDetails memory details = offererInfo[_buyer];

        require(info.seller == msg.sender, "Only Seller can accept the offer");
        require(details.offerPrice > 0, "Offer rejected");
        require(block.timestamp < details.offerExpire, "Offer Expired");
        require(details.tokenID == _tokenId, "This token has no offer");

        offererInfo[_buyer].currentOffer = Offer(1);

        _transferNftAndFee(
            _tokenId,
            _buyer,
            info.hostContract,
            details.offerPrice,
            msg.sender
        );

        emit acceptOffer(_buyer, details.offerPrice, _tokenId, true);

        delete nftInfo[msg.sender][_tokenId];
        delete offererInfo[_buyer];
    }

    function rejectOffer(
        uint256 _tokenId,
        address _buyer
    ) external nonReentrant {
        OfferDetails memory details = offererInfo[_buyer];
        NftDetails memory info = nftInfo[msg.sender][_tokenId];

        require(details.offerPrice > 0, "No Offer has received on this token");
        require(details.buyer == _buyer, "InValid Buyer Address");
        require(msg.sender == info.seller, "Only Seller can reject this offer");
        require(details.tokenID == _tokenId, "InValid token Id");

        offererInfo[_buyer].currentOffer = Offer(2);

        payable(details.buyer).transfer(details.offerPrice);

        delete offererInfo[_buyer];
    }

    function cancelOffer(uint256 _tokenId) external nonReentrant {
        OfferDetails memory details = offererInfo[msg.sender];
        require(details.tokenID == _tokenId, "This token has no offer");
        require(details.offerPrice > 0, "Error: Offer cannot Cancel");
        require(
            msg.sender == details.buyer,
            "Only Offer placed user cancel this offer"
        );

        payable(details.buyer).transfer(details.offerPrice);

        emit CancelOffer(msg.sender, details.offerPrice, true);

        delete offererInfo[msg.sender];
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
        MyToken hostContract = MyToken(_hostContract);

        _transferAmountToSeller(_price, serviceFees, _seller);

        hostContract.safeTransferFrom(address(this), _buyerAddress, _tokenId);
    }

    function getNftDetails(
        uint256 _tokenId
    ) public view returns (NftDetails memory) {
        return nftInfo[msg.sender][_tokenId];
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
