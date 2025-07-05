/**
 * CIP-25 Metadata Builder
 * Creates compliant metadata for Cardano Native Tokens
 */

function buildMetadata(tokenName, tokenSymbol, tokenDescription, ipfsLink, policyId) {
    return {
        "721": {
            [policyId]: {
                [tokenName]: {
                    name: tokenName,
                    symbol: tokenSymbol || '',
                    description: tokenDescription || '',
                    image: `ipfs://${ipfsLink}`,
                    mediaType: "image/png"
                }
            }
        }
    };
}

function buildAuxiliaryData(metadata) {
    const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
    
    // Create auxiliary data with metadata
    const auxData = CardanoWasm.AuxiliaryData.new();
    const generalMetadata = CardanoWasm.GeneralTransactionMetadata.new();
    
    // Add metadata under label 721 (CIP-25)
    const metadataValue = CardanoWasm.encode_json_str_to_metadatum(
        JSON.stringify(metadata), 
        CardanoWasm.MetadataJsonSchema.BasicConversions
    );
    
    generalMetadata.insert(
        CardanoWasm.BigNum.from_str("721"),
        metadataValue
    );
    
    auxData.set_metadata(generalMetadata);
    return auxData;
}

module.exports = {
    buildMetadata,
    buildAuxiliaryData
}; 