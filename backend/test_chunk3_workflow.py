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
print("TESTING FULL WORKFLOW WITH 3 CHUNKS")
print("Simulating exact UI workflow to identify chunk 3 issue")
print("=" * 60)

# Create full 1223 skills dataset
all_skills = []
for i in range(1, 1224):  # 1223 skills total
    all_skills.append({
        "name": f"Skill {i}",
        "skill_name": f"Skill {i}"
    })

print(f"\nTotal skills: {len(all_skills)}")

# Simulate chunking like UI does
chunk_size = 408
chunks = [
    all_skills[0:408],      # Chunk 1: Skills 1-408
    all_skills[408:816],    # Chunk 2: Skills 409-816  
    all_skills[816:1223]    # Chunk 3: Skills 817-1223 (407 skills)
]

print(f"Chunk 1: {len(chunks[0])} skills (1-408)")
print(f"Chunk 2: {len(chunks[1])} skills (409-816)")
print(f"Chunk 3: {len(chunks[2])} skills (817-1223)")

# Track accumulated results like UI does
accumulated_results = []
session_state = {}

for chunk_num, chunk_skills in enumerate(chunks, 1):
    print(f"\n{'='*50}")
    print(f"PROCESSING CHUNK {chunk_num}")
    print(f"{'='*50}")
    
    # Build request exactly like UI does
    request_data = {
        "skills": chunk_skills,
        "resume_text": "Senior developer with 10 years experience",
        "provider": "google",
        "model": "gemini-1.5-flash",
        "use_langchain": True,
        "response_format": "minimal",  # Using minimal format like user selected
        "include_reasoning": False,     # User had this off
        "batch_size": len(chunk_skills),
        "concurrent_batches": 1,
        "processing_mode": "sequential"
    }
    
    print(f"Sending {len(chunk_skills)} skills...")
    print(f"Format: minimal, Reasoning: OFF")
    print(f"Accumulated results before: {len(accumulated_results)}")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_URL}/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=180
        )
        
        elapsed = time.time() - start_time
        
        print(f"Response in {elapsed:.2f}s - Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            assessed = result.get('assessed_skills', [])
            
            # Check what we got
            print(f"✅ Assessed: {len(assessed)}/{len(chunk_skills)}")
            
            # Add to accumulated results
            accumulated_results.extend(assessed)
            print(f"Total accumulated: {len(accumulated_results)}")
            
            # Check for issues
            if result.get('warning'):
                print(f"⚠️ Warning: {result['warning']}")
            
            if result.get('recovered_skills'):
                print(f"🔧 Recovered {result['recovered_skills']} skills from partial response")
                
            # Check if reasoning leaked through
            if assessed:
                first = assessed[0]
                if 'reasoning' in first and first['reasoning']:
                    print(f"❌ REASONING LEAKED: {first['reasoning'][:50]}...")
                else:
                    print(f"✅ No reasoning (as requested)")
                    
            # Save some session state
            if 'llm_raw_response' in result:
                session_state[f'chunk_{chunk_num}_raw'] = len(result['llm_raw_response'])
                print(f"Raw response size: {len(result['llm_raw_response']):,} chars")
                
        else:
            print(f"❌ CHUNK {chunk_num} FAILED!")
            
            try:
                error_data = response.json()
                print(f"Error type: {error_data.get('error_type', 'unknown')}")
                print(f"Error: {error_data.get('detail', 'Unknown')[:200]}")
                
                if error_data.get('recovered_skills'):
                    print(f"Partial recovery: {error_data['recovered_skills']} skills")
                    recovered = error_data.get('assessed_skills', [])
                    if recovered:
                        accumulated_results.extend(recovered)
                        print(f"Added recovered skills, total: {len(accumulated_results)}")
                        
            except:
                print(f"Raw error: {response.text[:200]}")
                
            # Analyze why this chunk failed
            if chunk_num == 3:
                print("\n🔍 CHUNK 3 FAILURE ANALYSIS:")
                print(f"  - Chunk size: {len(chunk_skills)}")
                print(f"  - Skill range: {chunk_skills[0]['name']} to {chunk_skills[-1]['name']}")
                print(f"  - Session state accumulated: {sum(session_state.values()) if session_state else 0} bytes")
                print(f"  - Previous chunks processed: {chunk_num - 1}")
                
    except requests.Timeout:
        print(f"❌ Chunk {chunk_num} TIMED OUT after 180s")
    except Exception as e:
        print(f"❌ Chunk {chunk_num} EXCEPTION: {e}")

# Final summary
print(f"\n{'='*60}")
print("WORKFLOW SUMMARY")
print(f"{'='*60}")

print(f"Total skills processed: {len(accumulated_results)}/{len(all_skills)}")
print(f"Success rate: {len(accumulated_results)/len(all_skills)*100:.1f}%")

if len(accumulated_results) < len(all_skills):
    missing_count = len(all_skills) - len(accumulated_results)
    print(f"\n❌ MISSING {missing_count} SKILLS")
    
    # Identify which chunk failed
    if len(accumulated_results) == 816:
        print("  → Chunk 3 completely failed (0/407 assessed)")
        print("  → This matches the user's reported issue!")
    elif len(accumulated_results) < 408:
        print(f"  → Chunk 1 partially failed")
    elif len(accumulated_results) < 816:
        print(f"  → Chunk 2 partially failed")
    else:
        print(f"  → Chunk 3 partially failed")

print(f"\n{'='*60}")
print("DIAGNOSTIC INSIGHTS")
print(f"{'='*60}")

print("""
Potential causes for chunk 3 failure:

1. CUMULATIVE TOKEN USAGE
   - Google Gemini may track tokens across the session
   - By chunk 3, we may hit session limits
   
2. RESPONSE SIZE ACCUMULATION  
   - Even with minimal format, 407 skills generates large response
   - Previous chunks' state may affect memory/buffer
   
3. SKILL INDEX RANGE
   - Skills 817-1223 might have different characteristics
   - Could trigger different prompt behavior
   
4. TIMING/RATE LIMITS
   - Sequential processing of chunks may hit rate limits
   - Chunk 3 happens after ~2-3 minutes of processing
   
5. BACKEND STATE
   - Session variables or caching may affect chunk 3
   - Memory buildup from previous chunks

RECOMMENDATIONS:
- Add delay between chunks
- Reduce chunk 3 size to 300 skills
- Clear session state between chunks
- Use even more minimal format for chunk 3
""")