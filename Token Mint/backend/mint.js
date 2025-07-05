/**
 * Cardano Token Minting Engine
 * Uses @emurgo/cardano-serialization-lib-nodejs to build real unsigned transactions
 */

const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const { buildMetadata, buildAuxiliaryData } = require('./metadata');
const fs = require('fs');
const path = require('path');

// Verify CardanoWasm library loaded correctly
console.log('🔍 CardanoWasm library version check:');
console.log('   - Library loaded:', !!CardanoWasm);
console.log('   - BigNum available:', !!CardanoWasm.BigNum);
console.log('   - AssetName available:', !!CardanoWasm.AssetName);
console.log('   - Address available:', !!CardanoWasm.Address);
console.log('   - TransactionBuilder available:', !!CardanoWasm.TransactionBuilder);

// ✅ CRITICAL: Load Protocol parameters from file
const PROTOCOL_PARAMS = (() => {
    try {
        const protocolParamsPath = path.join(__dirname, 'protocol-params.json');
        const protocolParams = JSON.parse(fs.readFileSync(protocolParamsPath, 'utf8'));
        console.log('✅ Protocol parameters loaded from file');
        return protocolParams;
    } catch (error) {
        console.error('❌ Failed to load protocol parameters from file:', error.message);
        console.log('⚠️ Using fallback protocol parameters');
        // Fallback to hardcoded values
        return {
            "min_fee_a": 44,
            "min_fee_b": 155381,
            "key_deposit": 2000000,
            "pool_deposit": 500000000,
            "max_tx_size": 16384,
            "max_val_size": 5000,
            "collateral_percent": 150,
            "max_collateral_inputs": 3,
            "coins_per_utxo_byte": 4310,
            "price_mem": 0.0577,
            "price_step": 0.0000721,
            "max_tx_ex_mem": 14000000,
            "max_tx_ex_steps": 10000000000,
            "protocol_version": {
                "major": 8,
                "minor": 1
            }
        };
    }
})();

async function buildUnsignedMintTransaction(tokenData) {
    try {
        console.log('🔨 Building unsigned mint transaction...');
        
        // Extract and validate all required fields
        const {
            tokenName,
            tokenSymbol,
            tokenSupply,
            tokenDescription,
            recipientAddress,
            ipfsCID,
            utxos,
            changeAddress,  // ✅ REQUIRED: Change address from wallet
            userKeyHash,    // ✅ CRITICAL: User's keyHash for policy script
            userAddresses   // ✅ CRITICAL: User's addresses for UTXO validation
        } = tokenData;
        
        // Validate required fields
        if (!tokenName || typeof tokenName !== 'string') {
            throw new Error('Invalid tokenName: ' + tokenName);
        }
        
        if (!tokenSupply || isNaN(tokenSupply) || tokenSupply <= 0) {
            throw new Error('Invalid tokenSupply: ' + tokenSupply);
        }
        
        if (!recipientAddress || typeof recipientAddress !== 'string') {
            throw new Error('Invalid recipientAddress: ' + recipientAddress);
        }
        
        if (!ipfsCID || typeof ipfsCID !== 'string') {
            throw new Error('Invalid ipfsCID: ' + ipfsCID);
        }
        
        if (!utxos || !Array.isArray(utxos) || utxos.length === 0) {
            throw new Error('Invalid utxos: ' + utxos);
        }
        
        if (!changeAddress || typeof changeAddress !== 'string') {
            throw new Error('Invalid changeAddress: ' + changeAddress);
        }
        
        // ✅ CRITICAL: Validate or extract user keyHash
        if (!userKeyHash || typeof userKeyHash !== 'string') {
            throw new Error('Invalid userKeyHash: ' + userKeyHash);
        }

        // Handle frontend keyHash extraction fallback
        let finalUserKeyHash = userKeyHash; // Create mutable variable
        if (userKeyHash === 'EXTRACT_FROM_BACKEND') {
            console.log('🔑 Frontend keyHash extraction failed - extracting from changeAddressCbor...');
            
            const { changeAddressCbor } = tokenData;
            if (!changeAddressCbor || typeof changeAddressCbor !== 'string') {
                throw new Error('changeAddressCbor is required for backend keyHash extraction');
            }
            
            try {
                const addr = CardanoWasm.Address.from_bytes(Buffer.from(changeAddressCbor, 'hex'));
                const baseAddr = CardanoWasm.BaseAddress.from_address(addr);
                const paymentCred = baseAddr.payment_cred();
                finalUserKeyHash = Buffer.from(paymentCred.to_keyhash().to_bytes()).toString('hex');
                console.log('✅ User keyHash extracted in backend:', finalUserKeyHash);
            } catch (error) {
                console.error('❌ Failed to extract user keyHash in backend:', error);
                throw new Error('Failed to extract user keyHash from address: ' + error.message);
            }
        }

        // Validate final userKeyHash
        if (!/^[0-9a-fA-F]{56}$/.test(finalUserKeyHash)) {
            throw new Error('UserKeyHash is not valid 56-character hex: ' + finalUserKeyHash);
        }
        
        // ✅ CRITICAL: Validate user addresses
        if (!userAddresses || !Array.isArray(userAddresses) || userAddresses.length === 0) {
            throw new Error('Invalid userAddresses: ' + userAddresses);
        }
        
        console.log('✅ All required fields validated');
        console.log('🔑 User keyHash:', finalUserKeyHash);
        console.log('🏠 User addresses count:', userAddresses.length);
        console.log('🏠 Recipient:', recipientAddress);
        
        // ✅ CRITICAL: Generate dynamic policy script using user's keyHash
        console.log('🔧 Generating dynamic policy script...');
        const policyScript = {
            type: "sig",
            keyHash: finalUserKeyHash
        };
        
        console.log('🔑 Policy script generated:', policyScript);
        
        // Generate policy ID from the user's keyHash
        const policyId = generatePolicyId(policyScript);
        console.log('🆔 Policy ID generated:', policyId);
        
        // Validate policy ID format
        if (!policyId || typeof policyId !== 'string' || policyId.length !== 56) {
            throw new Error('Invalid policy ID generated: ' + policyId);
        }
        
        // Validate policy ID is valid hex
        if (!/^[0-9a-fA-F]{56}$/.test(policyId)) {
            throw new Error('Policy ID is not valid hexadecimal: ' + policyId);
        }
        
        console.log('✅ Policy ID validation passed');
        
        // ✅ CRITICAL: Create transaction builder with protocol parameters from file
        console.log('🔧 Creating transaction builder with Protocol v8.1 parameters...');
        console.log('📋 Using protocol parameters:', PROTOCOL_PARAMS);
        let txBuilder;
        try {
            // Create TransactionBuilderConfig for the new API with updated parameters
            const config = CardanoWasm.TransactionBuilderConfigBuilder.new()
                .fee_algo(CardanoWasm.LinearFee.new(
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.min_fee_a.toString()),
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.min_fee_b.toString())
                ))
                .pool_deposit(CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.pool_deposit.toString()))
                .key_deposit(CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.key_deposit.toString()))
                .max_tx_size(parseInt(PROTOCOL_PARAMS.max_tx_size))
                .max_value_size(parseInt(PROTOCOL_PARAMS.max_val_size))
                .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.coins_per_utxo_byte.toString()))
                .build();
            
            txBuilder = CardanoWasm.TransactionBuilder.new(config);
            console.log('✅ Transaction builder created with Protocol v8.1 parameters');
        } catch (error) {
            console.error('❌ Error creating transaction builder with new API:', error.message);
            console.log('🔄 Trying fallback with old API...');
            
            // Fallback to old API if available
            try {
                txBuilder = CardanoWasm.TransactionBuilder.new(
                    CardanoWasm.LinearFee.new(
                        CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.min_fee_a.toString()),
                        CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.min_fee_b.toString())
                    ),
                    CardanoWasm.BigNum.from_str("1000000"), // fallback minUtxo
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.pool_deposit.toString()),
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.key_deposit.toString()),
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.max_tx_size.toString()),
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.max_val_size.toString()),
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.coins_per_utxo_byte.toString()),
                    CardanoWasm.BigNum.from_str(PROTOCOL_PARAMS.coins_per_utxo_byte.toString())
                );
                console.log('✅ Transaction builder created with old API fallback');
            } catch (fallbackError) {
                console.error('❌ Both new and old APIs failed:', fallbackError.message);
                throw new Error('Failed to create transaction builder with any API: ' + fallbackError.message);
            }
        }
        
        // Create asset name (hex encoded token name)
        console.log('🏷️ Creating asset name...');
        let assetName;
        try {
            const tokenNameBuffer = Buffer.from(tokenName, 'utf8');
            console.log('📝 Token name buffer:', tokenNameBuffer.toString('hex'));
            assetName = CardanoWasm.AssetName.new(tokenNameBuffer);
            console.log('✅ Asset name created');
        } catch (error) {
            console.error('❌ Error creating asset name:', error.message);
            throw new Error('Failed to create asset name: ' + error.message);
        }
        
        // Create mint assets
        console.log('🔧 Creating mint assets...');
        let mintAssets;
        try {
            mintAssets = CardanoWasm.MintAssets.new();
            const supplyBigNum = CardanoWasm.BigNum.from_str(tokenSupply.toString());
            const supplyInt = CardanoWasm.Int.new(supplyBigNum);
            mintAssets.insert(assetName, supplyInt);
            console.log('✅ Mint assets created with supply:', tokenSupply);
        } catch (error) {
            console.error('❌ Error creating mint assets:', error.message);
            throw new Error('Failed to create mint assets: ' + error.message);
        }
        
        // Create mint
        console.log('🔧 Creating mint with policy ID:', policyId);
        let mint;
        try {
            mint = CardanoWasm.Mint.new();
            const scriptHash = CardanoWasm.ScriptHash.from_hex(policyId);
            mint.insert(scriptHash, mintAssets);
            console.log('✅ Mint created');
        } catch (error) {
            console.error('❌ Error creating mint:', error.message);
            throw new Error('Failed to create mint: ' + error.message);
        }
        
        // ✅ CRITICAL: Set mint in transaction with native scripts
        console.log('🔧 Setting mint in transaction...');
        try {
            // Re-generate the native script for the new API
            const policyNativeScript = buildNativeScript(policyScript);
            const nativeScripts = CardanoWasm.NativeScripts.new();
            nativeScripts.add(policyNativeScript);
            
            console.log('🔍 NATIVE SCRIPT VALIDATION:');
            console.log('   📋 Policy script:', policyScript);
            console.log('   🔑 Final user keyHash:', finalUserKeyHash);
            console.log('   📝 Native scripts count:', nativeScripts.len());
            console.log('   🔗 Policy ID matches script hash:', policyId === policyNativeScript.hash().to_hex());
            
            // Validate that the policy ID matches the script hash
            const scriptHash = policyNativeScript.hash().to_hex();
            if (policyId !== scriptHash) {
                console.error('❌ Policy ID mismatch:');
                console.error('   Expected:', policyId);
                console.error('   Actual:', scriptHash);
                throw new Error('Policy ID does not match script hash - this will cause signing failure');
            }
            
            // Try new API first
            try {
                txBuilder.set_mint(mint, nativeScripts);
                console.log('✅ Mint set in transaction with new API (with native scripts)');
            } catch (newApiError) {
                console.log('🔄 New API failed, trying old API...');
                console.log('❌ New API error:', newApiError.message);
                txBuilder.set_mint(mint);
                console.log('✅ Mint set in transaction with old API');
            }
        } catch (error) {
            console.error('❌ Error setting mint:', error.message);
            throw new Error('Failed to set mint: ' + error.message);
        }
        
        // ✅ CRITICAL: Add UTXOs as inputs
        console.log('🔧 Adding UTXOs as inputs...');
        console.log('📊 Total UTXOs to process:', utxos.length);
        console.log('📋 UTXO array sample:', JSON.stringify(utxos.slice(0, 2), null, 2));
        
        // ✅ CRITICAL: Comprehensive UTXO validation for raw hex strings
        console.log('🔍 DETAILED BACKEND UTXO VALIDATION:');
        utxos.forEach((utxo, index) => {
            console.log(`  UTXO ${index} analysis:`, {
                type: typeof utxo,
                isNull: utxo === null,
                isUndefined: utxo === undefined,
                length: utxo ? utxo.length : 'N/A',
                sample: utxo ? (typeof utxo === 'string' ? utxo.substring(0, 100) + '...' : JSON.stringify(utxo).substring(0, 100) + '...') : 'none',
                isString: typeof utxo === 'string',
                isHex: typeof utxo === 'string' && /^[0-9a-fA-F]+$/.test(utxo),
                isEvenLength: typeof utxo === 'string' && utxo.length % 2 === 0
            });
        });
        
        // Validate each UTXO
        for (let i = 0; i < utxos.length; i++) {
            const utxo = utxos[i];
            
            if (!utxo) {
                console.error(`❌ UTXO ${i} is undefined, null, or empty:`, utxo);
                throw new Error(`UTXO ${i} is undefined, null, or empty. Cannot process invalid UTXO.`);
            }
            
            if (typeof utxo !== 'string') {
                console.error(`❌ UTXO ${i} has invalid type:`, typeof utxo, utxo);
                throw new Error(`UTXO ${i} must be a hex string from Eternl wallet, but got ${typeof utxo}`);
            }
            
            if (!/^[0-9a-fA-F]+$/.test(utxo)) {
                console.error(`❌ UTXO ${i} is not valid hex:`, utxo.substring(0, 100));
                throw new Error(`UTXO ${i} is not valid hex string`);
            }
            
            if (utxo.length % 2 !== 0) {
                console.error(`❌ UTXO ${i} has odd length:`, utxo.length);
                throw new Error(`UTXO ${i} has odd length: ${utxo.length}`);
            }
            
            try {
                // Test if it can be parsed as CardanoWasm UTXO
                const buffer = Buffer.from(utxo, 'hex');
                const cardanoUtxo = CardanoWasm.TransactionUnspentOutput.from_bytes(buffer);
                console.log(`✅ UTXO ${i} validation: valid hex, length=${buffer.length} bytes, CardanoWasm parsing: SUCCESS`);
            } catch (err) {
                console.error(`❌ UTXO ${i} CardanoWasm parsing failed:`, err.message);
                throw new Error(`UTXO ${i} CardanoWasm parsing failed: ${err.message}`);
            }
        }
        
        console.log('✅ All UTXOs validated - no undefined values found');
        
        // ✅ CRITICAL: Declare totalInputValue at function scope
        let totalInputValue = CardanoWasm.BigNum.from_str("0");
        
        try {
            
            // ✅ CRITICAL: Validate UTXOs belong to user's addresses first
            console.log('🔍 Validating UTXOs belong to user addresses...');
            const validatedUtxos = [];
            
            for (let i = 0; i < utxos.length; i++) {
                const utxoHex = utxos[i];
                
                try {
                    // Parse UTXO from hex to extract address
                    const utxoBytes = Buffer.from(utxoHex, 'hex');
                    const transactionUnspentOutput = CardanoWasm.TransactionUnspentOutput.from_bytes(utxoBytes);
                    
                    // Extract UTXO address
                    const utxoAddr = transactionUnspentOutput.output().address();
                    const utxoBech32 = utxoAddr.to_bech32();
                    
                    // Check if UTXO belongs to user's addresses
                    const belongsToUser = userAddresses.includes(utxoBech32);
                    
                    if (!belongsToUser) {
                        console.error('❌ UTXO does not belong to user:', utxoBech32);
                        console.error('❌ User addresses:', userAddresses);
                        throw new Error(`UTXO ${i} does not belong to user address. UTXO address: ${utxoBech32}`);
                    }
                    
                    console.log(`✅ UTXO ${i} validated - belongs to user:`, utxoBech32);
                    validatedUtxos.push(utxoHex);
                    
                } catch (error) {
                    console.error(`❌ Error validating UTXO ${i}:`, error.message);
                    throw new Error(`Failed to validate UTXO ${i}: ${error.message}`);
                }
            }
        
        console.log('✅ All UTXOs validated - belong to user addresses');
        console.log('🔢 Validated UTXOs count:', validatedUtxos.length);
        
        // Process validated UTXOs as transaction inputs
        for (let i = 0; i < validatedUtxos.length; i++) {
            const utxo = validatedUtxos[i];
            
            // ✅ CRITICAL: Final validation before parsing
            if (!utxo) {
                console.error(`❌ Validated UTXO ${i} is undefined, null, or empty:`, utxo);
                throw new Error(`Validated UTXO ${i} is undefined, null, or empty. Cannot parse invalid UTXO.`);
            }
            
            if (typeof utxo !== 'string') {
                console.error(`❌ Validated UTXO ${i} is not a string:`, typeof utxo, utxo);
                throw new Error(`Validated UTXO ${i} must be a hex string, but got ${typeof utxo}`);
            }
            
            console.log(`📥 Processing UTXO ${i + 1}/${validatedUtxos.length}:`);
            console.log(`   UTXO type: ${typeof utxo}`);
            console.log(`   UTXO length: ${utxo ? utxo.length : 'undefined'}`);
            console.log(`   UTXO sample: ${utxo ? utxo.substring(0, 100) : 'none'}...`);
            
            // Parse UTXO from hex
            const utxoBytes = Buffer.from(utxo, 'hex');
                const transactionUnspentOutput = CardanoWasm.TransactionUnspentOutput.from_bytes(utxoBytes);
                
                // Get UTXO details
                const utxoAmount = transactionUnspentOutput.output().amount();
                const utxoValue = utxoAmount.coin();
                const utxoAddress = transactionUnspentOutput.output().address().to_bech32();
                
                console.log(`   💰 UTXO ${i + 1} value: ${utxoValue.to_str()} lovelace`);
                console.log(`   🏠 UTXO ${i + 1} address: ${utxoAddress}`);
                
                // Add to total input value
                totalInputValue = totalInputValue.checked_add(utxoValue);
                
                // Add as input
                txBuilder.add_input(
                    transactionUnspentOutput.output().address(),
                    transactionUnspentOutput.input(),
                    transactionUnspentOutput.output().amount()
                );
                
                console.log(`✅ UTXO ${i + 1} added as input`);
            }
            console.log('✅ All UTXOs added as inputs');
            console.log('💰 TOTAL INPUT VALUE:', totalInputValue.to_str(), 'lovelace');
            console.log('💰 TOTAL INPUT VALUE in ADA:', (parseInt(totalInputValue.to_str()) / 1000000).toFixed(6), 'ADA');
        } catch (error) {
            console.error('❌ Error adding UTXOs:', error.message);
            throw new Error('Failed to add UTXOs as inputs: ' + error.message);
        }
        
        // Create multi-asset with minted tokens
        console.log('🔧 Creating multi-asset...');
        let multiAsset;
        try {
            multiAsset = CardanoWasm.MultiAsset.new();
            const assets = CardanoWasm.Assets.new();
            const assetAmount = CardanoWasm.BigNum.from_str(tokenSupply.toString());
            assets.insert(assetName, assetAmount);
            
            const scriptHash = CardanoWasm.ScriptHash.from_hex(policyId);
            multiAsset.insert(scriptHash, assets);
            console.log('✅ Multi-asset created');
        } catch (error) {
            console.error('❌ Error creating multi-asset:', error.message);
            throw new Error('Failed to create multi-asset: ' + error.message);
        }
        
        // Create output value with ADA + minted tokens
        console.log('🔧 Creating output value...');
        let outputValue;
        try {
            const adaAmount = CardanoWasm.BigNum.from_str("2000000"); // 2 ADA
            outputValue = CardanoWasm.Value.new(adaAmount);
            outputValue.set_multiasset(multiAsset);
            console.log('✅ Output value created with 2 ADA + tokens');
            console.log('💰 OUTPUT ADA AMOUNT:', adaAmount.to_str(), 'lovelace');
            console.log('💰 OUTPUT ADA in ADA:', (parseInt(adaAmount.to_str()) / 1000000).toFixed(6), 'ADA');
            console.log('🪙 MINTED TOKENS:', tokenSupply, tokenName);
        } catch (error) {
            console.error('❌ Error creating output value:', error.message);
            throw new Error('Failed to create output value: ' + error.message);
        }
        
                // Create output
        console.log('🔧 Creating transaction output...');
        console.log('🏠 Parsing address:', recipientAddress);
        console.log('🔍 Address type:', typeof recipientAddress);
        console.log('🔍 Address length:', recipientAddress ? recipientAddress.length : 'undefined');
        console.log('🔍 Address starts with addr:', recipientAddress ? recipientAddress.startsWith('addr') : 'undefined');
        
        let output;
        
        try {
            // CRITICAL: Ensure address is bech32 format
            if (!recipientAddress || typeof recipientAddress !== 'string') {
                throw new Error('Invalid recipient address: must be a non-empty string');
            }
            
            if (!recipientAddress.startsWith('addr')) {
                throw new Error('Invalid recipient address: must start with "addr" (bech32 format)');
            }
            
            // Parse recipient address
            const address = CardanoWasm.Address.from_bech32(recipientAddress);
            console.log('✅ Address parsed successfully');
            
            // Create output with tokens
            output = CardanoWasm.TransactionOutput.new(address, outputValue);
            console.log('✅ Transaction output created with recipient address:', recipientAddress);
        } catch (error) {
            console.error('❌ CRITICAL: Address parsing failed:', error.message);
            console.error('❌ Recipient address:', recipientAddress);
            console.error('❌ This will cause tokens to be sent to wrong address!');
            
            // DO NOT USE DUMMY ADDRESS - THROW ERROR INSTEAD
            throw new Error('Failed to parse recipient address: ' + error.message + ' - Address: ' + recipientAddress);
        }
        
        // Add output to transaction
        console.log('🔧 Adding output to transaction...');
        try {
            txBuilder.add_output(output);
            console.log('✅ Output added to transaction');
        } catch (error) {
            console.error('❌ Error adding output:', error.message);
            throw new Error('Failed to add output to transaction: ' + error.message);
        }
        
        // ✅ CRITICAL: Add change if needed
        console.log('🔧 Adding change if needed...');
        try {
            const changeAddr = CardanoWasm.Address.from_bech32(changeAddress);
            txBuilder.add_change_if_needed(changeAddr);
            console.log('✅ Change added if needed');
        } catch (error) {
            console.error('❌ Error adding change:', error.message);
            throw new Error('Failed to add change: ' + error.message);
        }
        
        // Build CIP-25 metadata
        console.log('🔧 Building CIP-25 metadata...');
        let metadata, auxData;
        try {
            metadata = buildMetadata(tokenName, tokenSymbol || '', tokenDescription || '', ipfsCID, policyId);
            auxData = buildAuxiliaryData(metadata);
            console.log('✅ Metadata created');
        } catch (error) {
            console.error('❌ Error building metadata:', error.message);
            throw new Error('Failed to build metadata: ' + error.message);
        }
        
        // Set auxiliary data
        console.log('🔧 Setting auxiliary data...');
        try {
            txBuilder.set_auxiliary_data(auxData);
            console.log('✅ Auxiliary data set');
        } catch (error) {
            console.error('❌ Error setting auxiliary data:', error.message);
            throw new Error('Failed to set auxiliary data: ' + error.message);
        }
        
        // Build transaction body
        console.log('🔧 Building transaction body...');
        let txBody;
        try {
            txBody = txBuilder.build();
            console.log('✅ Transaction body built');
            
            // ✅ CRITICAL: Detailed transaction analysis
            console.log('🔍 DETAILED TRANSACTION ANALYSIS:');
            console.log('   📊 Transaction size:', txBody.to_bytes().length, 'bytes');
            console.log('   📊 Max allowed size:', PROTOCOL_PARAMS.maxTxSize, 'bytes');
            console.log('   📊 Size within limit:', txBody.to_bytes().length <= PROTOCOL_PARAMS.maxTxSize);
            
            // Get fee information
            const fee = txBody.fee();
            console.log('💸 CALCULATED FEE:', fee.to_str(), 'lovelace');
            console.log('💸 CALCULATED FEE in ADA:', (parseInt(fee.to_str()) / 1000000).toFixed(6), 'ADA');
            
            // ✅ CRITICAL: Validate transaction body components
            console.log('🔍 TRANSACTION BODY COMPONENTS:');
            console.log('   📥 Inputs count:', txBody.inputs().len());
            console.log('   📤 Outputs count:', txBody.outputs().len());
            console.log('   🪙 Mint present:', !!txBody.mint());
            console.log('   📋 Metadata present: true (set via txBuilder.set_auxiliary_data)');
            console.log('   📝 Script data present:', !!txBody.script_data_hash());
            
            // Validate inputs
            if (txBody.inputs().len() === 0) {
                throw new Error('Transaction has no inputs - this will be rejected by the network');
            }
            
            // Validate outputs
            if (txBody.outputs().len() === 0) {
                throw new Error('Transaction has no outputs - this will be rejected by the network');
            }
            
            // Validate mint
            if (!txBody.mint()) {
                throw new Error('Transaction has no mint - this is required for token minting');
            }
            
            console.log('✅ Transaction body component validation passed');
            
            // Calculate balance
            const inputsValue = parseInt(totalInputValue.to_str());
            const outputsValue = 2000000; // 2 ADA output
            const feeValue = parseInt(fee.to_str());
            const totalRequired = outputsValue + feeValue;
            
            console.log('⚖️ TRANSACTION BALANCE CHECK:');
            console.log(`   📥 Total Inputs: ${inputsValue} lovelace (${(inputsValue / 1000000).toFixed(6)} ADA)`);
            console.log(`   📤 Total Outputs: ${outputsValue} lovelace (${(outputsValue / 1000000).toFixed(6)} ADA)`);
            console.log(`   💸 Fee: ${feeValue} lovelace (${(feeValue / 1000000).toFixed(6)} ADA)`);
            console.log(`   🧮 Required: ${totalRequired} lovelace (${(totalRequired / 1000000).toFixed(6)} ADA)`);
            console.log(`   💰 Change: ${inputsValue - totalRequired} lovelace (${((inputsValue - totalRequired) / 1000000).toFixed(6)} ADA)`);
            
            if (inputsValue < totalRequired) {
                console.error('❌ INSUFFICIENT FUNDS! Transaction will not balance');
                throw new Error(`Insufficient funds: need ${totalRequired} but have ${inputsValue} lovelace`);
            } else {
                console.log('✅ Transaction balance looks correct');
            }
            
        } catch (error) {
            console.error('❌ Error building transaction body:', error.message);
            throw new Error('Failed to build transaction body: ' + error.message);
        }
        
        // Create unsigned transaction
        console.log('🔧 Creating unsigned transaction...');
        let unsignedTx;
        try {
            const witnessSet = CardanoWasm.TransactionWitnessSet.new();
            unsignedTx = CardanoWasm.Transaction.new(txBody, witnessSet, auxData);
            console.log('✅ Unsigned transaction created');
        } catch (error) {
            console.error('❌ Error creating unsigned transaction:', error.message);
            throw new Error('Failed to create unsigned transaction: ' + error.message);
        }
        
        // Convert to CBOR hex string
        console.log('🔧 Converting to CBOR...');
        let unsignedTxHex;
        try {
            const txBytes = unsignedTx.to_bytes();
            unsignedTxHex = Buffer.from(txBytes).toString('hex');
            console.log('✅ CBOR conversion successful');
            console.log('📏 Transaction size:', unsignedTxHex.length / 2, 'bytes');
        } catch (error) {
            console.error('❌ Error converting to CBOR:', error.message);
            throw new Error('Failed to convert to CBOR: ' + error.message);
        }
        
        console.log('✅ Unsigned transaction built successfully');
        
        return {
            success: true,
            unsignedTx: unsignedTxHex,
            policyId: policyId,
            assetName: Buffer.from(tokenName, 'utf8').toString('hex'),
            metadata: metadata
        };
        
    } catch (error) {
        console.error('❌ Error building transaction:', error);
        throw error;
    }
}

function generatePolicyId(policyScript) {
    // Convert policy script to native script
    const nativeScript = buildNativeScript(policyScript);
    
    // Generate policy ID from script hash
    // Use .hash() method - this is the correct method for this version of the library
    const scriptHash = nativeScript.hash();
    return scriptHash.to_hex();
}

function buildNativeScript(scriptJson) {
    if (!scriptJson || !scriptJson.type) {
        throw new Error('Invalid script JSON: ' + JSON.stringify(scriptJson));
    }
    
    if (scriptJson.type === 'sig') {
        if (!scriptJson.keyHash || typeof scriptJson.keyHash !== 'string') {
            throw new Error('Invalid keyHash in sig script: ' + scriptJson.keyHash);
        }
        
        // Validate keyHash format (should be 56 character hex string)
        if (!/^[0-9a-fA-F]{56}$/.test(scriptJson.keyHash)) {
            throw new Error('KeyHash is not valid 56-character hex: ' + scriptJson.keyHash);
        }
        
        try {
            const keyHash = CardanoWasm.Ed25519KeyHash.from_hex(scriptJson.keyHash);
            const scriptPubkey = CardanoWasm.ScriptPubkey.new(keyHash);
            return CardanoWasm.NativeScript.new_script_pubkey(scriptPubkey);
        } catch (error) {
            throw new Error('Failed to create sig script: ' + error.message);
        }
    }
    
    if (scriptJson.type === 'before') {
        if (!scriptJson.slot || isNaN(parseInt(scriptJson.slot))) {
            throw new Error('Invalid slot in before script: ' + scriptJson.slot);
        }
        
        try {
            const slot = CardanoWasm.BigNum.from_str(scriptJson.slot.toString());
            const timelockExpiry = CardanoWasm.TimelockExpiry.new(slot);
            return CardanoWasm.NativeScript.new_timelock_expiry(timelockExpiry);
        } catch (error) {
            throw new Error('Failed to create timelock script: ' + error.message);
        }
    }
    
    if (scriptJson.type === 'all') {
        if (!scriptJson.scripts || !Array.isArray(scriptJson.scripts)) {
            throw new Error('Invalid scripts array in all script: ' + scriptJson.scripts);
        }
        
        try {
            const scripts = CardanoWasm.NativeScripts.new();
            
            for (const subScript of scriptJson.scripts) {
                const nativeSubScript = buildNativeScript(subScript);
                scripts.add(nativeSubScript);
            }
            
            const scriptAll = CardanoWasm.ScriptAll.new(scripts);
            return CardanoWasm.NativeScript.new_script_all(scriptAll);
        } catch (error) {
            throw new Error('Failed to create script_all: ' + error.message);
        }
    }
    
    throw new Error('Unsupported script type: ' + scriptJson.type);
}

module.exports = {
    buildUnsignedMintTransaction,
    generatePolicyId
}; 