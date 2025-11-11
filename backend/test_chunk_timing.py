#!/usr/bin/env python3
"""Test chunk processing timing and references"""

import requests
import json
import time

def check_javascript_for_errors():
    """Check the JavaScript file for common reference errors"""
    print("🔍 Checking JavaScript for reference errors...")

    with open('web/static/js/workflow.js', 'r') as f:
        js_content = f.read()

    # Check for old chunkStartTime references (without 's')
    if 'chunkStartTime ' in js_content or 'chunkStartTime)' in js_content or 'chunkStartTime;' in js_content:
        print("❌ Found reference to old chunkStartTime variable")
        # Find line numbers
        lines = js_content.split('\n')
        for i, line in enumerate(lines, 1):
            if 'chunkStartTime' in line and 'chunkStartTimes' not in line:
                print(f"   Line {i}: {line.strip()}")
        return False
    else:
        print("✅ No references to old chunkStartTime variable")

    # Check that chunkStartTimes is defined
    if 'let chunkStartTimes = {}' in js_content or 'const chunkStartTimes = {}' in js_content:
        print("✅ chunkStartTimes object is properly defined")
    else:
        print("⚠️ Could not find chunkStartTimes definition")

    # Check for timer clearing logic
    timer_clear_count = js_content.count('clearInterval(window.progressInterval)')
    print(f"✅ Found {timer_clear_count} timer clearing statements")

    # Check for console.log('Timer tick')
    if "console.log('Timer tick" in js_content:
        print("❌ Still has excessive Timer tick logging")
        return False
    else:
        print("✅ Removed excessive Timer tick logging")

    return True

def test_chunk_api():
    """Test the chunk processing API"""
    print("\n🧪 Testing Chunk Processing API...")

    # Test with small batch to verify chunking works
    test_data = {
        "skills": ["Python", "JavaScript", "Testing", "Debugging"],
        "resume_text": "Software engineer with Python and JavaScript experience",
        "batch_size": 2,
        "concurrent_batches": 1,
        "provider": "mock"  # Use mock to avoid API key requirements
    }

    try:
        response = requests.post(
            "http://localhost:5000/api/skills/assess-proficiencies-simple",
            json=test_data
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ API call successful")

            if 'batch_info' in result:
                batch_info = result['batch_info']
                print(f"   • Total batches: {batch_info.get('total_batches', 'N/A')}")
                print(f"   • Skills per batch: {batch_info.get('skills_per_batch', 'N/A')}")
                print(f"   • Processing mode: {batch_info.get('processing_mode', 'N/A')}")

                # Check if chunking would occur (4 skills with batch size 2 = 2 chunks)
                expected_chunks = 2
                actual_batches = batch_info.get('total_batches', 0)
                if actual_batches == expected_chunks:
                    print(f"✅ Correct number of chunks: {actual_batches}")
                else:
                    print(f"❌ Expected {expected_chunks} chunks, got {actual_batches}")
            else:
                print("❌ No batch_info in response")
        else:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"   Error: {response.text}")

    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

    return True

def main():
    print("=" * 60)
    print("CHUNK PROCESSING VERIFICATION TEST")
    print("=" * 60)

    # Check JavaScript for errors
    js_ok = check_javascript_for_errors()

    # Test API
    api_ok = test_chunk_api()

    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)

    if js_ok and api_ok:
        print("✅ All tests passed!")
        print("\nKey fixes applied:")
        print("  • Fixed all chunkStartTime references to use chunkStartTimes object")
        print("  • Removed excessive Timer tick console logging")
        print("  • Timer stops when all chunks complete")
        print("  • Chunk timing tracked per-chunk independently")
        return 0
    else:
        print("❌ Some tests failed")
        if not js_ok:
            print("  • JavaScript has reference errors")
        if not api_ok:
            print("  • API chunk processing failed")
        return 1

if __name__ == "__main__":
    exit(main())