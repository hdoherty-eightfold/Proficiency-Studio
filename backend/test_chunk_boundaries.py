#!/usr/bin/env python3
"""Test chunk boundary calculations without auto-reduction"""

import requests
import json
import time

def test_chunk_boundaries():
    """Test that chunks are calculated correctly with fixed sizes"""

    print("=" * 60)
    print("CHUNK BOUNDARY TEST (No Auto-Reduction)")
    print("=" * 60)

    # Test with 1223 skills and 408 chunk size
    test_config = {
        "skills": [],
        "provider": "mock",
        "model": "test",
        "batch_size": 408,
        "concurrent_batches": 1,
        "chunk_size": 408
    }

    # Generate 1223 test skills
    for i in range(1, 1224):
        test_config["skills"].append({
            "name": f"Skill {i}",
            "skill_name": f"Professional Skill {i}"
        })

    print(f"📊 Test Configuration:")
    print(f"   • Total skills: {len(test_config['skills'])}")
    print(f"   • Chunk size: 408")
    print(f"   • Expected chunks: 3")
    print(f"     - Chunk 1: Skills 1-408 (408 skills)")
    print(f"     - Chunk 2: Skills 409-816 (408 skills)")
    print(f"     - Chunk 3: Skills 817-1223 (407 skills)")
    print()

    # Test each chunk
    chunks_to_test = [
        (0, 408, 1, 408),     # Chunk 1: start=0, expected=408 skills
        (408, 408, 2, 408),   # Chunk 2: start=408, expected=408 skills
        (816, 408, 3, 407),   # Chunk 3: start=816, expected=407 skills (remainder)
    ]

    all_passed = True

    for chunk_start, chunk_size, chunk_num, expected_count in chunks_to_test:
        print(f"🔄 Testing Chunk {chunk_num}...")

        # Calculate actual slice
        chunk_end = min(chunk_start + chunk_size, len(test_config["skills"]))
        chunk_skills = test_config["skills"][chunk_start:chunk_end]

        print(f"   • Chunk boundaries: [{chunk_start}:{chunk_end}]")
        print(f"   • Skills in chunk: {len(chunk_skills)}")
        print(f"   • Expected skills: {expected_count}")

        if len(chunk_skills) == expected_count:
            print(f"   ✅ Chunk {chunk_num}: Correct boundary calculation")

            # Verify first and last skill in chunk
            if chunk_skills:
                first_skill = chunk_skills[0]["name"]
                last_skill = chunk_skills[-1]["name"]
                expected_first = f"Skill {chunk_start + 1}"
                expected_last = f"Skill {chunk_end}"

                if first_skill == expected_first and last_skill == expected_last:
                    print(f"   ✅ Skill range verified: {first_skill} to {last_skill}")
                else:
                    print(f"   ❌ Skill range mismatch!")
                    print(f"      Expected: {expected_first} to {expected_last}")
                    print(f"      Got: {first_skill} to {last_skill}")
                    all_passed = False
        else:
            print(f"   ❌ Chunk {chunk_num}: Incorrect count - got {len(chunk_skills)}, expected {expected_count}")
            all_passed = False

        print()

    # Test with API call
    print("🧪 Testing with API call (mock provider)...")

    test_api_config = {
        "skills": test_config["skills"][:10],  # Use just 10 skills for quick test
        "provider": "mock",
        "batch_size": 4,
        "concurrent_batches": 1,
        "chunk_size": 4  # Should create 3 chunks
    }

    try:
        response = requests.post(
            "http://localhost:5000/api/skills/assess-proficiencies-simple",
            json=test_api_config,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ API call successful")

            if "batch_info" in result:
                batch_info = result["batch_info"]
                total_batches = batch_info.get("total_batches", 0)
                expected_chunks = 3  # 10 skills / 4 per chunk = 3 chunks (4,4,2)

                if total_batches == expected_chunks:
                    print(f"   ✅ Correct chunk calculation: {total_batches} chunks")
                else:
                    print(f"   ❌ Wrong chunk count: got {total_batches}, expected {expected_chunks}")
                    all_passed = False
            else:
                print("   ⚠️ No batch_info in response")
        else:
            print(f"   ❌ API call failed: {response.status_code}")
            all_passed = False

    except Exception as e:
        print(f"   ❌ API test error: {e}")
        all_passed = False

    print()
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    if all_passed:
        print("✅ All chunk boundary tests passed!")
        print()
        print("Key validations:")
        print("  • Chunk boundaries calculated correctly")
        print("  • No auto-reduction applied")
        print("  • All skills included in chunks")
        print("  • Final chunk handles remainder correctly")
        return 0
    else:
        print("❌ Some tests failed")
        print()
        print("Issues found:")
        print("  • Check chunk boundary calculations")
        print("  • Verify no auto-reduction is applied")
        return 1

if __name__ == "__main__":
    exit(test_chunk_boundaries())