// //SPDX-License-Identifier:MIT
// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
// import "./Natrium.sol";
// import "./TicktingContract.sol";
// import "./EventDeployer.sol";

// contract NatirumMarketplace is
//     NatriumInternalCalculations,
//     ReentrancyGuardUpgradeable
// {
//     struct NftDetails {
//         address seller;
//         uint256 tokenID;
//         string TicketType;
//         string TokenUri;
//         address hostContract;
//         uint256 nftPrice;
//         uint256 Expiration;
//         bool isListed;
//     }

//     struct OfferDetails {
//         address buyer;
//         uint256 tokenID;
//         uint256 offerPrice;
//         uint256 offerExpire;
//         bool offerPlaced;
//     }

//     struct Nfts {
//         address Seller;
//         uint256[] tokenID;
//         string[] TicketType;
//         string[] TokenUri;
//         uint256[] nftPrice;
//         uint256[] Expiration;
//     }

//     struct transferNftsInfo {
//         address[] from;
//         address[] to;
//         uint256[] paidAmount;
//         uint256[] tokenID;
//         uint256[] timeStamp;
//     }

//     mapping(address => mapping(uint256 => NftDetails)) nftInfo;
//     mapping(address => mapping(uint256 => OfferDetails)) offererInfo;
//     mapping(address => mapping(uint256 => transferNftsInfo)) transferNfts;
//     mapping(address => mapping(uint256 => uint256[])) priceHistory;
//     mapping(address => mapping(uint256 => uint256[])) priceTimestamps;
//     mapping(address => uint256) public trackOfferPrice;
//     mapping(address => Nfts) nft;

//     uint8 private serviceFees;

//     event ListNFT(
//         address seller,
//         string CollectionURI,
//         uint256[] tokenID,
//         string[] TicketType,
//         string[] tokenUri,
//         address hostContract,
//         uint256[] nftPrice,
//         uint256[] Expiration
//     );

//     event GetNft(
//         address owner,
//         address hostContract,
//         uint256 tokenID,
//         string tokenUri,
//         string CollectionUri,
//         string TicketType,
//         uint256[] previousPrice,
//         uint256 currentPrice,
//         uint256 NftExpire,
//         uint256[] timestamps
//     );

//     event UnListNFT(
//         address seller,
//         uint256 tokenID,
//         address hostContract,
//         bool isUnlisted
//     );
//     event TransferNft(
//         address[] from,
//         address[] to,
//         uint256[] tokenID,
//         uint256[] paidPrice,
//         uint256[] timeStamp
//     );
//     event makeOffer(address buyer, uint256 offerPrice, uint256 tokenId);

//     event acceptOffer(
//         address[] from,
//         address[] to,
//         uint256[] acceptedPrice,
//         uint256[] tokenId,
//         uint256[] timeStamps
//     );

//     event RejectOffer(address buyer, uint256 offerPrice, bool isRejected);

//     event ServiceFees(address admin, uint8 serviceFee);

//     event withdraw(address buyer, uint256 amount, uint256 timeStamp);

//     function initialize() public override initializer {
//         __Ownable_init(msg.sender);
//         NatriumInternalCalculations.initialize();
//         ReentrancyGuardUpgradeable.__ReentrancyGuard_init();
//     }

//     function listNft(
//         uint256 _tokenId,
//         uint256 _price,
//         uint256 _NftExpiration,
//         address _hostContract
//     ) external {
//         require(_NftExpiration > block.timestamp, "Time Error");

//         _listNft(_tokenId, _price, _NftExpiration, _hostContract);
//     }

//     function unListNft(uint256 _tokenId, address hostContract) external {
//         NftDetails memory info = nftInfo[hostContract][_tokenId];

//         require(
//             info.seller == msg.sender,
//             "Only Seller can unList his own Nft"
//         );

//         _unListNft(_tokenId, hostContract);

//         delete nftInfo[hostContract][_tokenId];
//         Nfts storage NFTS = nft[hostContract];
//         uint256 indexToRemove = _findIndex(_tokenId, NFTS);
//         _removeNftFromStruct(NFTS, indexToRemove);
//     }

//     function _unListNft(uint256 _tokenId, address _hostContract) internal {
//         NftDetails memory info = nftInfo[_hostContract][_tokenId];

//         EventTicket hostContract = EventTicket(_hostContract);

//         hostContract.safeTransferFrom(address(this), info.seller, _tokenId);

//         emit UnListNFT(info.seller, _tokenId, info.hostContract, true);
//     }

//     function buyNft(uint256 _tokenId, address hostContract) external payable {
//         NftDetails memory info = nftInfo[hostContract][_tokenId];
//         uint256 NftPrice = info.nftPrice;
//         address _hostContract = info.hostContract;

//         require(info.seller != msg.sender, "Can't Self buy");
//         require(msg.value == NftPrice && NftPrice != 0, "InSufficient Amount");
//         require(block.timestamp < info.Expiration, "Nft Expired");

//         (
//             address[] memory seller,
//             address[] memory buyer,
//             uint256[] memory tokenId,
//             uint256[] memory payAmount,
//             uint256[] memory purchaseTime
//         ) = _handleArrayValues(
//                 info.seller,
//                 msg.sender,
//                 _tokenId,
//                 NftPrice,
//                 block.timestamp,
//                 hostContract
//             );

//         _transferNftAndFee(
//             _tokenId,
//             msg.sender,
//             _hostContract,
//             NftPrice,
//             info.seller
//         );

//         emit TransferNft(seller, buyer, tokenId, payAmount, purchaseTime);

//         Nfts storage NFTS = nft[_hostContract];
//         uint256 indexToRemove = _findIndex(_tokenId, NFTS);
//         _removeNftFromStruct(NFTS, indexToRemove);

//         delete nftInfo[hostContract][_tokenId];
//     }

//     function _handleArrayValues(
//         address from,
//         address to,
//         uint256 tokenID,
//         uint256 paidAmount,
//         uint256 timeStamp,
//         address hostContract
//     )
//         internal
//         returns (
//             address[] memory,
//             address[] memory,
//             uint256[] memory,
//             uint256[] memory,
//             uint256[] memory
//         )
//     {
//         transferNftsInfo storage NftsInfo = transferNfts[hostContract][tokenID];
//         NftsInfo.from.push(from);
//         NftsInfo.to.push(to);
//         NftsInfo.tokenID.push(tokenID);
//         NftsInfo.paidAmount.push(paidAmount);
//         NftsInfo.timeStamp.push(timeStamp);

//         return (
//             NftsInfo.from,
//             NftsInfo.to,
//             NftsInfo.tokenID,
//             NftsInfo.paidAmount,
//             NftsInfo.timeStamp
//         );
//     }

//     function createOffer(
//         uint256 _tokenId,
//         address hostContract,
//         uint256 _offerPrice,
//         uint256 _offerExpiry
//     ) external payable {
//         OfferDetails storage details = offererInfo[msg.sender][_tokenId];
//         NftDetails memory info = nftInfo[hostContract][_tokenId];

//         require(info.seller != msg.sender, "Token Owner Cannot create Offer");
//         require(block.timestamp < info.Expiration, "Nft Expired");
//         require(_offerExpiry > block.timestamp, "Time Error");
//         require(msg.value == _offerPrice, "Invalid amount");
//         require(!details.offerPlaced, "Already Placed Offer");

//         trackOfferPrice[msg.sender] = msg.value;

//         details.buyer = msg.sender;
//         details.offerPrice = _offerPrice;
//         details.offerExpire = _offerExpiry;
//         details.tokenID = _tokenId;
//         details.offerPlaced = true;

//         emit makeOffer(msg.sender, _offerPrice, _tokenId);
//     }

//     function acceptOffers(
//         uint256 _tokenId,
//         address _buyer,
//         address hostContract
//     ) external {
//         NftDetails memory info = nftInfo[hostContract][_tokenId];
//         OfferDetails memory details = offererInfo[_buyer][_tokenId];

//         require(trackOfferPrice[_buyer] > 0, "Doesn't receive offer");
//         require(info.seller == msg.sender, "Only Seller can accept the offer");
//         require(details.offerPlaced, "This token has no offer");
//         require(block.timestamp < details.offerExpire, "Offer Expired");

//         uint256 offerPrice = trackOfferPrice[_buyer];
//         trackOfferPrice[_buyer] = 0;

//         (
//             address[] memory seller,
//             address[] memory buyer,
//             uint256[] memory tokenId,
//             uint256[] memory payAmount,
//             uint256[] memory purchaseTime
//         ) = _handleArrayValues(
//                 msg.sender,
//                 _buyer,
//                 _tokenId,
//                 offerPrice,
//                 block.timestamp,
//                 hostContract
//             );

//         _transferNftAndFee(
//             _tokenId,
//             _buyer,
//             info.hostContract,
//             offerPrice,
//             msg.sender
//         );

//         emit acceptOffer(seller, buyer, payAmount, tokenId, purchaseTime);

//         delete nftInfo[hostContract][_tokenId];
//         delete offererInfo[_buyer][_tokenId];
//         Nfts storage NFTS = nft[hostContract];
//         uint256 indexToRemove = _findIndex(_tokenId, NFTS);
//         _removeNftFromStruct(NFTS, indexToRemove);
//     }

//     function rejectOffer(
//         uint256 _tokenId,
//         address _buyer,
//         address hostContract
//     ) external nonReentrant {
//         OfferDetails memory details = offererInfo[_buyer][_tokenId];
//         NftDetails memory info = nftInfo[hostContract][_tokenId];

//         require(details.tokenID == _tokenId, "Invalid token Id");
//         require(
//             trackOfferPrice[_buyer] > 0,
//             "No Offer has received on this token"
//         );
//         require(details.buyer == _buyer, "InValid Buyer Address");
//         require(msg.sender == info.seller, "Only Seller can reject this offer");

//         uint256 offerPrice = trackOfferPrice[_buyer];
//         trackOfferPrice[_buyer] = 0;

//         payable(details.buyer).transfer(offerPrice);

//         emit RejectOffer(_buyer, offerPrice, true);

//         delete offererInfo[_buyer][_tokenId];
//     }

//     function withDraw(uint256 _tokenId) external nonReentrant {
//         OfferDetails memory details = offererInfo[msg.sender][_tokenId];

//         require(
//             details.buyer == msg.sender,
//             "Only buyer withdraw his own amount"
//         );
//         require(trackOfferPrice[msg.sender] > 0, "Already With-Draw Amount");

//         uint256 offerPrice = trackOfferPrice[msg.sender];
//         trackOfferPrice[msg.sender] = 0;

//         payable(msg.sender).transfer(offerPrice);

//         emit withdraw(msg.sender, offerPrice, block.timestamp);
//     }

//     function setServiceFees(uint8 _serviceFees) external onlyOwner {
//         require(_serviceFees > 0, "Service Fees must be greater than zero");
//         serviceFees = _serviceFees;

//         emit ServiceFees(msg.sender, _serviceFees);
//     }

//     function _transferNftAndFee(
//         uint256 _tokenId,
//         address _buyerAddress,
//         address _hostContract,
//         uint256 _price,
//         address _seller
//     ) internal {
//         EventTicket hostContract = EventTicket(_hostContract);

//         _transferAmountToSeller(_price, serviceFees, _seller);

//         hostContract.safeTransferFrom(address(this), _buyerAddress, _tokenId);
//     }

//     function _listNft(
//         uint256 _tokenId,
//         uint256 _price,
//         uint256 _NftExpiration,
//         address _hostContract
//     ) internal {
//         EventTicket hostContract = EventTicket(_hostContract);
//         NftDetails storage info = nftInfo[_hostContract][_tokenId];
//         Nfts storage NFTS = nft[_hostContract];

//         require(
//             hostContract.ownerOf(_tokenId) == msg.sender,
//             "You are not the owner of this Nft"
//         );

//         (string memory TicketType, , ) = EventTicket(hostContract).ticketInfo(
//             _tokenId
//         );
//         string memory TokenUri = hostContract.tokenURI(_tokenId);

//         info.hostContract = _hostContract;
//         info.seller = msg.sender;
//         info.nftPrice = _price;
//         info.tokenID = _tokenId;
//         info.isListed = true;
//         info.Expiration = _NftExpiration;
//         info.TokenUri = TokenUri;
//         info.TicketType = TicketType;
//         priceHistory[_hostContract][_tokenId].push(_price);
//         priceTimestamps[_hostContract][_tokenId].push(block.timestamp);
//         (, string memory CollectionUri, , , , ) = EventTicket(info.hostContract)
//             .eventDetail();

//         NFTS.tokenID.push(_tokenId);
//         NFTS.TokenUri.push(TokenUri);
//         NFTS.TicketType.push(TicketType);
//         NFTS.nftPrice.push(_price);
//         NFTS.Expiration.push(_NftExpiration);
//         NFTS.Seller = msg.sender;

//         getNft(_tokenId, _hostContract);

//         hostContract.safeTransferFrom(msg.sender, address(this), _tokenId);
//         emit ListNFT(
//             NFTS.Seller,
//             CollectionUri,
//             NFTS.tokenID,
//             NFTS.TicketType,
//             NFTS.TokenUri,
//             _hostContract,
//             NFTS.nftPrice,
//             NFTS.Expiration
//         );
//     }

//     function _findIndex(
//         uint256 tokenID,
//         Nfts storage nftData
//     ) internal view returns (uint256) {
//         for (uint256 i = 0; i < nftData.tokenID.length; i++) {
//             if (nftData.tokenID[i] == tokenID) {
//                 return i; // Return the index if found
//             }
//         }
//         revert("Token ID not found in struct");
//     }

//     function _removeNftFromStruct(
//         Nfts storage nftData,
//         uint256 indexToRemove
//     ) internal {
//         uint256 lastIndex = nftData.tokenID.length - 1;

//         if (indexToRemove != lastIndex) {
//             // Swap the last element with the element to be removed
//             nftData.tokenID[indexToRemove] = nftData.tokenID[lastIndex];
//             nftData.TicketType[indexToRemove] = nftData.TicketType[lastIndex];
//             nftData.TokenUri[indexToRemove] = nftData.TokenUri[lastIndex];
//             nftData.nftPrice[indexToRemove] = nftData.nftPrice[lastIndex];
//             nftData.Expiration[indexToRemove] = nftData.Expiration[lastIndex];
//         }

//         // Remove the last element
//         nftData.tokenID.pop();
//         nftData.TicketType.pop();
//         nftData.TokenUri.pop();
//         nftData.nftPrice.pop();
//         nftData.Expiration.pop();
//     }

//     function getNft(
//         uint256 tokenId,
//         address hostContract
//     )
//         internal
//         returns (
//             address,
//             string memory,
//             string memory,
//             string memory,
//             uint256[] memory previousPrices,
//             uint256,
//             uint256[] memory timestamps
//         )
//     {
//         NftDetails memory info = nftInfo[hostContract][tokenId];

//         (, string memory CollectionUri, , , , ) = EventTicket(info.hostContract)
//             .eventDetail();
//         //uint256 previousPrice = getPreviousPrice(tokenId);
//         uint256 currentPrice = info.nftPrice;
//         string memory TokenUri = info.TokenUri;
//         string memory TicketType = info.TicketType;
//         uint256 NftExpire = info.Expiration;
//         address Seller = info.seller;
//         previousPrices = priceHistory[hostContract][tokenId];
//         timestamps = priceTimestamps[hostContract][tokenId];

//         if (previousPrices.length > 0) {
//             currentPrice = previousPrices[previousPrices.length - 1];
//         } else {
//             currentPrice = 0; // No price history available
//         }

//         emit GetNft(
//             Seller,
//             hostContract,
//             tokenId,
//             TokenUri,
//             CollectionUri,
//             TicketType,
//             previousPrices,
//             currentPrice,
//             NftExpire,
//             timestamps
//         );

//         return (
//             Seller,
//             TokenUri,
//             CollectionUri,
//             TicketType,
//             previousPrices,
//             currentPrice,
//             timestamps
//         );
//     }

//     function getOfferDetails(
//         uint256 _tokenId
//     ) public view returns (OfferDetails memory) {
//         return offererInfo[msg.sender][_tokenId];
//     }

//     function onERC721Received(
//         address,
//         address,
//         uint256,
//         bytes memory
//     ) public virtual returns (bytes4) {
//         return this.onERC721Received.selector;
//     }
// }
