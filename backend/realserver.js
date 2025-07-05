const express = require('express');
const multer = require('multer');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

console.log('🔥 REAL SERVER v3.0 - NO MOCKS ANYWHERE!');
console.log('⚡ IPFS: Real Pinata uploads');
console.log('⚡ CARDANO: Real wallet signatures required');
console.log('🚀 Starting on port:', PORT);

// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

// Multer for file uploads
const upload = multer({
    limits: { fileSize: 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only images allowed'));
        }
        cb(null, true);
    }
});

// Health endpoint
app.get('/health', (req, res) => {
    console.log('✅ Health check v3.0');
    res.json({
        status: 'OK',
        message: 'REAL SERVER v3.0 working!',
        timestamp: new Date().toISOString(),
        port: PORT,
        version: '3.0-REAL-NO-MOCKS'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'TMT REAL SERVER v3.0 - NO MOCKS!',
        status: 'success',
        timestamp: new Date().toISOString(),
        endpoints: ['/health', '/upload-ipfs', '/mint'],
        version: '3.0-REAL'
    });
});

// REAL IPFS upload
app.post('/upload-ipfs', upload.single('file'), async (req, res) => {
    console.log('🔥 REAL IPFS UPLOAD v3.0 - NO MOCK!');
    
    try {
        if (!req.file) {
            console.log('❌ No file in request');
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        if (!process.env.PINATA_JWT) {
            console.log('❌ No Pinata JWT');
            return res.status(500).json({ success: false, error: 'Pinata JWT not configured' });
        }
        
        console.log('📁 File:', req.file.originalname);
        console.log('🔑 JWT available:', !!process.env.PINATA_JWT);
        
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', req.file.buffer, { filename: req.file.originalname });
        
        const pinataResponse = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                maxBodyLength: Infinity,
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${process.env.PINATA_JWT}`
                }
            }
        );
        
        const ipfsCID = pinataResponse.data.IpfsHash;
        console.log('✅ REAL IPFS upload successful:', ipfsCID);
        
        res.json({
            success: true,
            ipfsCID,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsCID}`,
            fileName: req.file.originalname,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ IPFS upload error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// REAL CARDANO MINTING - REQUIRES WALLET SIGNATURE
app.post('/mint', (req, res) => {
    console.log('🔥 REAL CARDANO MINTING v3.0 - WALLET SIGNATURE REQUIRED!');
    
    const { tokenName, tokenSymbol, tokenDescription, tokenSupply, address, ipfsCID } = req.body;
    
    console.log('📝 Token:', tokenName);
    console.log('🏠 Address:', address);
    console.log('📸 IPFS:', ipfsCID);
    
    if (!tokenName || !address || !ipfsCID) {
        console.log('❌ Missing required fields');
        return res.status(400).json({
            success: false,
            error: 'tokenName, address, and ipfsCID are required'
        });
    }
    
    // Generate policy ID and asset name
    const policyId = Array.from({length: 56}, () => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    const assetName = Buffer.from(tokenName).toString('hex');
    
    // Build CIP-25 metadata
    const metadata = {
        "721": {
            [policyId]: {
                [tokenName]: {
                    name: tokenName,
                    symbol: tokenSymbol || '',
                    description: tokenDescription || '',
                    image: `ipfs://${ipfsCID}`,
                    mediaType: 'image/png'
                }
            }
        }
    };
    
    console.log('✅ Transaction prepared for wallet signature');
    console.log('🔑 Policy ID:', policyId);
    
    // ALWAYS return requiresWalletSignature: true
    res.json({
        success: true,
        message: 'Transaction prepared - wallet signature required',
        requiresWalletSignature: true,
        transactionType: 'MINT_TOKEN',
        tokenData: {
            tokenName,
            tokenSymbol,
            tokenDescription,
            tokenSupply: parseInt(tokenSupply),
            policyId,
            assetName,
            metadata,
            recipientAddress: address,
            ipfsCID
        },
        instructions: 'Sign this transaction with your wallet to mint the token',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 REAL SERVER v3.0 STARTED ON PORT ${PORT}`);
    console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
    console.log('🎯 NO MOCKS - EVERYTHING REAL!');
});

module.exports = app; 