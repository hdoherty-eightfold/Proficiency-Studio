import requests
import json
import time
import os

API_URL = "http://localhost:5000"

# This test simulates the EXACT scenario from the UI:
# - 1223 total skills
# - Chunk size of 408 
# - Chunks 1 and 2 succeed (816 accumulated)
# - Chunk 3 fails

print("="*60)
print("TESTING REAL CHUNK 3 FAILURE SCENARIO")
print("="*60)

# Load actual environment variables if available
from dotenv import load_dotenv
load_dotenv()

# Get API key from environment (if available)
google_api_key = os.getenv('GOOGLE_API_KEY', '')

# First update the API keys in session
if google_api_key:
    print("Setting Google API key in session...")
    key_response = requests.post(
        f"{API_URL}/api/keys/update",
        json={"google": google_api_key}
    )
    if key_response.status_code == 200:
        print("✅ API key set successfully")
    else:
        print("⚠️ Could not set API key")

# Create test skills that mirror the real scenario
print("\nGenerating 1223 test skills...")
test_skills = []

# Create skills with varying complexity to mirror real data
skill_templates = [
    # Simple skills
    "Python", "JavaScript", "Java", "C++", "SQL", "HTML", "CSS", "React", "Node.js", "Git",
    # Medium complexity
    "Machine Learning", "Data Analysis", "Cloud Computing", "DevOps Practices", "System Design",
    "API Development", "Database Management", "Security Best Practices", "Testing Strategies",
    # Complex/long skills
    "Distributed Systems Architecture and Design", "Advanced Machine Learning and Deep Learning Techniques",
    "Cloud Infrastructure and Container Orchestration", "Microservices Architecture and Implementation",
    "Enterprise Software Development and Best Practices", "Agile Project Management and Team Leadership"
]

# Generate 1223 skills with variation
for i in range(1223):
    template = skill_templates[i % len(skill_templates)]
    skill_name = f"{template} - Level {(i % 5) + 1}"
    test_skills.append({
        "name": skill_name,
        "skill_name": skill_name,
        "proficiency": None
    })

print(f"Created {len(test_skills)} skills")

# Test configuration matching UI
CHUNK_SIZE = 408
BATCH_SIZE = 408  # UI uses chunk size as batch size

# Define the actual prompt template used in UI
PROMPT_TEMPLATE = """You are an AI assistant specialized in evaluating technical skills and competencies.

Given the following resume text, assess the proficiency level for each skill listed below.

Resume:
{resume_text}

For each skill, provide:
1. A proficiency level from 1-5 where:
   - 1 = Novice (No experience or very basic knowledge)
   - 2 = Developing (Some experience, still learning fundamentals)
   - 3 = Intermediate (Solid working knowledge, can work independently)
   - 4 = Advanced (Deep expertise, can mentor others)
   - 5 = Expert (Industry-recognized expertise, thought leader)

2. A confidence score from 0.0 to 1.0 indicating how confident you are in the assessment

3. Brief reasoning for the assessment

Return the assessment in JSON format with this structure:
{
  "assessments": [
    {
      "skill_name": "exact skill name as provided",
      "proficiency": <1-5>,
      "level": "<Novice|Developing|Intermediate|Advanced|Expert>",
      "confidence_score": <0.0-1.0>,
      "reasoning": "brief explanation"
    }
  ]
}

Skills to assess:
{skills_list}"""

# Resume text that would trigger assessments
RESUME_TEXT = """
Senior Software Engineer with 10+ years of experience in full-stack development, 
cloud architecture, machine learning, and team leadership. Extensive experience 
with Python, JavaScript, Java, and modern web frameworks. Led multiple projects 
in distributed systems, microservices, and DevOps practices.
"""

# Test each chunk
results = []
for chunk_num in range(3):
    start = chunk_num * CHUNK_SIZE
    end = min((chunk_num + 1) * CHUNK_SIZE, len(test_skills))
    chunk_skills = test_skills[start:end]
    
    print(f"\n{'='*40}")
    print(f"CHUNK {chunk_num + 1}")
    print(f"{'='*40}")
    print(f"Range: Skills {start+1} to {end}")
    print(f"Count: {len(chunk_skills)} skills")
    
    # Build the request exactly as UI does
    request_data = {
        "skills": chunk_skills,
        "resume_text": RESUME_TEXT,
        "provider": "google",
        "model": "gemini-1.5-flash",
        "use_langchain": True,
        "prompt_template": PROMPT_TEMPLATE,
        "batch_size": BATCH_SIZE,
        "concurrent_batches": 1,
        "processing_mode": "sequential",
        "proficiency_levels": [
            "Novice",
            "Developing",
            "Intermediate",
            "Advanced",
            "Expert"
        ],
        "chunk_info": {
            "chunk_start": start,
            "chunk_end": end - 1,
            "total_skills": len(test_skills),
            "chunk_size": len(chunk_skills),
            "actual_chunk_index": chunk_num,
            "display_chunk_number": chunk_num + 1
        }
    }
    
    print(f"Request size: {len(json.dumps(request_data))} bytes")
    print(f"Prompt length: {len(PROMPT_TEMPLATE)} chars")
    
    # Make the request
    start_time = time.time()
    try:
        response = requests.post(
            f"{API_URL}/api/skills/assess-proficiencies",
            json=request_data,
            timeout=120
        )
        elapsed = time.time() - start_time
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response Size: {len(response.content)} bytes")
        
        if response.status_code == 200:
            result_data = response.json()
            assessed = result_data.get('assessed_skills', [])
            
            # Check for mock response
            if 'warning' in result_data and 'mock' in result_data.get('warning', '').lower():
                print(f"⚠️ Mock response (no API key configured)")
            elif len(assessed) == 0:
                print(f"⚠️ No skills assessed (possible API key issue)")
            else:
                print(f"✅ SUCCESS: {len(assessed)}/{len(chunk_skills)} skills assessed")
                
            # Check for warnings
            if 'warning' in result_data and 'mock' not in result_data.get('warning', '').lower():
                print(f"⚠️ Warning: {result_data['warning']}")
                
            results.append({
                'chunk': chunk_num + 1,
                'status': 'success',
                'assessed': len(assessed),
                'expected': len(chunk_skills)
            })
            
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            
            try:
                error_data = response.json()
                error_type = error_data.get('error_type', 'unknown')
                
                print(f"Error Type: {error_type}")
                print(f"Error Detail: {error_data.get('detail', '')[:200]}")
                
                if error_type == 'truncated_response':
                    print(f"\n🔍 TRUNCATION DETAILS:")
                    print(f"  Response Length: {error_data.get('response_length', 0)} chars")
                    print(f"  Truncation Reason: {error_data.get('truncation_reason', 'not specified')}")
                    print(f"  Suggested Batch Size: {error_data.get('suggested_batch_size', 'not provided')}")
                    print(f"  Provider: {error_data.get('provider', 'unknown')}")
                    
                results.append({
                    'chunk': chunk_num + 1,
                    'status': 'failed',
                    'error_type': error_type,
                    'error': error_data.get('detail', '')
                })
                
            except Exception as e:
                print(f"Could not parse error: {e}")
                print(f"Raw: {response.text[:500]}")
                results.append({
                    'chunk': chunk_num + 1,
                    'status': 'failed',
                    'error': str(e)
                })
                
    except Exception as e:
        print(f"❌ Request failed: {e}")
        results.append({
            'chunk': chunk_num + 1,
            'status': 'error',
            'error': str(e)
        })
    
    # Wait between chunks
    if chunk_num < 2:
        print("\nWaiting 3 seconds...")
        time.sleep(3)

# Analysis
print(f"\n{'='*60}")
print("ANALYSIS SUMMARY")
print(f"{'='*60}")

for r in results:
    if r['status'] == 'success':
        ratio = f"{r['assessed']}/{r['expected']}"
        print(f"Chunk {r['chunk']}: ✅ {ratio} skills")
    else:
        print(f"Chunk {r['chunk']}: ❌ {r.get('error_type', 'failed')}")

# Specific analysis of chunk 3 if it failed
chunk3_result = next((r for r in results if r['chunk'] == 3), None)
if chunk3_result and chunk3_result['status'] != 'success':
    print(f"\n{'='*60}")
    print("CHUNK 3 FAILURE ANALYSIS")
    print(f"{'='*60}")
    
    # Check what's different about chunk 3
    chunk3_skills = test_skills[2*CHUNK_SIZE:min(3*CHUNK_SIZE, len(test_skills))]
    print(f"Chunk 3 has {len(chunk3_skills)} skills (vs {CHUNK_SIZE} for chunks 1&2)")
    
    if len(chunk3_skills) != CHUNK_SIZE:
        print(f"⚠️ Chunk 3 is PARTIAL: {len(chunk3_skills)} vs expected {CHUNK_SIZE}")
        print("This size difference might affect processing")
    
    # Calculate total estimated response size
    # Each skill assessment is roughly 200-300 chars in JSON
    estimated_response = len(chunk3_skills) * 250
    print(f"Estimated response size: {estimated_response:,} chars")
    
    if estimated_response > 100000:
        print("⚠️ Response might exceed token limits")
    
    print("\nPossible causes:")
    print("1. Chunk 3 is the last chunk and has different size")
    print("2. Accumulated token usage from previous chunks")
    print("3. Specific skill names in chunk 3 causing issues")
    print("4. Backend logic handling last chunk differently")

