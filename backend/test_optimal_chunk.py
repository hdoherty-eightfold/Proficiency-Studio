#!/usr/bin/env python3
"""Test to find optimal chunk size for verbose prompt"""

import requests
import json
import time

def test_chunk_size(size):
    """Test a specific chunk size"""
    print(f"\n{'='*50}")
    print(f"Testing {size} skills with verbose prompt")
    print(f"{'='*50}")

    # Generate test skills
    skills = [{"name": f"Skill {i+1}"} for i in range(size)]

    request_data = {
        "skills": skills,
        "provider": "google",
        "model": "gemini-1.5-flash",
        "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        "prompt_template": None,  # Use default verbose prompt
        "use_langchain": True,
        "batch_size": size,
        "concurrent_batches": 1,
        "processing_mode": "sequential",
        "chunk_start": 0,
        "chunk_size": size,
        "is_chunked": False,
        "environment": "test"
    }

    print(f"Request size: {len(json.dumps(request_data)):,} bytes")

    start_time = time.time()

    try:
        response = requests.post(
            "http://localhost:5000/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=300  # 5 minutes
        )

        elapsed = time.time() - start_time

        if response.status_code == 200:
            result = response.json()
            assessed = result.get('assessed_skills', [])
            print(f"✅ SUCCESS in {elapsed:.1f} seconds")
            print(f"   Assessed: {len(assessed)}/{size} skills")
            return True, elapsed, len(assessed)
        else:
            print(f"❌ FAILED with status {response.status_code}")
            if response.text:
                error = json.loads(response.text)
                print(f"   Error: {error.get('detail', 'Unknown')}")
            return False, elapsed, 0

    except requests.Timeout:
        elapsed = time.time() - start_time
        print(f"❌ TIMEOUT after {elapsed:.1f} seconds")
        return False, elapsed, 0
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ ERROR: {str(e)[:100]}")
        return False, elapsed, 0

# Test different chunk sizes
print("\nFINDING OPTIMAL CHUNK SIZE FOR VERBOSE PROMPT")
print("="*60)

test_sizes = [250, 300, 350, 375, 400]
results = []

for size in test_sizes:
    success, time_taken, assessed = test_chunk_size(size)
    results.append({
        "size": size,
        "success": success,
        "time": time_taken,
        "assessed": assessed
    })

    # Wait between tests
    if size < test_sizes[-1]:
        print("\nWaiting 10 seconds before next test...")
        time.sleep(10)

# Summary
print("\n" + "="*60)
print("SUMMARY OF RESULTS")
print("="*60)
print(f"{'Size':<10} {'Status':<10} {'Time':<15} {'Assessed'}")
print("-"*50)
for r in results:
    status = "✅ OK" if r['success'] else "❌ FAIL"
    time_str = f"{r['time']:.1f}s" if r['time'] < 999 else "TIMEOUT"
    print(f"{r['size']:<10} {status:<10} {time_str:<15} {r['assessed']}")

# Find optimal
successful = [r for r in results if r['success']]
if successful:
    optimal = max(successful, key=lambda x: x['size'])
    print(f"\n🎯 OPTIMAL CHUNK SIZE: {optimal['size']} skills")
    print(f"   Processing time: {optimal['time']:.1f} seconds")
    print(f"   Throughput: {optimal['size']/optimal['time']:.1f} skills/second")
else:
    print("\n❌ No successful tests!")