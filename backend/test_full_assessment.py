#!/usr/bin/env python3
"""
Full test of assessment with actual Eightfold skills
Simulates what the UI should be doing
"""

import requests
import json
import time
import sys

def test_full_assessment():
    """Test with real JIE role skills"""

    print("=" * 60)
    print("FULL ASSESSMENT TEST")
    print("=" * 60)

    # First, get JIE roles to extract skills
    print("\n1. Getting JIE roles...")
    try:
        # Authenticate first (using test credentials)
        auth_response = requests.post(
            "http://localhost:5000/api/eightfold/proxy",
            json={
                "endpoint": "/oauth/v1/authenticate",
                "method": "POST",
                "body": {
                    "client_id": "a893eb8d-facc-46f4-aa07-032829089605",
                    "client_secret": "TLCB5XJlMx",
                    "grant_type": "client_credentials"
                }
            }
        )

        if auth_response.status_code != 200:
            print(f"Auth failed: {auth_response.status_code}")
            return

        # Get JIE roles
        roles_response = requests.post(
            "http://localhost:5000/api/eightfold/proxy",
            json={
                "endpoint": "/api/v2/JIE/roles",
                "method": "GET",
                "params": {"limit": 100}
            }
        )

        if roles_response.status_code != 200:
            print(f"Failed to get roles: {roles_response.status_code}")
            return

        roles_data = roles_response.json()

        # Extract skills from roles
        all_skills = []
        for role in roles_data.get("data", []):
            for skill_prof in role.get("skillProficiencies", []):
                skill_name = skill_prof.get("name")
                if skill_name and skill_name not in [s["name"] for s in all_skills]:
                    all_skills.append({"name": skill_name})

        print(f"✅ Extracted {len(all_skills)} unique skills")

    except Exception as e:
        print(f"Failed to get real skills: {e}")
        print("Using test skills instead...")
        all_skills = [{"name": f"Test Skill {i+1}"} for i in range(1223)]

    # Test different chunk sizes
    test_configs = [
        (100, "Small test"),
        (400, "Medium chunk"),
        (1223, "Full assessment - no chunking")
    ]

    for chunk_size, description in test_configs:
        print(f"\n{'='*60}")
        print(f"Testing: {description} ({chunk_size} skills)")
        print(f"{'='*60}")

        # Take only the needed skills
        test_skills = all_skills[:chunk_size]

        request_data = {
            "skills": test_skills,
            "provider": "google",
            "model": "gemini-1.5-flash",
            "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
            "prompt_template": None,  # Use default
            "use_langchain": True,
            "batch_size": chunk_size,
            "concurrent_batches": 1,
            "processing_mode": "sequential",
            "chunk_start": 0,
            "chunk_size": chunk_size,
            "is_chunked": chunk_size < 1223,
            "environment": "test"
        }

        print(f"Request size: {len(json.dumps(request_data)):,} bytes")
        print(f"Making request...")

        start_time = time.time()

        try:
            response = requests.post(
                "http://localhost:5000/api/skills/assess-proficiencies-simple",
                json=request_data,
                timeout=300  # 5 minutes
            )

            elapsed = time.time() - start_time
            print(f"\n✅ Response received in {elapsed:.2f} seconds")
            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"Success: {result.get('success')}")
                assessed = result.get('assessed_skills', [])
                print(f"Skills assessed: {len(assessed)}/{chunk_size}")

                if len(assessed) == chunk_size:
                    print(f"🎉 PERFECT! All {chunk_size} skills assessed")
                else:
                    print(f"⚠️ PARTIAL: Only {len(assessed)}/{chunk_size} assessed")

                # Show sample results
                if assessed:
                    print("\nSample assessments:")
                    for skill in assessed[:3]:
                        print(f"  - {skill['skill_name']}: Level {skill['proficiency']} ({skill.get('level', 'N/A')})")

            else:
                print(f"❌ Error: {response.status_code}")
                error_data = response.json()
                print(f"Error type: {error_data.get('error_type')}")
                print(f"Details: {error_data.get('detail', 'No details')}")

        except requests.Timeout:
            elapsed = time.time() - start_time
            print(f"❌ TIMEOUT after {elapsed:.2f} seconds")

        except Exception as e:
            print(f"❌ Request failed: {e}")

        # Don't overload the server
        if chunk_size < 1223:
            print("\nWaiting 5 seconds before next test...")
            time.sleep(5)

    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    test_full_assessment()