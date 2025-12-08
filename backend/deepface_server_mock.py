"""
Mock DeepFace Server for Testing
This server simulates face verification without requiring TensorFlow
Use this for development/testing when the full DeepFace server has issues
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import os
import requests
import json
import random

app = Flask(__name__)
CORS(app)

# Pinata IPFS Configuration
PINATA_API_KEY = '3187896e7a54df5fcfd2'
PINATA_GATEWAY_KEY = 'OLaRsBdZKNqJSkOJGJfbB8aVaJtbbR87hTz-P2vondDL9_bvSEU_mkxQaV97K9BM'
PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

# Supabase Configuration
SUPABASE_URL = 'https://goupzmplowjbnnxmnvou.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdXB6bXBsb3dqYm5ueG1udm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODM4MDAsImV4cCI6MjA2NDk1OTgwMH0.gaexqL8IPmJnkMB6FH7ie-92j5kLvp0Ud2MvDhFnzyg'

def get_face_hash(user_id):
    """Get IPFS hash for user from local mapping or Supabase"""
    print(f"🔍 Looking up face for user: {user_id}")
    
    # Try local mapping first
    mapping_file = 'face_mappings.json'
    if os.path.exists(mapping_file):
        with open(mapping_file, 'r') as f:
            mappings = json.load(f)
        
        # Direct lookup
        if user_id in mappings:
            ipfs_hash = mappings[user_id].get('ipfs_hash')
            if ipfs_hash:
                print(f"✅ Found IPFS hash: {ipfs_hash[:20]}...")
                return ipfs_hash
        
        # Search by email or UUID
        for key, value in mappings.items():
            if value.get('email') == user_id or value.get('supabase_uuid') == user_id:
                ipfs_hash = value.get('ipfs_hash')
                if ipfs_hash:
                    print(f"✅ Found IPFS hash by {key}")
                    return ipfs_hash
    
    print(f"❌ No face data found for: {user_id}")
    return None

def verify_has_registered_face(user_id):
    """Check if user has a registered face in IPFS"""
    ipfs_hash = get_face_hash(user_id)
    if ipfs_hash:
        # Try to fetch from IPFS to confirm it exists
        try:
            url = f'{PINATA_GATEWAY}/{ipfs_hash}?pinataGatewayToken={PINATA_GATEWAY_KEY}'
            response = requests.head(url, timeout=5)
            return response.status_code == 200
        except:
            return True  # Assume exists if we can't check
    return False

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'mode': 'mock',
        'message': 'Mock DeepFace server running (no TensorFlow required)'
    })

@app.route('/verify', methods=['POST'])
def verify_face():
    """Mock face verification - simulates DeepFace behavior"""
    try:
        data = request.json
        img1_data = data.get('img1_path')  # Base64 captured image
        user_id = data.get('user_id')       # User ID for IPFS lookup
        model_name = data.get('model_name', 'VGG-Face')
        
        print(f"📸 Verification request for user: {user_id}")
        print(f"📸 Model: {model_name}")
        
        if not user_id:
            return jsonify({
                'error': 'user_id is required',
                'verified': False
            }), 400
        
        # Check if image data exists
        if not img1_data:
            return jsonify({
                'error': 'No image data provided',
                'verified': False
            }), 400
        
        # Validate image size (basic check)
        if img1_data.startswith('data:image'):
            img_size = len(img1_data.split(',')[1]) if ',' in img1_data else 0
            print(f"📸 Image size: {img_size // 1024}KB")
            
            if img_size < 1000:  # Less than 1KB is too small
                return jsonify({
                    'error': 'Image too small - camera may not be working',
                    'verified': False
                }), 400
        
        # Check if user has registered face
        ipfs_hash = get_face_hash(user_id)
        
        if not ipfs_hash:
            return jsonify({
                'error': f'No registered face found for user: {user_id}',
                'verified': False
            }), 404
        
        # MOCK VERIFICATION - In production, this would use DeepFace
        # For testing, we simulate verification based on having a registered face
        # 
        # Real DeepFace would:
        # 1. Download reference image from IPFS
        # 2. Compare captured face with reference using neural network
        # 3. Return match score and threshold
        
        # Simulate successful verification for registered users
        distance = random.uniform(0.1, 0.3)  # Simulated distance score
        threshold = 0.4  # Typical threshold for VGG-Face
        verified = distance < threshold
        confidence = int((1 - distance) * 100)
        
        print(f"✅ Mock verification result: verified={verified}, confidence={confidence}%")
        
        # Record to Supabase (for audit trail)
        record_verification_attempt(user_id, verified, confidence)
        
        return jsonify({
            'verified': verified,
            'distance': distance,
            'threshold': threshold,
            'confidence': confidence,
            'model': model_name,
            'mode': 'mock',
            'ipfs_hash': ipfs_hash[:20] + '...'
        })
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({
            'error': str(e),
            'verified': False
        }), 500

def record_verification_attempt(user_id, success, confidence):
    """Record verification attempt to Supabase"""
    try:
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        # Try to get recipient UUID
        recipient_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/recipients?user_id=eq.{user_id}&select=id',
            headers=headers
        )
        
        recipient_uuid = None
        if recipient_response.status_code == 200:
            data = recipient_response.json()
            if data:
                recipient_uuid = data[0]['id']
        
        if recipient_uuid:
            record = {
                'recipient_id': recipient_uuid,
                'verified': success,
                'confidence_score': confidence / 100.0,
                'verification_method': 'face_mock'
            }
            
            requests.post(
                f'{SUPABASE_URL}/rest/v1/face_auth_records',
                headers=headers,
                json=record
            )
            print(f"📝 Recorded verification to Supabase")
    except Exception as e:
        print(f"⚠️ Could not record to Supabase: {e}")

@app.route('/register', methods=['POST'])
def register_face():
    """Mock face registration"""
    try:
        data = request.json
        user_id = data.get('user_id')
        img_data = data.get('image')
        
        if not user_id or not img_data:
            return jsonify({
                'error': 'user_id and image are required',
                'success': False
            }), 400
        
        # In mock mode, just confirm registration
        print(f"📸 Mock registration for: {user_id}")
        
        return jsonify({
            'success': True,
            'message': f'Face registered for {user_id} (mock mode)',
            'mode': 'mock'
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🎭 MOCK DeepFace Server Starting...")
    print("=" * 60)
    print("⚠️  This is a MOCK server for testing")
    print("⚠️  Real face verification requires TensorFlow + DeepFace")
    print("=" * 60)
    print(f"📍 Server: http://localhost:5000")
    print(f"📍 Health: http://localhost:5000/health")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
