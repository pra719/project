const axios = require('axios');
const crypto = require('crypto');
const forge = require('node-forge');

const API_BASE = 'http://localhost:5000';

// Test private key from fresh registration (testuser4)
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDLis/NDjOxZLVT
qVUoPWB6y5RLyEU5wXm3gmPc16UCabhfbssHml5B9/+Pvsn5JOPHVDnxIVrE5YxF
Hor14WsD+odaqI1/mthvcDgScXrsz6Pzgyo+fSc8VxbXteGPXQspNxsXdZo0VCx8
FABJRdITaZMBLczs4jkeLdnyUYZMHn+ghhGHTv3rEBG9ClMau0DDj5CkPxJe/e1M
5xk55b5WGht+64gh+78SKaBbkmQA4fiWaiLl4UbdrKJGxkk07Tgg4TKI7P0EDtp6
kHDw52N9S0nnh1nAD8O3NavBmq+RRQ9+EOsvbXwz0AUKdDzXoqQjZ70Gzo4Vqswg
8XvKvUsPAgMBAAECggEAChv33DBjYuEknGYho6EAxLiNwgHNZmP0nqesPBC90lPb
42mGTfddzRr7J3GLaINriL/nLNHCR1s7T0eIEVRD02vDAz6x4G+ZZleFgWz/dPmP
JA4UsAvZQgb1THttG4i8gCyLfOvLX+P6XaNErF76YxpwQbO7pNxLh/MxCvb/m5Il
gC+04C+3vWeSNF4GxJDQCZR1e3d2QJGA4EFLREKiTFKprc4gKbuAnSsiBVkmEcrx
JkXIMvhgmVxsCg6IKD8Dlrxe5BrjMxIWGXR+rp4YF4LYMbI0avLnq1y1cr7rVBOg
ouK/BTQEc/Msm6FGIE0jSzCIWyKkWPruO8RYLITzyQKBgQDxyePXECGgLVG509Wb
7g0wuvK0BJiB2ka8uO25W6TsX9aGZ5ttK4PZMP+1s+Cn5x2DWxOd2G79GEw3iOrY
nat0gSKFPLmy3ccm0dy/Yg/tOdM1jCHVV290gRhlK+jpCyKdfiYklc5oSqP6MFn6T
9ka+tEg2sUFhyIUaU+b8mlm+iwKBgQDXgXD9XUFZP6VdL2uuFVq6Ck3QwOxY/Yna
eioERy2B5sX7I8E0OFK/rrEE9uE0mCd7CO4JrEVBsNkIKGFwumX9cEef/kOcKpbZ
wq6GZ/wmNaQRxVIu5l/kJfjYDWxfplQsfl7h+O668hzaLXX0QjuaiQMW/pERRq0c
KDo9r42aDQKBgQCmNW18+mbTEDQ89MTDQtooZGrQmtQnd1/m/YzVPY1au+rhS7mJ
Sz+AfvFY+8T0RqiAEoyilhR9wUUra+BcUuGc/rB8mOI9HGhWuRPX16paXWqOqFLY
aaJRPD7Izshb/kkoIIh5iUUhjLAmppPurH4nPBDkH+ddC5WL6p8/h+8nTwKBgQDI
z2kF7jvSeigQ6Pshv+xGpwtTljGlyrsFxggY7GpPPUcGeY6ypjkVPCbfRV0csRs4
3l1QziHK0IurulTxwf7/ZfyX7Un63wSp7WrK+2JOCHXVyVSHN0vrQCbcy8VMa6TL
wQWQ83Eg6jJQa0QaUw1PNpSWfKeYvY7ZSfLbQBZmkQKBgDIhCkpVxpG4ap78qSGh
+UHI46wreqWQwLNUTQzo/udnuUUNW2xOHMAbjw/WDxQFK3kqs4cg6ihNtTVJ6NN/
sxAJfJqoIk1uyuJeY2BsbTLbuQbAC0IrZh7lgidwwPwQAOVff6yY8XX+8c7x5OM+
OqwRzWwN4ejxGufXPM4+3fjh
-----END PRIVATE KEY-----`;

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

async function testLogin() {
  console.log('🔐 Testing SecureShare Login Flow...\n');
  
  try {
    // Step 1: Test backend connectivity
    console.log('1️⃣ Testing backend connectivity...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('   ✅ Backend is running:', healthResponse.data.status);
    
    // Step 2: Get challenge
    console.log('\n2️⃣ Getting authentication challenge...');
    const challengeResponse = await axios.post(`${API_BASE}/api/auth/challenge`);
    const challenge = challengeResponse.data.challenge;
    console.log('   ✅ Challenge received:', challenge.substring(0, 20) + '...');
    
    // Step 3: Sign challenge
    console.log('\n3️⃣ Signing challenge with private key...');
    const signature = signChallenge(challenge, PRIVATE_KEY);
    console.log('   ✅ Challenge signed successfully');
    
    // Step 4: Attempt login
    console.log('\n4️⃣ Attempting login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'testuser4',
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
    
    console.log('\n🎉 All tests passed! Login functionality is working correctly.\n');
    
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
  await testLogin();
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testLogin, signChallenge };