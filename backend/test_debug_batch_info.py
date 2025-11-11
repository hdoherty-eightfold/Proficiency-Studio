#!/usr/bin/env python3
"""
Debug why batch_info is None
"""

import requests
import json

BASE_URL = "http://localhost:5000"
GOOGLE_API_KEY = "AIzaSyB5SgAyxG2tdSQBF_QtsvM7MLv8hjZAWDY"

def debug_batch_info():
    """Debug why batch_info is None"""

    test_skills = [
        {"name": "Python", "skill_name": "Python"}
    ]

    request_data = {
        "skills": test_skills,
        "provider": "google",
        "model": "gemini-2.5-pro",
        "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        "prompt_template": "Rate this skill 1-5: {skills_to_assess}",
        "use_langchain": True,
        "environment": "test",
        "batch_size": 1,
        "concurrent_batches": 1,
        "processing_mode": "sequential",
        "api_key": GOOGLE_API_KEY
    }

    print("🔍 DEBUGGING: batch_info issue")
    print("="*50)

    try:
        response = requests.post(
            f"{BASE_URL}/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=45
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()

            print(f"\n📋 Full response keys:")
            for key in result.keys():
                value = result[key]
                print(f"   • {key}: {type(value)} = {str(value)[:100]}...")

            print(f"\n🔍 batch_info details:")
            batch_info = result.get('batch_info')
            print(f"   • batch_info type: {type(batch_info)}")
            print(f"   • batch_info value: {batch_info}")

            print(f"\n🔍 llm_response details:")
            llm_response = result.get('llm_response', {})
            print(f"   • llm_response type: {type(llm_response)}")
            print(f"   • llm_response keys: {llm_response.keys() if hasattr(llm_response, 'keys') else 'No keys'}")

            if hasattr(llm_response, 'keys') and 'batch_info' in llm_response:
                print(f"   • llm_response.batch_info: {llm_response['batch_info']}")

        else:
            print(f"❌ Request failed: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_batch_info()