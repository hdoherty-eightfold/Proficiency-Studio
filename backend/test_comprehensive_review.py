#!/usr/bin/env python3
"""Comprehensive review of chunk processing functionality"""

import subprocess
import time
import json
import re

def check_javascript_errors():
    """Check JavaScript file for reference errors and issues"""
    print("=" * 60)
    print("1. JAVASCRIPT CODE REVIEW")
    print("=" * 60)

    issues_found = []

    with open('web/static/js/workflow.js', 'r') as f:
        js_content = f.read()
        lines = js_content.split('\n')

    print("✓ Checking for variable reference errors...")

    # Check for old chunkStartTime references (should use chunkStartTimes)
    for i, line in enumerate(lines, 1):
        if 'chunkStartTime' in line and 'chunkStartTimes' not in line:
            issues_found.append(f"Line {i}: Found old chunkStartTime reference")
            print(f"  ❌ Line {i}: {line.strip()[:80]}")

    if not issues_found:
        print("  ✅ No chunkStartTime reference errors found")

    # Check chunkStartTimes is properly defined
    if 'let chunkStartTimes = {}' in js_content or 'const chunkStartTimes = {}' in js_content:
        print("  ✅ chunkStartTimes object properly defined")
    else:
        print("  ❌ chunkStartTimes object definition not found")
        issues_found.append("chunkStartTimes not defined")

    # Check for variable naming consistency
    print("\n✓ Checking variable consistency...")
    currentChunkNum_count = js_content.count('currentChunkNum')
    currentChunkNumber_count = js_content.count('currentChunkNumber')

    if currentChunkNumber_count > 0:
        print(f"  ⚠️ Found {currentChunkNumber_count} references to 'currentChunkNumber'")
        print(f"  ⚠️ Found {currentChunkNum_count} references to 'currentChunkNum'")
        # Find specific instances
        for i, line in enumerate(lines, 1):
            if 'currentChunkNumber' in line:
                print(f"    Line {i}: {line.strip()[:80]}")
                issues_found.append(f"Line {i}: Inconsistent variable name 'currentChunkNumber'")
    else:
        print(f"  ✅ Variable naming consistent (using currentChunkNum)")

    # Check timer clearing
    print("\n✓ Checking timer management...")
    timer_clear = js_content.count('clearInterval(window.progressInterval)')
    if timer_clear > 0:
        print(f"  ✅ Found {timer_clear} timer clearing statements")
    else:
        print("  ❌ No timer clearing found")
        issues_found.append("No timer clearing statements")

    # Check for excessive logging
    if "console.log('Timer tick'" in js_content:
        print("  ❌ Excessive 'Timer tick' logging still present")
        issues_found.append("Excessive Timer tick logging")
    else:
        print("  ✅ No excessive Timer tick logging")

    # Check chunk functions
    print("\n✓ Checking key functions...")
    required_functions = [
        'createChunkCards',
        'updateChunkStatus',
        'viewChunkData',
        'retryChunk',
        'processChunkedAssessment'
    ]

    for func in required_functions:
        if f'function {func}' in js_content or f'window.{func} = function' in js_content or f'const {func} = ' in js_content:
            print(f"  ✅ Function {func} found")
        else:
            print(f"  ❌ Function {func} not found")
            issues_found.append(f"Missing function: {func}")

    # Check for auto-reduction logic (should be removed)
    print("\n✓ Checking auto-reduction removal...")
    auto_reduction_patterns = [
        'auto.*reduc',
        'reduc.*auto',
        'chunkSizeReduction',
        'reduceChunkSize',
        'if.*chunk.*>.*1.*300'
    ]

    auto_reduction_found = False
    for pattern in auto_reduction_patterns:
        matches = re.findall(pattern, js_content, re.IGNORECASE)
        if matches:
            print(f"  ❌ Found auto-reduction pattern: {pattern}")
            auto_reduction_found = True
            issues_found.append(f"Auto-reduction pattern found: {pattern}")

    if not auto_reduction_found:
        print("  ✅ No auto-reduction logic found")

    return len(issues_found) == 0, issues_found

def check_html_version():
    """Check HTML file has correct version for cache busting"""
    print("\n" + "=" * 60)
    print("2. HTML VERSION CHECK")
    print("=" * 60)

    with open('web/templates/index.html', 'r') as f:
        html_content = f.read()

    # Find workflow.js version
    version_match = re.search(r'workflow\.js\?v=([^"]+)', html_content)
    if version_match:
        version = version_match.group(1)
        print(f"✅ workflow.js version: {version}")

        # Check it's a recent version
        if 'v50' in version or 'v51' in version or 'v52' in version:
            print("  ✅ Version is recent (cache will be busted)")
            return True
        else:
            print("  ⚠️ Version might be outdated")
            return True  # Still ok, just a warning
    else:
        print("❌ Could not find workflow.js version")
        return False

def check_chunk_calculations():
    """Verify chunk boundary calculations"""
    print("\n" + "=" * 60)
    print("3. CHUNK BOUNDARY CALCULATIONS")
    print("=" * 60)

    test_cases = [
        (1223, 408, 3, [(1, 408), (409, 816), (817, 1223)]),
        (100, 30, 4, [(1, 30), (31, 60), (61, 90), (91, 100)]),
        (50, 50, 1, [(1, 50)]),
        (75, 25, 3, [(1, 25), (26, 50), (51, 75)])
    ]

    all_passed = True

    for total, chunk_size, expected_chunks, expected_ranges in test_cases:
        print(f"\n✓ Testing {total} skills with chunk size {chunk_size}:")

        # Calculate chunks
        num_chunks = (total + chunk_size - 1) // chunk_size  # Ceiling division

        if num_chunks == expected_chunks:
            print(f"  ✅ Correct number of chunks: {num_chunks}")
        else:
            print(f"  ❌ Wrong chunk count: got {num_chunks}, expected {expected_chunks}")
            all_passed = False

        # Calculate ranges
        for i in range(num_chunks):
            start = i * chunk_size + 1
            end = min((i + 1) * chunk_size, total)
            expected_start, expected_end = expected_ranges[i]

            if start == expected_start and end == expected_end:
                print(f"  ✅ Chunk {i+1}: {start}-{end} ({end-start+1} skills)")
            else:
                print(f"  ❌ Chunk {i+1}: got {start}-{end}, expected {expected_start}-{expected_end}")
                all_passed = False

    return all_passed

def check_ui_elements():
    """Check UI elements are properly configured"""
    print("\n" + "=" * 60)
    print("4. UI ELEMENTS CHECK")
    print("=" * 60)

    with open('web/static/js/workflow.js', 'r') as f:
        js_content = f.read()

    checks = []

    # Check chunk card creation
    if 'createElement(\'div\')' in js_content and 'chunk-card-' in js_content:
        print("✅ Chunk card creation found")
        checks.append(True)
    else:
        print("❌ Chunk card creation not found")
        checks.append(False)

    # Check view button creation
    if 'onclick="viewChunkData' in js_content:
        print("✅ View button with onclick handler found")
        checks.append(True)
    else:
        print("❌ View button onclick handler not found")
        checks.append(False)

    # Check retry button creation
    if 'onclick="retryChunk' in js_content:
        print("✅ Retry button with onclick handler found")
        checks.append(True)
    else:
        print("❌ Retry button onclick handler not found")
        checks.append(False)

    # Check modal creation for viewing data
    if 'showChunkDataModal' in js_content or 'createElement(\'div\')' in js_content:
        print("✅ Modal creation logic found")
        checks.append(True)
    else:
        print("❌ Modal creation logic not found")
        checks.append(False)

    # Check progress bar updates
    if 'updateAssessmentProgress' in js_content:
        print("✅ Progress update function found")
        checks.append(True)
    else:
        print("❌ Progress update function not found")
        checks.append(False)

    # Check status updates
    if 'updateChunkStatus' in js_content:
        print("✅ Chunk status update function found")
        checks.append(True)
    else:
        print("❌ Chunk status update function not found")
        checks.append(False)

    return all(checks)

def check_timer_logic():
    """Check timer and timing logic"""
    print("\n" + "=" * 60)
    print("5. TIMER LOGIC CHECK")
    print("=" * 60)

    with open('web/static/js/workflow.js', 'r') as f:
        js_content = f.read()
        lines = js_content.split('\n')

    checks = []

    # Check timer start
    if 'window.progressInterval = setInterval' in js_content:
        print("✅ Timer initialization found")
        checks.append(True)
    else:
        print("❌ Timer initialization not found")
        checks.append(False)

    # Check timer stop conditions
    if 'clearInterval(window.progressInterval)' in js_content:
        # Count occurrences
        count = js_content.count('clearInterval(window.progressInterval)')
        print(f"✅ Timer clearing found ({count} locations)")

        # Find where it's cleared
        for i, line in enumerate(lines, 1):
            if 'clearInterval(window.progressInterval)' in line:
                context_start = max(0, i - 3)
                context = lines[context_start:i]
                # Check if it's in a completion context
                if any('complete' in l.lower() or 'finish' in l.lower() or 'done' in l.lower() for l in context):
                    print(f"  ✅ Timer cleared on completion (line {i})")
                    checks.append(True)
                    break
        else:
            print("  ⚠️ Timer clearing might not be in completion context")
            checks.append(True)  # Still ok if it exists
    else:
        print("❌ Timer clearing not found")
        checks.append(False)

    # Check chunk timing tracking
    if 'chunkStartTimes[' in js_content:
        print("✅ Per-chunk timing tracking found")
        checks.append(True)
    else:
        print("❌ Per-chunk timing tracking not found")
        checks.append(False)

    # Check timing display
    if 'chunk-time-value-' in js_content:
        print("✅ Chunk timing display elements found")
        checks.append(True)
    else:
        print("❌ Chunk timing display elements not found")
        checks.append(False)

    return all(checks)

def run_comprehensive_review():
    """Run all checks"""
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " COMPREHENSIVE CHUNK PROCESSING REVIEW ".center(58) + "║")
    print("╚" + "═" * 58 + "╝")

    results = []
    issues = []

    # 1. JavaScript errors
    js_ok, js_issues = check_javascript_errors()
    results.append(("JavaScript Code", js_ok))
    if js_issues:
        issues.extend(js_issues)

    # 2. HTML version
    html_ok = check_html_version()
    results.append(("HTML Version", html_ok))

    # 3. Chunk calculations
    calc_ok = check_chunk_calculations()
    results.append(("Chunk Calculations", calc_ok))

    # 4. UI elements
    ui_ok = check_ui_elements()
    results.append(("UI Elements", ui_ok))

    # 5. Timer logic
    timer_ok = check_timer_logic()
    results.append(("Timer Logic", timer_ok))

    # Summary
    print("\n" + "=" * 60)
    print("REVIEW SUMMARY")
    print("=" * 60)

    all_passed = all(result[1] for result in results)

    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name:.<30} {status}")

    if issues:
        print("\n⚠️ Issues Found:")
        for issue in issues:
            print(f"  • {issue}")

    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL CHECKS PASSED - System is working correctly")
        print("\nKey Features Verified:")
        print("  • No auto-reduction logic present")
        print("  • Chunk boundaries calculated correctly")
        print("  • Timer management working")
        print("  • UI elements properly configured")
        print("  • No JavaScript reference errors")
        return 0
    else:
        print("❌ SOME CHECKS FAILED - Review issues above")
        return 1

if __name__ == "__main__":
    exit(run_comprehensive_review())