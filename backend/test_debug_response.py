#!/usr/bin/env python3
"""
Debug test to see the actual response structure from the API
"""

import requests
import json

BASE_URL = "http://localhost:5000"
GOOGLE_API_KEY = "AIzaSyB5SgAyxG2tdSQBF_QtsvM7MLv8hjZAWDY"

def debug_api_response():
    """Debug the actual API response to understand the structure"""

    test_skills = [
        {"name": "Python", "skill_name": "Python"},
        {"name": "JavaScript", "skill_name": "JavaScript"}
    ]

    request_data = {
        "skills": test_skills,
        "provider": "google",
        "model": "gemini-2.5-pro",
        "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        "prompt_template": "Rate skills: {skills_to_assess}",
        "use_langchain": True,
        "environment": "test",
        "batch_size": 1,  # Force batching
        "concurrent_batches": 1,
        "processing_mode": "sequential",
        "api_key": GOOGLE_API_KEY
    }

    print("🔍 DEBUG: API Response Structure")
    print("="*60)
    print(f"Sending request with {len(test_skills)} skills")
    print(f"Batch size: {request_data['batch_size']}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=30
        )

        print(f"\n📊 Response Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()

            print(f"\n📋 Full Response Structure:")
            print(json.dumps(result, indent=2))

            print(f"\n🔑 Top-level keys:")
            for key in result.keys():
                print(f"   • {key}: {type(result[key])}")

            if 'batch_info' in result:
                print(f"\n📊 Batch Info Details:")
                batch_info = result['batch_info']
                for key, value in batch_info.items():
                    print(f"   • {key}: {value}")
            else:
                print(f"\n❌ No 'batch_info' key found in response")

        else:
            print(f"❌ Error Response: {response.text}")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    debug_api_response()