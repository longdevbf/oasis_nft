// contracts/interfaces/IMarketplace.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMarketplace {
    struct MarketItem {
        uint256 itemId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        uint256 createdAt;
    }

    struct AuctionItem {
        uint256 auctionId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 startingPrice;
        uint256 highestBid;
        address payable highestBidder;
        uint256 auctionEndTime;
        bool ended;
        bool isBlindAuction;
        mapping(address => bytes32[]) blindedBids;
        mapping(address => uint256) pendingReturns;
    }

    event MarketItemCreated(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price
    );

    event MarketItemSold(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );

}
