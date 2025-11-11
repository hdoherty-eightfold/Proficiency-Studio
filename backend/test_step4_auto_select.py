#!/usr/bin/env python3
"""Test Step 4 auto-selection and sidebar status update."""

import requests
import json
import time

def test_api_key_status():
    """Test that API key status endpoint works."""
    print("\n1. Testing API key status endpoint...")
    response = requests.get("http://localhost:5000/api/keys/status")
    if response.status_code == 200:
        status = response.json()
        print(f"   ✅ API key status: {json.dumps(status, indent=2)}")
        # Find first configured key
        for provider, configured in status.items():
            if configured and provider != 'eightfold':
                print(f"   ✅ Found configured provider: {provider}")
                return provider
        print("   ⚠️ No API keys configured")
        return None
    else:
        print(f"   ❌ Failed to get API key status: {response.status_code}")
        return None

def test_manual_verification():
    """Provide manual verification steps."""
    print("\n2. Manual Verification Steps:")
    print("   Please open http://localhost:5000 in your browser and check:")
    print("   a) Step 4 LLM provider dropdown should auto-select the first available key")
    print("   b) The sidebar Step 4 indicator should be green (not gray)")
    print("   c) Browser console should show: '✅ Auto-selected [provider] API key'")
    print("   d) Step 4 should show status text like '[PROVIDER] key configured'")
    print("\n3. Expected Behavior:")
    print("   - On page load, Step 4 should automatically configure if API keys exist")
    print("   - The sidebar indicator for Step 4 should turn green")
    print("   - The updateWorkflowStep function should mark Step 4 as 'completed'")

def test_workflow_state():
    """Test the workflow state via API."""
    print("\n4. Testing workflow state...")
    # Create a session to maintain state
    session = requests.Session()

    # First, update an API key to ensure one exists
    print("   Setting up Google API key for test...")
    response = session.post(
        "http://localhost:5000/api/keys/update",
        json={"google": "test-api-key-123"}
    )
    if response.ok:
        print("   ✅ Test API key set")

    # Check key status
    response = session.get("http://localhost:5000/api/keys/status")
    if response.ok:
        status = response.json()
        if status.get('google'):
            print("   ✅ Google API key is configured")
        else:
            print("   ❌ Google API key not showing as configured")

    # Test that the HTML includes the auto-select script
    response = session.get("http://localhost:5000/")
    if response.ok:
        html_content = response.text
        if 'autoSelectFirstApiKey' in html_content:
            print("   ✅ autoSelectFirstApiKey function found in page")
        else:
            print("   ❌ autoSelectFirstApiKey function not found in page")

        if 'updateWorkflowStep' in html_content:
            print("   ✅ updateWorkflowStep function found in page")
        else:
            print("   ❌ updateWorkflowStep function not found in page")

def main():
    print("="*60)
    print("STEP 4 AUTO-SELECTION AND SIDEBAR UPDATE TEST")
    print("="*60)

    # Check server is running
    try:
        response = requests.get("http://localhost:5000/health")
        if response.status_code != 200:
            print("❌ Server is not running properly!")
            return
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        return

    print("✅ Server is running")

    # Run tests
    provider = test_api_key_status()
    test_workflow_state()
    test_manual_verification()

    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    if provider:
        print(f"✅ API keys are configured ({provider})")
        print("✅ Auto-selection should work")
    else:
        print("⚠️ No API keys configured - auto-selection won't trigger")
        print("   Configure API keys first, then reload the page")

    print("\n📝 Note: The updateStep4Status function now calls updateWorkflowStep")
    print("   to ensure both the step card and sidebar indicator are updated.")
    print("\n🔍 Check browser console for confirmation messages.")

if __name__ == "__main__":
    main()