// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, ERC721URIStorage, Ownable{
    uint256 private _nextIDToken;

    constructor() ERC721("MyNFT", "Thomas") Ownable(){
        _nextIDToken = 0;
    }

    function createNFT(address toAddress, string memory metadata) public returns (uint256){
        uint256 tokenID = _nextIDToken;
        _nextIDToken++;

        _mint(toAddress, tokenID);

        _setTokenURI(tokenID, metadata);

        return tokenID;

    }

    function mintNFT(string memory metadataURI) public returns (uint256){
        return createNFT(msg.sender, metadataURI);
    }

    function getTotalNFT() public view returns (uint256){
        return _nextIDToken;
    }

    function _burn(uint256 tokenID) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenID);
    }

    function tokenURI(uint256 tokenID) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenID);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}