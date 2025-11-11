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

print("=" * 60)
print("FINAL TEST: Chunk 3 (407 skills) with fixed prompt handling")
print("=" * 60)

# Create chunk 3 skills exactly as UI would
chunk3_skills = []
for i in range(817, 1224):  # 407 skills (817-1223)
    chunk3_skills.append({
        "name": f"Skill {i}",
        "skill_name": f"Skill {i}"
    })

print(f"Skills: {len(chunk3_skills)} (from Skill 817 to Skill 1223)")

# Simulate exact UI request
request_data = {
    "skills": chunk3_skills,
    "provider": "google",
    "model": "gemini-1.5-flash",
    "proficiency_levels": ["1", "2", "3", "4", "5"],
    "prompt_template": "",  # Empty string as UI sends
    "use_langchain": True,
    "response_format": "minimal",
    "include_reasoning": False,
    "batch_size": 407,
    "concurrent_batches": 1,
    "processing_mode": "sequential",
    "chunk_start": 0,
    "chunk_size": 407,
    "is_chunked": True,
    "total_skills_available": 1223
}

print("\nRequest settings:")
print(f"  - Format: minimal (arrays only)")
print(f"  - Reasoning: OFF")
print(f"  - Prompt: Empty string (will use default)")
print(f"  - Batch size: {request_data['batch_size']}")

print("\nSending request...")
try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=180
    )
    
    print(f"\nResponse: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        
        print(f"\n✅ SUCCESS!")
        print(f"  - Skills assessed: {len(assessed)}/{len(chunk3_skills)}")
        
        # Check for issues
        if result.get('warning'):
            print(f"  - Warning: {result['warning']}")
        
        if result.get('recovered_skills'):
            print(f"  - Recovered from partial: {result['recovered_skills']} skills")
        
        # Verify no reasoning
        if assessed:
            has_reasoning = any('reasoning' in s and s.get('reasoning') for s in assessed[:5])
            if has_reasoning:
                print(f"  ❌ Reasoning still present!")
            else:
                print(f"  ✅ No reasoning (as expected)")
        
        # Success rate
        success_rate = (len(assessed) / len(chunk3_skills)) * 100
        print(f"\n  Success rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            print(f"\n🎆 CHUNK 3 IS NOW WORKING PERFECTLY! 🎆")
        elif success_rate > 90:
            print(f"\n✅ Chunk 3 mostly working ({success_rate:.0f}% success)")
        else:
            print(f"\n⚠️ Chunk 3 partial success ({success_rate:.0f}%)")
            
    else:
        error = response.json()
        print(f"\n❌ FAILED")
        print(f"  Error: {error.get('detail', 'Unknown')[:200]}")
        print(f"  Type: {error.get('error_type', 'unknown')}")
        
except Exception as e:
    print(f"\n❌ Exception: {e}")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print("""
The fix applied:
1. Changed backend to handle empty prompt_template string
2. Backend now uses default prompt when prompt_template is empty
3. This prevents chunk 3 from failing due to missing prompt

Chunk 3 should now process successfully!
""")