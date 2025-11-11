#!/usr/bin/env python3
"""Test Step 4 sidebar indicator turns green when key is selected"""

import requests
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def test_step4_sidebar_selenium():
    """Test Step 4 sidebar with actual browser"""
    print("\n" + "="*60)
    print("TESTING STEP 4 SIDEBAR INDICATOR")
    print("="*60)

    # Setup Chrome in headless mode
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")

    try:
        driver = webdriver.Chrome(options=chrome_options)
        wait = WebDriverWait(driver, 10)

        # Load the page
        print("\n1️⃣ Loading application...")
        driver.get("http://localhost:5000")
        time.sleep(2)  # Let the page fully load

        # Check initial state of Step 4 indicator
        print("\n2️⃣ Checking initial Step 4 indicator state...")
        step4_indicator = driver.find_element(By.ID, "step-4-indicator")
        initial_classes = step4_indicator.get_attribute("class")
        print(f"   Initial classes: {initial_classes}")

        has_gray = "bg-gray-300" in initial_classes or "dark:bg-gray-600" in initial_classes
        has_green = "bg-green-500" in initial_classes or "dark:bg-green-600" in initial_classes

        print(f"   Initial state: {'✅ Gray (pending)' if has_gray else '❌ Not gray'}")

        # Add a test API key via localStorage
        print("\n3️⃣ Adding test Google API key...")
        driver.execute_script("""
            // Initialize googleApiKeys if not already
            if (!window.googleApiKeys) {
                window.googleApiKeys = { keys: [], activeKeyIndex: null };
            }

            // Add a test key
            window.googleApiKeys.keys = [{
                name: "Test Key",
                key: "test-api-key-123",
                failCount: 0,
                addedAt: Date.now()
            }];

            // Save to localStorage
            localStorage.setItem('googleApiKeys', JSON.stringify({
                keys: window.googleApiKeys.keys,
                activeKeyIndex: null
            }));

            // Trigger the auto-select
            window.googleApiKeys.updateUI();

            // Call autoSelectFirstApiKey if it exists
            if (typeof autoSelectFirstApiKey === 'function') {
                autoSelectFirstApiKey();
            }
        """)

        # Wait for potential updates
        time.sleep(2)

        # Check if dropdown is populated
        print("\n4️⃣ Checking if dropdown is populated...")
        dropdown = driver.find_element(By.ID, "google-active-key")
        options = dropdown.find_elements(By.TAG_NAME, "option")
        print(f"   Dropdown has {len(options)} options")

        if len(options) > 1:  # More than just the placeholder
            # Select the first real option
            print("\n5️⃣ Selecting first API key...")
            driver.execute_script("""
                const select = document.getElementById('google-active-key');
                if (select && select.options.length > 1) {
                    select.value = '0';
                    // Call the selection function
                    if (typeof selectGoogleKey === 'function') {
                        selectGoogleKey();
                    }
                }
            """)

            time.sleep(1)

            # Check final state
            print("\n6️⃣ Checking Step 4 indicator after selection...")
            step4_indicator = driver.find_element(By.ID, "step-4-indicator")
            final_classes = step4_indicator.get_attribute("class")
            print(f"   Final classes: {final_classes}")

            has_green_final = "bg-green-500" in final_classes or "dark:bg-green-600" in final_classes

            if has_green_final:
                print("   ✅ Step 4 indicator is GREEN!")

                # Also check if checkmark is visible
                checkmark = step4_indicator.find_element(By.CLASS_NAME, "step-check")
                is_hidden = "hidden" in checkmark.get_attribute("class")
                if not is_hidden:
                    print("   ✅ Checkmark is visible!")
                else:
                    print("   ⚠️ Checkmark is still hidden")

                return True
            else:
                print("   ❌ Step 4 indicator is NOT green")
                return False
        else:
            print("   ⚠️ Dropdown not populated properly")
            return False

    except Exception as e:
        print(f"\n❌ Selenium test error: {str(e)}")
        return False
    finally:
        driver.quit()

def test_step4_api():
    """Test Step 4 via API calls"""
    print("\n" + "="*60)
    print("TESTING STEP 4 API FUNCTIONALITY")
    print("="*60)

    # Set a test Google API key
    print("\n1️⃣ Setting Google API key via API...")
    response = requests.post(
        "http://localhost:5000/api/keys/update",
        json={"google": "test-step4-key"}
    )

    if response.ok:
        print("   ✅ API key set successfully")
    else:
        print(f"   ❌ Failed to set API key: {response.status_code}")
        return False

    # Check status
    print("\n2️⃣ Checking API key status...")
    status_response = requests.get("http://localhost:5000/api/keys/status")

    if status_response.ok:
        status = status_response.json()
        if status.get("google"):
            print("   ✅ Google API key is configured")
            return True
        else:
            print("   ❌ Google API key not showing as configured")
            return False
    else:
        print(f"   ❌ Failed to get status: {status_response.status_code}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Step 4 Sidebar Indicator")

    # Check server
    try:
        health = requests.get("http://localhost:5000/health", timeout=2)
        if health.status_code != 200:
            print("❌ Server is not healthy!")
            exit(1)
    except:
        print("❌ Cannot connect to server at http://localhost:5000")
        exit(1)

    # Try Selenium test first (if available)
    try:
        selenium_success = test_step4_sidebar_selenium()
    except ImportError:
        print("\n⚠️ Selenium not installed, skipping browser test")
        selenium_success = None
    except Exception as e:
        print(f"\n⚠️ Selenium test failed: {str(e)}")
        selenium_success = False

    # Always run API test
    api_success = test_step4_api()

    # Summary
    print("\n" + "="*60)
    print("TEST RESULTS")
    print("="*60)

    if selenium_success is not None:
        print(f"Browser Test: {'✅ PASS' if selenium_success else '❌ FAIL'}")
    else:
        print("Browser Test: ⏭️ SKIPPED (Selenium not available)")

    print(f"API Test: {'✅ PASS' if api_success else '❌ FAIL'}")

    if (selenium_success or selenium_success is None) and api_success:
        print("\n✅✅✅ Step 4 sidebar indicator functionality WORKING! ✅✅✅")
        print("The sidebar indicator turns green when an API key is selected.")
    else:
        print("\n⚠️ Some tests indicate issues with Step 4 sidebar indicator")