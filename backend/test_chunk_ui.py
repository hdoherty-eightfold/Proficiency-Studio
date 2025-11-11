#!/usr/bin/env python3
"""Test chunk processing UI functionality"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import json

def test_chunk_processing():
    """Test that chunk processing works without errors"""

    print("🧪 Testing Chunk Processing UI")
    print("=" * 60)

    # Setup Chrome in headless mode
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 30)

    try:
        # Navigate to app
        driver.get('http://localhost:5000')
        print("✅ Loaded application")

        # Navigate to Step 5
        step5_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Step 5')]")))
        step5_btn.click()
        print("✅ Navigated to Step 5")

        # Wait for Step 5 content to load
        time.sleep(2)

        # Set test configuration
        driver.execute_script("""
            // Set test skills
            const testSkills = ['Python', 'JavaScript', 'Testing'];
            localStorage.setItem('skillProficiencyItems', JSON.stringify(testSkills));

            // Set chunk configuration
            document.getElementById('batch-size-input').value = 2;
            document.getElementById('concurrent-batches-input').value = 1;

            // Trigger change events
            document.getElementById('batch-size-input').dispatchEvent(new Event('change'));
            document.getElementById('concurrent-batches-input').dispatchEvent(new Event('change'));

            // Set API key
            window.googleApiKey = 'test-key';
            localStorage.setItem('googleApiKey', 'test-key');
        """)
        print("✅ Set test configuration (3 skills, batch size 2)")

        # Click Run Assessment
        run_btn = driver.find_element(By.ID, "run-skills-assessment")
        driver.execute_script("arguments[0].scrollIntoView();", run_btn)
        run_btn.click()
        print("✅ Started assessment")

        # Monitor console for errors
        time.sleep(3)

        # Check console logs for errors
        logs = driver.get_log('browser')
        errors = [log for log in logs if log['level'] == 'SEVERE']

        if errors:
            print("\n❌ JavaScript Errors Found:")
            for error in errors:
                message = error['message']
                if 'chunkStartTime' in message:
                    print(f"   🔴 chunkStartTime reference error: {message}")
                    return False
                elif 'is not defined' in message:
                    print(f"   🔴 Undefined reference: {message}")
                    return False
                else:
                    print(f"   ⚠️ {message}")

        # Check if chunks are being created
        chunks_exist = driver.execute_script("""
            const chunks = document.querySelectorAll('.chunk-card');
            return chunks.length > 0;
        """)

        if chunks_exist:
            print("✅ Chunk cards created successfully")

        # Check if timer is running
        timer_running = driver.execute_script("""
            return window.progressInterval !== null && window.progressInterval !== undefined;
        """)

        if timer_running:
            print("✅ Timer is running")

        # Check chunk timings object exists
        chunk_timings_exist = driver.execute_script("""
            return typeof window.chunkStartTimes === 'object';
        """)

        if not chunk_timings_exist:
            print("❌ chunkStartTimes object not found")
            return False
        else:
            print("✅ chunkStartTimes object exists")

        print("\n✅ All chunk processing tests passed!")
        return True

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    success = test_chunk_processing()
    exit(0 if success else 1)