#!/usr/bin/env python3
"""
Master Test Runner
Runs all tests to ensure nothing is broken
"""
import subprocess
import sys
from datetime import datetime
import os

def run_test(test_file, description):
    """Run a single test file"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"File: {test_file}")
    print('='*60)
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"❌ Test timed out after 30 seconds")
        return False
    except Exception as e:
        print(f"❌ Error running test: {e}")
        return False

def check_server_running():
    """Check if the server is running"""
    import requests
    try:
        response = requests.get("http://127.0.0.1:5000/api/status", timeout=2)
        return response.status_code == 200
    except:
        return False

def main():
    """Run all tests"""
    print("🚀 MASTER TEST RUNNER")
    print(f"Time: {datetime.now().isoformat()}")
    print("="*60)
    
    # Check server is running
    if not check_server_running():
        print("❌ Server is not running on port 5000!")
        print("Please start the server with: python app_fastapi.py")
        sys.exit(1)
    
    print("✅ Server is running")
    
    # List of tests to run
    tests = [
        ("tests/test_authentication.py", "Authentication Tests"),
        ("tests/test_ui_functions.py", "UI Functionality Tests"),
    ]
    
    results = []
    
    for test_file, description in tests:
        if os.path.exists(test_file):
            success = run_test(test_file, description)
            results.append((description, success))
        else:
            print(f"⚠️  Test file not found: {test_file}")
            results.append((description, False))
    
    # Final summary
    print("\n" + "="*60)
    print("🏁 FINAL TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    failed = len(results) - passed
    
    for test_name, result in results:
        icon = "✅" if result else "❌"
        status = "PASSED" if result else "FAILED"
        print(f"{icon} {test_name}: {status}")
    
    print(f"\nTotal Test Suites: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! The application is working correctly.")
    else:
        print(f"\n⚠️  {failed} test suite(s) failed. Please review the errors above.")
    
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()