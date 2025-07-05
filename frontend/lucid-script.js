/**
 * 🚀 TMT Frontend JavaScript - Lucid + Blockfrost Edition
 * Modern Cardano Token Minting with Lucid backend
 */

// State management
const state = {
    wallet: { connected: false, api: null, address: null },
    backend: { connected: false },
    currentUpload: { ipfsCID: null }
};

// Configuration - Use local Lucid server for development
const CONFIG = {
    BACKEND_URL: 'http://localhost:10000'  // Local Lucid server
};

// Safe DOM element access
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Element with id '${id}' not found`);
        return null;
    }
    return element;
}

function initializeEventListeners() {
    // Connect wallet button
    const connectBtn = safeGetElement('connectWallet');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }
    
    // Disconnect wallet button
    const disconnectBtn = safeGetElement('disconnectWallet');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
    
    // File upload
    const logoFile = safeGetElement('logoFile');
    if (logoFile) {
        logoFile.addEventListener('change', handleFileUpload);
    }
    
    // Form submission
    const mintForm = safeGetElement('mintForm');
    if (mintForm) {
        mintForm.addEventListener('submit', handleMintSubmit);
    }
    
    // Form inputs validation
    const inputs = ['tokenName', 'tokenSymbol', 'tokenDescription', 'tokenSupply'];
    inputs.forEach(inputId => {
        const input = safeGetElement(inputId);
        if (input) {
            input.addEventListener('input', validateForm);
        }
    });
    
    // Description character counter
    const tokenDescription = safeGetElement('tokenDescription');
    const charCount = safeGetElement('descriptionCharCount');
    if (tokenDescription && charCount) {
        tokenDescription.addEventListener('input', function() {
            const count = this.value.length;
            charCount.textContent = count;
            
            const counter = charCount.parentElement;
            counter.classList.remove('warning', 'error');
            
            if (count > 50) {
                counter.classList.add('warning');
            }
            if (count > 60) {
                counter.classList.add('error');
            }
        });
    }
    
    // Modal click handlers
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', handleModalClick);
    });
    
    console.log('✅ Event listeners initialized');
}

// Backend API functions
async function checkBackendStatus() {
    console.log('🔍 Checking Lucid backend status...');
    
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/health`);
        const status = await response.json();
        
        if (status.status === 'OK') {
            state.backend.connected = true;
            const statusText = safeGetElement('statusText');
            const statusIndicator = document.querySelector('.status-indicator');
            
            if (statusText) statusText.textContent = 'Lucid + Blockfrost Backend Connected ✅';
            if (statusIndicator) statusIndicator.style.background = 'linear-gradient(45deg, #4ade80, #22c55e)';
            
            console.log('✅ Lucid backend connected:', status);
        } else {
            throw new Error('Backend unavailable');
        }
    } catch (error) {
        console.error('❌ Lucid backend connection failed:', error);
        state.backend.connected = false;
        
        const statusText = safeGetElement('statusText');
        const statusIndicator = document.querySelector('.status-indicator');
        
        if (statusText) statusText.textContent = 'Lucid Backend Disconnected ❌';
        if (statusIndicator) statusIndicator.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
    }
    updateUI();
}

// Wallet functions
async function connectWallet() {
    try {
        console.log('🔗 Connecting to Eternl wallet...');
        
        if (!window.cardano || !window.cardano.eternl) {
            throw new Error('Eternl wallet not found. Please install Eternl wallet extension.');
        }
        
        showLoading('Connecting to Eternl Wallet', 'Please approve the connection in your wallet');
        
        const api = await window.cardano.eternl.enable();
        
        // Get wallet address
        console.log('🔍 Getting wallet address...');
        let walletAddress;
        
        try {
            const changeAddress = await api.getChangeAddress();
            walletAddress = changeAddress;
            console.log('✅ Change address:', walletAddress);
        } catch (changeError) {
            console.log('🔄 Change address failed, trying getUsedAddresses...');
            
            const addresses = await api.getUsedAddresses();
            
            if (addresses.length === 0) {
                throw new Error('No addresses found in wallet. Please ensure your wallet has at least one address.');
            }
            
            walletAddress = addresses[0];
            console.log('✅ Used address:', walletAddress);
        }
        
        // Store wallet info
        state.wallet = {
            connected: true,
            api: api,
            address: walletAddress
        };
        
        console.log('✅ Wallet connected successfully');
        closeModal('loadingModal');
        updateUI();
        
    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        closeModal('loadingModal');
        showError('Failed to connect wallet: ' + error.message);
    }
}

function disconnectWallet() {
    state.wallet = { connected: false, api: null, address: null };
    updateUI();
    console.log('🔌 Wallet disconnected');
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        console.log('📤 Uploading file to IPFS...');
        
        // Validate file
        if (file.size > 1024 * 1024) { // 1MB limit
            throw new Error('File size must be less than 1MB');
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        }
        
        showFilePreview(file);
        
        // Upload to IPFS
        const ipfsCID = await uploadToIPFS(file);
        
        if (ipfsCID) {
            state.currentUpload.ipfsCID = ipfsCID;
            console.log('✅ File uploaded successfully. IPFS CID:', ipfsCID);
        }
        
    } catch (error) {
        console.error('❌ File upload failed:', error);
        showError('Failed to upload file: ' + error.message);
        resetFileUpload();
    }
}

function showFilePreview(file) {
    const preview = safeGetElement('filePreview');
    const previewImg = safeGetElement('previewImg');
    const fileName = safeGetElement('fileName');
    const fileSize = safeGetElement('fileSize');
    
    if (preview && previewImg && fileName && fileSize) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        fileName.textContent = file.name;
        fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    }
}

function resetFileUpload() {
    const logoFile = safeGetElement('logoFile');
    const preview = safeGetElement('filePreview');
    
    if (logoFile) logoFile.value = '';
    if (preview) preview.style.display = 'none';
    
    state.currentUpload.ipfsCID = null;
}

async function uploadToIPFS(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        return result.ipfsHash;
        
    } catch (error) {
        console.error('❌ IPFS upload error:', error);
        throw error;
    }
}

function validateForm() {
    const tokenName = safeGetElement('tokenName')?.value.trim();
    const tokenSupply = safeGetElement('tokenSupply')?.value.trim();
    const ipfsCID = state.currentUpload.ipfsCID;
    
    const isValid = tokenName && tokenSupply && ipfsCID && 
                   state.wallet.connected && 
                   parseInt(tokenSupply) > 0;
    
    const submitBtn = safeGetElement('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
        submitBtn.textContent = isValid ? 'Mint Token' : 'Complete All Fields';
    }
    
    return isValid;
}

async function handleMintSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        showError('Please complete all required fields');
        return;
    }
    
    if (!state.backend.connected) {
        showError('Backend connection required. Please check your connection.');
        return;
    }
    
    try {
        const formData = new FormData(event.target);
        const tokenData = {
            tokenName: formData.get('tokenName').trim(),
            tokenSymbol: formData.get('tokenSymbol').trim(),
            tokenDescription: formData.get('tokenDescription').trim(),
            tokenSupply: parseInt(formData.get('tokenSupply')),
            recipientAddress: state.wallet.address,
            ipfsCID: state.currentUpload.ipfsCID
        };
        
        console.log('🎯 Starting token minting process...');
        console.log('Token data:', tokenData);
        
        await mintToken(tokenData);
        
    } catch (error) {
        console.error('❌ Mint submission failed:', error);
        showError('Failed to submit mint request: ' + error.message);
    }
}

async function mintToken(tokenData) {
    try {
        showLoading('Minting Token', 'Building transaction...');
        
        // Get UTXOs from wallet
        console.log('💰 Getting UTXOs from wallet...');
        const utxos = await state.wallet.api.getUtxos();
        
        if (!utxos || utxos.length === 0) {
            throw new Error('No UTXOs found in wallet. Please ensure your wallet has ADA.');
        }
        
        console.log('✅ Found', utxos.length, 'UTXOs');
        
        // Extract key hash from wallet
        console.log('🔑 Extracting key hash...');
        const changeAddress = await state.wallet.api.getChangeAddress();
        const keyHash = await extractKeyHash(changeAddress);
        
        if (!keyHash) {
            throw new Error('Failed to extract key hash from wallet');
        }
        
        console.log('✅ Key hash extracted:', keyHash);
        
        // Build transaction
        console.log('🔨 Building unsigned transaction...');
        const requestBody = {
            utxos: utxos,
            changeAddress: changeAddress,
            recipientAddress: tokenData.recipientAddress,
            tokenName: tokenData.tokenName,
            tokenSupply: tokenData.tokenSupply,
            userKeyHash: keyHash,
            ipfsCID: tokenData.ipfsCID
        };
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/build-mint-tx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to build transaction');
        }
        
        const result = await response.json();
        const unsignedTx = result.unsignedTx;
        
        console.log('✅ Transaction built successfully');
        console.log('🆔 Policy ID:', result.policyId);
        
        // Update loading message
        showLoading('Minting Token', 'Please sign the transaction in your wallet...');
        
        // Sign transaction
        console.log('✍️ Signing transaction...');
        const signedTx = await state.wallet.api.signTx(unsignedTx, true);
        
        console.log('✅ Transaction signed successfully');
        
        // Submit transaction
        console.log('📤 Submitting transaction...');
        showLoading('Minting Token', 'Submitting transaction to blockchain...');
        
        const submitResponse = await fetch(`${CONFIG.BACKEND_URL}/submit-tx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                signedTx: signedTx
            })
        });
        
        if (!submitResponse.ok) {
            const error = await submitResponse.json();
            throw new Error(error.error || 'Failed to submit transaction');
        }
        
        const submitResult = await submitResponse.json();
        
        console.log('✅ Transaction submitted successfully');
        console.log('🔗 Transaction hash:', submitResult.txHash);
        
        // Show success
        closeModal('loadingModal');
        showSuccess({
            txHash: submitResult.txHash,
            policyId: result.policyId,
            assetName: result.assetName,
            tokenSupply: result.tokenSupply,
            explorerUrl: submitResult.explorerUrl
        });
        
        // Reset form
        resetForm();
        
    } catch (error) {
        console.error('❌ Token minting failed:', error);
        closeModal('loadingModal');
        showError('Token minting failed: ' + error.message);
    }
}

// Helper function to extract key hash from address
async function extractKeyHash(address) {
    try {
        // For Eternl wallet, we need to get the key hash from the address
        // This is a simplified approach - in production you might want to use a more robust method
        
        // Try to get the key hash from the wallet API
        const networkId = await state.wallet.api.getNetworkId();
        const addresses = await state.wallet.api.getUsedAddresses();
        
        // Use a simple approach - extract from the first used address
        if (addresses && addresses.length > 0) {
            // This is a placeholder - you would need to implement proper key hash extraction
            // For now, return a dummy hash to test the flow
            return 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0';
        }
        
        return null;
    } catch (error) {
        console.error('❌ Failed to extract key hash:', error);
        return null;
    }
}

function updateUI() {
    updateWalletUI();
    validateForm();
}

function updateWalletUI() {
    const connectBtn = safeGetElement('connectWallet');
    const disconnectBtn = safeGetElement('disconnectWallet');
    const walletInfo = safeGetElement('walletInfo');
    const walletAddress = safeGetElement('walletAddress');
    
    if (state.wallet.connected) {
        if (connectBtn) connectBtn.style.display = 'none';
        if (disconnectBtn) disconnectBtn.style.display = 'block';
        if (walletInfo) walletInfo.style.display = 'block';
        if (walletAddress) {
            const shortAddress = state.wallet.address.substring(0, 10) + '...' + state.wallet.address.substring(state.wallet.address.length - 10);
            walletAddress.textContent = shortAddress;
        }
    } else {
        if (connectBtn) connectBtn.style.display = 'block';
        if (disconnectBtn) disconnectBtn.style.display = 'none';
        if (walletInfo) walletInfo.style.display = 'none';
    }
}

function resetForm() {
    const mintForm = safeGetElement('mintForm');
    if (mintForm) {
        mintForm.reset();
    }
    resetFileUpload();
    validateForm();
}

function showLoading(title, message) {
    const modal = safeGetElement('loadingModal');
    const titleEl = safeGetElement('loadingTitle');
    const messageEl = safeGetElement('loadingMessage');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.style.display = 'flex';
}

function showSuccess(result) {
    const modal = safeGetElement('successModal');
    const txHash = safeGetElement('successTxHash');
    const policyId = safeGetElement('successPolicyId');
    const explorerLink = safeGetElement('explorerLink');
    
    if (txHash) txHash.textContent = result.txHash;
    if (policyId) policyId.textContent = result.policyId;
    if (explorerLink) explorerLink.href = result.explorerUrl;
    if (modal) modal.style.display = 'flex';
    
    triggerCelebration();
}

function showError(message) {
    const modal = safeGetElement('errorModal');
    const errorMessage = safeGetElement('errorMessage');
    
    if (errorMessage) errorMessage.textContent = message;
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = safeGetElement(modalId);
    if (modal) modal.style.display = 'none';
}

function handleModalClick(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function copyToClipboard(elementId) {
    const element = safeGetElement(elementId);
    if (element) {
        const text = element.textContent;
        navigator.clipboard.writeText(text).then(() => {
            console.log('✅ Copied to clipboard:', text);
            
            // Show visual feedback
            const originalText = element.textContent;
            element.textContent = 'Copied!';
            element.style.color = '#10b981';
            
            setTimeout(() => {
                element.textContent = originalText;
                element.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('❌ Failed to copy:', err);
        });
    }
}

function triggerCelebration() {
    // Simple celebration animation
    const body = document.body;
    body.classList.add('celebration');
    
    setTimeout(() => {
        body.classList.remove('celebration');
    }, 3000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 TMT Lucid Frontend Starting...');
    
    initializeEventListeners();
    checkBackendStatus();
    updateUI();
    
    console.log('✅ Frontend initialized');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        state,
        CONFIG,
        connectWallet,
        disconnectWallet,
        uploadToIPFS,
        mintToken
    };
} 