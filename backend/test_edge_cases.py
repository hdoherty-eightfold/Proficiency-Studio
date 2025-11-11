#!/usr/bin/env python
"""
Edge Case Testing for Chunk Processing
Tests various scenarios to ensure robustness
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:5000"

# Setup
google_api_key = os.getenv('GOOGLE_API_KEY', '')
if google_api_key:
    r = requests.post(f"{API_URL}/api/keys/update", json={"google": google_api_key})
    print(f"Setup: API key status {r.status_code}")

print("=" * 60)
print("EDGE CASE TESTING")
print("=" * 60)

# Test 1: Empty skills array
print("\n[TEST 1] Empty skills array")
print("-" * 40)

request_data = {
    "skills": [],
    "provider": "google",
    "model": "gemini-1.5-flash",
    "use_langchain": True,
    "response_format": "minimal",
    "include_reasoning": False,
    "prompt_template": "",
    "batch_size": 100,
    "concurrent_batches": 1,
    "processing_mode": "sequential"
}

try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=10
    )
    
    if response.status_code == 200:
        print(f"  ❌ Unexpected success with empty skills")
    else:
        result = response.json()
        if "No skills provided" in result.get('detail', ''):
            print(f"  ✅ PASS: Correctly rejected empty skills")
        else:
            print(f"  ⚠️  Different error: {result.get('detail', '')[:50]}")
except Exception as e:
    print(f"  ❌ Exception: {e}")

# Test 2: Single skill
print("\n[TEST 2] Single skill processing")
print("-" * 40)

request_data["skills"] = [{"name": "Python", "skill_name": "Python"}]

try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        if len(assessed) == 1:
            print(f"  ✅ PASS: Single skill processed correctly")
        else:
            print(f"  ❌ FAIL: Expected 1 skill, got {len(assessed)}")
    else:
        print(f"  ❌ FAIL: Status {response.status_code}")
except Exception as e:
    print(f"  ❌ Exception: {e}")

# Test 3: Exactly 408 skills (chunk boundary)
print("\n[TEST 3] Exactly 408 skills (chunk boundary)")
print("-" * 40)

chunk_boundary_skills = [{"name": f"Skill {i}", "skill_name": f"Skill {i}"} 
                         for i in range(1, 409)]

request_data["skills"] = chunk_boundary_skills
request_data["batch_size"] = 408

try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=120
    )
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        if len(assessed) == 408:
            print(f"  ✅ PASS: All 408 skills processed")
        else:
            print(f"  ⚠️  Partial: {len(assessed)}/408 processed")
    else:
        print(f"  ❌ FAIL: Status {response.status_code}")
except Exception as e:
    print(f"  ❌ Exception: {e}")

# Test 4: Different total (not 1223)
print("\n[TEST 4] Different total (500 skills)")
print("-" * 40)

skills_500 = [{"name": f"Skill {i}", "skill_name": f"Skill {i}"} 
               for i in range(1, 501)]

request_data["skills"] = skills_500[:100]  # Test with first 100
request_data["batch_size"] = 100

try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=60
    )
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        if len(assessed) == 100:
            print(f"  ✅ PASS: Non-1223 count handled correctly")
        else:
            print(f"  ⚠️  Got {len(assessed)}/100 skills")
    else:
        print(f"  ❌ FAIL: Status {response.status_code}")
except Exception as e:
    print(f"  ❌ Exception: {e}")

# Test 5: Include reasoning toggle
print("\n[TEST 5] Include reasoning toggle")
print("-" * 40)

test_skills = [{"name": f"Test {i}", "skill_name": f"Test {i}"} 
               for i in range(1, 11)]

# Test with reasoning ON
request_data["skills"] = test_skills
request_data["include_reasoning"] = True
request_data["batch_size"] = 10

print("Testing with reasoning=True...")
try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        if assessed and assessed[0].get('reasoning'):
            print(f"  ✅ PASS: Reasoning included when requested")
        else:
            print(f"  ❌ FAIL: No reasoning when it should be included")
    else:
        print(f"  ❌ FAIL: Status {response.status_code}")
except Exception as e:
    print(f"  ❌ Exception: {e}")

# Test with reasoning OFF
request_data["include_reasoning"] = False

print("Testing with reasoning=False...")
try:
    response = requests.post(
        f"{API_URL}/api/skills/assess-proficiencies-simple",
        json=request_data,
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        assessed = result.get('assessed_skills', [])
        if assessed:
            has_reasoning = assessed[0].get('reasoning') and len(assessed[0]['reasoning']) > 0
            if not has_reasoning:
                print(f"  ✅ PASS: No reasoning when turned off")
            else:
                print(f"  ❌ FAIL: Reasoning present when should be off")
                print(f"     Reasoning: {assessed[0]['reasoning'][:50]}...")
    else:
        print(f"  ❌ FAIL: Status {response.status_code}")
except Exception as e:
    print(f"  ❌ Exception: {e}")

print("\n" + "=" * 60)
print("EDGE CASE TEST SUMMARY")
print("=" * 60)
print("""
Tested scenarios:
1. Empty skills array - Should be rejected
2. Single skill - Should process correctly
3. Exact chunk boundary (408) - Should handle cleanly
4. Different totals (not 1223) - Should work with dynamic calculation
5. Reasoning toggle - Should respect include_reasoning setting

All edge cases should be handled gracefully without crashes.
""")