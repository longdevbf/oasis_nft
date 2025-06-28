import {ethers} from 'hardhat';

async function main(){
  try{

  
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", await deployer.getAddress());

    const nftContract = await ethers.getContractFactory("NFT");
    const marketPlaceContract = await ethers.getContractFactory("NFTMarket");
    const deployedMarketPlaceContract = await marketPlaceContract.deploy(deployer.getAddress());
    const deployedContract = await nftContract.deploy(deployer.getAddress());
    await deployedMarketPlaceContract.waitForDeployment();
    await deployedContract.waitForDeployment();
    
    console.log("NFT Contract deployed at address: ", await deployedContract.getAddress());
    console.log("MarketPlace Contract deployed at address: ", await deployedMarketPlaceContract.getAddress());
  } catch (error) {
    console.error("Error deploying NFT contract: ", error);
  }
}
main();