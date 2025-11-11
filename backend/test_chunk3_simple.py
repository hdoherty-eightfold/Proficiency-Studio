import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:5000"

# Set up API key
google_api_key = os.getenv('GOOGLE_API_KEY', '')
if google_api_key:
    r = requests.post(f"{API_URL}/api/keys/update", json={"google": google_api_key})
    print(f"API key setup: {r.status_code}")

# Create exactly 407 skills like chunk 3
skills = [{"name": f"Skill {i}", "skill_name": f"Skill {i}"} for i in range(817, 1224)]
print(f"Testing {len(skills)} skills (chunk 3 size)")

# Test with include_reasoning False
request_data = {
    "skills": skills,
    "resume_text": "Senior developer",
    "provider": "google",
    "model": "gemini-1.5-flash",
    "use_langchain": True,
    "response_format": "json",
    "include_reasoning": False,  # This should prevent reasoning
    "batch_size": 407,
    "concurrent_batches": 1,
    "processing_mode": "sequential"
}

print("\nMaking request with include_reasoning=False...")
try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=120
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        print(f"Skills assessed: {len(assessed)}/{len(skills)}")
        
        # Check first skill for reasoning
        if assessed:
            first = assessed[0]
            if 'reasoning' in first and first['reasoning']:
                print(f"❌ REASONING FOUND: '{first['reasoning']}'")
            else:
                print(f"✅ No reasoning field or empty")
                
        if result.get('warning'):
            print(f"Warning: {result['warning']}")
    else:
        error = response.json()
        print(f"Error: {error.get('detail', 'Unknown')[:200]}")
        if error.get('suggested_batch_size'):
            print(f"Suggested batch size: {error['suggested_batch_size']}")
            
except Exception as e:
    print(f"Exception: {e}")

