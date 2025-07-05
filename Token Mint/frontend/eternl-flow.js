// 🔥 CLEAN ETERNL WALLET FLOW - EXACT PATTERN
// Based on user's step-by-step instructions

const CONFIG = {
    BACKEND_URL: 'http://localhost:3001'
};

class EternlFlow {
    constructor() {
        this.walletApi = null;
        this.connected = false;
    }

    // ✅ 1. Connect Wallet (Eternl)
    async connectWallet() {
        console.log('🔗 Step 1: Connect Wallet (Eternl)');
        
        if (!window.cardano || !window.cardano.eternl) {
            throw new Error('Eternl wallet not found. Please install Eternl wallet extension.');
        }

        const walletApi = await window.cardano.eternl.enable();
        this.walletApi = walletApi;
        this.connected = true;
        
        console.log('✅ Wallet connected successfully');
        return walletApi;
    }

    // ✅ 2. Get UTXOs & Address
    async getWalletData() {
        console.log('🔗 Step 2: Get UTXOs & Address');
        
        if (!this.walletApi) {
            throw new Error('Wallet not connected');
        }

        const utxos = await this.walletApi.getUtxos(); // Hex CBOR
        const address = await this.walletApi.getChangeAddress(); // Hex
        
        console.log('✅ UTXOs count:', utxos.length);
        console.log('✅ Change address:', address);
        
        return { utxos, address };
    }

    // ✅ 3. Get unsigned transaction from backend (CBOR hex)
    async buildUnsignedTx(utxos, address, tokenData) {
        console.log('🔗 Step 3: Build unsigned transaction');
        
        const requestBody = {
            utxos,
            changeAddress: address,
            recipientAddress: tokenData.recipientAddress,
            tokenName: tokenData.tokenName,
            tokenSupply: parseInt(tokenData.tokenSupply),
            userKeyHash: 'EXTRACT_FROM_BACKEND', // Backend will extract from address
            ipfsCID: tokenData.ipfsCID
        };

        const response = await fetch(`${CONFIG.BACKEND_URL}/build-mint-tx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to build unsigned transaction');
        }

        const result = await response.json();
        const unsignedTxHex = result.unsignedTx;
        
        console.log('✅ Unsigned transaction built');
        console.log('📏 CBOR length:', unsignedTxHex.length);
        console.log('🆔 Policy ID:', result.policyId);
        
        return { unsignedTxHex, policyId: result.policyId };
    }

    // ✅ 4. Sign transaction
    async signTx(unsignedTxHex) {
        console.log('🔗 Step 4: Sign transaction');
        
        if (!this.walletApi) {
            throw new Error('Wallet not connected');
        }

        const signedTxHex = await this.walletApi.signTx(unsignedTxHex, true); // autoSubmit = true
        
        console.log('✅ Transaction signed');
        console.log('📏 Signed TX length:', signedTxHex.length);
        
        return signedTxHex;
    }

    // ✅ 5. Submit transaction
    async submitTx(signedTxHex) {
        console.log('🔗 Step 5: Submit transaction');
        
        if (!this.walletApi) {
            throw new Error('Wallet not connected');
        }

        const txHash = await this.walletApi.submitTx(signedTxHex);
        
        console.log('✅ Transaction submitted');
        console.log('🔗 Transaction hash:', txHash);
        
        return txHash;
    }

    // 🎯 COMPLETE FLOW - All steps in sequence
    async mintToken(tokenData) {
        try {
            console.log('🚀 Starting Complete Eternl Flow...');
            
            // Step 1: Connect wallet
            if (!this.connected) {
                await this.connectWallet();
            }

            // Step 2: Get wallet data
            const { utxos, address } = await this.getWalletData();

            // Step 3: Build unsigned transaction
            const { unsignedTxHex, policyId } = await this.buildUnsignedTx(utxos, address, tokenData);

            // Step 4: Sign transaction
            const signedTxHex = await this.signTx(unsignedTxHex);

            // Step 5: Submit transaction
            const txHash = await this.submitTx(signedTxHex);

            console.log('🎉 COMPLETE FLOW SUCCESSFUL!');
            console.log('🔗 Transaction hash:', txHash);
            console.log('🆔 Policy ID:', policyId);
            
            return {
                success: true,
                txHash,
                policyId,
                explorerUrl: `https://cardanoscan.io/transaction/${txHash}`
            };

        } catch (error) {
            console.error('❌ Flow failed:', error);
            throw error;
        }
    }
}

// 🎯 USAGE EXAMPLE
async function testEternlFlow() {
    const flow = new EternlFlow();
    
    const tokenData = {
        recipientAddress: 'addr1...', // Your recipient address
        tokenName: 'TestToken',
        tokenSupply: 1,
        ipfsCID: 'QmYourImageCID'
    };

    try {
        const result = await flow.mintToken(tokenData);
        console.log('🎉 Success:', result);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EternlFlow;
} else {
    window.EternlFlow = EternlFlow;
} 