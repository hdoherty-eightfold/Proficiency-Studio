import requests
import json
import time
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
print("TESTING CHUNK 3 FAILURE SCENARIO")
print("=" * 60)

# Create test skills that simulate chunk 3 (skills 817-1223, which is 407 skills)
test_skills = []
for i in range(817, 1224):  # 407 skills like chunk 3
    test_skills.append({
        "name": f"Skill {i}",
        "skill_name": f"Skill {i}"
    })

print(f"Created {len(test_skills)} skills (simulating chunk 3)")

# Test different batch sizes to see what works
batch_sizes = [407, 300, 200, 100]

for batch_size in batch_sizes:
    print(f"\n{'='*40}")
    print(f"Testing with batch size: {batch_size}")
    print(f"{'='*40}")
    
    request_data = {
        "skills": test_skills[:batch_size],  # Test with different sizes
        "resume_text": "Senior developer with 10 years experience",
        "provider": "google",
        "model": "gemini-1.5-flash",
        "use_langchain": True,
        "response_format": "json",
        "include_reasoning": False,  # No reasoning to reduce tokens
        "batch_size": batch_size,
        "concurrent_batches": 1,
        "processing_mode": "sequential"
    }
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_URL}/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=180  # 3 minute timeout
        )
        
        elapsed = time.time() - start_time
        
        print(f"Response received in {elapsed:.2f}s")
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            assessed = result.get('assessed_skills', [])
            
            print(f"✅ Success: {len(assessed)}/{batch_size} skills assessed")
            
            # Check for warnings
            if 'warning' in result:
                print(f"⚠️ Warning: {result['warning']}")
            
            # Check if reasoning was included
            if assessed:
                has_reasoning = 'reasoning' in assessed[0] and assessed[0]['reasoning']
                if has_reasoning:
                    print(f"❌ REASONING STILL INCLUDED: {assessed[0]['reasoning'][:50]}...")
                else:
                    print(f"✅ No reasoning (as requested)")
            
            # If this batch size works, we found our limit
            if len(assessed) == batch_size:
                print(f"\n🎯 WORKING BATCH SIZE FOUND: {batch_size} skills")
                break
                
        else:
            print(f"❌ Failed with status {response.status_code}")
            
            try:
                error_data = response.json()
                print(f"Error type: {error_data.get('error_type', 'unknown')}")
                print(f"Error detail: {error_data.get('detail', '')[:200]}")
                
                if error_data.get('error_type') == 'truncated_response':
                    print(f"  Response truncated at: {error_data.get('response_length', 0)} chars")
                    print(f"  Suggested batch size: {error_data.get('suggested_batch_size', 'not provided')}")
                    
            except:
                print(f"Raw error: {response.text[:200]}")
                
    except requests.Timeout:
        print(f"❌ Request timed out after 180 seconds")
    except Exception as e:
        print(f"❌ Exception: {e}")

print(f"\n{'='*60}")
print("TESTING SPECIFIC CHUNK 3 CHARACTERISTICS")  
print(f"{'='*60}")

# Test if it's an issue with the specific skill indices
print("\nTesting if skill indices matter...")

# Test with skills from beginning (like chunk 1)
chunk1_skills = [{"name": f"Skill {i}", "skill_name": f"Skill {i}"} for i in range(1, 408)]

# Test with skills from middle (like chunk 2)  
chunk2_skills = [{"name": f"Skill {i}", "skill_name": f"Skill {i}"} for i in range(409, 817)]

# Test with actual chunk 3 skills
chunk3_skills = test_skills

for chunk_name, chunk_skills in [("Chunk 1 range", chunk1_skills[:100]), 
                                  ("Chunk 2 range", chunk2_skills[:100]),
                                  ("Chunk 3 range", chunk3_skills[:100])]:
    print(f"\nTesting {chunk_name} (100 skills)...")
    
    request_data = {
        "skills": chunk_skills,
        "resume_text": "Senior developer",
        "provider": "google",
        "model": "gemini-1.5-flash",
        "use_langchain": True,
        "response_format": "json",
        "include_reasoning": False,
        "batch_size": 100,
        "concurrent_batches": 1,
        "processing_mode": "sequential"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            assessed = len(result.get('assessed_skills', []))
            print(f"  ✅ {chunk_name}: {assessed}/100 assessed")
        else:
            print(f"  ❌ {chunk_name}: Failed")
            
    except Exception as e:
        print(f"  ❌ {chunk_name}: Exception - {e}")

print(f"\n{'='*60}")
print("CONCLUSIONS")
print(f"{'='*60}")

print("""
Possible causes for chunk 3 failure:

1. BATCH SIZE: 407 skills might be too large for Google Gemini
   - Chunks 1 & 2 work with 408, but chunk 3 with 407 fails
   - Could be cumulative token usage across session

2. SKILL INDICES: Skills 817-1223 might have different characteristics
   - Longer names, special characters, etc.

3. RESPONSE FORMAT: Even without reasoning, response might be too large

4. SESSION STATE: Previous chunks might affect API limits

RECOMMENDATIONS:
- Reduce batch size for chunk 3 to 300 or less
- Clear session/cache between chunks
- Use minimal response format for large chunks
""")

