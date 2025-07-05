# 🔑 Cardano Keys and Scripts Setup

## Required Files για Token Minting

### 1. Payment Keys
```bash
# Generate payment keys
cardano-cli address key-gen \
  --verification-key-file payment.vkey \
  --signing-key-file payment.skey

# Generate payment address
cardano-cli address build \
  --payment-verification-key-file payment.vkey \
  --mainnet \
  --out-file payment.addr
```

### 2. Policy Script
Update `policy.script` με το key hash από το payment key:

```bash
# Get key hash
cardano-cli address key-hash \
  --payment-verification-key-file payment.vkey
```

Update `policy.script`:
```json
{
  "type": "all",
  "scripts": [
    {
      "type": "sig",
      "keyHash": "YOUR_KEY_HASH_HERE"
    },
    {
      "type": "before",
      "slot": 999999999
    }
  ]
}
```

### 3. Policy Keys
```bash
# Generate policy keys (same as payment for simple setup)
cp payment.skey policy.skey
```

### 4. Generate Policy ID
```bash
cardano-cli transaction policyid \
  --script-file policy.script
```

## Environment Variables
Set these in your `.env` file:
- `POLICY_SCRIPT_PATH=./policy.script`
- `POLICY_SKEY_PATH=./policy.skey`
- `PAYMENT_SKEY_PATH=./payment.skey`
- `PAYMENT_VKEY_PATH=./payment.vkey`

## Security Notes
⚠️ **NEVER commit actual key files to git!**
- Add `*.skey` to .gitignore
- Use environment variables για production keys
- Store keys securely in production environment 