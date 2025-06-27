// contracts/tokens/DynamicNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DynamicNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    struct NFTMetadata {
        string name;
        string description;
        string imageURI;
        string animationURI; // Cho video/animation
        string externalURL;
        uint256 createdAt;
        uint256 lastUpdated;
        bool isDynamic;
        mapping(string => string) attributes;
        string[] attributeKeys;
    }
    
    mapping(uint256 => NFTMetadata) private _tokenMetadata;
    mapping(uint256 => address) private _tokenCreators;
    mapping(address => bool) private _authorizedUpdaters;
    
    // Events
    event NFTCreated(
        uint256 indexed tokenId, 
        address indexed creator, 
        string metadataURI,
        bool isDynamic
    );
    
    event NFTUpdated(
        uint256 indexed tokenId, 
        address indexed updater, 
        string newMetadataURI
    );
    
    event AttributeUpdated(
        uint256 indexed tokenId,
        string attributeName,
        string newValue
    );

    constructor() ERC721("Dynamic NFT Marketplace", "DNFT") Ownable(msg.sender) {}

    function createNFT(
        address to,
        string memory metadataURI,
        string memory name,
        string memory description,
        string memory imageURI,
        string memory animationURI,
        bool isDynamic
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);
        
        _tokenCreators[newTokenId] = msg.sender;
        
        NFTMetadata storage metadata = _tokenMetadata[newTokenId];
        metadata.name = name;
        metadata.description = description;
        metadata.imageURI = imageURI;
        metadata.animationURI = animationURI;
        metadata.createdAt = block.timestamp;
        metadata.lastUpdated = block.timestamp;
        metadata.isDynamic = isDynamic;
        
        emit NFTCreated(newTokenId, msg.sender, metadataURI, isDynamic);
        
        return newTokenId;
    }

    function updateNFTMetadata(
        uint256 tokenId,
        string memory newMetadataURI,
        string memory newImageURI,
        string memory newAnimationURI,
        string memory newDescription
    ) public {
        require(_exists(tokenId), "Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender || 
            _tokenCreators[tokenId] == msg.sender || 
            _authorizedUpdaters[msg.sender],
            "Not authorized to update"
        );
        require(_tokenMetadata[tokenId].isDynamic, "NFT is not dynamic");
        
        _setTokenURI(tokenId, newMetadataURI);
        
        NFTMetadata storage metadata = _tokenMetadata[tokenId];
        metadata.imageURI = newImageURI;
        metadata.animationURI = newAnimationURI;
        metadata.description = newDescription;
        metadata.lastUpdated = block.timestamp;
        
        emit NFTUpdated(tokenId, msg.sender, newMetadataURI);
    }

    function updateAttribute(
        uint256 tokenId,
        string memory attributeName,
        string memory attributeValue
    ) public {
        require(_exists(tokenId), "Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender || 
            _tokenCreators[tokenId] == msg.sender || 
            _authorizedUpdaters[msg.sender],
            "Not authorized to update"
        );
        require(_tokenMetadata[tokenId].isDynamic, "NFT is not dynamic");
        
        NFTMetadata storage metadata = _tokenMetadata[tokenId];
        
        // Nếu attribute chưa tồn tại, thêm vào danh sách keys
        if (bytes(metadata.attributes[attributeName]).length == 0) {
            metadata.attributeKeys.push(attributeName);
        }
        
        metadata.attributes[attributeName] = attributeValue;
        metadata.lastUpdated = block.timestamp;
        
        emit AttributeUpdated(tokenId, attributeName, attributeValue);
    }

    function getNFTMetadata(uint256 tokenId) public view returns (
        string memory name,
        string memory description,
        string memory imageURI,
        string memory animationURI,
        uint256 createdAt,
        uint256 lastUpdated,
        bool isDynamic
    ) {
        require(_exists(tokenId), "Token does not exist");
        NFTMetadata storage metadata = _tokenMetadata[tokenId];
        
        return (
            metadata.name,
            metadata.description,
            metadata.imageURI,
            metadata.animationURI,
            metadata.createdAt,
            metadata.lastUpdated,
            metadata.isDynamic
        );
    }

    function getAttribute(uint256 tokenId, string memory attributeName) 
        public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenMetadata[tokenId].attributes[attributeName];
    }

    function getAttributeKeys(uint256 tokenId) 
        public view returns (string[] memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenMetadata[tokenId].attributeKeys;
    }

    function getTokenCreator(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenCreators[tokenId];
    }

    function authorizeUpdater(address updater, bool authorized) public onlyOwner {
        _authorizedUpdaters[updater] = authorized;
    }

    function isAuthorizedUpdater(address updater) public view returns (bool) {
        return _authorizedUpdaters[updater];
    }
}