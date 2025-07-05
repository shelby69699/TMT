# 🏗️ Token Minting Architecture - Pure Wallet Based

## 🎯 Overview
This minting system works **exclusively with Eternl wallet** - no external APIs, no Blockfrost, no Cardano Node required!

## 🔧 Architecture Components

### 🖥️ Backend (Node.js + Express)
- **Purpose**: Builds unsigned transactions only
- **Dependencies**: 
  - `@emurgo/cardano-serialization-lib-nodejs` (CardanoWasm)
  - Local protocol parameters (`protocol-params.json`)
- **No external APIs**: No Blockfrost, no Cardano Node, no Lucid

### 🌐 Frontend (HTML/JavaScript)
- **Purpose**: Wallet integration and transaction submission
- **Dependencies**: 
  - Eternl wallet extension
  - Buffer polyfill for browsers
- **Flow**: Get UTXOs → Sign TX → Submit TX

## 🔄 Transaction Flow

### 1. Frontend → Backend
```javascript
// Frontend sends to /mint endpoint
{
  utxos: [...],                    // From wallet.getUtxos()
  changeAddressCbor: "...",        // From wallet.getChangeAddress()
  tokenName: "MYTOKEN",
  tokenSupply: 1000000,
  recipientAddress: "addr1...",
  ipfsCID: "QmXXX..."
}
```

### 2. Backend Processing
```javascript
// Backend builds unsigned transaction
const unsignedTx = await buildUnsignedMintTransaction({
  utxos,
  changeAddressCbor,
  tokenData,
  protocolParams: PROTOCOL_PARAMS
});

// Returns CBOR hex string
return { unsignedTx: "84a4008182..." };
```

### 3. Frontend Wallet Integration
```javascript
// Sign with Eternl wallet
const signedTx = await wallet.signTx(unsignedTx, true);

// Convert to proper Uint8Array
const signedTxBytes = Uint8Array.from(Buffer.from(signedTx, 'hex'));

// Submit via Eternl
const txHash = await wallet.submitTx(signedTxBytes);
```

## 📋 Protocol Parameters

Current mainnet parameters stored in `backend/protocol-params.json`:

```json
{
  "min_fee_a": 44,
  "min_fee_b": 155381,
  "key_deposit": 2000000,
  "pool_deposit": 500000000,
  "max_tx_size": 16384,
  "max_val_size": 5000,
  "coins_per_utxo_byte": 4310,
  "protocol_version": { "major": 8, "minor": 1 }
}
```

## 🎯 Benefits

### ✅ No External Dependencies
- No Blockfrost API keys
- No Cardano Node setup
- No Lucid framework
- No complex infrastructure

### ✅ Pure Wallet Based
- User maintains full control
- Direct blockchain submission
- No middleman services
- Real-time transaction status

### ✅ Simplified Architecture
- Backend: Transaction building only
- Frontend: Wallet integration only
- Clear separation of concerns
- Easy to debug and maintain

## 🚀 Deployment

### Backend (Render/Heroku)
1. Deploy backend with CardanoWasm
2. Include `protocol-params.json`
3. Set PINATA_JWT for IPFS uploads
4. No other environment variables needed

### Frontend (Netlify/Vercel)
1. Deploy static HTML/JS files
2. Ensure Buffer polyfill is loaded
3. Point to backend URL
4. No additional configuration needed

## 🔧 Key Implementation Details

### CBOR Encoding
```javascript
// Critical: Use Buffer.from() for proper CBOR encoding
const signedTxBytes = Uint8Array.from(Buffer.from(signedTx, 'hex'));
```

### Policy Script Generation
```javascript
// Dynamic policy based on user's keyHash
const policyScript = {
  type: "sig",
  keyHash: userKeyHash  // Extracted from wallet
};
```

### UTXO Handling
```javascript
// Frontend filters and validates UTXOs
const validUtxos = rawUtxos.filter(utxo => 
  utxo && typeof utxo === 'string' && utxo.length > 0
);
```

## 🏆 Success Criteria

- ✅ User connects Eternl wallet
- ✅ Backend builds valid unsigned transaction
- ✅ Frontend signs transaction with wallet
- ✅ Transaction submits successfully to Cardano network
- ✅ Token appears in recipient's wallet
- ✅ Transaction visible on Cardano explorers

This architecture ensures **maximum reliability** with **minimum complexity**! 