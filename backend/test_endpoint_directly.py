#!/usr/bin/env python3
"""Direct test of the assessment endpoint to verify it works"""

import requests
import json
import time

def test_assessment_endpoint():
    """Test the assessment endpoint directly"""

    # Generate test skills
    test_skills = [{"name": f"Skill {i+1}"} for i in range(10)]

    # Prepare request
    request_data = {
        "skills": test_skills,
        "provider": "google",
        "model": "gemini-1.5-flash",
        "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        "prompt_template": "Assess these skills briefly",
        "use_langchain": True,
        "batch_size": 10,
        "concurrent_batches": 1,
        "processing_mode": "sequential",
        "chunk_start": 0,
        "chunk_size": 10,
        "is_chunked": False,
        "environment": "test"
    }

    print(f"Testing endpoint with {len(test_skills)} skills...")
    print(f"Request size: {len(json.dumps(request_data))} bytes")

    start_time = time.time()

    try:
        response = requests.post(
            "http://localhost:5000/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=60
        )

        elapsed = time.time() - start_time
        print(f"Response received in {elapsed:.2f} seconds")
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"Success: {result.get('success')}")
            print(f"Assessed skills: {len(result.get('assessed_skills', []))}")
            if result.get('error'):
                print(f"Error: {result.get('error')}")
        else:
            print(f"Error response: {response.text[:500]}")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_assessment_endpoint()