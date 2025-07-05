# 🚀 **TMT - Cardano Token Minting Platform**

> **Διαχωρισμένη αρχιτεκτονική Frontend/Backend για πραγματικό Cardano token minting**

**Frontend:** Netlify Static Hosting  
**Backend:** Render Express.js API  
**Blockchain:** Cardano Mainnet με cardano-cli

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **🔷 Backend - Express.js API (Render)**
```
🌐 https://tmt-oacu.onrender.com
├── Express.js Server με REST API
├── POST /mint endpoint για token minting
├── Cardano CLI integration
├── CIP-25 metadata generation
├── Native script minting policy
└── Real blockchain transactions
```

### **🔶 Frontend - Static Web App (Netlify)**
```
🌐 Frontend deployment URL
├── HTML/CSS/JS static files
├── Eternl wallet integration (CIP-30)
├── IPFS upload via Pinata
├── API communication με backend
└── Real-time status monitoring
```

---

## 📁 **PROJECT STRUCTURE**

```
TMT/
├── 🔷 backend/                   # Backend Express.js API (Render)
│   ├── package.json              # Node.js dependencies
│   ├── server.js                 # Express.js API server
│   ├── env.template              # Environment variables template
│   └── cardano/
│       ├── policy.script         # Native script minting policy
│       ├── policy.skey           # Policy signing key (generate)
│       ├── payment.skey          # Payment signing key (generate)
│       ├── payment.vkey          # Payment verification key (generate)
│       └── README.md             # Cardano setup instructions
├── 🔶 frontend/                  # Frontend Static App (Netlify)
│   ├── index.html                # Main application UI
│   ├── style.css                 # Modern responsive styles
│   ├── script.js                 # Frontend JavaScript + API integration
│   └── netlify.toml              # Netlify deployment config
├── 📝 README.md                  # This documentation
├── 🚀 render.yaml                # Render deployment config
└── 🔐 .gitignore                 # Security & cleanup
```

---

## 🔷 **BACKEND API DOCUMENTATION**

### **Base URL:** `https://tmt-oacu.onrender.com`

### **Endpoints:**

#### `GET /health`
Health check endpoint
```json
{
  "status": "OK",
  "service": "Cardano Token Minting Backend",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "network": "mainnet",
  "version": "1.0.0"
}
```

#### `GET /status`
Detailed server status and capabilities
```json
{
  "status": "ACTIVE",
  "service": "Cardano Token Minting API",
  "features": {
    "cardano_cli": true,
    "blockfrost_fallback": true,
    "native_scripts": true,
    "cip25_metadata": true,
    "real_minting": true
  },
  "network": "mainnet",
  "endpoints": ["GET /health", "GET /status", "POST /mint"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `POST /mint`
Main token minting endpoint

**Request:**
```json
{
  "tokenName": "MyToken",
  "address": "addr1...",
  "ipfsCID": "QmHash..."
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "abc123...",
  "policyId": "def456...",
  "tokenName": "MyToken",
  "amount": 1,
  "recipient": "addr1...",
  "explorerUrl": "https://cardanoscan.io/transaction/abc123...",
  "metadata": {
    "ipfsCID": "QmHash...",
    "standard": "CIP-25"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔶 **FRONTEND FEATURES**

### **🔗 Wallet Integration**
- **Eternl Wallet** connection via CIP-30
- Automatic address detection
- "Use Wallet Address" helper button
- Clean connect/disconnect UI

### **📝 Token Form**
- **Token Name** validation (alphanumeric only)
- **Recipient Address** input με wallet integration
- **Logo Upload** με real-time preview
- Form validation με visual feedback

### **🌐 IPFS Integration**
- **Pinata** cloud pinning service
- Automatic metadata generation
- Upload progress indicators
- Error handling με retry logic

### **📡 Backend Communication**
- Real-time backend status monitoring
- API health checks
- Error handling με user-friendly messages
- Loading states με progress feedback

### **🎉 User Experience**
- Modern glassmorphism design
- Responsive mobile-first layout
- Celebration animations on success
- Copy-to-clipboard functionality
- Modal dialogs για all interactions

---

## 🚀 **DEPLOYMENT GUIDE**

### **🔷 Backend Deployment (Render)**

#### **1. Render Setup**
1. Connect GitHub repository to Render
2. Create new Web Service
3. Configure settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node.js

#### **2. Environment Variables**
Set in Render dashboard:
```bash
NODE_ENV=production
CARDANO_NETWORK=mainnet
CARDANO_CLI_PATH=cardano-cli
POLICY_SCRIPT_PATH=./policy.script
POLICY_SKEY_PATH=./policy.skey
PAYMENT_SKEY_PATH=./payment.skey
PAYMENT_VKEY_PATH=./payment.vkey
BLOCKFROST_PROJECT_ID=your_blockfrost_id  # Optional fallback
```

#### **3. Cardano Keys Setup**
```bash
# Generate payment keys
cardano-cli address key-gen \
  --verification-key-file payment.vkey \
  --signing-key-file payment.skey

# Get key hash για policy script
cardano-cli address key-hash \
  --payment-verification-key-file payment.vkey

# Update policy.script με key hash
# Copy keys to production environment securely
```

### **🔶 Frontend Deployment (Netlify)**

#### **1. Netlify Setup**
1. Connect GitHub repository to Netlify
2. Set build settings:
   - **Publish Directory:** `frontend`
   - **Build Command:** `echo 'Frontend deployed'`

#### **2. Environment Variables**
No environment variables needed για frontend (static hosting)

#### **3. Domain Configuration**
- Custom domain setup (optional)
- HTTPS enabled by default
- CDN distribution automatic

---

## 🔧 **LOCAL DEVELOPMENT**

### **🔷 Backend Development**

```bash
# Clone repository
git clone <repository-url>
cd TMT/backend

# Install dependencies
npm install

# Copy environment template
cp env.template .env
# Edit .env με your settings

# Setup Cardano keys (see cardano-setup.md)

# Start development server
npm run dev
# Server runs on http://localhost:3000
```

### **🔶 Frontend Development**

```bash
# Navigate to frontend folder
cd frontend

# Open in browser (no build required)
open index.html
# Or use local server:
# python -m http.server 8000
# npx serve .
```

### **🧪 Testing Integration**

```bash
# Test backend health
curl https://tmt-oacu.onrender.com/health

# Test frontend-backend communication
# Open browser console in frontend
TMT.checkBackendStatus()

# Test complete flow:
# 1. Open frontend in browser
# 2. Connect Eternl wallet
# 3. Fill token form
# 4. Upload logo
# 5. Submit for minting
```

---

## 🛡️ **SECURITY CONSIDERATIONS**

### **🔷 Backend Security**
- Environment variables για sensitive data
- CORS configured για frontend domains only
- Input validation and sanitization
- Error handling without information leakage
- Rate limiting (implement if needed)

### **🔶 Frontend Security**
- Static hosting (no server vulnerabilities)
- Client-side validation only (backed by server validation)
- HTTPS enforcement
- Content Security Policy headers
- XSS protection headers

### **🔑 Key Management**
- Private keys stored securely in production
- Never commit keys to version control
- Use environment variables για all sensitive data
- Backup keys in secure offline storage

---

## 📊 **MONITORING & MAINTENANCE**

### **🔷 Backend Monitoring**
- Render automatic health checks
- `/health` endpoint για status monitoring
- Server logs via Render dashboard
- Error tracking and alerting

### **🔶 Frontend Monitoring**
- Netlify deployment logs
- Browser console for client errors
- Real-time backend connectivity status
- User experience monitoring

### **⛓️ Cardano Integration**
- Network status monitoring
- Transaction fee tracking
- UTXO management
- Blockchain explorer integration

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues:**

#### **Backend API Connection Failed**
```bash
# Check backend status
curl https://tmt-oacu.onrender.com/status

# Verify CORS settings in server.js
# Check Render deployment logs
```

#### **Wallet Connection Issues**
```bash
# Install Eternl wallet extension
# Enable DApp permissions
# Switch to Cardano mainnet
# Refresh page and retry
```

#### **IPFS Upload Failures**
```bash
# Check Pinata JWT token validity
# Verify file size < 1MB
# Check network connectivity
# Try different image format
```

#### **Transaction Failures**
```bash
# Verify cardano-cli installation
# Check private key permissions
# Ensure sufficient ADA in wallet
# Verify network connectivity
```

---

## 🤝 **CONTRIBUTING**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 **SUPPORT**

**Issues:** GitHub Issues  
**Backend API:** https://tmt-oacu.onrender.com/status  
**Frontend:** Deployed on Netlify  

---

## 📄 **LICENSE**

MIT License - Use freely!

---

**🚀 ΟΛΟΚΛΗΡΩΜΕΝΗ ΛΥΣΗ ΓΙΑ CARDANO TOKEN MINTING! 🚀**

**Frontend:** Static hosting με modern UI  
**Backend:** Express.js API με real blockchain integration  
**Architecture:** Completely separated με clear responsibilities 