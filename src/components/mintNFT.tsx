// src/components/mintNFT.tsx
'use client';

import { useState } from 'react';
import { PinataSDK } from 'pinata-web3';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

const NFT_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      }
    ],
    "name": "mintNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const CONTRACT_ADDRESS = '0x90878Beb21f5AC031bC2118f7CF9146d3c5d7679';

// Pinata configuration - Tạo API key tại https://app.pinata.cloud/
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2MDU0ZjVmOC1kMDM0LTRlMzgtYjMzNy0zMTViZWJiNDRjYmQiLCJlbWFpbCI6Imxvbmd0ZGE1azQ4Z3RiQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmODFmMGMzMGEwZjRjMmI2NzgwYiIsInNjb3BlZEtleVNlY3JldCI6IjgyMTUyOWUyODBiZTFmYTBmOGE5OGRkNTBhYjg0ZmU2MDU0YWMzYjY4OGM3NmQ5YTk4NWNhN2U2ZTYxMTY0ZTciLCJleHAiOjE3ODI1NDE4ODR9.WXxVreuJWCReS7FXvgRuZ7fV6CleMVHhI_WKGgR3Oe0'; // Thay bằng JWT token từ Pinata
const PINATA_GATEWAY = 'lavender-left-hookworm-315.mypinata.cloud'; // Ví dụ: 'https://gateway.pinata.cloud'
console.log('Pinata JWT:', PINATA_JWT);
console.log('Pinata Gateway:', PINATA_GATEWAY);
export function MintNFT() {
  const { address, isConnected } = useAccount();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleMint = async () => {
    if (!file || !name || !desc) {
      alert('Điền đủ thông tin và chọn ảnh!');
      return;
    }

    
    
    setIsUploading(true);
    try {
      console.log('Starting upload to Pinata...');
      
      // Khởi tạo Pinata client
      const pinata = new PinataSDK({
        pinataJwt: PINATA_JWT,
        pinataGateway: PINATA_GATEWAY
      });

      console.log('Uploading image:', file.name, file.type, file.size);
      
      // 1. Upload ảnh lên Pinata IPFS
      const imageUpload = await pinata.upload.file(file);
      console.log('Image uploaded:', imageUpload);
      
      // 2. Tạo URL cho ảnh
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUpload.IpfsHash}`;
      console.log('Image URL:', imageUrl);
      
      // 3. Tạo metadata object
      const metadata = {
        name,
        description: desc,
        image: imageUrl,
        attributes: [
          {
            trait_type: "Creator",
            value: address
          },
          {
            trait_type: "Created Date",
            value: new Date().toISOString()
          }
        ]
      };
      
      console.log('Uploading metadata:', metadata);
      
      // 4. Upload metadata lên Pinata
      const metadataUpload = await pinata.upload.json(metadata);
      console.log('Metadata uploaded:', metadataUpload);
      
      // 5. Tạo URL cho metadata
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataUpload.IpfsHash}`;
      console.log('Metadata URL:', metadataUrl);
      
      // 6. Mint NFT với metadata URL
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'mintNFT',
        args: [metadataUrl],
      });
      
    } catch (err) {
      console.error('Pinata upload error:', err);
      alert(`Lỗi upload: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6 border border-gray-300 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Mint NFT</h2>
        <p className="text-gray-600">Vui lòng kết nối ví để mint NFT</p>
      </div>
    );
  }

  return (
    <div className="p-6 border border-gray-300 rounded-lg w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Mint NFT với Pinata IPFS</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Chọn ảnh</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {file && (
          <p className="text-xs text-gray-500 mt-1">
            Đã chọn: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Tên NFT</label>
        <input 
          type="text" 
          placeholder="Nhập tên NFT" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Mô tả</label>
        <textarea 
          placeholder="Nhập mô tả NFT" 
          value={desc} 
          onChange={e => setDesc(e.target.value)} 
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
        />
      </div>
      
      <button
        onClick={handleMint}
        disabled={isUploading || isPending || isConfirming || !file || !name || !desc}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {isUploading && 'Đang upload lên Pinata IPFS...'}
        {isPending && 'Đang gửi giao dịch...'}
        {isConfirming && 'Đang xác nhận...'}
        {!isUploading && !isPending && !isConfirming && 'Mint NFT'}
      </button>

      {hash && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <p className="text-sm">
            <strong>Transaction Hash:</strong>
            <br />
            <a 
              href={`https://explorer.oasis.io/testnet/sapphire/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {hash}
            </a>
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded-md">
          <p className="text-green-700 font-medium">
            ✅ NFT đã được mint thành công với Pinata!
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded-md">
          <p className="text-red-700 text-sm">
            ❌ Lỗi: {error.message}
          </p>
        </div>
      )}
    </div>
  );
}