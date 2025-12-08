from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import base64
import os
import tempfile
import requests
import json

app = Flask(__name__)
CORS(app)

# Pinata IPFS Configuration
PINATA_API_KEY = '3187896e7a54df5fcfd2'
PINATA_GATEWAY_KEY = 'OLaRsBdZKNqJSkOJGJfbB8aVaJtbbR87hTz-P2vondDL9_bvSEU_mkxQaV97K9BM'
PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJhYzkyYTIyZS0yZWIyLTRjODctYmE5ZC05M2U4ODlhNTkwMWIiLCJlbWFpbCI6ImNoYWl0YW55YWRhbmR1MDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjMxODc4OTZlN2E1NGRmNWZjZmQyIiwic2NvcGVkS2V5U2VjcmV0IjoiMmVmZDc0MWFmNmM1MjViMjEyN2Y0OWIyYTk1Mzc2ODY4OGQzMDE2NDU4NGNkYjMzZWYwMjc1NzJlMjJkNDc2ZiIsImV4cCI6MTc5NDQyMDQ0Nn0.2CNUVHWCSM5s1Up6WNKt6YBvebNQM6smR6eNw53owHs'
PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

# Supabase Configuration
SUPABASE_URL = 'https://goupzmplowjbnnxmnvou.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdXB6bXBsb3dqYm5ueG1udm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODM4MDAsImV4cCI6MjA2NDk1OTgwMH0.gaexqL8IPmJnkMB6FH7ie-92j5kLvp0Ud2MvDhFnzyg'

def get_face_hash_from_supabase(user_id):
    """Get IPFS hash from Supabase recipients table by user_id, email, or UUID"""
    try:
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}'
        }
        
        # Try to find by user_id first
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/recipients?user_id=eq.{user_id}&select=id,user_id,email,name,face_encoding_id',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                recipient = data[0]
                print(f"✅ Found recipient in Supabase: {recipient['name']} (UUID: {recipient['id']})")
                return {
                    'ipfs_hash': recipient.get('face_encoding_id'),
                    'supabase_uuid': recipient['id'],
                    'name': recipient['name'],
                    'email': recipient['email']
                }
        
        # Try by email
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/recipients?email=eq.{user_id}&select=id,user_id,email,name,face_encoding_id',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                recipient = data[0]
                print(f"✅ Found recipient by email: {recipient['name']}")
                return {
                    'ipfs_hash': recipient.get('face_encoding_id'),
                    'supabase_uuid': recipient['id'],
                    'name': recipient['name'],
                    'email': recipient['email']
                }
        
        # Try by UUID
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/recipients?id=eq.{user_id}&select=id,user_id,email,name,face_encoding_id',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                recipient = data[0]
                print(f"✅ Found recipient by UUID: {recipient['name']}")
                return {
                    'ipfs_hash': recipient.get('face_encoding_id'),
                    'supabase_uuid': recipient['id'],
                    'name': recipient['name'],
                    'email': recipient['email']
                }
        
        return None
    except Exception as e:
        print(f"❌ Error fetching from Supabase: {e}")
        return None

def get_face_hash(user_id):
    """Get IPFS hash for user - first try Supabase, then local mapping file"""
    print(f"🔍 Looking up face for user: {user_id}")
    
    # 1. First try Supabase
    supabase_data = get_face_hash_from_supabase(user_id)
    if supabase_data and supabase_data.get('ipfs_hash'):
        print(f"✅ Found IPFS hash in Supabase: {supabase_data['ipfs_hash'][:20]}...")
        return supabase_data['ipfs_hash']
    
    # 2. Fall back to local mapping file
    try:
        mapping_file = 'face_mappings.json'
        if os.path.exists(mapping_file):
            with open(mapping_file, 'r') as f:
                mappings = json.load(f)
            
            # Direct lookup
            if user_id in mappings:
                ipfs_hash = mappings[user_id].get('ipfs_hash')
                if ipfs_hash:
                    print(f"✅ Found IPFS hash in local mapping: {ipfs_hash[:20]}...")
                    return ipfs_hash
            
            # Search by email or supabase_uuid
            for key, value in mappings.items():
                if value.get('email') == user_id or value.get('supabase_uuid') == user_id:
                    ipfs_hash = value.get('ipfs_hash')
                    if ipfs_hash:
                        print(f"✅ Found IPFS hash by {key}: {ipfs_hash[:20]}...")
                        return ipfs_hash
        
        print(f"❌ No face data found for user: {user_id}")
        return None
    except Exception as e:
        print(f"❌ Error getting face hash: {e}")
        return None

def download_from_ipfs(ipfs_hash):
    """Download face image from Pinata IPFS using dedicated gateway"""
    try:
        # Use Pinata dedicated gateway with gateway key for faster access
        url = f'{PINATA_GATEWAY}/{ipfs_hash}?pinataGatewayToken={PINATA_GATEWAY_KEY}'
        print(f"📥 Downloading from IPFS: {ipfs_hash[:20]}...")
        response = requests.get(url)
        if response.status_code == 200:
            print(f"✅ Downloaded {len(response.content)} bytes from IPFS")
            return response.content
        print(f"❌ IPFS download failed: {response.status_code}")
        return None
    except Exception as e:
        print(f"❌ Error downloading from IPFS: {e}")
        return None

def upload_to_ipfs(user_id, image_data):
    """Upload face image to Pinata IPFS"""
    try:
        files = {
            'file': (f'{user_id}.jpg', image_data, 'image/jpeg')
        }
        
        metadata = {
            'name': f'Face-{user_id}',
            'keyvalues': {
                'userId': user_id,
                'type': 'face_recognition'
            }
        }
        
        data = {
            'pinataMetadata': json.dumps(metadata)
        }
        
        response = requests.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {PINATA_JWT}'}
        )
        
        if response.status_code == 200:
            return response.json()['IpfsHash']
        return None
    except Exception as e:
        print(f"❌ Error uploading to IPFS: {e}")
        return None

def store_face_mapping(user_id, ipfs_hash):
    """Store user ID to IPFS hash mapping locally and in Supabase"""
    try:
        # 1. Store locally
        mapping_file = 'face_mappings.json'
        
        if os.path.exists(mapping_file):
            with open(mapping_file, 'r') as f:
                mappings = json.load(f)
        else:
            mappings = {}
        
        mappings[user_id] = {
            'ipfs_hash': ipfs_hash,
            'timestamp': '2024-12-08'
        }
        
        with open(mapping_file, 'w') as f:
            json.dump(mappings, f, indent=2)
        
        # 2. Update Supabase recipients table
        update_supabase_face_encoding(user_id, ipfs_hash)
        
        return True
    except Exception as e:
        print(f"❌ Error storing mapping: {e}")
        return False

def update_supabase_face_encoding(user_id, ipfs_hash):
    """Update face_encoding_id in Supabase recipients table"""
    try:
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        # Try to update by user_id
        response = requests.patch(
            f'{SUPABASE_URL}/rest/v1/recipients?user_id=eq.{user_id}',
            headers=headers,
            json={
                'face_encoding_id': ipfs_hash,
                'face_auth_enabled': True,
                'face_registered_at': '2024-12-08T00:00:00Z'
            }
        )
        
        if response.status_code in [200, 204]:
            print(f"✅ Updated Supabase face_encoding_id for {user_id}")
            return True
        
        # Try by email
        response = requests.patch(
            f'{SUPABASE_URL}/rest/v1/recipients?email=eq.{user_id}',
            headers=headers,
            json={
                'face_encoding_id': ipfs_hash,
                'face_auth_enabled': True,
                'face_registered_at': '2024-12-08T00:00:00Z'
            }
        )
        
        if response.status_code in [200, 204]:
            print(f"✅ Updated Supabase face_encoding_id by email for {user_id}")
            return True
            
        print(f"⚠️ Could not update Supabase for {user_id}: {response.status_code}")
        return False
    except Exception as e:
        print(f"❌ Error updating Supabase: {e}")
        return False

def record_face_verification(recipient_uuid, status, confidence, ipfs_hash, purpose='signing'):
    """Record face verification attempt in Supabase face_auth_records"""
    try:
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/face_auth_records',
            headers=headers,
            json={
                'recipient_id': recipient_uuid,
                'verification_status': status,
                'confidence_score': confidence,
                'image_hash': ipfs_hash,
                'purpose': purpose
            }
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Recorded face verification: {status} (confidence: {confidence})")
            return True
        
        print(f"⚠️ Could not record verification: {response.status_code}")
        return False
    except Exception as e:
        print(f"❌ Error recording verification: {e}")
        return False

@app.route('/verify', methods=['POST'])
def verify_face():
    """Verify face using DeepFace with IPFS storage"""
    try:
        data = request.json
        img1_data = data.get('img1_path')  # Base64 captured image
        user_id = data.get('user_id')      # User ID to verify against
        model_name = data.get('model_name', 'VGG-Face')
        detector_backend = data.get('detector_backend', 'opencv')
        
        # Get IPFS hash for user
        ipfs_hash = get_face_hash(user_id)
        if not ipfs_hash:
            return jsonify({
                'error': f'No face data found for user {user_id}',
                'verified': False
            }), 404
        
        # Download reference image from IPFS
        reference_image = download_from_ipfs(ipfs_hash)
        if not reference_image:
            return jsonify({
                'error': 'Failed to download reference image from IPFS',
                'verified': False
            }), 500
        
        # Decode base64 live image
        if img1_data.startswith('data:image'):
            img1_data = img1_data.split(',')[1]
        img1_bytes = base64.b64decode(img1_data)
        
        # Save both images to temp files
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as live_tmp:
            live_tmp.write(img1_bytes)
            live_path = live_tmp.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as ref_tmp:
            ref_tmp.write(reference_image)
            ref_path = ref_tmp.name
        
        try:
            # Perform face verification
            result = DeepFace.verify(
                img1_path=live_path,
                img2_path=ref_path,
                model_name=model_name,
                detector_backend=detector_backend
            )
            
            # Calculate confidence (inverse of distance)
            confidence = round((1 - result['distance']) * 100, 2)
            
            # Get recipient UUID for recording
            supabase_data = get_face_hash_from_supabase(user_id)
            recipient_uuid = supabase_data.get('supabase_uuid') if supabase_data else None
            
            # Record verification in Supabase
            if recipient_uuid:
                status = 'verified' if result['verified'] else 'failed'
                record_face_verification(recipient_uuid, status, confidence, ipfs_hash, 'signing')
            
            return jsonify({
                'verified': result['verified'],
                'distance': result['distance'],
                'threshold': result['threshold'],
                'confidence': confidence,
                'model': model_name,
                'ipfs_hash': ipfs_hash,
                'recipient_uuid': recipient_uuid
            })
        finally:
            # Clean up temp files
            os.unlink(live_path)
            os.unlink(ref_path)
            
    except Exception as e:
        return jsonify({
            'error': str(e),
            'verified': False
        }), 500

@app.route('/register', methods=['POST'])
def register_face():
    """Register new face in IPFS"""
    try:
        data = request.json
        user_id = data.get('userId')
        img_data = data.get('image')
        
        if not user_id or not img_data:
            return jsonify({'error': 'Missing userId or image'}), 400
        
        # Decode base64 image
        if img_data.startswith('data:image'):
            img_data = img_data.split(',')[1]
        img_bytes = base64.b64decode(img_data)
        
        # Upload to IPFS
        ipfs_hash = upload_to_ipfs(user_id, img_bytes)
        if not ipfs_hash:
            return jsonify({
                'error': 'Failed to upload to IPFS',
                'success': False
            }), 500
        
        # Store mapping
        if not store_face_mapping(user_id, ipfs_hash):
            return jsonify({
                'error': 'Failed to store mapping',
                'success': False
            }), 500
        
        return jsonify({
            'success': True,
            'message': f'Face registered for user {user_id}',
            'ipfs_hash': ipfs_hash,
            'gateway_url': f'https://gateway.pinata.cloud/ipfs/{ipfs_hash}'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/list_faces', methods=['GET'])
def list_faces():
    """List all registered faces"""
    try:
        mapping_file = 'face_mappings.json'
        if os.path.exists(mapping_file):
            with open(mapping_file, 'r') as f:
                mappings = json.load(f)
            return jsonify({
                'success': True,
                'faces': mappings
            })
        else:
            return jsonify({
                'success': True,
                'faces': {}
            })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/sync_supabase', methods=['POST'])
def sync_supabase():
    """Sync local face mappings to Supabase recipients table"""
    try:
        mapping_file = 'face_mappings.json'
        synced = []
        
        if os.path.exists(mapping_file):
            with open(mapping_file, 'r') as f:
                mappings = json.load(f)
            
            for user_id, data in mappings.items():
                ipfs_hash = data.get('ipfs_hash')
                if ipfs_hash:
                    if update_supabase_face_encoding(user_id, ipfs_hash):
                        synced.append(user_id)
        
        return jsonify({
            'success': True,
            'synced': synced,
            'count': len(synced)
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

if __name__ == '__main__':
    print('🚀 DeepFace IPFS API Server starting...')
    print('🔗 Pinata IPFS for decentralized face storage')
    print('🗄️  Supabase integration for recipient UUIDs')
    print('📍 Endpoints:')
    print('   POST /verify     - Verify face against IPFS reference')
    print('   POST /register   - Register new face to IPFS')
    print('   GET  /list_faces - List all registered faces')
    print('   POST /sync_supabase - Sync mappings to Supabase')
    print('')
    app.run(host='0.0.0.0', port=5000, debug=True)