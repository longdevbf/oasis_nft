import {ethers} from "hardhat";

async function main(){
  try{
    const [deployer]= await ethers.getSigners();
    console.log("My deployer address: ", deployer.getAddress());

    const NFTContract = await ethers.getContractFactory("NFT"
    );
    const deployContract = await NFTContract.deploy();

    await deployContract.waitForDeployment();

    console.log("NFT Contract address :", await deployContract.getAddress());
  }
  catch(e){
    console.error("Error deploying contract:", e);
  }
  
}
main();
