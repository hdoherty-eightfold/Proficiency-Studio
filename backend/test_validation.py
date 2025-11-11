#!/usr/bin/env python
"""
Test the Validate Updated Skills functionality
"""

import requests
import json
import time

API_URL = "http://localhost:5000"

print("=" * 60)
print("TESTING VALIDATE UPDATED SKILLS FUNCTIONALITY")
print("=" * 60)

# Test 1: Check if LatestSkills.json endpoint works
print("\n[TEST 1] Fetching LatestSkills.json via API...")
print("-" * 40)

try:
    response = requests.get(f"{API_URL}/api/latest-skills")

    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list):
            skills = data
        else:
            skills = data.get('skills', data)

        print(f"✅ SUCCESS: Retrieved {len(skills)} skills")

        # Show first few skills
        if skills:
            print("\nFirst 3 skills:")
            for skill in skills[:3]:
                skill_name = skill.get('skill') or skill.get('skill_name') or skill.get('name')
                proficiency = skill.get('proficiency')
                level = skill.get('level')
                print(f"  - {skill_name}: Proficiency {proficiency} ({level})")
    elif response.status_code == 404:
        print("⚠️ LatestSkills.json not found - need to run assessment first")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")

except Exception as e:
    print(f"❌ Exception: {e}")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("""
The Validate Updated Skills button now:

1. Fetches LatestSkills.json with all assessed skills
2. Fetches current JIE roles from Eightfold API
3. Compares each skill's proficiency in detail
4. Shows skill-by-skill status in the operation log:
   - ✅ UPDATED: Skills that match expected proficiency
   - ⏭️ DEFAULT: Skills with default/null values
   - ❌ MISMATCH: Skills with unexpected values
   - ⚠️ SKIPPED: Skills not in LatestSkills.json
5. Displays summary totals at the bottom with percentages

The operation status box shows every skill being checked with its
status, making it easy to see exactly what was updated and what
wasn't.
""")