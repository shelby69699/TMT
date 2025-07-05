/**
 * 🚀 Lucid + Blockfrost Token Minting Server
 * Modern Cardano token minting with Lucid library
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { Lucid, Blockfrost, fromText, toUnit } from 'lucid-cardano';

const app = express();
const PORT = process.env.PORT || 10000;

// Configure CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 } // 1MB limit
});

// Blockfrost configuration
const BLOCKFROST_PROJECT_ID = 'mainnetRphtobeMUfaH1ulbeDPsDntux1ESWh9r';
const BLOCKFROST_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

// Pinata configuration
const PINATA_JWT = process.env.PINATA_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2NzA5MjM2Ni01Y2Q5LTRiNjEtYjBjOS0xZTI0MDQ5ZWU5M2IiLCJlbWFpbCI6ImFsZXhhbmRyb3NwYXBhZGltaXRyaW91QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfSx7ImlkIjoiTllDMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJkOTVjMGIzNTM2MTc4YjliNzE2MyIsInNjb3BlZEtleVNlY3JldCI6IjE1MTJmZWZmZGMzNzBkYTQ3MTlkOGQxMjEyNGJkNjBiZGYxNjI3ZGRlZWRlYmVmMDg1ZGE0OGJjMTNmZjQ3ZjUiLCJpYXQiOjE3MzYxOTQ5MjN9.tdCJ3VQcMnzJX-cZmzjIgZ8QbzEZWFIV8YCxMXrIWV4';

console.log('🚀 Lucid + Blockfrost Token Minting Server Starting...');

// Initialize Lucid with Blockfrost
async function initializeLucid() {
    try {
        const lucid = await Lucid.new(
            new Blockfrost(BLOCKFROST_URL, BLOCKFROST_PROJECT_ID),
            'Mainnet'
        );
        console.log('✅ Lucid initialized with Blockfrost');
        return lucid;
    } catch (error) {
        console.error('❌ Failed to initialize Lucid:', error);
        throw error;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Lucid + Blockfrost Token Minting API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        blockfrost: 'Connected'
    });
});

// Upload file to IPFS via Pinata
app.post('/upload', upload.single('file'), async (req, res) => {
    console.log('📤 IPFS upload request received');
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }
        
        console.log('📁 File details:', {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
        
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        
        const metadata = JSON.stringify({
            name: req.file.originalname,
            keyvalues: {
                service: 'TMT-Lucid',
                uploadedAt: new Date().toISOString()
            }
        });
        formData.append('pinataMetadata', metadata);
        
        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                maxBodyLength: Infinity,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    'Authorization': `Bearer ${PINATA_JWT}`
                }
            }
        );
        
        const ipfsHash = response.data.IpfsHash;
        console.log('✅ File uploaded to IPFS:', ipfsHash);
        
        res.json({
            success: true,
            ipfsHash,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            message: 'File uploaded successfully'
        });
        
    } catch (error) {
        console.error('❌ IPFS upload failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Build mint transaction with Lucid
app.post('/build-mint-tx', async (req, res) => {
    console.log('🔨 Building mint transaction with Lucid...');
    
    try {
        const {
            utxos,
            changeAddress,
            recipientAddress,
            tokenName,
            tokenSupply,
            userKeyHash,
            ipfsCID
        } = req.body;
        
        // Validate required fields
        if (!utxos || !Array.isArray(utxos) || utxos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid UTXOs array is required'
            });
        }
        
        if (!changeAddress || !recipientAddress) {
            return res.status(400).json({
                success: false,
                error: 'Change address and recipient address are required'
            });
        }
        
        if (!tokenName || !tokenSupply) {
            return res.status(400).json({
                success: false,
                error: 'Token name and supply are required'
            });
        }
        
        if (!userKeyHash || userKeyHash.length !== 56) {
            return res.status(400).json({
                success: false,
                error: 'Valid user keyHash is required (56 hex chars)'
            });
        }
        
        console.log('📝 Request data:');
        console.log('   UTXOs count:', utxos.length);
        console.log('   Token name:', tokenName);
        console.log('   Token supply:', tokenSupply);
        console.log('   User keyHash:', userKeyHash);
        console.log('   Change address:', changeAddress);
        console.log('   Recipient:', recipientAddress);
        
        // Initialize Lucid
        const lucid = await initializeLucid();
        
        // Set wallet address (for UTXO selection)
        lucid.selectWalletFromAddress(changeAddress, utxos);
        
        // Create policy script
        const policyScript = lucid.utils.nativeScriptFromJson({
            type: "sig",
            keyHash: userKeyHash
        });
        
        const policyId = lucid.utils.mintingPolicyToId(policyScript);
        console.log('🆔 Policy ID:', policyId);
        
        // Create asset name
        const assetName = fromText(tokenName);
        const unit = toUnit(policyId, assetName);
        
        // Build transaction
        const tx = await lucid
            .newTx()
            .mintAssets({
                [unit]: BigInt(tokenSupply)
            })
            .payToAddress(recipientAddress, {
                lovelace: BigInt(2000000), // 2 ADA
                [unit]: BigInt(tokenSupply)
            })
            .attachMintingPolicy(policyScript)
            .attachMetadata(721, {
                [policyId]: {
                    [tokenName]: {
                        name: tokenName,
                        image: `ipfs://${ipfsCID}`,
                        description: "Minted with TMT Lucid Platform"
                    }
                }
            })
            .complete();
        
        console.log('✅ Transaction built successfully');
        
        res.json({
            success: true,
            unsignedTx: tx.toString(),
            policyId,
            assetName: tokenName,
            tokenSupply: parseInt(tokenSupply),
            instructions: 'Sign this transaction with your wallet'
        });
        
    } catch (error) {
        console.error('❌ Error building transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Submit signed transaction
app.post('/submit-tx', async (req, res) => {
    console.log('📤 Submitting signed transaction...');
    
    try {
        const { signedTx } = req.body;
        
        if (!signedTx) {
            return res.status(400).json({
                success: false,
                error: 'Signed transaction is required'
            });
        }
        
        // Initialize Lucid
        const lucid = await initializeLucid();
        
        // Submit transaction
        const txHash = await lucid.fromTx(signedTx).submit();
        
        console.log('✅ Transaction submitted successfully');
        console.log('🔗 Transaction hash:', txHash);
        
        res.json({
            success: true,
            txHash,
            message: 'Transaction submitted successfully',
            explorerUrl: `https://cardanoscan.io/transaction/${txHash}`
        });
        
    } catch (error) {
        console.error('❌ Error submitting transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Convert address endpoint (for compatibility)
app.post('/convert-address', async (req, res) => {
    try {
        const { changeAddressCbor } = req.body;
        
        if (!changeAddressCbor) {
            return res.status(400).json({
                success: false,
                error: 'changeAddressCbor is required'
            });
        }
        
        // Initialize Lucid
        const lucid = await initializeLucid();
        
        // Convert CBOR to bech32
        const address = lucid.utils.credentialToAddress(
            lucid.utils.keyHashToCredential(changeAddressCbor)
        );
        
        res.json({
            success: true,
            bech32Address: address
        });
        
    } catch (error) {
        console.error('❌ Error converting address:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Lucid + Blockfrost server running on port ${PORT}`);
    console.log(`🔗 Blockfrost Project ID: ${BLOCKFROST_PROJECT_ID}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

export default app; 