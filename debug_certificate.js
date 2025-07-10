const fs = require('fs');
const forge = require('node-forge');

async function debugCertificateIssue() {
  console.log('🔍 Debugging Certificate Verification Issue...\n');
  
  try {
    // Load test configuration
    if (!fs.existsSync('test_config.json')) {
      console.log('❌ test_config.json not found. Please run: node create_test_user.js');
      return;
    }
    
    const testConfig = JSON.parse(fs.readFileSync('test_config.json', 'utf8'));
    const userCert = fs.readFileSync(testConfig.certificateFile, 'utf8');
    
    console.log('📋 Loaded test user certificate');
    
    // Load CA certificate (if exists)
    const CA = require('./backend/utils/ca');
    let caCert;
    
    try {
      caCert = await CA.getCACertificate();
      console.log('📋 Loaded CA certificate');
    } catch (error) {
      console.log('❌ Could not load CA certificate:', error.message);
      return;
    }
    
    // Parse certificates
    console.log('\n1️⃣ Parsing certificates...');
    const userCertObj = forge.pki.certificateFromPem(userCert);
    const caCertObj = forge.pki.certificateFromPem(caCert);
    
    console.log('✅ User certificate parsed');
    console.log('✅ CA certificate parsed');
    
    // Check certificate validity dates
    console.log('\n2️⃣ Checking certificate validity...');
    const now = new Date();
    
    console.log('User Certificate:');
    console.log(`  Not Before: ${userCertObj.validity.notBefore}`);
    console.log(`  Not After:  ${userCertObj.validity.notAfter}`);
    console.log(`  Current:    ${now}`);
    
    if (now < userCertObj.validity.notBefore) {
      console.log('❌ Certificate is not yet valid');
      return;
    }
    
    if (now > userCertObj.validity.notAfter) {
      console.log('❌ Certificate has expired');
      return;
    }
    
    console.log('✅ Certificate validity dates are OK');
    
    // Check certificate signature
    console.log('\n3️⃣ Checking certificate signature...');
    
    try {
      // Method 1: Using forge's built-in verification
      const isValid1 = forge.pki.verifyCertificateChain(caCertObj, [userCertObj]);
      console.log(`Method 1 (verifyCertificateChain): ${isValid1}`);
    } catch (error) {
      console.log(`Method 1 error: ${error.message}`);
    }
    
    try {
      // Method 2: Manual verification (current method)
      const isValid2 = caCertObj.verify(userCertObj);
      console.log(`Method 2 (caCert.verify): ${isValid2}`);
    } catch (error) {
      console.log(`Method 2 error: ${error.message}`);
    }
    
    try {
      // Method 3: Public key verification (what the code is trying to do)
      const md = forge.md.sha256.create();
      const isValid3 = caCertObj.publicKey.verify(
        userCertObj.tbsCertificate,
        userCertObj.signature,
        md
      );
      console.log(`Method 3 (publicKey.verify): ${isValid3}`);
    } catch (error) {
      console.log(`Method 3 error: ${error.message}`);
    }
    
    // Check if certificates are related
    console.log('\n4️⃣ Checking certificate relationship...');
    
    console.log('CA Certificate Subject:');
    caCertObj.subject.attributes.forEach(attr => {
      console.log(`  ${attr.name}: ${attr.value}`);
    });
    
    console.log('User Certificate Issuer:');
    userCertObj.issuer.attributes.forEach(attr => {
      console.log(`  ${attr.name}: ${attr.value}`);
    });
    
    // Compare issuer and subject
    const issuerMatch = userCertObj.issuer.hash === caCertObj.subject.hash;
    console.log(`Issuer matches CA subject: ${issuerMatch}`);
    
    // Test the backend's verification method
    console.log('\n5️⃣ Testing backend verification method...');
    const CryptoUtils = require('./backend/utils/crypto');
    const backendResult = CryptoUtils.verifyCertificate(userCert, caCert);
    console.log(`Backend verification result: ${backendResult}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugCertificateIssue();
}

module.exports = { debugCertificateIssue };