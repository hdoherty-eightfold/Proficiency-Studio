import requests
import json
import time

# Test chunks 1, 2, and 3 directly to see if there's a difference

API_URL = "http://localhost:5000"

# First, let's get the skills
print("Fetching skills from JIE roles...")
jie_response = requests.get(f"{API_URL}/api/jie-roles")
if jie_response.status_code != 200:
    print(f"Error fetching JIE roles: {jie_response.status_code}")
    print(jie_response.text)
    exit(1)

jie_data = jie_response.json()
all_skills = jie_data.get('skills', [])
print(f"Total skills loaded: {len(all_skills)}")

# Define chunk parameters (matching what UI uses)
CHUNK_SIZE = 408  # Based on the 816 accumulated skills you mentioned
NUM_CHUNKS = 3

# Split into chunks
chunks = []
for i in range(NUM_CHUNKS):
    start_idx = i * CHUNK_SIZE
    end_idx = min((i + 1) * CHUNK_SIZE, len(all_skills))
    chunk_skills = all_skills[start_idx:end_idx]
    chunks.append({
        'number': i + 1,
        'start': start_idx,
        'end': end_idx,
        'skills': chunk_skills,
        'count': len(chunk_skills)
    })
    print(f"\nChunk {i+1}: Skills {start_idx+1}-{end_idx} ({len(chunk_skills)} skills)")

# Now test each chunk
print("\n" + "="*60)
print("TESTING EACH CHUNK INDIVIDUALLY")
print("="*60)

for chunk in chunks:
    print(f"\n--- Testing Chunk {chunk['number']} ---")
    print(f"Skills count: {chunk['count']}")
    
    # Prepare assessment request
    request_data = {
        "skills": chunk['skills'],
        "resume_text": "Senior software engineer with 10 years of experience",
        "provider": "google",
        "use_langchain": True,
        "batch_size": 408,  # Same as chunk size
        "concurrent_batches": 1,
        "processing_mode": "sequential"
    }
    
    # Make the request
    start_time = time.time()
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies",
        json=request_data,
        timeout=120
    )
    elapsed = time.time() - start_time
    
    print(f"Response status: {response.status_code}")
    print(f"Response time: {elapsed:.2f} seconds")
    
    if response.status_code == 200:
        result = response.json()
        assessed_count = len(result.get('assessed_skills', []))
        print(f"✅ SUCCESS: {assessed_count} skills assessed")
        
        # Check for warnings
        if 'warning' in result:
            print(f"⚠️ Warning: {result['warning']}")
            
    else:
        print(f"❌ FAILED")
        try:
            error_data = response.json()
            print(f"Error type: {error_data.get('error_type', 'unknown')}")
            print(f"Error detail: {error_data.get('detail', 'No details')[:200]}")
            
            # Check if it's a truncation error
            if error_data.get('error_type') == 'truncated_response':
                print(f"Response was truncated at {error_data.get('response_length', 0)} chars")
                print(f"Suggested batch size: {error_data.get('suggested_batch_size', 'not provided')}")
                print(f"Truncation reason: {error_data.get('truncation_reason', 'not provided')}")
                
        except:
            print(f"Raw error: {response.text[:500]}")
    
    # Add a delay between chunks
    if chunk['number'] < NUM_CHUNKS:
        print("\nWaiting 2 seconds before next chunk...")
        time.sleep(2)

# Now let's check if chunk 3 has any special characteristics
print("\n" + "="*60)
print("ANALYZING CHUNK 3 CHARACTERISTICS")
print("="*60)

if len(chunks) >= 3:
    chunk3 = chunks[2]
    
    # Check skill name lengths
    skill_names = [s.get('name', s.get('skill_name', '')) for s in chunk3['skills']]
    avg_length = sum(len(name) for name in skill_names) / len(skill_names) if skill_names else 0
    max_length = max(len(name) for name in skill_names) if skill_names else 0
    
    print(f"Chunk 3 skill name statistics:")
    print(f"  Average name length: {avg_length:.1f} chars")
    print(f"  Max name length: {max_length} chars")
    print(f"  Longest skill names:")
    
    # Show top 5 longest skill names
    sorted_names = sorted(skill_names, key=len, reverse=True)[:5]
    for name in sorted_names:
        print(f"    - {name} ({len(name)} chars)")
    
    # Check if chunk 3 has more complex/nested skills
    complex_skills = [s for s in chunk3['skills'] if '/' in s.get('name', '') or '&' in s.get('name', '')]
    print(f"  Skills with special characters: {len(complex_skills)}")
    
    # Compare with chunk 1 and 2
    for i in range(2):
        chunk = chunks[i]
        names = [s.get('name', s.get('skill_name', '')) for s in chunk['skills']]
        avg = sum(len(n) for n in names) / len(names) if names else 0
        print(f"\nChunk {i+1} average name length: {avg:.1f} chars")

