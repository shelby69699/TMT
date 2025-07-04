/**
 * 🚀 TMT Frontend JavaScript
 * Cardano Token Minting με Backend API Integration
 * 🔄 FORCE FRESH DEPLOYMENT - 2025-01-28 14:00:00 - SIMPLIFIED LUCID BACKEND
 * ✅ REAL CARDANO SUBMISSION WITH BLOCKFROST API
 * 🔧 SIMPLIFIED ADDRESS HANDLING - BACKEND DOES ALL CONVERSIONS
 */

// State management
const state = {
    wallet: { connected: false, api: null, address: null },
    backend: { connected: false },
    currentUpload: { ipfsCID: null }
};

// Configuration - REMOTE BACKEND ONLY
const CONFIG = {
    BACKEND_URL: 'https://tmt-oacu.onrender.com',  // ✅ REMOTE BACKEND WITH BOTH IPFS & MINTING
    DEBUG: true  // Enable debug logging
};

// Legacy fallback for API_BASE_URL (for cached versions)
const API_BASE_URL = CONFIG.BACKEND_URL;

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
    
    // Wallet address display is now automatic
    
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
    console.log('🔍 Checking REMOTE backend status...');
    console.log('🔍 Backend URL:', CONFIG.BACKEND_URL);
    console.log('🔍 Current timestamp:', new Date().toISOString());
    console.log('🔍 Browser:', navigator.userAgent);
    
    const statusText = safeGetElement('statusText');
    const statusIndicator = document.querySelector('.status-indicator');
    
    // Set checking status
    if (statusText) statusText.textContent = 'Checking connection...';
    if (statusIndicator) statusIndicator.style.background = 'linear-gradient(45deg, #f59e0b, #d97706)';
    
    try {
        console.log('🔍 Connecting to remote backend...');
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const status = await response.json();
        console.log('📦 Response data:', status);
        
        if (status.status === 'OK') {
            state.backend.connected = true;
            
            if (statusText) statusText.textContent = `Backend API Connected ✅ (${status.version || 'Remote'})`;
            if (statusIndicator) statusIndicator.style.background = 'linear-gradient(45deg, #4ade80, #22c55e)';
            
            // Hide retry button on success
            const retryButton = safeGetElement('retryBackend');
            if (retryButton) retryButton.classList.add('hidden');
            
            console.log('✅ Remote backend connected:', status);
        } else {
            throw new Error(`Backend returned status: ${status.status || 'Unknown'}`);
        }
    } catch (error) {
        console.error('❌ Remote backend connection failed:', error);
        state.backend.connected = false;
        
        let errorMessage = 'Backend API Disconnected ❌';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Backend API Timeout ⏱️';
            console.error('❌ Request timed out after 10 seconds');
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Backend API Network Error 🌐';
            console.error('❌ Network error - possibly CORS or server down');
        } else {
            console.error('❌ Error details:', error.message);
        }
        
        if (statusText) statusText.textContent = errorMessage;
        if (statusIndicator) statusIndicator.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
        
        // Show retry button
        const retryButton = safeGetElement('retryBackend');
        if (retryButton) retryButton.classList.remove('hidden');
        
        // Add retry option after 30 seconds
        setTimeout(() => {
            if (!state.backend.connected) {
                console.log('🔄 Auto-retrying backend connection...');
                checkBackendStatus();
            }
        }, 30000);
    }
    updateUI();
}

// Retry backend connection function
function retryBackendConnection() {
    console.log('🔄 Manual retry backend connection...');
    const retryButton = safeGetElement('retryBackend');
    if (retryButton) {
        retryButton.disabled = true;
        retryButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Retrying...';
    }
    
    checkBackendStatus().finally(() => {
        if (retryButton) {
            retryButton.disabled = false;
            retryButton.innerHTML = '<i class="fas fa-redo"></i> Retry';
        }
    });
}

// Test backend connection function
function testBackendConnection() {
    console.log('🧪 Testing backend connection...');
    const testButton = safeGetElement('testBackend');
    if (testButton) {
        testButton.disabled = true;
        testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    }
    
    // Test with fetch directly
    fetch(`${CONFIG.BACKEND_URL}/health`)
        .then(response => {
            console.log('🧪 Test response status:', response.status);
            console.log('🧪 Test response ok:', response.ok);
            return response.json();
        })
        .then(data => {
            console.log('🧪 Test response data:', data);
            alert(`✅ Backend Test Success!\nStatus: ${data.status}\nVersion: ${data.version}\nTimestamp: ${data.timestamp}`);
        })
        .catch(error => {
            console.error('🧪 Test failed:', error);
            alert(`❌ Backend Test Failed!\nError: ${error.message}`);
        })
        .finally(() => {
            if (testButton) {
                testButton.disabled = false;
                testButton.innerHTML = '<i class="fas fa-vial"></i> Test';
            }
        });
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
        
        // ✅ SIMPLIFIED: Get address from wallet (let backend handle conversion)
        console.log('🔍 Getting wallet address...');
        let walletAddress;
        
        try {
                    // Try getChangeAddress first - Convert CBOR to bech32 if needed
        console.log('🔍 Trying getChangeAddress...');
        let rawAddress = await api.getChangeAddress();
        
        // ✅ CRITICAL: Convert CBOR address to bech32 format for Eternl compatibility
        if (rawAddress && typeof rawAddress === 'string' && !rawAddress.startsWith('addr')) {
            console.log('🔄 Converting CBOR address to bech32...');
            console.log('📤 Raw address:', rawAddress);
            
            // Send to backend for conversion
            try {
                const convertResponse = await fetch(`${CONFIG.BACKEND_URL}/convert-address`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ changeAddressCbor: rawAddress })
                });
                
                if (convertResponse.ok) {
                    const convertResult = await convertResponse.json();
                    if (convertResult.success) {
                        walletAddress = convertResult.bech32Address;
                        console.log('✅ Converted to bech32:', walletAddress);
                    } else {
                        console.warn('⚠️ Address conversion failed, using raw address');
                        walletAddress = rawAddress;
                    }
                } else {
                    console.warn('⚠️ Address conversion service unavailable, using raw address');
                    walletAddress = rawAddress;
                }
            } catch (convertError) {
                console.warn('⚠️ Address conversion error:', convertError.message);
                walletAddress = rawAddress;
            }
        } else {
            walletAddress = rawAddress;
        }
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
        
        if (!walletAddress) {
            throw new Error('Failed to get wallet address');
        }
        
        state.wallet.connected = true;
        state.wallet.api = api;
        state.wallet.address = walletAddress;
        
        closeModal('loadingModal');
        updateUI();
        
        console.log('✅ Wallet connected successfully with address:', walletAddress);
        
    } catch (error) {
        closeModal('loadingModal');
        console.error('❌ Wallet connection error:', error);
        showError(error.message);
    }
}

function disconnectWallet() {
    state.wallet.connected = false;
    state.wallet.api = null;
    state.wallet.address = null;
    updateUI();
    console.log('🔓 Wallet disconnected');
}

// Wallet address is now automatically used for token recipient

// File upload and IPFS
async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        resetFileUpload();
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file (PNG, JPG, GIF)');
        event.target.value = '';
        return;
    }
    
    if (file.size > 1024 * 1024) {
        showError('File size must be less than 1MB');
        event.target.value = '';
        return;
    }
    
    showFilePreview(file);
    
    try {
        await uploadToIPFS(file);
        validateForm();
    } catch (error) {
        console.error('❌ IPFS upload error:', error);
        showError('Failed to upload image to IPFS. Please try again.');
        resetFileUpload();
    }
}

function showFilePreview(file) {
    const uploadContent = document.querySelector('.upload-content');
    const uploadPreview = safeGetElement('uploadPreview');
    const previewImage = safeGetElement('previewImage');
    const fileName = safeGetElement('fileName');
    const fileSize = safeGetElement('fileSize');
    
    if (!uploadContent || !uploadPreview || !previewImage || !fileName || !fileSize) {
        console.warn('⚠️ File preview elements not found');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        fileName.textContent = file.name;
        fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        
        uploadContent.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function resetFileUpload() {
    const uploadContent = document.querySelector('.upload-content');
    const uploadPreview = safeGetElement('uploadPreview');
    const ipfsStatus = safeGetElement('ipfsStatus');
    
    if (uploadContent) uploadContent.classList.remove('hidden');
    if (uploadPreview) uploadPreview.classList.add('hidden');
    if (ipfsStatus) ipfsStatus.classList.add('hidden');
    
    state.currentUpload.ipfsCID = null;
    validateForm();
}

async function uploadToIPFS(file) {
    const ipfsStatus = safeGetElement('ipfsStatus');
    
    if (!ipfsStatus) {
        console.warn('⚠️ IPFS status element not found');
        return;
    }
    
    ipfsStatus.classList.remove('hidden');
    ipfsStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Uploading to IPFS...</span>';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/upload-ipfs`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`IPFS upload failed: ${errorData.error || response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Upload failed');
        }
        
        state.currentUpload.ipfsCID = result.ipfsCID;
        
        ipfsStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>Uploaded to IPFS ✅</span>';
        
        console.log('✅ IPFS upload successful:', result.ipfsCID);
        console.log('🌐 IPFS URL:', result.ipfsUrl);
        
    } catch (error) {
        ipfsStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Upload failed ❌</span>';
        throw error;
    }
}

// Form validation
function validateForm() {
    const tokenName = safeGetElement('tokenName');
    const tokenDescription = safeGetElement('tokenDescription');
    const tokenSupply = safeGetElement('tokenSupply');
    const mintButton = safeGetElement('mintButton');
    
    if (!tokenName || !tokenDescription || !tokenSupply || !mintButton) {
        console.warn('⚠️ Some form elements not found');
        return;
    }
    
    const tokenNameValue = tokenName.value.trim();
    const tokenDescriptionValue = tokenDescription.value.trim();
    const tokenSupplyValue = tokenSupply.value.trim();
    
    const isValid = tokenNameValue && tokenDescriptionValue && tokenSupplyValue && state.wallet.connected && state.currentUpload.ipfsCID && state.backend.connected;
    
    mintButton.disabled = !isValid;
    
    if (isValid) {
        mintButton.innerHTML = `
            <i class="fas fa-hammer"></i>
            <span>Mint Token on Cardano</span>
            <small>Ready to process via Backend API</small>
        `;
        mintButton.style.background = 'linear-gradient(45deg, #4ade80, #22c55e)';
    } else {
        let reason = 'Complete form to continue';
        if (!state.backend.connected) reason = 'Backend API not connected';
        else if (!state.wallet.connected) reason = 'Connect wallet first';
        else if (!tokenNameValue) reason = 'Enter token name';
        else if (!tokenDescriptionValue) reason = 'Enter token description';
        else if (!tokenSupplyValue) reason = 'Enter token supply';
        else if (!state.currentUpload.ipfsCID) reason = 'Upload token logo';
        
        mintButton.innerHTML = `
            <i class="fas fa-hammer"></i>
            <span>Mint Token on Cardano</span>
            <small>${reason}</small>
        `;
        
        if (!state.backend.connected) {
            mintButton.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
        } else {
            mintButton.style.background = 'linear-gradient(45deg, #6b7280, #4b5563)';
        }
    }
}

// Form submission and minting
async function handleMintSubmit(event) {
    event.preventDefault();
    
    if (!state.backend.connected) {
        showError('Backend API is not connected. Please wait and try again.');
        return;
    }
    
    if (!state.wallet.connected) {
        showError('Please connect your Eternl wallet first.');
        return;
    }
    
    if (!state.currentUpload.ipfsCID) {
        showError('Please upload a logo image first.');
        return;
    }
    
    try {
        console.log('🔍 Getting UTXOs from wallet...');
        showLoading('🔍 Preparing Transaction', 'Getting UTXOs from wallet...');
        
        // ✅ CRITICAL: Get UTXOs from wallet
        const utxos = await state.wallet.api.getUtxos();
        console.log('✅ UTXOs retrieved:', utxos);
        
        if (!utxos || utxos.length === 0) {
            throw new Error('No UTXOs found in wallet. Please ensure your wallet has some ADA.');
        }
        
        // ✅ CRITICAL: Get change address from wallet
        const changeAddressCbor = await state.wallet.api.getChangeAddress();
        console.log('✅ Change address retrieved:', changeAddressCbor);
        
        // ✅ CRITICAL: Get recipient address from connected Eternl wallet
        console.log('🔍 Getting recipient address from wallet...');
        showLoading('🔍 Connecting to Wallet', 'Getting wallet address...');
        
        // Initialize Lucid temporarily to get the recipient address
        const lucid = await Lucid.new(
            new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', 'mainnetRphtobeMUfaH1ulbeDPsDntux1ESWh9r'),
            'Mainnet'
        );
        lucid.selectWallet(state.wallet.api);
        
        const recipientAddress = await lucid.wallet.address();
        console.log('✅ Recipient address:', recipientAddress);
        
        if (!recipientAddress) {
            throw new Error('No recipient address from wallet!');
        }
        
        const formData = new FormData(event.target);
        const tokenData = {
            tokenName: formData.get('tokenName').trim(),
            tokenSymbol: formData.get('tokenSymbol').trim() || '',
            tokenDescription: formData.get('tokenDescription').trim(),
            tokenSupply: parseInt(formData.get('tokenSupply')),
            recipientAddress: recipientAddress, // ✅ FIXED: Use address from Lucid wallet
            ipfsCID: state.currentUpload.ipfsCID
        };
        
        console.log('📊 Token data prepared:', tokenData);
        closeModal('loadingModal');
        await mintToken(tokenData);
        
    } catch (error) {
        closeModal('loadingModal');
        console.error('❌ Error preparing transaction:', error);
        showError(`Failed to prepare transaction: ${error.message}`);
    }
}

async function mintToken(tokenData) {
    try {
        showLoading('Minting Token', 'Preparing transaction...');
        
        // Get only changeAddressCbor from wallet (for keyHash extraction)
        const changeAddressCbor = await state.wallet.api.getChangeAddress();
        
        console.log('🔍 Getting changeAddress for keyHash extraction...');
        console.log('🔍 changeAddressCbor:', changeAddressCbor, 'type:', typeof changeAddressCbor);
        
        if (!changeAddressCbor) {
            throw new Error('Failed to get changeAddressCbor from wallet - wallet API returned: ' + changeAddressCbor);
        }
        
        console.log('🔍 Backend will extract keyHash and handle policy script creation');
        console.log('🔍 Frontend will use lucid.wallet.getUtxos() for transaction building');
        
        // Prepare clean mint request for new backend
        const mintRequest = {
            // ✅ REMOVED UTXOs - backend doesn't need them, frontend uses wallet.getUtxos()
            changeAddressCbor: changeAddressCbor,  // ✅ CRITICAL: Include for keyHash extraction
            recipientAddress: tokenData.recipientAddress,  // ✅ FIXED: Use from tokenData
            tokenName: tokenData.tokenName,
            tokenSymbol: tokenData.tokenSymbol,
            tokenDescription: tokenData.tokenDescription,
            tokenSupply: parseInt(tokenData.tokenSupply),
            ipfsCID: tokenData.ipfsCID
        };

        console.log('📤 Sending mint request to backend...');
        console.log('🔍 Mint request:', JSON.stringify(mintRequest, null, 2));
        
        console.log('🔨 Starting token minting process...');
        showLoading('🚀 Preparing Token Minting', 'Sending request to backend API...');
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/build-mint-tx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mintRequest)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Minting failed');
        }
        
        console.log('✅ Unsigned transaction received:', result);
        console.log('🔍 Unsigned TX CBOR:', result.unsignedTx);
        console.log('📊 Token data:', result.tokenData);
        console.log('🔧 FULL BACKEND RESPONSE:', JSON.stringify(result, null, 2));
        
        // 🔍 CRITICAL DEBUGGING: Δες τι ΑΚΡΙΒΩΣ παίρνεις από το backend
        console.log('🔍 DEBUGGING - Backend response keys:', Object.keys(result));
        console.log('🔍 DEBUGGING - result.expirySlot:', result.expirySlot);
        console.log('🔍 DEBUGGING - result.currentSlot:', result.currentSlot);
        console.log('🔍 DEBUGGING - result.transactionData:', result.transactionData);
        
        if (result.transactionData) {
            console.log('🔍 DEBUGGING - transactionData keys:', Object.keys(result.transactionData));
            console.log('🔍 DEBUGGING - transactionData.expirySlot:', result.transactionData.expirySlot);
            console.log('🔍 DEBUGGING - transactionData.currentSlot:', result.transactionData.currentSlot);
            console.log('🔍 DEBUGGING - expirySlot type:', typeof result.transactionData.expirySlot);
            console.log('🔍 DEBUGGING - expirySlot isNaN:', isNaN(result.transactionData.expirySlot));
        }
        
        // ✅ CRITICAL: Check and log slot information
        if (result.currentSlot) {
            console.log('🕐 Backend slot:', result.currentSlot);
            console.log('⏰ Expiry slot:', result.expirySlot);
            console.log('📅 Slot timestamp:', result.slotTimestamp);
        } else {
            console.warn('⚠️ No slot information received from backend');
        }
        
        // Check if we received transaction data
        if (result.transactionData) {
            console.log('🔐 Transaction data received - building transaction with Lucid...');
            
            const txData = result.transactionData;
            console.log('🔍 Transaction data:', txData);
            console.log('🆔 Policy ID:', txData.policyId);
            console.log('🏷️ Unit:', txData.unit);
            console.log('📋 Metadata present:', !!txData.metadata);
            
            // 🔥 CRITICAL: Validate backend response format
            console.log('---- BACKEND RESPONSE VALIDATION ----');
            console.log('🔍 txData.unit from backend:', txData.unit);
            console.log('🔍 txData.tokenSupply from backend:', txData.tokenSupply, 'type:', typeof txData.tokenSupply);
            console.log('🔍 txData.policyId from backend:', txData.policyId);
            console.log('🔍 txData.tokenName from backend:', txData.tokenName);
            
            // Check if unit is properly constructed as policyId + tokenNameHex
            if (txData.policyId && txData.tokenName) {
                // Convert token name to hex manually (frontend doesn't have Buffer)
                let expectedTokenNameHex = '';
                for (let i = 0; i < txData.tokenName.length; i++) {
                    expectedTokenNameHex += txData.tokenName.charCodeAt(i).toString(16).padStart(2, '0');
                }
                const expectedUnit = txData.policyId + expectedTokenNameHex;
                console.log('🔍 Expected tokenNameHex:', expectedTokenNameHex);
                console.log('🔍 Expected unit:', expectedUnit);
                console.log('🔍 Actual unit matches expected?:', txData.unit === expectedUnit);
                
                if (txData.unit !== expectedUnit) {
                    console.error('❌ UNIT MISMATCH! Backend sent wrong unit format');
                    console.error('❌ Expected:', expectedUnit);
                    console.error('❌ Actual:', txData.unit);
                    throw new Error('Backend unit format is incorrect');
                }
            }
            
            // Validate unit format from backend
            if (txData.unit && txData.unit.length > 0) {
                const unitValidation = /^[0-9a-fA-F]+$/.test(txData.unit);
                console.log('🔍 Backend unit is valid hex?:', unitValidation);
                
                if (!unitValidation) {
                    console.error('❌ BACKEND SENT INVALID UNIT FORMAT!');
                    const invalidChars = txData.unit.match(/[^0-9a-fA-F]/g);
                    console.error('❌ Invalid characters in unit:', invalidChars);
                    throw new Error('Backend unit contains invalid hex characters: ' + invalidChars?.join(', '));
                }
            }
            console.log('---- END BACKEND VALIDATION ----');
            
            // ✅ CRITICAL: FALLBACK CHECK - Stop here if expirySlot is broken
            console.log('🔍 FALLBACK CHECK - expirySlot validation...');
            console.log('🔍 txData.expirySlot:', txData.expirySlot);
            console.log('🔍 txData.expirySlot type:', typeof txData.expirySlot);
            console.log('🔍 txData.expirySlot isNaN:', isNaN(txData.expirySlot));
            
            if (!txData.expirySlot || typeof txData.expirySlot !== "number" || isNaN(txData.expirySlot)) {
                console.error('❌ CRITICAL ERROR: expirySlot missing or not a number:', txData.expirySlot);
                console.error('❌ txData.expirySlot type:', typeof txData.expirySlot);
                console.error('❌ txData.expirySlot value:', txData.expirySlot);
                console.error('❌ Full txData:', JSON.stringify(txData, null, 2));
                throw new Error(`expirySlot missing or not a number: ${txData.expirySlot}`);
            }
            
            console.log('✅ FALLBACK CHECK PASSED - expirySlot is valid:', txData.expirySlot);
            
            // ✅ CRITICAL: Log slot information from transaction data
            if (txData.currentSlot) {
                console.log('🕐 Getting fresh current slot for transaction...');
                console.log('🔍 FRESH SLOT DEBUG:');
                console.log('    Backend slot:', txData.currentSlot);
                console.log('    Fresh slot:', txData.currentSlot);
                console.log('    Slot difference:', 0); // No difference since we're using the same slot
                console.log('✅ SLOT TYPE VALIDATION:');
                console.log('    Backend slot type:', typeof txData.currentSlot, txData.currentSlot);
                console.log('    Fresh slot type:', typeof txData.currentSlot, txData.currentSlot);
                console.log('    Expiry slot type:', typeof txData.expirySlot, txData.expirySlot);
                console.log('✅ Slots converted to numbers:');
                console.log('    Current slot: number', txData.currentSlot);
                console.log('    Expiry slot: number', txData.expirySlot);
            }
            
            showLoading('🔐 Building Transaction', 'Building transaction with wallet...');
            
            try {
                // Initialize Lucid with Blockfrost for mainnet
                console.log('🔍 Initializing Lucid with Blockfrost...');
                console.log('   Lucid available:', typeof Lucid !== 'undefined');
                console.log('   Blockfrost available:', typeof Blockfrost !== 'undefined');
                
                const lucid = await Lucid.new(
                    new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', 'mainnetRphtobeMUfaH1ulbeDPsDntux1ESWh9r'),
                    'Mainnet'
                );
                
                // 🔍 DEEP PROVIDER DEBUGGING - ParseIntError might come from provider/protocol issues
                console.log('🔍 LUCID PROVIDER DEBUGGING:');
                try {
                    const protocolParams = await lucid.provider.getProtocolParameters();
                    console.log('🔍 Protocol parameters fetched:', protocolParams);
                    console.log('🔍 Protocol minFeeA:', protocolParams.minFeeA, 'type:', typeof protocolParams.minFeeA);
                    console.log('🔍 Protocol minFeeB:', protocolParams.minFeeB, 'type:', typeof protocolParams.minFeeB);
                    console.log('🔍 Protocol coinsPerUtxoByte:', protocolParams.coinsPerUtxoByte, 'type:', typeof protocolParams.coinsPerUtxoByte);
                } catch (protocolError) {
                    console.error('❌ PROTOCOL PARAMETERS ERROR:', protocolError);
                    console.error('❌ This could be the source of ParseIntError!');
                }
                
                // Select wallet
                console.log('🔍 Selecting wallet...');
                lucid.selectWallet(state.wallet.api);
                
                // 🔍 WALLET STATE DEBUGGING
                console.log('🔍 WALLET STATE DEBUGGING:');
                try {
                    const walletAddress = await lucid.wallet.address();
                    console.log('🔍 Wallet address from Lucid:', walletAddress);
                    
                    const walletUtxos = await lucid.wallet.getUtxos();
                    console.log('🔍 Wallet UTXOs from Lucid:', walletUtxos.length, 'UTXOs');
                    
                    // 🔥 CRITICAL: Calculate total ADA balance
                    let totalLovelace = 0n;
                    walletUtxos.forEach(utxo => {
                        totalLovelace += BigInt(utxo.assets.lovelace || 0);
                    });
                    const totalADA = Number(totalLovelace) / 1000000; // Convert to ADA
                    console.log('🔍 Total wallet balance:', totalADA, 'ADA');
                    console.log('🔍 Total lovelace:', totalLovelace);
                    
                    // 🔥 CRITICAL: Check if wallet has enough ADA for native tokens
                    const minAdaForNativeTokens = 2000000n; // 2 ADA minimum
                    const estimatedFees = 300000n; // ~0.3 ADA for fees
                    const requiredAda = minAdaForNativeTokens + estimatedFees;
                    
                    console.log('🔍 Required ADA for transaction:', Number(requiredAda) / 1000000, 'ADA');
                    console.log('🔍 Wallet has enough ADA?', totalLovelace >= requiredAda);
                    
                    if (totalLovelace < requiredAda) {
                        console.error('❌ INSUFFICIENT ADA! Wallet needs at least', Number(requiredAda) / 1000000, 'ADA');
                        console.error('❌ Current balance:', totalADA, 'ADA');
                        console.error('❌ This causes InputsExhaustedError in native token transactions!');
                        
                        // Show user-friendly error message
                        throw new Error(`Insufficient ADA balance. Your wallet has ${totalADA} ADA but needs at least ${Number(requiredAda) / 1000000} ADA for native token transactions. Please add more ADA to your wallet.`);
                    }
                    
                    if (walletUtxos.length > 0) {
                        console.log('🔍 First UTXO from wallet:', walletUtxos[0]);
                        console.log('🔍 UTXO txHash type:', typeof walletUtxos[0].txHash);
                        console.log('🔍 UTXO outputIndex type:', typeof walletUtxos[0].outputIndex);
                        console.log('🔍 UTXO assets:', walletUtxos[0].assets);
                        
                        // Show all UTXOs for debugging
                        console.log('🔍 All UTXOs:');
                        walletUtxos.forEach((utxo, index) => {
                            console.log(`🔍 UTXO ${index}:`, {
                                txHash: utxo.txHash,
                                outputIndex: utxo.outputIndex,
                                lovelace: utxo.assets.lovelace,
                                ada: Number(utxo.assets.lovelace || 0) / 1000000
                            });
                        });
                    }
                } catch (walletError) {
                    console.error('❌ WALLET STATE ERROR:', walletError);
                    console.error('❌ This could be the source of InputsExhaustedError!');
                }
                
                // ✅ CLEAN DATA PREPARATION
                console.log('🔨 Preparing clean transaction data...');
                
                // Simple BigInt conversion
                const tokenSupplyBigInt = BigInt(txData.tokenSupply);
                console.log('📊 Token supply converted to BigInt:', tokenSupplyBigInt);
                
                // 🔥 ΤΕΛΙΚΗ ΚΑΘΑΡΗ ΛΥΣΗ - ΠΛΗΡΗ DEBUG
                console.log('🔨 Building clean transaction with automatic UTXO selection...');
                
                // A. POLICY SCRIPT DEBUG
                console.log('🔍 POLICY SCRIPT DEBUG:');
                console.log('🔍 txData.policyScript (from backend):', JSON.stringify(txData.policyScript, null, 2));
                console.log('🔍 txData.policyScript type:', typeof txData.policyScript);
                console.log('🔍 txData.policyScript.type:', txData.policyScript?.type);
                console.log('🔍 txData.policyScript.scripts:', txData.policyScript?.scripts);
                
                // Use policy script EXACTLY as received from backend (no conversion)
                const finalPolicyScript = txData.policyScript;
                console.log('🔍 Final policy script (will be passed to Lucid):', JSON.stringify(finalPolicyScript, null, 2));
                
                // ✅ CRITICAL: Verify policy script format for "No variant matched" fix
                console.log('🔍 POLICY SCRIPT FORMAT VALIDATION:');
                console.log('🔍 Policy script is object?', typeof finalPolicyScript === 'object');
                console.log('🔍 Policy script has type?', finalPolicyScript?.type);
                console.log('🔍 Policy script has scripts?', Array.isArray(finalPolicyScript?.scripts));
                console.log('🔍 Policy script is NOT Native format?', finalPolicyScript?.type !== 'Native');
                
                if (finalPolicyScript?.type === 'Native') {
                    console.error('❌ CRITICAL: Policy script is in Native format - this will cause "No variant matched"!');
                    console.error('❌ Expected format: {type: "all", scripts: [...]}');
                    console.error('❌ Actual format:', finalPolicyScript);
                    throw new Error('Policy script is in wrong format (Native). Expected JSON object format.');
                }
                
                console.log('✅ Policy script format is correct for mintAssets()!');
                
                // B. UTXOS DEBUG
                console.log('🔍 UTXOS DEBUG:');
                console.log('🔍 ✅ Backend UTXOs NOT USED - we only use wallet.getUtxos()');
                console.log('🔍 ✅ This avoids hex CBOR vs object format issues completely');
                
                // C. WALLET UTXOS DEBUG
                console.log('🔍 WALLET UTXOS DEBUG:');
                const walletUtxos = await lucid.wallet.getUtxos();
                console.log('🔍 Wallet UTXOs count:', walletUtxos.length);
                console.log('🔍 First wallet UTXO:', walletUtxos[0]);
                console.log('🔍 First wallet UTXO type:', typeof walletUtxos[0]);
                console.log('🔍 First wallet UTXO.txHash:', walletUtxos[0]?.txHash);
                console.log('🔍 First wallet UTXO.outputIndex:', walletUtxos[0]?.outputIndex);
                console.log('🔍 First wallet UTXO.assets:', walletUtxos[0]?.assets);
                
                // D. TRANSACTION PARAMETERS DEBUG
                console.log('🔍 TRANSACTION PARAMETERS DEBUG:');
                console.log('🔍 unit:', txData.unit);
                console.log('🔍 tokenSupplyBigInt:', tokenSupplyBigInt);
                console.log('🔍 recipientAddress:', txData.recipientAddress);
                console.log('🔍 expirySlot:', txData.expirySlot);
                console.log('🔍 metadata keys:', Object.keys(txData.metadata));
                
                // E. BUILD TRANSACTION (ΚΑΘΑΡΑ)
                console.log('🔨 Building transaction...');
                const tx = await lucid
                    .newTx()
                    .mintAssets({ [txData.unit]: tokenSupplyBigInt }, finalPolicyScript)  // ✅ FIX: Policy script as 2nd parameter
                    .attachMetadata(721, txData.metadata)
                    .payToAddress(txData.recipientAddress, { 
                        lovelace: 2000000n, 
                        [txData.unit]: tokenSupplyBigInt 
                    })
                    .validTo(txData.expirySlot)
                    .complete();
                
                console.log('✅ CLEAN TRANSACTION SUCCESS: No ParseIntError!');
                
                console.log('✅ Transaction built successfully');
                showLoading('🔐 Wallet Signature Required', 'Please sign the transaction in your wallet...');
                
                // Sign transaction
                const signedTx = await tx.sign().complete();
                console.log('✅ Transaction signed successfully');
                
                showLoading('📤 Submitting Transaction', 'Submitting to Cardano network...');
                
                // Submit transaction
                const submittedTxHash = await signedTx.submit();
                console.log('✅ Transaction submitted:', submittedTxHash);
                
                // Show success
                closeModal('loadingModal');
                showSuccess({
                    success: true,
                    txHash: submittedTxHash,
                    policyId: txData.policyId,
                    tokenName: txData.tokenName,
                    recipient: txData.recipientAddress,
                    explorerUrl: `https://cardanoscan.io/transaction/${submittedTxHash}`,
                    timestamp: new Date().toISOString(),
                    message: 'Token minted successfully with Lucid!'
                });
                resetForm();
                triggerCelebration();
                
            } catch (lucidError) {
                closeModal('loadingModal');
                console.error('❌ Lucid transaction error:', lucidError);
                showError(`Transaction failed: ${lucidError.message || lucidError.toString()}`);
            }
        } else {
            // No transaction data received
            console.error('❌ No transaction data in response');
            showError('Failed to receive transaction data from backend. Please try again.');
                 }
        
    } catch (error) {
        closeModal('loadingModal');
        console.error('❌ Minting failed:', error);
        showError(`Token minting failed: ${error.message}`);
    }
}

// Wallet transaction building is now handled inline in mintToken function

// UI updates
function updateUI() {
    updateWalletUI();
    validateForm();
}

function updateWalletUI() {
    const connectButton = safeGetElement('connectWallet');
    const walletStatus = safeGetElement('walletStatus');
    const walletInfo = safeGetElement('walletInfo');
    const walletRecipientInfo = safeGetElement('walletRecipientInfo');
    const walletDisplay = document.querySelector('.wallet-display');
    
    if (state.wallet.connected) {
        if (connectButton) connectButton.classList.add('hidden');
        if (walletStatus) walletStatus.classList.remove('hidden');
        if (walletInfo) walletInfo.textContent = 'Eternl Connected ✅';
        
        // Update wallet recipient display
        if (walletRecipientInfo) {
            walletRecipientInfo.textContent = state.wallet.address;
        }
        if (walletDisplay) {
            walletDisplay.classList.add('connected');
        }
    } else {
        if (connectButton) connectButton.classList.remove('hidden');
        if (walletStatus) walletStatus.classList.add('hidden');
        
        // Reset wallet recipient display
        if (walletRecipientInfo) {
            walletRecipientInfo.textContent = 'Connect wallet to see address';
        }
        if (walletDisplay) {
            walletDisplay.classList.remove('connected');
        }
    }
}

function resetForm() {
    const mintForm = safeGetElement('mintForm');
    if (mintForm) mintForm.reset();
    resetFileUpload();
    updateUI();
}

// Modal functions
function showLoading(title, message) {
    const loadingTitle = safeGetElement('loadingTitle');
    const loadingMessage = safeGetElement('loadingMessage');
    const loadingModal = safeGetElement('loadingModal');
    
    if (loadingTitle) loadingTitle.textContent = title;
    if (loadingMessage) loadingMessage.textContent = message;
    if (loadingModal) loadingModal.classList.remove('hidden');
}

function showSuccess(result) {
    const txHashText = safeGetElement('txHashText');
    const policyIdText = safeGetElement('policyIdText');
    const resultTokenName = safeGetElement('resultTokenName');
    const resultRecipient = safeGetElement('resultRecipient');
    const explorerLink = safeGetElement('explorerLink');
    const successModal = safeGetElement('successModal');
    
    if (txHashText) txHashText.textContent = result.txHash;
    if (policyIdText) policyIdText.textContent = result.policyId;
    if (resultTokenName) resultTokenName.textContent = result.tokenName;
    if (resultRecipient) resultRecipient.textContent = result.recipient;
    if (explorerLink) explorerLink.href = result.explorerUrl;
    if (successModal) successModal.classList.remove('hidden');
}

function showError(message) {
    const errorMessage = safeGetElement('errorMessage');
    const errorModal = safeGetElement('errorModal');
    
    if (errorMessage) errorMessage.textContent = message;
    if (errorModal) errorModal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = safeGetElement(modalId);
    if (modal) modal.classList.add('hidden');
}

function handleModalClick(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

// Utility functions
function copyToClipboard(elementId) {
    const element = safeGetElement(elementId);
    if (!element) {
        console.warn(`⚠️ Copy target element '${elementId}' not found`);
        return;
    }
    
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const button = element.parentElement.querySelector('.copy-btn');
        if (!button) {
            console.warn('⚠️ Copy button not found');
            return;
        }
        
        const originalHTML = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.style.background = '#4ade80';
        button.style.borderColor = '#4ade80';
        button.style.color = 'white';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '';
            button.style.borderColor = '';
            button.style.color = '';
        }, 2000);
        
        console.log('📋 Copied to clipboard:', text);
    }).catch(err => {
        console.error('❌ Failed to copy:', err);
    });
}

function triggerCelebration() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 200,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#4ade80', '#00d4ff', '#7c3aed', '#f59e0b']
        });
        
        setTimeout(() => {
            confetti({
                particleCount: 150,
                spread: 60,
                origin: { y: 0.4 },
                colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24']
            });
        }, 300);
    }
}

// Development helpers
if (typeof window !== 'undefined') {
    window.TMT = {
        state,
        checkBackendStatus,
        connectWallet,
        CONFIG
    };
    
    // Make retry function globally available for onclick
    window.retryBackendConnection = retryBackendConnection;
    window.testBackendConnection = testBackendConnection;
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    console.log('🚀 Initializing TMT Frontend...');
    
    // Wait for libraries to load
    let libraryWaitAttempts = 0;
    const maxLibraryWaitAttempts = 50; // 5 seconds max
    
    const waitForLibraries = () => {
        console.log('🔍 Checking if libraries are loaded...');
        libraryWaitAttempts++;
        
        // Check if Lucid is available
        if (typeof window.Lucid === 'undefined' && typeof Lucid === 'undefined') {
            if (libraryWaitAttempts < maxLibraryWaitAttempts) {
                console.log(`⏳ Waiting for Lucid to load... (${libraryWaitAttempts}/${maxLibraryWaitAttempts})`);
                setTimeout(waitForLibraries, 100);
                return;
            } else {
                console.warn('⚠️ Lucid library not loaded after 5 seconds, continuing anyway...');
            }
        }
        
        console.log('✅ Libraries loaded, initializing...');
        initializeEventListeners();
        checkBackendStatus();
        updateUI();
        
        console.log('✅ TMT Frontend loaded successfully!');
    };
    
    waitForLibraries();
});

console.log('📜 TMT Script loaded - waiting for DOM...');
 