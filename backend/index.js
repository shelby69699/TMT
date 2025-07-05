// 🚀 ENTRY POINT v4.0 - FORCES REAL SERVER VIA server.js
console.log('🔧 Index.js v4.0 starting - requiring server.js...');
console.log('🌐 Current directory:', process.cwd());

import fs from 'fs';
console.log('📁 Files in directory:', fs.readdirSync('.'));

(async () => {
    try {
        await import('./server.js');
        console.log('✅ FORCED REAL SERVER v4.0 loaded successfully!');
    } catch (error) {
        console.error('❌ Error loading server.js:', error);
        process.exit(1);
    }
})(); 