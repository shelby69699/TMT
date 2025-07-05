# 🔥 Clean Token Minting Backend

## 🎯 Overview
This is a **simplified, clean backend** for Cardano token minting that follows the exact pattern you provided. It's designed to work **exclusively with Eternl wallet** without any external dependencies.

## 🛠️ Features

### ✅ Pure CardanoWasm Implementation
- Uses `@emurgo/cardano-serialization-lib-nodejs` directly
- No external APIs (no Blockfrost, no Lucid)
- Protocol parameters loaded from file

### ✅ Clean Architecture
```
Frontend → POST /build-mint-tx → Backend builds unsigned TX → Frontend signs & submits
```

### ✅ Simple API
- **Single Endpoint**: `POST /build-mint-tx`
- **Clean Input**: UTXOs, addresses, token data
- **CBOR Output**: Ready for wallet signing

## 🚀 Quick Start

### 1. Run Clean Backend
```bash
cd backend
npm run clean
```

### 2. Test Endpoint
```bash
curl -X POST http://localhost:3001/build-mint-tx \
  -H "Content-Type: application/json" \
  -d '{
    "utxos": ["..."],
    "changeAddress": "addr1...",
    "recipientAddress": "addr1...",
    "tokenName": "MYTOKEN",
    "tokenSupply": 1000000,
    "userKeyHash": "...",
    "ipfsCID": "QmXXX..."
  }'
```

## 📡 API Endpoints

### POST /build-mint-tx
Builds an unsigned minting transaction.

**Request Body:**
```json
{
  "utxos": ["hex1", "hex2", ...],          // UTXOs from wallet.getUtxos()
  "changeAddress": "addr1...",             // Bech32 change address
  "recipientAddress": "addr1...",          // Bech32 recipient address
  "tokenName": "MYTOKEN",                  // Token name
  "tokenSupply": 1000000,                  // Token supply (number)
  "userKeyHash": "abc123...",              // User's keyHash (56 hex chars)
  "ipfsCID": "QmXXX..."                    // IPFS CID for metadata
}
```

**Response:**
```json
{
  "success": true,
  "unsignedTx": "84a4008182...",          // CBOR hex for signing
  "policyId": "def456...",                // Generated policy ID
  "assetName": "MYTOKEN",                 // Asset name
  "tokenSupply": 1000000,                 // Token supply
  "instructions": "Sign this transaction with your Eternl wallet"
}
```

### GET /health
Health check endpoint.

## 🔧 Implementation Details

### Transaction Building Process
1. **Load Protocol Parameters** from `protocol-params.json`
2. **Create Transaction Builder** with proper config
3. **Add UTXOs** as inputs
4. **Create Policy Script** from user's keyHash
5. **Create Minting Assets** with token name and supply
6. **Add Recipient Output** with minted tokens
7. **Set Mint** in transaction
8. **Add Native Scripts** for policy
9. **Create CIP-25 Metadata** with IPFS link
10. **Add Change Output** automatically
11. **Build & Return** CBOR hex string

### Key Differences from Original Backend
- **Simpler API**: Single endpoint, clean input/output
- **No Address Conversion**: Expects bech32 addresses directly
- **No UTXO Validation**: Trusts wallet UTXOs
- **Direct CBOR Output**: No complex response structure
- **Cleaner Error Handling**: Simple error messages

## 🔄 Frontend Integration

Update your frontend to use the new endpoint:

```javascript
// Old way
const response = await fetch('/mint', { /* complex payload */ });

// New clean way
const response = await fetch('/build-mint-tx', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    utxos,
    changeAddress,
    recipientAddress,
    tokenName,
    tokenSupply: parseInt(tokenSupply),
    userKeyHash,
    ipfsCID
  })
});

const { unsignedTx } = await response.json();

// Sign with wallet
const signedTx = await wallet.signTx(unsignedTx, true);

// Convert to Uint8Array
const signedTxBytes = Uint8Array.from(Buffer.from(signedTx, 'hex'));

// Submit via wallet
const txHash = await wallet.submitTx(signedTxBytes);
```

## 🎯 Benefits

### ✅ Maximum Simplicity
- Clean, readable code
- Single responsibility functions
- Clear error messages

### ✅ High Reliability
- No external API dependencies
- Minimal failure points
- Direct CardanoWasm usage

### ✅ Easy Debugging
- Comprehensive logging
- Step-by-step transaction building
- Clear validation messages

## 🔧 Files Structure

```
backend/
├── mintTx.js              # Clean backend implementation
├── protocol-params.json   # Protocol parameters
├── package.json          # Dependencies
└── README-CLEAN.md       # This file
```

## 🚀 Deployment

### Local Development
```bash
npm install
npm run clean
```

### Production (Render/Heroku)
```bash
# Set start script to use clean backend
"start": "node mintTx.js"
```

This clean implementation gives you **maximum control** with **minimum complexity**! 🎯 