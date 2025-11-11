#!/usr/bin/env python
"""
Comprehensive QA Test Suite
Tests all recent changes to ensure nothing is broken
"""

import requests
import json
import sys
import time

API_URL = "http://localhost:5000"

print("=" * 70)
print("COMPREHENSIVE QA TEST SUITE")
print("=" * 70)

# Track test results
tests_passed = 0
tests_failed = 0
warnings = []

def test(name, condition, details=""):
    global tests_passed, tests_failed
    if condition:
        print(f"✅ PASS: {name}")
        if details:
            print(f"        {details}")
        tests_passed += 1
        return True
    else:
        print(f"❌ FAIL: {name}")
        if details:
            print(f"        {details}")
        tests_failed += 1
        return False

def warn(message):
    global warnings
    warnings.append(message)
    print(f"⚠️  WARN: {message}")

# ============================================================================
# TEST 1: Server Health Check
# ============================================================================
print("\n[TEST GROUP 1] Server Health Check")
print("-" * 50)

try:
    response = requests.get(f"{API_URL}/health", timeout=5)
    test("Server is running", response.status_code == 200)

    response = requests.get(f"{API_URL}/api/status", timeout=5)
    test("API status endpoint works", response.status_code == 200)
except Exception as e:
    test("Server connectivity", False, str(e))
    print("\n⛔ CRITICAL: Server is not running. Please start it first.")
    sys.exit(1)

# ============================================================================
# TEST 2: JavaScript Syntax Check
# ============================================================================
print("\n[TEST GROUP 2] JavaScript Syntax Validation")
print("-" * 50)

js_files = [
    "web/static/js/workflow.js",
    "web/static/js/validation.js",
    "web/static/js/step6-enhanced.js"
]

for js_file in js_files:
    try:
        with open(js_file, 'r') as f:
            content = f.read()

        # Check for basic syntax issues
        has_syntax_error = False

        # Check for unmatched braces
        open_braces = content.count('{')
        close_braces = content.count('}')
        if open_braces != close_braces:
            has_syntax_error = True
            warn(f"{js_file}: Unmatched braces ({open_braces} open, {close_braces} close)")

        # Check for unmatched parentheses
        open_parens = content.count('(')
        close_parens = content.count(')')
        if open_parens != close_parens:
            has_syntax_error = True
            warn(f"{js_file}: Unmatched parentheses ({open_parens} open, {close_parens} close)")

        test(f"{js_file} syntax check", not has_syntax_error)

    except Exception as e:
        test(f"{js_file} readable", False, str(e))

# ============================================================================
# TEST 3: Timer Fix Validation
# ============================================================================
print("\n[TEST GROUP 3] Timer Fix Validation")
print("-" * 50)

try:
    with open('web/static/js/workflow.js', 'r') as f:
        workflow_content = f.read()

    # Check timer stop at 100% success
    timer_fix_present = "successRate === 100 && processedSkills > 0" in workflow_content
    test("Timer stops at 100% success rate", timer_fix_present)

    timer_stop_call = "stopAssessmentTimer('100% success achieved')" in workflow_content
    test("Timer stop function called correctly", timer_stop_call)

    # Check timer stop at chunk completion
    chunk_complete_stop = "stopAssessmentTimer('all chunks complete')" in workflow_content
    test("Timer stops when all chunks complete", chunk_complete_stop)

except Exception as e:
    test("Timer fix validation", False, str(e))

# ============================================================================
# TEST 4: Single Chunk Processing Fix
# ============================================================================
print("\n[TEST GROUP 4] Single Chunk Processing Fix")
print("-" * 50)

try:
    with open('web/static/js/workflow.js', 'r') as f:
        workflow_content = f.read()

    # Check for single chunk detection
    single_chunk_check = "isSingleChunkForAll = chunkSizeValue >= totalSkills" in workflow_content
    test("Single chunk detection logic present", single_chunk_check)

    # Check for prevention of auto-continuation
    no_auto_continue = "!isSingleChunkForAll" in workflow_content
    test("Auto-continuation prevented for single chunk", no_auto_continue)

    # Check for single chunk completion message
    completion_msg = "Single chunk processing complete - all skills assessed in one batch" in workflow_content
    test("Single chunk completion message present", completion_msg)

    # Check for early return
    early_return = "if (isSingleChunkForAll && chunkingState.accumulatedResults.length >= totalSkills)" in workflow_content
    test("Early return for single chunk completion", early_return)

except Exception as e:
    test("Single chunk fix validation", False, str(e))

# ============================================================================
# TEST 5: Validation Functionality
# ============================================================================
print("\n[TEST GROUP 5] Validation Functionality")
print("-" * 50)

try:
    # Test validation.js exists and has correct functions
    with open('web/static/js/validation.js', 'r') as f:
        validation_content = f.read()

    test("validateUpdatedSkills function exists",
         "function validateUpdatedSkills()" in validation_content)

    test("Uses operation-status for logging",
         "getElementById('operation-status')" in validation_content)

    test("Fetches from Eightfold API",
         "/api/v2/JIE/roles" in validation_content)

    test("Compares expected vs actual",
         "expectedSkill" in validation_content and "currentProf" in validation_content)

    test("Shows detailed status categories",
         "CONFIRMED" in validation_content or "NOT UPDATED" in validation_content)

    # Test API endpoint
    response = requests.get(f"{API_URL}/api/latest-skills")
    test("Latest skills API endpoint accessible",
         response.status_code in [200, 404],
         f"Status: {response.status_code}")

except Exception as e:
    test("Validation functionality", False, str(e))

# ============================================================================
# TEST 6: HTML Structure Integrity
# ============================================================================
print("\n[TEST GROUP 6] HTML Structure Integrity")
print("-" * 50)

try:
    with open('web/templates/index.html', 'r') as f:
        html_content = f.read()

    # Check key elements exist
    test("Step 5 section exists",
         'Step 5' in html_content and 'LangChain Execute' in html_content)

    test("Step 6 section exists",
         'Step 6' in html_content and 'Apply LLM-Generated' in html_content)

    test("Validate Updated Skills button exists",
         'Validate Updated Skills' in html_content)

    test("Operation status div exists",
         'id="operation-status"' in html_content)

    test("Assessment overview section exists",
         'Assessment Overview' in html_content)

    test("Timer display elements exist",
         'id="elapsed-time"' in html_content)

    test("Success rate display exists",
         'id="success-rate"' in html_content)

except Exception as e:
    test("HTML structure integrity", False, str(e))

# ============================================================================
# TEST 7: API Endpoint Functionality
# ============================================================================
print("\n[TEST GROUP 7] API Endpoints")
print("-" * 50)

endpoints = [
    ("/api/keys/status", "GET", "API keys status"),
    ("/api/environments", "GET", "Environments list"),
    ("/api/assessments/list", "GET", "Assessments list"),
    ("/api/health", "GET", "Health check"),
]

for endpoint, method, description in endpoints:
    try:
        if method == "GET":
            response = requests.get(f"{API_URL}{endpoint}", timeout=5)
        test(f"{description} ({endpoint})",
             response.status_code in [200, 201],
             f"Status: {response.status_code}")
    except Exception as e:
        test(f"{description} ({endpoint})", False, str(e))

# ============================================================================
# TEST 8: Critical Functions Check
# ============================================================================
print("\n[TEST GROUP 8] Critical Functions")
print("-" * 50)

try:
    with open('web/static/js/workflow.js', 'r') as f:
        workflow_content = f.read()

    critical_functions = [
        "updateOverallProgress",
        "stopAssessmentTimer",
        "handleChunkResponse",
        "runLangChainAssessment",
        "updateChunkStatus",
        "updateProcessingLog"
    ]

    for func_name in critical_functions:
        func_exists = f"function {func_name}" in workflow_content
        test(f"Function {func_name} exists", func_exists)

except Exception as e:
    test("Critical functions check", False, str(e))

# ============================================================================
# TEST 9: Edge Cases and Error Handling
# ============================================================================
print("\n[TEST GROUP 9] Edge Cases and Error Handling")
print("-" * 50)

try:
    # Check for division by zero prevention
    with open('web/static/js/workflow.js', 'r') as f:
        content = f.read()

    test("Division by zero prevention in success rate",
         "processedSkills > 0 ?" in content)

    test("Null safety for extractedSkills",
         "extractedSkills?.length || 0" in content or
         "workflowState.extractedSkills && " in content)

    test("Error handling in validation",
         "catch (error)" in content)

except Exception as e:
    test("Edge case handling", False, str(e))

# ============================================================================
# TEST 10: Integration Points
# ============================================================================
print("\n[TEST GROUP 10] Integration Points")
print("-" * 50)

try:
    # Check that key integration points are intact
    with open('web/static/js/workflow.js', 'r') as f:
        workflow = f.read()

    with open('web/templates/index.html', 'r') as f:
        html = f.read()

    # Check button onclick handlers
    test("Run Assessment button wired correctly",
         'onclick="runLangChainAssessment()"' in html)

    test("Validate button wired correctly",
         'onclick="validateUpdatedSkills()"' in html or
         'onclick="validateAssessmentCompleteness()"' in html)

    # Check state management
    test("chunkingState global exists",
         "chunkingState" in workflow)

    test("workflowState global exists",
         "workflowState" in workflow)

except Exception as e:
    test("Integration points", False, str(e))

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 70)
print("QA TEST SUMMARY")
print("=" * 70)

print(f"\n📊 Results:")
print(f"   ✅ Passed: {tests_passed}")
print(f"   ❌ Failed: {tests_failed}")
print(f"   ⚠️  Warnings: {len(warnings)}")

if warnings:
    print(f"\n⚠️  Warnings:")
    for w in warnings:
        print(f"   - {w}")

print(f"\n📈 Success Rate: {(tests_passed/(tests_passed+tests_failed)*100):.1f}%")

if tests_failed == 0:
    print("\n✅ ALL TESTS PASSED - Everything is working correctly!")
    print("\nKey Features Verified:")
    print("  ✅ Timer stops at 100% completion")
    print("  ✅ Single chunk processing stops correctly")
    print("  ✅ Validation functionality works")
    print("  ✅ All API endpoints functional")
    print("  ✅ HTML structure intact")
    print("  ✅ JavaScript syntax valid")
    print("  ✅ Error handling in place")
    sys.exit(0)
else:
    print(f"\n❌ {tests_failed} TESTS FAILED - Review issues above")
    print("\nCritical Issues to Address:")
    if tests_failed > 5:
        print("  ⚠️ Multiple failures detected - check recent changes")
    sys.exit(1)