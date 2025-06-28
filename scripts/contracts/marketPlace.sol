// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarket is ReentrancyGuard, Ownable {
    
    // ✅ Struct để lưu thông tin listing
    struct Listing {
        uint256 tokenId;        // ID của NFT
        address nftContract;    // Địa chỉ contract NFT
        address seller;         // Người bán
        uint256 price;          // Giá bán (wei)
        bool isActive;          // Còn đang bán không
        uint256 createdAt;      // Thời gian tạo listing
    }

    // ✅ State variables
    uint256 private _listingIdCounter;              // Đếm số listing
    uint256 public marketplaceFee = 250;            // Phí marketplace (2.5% = 250/10000)
    uint256 public constant MAX_FEE = 1000;         // Phí tối đa 10%
    
    // ✅ Mappings để lưu data
    mapping(uint256 => Listing) public listings;                           // listingId => Listing
    mapping(address => mapping(uint256 => uint256)) public tokenToListingId; // contract => tokenId => listingId
    mapping(address => uint256[]) public sellerListings;                   // seller => array listingIds
    
    // ✅ Events để frontend có thể lắng nghe
    event NFTListed(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    
    event NFTSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller
    );
    
    event PriceUpdated(
        uint256 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice
    );

    // ✅ Constructor
    constructor(address initialOwner) Ownable(initialOwner) {
        _listingIdCounter = 1; // Bắt đầu từ 1 thay vì 0
    }

    // ✅ LIST NFT FOR SALE
    function listNFT(
        address nftContract,    // Địa chỉ contract NFT
        uint256 tokenId,        // ID của NFT
        uint256 price           // Giá bán (trong wei)
    ) external nonReentrant {
        // Kiểm tra các điều kiện
        require(price > 0, "Price must be greater than 0");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "You don't own this NFT");
        require(tokenToListingId[nftContract][tokenId] == 0, "NFT already listed");
        
        // Kiểm tra marketplace đã được approve chưa
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) || 
            IERC721(nftContract).getApproved(tokenId) == address(this), 
            "Marketplace not approved to transfer this NFT"
        );
        
        // Tạo listing mới
        uint256 listingId = _listingIdCounter++;
        
        listings[listingId] = Listing({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            price: price,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // Lưu mapping để tìm kiếm nhanh
        tokenToListingId[nftContract][tokenId] = listingId;
        sellerListings[msg.sender].push(listingId);
        
        // Emit event
        emit NFTListed(listingId, nftContract, tokenId, msg.sender, price);
    }

    // ✅ BUY NFT
    function buyNFT(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        
        // Kiểm tra các điều kiện
        require(listing.isActive, "This listing is not active");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");
        
        // Kiểm tra NFT vẫn thuộc về seller
        require(
            IERC721(listing.nftContract).ownerOf(listing.tokenId) == listing.seller,
            "Seller no longer owns this NFT"
        );
        
        // Đánh dấu listing không còn active
        listing.isActive = false;
        
        // Tính toán phí và số tiền seller nhận được
        uint256 feeAmount = (listing.price * marketplaceFee) / 10000;  // Tính phí marketplace
        uint256 sellerAmount = listing.price - feeAmount;              // Số tiền seller nhận
        
        // Transfer NFT từ seller đến buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        // Transfer tiền cho seller
        payable(listing.seller).transfer(sellerAmount);
        
        // Transfer phí cho marketplace owner (nếu có)
        if (feeAmount > 0) {
            payable(owner()).transfer(feeAmount);
        }
        
        // Hoàn trả tiền thừa cho buyer (nếu có)
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        // Xóa mapping
        delete tokenToListingId[listing.nftContract][listing.tokenId];
        
        // Emit event
        emit NFTSold(listingId, listing.seller, msg.sender, listing.price);
    }

    // ✅ CANCEL LISTING
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        // Chỉ seller hoặc owner marketplace mới có thể cancel
        require(
            msg.sender == listing.seller || msg.sender == owner(),
            "Not authorized to cancel this listing"
        );
        require(listing.isActive, "Listing already inactive");
        
        // Đánh dấu không active
        listing.isActive = false;
        
        // Xóa mapping
        delete tokenToListingId[listing.nftContract][listing.tokenId];
        
        // Emit event
        emit ListingCancelled(listingId, listing.seller);
    }

    // ✅ UPDATE PRICE
    function updatePrice(uint256 listingId, uint256 newPrice) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(msg.sender == listing.seller, "Only seller can update price");
        require(listing.isActive, "Listing not active");
        require(newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        
        emit PriceUpdated(listingId, oldPrice, newPrice);
    }

    // ✅ VIEW FUNCTIONS

    // Lấy thông tin một listing
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
    
    // Lấy tất cả listing đang active
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Đếm số listing active
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeCount++;
            }
        }
        
        // Tạo array với size chính xác
        uint256[] memory activeListingIds = new uint256[](activeCount);
        uint256 index = 0;
        
        // Fill array với các listing active
        for (uint256 i = 1; i < _listingIdCounter; i++) {
            if (listings[i].isActive) {
                activeListingIds[index] = i;
                index++;
            }
        }
        
        return activeListingIds;
    }
    
    // Lấy listing của một seller
    function getSellerListings(address seller) external view returns (uint256[] memory) {
        return sellerListings[seller];
    }
    
    // Kiểm tra NFT có đang được list không
    function isTokenListed(address nftContract, uint256 tokenId) external view returns (bool, uint256) {
        uint256 listingId = tokenToListingId[nftContract][tokenId];
        if (listingId == 0) {
            return (false, 0);
        }
        return (listings[listingId].isActive, listingId);
    }
    
    // Lấy listing theo NFT contract và tokenId
    function getListingByToken(address nftContract, uint256 tokenId) external view returns (Listing memory) {
        uint256 listingId = tokenToListingId[nftContract][tokenId];
        require(listingId != 0, "Token not listed");
        return listings[listingId];
    }
    
    // Lấy tổng số listing đã tạo
    function getTotalListings() external view returns (uint256) {
        return _listingIdCounter - 1;
    }

    // ✅ ADMIN FUNCTIONS
    
    // Cập nhật phí marketplace (chỉ owner)
    function setMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee cannot exceed maximum");
        uint256 oldFee = marketplaceFee;
        marketplaceFee = newFee;
        
        // Có thể emit event nếu cần
        // emit MarketplaceFeeUpdated(oldFee, newFee);
    }
    
    // Rút tiền phí đã thu (chỉ owner)
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // Lấy số dư phí hiện tại
    function getFeesBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ✅ EMERGENCY FUNCTIONS
    
    // Emergency pause (nếu cần)
    bool public paused = false;
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    
}