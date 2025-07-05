// 🔥 CLEAN TOKEN MINTING BACKEND - PURE CARDANO WASM
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');

// Import CardanoWasm
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const {
  Address,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionOutput,
  Transaction,
  TransactionWitnessSet,
  Value,
  LinearFee,
  BigNum,
  AssetName,
  Assets,
  MultiAsset,
  ScriptHash,
  NativeScript,
  NativeScripts,
  ScriptPubkey,
  Ed25519KeyHash,
  TransactionMetadata,
  GeneralTransactionMetadata,
  TransactionMetadatum,
  MetadataMap,
  MetadataList,
  AuxiliaryData
} = CardanoWasm;

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  }
});

// Load protocol parameters from file
const PROTOCOL_PARAMS = (() => {
  try {
    const protocolParamsPath = path.join(__dirname, 'protocol-params.json');
    const protocolParams = JSON.parse(fs.readFileSync(protocolParamsPath, 'utf8'));
    console.log('✅ Protocol parameters loaded from file');
    return protocolParams;
  } catch (error) {
    console.error('❌ Failed to load protocol parameters:', error.message);
    // Fallback parameters
    return {
      min_fee_a: 44,
      min_fee_b: 155381,
      key_deposit: 2000000,
      pool_deposit: 500000000,
      max_tx_size: 16384,
      max_val_size: 5000,
      coins_per_utxo_byte: 4310
    };
  }
})();

console.log('🔥 CLEAN TOKEN MINTING SERVER - PURE CARDANO WASM');
console.log('📋 Protocol parameters:', PROTOCOL_PARAMS);

function buildUnsignedMintTx({ 
  utxos, 
  changeAddress, 
  recipientAddress, 
  tokenName, 
  tokenSupply, 
  userKeyHash,
  ipfsCID 
}) {
  console.log('🔨 Building unsigned mint transaction...');
  
  // 1. Create transaction builder config
  const txBuilderCfg = TransactionBuilderConfigBuilder.new()
    .fee_algo(
      LinearFee.new(
        BigNum.from_str(PROTOCOL_PARAMS.min_fee_a.toString()),
        BigNum.from_str(PROTOCOL_PARAMS.min_fee_b.toString())
      )
    )
    .coins_per_utxo_byte(BigNum.from_str(PROTOCOL_PARAMS.coins_per_utxo_byte.toString()))
    .key_deposit(BigNum.from_str(PROTOCOL_PARAMS.key_deposit.toString()))
    .pool_deposit(BigNum.from_str(PROTOCOL_PARAMS.pool_deposit.toString()))
    .max_tx_size(PROTOCOL_PARAMS.max_tx_size)
    .build();

  const txBuilder = TransactionBuilder.new(txBuilderCfg);

  // 2. Add UTXOs as inputs
  console.log('💰 Adding UTXOs as inputs...');
  const utxoList = TransactionUnspentOutputs.new();
  utxos.forEach((utxoHex, index) => {
    try {
      const utxo = TransactionUnspentOutput.from_bytes(Buffer.from(utxoHex, 'hex'));
      utxoList.add(utxo);
      
      // ✅ CORRECT: Use add_key_input instead of add_input
      txBuilder.add_key_input(
        utxo.input().transaction_id(),
        utxo.input().index(),
        utxo.output().amount()
      );
      console.log(`✅ Added UTXO ${index + 1}/${utxos.length}`);
    } catch (error) {
      console.error(`❌ Failed to add UTXO ${index}:`, error.message);
    }
  });

  // 3. Create policy script from user's keyHash
  console.log('🔑 Creating policy script...');
  const keyHash = Ed25519KeyHash.from_bytes(Buffer.from(userKeyHash, 'hex'));
  const nativeScript = NativeScript.new_script_pubkey(ScriptPubkey.new(keyHash));
  const scriptHash = ScriptHash.from_bytes(nativeScript.hash().to_bytes());
  const policyId = Buffer.from(scriptHash.to_bytes()).toString('hex');
  
  console.log('🆔 Policy ID:', policyId);

  // 4. Create minting assets
  console.log('🪙 Creating minting assets...');
  const assetName = AssetName.new(Buffer.from(tokenName, 'utf8'));
  const assets = Assets.new();
  assets.insert(assetName, BigNum.from_str(tokenSupply.toString()));
  
  const multiAsset = MultiAsset.new();
  multiAsset.insert(scriptHash, assets);

  // 5. Create recipient output with minted tokens
  console.log('📤 Creating recipient output...');
  const recipientValue = Value.new(BigNum.from_str("1000000")); // Min ADA
  recipientValue.set_multiasset(multiAsset);
  
  const recipientOutput = TransactionOutput.new(
    Address.from_bech32(recipientAddress),
    recipientValue
  );
  txBuilder.add_output(recipientOutput);

  // 6. Set mint
  console.log('⚙️ Setting mint in transaction...');
  txBuilder.set_mint(multiAsset);

  // 7. Add native scripts
  const nativeScripts = NativeScripts.new();
  nativeScripts.add(nativeScript);
  txBuilder.set_native_scripts(nativeScripts);

  // 8. Create metadata
  console.log('📝 Creating metadata...');
  const metadata = createTokenMetadata(policyId, tokenName, ipfsCID);
  if (metadata) {
    txBuilder.set_auxiliary_data(metadata);
  }

  // 9. Add change output
  console.log('🔄 Adding change output...');
  txBuilder.add_change_if_needed(Address.from_bech32(changeAddress));

  // 10. Build transaction
  console.log('🏗️ Building final transaction...');
  const txBody = txBuilder.build();
  const tx = Transaction.new(txBody, TransactionWitnessSet.new());

  const cborHex = Buffer.from(tx.to_bytes()).toString('hex');
  console.log('✅ Unsigned transaction built successfully');
  console.log('📏 CBOR length:', cborHex.length);

  return {
    cborHex,
    policyId,
    assetName: tokenName,
    tokenSupply
  };
}

function createTokenMetadata(policyId, tokenName, ipfsCID) {
  try {
    console.log('📝 Creating CIP-25 metadata...');
    
    // Create CIP-25 compliant metadata
    const metadata = GeneralTransactionMetadata.new();
    const metadataMap = MetadataMap.new();
    
    // Policy ID map
    const policyMap = MetadataMap.new();
    
    // Token map
    const tokenMap = MetadataMap.new();
    tokenMap.insert(
      TransactionMetadatum.new_text("name"),
      TransactionMetadatum.new_text(tokenName)
    );
    tokenMap.insert(
      TransactionMetadatum.new_text("image"),
      TransactionMetadatum.new_text(`ipfs://${ipfsCID}`)
    );
    
    // Add token to policy
    policyMap.insert(
      TransactionMetadatum.new_text(tokenName),
      TransactionMetadatum.new_map(tokenMap)
    );
    
    // Add policy to main metadata
    metadataMap.insert(
      TransactionMetadatum.new_text(policyId),
      TransactionMetadatum.new_map(policyMap)
    );
    
    // Label 721 for CIP-25
    metadata.insert(
      BigNum.from_str("721"),
      TransactionMetadatum.new_map(metadataMap)
    );
    
    const auxiliaryData = AuxiliaryData.new();
    auxiliaryData.set_metadata(metadata);
    
    console.log('✅ Metadata created successfully');
    return auxiliaryData;
  } catch (error) {
    console.error('❌ Failed to create metadata:', error.message);
    return null;
  }
}

// IPFS upload endpoint
app.post('/upload-ipfs', upload.single('file'), async (req, res) => {
  console.log('🔥 IPFS UPLOAD REQUEST');
  
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
    console.log('✅ IPFS upload successful:', ipfsCID);
    
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

// API endpoint for building unsigned mint transactions
app.post('/build-mint-tx', (req, res) => {
  console.log('🔥 Build mint transaction request received');
  
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
    return res.status(400).json({ error: 'Valid UTXOs array is required' });
  }
  
  if (!changeAddress || !recipientAddress) {
    return res.status(400).json({ error: 'Change address and recipient address are required' });
  }
  
  if (!tokenName || !tokenSupply) {
    return res.status(400).json({ error: 'Token name and supply are required' });
  }
  
  if (!userKeyHash || userKeyHash.length !== 56) {
    return res.status(400).json({ error: 'Valid user keyHash is required (56 hex chars)' });
  }

  try {
    console.log('📝 Request data:');
    console.log('   UTXOs count:', utxos.length);
    console.log('   Token name:', tokenName);
    console.log('   Token supply:', tokenSupply);
    console.log('   User keyHash:', userKeyHash);
    console.log('   Change address:', changeAddress);
    console.log('   Recipient:', recipientAddress);
    
    const result = buildUnsignedMintTx({
      utxos,
      changeAddress,
      recipientAddress,
      tokenName,
      tokenSupply: parseInt(tokenSupply),
      userKeyHash,
      ipfsCID
    });

    console.log('✅ Transaction built successfully');
    res.json({
      success: true,
      unsignedTx: result.cborHex,
      policyId: result.policyId,
      assetName: result.assetName,
      tokenSupply: result.tokenSupply,
      instructions: 'Sign this transaction with your Eternl wallet'
    });

  } catch (error) {
    console.error('❌ Error building transaction:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Clean Token Minting Backend with IPFS',
    version: '2.0.0',
    endpoints: ['/health', '/upload-ipfs', '/build-mint-tx'],
    features: ['IPFS Upload', 'Clean Mint Transaction Building', 'Pure CardanoWasm'],
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Clean minting server running on port ${PORT}`);
  console.log('📡 Endpoint: POST /build-mint-tx');
  console.log('🔧 Ready to build unsigned mint transactions!');
}); 