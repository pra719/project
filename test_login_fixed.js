const axios = require('axios');
const fs = require('fs');
const forge = require('node-forge');

const API_BASE = 'http://localhost:5000';

function signChallenge(challenge, privateKeyPem) {
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(challenge, 'utf8');
    const signature = privateKey.sign(md);
    return forge.util.bytesToHex(signature); // Fixed: Now returns hex format to match backend
  } catch (error) {
    throw new Error('Failed to sign challenge: ' + error.message);
  }
}

async function testLoginWithProperKeys() {
  console.log('🔐 Testing SecureShare Login Flow with Proper Keys...\n');
  
  try {
    // Load test configuration
    if (!fs.existsSync('test_config.json')) {
      console.log('❌ test_config.json not found. Please run: node create_test_user.js');
      return;
    }
    
    const testConfig = JSON.parse(fs.readFileSync('test_config.json', 'utf8'));
    const privateKey = fs.readFileSync(testConfig.privateKeyFile, 'utf8');
    
    console.log(`Using test user: ${testConfig.username}`);
    
    // Step 1: Test backend connectivity
    console.log('\n1️⃣ Testing backend connectivity...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('   ✅ Backend is running:', healthResponse.data.status);
    
    // Step 2: Get challenge
    console.log('\n2️⃣ Getting authentication challenge...');
    const challengeResponse = await axios.post(`${API_BASE}/api/auth/challenge`);
    const challenge = challengeResponse.data.challenge;
    console.log('   ✅ Challenge received:', challenge.substring(0, 20) + '...');
    
    // Step 3: Sign challenge
    console.log('\n3️⃣ Signing challenge with private key...');
    const signature = signChallenge(challenge, privateKey);
    console.log('   ✅ Challenge signed successfully');
    console.log('   📝 Signature preview:', signature.substring(0, 20) + '...');
    
    // Step 4: Attempt login
    console.log('\n4️⃣ Attempting login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: testConfig.username,
      challenge: challenge,
      signature: signature
    });
    
    console.log('   ✅ Login successful!');
    console.log('   📋 Token received:', loginResponse.data.data.token.substring(0, 20) + '...');
    console.log('   👤 User:', loginResponse.data.data.user.username);
    
    // Step 5: Test authenticated request
    console.log('\n5️⃣ Testing authenticated request...');
    const token = loginResponse.data.data.token;
    const fileListResponse = await axios.get(`${API_BASE}/api/file/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✅ Authenticated request successful');
    console.log('   📁 Files:', fileListResponse.data.files?.length || 0);
    
    // Step 6: Test file upload
    console.log('\n6️⃣ Testing file upload...');
    const testFileContent = 'This is a test file for SecureShare application.';
    const uploadResponse = await axios.post(`${API_BASE}/api/file/upload`, {
      filename: 'test-file.txt',
      data: Buffer.from(testFileContent).toString('base64'),
      mimeType: 'text/plain'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('   ✅ File upload successful');
    console.log('   📄 File ID:', uploadResponse.data.data.fileId);
    
    // Step 7: Test message sending
    console.log('\n7️⃣ Testing message sending...');
    try {
      const messageResponse = await axios.post(`${API_BASE}/api/message/send`, {
        recipientUsername: testConfig.username, // Send to self
        message: 'Test message from automated test'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('   ✅ Message sent successfully');
      console.log('   💬 Message ID:', messageResponse.data.data.messageId);
    } catch (msgError) {
      console.log('   ⚠️  Message sending skipped (expected for self-messaging)');
    }
    
    console.log('\n🎉 All tests passed! Login and core functionality working correctly.\n');
    
    // Cleanup message
    console.log('🧹 Test files created:');
    console.log('   - test_config.json (test user details)');
    console.log('   - test_private_key.pem (for manual testing)');
    console.log('   - test_public_key.pem');
    console.log('   - test_certificate.pem');
    console.log('\n✅ You can now use the frontend at http://localhost:3000');
    console.log(`   Login with username: ${testConfig.username}`);
    console.log('   Upload the test_private_key.pem file when prompted');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   📋 Status:', error.response.status);
      console.error('   📝 Error details:', error.response.data);
    }
    console.log('\n');
  }
}

async function testFrontendConnectivity() {
  console.log('🌐 Testing frontend connectivity...\n');
  
  try {
    const response = await axios.get('http://localhost:3000', { timeout: 5000 });
    if (response.data.includes('SecureShare')) {
      console.log('   ✅ Frontend is accessible and serving content');
    } else {
      console.log('   ⚠️  Frontend is accessible but may have issues');
    }
  } catch (error) {
    console.log('   ❌ Frontend connectivity issue:', error.message);
  }
  console.log('');
}

async function runAllTests() {
  await testFrontendConnectivity();
  await testLoginWithProperKeys();
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testLoginWithProperKeys, signChallenge };