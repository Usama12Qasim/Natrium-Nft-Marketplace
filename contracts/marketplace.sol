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
        string TicketType;
        string TokenUri;
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

    mapping(address => mapping(uint256 => NftDetails)) public nftInfo;
    mapping(address => mapping(uint256 => OfferDetails)) offererInfo;
    mapping(address => mapping(uint256 => uint256[])) priceHistory;
    mapping(address => mapping(uint256 => uint256[])) priceTimestamps;
    mapping(address => uint256) public trackOfferPrice;

    uint8 private serviceFees;

    event ListNFT(
        address seller,
        string CollectionURI,
        uint256 tokenID,
        string TicketType,
        string tokenUri,
        address hostContract,
        uint256 nftPrice,
        uint256 Expiration
    );

    event GetNft(
        address owner,
        address hostContract,
        uint256 tokenID,
        string tokenUri,
        string CollectionUri,
        string TicketType,
        uint256[] previousPrice,
        uint256 currentPrice,
        uint256 NftExpire,
        uint256[] timestamps
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
        address from,
        address to,
        uint256 acceptedPrice,
        uint256 tokenId,
        uint256 timeStamps
    );

    event RejectOffer(address buyer, uint256 offerPrice, bool isRejected);

    event ServiceFees(address admin, uint8 serviceFee);

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
    ) external nonReentrant{
        require(_NftExpiration > block.timestamp, "Time Error");

        _listNft(_tokenId, _price, _NftExpiration, _hostContract);
    }

    function _listNft(
        uint256 _tokenId,
        uint256 _price,
        uint256 _NftExpiration,
        address _hostContract
    ) internal {
        EventTicket hostContract = EventTicket(_hostContract);
        NftDetails storage info = nftInfo[_hostContract][_tokenId];

        require(
            hostContract.isCreated(_hostContract),
            "Ticketing Contract is not created by Factory Contract"
        );

        require(
            hostContract.ownerOf(_tokenId) == msg.sender,
            "You are not the owner of this Nft"
        );

        require(!info.isListed, "Nft is Already Listed");

        (string memory TicketType, , ) = EventTicket(hostContract).ticketInfo(
            _tokenId
        );
        string memory TokenUri = hostContract.tokenURI(_tokenId);

        info.hostContract = _hostContract;
        info.seller = msg.sender;
        info.nftPrice = _price;
        info.tokenID = _tokenId;
        info.isListed = true;
        info.Expiration = _NftExpiration;
        info.TokenUri = TokenUri;
        info.TicketType = TicketType;
        priceHistory[_hostContract][_tokenId].push(_price);
        priceTimestamps[_hostContract][_tokenId].push(block.timestamp);
        (, string memory CollectionUri, , , , ) = EventTicket(info.hostContract)
            .eventDetail();

        getNft(_tokenId, _hostContract);

        hostContract.safeTransferFrom(msg.sender, address(this), _tokenId);
        emit ListNFT(
            msg.sender,
            CollectionUri,
            _tokenId,
            TicketType,
            TokenUri,
            _hostContract,
            _price,
            _NftExpiration
        );
    }

    function getNft(
        uint256 tokenId,
        address hostContract
    )
        public
        returns (
            address,
            string memory,
            string memory,
            string memory,
            uint256[] memory previousPrices,
            uint256,
            uint256[] memory timestamps
        )
    {
        NftDetails memory info = nftInfo[hostContract][tokenId];

        (, string memory CollectionUri, , , , ) = EventTicket(info.hostContract)
            .eventDetail();
        //uint256 previousPrice = getPreviousPrice(tokenId);
        uint256 currentPrice = info.nftPrice;
        string memory TokenUri = info.TokenUri;
        string memory TicketType = info.TicketType;
        uint256 NftExpire = info.Expiration;
        address Seller = info.seller;
        previousPrices = priceHistory[hostContract][tokenId];
        timestamps = priceTimestamps[hostContract][tokenId];

        if (previousPrices.length > 0) {
            currentPrice = previousPrices[previousPrices.length - 1];
        } else {
            currentPrice = 0; // No price history available
        }

        emit GetNft(
            Seller,
            hostContract,
            tokenId,
            TokenUri,
            CollectionUri,
            TicketType,
            previousPrices,
            currentPrice,
            NftExpire,
            timestamps
        );

        return (
            Seller,
            TokenUri,
            CollectionUri,
            TicketType,
            previousPrices,
            currentPrice,
            timestamps
        );
    }

    function unListNft(uint256 _tokenId, address _hostContract) external nonReentrant{
        NftDetails memory info = nftInfo[_hostContract][_tokenId];
        EventTicket hostContract = EventTicket(_hostContract);

        require(
            info.seller == msg.sender,
            "Only Seller can unList his own Nft"
        );

        require(info.isListed, "Nft is not Listed");

        hostContract.safeTransferFrom(address(this), info.seller, _tokenId);

        emit UnListNFT(info.seller, _tokenId, info.hostContract, true);

        delete nftInfo[_hostContract][_tokenId];
    }

    function buyNft(uint256 _tokenId, address hostContract) external payable nonReentrant{
        NftDetails memory info = nftInfo[hostContract][_tokenId];
        uint256 NftPrice = info.nftPrice;
        address _hostContract = info.hostContract;

        require(info.seller != msg.sender, "Can't Self buy");
        require(msg.value == NftPrice && NftPrice != 0, "InSufficient Amount");
        require(block.timestamp < info.Expiration, "Nft Expired");
        require(info.isListed, "Nft is not Listed");

        _transferNftAndFee(
            _tokenId,
            msg.sender,
            _hostContract,
            NftPrice,
            info.seller
        );

        emit TransferNft(
            info.seller,
            msg.sender,
            _tokenId,
            NftPrice,
            block.timestamp
        );

        delete nftInfo[_hostContract][_tokenId];
    }

    function createOffer(
        uint256 _tokenId,
        address hostContract,
        uint256 _offerPrice,
        uint256 _offerExpiry
    ) external payable nonReentrant{
        OfferDetails storage details = offererInfo[msg.sender][_tokenId];
        NftDetails memory info = nftInfo[hostContract][_tokenId];

        require(info.seller != msg.sender, "Nft Owner Cannot create Offer");
        require(block.timestamp < info.Expiration, "Nft Expired");
        require(_offerExpiry > block.timestamp, "Time Error");
        require(msg.value == _offerPrice, "Invalid amount");
        //require(!details.offerPlaced, "Already Placed Offer");

        trackOfferPrice[msg.sender] += _offerPrice;

        details.buyer = msg.sender;
        details.offerPrice = _offerPrice;
        details.offerExpire = _offerExpiry;
        details.tokenID = _tokenId;
        details.offerPlaced = true;

        emit makeOffer(msg.sender, _offerPrice, _tokenId);
    }

    function acceptOffers(
        uint256 _tokenId,
        address _buyer,
        address hostContract
    ) external nonReentrant{
        NftDetails memory info = nftInfo[hostContract][_tokenId];
        OfferDetails memory details = offererInfo[_buyer][_tokenId];

        require(trackOfferPrice[_buyer] > 0, "No offer receive");
        require(info.seller == msg.sender, "Only Nft Owner accept the offer");
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

        emit acceptOffer(
            msg.sender,
            _buyer,
            offerPrice,
            _tokenId,
            block.timestamp
        );

        delete nftInfo[hostContract][_tokenId];
        delete offererInfo[_buyer][_tokenId];
    }

    function rejectOffer(
        uint256 _tokenId,
        address _buyer,
        address hostContract
    ) external nonReentrant {
        OfferDetails memory details = offererInfo[_buyer][_tokenId];
        NftDetails memory info = nftInfo[hostContract][_tokenId];

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

    function setServiceFees(uint8 _serviceFees) external onlyOwner {
        require(_serviceFees > 0, "Service Fees must be greater than zero");
        serviceFees = _serviceFees;

        emit ServiceFees(msg.sender, _serviceFees);
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
