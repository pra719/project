const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:5000';

async function createTestUser() {
  console.log('🔧 Creating test user for login testing...\n');
  
  try {
    // Register a new user
    const username = 'logintest' + Date.now();
    const email = `${username}@example.com`;
    
    console.log(`1️⃣ Registering user: ${username}`);
    const response = await axios.post(`${API_BASE}/api/auth/register`, {
      username,
      email
    });
    
    if (!response.data.success) {
      throw new Error('Registration failed: ' + response.data.error);
    }
    
    const userData = response.data.data;
    console.log('✅ User registered successfully');
    
    // Save private key to file with proper formatting
    const privateKey = userData.privateKey;
    const publicKey = userData.publicKey;
    const certificate = userData.certificate;
    
    fs.writeFileSync('test_private_key.pem', privateKey);
    fs.writeFileSync('test_public_key.pem', publicKey);
    fs.writeFileSync('test_certificate.pem', certificate);
    
    console.log('✅ Keys saved to files');
    
    // Create test configuration
    const testConfig = {
      username,
      email,
      userId: userData.userId,
      privateKeyFile: 'test_private_key.pem',
      publicKeyFile: 'test_public_key.pem',
      certificateFile: 'test_certificate.pem'
    };
    
    fs.writeFileSync('test_config.json', JSON.stringify(testConfig, null, 2));
    
    console.log('✅ Test configuration saved to test_config.json');
    console.log('\nTest user details:');
    console.log(`- Username: ${username}`);
    console.log(`- Email: ${email}`);
    console.log(`- User ID: ${userData.userId}`);
    console.log(`- Private key: test_private_key.pem`);
    
    // Verify the private key format
    console.log('\n2️⃣ Verifying private key format...');
    const savedKey = fs.readFileSync('test_private_key.pem', 'utf8');
    
    if (savedKey.includes('-----BEGIN PRIVATE KEY-----') && savedKey.includes('-----END PRIVATE KEY-----')) {
      console.log('✅ Private key format looks correct');
    } else {
      console.log('❌ Private key format may be incorrect');
    }
    
    // Test key with node-forge
    console.log('\n3️⃣ Testing key with node-forge...');
    const forge = require('node-forge');
    
    try {
      const privateKeyObj = forge.pki.privateKeyFromPem(savedKey);
      console.log('✅ Private key successfully parsed by node-forge');
      
      // Test signing
      const testData = 'test-signature-data';
      const md = forge.md.sha256.create();
      md.update(testData, 'utf8');
      const signature = privateKeyObj.sign(md);
      const hexSignature = forge.util.bytesToHex(signature);
      
      console.log('✅ Test signature created successfully');
      console.log(`   Signature length: ${hexSignature.length} characters`);
      
    } catch (error) {
      console.log('❌ Error testing private key:', error.message);
    }
    
    console.log('\n🎉 Test user creation complete!');
    console.log('You can now test login with these credentials.');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

if (require.main === module) {
  createTestUser();
}

module.exports = { createTestUser };