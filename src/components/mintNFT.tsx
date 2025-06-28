'use client';

import { useState } from 'react';
import { PinataSDK } from 'pinata-web3';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';

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
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "toAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      }
    ],
    "name": "mintSingleNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "metadataURIs",
        "type": "string[]"
      }
    ],
    "name": "mintMyCollection",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string[]",
        "name": "metadataURIs",
        "type": "string[]"
      }
    ],
    "name": "mintNFTCollection",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "baseURI",
        "type": "string"
      }
    ],
    "name": "mintCollectionWithBaseURI",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRemainingSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_NFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_BATCH_SIZE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const CONTRACT_ADDRESS = '0x61fc08123a1c2DeAb39e0f32b1Cb90cc094fe3E6';
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2MDU0ZjVmOC1kMDM0LTRlMzgtYjMzNy0zMTViZWJiNDRjYmQiLCJlbWFpbCI6Imxvbmd0ZGE1azQ4Z3RiQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmODFmMGMzMGEwZjRjMmI2NzgwYiIsInNjb3BlZEtleVNlY3JldCI6IjgyMTUyOWUyODBiZTFmYTBmOGE5OGRkNTBhYjg0ZmU2MDU0YWMzYjY4OGM3NmQ5YTk4NWNhN2U2ZTYxMTY0ZTciLCJleHAiOjE3ODI1NDE4ODR9.WXxVreuJWCReS7FXvgRuZ7fV6CleMVHhI_WKGgR3Oe0';
const PINATA_GATEWAY = 'lavender-left-hookworm-315.mypinata.cloud';

type MintMode = 'single' | 'collection' | 'baseURI';

export function MintNFT() {
  const { address, isConnected } = useAccount();
  
  // Common states
  const [mintMode, setMintMode] = useState<MintMode>('single');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Single NFT states
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Collection states
  const [collectionFiles, setCollectionFiles] = useState<File[]>([]);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');

  // Base URI states
  const [baseURI, setBaseURI] = useState('');
  const [quantity, setQuantity] = useState(1);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Read contract data
  const { data: totalNFT } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'getTotalNFT',
  });

  const { data: remainingSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'getRemainingSupply',
  });

  const { data: maxNFT } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'MAX_NFT',
  });

  const { data: maxBatchSize } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'MAX_BATCH_SIZE',
  });

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCollectionFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > Number(maxBatchSize || 20)) {
        alert(`Chỉ có thể upload tối đa ${maxBatchSize} files!`);
        return;
      }
      setCollectionFiles(filesArray);
    }
  };

  const handleMintSingle = async () => {
    if (!file || !name || !description) {
      alert('Vui lòng điền đầy đủ thông tin và chọn ảnh!');
      return;
    }

    setIsUploading(true);
    try {
      const pinata = new PinataSDK({
        pinataJwt: PINATA_JWT,
        pinataGateway: PINATA_GATEWAY
      });

      // Upload ảnh
      const imageUpload = await pinata.upload.file(file);
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUpload.IpfsHash}`;
      
      // Tạo metadata
      const metadata = {
        name,
        description,
        image: imageUrl,
        attributes: [
          {
            trait_type: "Creator",
            value: address
          },
          {
            trait_type: "Created Date",
            value: new Date().toISOString()
          },
          {
            trait_type: "Type",
            value: "Single NFT"
          }
        ]
      };
      
      // Upload metadata
      const metadataUpload = await pinata.upload.json(metadata);
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataUpload.IpfsHash}`;
      
      // Mint NFT
      if (recipientAddress && recipientAddress !== address) {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: NFT_ABI,
          functionName: 'mintSingleNFT',
          args: [recipientAddress as `0x${string}`, metadataUrl],
        });
      } else {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: NFT_ABI,
          functionName: 'mintNFT',
          args: [metadataUrl],
        });
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Lỗi upload: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMintCollection = async () => {
    if (collectionFiles.length === 0 || !collectionName) {
      alert('Vui lòng chọn ít nhất 1 ảnh và nhập tên collection!');
      return;
    }

    setIsUploading(true);
    try {
      const pinata = new PinataSDK({
        pinataJwt: PINATA_JWT,
        pinataGateway: PINATA_GATEWAY
      });

      const metadataUrls: string[] = [];

      // Upload từng file và tạo metadata
      for (let i = 0; i < collectionFiles.length; i++) {
        const file = collectionFiles[i];
        
        // Upload ảnh
        const imageUpload = await pinata.upload.file(file);
        const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageUpload.IpfsHash}`;
        
        // Tạo metadata cho từng NFT
        const metadata = {
          name: `${collectionName} #${i + 1}`,
          description: collectionDescription || `Part of ${collectionName} collection`,
          image: imageUrl,
          attributes: [
            {
              trait_type: "Collection",
              value: collectionName
            },
            {
              trait_type: "Edition",
              value: `${i + 1} of ${collectionFiles.length}`
            },
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
        
        // Upload metadata
        const metadataUpload = await pinata.upload.json(metadata);
        const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataUpload.IpfsHash}`;
        metadataUrls.push(metadataUrl);
      }
      
      // Mint collection
      if (recipientAddress && recipientAddress !== address) {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: NFT_ABI,
          functionName: 'mintNFTCollection',
          args: [recipientAddress as `0x${string}`, metadataUrls],
        });
      } else {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: NFT_ABI,
          functionName: 'mintMyCollection',
          args: [metadataUrls],
        });
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Lỗi upload: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMintWithBaseURI = () => {
    if (!baseURI || quantity < 1) {
      alert('Vui lòng nhập Base URI và số lượng hợp lệ!');
      return;
    }

    const toAddress = recipientAddress || address;
    
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'mintCollectionWithBaseURI',
      args: [toAddress as `0x${string}`, BigInt(quantity), baseURI],
    });
  };

  if (!isConnected) {
    return (
      <div className="p-6 border border-gray-300 rounded-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">🎨 Mint NFT</h2>
        <p className="text-gray-600">Vui lòng kết nối ví để mint NFT</p>
      </div>
    );
  }

  return (
    <div className="p-6 border border-gray-300 rounded-lg w-full max-w-2xl">
      <h2 className="text-2xl font-bold mb-6 text-blue-600">🎨 Mint NFT</h2>
      
      {/* Contract Stats */}
      <div className="mb-6 p-4 bg-blue-50 rounded-md">
        <h3 className="font-bold text-blue-800 mb-2">📊 Contract Stats</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-700"><strong>Total Minted:</strong> {totalNFT?.toString() || '0'}</p>
            <p className="text-blue-700"><strong>Max Supply:</strong> {maxNFT?.toString() || '10000'}</p>
          </div>
          <div>
            <p className="text-blue-700"><strong>Remaining:</strong> {remainingSupply?.toString() || '0'}</p>
            <p className="text-blue-700"><strong>Max Batch:</strong> {maxBatchSize?.toString() || '20'}</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <h3 className="font-bold mb-3">Chọn loại mint:</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMintMode('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              mintMode === 'single' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🖼️ Single NFT
          </button>
          <button
            onClick={() => setMintMode('collection')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              mintMode === 'collection' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📚 Collection
          </button>
          <button
            onClick={() => setMintMode('baseURI')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              mintMode === 'baseURI' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🔗 Base URI
          </button>
        </div>
      </div>

      {/* Recipient Address */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Địa chỉ nhận NFT (tùy chọn):</label>
        <input 
          type="text" 
          placeholder={`Để trống để mint cho chính mình (${address?.slice(0, 6)}...${address?.slice(-4)})`}
          value={recipientAddress} 
          onChange={e => setRecipientAddress(e.target.value)} 
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Single NFT Mode */}
      {mintMode === 'single' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Chọn ảnh *</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {file && (
              <div className="mt-2 p-2 bg-green-50 rounded border">
                <p className="text-xs text-green-700">
                  ✅ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Tên NFT *</label>
            <input 
              type="text" 
              placeholder="Nhập tên NFT" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Mô tả *</label>
            <textarea 
              placeholder="Nhập mô tả NFT" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <button
            onClick={handleMintSingle}
            disabled={isUploading || isPending || isConfirming || !file || !name || !description}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isUploading && '📤 Đang upload lên IPFS...'}
            {isPending && '🔄 Đang gửi giao dịch...'}
            {isConfirming && '⏳ Đang xác nhận...'}
            {!isUploading && !isPending && !isConfirming && '🎨 Mint Single NFT'}
          </button>
        </div>
      )}

            {/* Collection Mode */}
            {mintMode === 'collection' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Chọn nhiều ảnh *</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    onChange={handleCollectionFilesChange} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  />
                  {collectionFiles.length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 rounded border">
                      <p className="text-xs text-green-700">
                        ✅ {collectionFiles.length} files selected
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tên Collection *</label>
                  <input 
                    type="text" 
                    placeholder="Nhập tên collection" 
                    value={collectionName} 
                    onChange={e => setCollectionName(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Mô tả Collection</label>
                  <textarea 
                    placeholder="Nhập mô tả collection (tùy chọn)" 
                    value={collectionDescription} 
                    onChange={e => setCollectionDescription(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                </div>
      
                <button
                  onClick={handleMintCollection}
                  disabled={isUploading || isPending || isConfirming || collectionFiles.length === 0 || !collectionName}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isUploading && '📤 Đang upload collection...'}
                  {isPending && '🔄 Đang gửi giao dịch...'}
                  {isConfirming && '⏳ Đang xác nhận...'}
                  {!isUploading && !isPending && !isConfirming && '📚 Mint Collection'}
                </button>
              </div>
            )}
      
            {/* Base URI Mode */}
            {mintMode === 'baseURI' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Base URI *</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/metadata/" 
                    value={baseURI} 
                    onChange={e => setBaseURI(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Số lượng *</label>
                  <input 
                    type="number" 
                    min="1"
                    max={maxBatchSize?.toString() || "20"}
                    placeholder="Nhập số lượng NFT" 
                    value={quantity} 
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
      
                <button
                  onClick={handleMintWithBaseURI}
                  disabled={isPending || isConfirming || !baseURI || quantity < 1}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isPending && '🔄 Đang gửi giao dịch...'}
                  {isConfirming && '⏳ Đang xác nhận...'}
                  {!isPending && !isConfirming && '🔗 Mint với Base URI'}
                </button>
              </div>
            )}
      
            {/* Transaction Status */}
            {hash && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="font-bold mb-2">📋 Transaction Status</h3>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Hash:</strong> {hash}
                </p>
                {isConfirming && <p className="text-yellow-600">⏳ Đang xác nhận giao dịch...</p>}
                {isConfirmed && <p className="text-green-600">✅ Giao dịch thành công!</p>}
                {error && <p className="text-red-600">❌ Lỗi: {error}</p>}
              </div>
            )}
          </div>
        );
      }