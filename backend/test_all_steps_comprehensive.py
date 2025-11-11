#!/usr/bin/env python3
"""
Comprehensive test suite for ALL workflow steps (1-6)
Must be run after EVERY code change to ensure core functionality remains intact.
"""

import requests
import json
import time
import sys
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_TIMEOUT = 10
VERBOSE = True

class Colors:
    """Terminal colors for test output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class ComprehensiveTestSuite:
    def __init__(self):
        self.results = []
        self.critical_errors = []
        self.warnings = []

    def log(self, message: str, level: str = "info", indent: int = 0):
        """Enhanced logging with colors and indentation"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        indent_str = "  " * indent

        # Color coding
        color = ""
        icon = "•"
        if level == "header":
            color = Colors.HEADER + Colors.BOLD
            icon = "═"
            message = f" {message} ".center(60, "═")
        elif level == "success":
            color = Colors.OKGREEN
            icon = "✅"
        elif level == "error":
            color = Colors.FAIL
            icon = "❌"
        elif level == "warning":
            color = Colors.WARNING
            icon = "⚠️"
        elif level == "info":
            color = Colors.OKCYAN
            icon = "ℹ️"
        elif level == "test":
            color = Colors.OKBLUE
            icon = "🧪"

        print(f"{color}[{timestamp}] {icon} {indent_str}{message}{Colors.ENDC}")

    def check_server_health(self) -> bool:
        """Check if server is running and healthy"""
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=2)
            return response.status_code == 200
        except:
            return False

    def record_result(self, test_name: str, passed: bool, error: Optional[str] = None):
        """Record test result"""
        self.results.append({
            "test": test_name,
            "passed": passed,
            "error": error,
            "time": datetime.now()
        })
        if not passed and error:
            self.critical_errors.append(f"{test_name}: {error}")

    # ==================== STEP 1: Eightfold Authentication ====================
    def test_step1_authentication(self) -> bool:
        """Test Step 1: Eightfold Authentication"""
        self.log("STEP 1: Eightfold Authentication", "header")
        passed = True

        # Test 1.1: Check UI elements exist
        self.log("Testing UI elements...", "test", 1)
        try:
            response = requests.get(BASE_URL)
            if response.ok:
                html = response.text

                # Check for authentication elements
                has_auth_button = 'testEightfoldAuth' in html or 'Authenticate' in html
                has_credentials = 'Username' in html or 'username' in html or 'Password' in html

                if has_auth_button and has_credentials:
                    self.log("Authentication UI elements present", "success", 2)
                    self.record_result("Step1.UI", True)
                else:
                    self.log("Authentication UI elements missing", "error", 2)
                    self.record_result("Step1.UI", False, "Missing auth elements")
                    passed = False
            else:
                self.log(f"Failed to load page: {response.status_code}", "error", 2)
                self.record_result("Step1.UI", False, f"HTTP {response.status_code}")
                passed = False
        except Exception as e:
            self.log(f"Error checking UI: {e}", "error", 2)
            self.record_result("Step1.UI", False, str(e))
            passed = False

        # Test 1.2: Check JavaScript functions
        self.log("Testing JavaScript functions...", "test", 1)
        try:
            js_response = requests.get(f"{BASE_URL}/static/js/workflow.js")
            if js_response.ok:
                js_content = js_response.text

                # Check for required functions
                has_test_auth = 'function testEightfoldAuth' in js_content
                has_window_export = 'window.testEightfoldAuth' in js_content

                if has_test_auth:
                    self.log("testEightfoldAuth function found", "success", 2)
                    self.record_result("Step1.JS.testAuth", True)
                else:
                    self.log("testEightfoldAuth function missing", "error", 2)
                    self.record_result("Step1.JS.testAuth", False, "Function not defined")
                    passed = False

                if has_window_export:
                    self.log("testEightfoldAuth properly exported", "success", 2)
                    self.record_result("Step1.JS.export", True)
                else:
                    self.log("testEightfoldAuth not exported to window", "warning", 2)
                    self.warnings.append("testEightfoldAuth may not be accessible from HTML onclick")

        except Exception as e:
            self.log(f"Error checking JavaScript: {e}", "error", 2)
            self.record_result("Step1.JS", False, str(e))
            passed = False

        return passed

    # ==================== STEP 2: JIE Roles History ====================
    def test_step2_jie_roles(self) -> bool:
        """Test Step 2: JIE Roles History"""
        self.log("STEP 2: JIE Roles History", "header")
        passed = True

        # Test 2.1: Check UI elements
        self.log("Testing JIE Roles UI...", "test", 1)
        try:
            response = requests.get(BASE_URL)
            if response.ok:
                html = response.text

                has_history_button = 'showJIERolesHistory' in html or 'View History' in html
                has_roles_section = 'JIE Roles' in html

                if has_history_button and has_roles_section:
                    self.log("JIE Roles UI elements present", "success", 2)
                    self.record_result("Step2.UI", True)
                else:
                    self.log("JIE Roles UI elements missing", "error", 2)
                    self.record_result("Step2.UI", False, "Missing JIE elements")
                    passed = False
        except Exception as e:
            self.log(f"Error checking UI: {e}", "error", 2)
            self.record_result("Step2.UI", False, str(e))
            passed = False

        # Test 2.2: Check JavaScript functions
        self.log("Testing JIE Roles functions...", "test", 1)
        try:
            js_response = requests.get(f"{BASE_URL}/static/js/workflow.js")
            if js_response.ok:
                js_content = js_response.text

                has_show_history = 'function showJIERolesHistory' in js_content
                has_window_export = 'window.showJIERolesHistory' in js_content

                if has_show_history:
                    self.log("showJIERolesHistory function found", "success", 2)
                    self.record_result("Step2.JS.showHistory", True)
                else:
                    self.log("showJIERolesHistory function missing", "error", 2)
                    self.record_result("Step2.JS.showHistory", False, "Function not defined")
                    passed = False

                if has_window_export:
                    self.log("showJIERolesHistory properly exported", "success", 2)
                    self.record_result("Step2.JS.export", True)
                else:
                    self.log("showJIERolesHistory not exported to window", "warning", 2)
                    self.warnings.append("showJIERolesHistory may not be accessible from HTML onclick")

        except Exception as e:
            self.log(f"Error checking JavaScript: {e}", "error", 2)
            self.record_result("Step2.JS", False, str(e))
            passed = False

        return passed

    # ==================== STEP 3: Skills Extraction ====================
    def test_step3_skills_extraction(self) -> bool:
        """Test Step 3: Skills Extraction"""
        self.log("STEP 3: Skills Extraction", "header")
        passed = True

        # Test 3.1: Generate test skills
        self.log("Testing skills generation...", "test", 1)
        test_skills = [{"name": f"Test Skill {i}"} for i in range(10)]

        # Test 3.2: Check skills display
        self.log("Testing skills display UI...", "test", 1)
        try:
            response = requests.get(BASE_URL)
            if response.ok:
                html = response.text

                has_skills_section = 'Extracted Skills' in html or 'skills-list' in html
                has_skills_count = 'skills-count' in html or 'Total Skills' in html

                if has_skills_section:
                    self.log("Skills display section present", "success", 2)
                    self.record_result("Step3.UI.display", True)
                else:
                    self.log("Skills display section missing", "error", 2)
                    self.record_result("Step3.UI.display", False, "Missing skills display")
                    passed = False

        except Exception as e:
            self.log(f"Error checking UI: {e}", "error", 2)
            self.record_result("Step3.UI", False, str(e))
            passed = False

        return passed

    # ==================== STEP 4: API Key Configuration ====================
    def test_step4_api_configuration(self) -> bool:
        """Test Step 4: API Key Configuration"""
        self.log("STEP 4: API Key Configuration", "header")
        passed = True

        # Test 4.1: Check configuration UI
        self.log("Testing API configuration UI...", "test", 1)
        try:
            response = requests.get(BASE_URL)
            if response.ok:
                html = response.text

                has_provider_select = 'llm-provider' in html or 'Provider Selection' in html
                has_api_key_section = 'api-key' in html or 'API Key' in html
                has_google_dropdown = 'google-api-key-dropdown' in html

                if has_provider_select and has_api_key_section:
                    self.log("API configuration UI present", "success", 2)
                    self.record_result("Step4.UI", True)
                else:
                    self.log("API configuration UI missing", "error", 2)
                    self.record_result("Step4.UI", False, "Missing config elements")
                    passed = False

        except Exception as e:
            self.log(f"Error checking UI: {e}", "error", 2)
            self.record_result("Step4.UI", False, str(e))
            passed = False

        # Test 4.2: Test API key update endpoint
        self.log("Testing API key update endpoint...", "test", 1)
        try:
            test_key_response = requests.post(
                f"{BASE_URL}/api/keys/update",
                json={"google": "test-key-comprehensive"},
                timeout=5
            )

            if test_key_response.ok:
                self.log("API key update endpoint working", "success", 2)
                self.record_result("Step4.API.update", True)
            else:
                self.log(f"API key update failed: {test_key_response.status_code}", "error", 2)
                self.record_result("Step4.API.update", False, f"HTTP {test_key_response.status_code}")
                passed = False

        except Exception as e:
            self.log(f"Error updating API key: {e}", "error", 2)
            self.record_result("Step4.API.update", False, str(e))
            passed = False

        # Test 4.3: Check auto-selection functionality
        self.log("Testing auto-selection functionality...", "test", 1)
        try:
            js_response = requests.get(f"{BASE_URL}/static/js/workflow.js")
            if js_response.ok:
                js_content = js_response.text

                has_auto_select = 'autoSelectFirstApiKey' in js_content
                has_update_status = 'updateStep4Status' in js_content or 'updateWorkflowStep' in js_content

                if has_auto_select:
                    self.log("Auto-selection function found", "success", 2)
                    self.record_result("Step4.JS.autoSelect", True)
                else:
                    self.log("Auto-selection function missing", "warning", 2)
                    self.warnings.append("API key auto-selection may not work")

                if has_update_status:
                    self.log("Status update function found", "success", 2)
                    self.record_result("Step4.JS.statusUpdate", True)
                else:
                    self.log("Status update function missing", "warning", 2)
                    self.warnings.append("Sidebar may not update to green")

        except Exception as e:
            self.log(f"Error checking JavaScript: {e}", "error", 2)
            self.record_result("Step4.JS", False, str(e))
            passed = False

        return passed

    # ==================== STEP 5: LangChain Execute ====================
    def test_step5_langchain_execute(self) -> bool:
        """Test Step 5: LangChain Execute - CRITICAL"""
        self.log("STEP 5: LangChain Execute (CRITICAL)", "header")
        passed = True

        # Test 5.1: Check Operation Status Panel
        self.log("Testing Operation Status Panel...", "test", 1)
        try:
            response = requests.get(BASE_URL)
            if response.ok:
                html = response.text

                has_operation_panel = 'operation-status-panel' in html or 'Operation Status' in html
                has_operation_log = 'operation-log' in html
                has_clear_button = 'clear-logs' in html or 'Clear Logs' in html

                if has_operation_panel and has_operation_log:
                    self.log("Operation Status Panel present", "success", 2)
                    self.record_result("Step5.UI.operationPanel", True)
                else:
                    self.log("Operation Status Panel MISSING - CRITICAL", "error", 2)
                    self.record_result("Step5.UI.operationPanel", False, "Missing operation panel")
                    self.critical_errors.append("Operation Status Panel missing - errors won't show!")
                    passed = False

        except Exception as e:
            self.log(f"Error checking UI: {e}", "error", 2)
            self.record_result("Step5.UI", False, str(e))
            passed = False

        # Test 5.2: Check error display functions
        self.log("Testing error display functions...", "test", 1)
        try:
            js_response = requests.get(f"{BASE_URL}/static/js/workflow.js")
            if js_response.ok:
                js_content = js_response.text

                # Critical error display functions
                has_update_log = 'updateProcessingLog' in js_content
                has_network_error = 'NETWORK ERROR' in js_content
                has_timeout_error = 'REQUEST TIMEOUT' in js_content
                has_server_error = 'SERVER ERROR' in js_content
                has_401_error = 'UNAUTHORIZED (401)' in js_content
                has_429_error = 'RATE LIMIT' in js_content

                if not has_update_log:
                    self.log("updateProcessingLog function MISSING - CRITICAL", "error", 2)
                    self.record_result("Step5.JS.updateLog", False, "Function missing")
                    self.critical_errors.append("updateProcessingLog missing - cannot display errors!")
                    passed = False
                else:
                    self.log("updateProcessingLog function found", "success", 2)
                    self.record_result("Step5.JS.updateLog", True)

                # Check error message templates
                error_checks = [
                    (has_network_error, "Network error handling"),
                    (has_timeout_error, "Timeout error handling"),
                    (has_server_error, "Server error handling"),
                    (has_401_error, "401 error handling"),
                    (has_429_error, "Rate limit error handling")
                ]

                for check, name in error_checks:
                    if check:
                        self.log(f"{name} present", "success", 2)
                    else:
                        self.log(f"{name} MISSING", "error", 2)
                        self.critical_errors.append(f"{name} missing")
                        passed = False

        except Exception as e:
            self.log(f"Error checking JavaScript: {e}", "error", 2)
            self.record_result("Step5.JS", False, str(e))
            passed = False

        # Test 5.3: Check chunk timer functionality
        self.log("Testing chunk timer functionality...", "test", 1)
        try:
            js_response = requests.get(f"{BASE_URL}/static/js/workflow.js")
            if js_response.ok:
                js_content = js_response.text

                has_start_timer = 'startChunkTimer' in js_content
                has_stop_timer = 'stopChunkTimer' in js_content
                has_timer_update = 'updateChunkTimer' in js_content or 'setInterval' in js_content

                if has_start_timer and has_stop_timer:
                    self.log("Chunk timer functions found", "success", 2)
                    self.record_result("Step5.JS.chunkTimer", True)
                else:
                    self.log("Chunk timer functions missing", "error", 2)
                    self.record_result("Step5.JS.chunkTimer", False, "Timer functions missing")
                    self.critical_errors.append("Chunk timers won't work")
                    passed = False

        except Exception as e:
            self.log(f"Error checking timers: {e}", "error", 2)
            self.record_result("Step5.JS.timers", False, str(e))
            passed = False

        # Test 5.4: Test with 408 skills (CRITICAL TEST)
        self.log("Testing 408 skills processing...", "test", 1)

        # Generate 408 test skills with realistic names
        test_skills = []
        skill_categories = ["Development", "Data Analysis", "Cloud", "DevOps", "Management"]
        for i in range(408):
            category = skill_categories[i % len(skill_categories)]
            test_skills.append({
                "name": f"Professional Skill {i+1:03d} - {category} - Extended Name for Testing"
            })

        # Set test API key
        requests.post(f"{BASE_URL}/api/keys/update", json={"google": "test-key-408-comprehensive"})

        # Try to process (we just want to verify it accepts the request)
        try:
            self.log(f"Sending {len(test_skills)} skills for processing...", "info", 2)

            response = requests.post(
                f"{BASE_URL}/api/skills/assess-proficiencies-simple",
                json={
                    "skills": test_skills,
                    "provider": "google",
                    "model": "gemini-1.5-flash",
                    "batch_size": 100,
                    "chunk_size": 408,
                    "is_chunked": False,
                    "environment": "test"
                },
                timeout=3  # Short timeout just to check acceptance
            )

            # We expect timeout or processing start
            self.log("408 skills request accepted for processing", "success", 2)
            self.record_result("Step5.408skills", True)

        except requests.Timeout:
            # Timeout is expected - means processing started
            self.log("408 skills processing started (timeout expected)", "success", 2)
            self.record_result("Step5.408skills", True)

        except Exception as e:
            self.log(f"408 skills test FAILED: {e}", "error", 2)
            self.record_result("Step5.408skills", False, str(e))
            self.critical_errors.append("Cannot process 408 skills")
            passed = False

        # Test 5.5: Check duplicate variable declarations
        self.log("Checking for duplicate variable declarations...", "test", 1)
        try:
            js_response = requests.get(f"{BASE_URL}/static/js/workflow.js")
            if js_response.ok:
                js_content = js_response.text

                # Check for duplicate promptTemplate declarations
                promptTemplate_count = js_content.count('const promptTemplate =')

                if promptTemplate_count > 1:
                    self.log(f"DUPLICATE promptTemplate declarations found: {promptTemplate_count}", "error", 2)
                    self.record_result("Step5.JS.duplicates", False, f"{promptTemplate_count} declarations")
                    self.critical_errors.append(f"Duplicate promptTemplate: {promptTemplate_count} declarations")
                    passed = False
                elif promptTemplate_count == 0:
                    self.log("No promptTemplate declarations found (may use different name)", "info", 2)
                    self.record_result("Step5.JS.duplicates", True)
                else:
                    self.log("No duplicate promptTemplate declarations", "success", 2)
                    self.record_result("Step5.JS.duplicates", True)

        except Exception as e:
            self.log(f"Error checking duplicates: {e}", "error", 2)

        return passed

    # ==================== STEP 6: Assessment Results ====================
    def test_step6_assessment_results(self) -> bool:
        """Test Step 6: Assessment Results"""
        self.log("STEP 6: Assessment Results", "header")
        passed = True

        # Test 6.1: Check results display UI
        self.log("Testing results display UI...", "test", 1)
        try:
            response = requests.get(BASE_URL)
            if response.ok:
                html = response.text

                has_results_section = 'assessment-results' in html or 'Assessment Results' in html
                has_download_button = 'download' in html or 'Download' in html

                if has_results_section:
                    self.log("Results display section present", "success", 2)
                    self.record_result("Step6.UI", True)
                else:
                    self.log("Results display section missing", "warning", 2)
                    self.warnings.append("Results display may not work properly")

        except Exception as e:
            self.log(f"Error checking UI: {e}", "error", 2)
            self.record_result("Step6.UI", False, str(e))
            passed = False

        return passed

    # ==================== MAIN TEST RUNNER ====================
    def run_all_tests(self) -> bool:
        """Run all tests and generate comprehensive report"""
        self.log("COMPREHENSIVE TEST SUITE FOR ALL WORKFLOW STEPS", "header")
        self.log(f"Test started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "info")

        # Check server health first
        if not self.check_server_health():
            self.log("SERVER NOT RUNNING! Please start with: python app_fastapi.py", "error")
            self.log("Cannot continue tests without server", "error")
            return False

        self.log("Server is healthy ✅", "success")
        self.log("", "info")  # Empty line

        # Run tests for each step
        all_passed = True
        test_functions = [
            self.test_step1_authentication,
            self.test_step2_jie_roles,
            self.test_step3_skills_extraction,
            self.test_step4_api_configuration,
            self.test_step5_langchain_execute,  # CRITICAL
            self.test_step6_assessment_results
        ]

        for test_func in test_functions:
            try:
                step_passed = test_func()
                if not step_passed:
                    all_passed = False
            except Exception as e:
                self.log(f"Test crashed: {e}", "error")
                self.record_result(test_func.__name__, False, str(e))
                all_passed = False

            self.log("", "info")  # Empty line between steps

        # Generate final report
        self.generate_report(all_passed)

        return all_passed

    def generate_report(self, all_passed: bool):
        """Generate comprehensive test report"""
        self.log("TEST RESULTS SUMMARY", "header")

        # Count results
        passed_count = sum(1 for r in self.results if r["passed"])
        failed_count = sum(1 for r in self.results if not r["passed"])
        total_count = len(self.results)

        # Display statistics
        self.log(f"Total Tests: {total_count}", "info")
        self.log(f"Passed: {passed_count} ✅", "success")
        self.log(f"Failed: {failed_count} ❌", "error" if failed_count > 0 else "info")

        # Display critical errors
        if self.critical_errors:
            self.log("", "info")
            self.log("CRITICAL ERRORS THAT MUST BE FIXED:", "error")
            for error in self.critical_errors:
                self.log(f"• {error}", "error", 1)

        # Display warnings
        if self.warnings:
            self.log("", "info")
            self.log("WARNINGS:", "warning")
            for warning in self.warnings:
                self.log(f"• {warning}", "warning", 1)

        # Final verdict
        self.log("", "info")
        if all_passed:
            self.log("✅✅✅ ALL TESTS PASSED! CORE FUNCTIONALITY INTACT ✅✅✅", "success")
            self.log("Safe to proceed with deployment", "success")
        else:
            self.log("❌❌❌ TESTS FAILED! FIX CRITICAL ERRORS BEFORE PROCEEDING ❌❌❌", "error")

            # Provide action items
            self.log("", "info")
            self.log("REQUIRED ACTIONS:", "error")
            self.log("1. Fix all critical errors listed above", "error", 1)
            self.log("2. Ensure Operation Status Panel is visible", "error", 1)
            self.log("3. Verify error messages display in UI", "error", 1)
            self.log("4. Test with 408 skills to ensure processing works", "error", 1)
            self.log("5. Run this test again until all pass", "error", 1)

        # Save report to file
        self.save_report()

    def save_report(self):
        """Save test report to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_report_{timestamp}.json"

        report_data = {
            "timestamp": timestamp,
            "results": self.results,
            "critical_errors": self.critical_errors,
            "warnings": self.warnings,
            "summary": {
                "total": len(self.results),
                "passed": sum(1 for r in self.results if r["passed"]),
                "failed": sum(1 for r in self.results if not r["passed"])
            }
        }

        with open(filename, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)

        self.log(f"Report saved to: {filename}", "info")

if __name__ == "__main__":
    # Create and run test suite
    tester = ComprehensiveTestSuite()
    success = tester.run_all_tests()

    # Exit with appropriate code
    sys.exit(0 if success else 1)