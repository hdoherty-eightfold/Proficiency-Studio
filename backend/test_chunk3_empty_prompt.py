import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:5000"

# Set up API key
google_api_key = os.getenv('GOOGLE_API_KEY', '')
if google_api_key:
    requests.post(f"{API_URL}/api/keys/update", json={"google": google_api_key})
    print("✅ API key configured")

print("=" * 60)
print("TESTING CHUNK 3 WITH EMPTY PROMPT TEMPLATE")
print("This simulates the UI sending empty string for prompt_template")
print("=" * 60)

# Create chunk 3 skills (817-1223)
chunk3_skills = [{"name": f"Skill {i}", "skill_name": f"Skill {i}"} 
                 for i in range(817, 1224)]  # 407 skills

print(f"\nTesting {len(chunk3_skills)} skills (Chunk 3: 817-1223)")

# Test 1: With empty string prompt (what UI sends)
print("\n" + "="*50)
print("TEST 1: Empty string prompt_template (UI behavior)")
print("="*50)

request_data = {
    "skills": chunk3_skills,
    "resume_text": "",  # Empty as UI sends
    "provider": "google",
    "model": "gemini-1.5-flash",
    "use_langchain": True,
    "response_format": "minimal",
    "include_reasoning": False,
    "prompt_template": "",  # EMPTY STRING - what UI sends!
    "batch_size": 407,
    "concurrent_batches": 1,
    "processing_mode": "sequential",
    "chunk_start": 0,
    "chunk_size": 407,
    "is_chunked": True
}

print("Sending with prompt_template='\"\"' (empty string)...")
try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=180
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        print(f"✅ SUCCESS: {len(assessed)}/{len(chunk3_skills)} skills assessed")
        
        if assessed:
            first = assessed[0]
            if 'reasoning' in first and first['reasoning']:
                print(f"❌ Reasoning found: {first['reasoning'][:50]}")
            else:
                print(f"✅ No reasoning (as expected)")
    else:
        error = response.json()
        print(f"❌ FAILED: {error.get('detail', 'Unknown')[:200]}")
        
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 2: With None prompt (not sent)
print("\n" + "="*50)
print("TEST 2: No prompt_template key (None)")
print("="*50)

request_data2 = {
    "skills": chunk3_skills[:100],  # Test with smaller subset
    "resume_text": "",
    "provider": "google",
    "model": "gemini-1.5-flash",
    "use_langchain": True,
    "response_format": "minimal",
    "include_reasoning": False,
    # NO prompt_template key at all
    "batch_size": 100,
    "concurrent_batches": 1,
    "processing_mode": "sequential"
}

print("Sending without prompt_template key (None)...")
try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data2,
        timeout=60
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        print(f"✅ SUCCESS: {len(assessed)}/100 skills assessed")
    else:
        error = response.json()
        print(f"❌ FAILED: {error.get('detail', 'Unknown')}")
        
except Exception as e:
    print(f"❌ Exception: {e}")

print("\n" + "="*60)
print("CONCLUSION")
print("="*60)
print("""
The issue was that the UI sends an empty string "" for prompt_template,
but the backend was only checking for None. This caused chunk 3 to 
fail because it didn't get a proper prompt.

FIX APPLIED: Changed backend check from:
  elif prompt_template is None:
To:
  elif not prompt_template:  # Handles None, empty string, etc.

This should now work for chunk 3!
""")