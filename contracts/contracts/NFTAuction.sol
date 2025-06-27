// contracts/marketplace/NFTAuction.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTAuction is ReentrancyGuard, Pausable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _auctionIds;

    struct BlindAuction {
        uint256 auctionId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 startingPrice;
        uint256 highestBid;
        address payable highestBidder;
        uint256 biddingEnd;
        uint256 revealEnd;
        bool ended;
        mapping(address => bytes32[]) blindedBids;
        mapping(address => uint256) pendingReturns;
    }

    struct PublicAuction {
        uint256 auctionId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 startingPrice;
        uint256 highestBid;
        address payable highestBidder;
        uint256 auctionEnd;
        bool ended;
        mapping(address => uint256) pendingReturns;
    }

    mapping(uint256 => BlindAuction) public blindAuctions;
    mapping(uint256 => PublicAuction) public publicAuctions;
    mapping(uint256 => bool) public isBlindAuction;

    uint256 public auctionFee = 250; // 2.5%
    uint256 public constant PERCENTAGE_TOTAL = 10000;

    event BlindAuctionCreated(
        uint256 indexed auctionId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 startingPrice,
        uint256 biddingEnd,
        uint256 revealEnd
    );

    event PublicAuctionCreated(
        uint256 indexed auctionId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 startingPrice,
        uint256 auctionEnd
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event BlindBidPlaced(
        uint256 indexed auctionId,
        address indexed bidder
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address winner,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {}

    // Tạo đấu giá kín
    function createBlindAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 biddingTime,
        uint256 revealTime
    ) public nonReentrant whenNotPaused {
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "You don't own this NFT"
        );
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Auction not approved"
        );

        _auctionIds.increment();
        uint256 auctionId = _auctionIds.current();

        BlindAuction storage auction = blindAuctions[auctionId];
        auction.auctionId = auctionId;
        auction.nftContract = nftContract;
        auction.tokenId = tokenId;
        auction.seller = payable(msg.sender);
        auction.startingPrice = startingPrice;
        auction.biddingEnd = block.timestamp + biddingTime;
        auction.revealEnd = auction.biddingEnd + revealTime;
        auction.ended = false;

        isBlindAuction[auctionId] = true;

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        emit BlindAuctionCreated(
            auctionId,
            nftContract,
            tokenId,
            msg.sender,
            startingPrice,
            auction.biddingEnd,
            auction.revealEnd
        );
    }

    // Tạo đấu giá công khai
    function createPublicAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 auctionTime
    ) public nonReentrant whenNotPaused {
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "You don't own this NFT"
        );
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Auction not approved"
        );

        _auctionIds.increment();
        uint256 auctionId = _auctionIds.current();

        PublicAuction storage auction = publicAuctions[auctionId];
        auction.auctionId = auctionId;
        auction.nftContract = nftContract;
        auction.tokenId = tokenId;
        auction.seller = payable(msg.sender);
        auction.startingPrice = startingPrice;
        auction.auctionEnd = block.timestamp + auctionTime;
        auction.ended = false;

        isBlindAuction[auctionId] = false;

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        emit PublicAuctionCreated(
            auctionId,
            nftContract,
            tokenId,
            msg.sender,
            startingPrice,
            auction.auctionEnd
        );
    }

    // Đặt cược kín (blind bid)
    function blindBid(uint256 auctionId, bytes32 blindedBid) 
        public payable nonReentrant {
        require(isBlindAuction[auctionId], "Not a blind auction");
        require(block.timestamp <= blindAuctions[auctionId].biddingEnd, "Bidding period ended");
        
        blindAuctions[auctionId].blindedBids[msg.sender].push(blindedBid);
        
        emit BlindBidPlaced(auctionId, msg.sender);
    }

    // Đặt cược công khai
    function bid(uint256 auctionId) public payable nonReentrant {
        require(!isBlindAuction[auctionId], "This is a blind auction");
        PublicAuction storage auction = publicAuctions[auctionId];
        
        require(block.timestamp <= auction.auctionEnd, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");
        require(msg.value >= auction.startingPrice, "Bid below starting price");

        if (auction.highestBid != 0) {
            auction.pendingReturns[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBidder = payable(msg.sender);
        auction.highestBid = msg.value;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    // Tiết lộ cược kín
    function reveal(
        uint256 auctionId,
        uint256[] memory values,
        bool[] memory fake,
        bytes32[] memory secret
    ) public nonReentrant {
        require(isBlindAuction[auctionId], "Not a blind auction");
        BlindAuction storage auction = blindAuctions[auctionId];
        
        require(block.timestamp > auction.biddingEnd, "Bidding not ended");
        require(block.timestamp <= auction.revealEnd, "Reveal period ended");

        uint256 length = auction.blindedBids[msg.sender].length;
        require(values.length == length, "Invalid values length");
        require(fake.length == length, "Invalid fake length");
        require(secret.length == length, "Invalid secret length");

        uint256 refund = 0;
        for (uint256 i = 0; i < length; i++) {
            bytes32 blindedBid = auction.blindedBids[msg.sender][i];
            if (blindedBid == keccak256(abi.encodePacked(values[i], fake[i], secret[i]))) {
                refund += values[i];
                if (!fake[i] && values[i] >= auction.startingPrice && values[i] > auction.highestBid) {
                    if (auction.highestBidder != address(0)) {
                        auction.pendingReturns[auction.highestBidder] += auction.highestBid;
                    }
                    auction.highestBidder = payable(msg.sender);
                    auction.highestBid = values[i];
                    refund -= values[i];
                }
            }
        }

        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }

    // Kết thúc đấu giá
    function endAuction(uint256 auctionId) public nonReentrant {
        if (isBlindAuction[auctionId]) {
            BlindAuction storage auction = blindAuctions[auctionId];
            require(block.timestamp >= auction.revealEnd, "Reveal period not ended");
            require(!auction.ended, "Auction already ended");

            auction.ended = true;

            if (auction.highestBidder != address(0)) {
                uint256 feeAmount = (auction.highestBid * auctionFee) / PERCENTAGE_TOTAL;
                uint256 sellerAmount = auction.highestBid - feeAmount;

                auction.seller.transfer(sellerAmount);
                payable(owner()).transfer(feeAmount);

                IERC721(auction.nftContract).transferFrom(
                    address(this),
                    auction.highestBidder,
                    auction.tokenId
                );
            } else {
                IERC721(auction.nftContract).transferFrom(
                    address(this),
                    auction.seller,
                    auction.tokenId
                );
            }

            emit AuctionEnded(auctionId, auction.highestBidder, auction.highestBid);
        } else {
            PublicAuction storage auction = publicAuctions[auctionId];
            require(block.timestamp >= auction.auctionEnd, "Auction not ended");
            require(!auction.ended, "Auction already ended");

            auction.ended = true;

            if (auction.highestBidder != address(0)) {
                uint256 feeAmount = (auction.highestBid * auctionFee) / PERCENTAGE_TOTAL;
                uint256 sellerAmount = auction.highestBid - feeAmount;

                auction.seller.transfer(sellerAmount);
                payable(owner()).transfer(feeAmount);

                IERC721(auction.nftContract).transferFrom(
                    address(this),
                    auction.highestBidder,
                    auction.tokenId
                );
            } else {
                IERC721(auction.nftContract).transferFrom(
                    address(this),
                    auction.seller,
                    auction.tokenId
                );
            }

            emit AuctionEnded(auctionId, auction.highestBidder, auction.highestBid);
        }
    }

    // Rút tiền
    function withdraw(uint256 auctionId) public nonReentrant {
        uint256 amount;
        
        if (isBlindAuction[auctionId]) {
            amount = blindAuctions[auctionId].pendingReturns[msg.sender];
            blindAuctions[auctionId].pendingReturns[msg.sender] = 0;
        } else {
            amount = publicAuctions[auctionId].pendingReturns[msg.sender];
            publicAuctions[auctionId].pendingReturns[msg.sender] = 0;
        }

        require(amount > 0, "No funds to withdraw");
        payable(msg.sender).transfer(amount);
    }

    function updateAuctionFee(uint256 _auctionFee) public onlyOwner {
        require(_auctionFee <= 1000, "Fee cannot exceed 10%");
        auctionFee = _auctionFee;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}