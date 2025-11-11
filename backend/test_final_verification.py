#!/usr/bin/env python3
"""
Final verification test with the updated batch_info functionality
"""

import requests
import json

BASE_URL = "http://localhost:5000"
GOOGLE_API_KEY = "AIzaSyB5SgAyxG2tdSQBF_QtsvM7MLv8hjZAWDY"

def test_batch_info_included():
    """Test that batch_info now includes UI configuration parameters"""

    print("🧪 FINAL VERIFICATION: batch_info includes UI settings")
    print("="*60)

    # Test with 2 skills - should not trigger batching
    test_skills = [
        {"name": "Python", "skill_name": "Python"},
        {"name": "JavaScript", "skill_name": "JavaScript"}
    ]

    request_data = {
        "skills": test_skills,
        "provider": "google",
        "model": "gemini-2.5-pro",
        "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        "prompt_template": "Rate skills 1-5: {skills_to_assess}",
        "use_langchain": True,
        "environment": "test",
        "batch_size": 10,  # UI setting
        "concurrent_batches": 2,  # UI setting
        "processing_mode": "parallel",  # UI setting
        "api_key": GOOGLE_API_KEY
    }

    print(f"📤 Testing with UI settings:")
    print(f"   • batch_size: {request_data['batch_size']}")
    print(f"   • concurrent_batches: {request_data['concurrent_batches']}")
    print(f"   • processing_mode: {request_data['processing_mode']}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/skills/assess-proficiencies-simple",
            json=request_data,
            timeout=45
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ API call successful")

            if 'batch_info' in result:
                batch_info = result['batch_info']
                print(f"\n📊 batch_info found with keys:")
                for key, value in batch_info.items():
                    print(f"   • {key}: {value}")

                # Verify UI settings are included
                ui_settings_correct = True

                if batch_info.get('batch_size') == request_data['batch_size']:
                    print(f"   ✅ batch_size correct: {batch_info.get('batch_size')}")
                else:
                    print(f"   ❌ batch_size wrong: expected {request_data['batch_size']}, got {batch_info.get('batch_size')}")
                    ui_settings_correct = False

                if batch_info.get('concurrent_batches') == request_data['concurrent_batches']:
                    print(f"   ✅ concurrent_batches correct: {batch_info.get('concurrent_batches')}")
                else:
                    print(f"   ❌ concurrent_batches wrong: expected {request_data['concurrent_batches']}, got {batch_info.get('concurrent_batches')}")
                    ui_settings_correct = False

                if batch_info.get('processing_mode') == request_data['processing_mode']:
                    print(f"   ✅ processing_mode correct: {batch_info.get('processing_mode')}")
                else:
                    print(f"   ❌ processing_mode wrong: expected {request_data['processing_mode']}, got {batch_info.get('processing_mode')}")
                    ui_settings_correct = False

                if 'max_workers' in batch_info:
                    print(f"   ✅ max_workers included: {batch_info.get('max_workers')}")
                else:
                    print(f"   ❌ max_workers missing")
                    ui_settings_correct = False

                print(f"\n🎯 Overall UI Settings Verification: {'✅ PASSED' if ui_settings_correct else '❌ FAILED'}")
                return ui_settings_correct

            else:
                print(f"❌ No batch_info in response")
                return False

        else:
            print(f"❌ API call failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_batch_info_included()

    print(f"\n{'='*60}")
    print(f"FINAL RESULT: {'✅ SUCCESS' if success else '❌ FAILED'}")

    if success:
        print(f"✅ UI settings are now properly included in batch_info")
        print(f"✅ Backend respects and returns UI configuration")
    else:
        print(f"❌ UI settings verification failed")
        print(f"❌ May need additional debugging")
    print(f"{'='*60}")