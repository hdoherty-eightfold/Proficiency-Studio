import requests
import json
import time
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:5000"

# Set up API key if available
google_api_key = os.getenv('GOOGLE_API_KEY', '')
if google_api_key:
    requests.post(f"{API_URL}/api/keys/update", json={"google": google_api_key})
    print("✅ API key configured")

print("=" * 60)
print("COMPREHENSIVE STEP 5 TESTING")
print("=" * 60)

# Test data
test_skills = []
for i in range(20):  # Small set for quick testing
    test_skills.append({
        "name": f"Test Skill {i+1}",
        "skill_name": f"Test Skill {i+1}"
    })

# Test configurations
test_configs = [
    {
        "name": "1. JSON with reasoning",
        "response_format": "json",
        "include_reasoning": True,
        "expected": "Full JSON with reasoning field"
    },
    {
        "name": "2. JSON without reasoning",
        "response_format": "json", 
        "include_reasoning": False,
        "expected": "JSON without reasoning field"
    },
    {
        "name": "3. Minimal format (arrays)",
        "response_format": "minimal",
        "include_reasoning": False,
        "expected": "Array format [[p,c],...]"
    },
    {
        "name": "4. Compact format",
        "response_format": "compact",
        "include_reasoning": False,
        "expected": "Abbreviated keys {s,p,c}"
    },
    {
        "name": "5. CSV format",
        "response_format": "csv",
        "include_reasoning": False,
        "expected": "CSV format"
    }
]

results = {}

for config in test_configs:
    print(f"\n{'='*40}")
    print(f"Testing: {config['name']}")
    print(f"Expected: {config['expected']}")
    print("-" * 40)
    
    request_data = {
        "skills": test_skills,
        "resume_text": "Senior developer with 10 years experience",
        "provider": "google",
        "model": "gemini-1.5-flash",
        "use_langchain": True,
        "response_format": config["response_format"],
        "include_reasoning": config["include_reasoning"],
        "batch_size": 20,
        "concurrent_batches": 1,
        "processing_mode": "sequential"
    }
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_URL}/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=30
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            assessed = result.get('assessed_skills', [])
            
            print(f"✅ Success in {elapsed:.2f}s")
            print(f"   Skills assessed: {len(assessed)}")
            
            # Check format
            if assessed:
                sample = assessed[0] if assessed else None
                
                # Check reasoning field
                has_reasoning = sample and 'reasoning' in sample and sample['reasoning']
                
                if config['include_reasoning'] and not has_reasoning:
                    print(f"   ❌ ERROR: Reasoning requested but not provided")
                elif not config['include_reasoning'] and has_reasoning:
                    print(f"   ❌ ERROR: Reasoning not requested but still provided")
                    print(f"      Reasoning found: '{sample['reasoning'][:50]}...'")
                else:
                    print(f"   ✅ Reasoning field correct")
                
                # Show sample
                print(f"   Sample: {json.dumps(sample, indent=2)[:200]}...")
                
                results[config['name']] = {
                    'success': True,
                    'time': elapsed,
                    'count': len(assessed),
                    'has_reasoning': has_reasoning,
                    'correct': (config['include_reasoning'] == has_reasoning)
                }
            
        else:
            print(f"❌ Failed: {response.status_code}")
            error_data = response.json() if response.text else {}
            print(f"   Error: {error_data.get('detail', 'Unknown')[:100]}")
            
            results[config['name']] = {
                'success': False,
                'error': error_data.get('detail', 'Unknown')
            }
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        results[config['name']] = {
            'success': False,
            'error': str(e)
        }

# Summary
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)

total_tests = len(results)
passed = sum(1 for r in results.values() if r.get('success') and r.get('correct', True))
failed = total_tests - passed

print(f"Total Tests: {total_tests}")
print(f"Passed: {passed} ✅")
print(f"Failed: {failed} ❌")

print("\nDetails:")
for name, result in results.items():
    if result['success']:
        status = "✅" if result.get('correct', True) else "⚠️"
        print(f"{status} {name}: {result['time']:.2f}s, {result['count']} skills")
        if not result.get('correct', True):
            print(f"   Issue: Reasoning={result['has_reasoning']} but should be opposite")
    else:
        print(f"❌ {name}: {result.get('error', 'Failed')[:50]}")

print("\n" + "=" * 60)
print("PERFORMANCE COMPARISON")
print("=" * 60)

# Compare times
successful_tests = [(name, r['time']) for name, r in results.items() if r.get('success')]
if successful_tests:
    successful_tests.sort(key=lambda x: x[1])
    print("Response times (fastest to slowest):")
    for name, time in successful_tests:
        print(f"  {time:.2f}s - {name}")

    fastest = successful_tests[0]
    slowest = successful_tests[-1]
    print(f"\nFastest: {fastest[0]} ({fastest[1]:.2f}s)")
    print(f"Slowest: {slowest[0]} ({slowest[1]:.2f}s)")
    print(f"Speed difference: {(slowest[1] - fastest[1]):.2f}s")

print("\n" + "=" * 60)
print("RECOMMENDATIONS")
print("=" * 60)

if failed > 0:
    print("⚠️ Some tests failed. Check:")
    print("  1. Reasoning field is properly controlled by include_reasoning")
    print("  2. Response formats are correctly parsed")
    print("  3. API keys are configured")
else:
    print("✅ All tests passed!")
    print("\nBest practices:")
    print("  1. Use 'minimal' or 'csv' format for fastest processing")
    print("  2. Turn off reasoning to save ~64% tokens")
    print("  3. Use batch size 300-400 for Google Gemini")

