// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IMarketplace.sol";

contract NFTMarketplace is IMarketplace, ReentrancyGuard, Pausable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;

    uint256 public marketplaceFee = 250; // 2.5% fee
    uint256 public constant PERCENTAGE_TOTAL = 10000;
    
    mapping(uint256 => MarketItem) private idToMarketItem;
    mapping(address => mapping(uint256 => uint256)) private nftToItemId;
    
    event MarketplaceFeeUpdated(uint256 newFee);
    event ItemPriceUpdated(uint256 indexed itemId, uint256 newPrice);
    event ItemRemoved(uint256 indexed itemId);

    constructor() Ownable() {}

    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) public payable nonReentrant whenNotPaused {
        require(price > 0, "Price must be greater than 0");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "You don't own this NFT"
        );
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        _itemIds.increment();
        uint256 itemId = _itemIds.current();

        idToMarketItem[itemId] = MarketItem(
            itemId,
            nftContract,
            tokenId,
            payable(msg.sender),
            payable(address(0)),
            price,
            false,
            block.timestamp
        );

        nftToItemId[nftContract][tokenId] = itemId;

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        emit MarketItemCreated(
            itemId,
            nftContract,
            tokenId,
            msg.sender,
            address(0),
            price
        );
    }

    function createMarketSale(uint256 itemId) 
        public payable nonReentrant whenNotPaused {
        uint256 price = idToMarketItem[itemId].price;
        uint256 tokenId = idToMarketItem[itemId].tokenId;
        address nftContract = idToMarketItem[itemId].nftContract;
        address seller = idToMarketItem[itemId].seller;
        
        require(msg.value == price, "Incorrect price");
        require(!idToMarketItem[itemId].sold, "Item already sold");
        require(seller != msg.sender, "Cannot buy your own item");

        uint256 marketplaceFeeAmount = (price * marketplaceFee) / PERCENTAGE_TOTAL;
        uint256 sellerAmount = price - marketplaceFeeAmount;

        idToMarketItem[itemId].owner = payable(msg.sender);
        idToMarketItem[itemId].sold = true;
        _itemsSold.increment();

        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        payable(seller).transfer(sellerAmount);
        payable(owner()).transfer(marketplaceFeeAmount);

        delete nftToItemId[nftContract][tokenId];

        emit MarketItemSold(
            itemId,
            nftContract,
            tokenId,
            seller,
            msg.sender,
            price
        );
    }

    function updateItemPrice(uint256 itemId, uint256 newPrice) 
        public nonReentrant {
        require(newPrice > 0, "Price must be greater than 0");
        require(
            idToMarketItem[itemId].seller == msg.sender,
            "Only seller can update price"
        );
        require(!idToMarketItem[itemId].sold, "Item already sold");

        idToMarketItem[itemId].price = newPrice;
        
        emit ItemPriceUpdated(itemId, newPrice);
    }

    function removeMarketItem(uint256 itemId) public nonReentrant {
        require(
            idToMarketItem[itemId].seller == msg.sender,
            "Only seller can remove item"
        );
        require(!idToMarketItem[itemId].sold, "Item already sold");

        address nftContract = idToMarketItem[itemId].nftContract;
        uint256 tokenId = idToMarketItem[itemId].tokenId;

        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        delete nftToItemId[nftContract][tokenId];
        delete idToMarketItem[itemId];

        emit ItemRemoved(itemId);
    }

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 unsoldItemCount = _itemIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;

        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            if (idToMarketItem[i + 1].owner == address(0) && !idToMarketItem[i + 1].sold) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _itemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _itemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender && !idToMarketItem[i + 1].sold) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender && !idToMarketItem[i + 1].sold) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function getMarketItem(uint256 itemId) public view returns (MarketItem memory) {
        return idToMarketItem[itemId];
    }

    function updateMarketplaceFee(uint256 _marketplaceFee) public onlyOwner {
        require(_marketplaceFee <= 1000, "Fee cannot exceed 10%");
        marketplaceFee = _marketplaceFee;
        emit MarketplaceFeeUpdated(_marketplaceFee);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function withdrawFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
}