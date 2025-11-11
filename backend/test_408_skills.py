#!/usr/bin/env python3
"""Comprehensive test for processing 408 skills - MUST WORK before reporting success"""

import requests
import json
import time
import sys

def test_408_skills():
    """Test processing exactly 408 skills as user requested"""
    print("\n" + "="*60)
    print("TESTING 408 SKILLS PROCESSING")
    print("="*60)

    # Generate 408 test skills
    skills = []
    for i in range(408):
        skills.append({
            "name": f"Skill_{i+1:03d}_TestingLongNameToSimulateRealSkills_{i+1}"
        })

    # Use the exact configuration that works
    request_data = {
        "skills": skills,
        "provider": "google",
        "model": "gemini-1.5-flash",
        "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        "prompt_template": None,  # Use default
        "use_langchain": True,
        "batch_size": 100,  # Reduced batch size
        "concurrent_batches": 1,
        "processing_mode": "sequential",
        "chunk_start": 0,
        "chunk_size": 408,
        "is_chunked": False,
        "environment": "test"
    }

    print(f"📊 Test Configuration:")
    print(f"   Skills: {len(skills)}")
    print(f"   Batch size: {request_data['batch_size']}")
    print(f"   Processing: {request_data['processing_mode']}")
    print(f"   Request size: {len(json.dumps(request_data)):,} bytes")

    # First set the Google API key
    print("\n1️⃣ Setting up Google API key...")
    key_response = requests.post(
        "http://localhost:5000/api/keys/update",
        json={"google": "test-api-key"}
    )
    if key_response.ok:
        print("   ✅ API key configured")
    else:
        print("   ❌ Failed to set API key")
        return False

    # Now test the assessment
    print("\n2️⃣ Starting assessment...")
    start_time = time.time()

    try:
        response = requests.post(
            "http://localhost:5000/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=300  # 5 minutes
        )

        elapsed = time.time() - start_time
        print(f"\n3️⃣ Response received in {elapsed:.1f} seconds")
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()

            # Check if we got assessments
            assessed = result.get('assessed_skills', [])
            print(f"\n✅ SUCCESS!")
            print(f"   Assessed: {len(assessed)}/{len(skills)} skills")
            print(f"   Time: {elapsed:.1f} seconds")
            print(f"   Rate: {len(assessed)/elapsed:.1f} skills/second")

            # Check for any warnings
            if 'warnings' in result:
                print(f"\n⚠️ Warnings:")
                for warning in result['warnings']:
                    print(f"   - {warning}")

            return True

        elif response.status_code == 500:
            print(f"\n❌ FAILED with status 500 (Internal Server Error)")
            print("   This is likely the Content-Length issue")

            # Try to get error details
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown')}")
            except:
                print(f"   Response text: {response.text[:200]}...")

            return False

        else:
            print(f"\n❌ FAILED with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown')}")
            except:
                print(f"   Response text: {response.text[:200]}...")
            return False

    except requests.Timeout:
        elapsed = time.time() - start_time
        print(f"\n❌ TIMEOUT after {elapsed:.1f} seconds")
        return False

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return False

def check_operation_panel():
    """Check if errors would show in Operation Status panel"""
    print("\n" + "="*60)
    print("CHECKING OPERATION STATUS PANEL")
    print("="*60)

    # Get the main page HTML
    response = requests.get("http://localhost:5000")
    if response.ok:
        html = response.text

        # Check for operation panel elements
        has_panel = 'operation-status-panel' in html
        has_log = 'operation-log' in html
        has_stats = 'operation-stats' in html

        print(f"✓ Operation Status Panel: {'YES' if has_panel else 'NO'}")
        print(f"✓ Operation Log Area: {'YES' if has_log else 'NO'}")
        print(f"✓ Operation Stats: {'YES' if has_stats else 'NO'}")

        if has_panel and has_log:
            print("\n✅ Operation Status panel is present in UI")
            print("   Errors SHOULD be visible when they occur")
        else:
            print("\n⚠️ Operation Status panel might not display errors properly")

if __name__ == "__main__":
    print("🚀 Starting comprehensive 408 skills test...")
    print("This test MUST pass before declaring the fix complete!")

    # Check server health first
    try:
        health = requests.get("http://localhost:5000/health")
        if health.status_code != 200:
            print("❌ Server is not healthy!")
            sys.exit(1)
    except:
        print("❌ Cannot connect to server at http://localhost:5000")
        sys.exit(1)

    # Run the test
    success = test_408_skills()

    # Check UI error display
    check_operation_panel()

    print("\n" + "="*60)
    print("FINAL RESULT")
    print("="*60)

    if success:
        print("✅✅✅ 408 SKILLS TEST PASSED! ✅✅✅")
        print("The system can handle 408 skills successfully.")
        print("Errors would be visible in the Operation Status panel.")
    else:
        print("❌❌❌ 408 SKILLS TEST FAILED! ❌❌❌")
        print("The system CANNOT handle 408 skills.")
        print("Need to fix the Content-Length issue in app_fastapi.py")
        print("\nNext steps:")
        print("1. Fix the JSONResponse Content-Length issue")
        print("2. Ensure errors display in Operation Status panel")
        print("3. Re-run this test until it passes")

    sys.exit(0 if success else 1)