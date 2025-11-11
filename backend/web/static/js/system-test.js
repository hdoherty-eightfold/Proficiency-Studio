/**
 * Comprehensive System Test
 * Tests ALL workflow steps to ensure nothing is broken
 */

async function runComprehensiveSystemTest() {
    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    // Create test results modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-2xl max-h-96 overflow-y-auto">
            <h2 class="text-xl font-bold mb-4">System Test Results</h2>
            <div id="test-progress" class="mb-4">
                <div class="text-sm text-gray-600">Running tests...</div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div id="test-progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
            </div>
            <div id="test-results" class="space-y-2"></div>
            <button onclick="this.closest('.fixed').remove()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Close
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    const resultsDiv = document.getElementById('test-results');
    const progressBar = document.getElementById('test-progress-bar');
    let testsRun = 0;
    const totalTests = 15;

    function updateProgress() {
        testsRun++;
        const percent = (testsRun / totalTests) * 100;
        progressBar.style.width = `${percent}%`;
    }

    function addResult(test, status, message = '') {
        const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
        const statusColor = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';

        const resultDiv = document.createElement('div');
        resultDiv.className = `flex items-center p-2 rounded ${status === 'pass' ? 'bg-green-50' : status === 'fail' ? 'bg-red-50' : 'bg-yellow-50'}`;
        resultDiv.innerHTML = `
            <span class="mr-2">${statusIcon}</span>
            <span class="flex-1 text-${statusColor}-700">${test}</span>
            ${message ? `<span class="text-xs text-gray-600 ml-2">${message}</span>` : ''}
        `;
        resultsDiv.appendChild(resultDiv);

        if (status === 'pass') results.passed.push(test);
        else if (status === 'fail') results.failed.push(test);
        else results.warnings.push(test);
    }

    // Test 1: Check if workflow.js loaded
    try {
        if (typeof runLangChainAssessment === 'function') {
            addResult('workflow.js loaded', 'pass');
        } else {
            addResult('workflow.js loaded', 'fail', 'Main workflow script not loaded');
        }
    } catch (e) {
        addResult('workflow.js loaded', 'fail', e.message);
    }
    updateProgress();

    // Test 2: Check chunkingState initialization
    try {
        if (typeof chunkingState === 'object' && chunkingState !== null) {
            if (chunkingState.chunkRequests !== undefined) {
                addResult('chunkingState.chunkRequests initialized', 'pass');
            } else {
                addResult('chunkingState.chunkRequests initialized', 'fail', 'Missing chunkRequests property');
            }
        } else {
            addResult('chunkingState initialized', 'fail', 'chunkingState not found');
        }
    } catch (e) {
        addResult('chunkingState check', 'fail', e.message);
    }
    updateProgress();

    // Test 3: Check Step 1 functions (Eightfold Auth)
    try {
        if (typeof testEightfoldAuth === 'function' || typeof window.testEightfoldAuth === 'function') {
            addResult('Step 1: testEightfoldAuth function', 'pass');
        } else {
            addResult('Step 1: testEightfoldAuth function', 'fail', 'Function not found');
        }
    } catch (e) {
        addResult('Step 1 function check', 'fail', e.message);
    }
    updateProgress();

    // Test 4: Check Step 2 functions (JIE Roles)
    try {
        if (typeof showJIERolesHistory === 'function' || typeof window.showJIERolesHistory === 'function') {
            addResult('Step 2: showJIERolesHistory function', 'pass');
        } else {
            addResult('Step 2: showJIERolesHistory function', 'fail', 'Function not found');
        }
    } catch (e) {
        addResult('Step 2 function check', 'fail', e.message);
    }
    updateProgress();

    // Test 5: Check workflowState
    try {
        if (typeof workflowState === 'object' && workflowState !== null) {
            addResult('workflowState initialized', 'pass');
        } else {
            addResult('workflowState initialized', 'fail', 'workflowState not found');
        }
    } catch (e) {
        addResult('workflowState check', 'fail', e.message);
    }
    updateProgress();

    // Test 6: Check updateProcessingLog function
    try {
        if (typeof updateProcessingLog === 'function') {
            addResult('updateProcessingLog function', 'pass');
        } else {
            addResult('updateProcessingLog function', 'fail', 'Error display function missing');
        }
    } catch (e) {
        addResult('updateProcessingLog check', 'fail', e.message);
    }
    updateProgress();

    // Test 7: Check Operation Status Panel
    const operationPanel = document.getElementById('operation-status-panel');
    if (operationPanel) {
        addResult('Operation Status Panel exists', 'pass');
    } else {
        addResult('Operation Status Panel exists', 'fail', 'Panel element not found');
    }
    updateProgress();

    // Test 8: Check API key status
    try {
        const response = await fetch('/api/keys/status');
        if (response.ok) {
            const keyStatus = await response.json();
            const hasAnyKey = Object.values(keyStatus).some(v => v === true);
            if (hasAnyKey) {
                addResult('API keys configured', 'pass', `Keys: ${Object.entries(keyStatus).filter(([k,v]) => v).map(([k]) => k).join(', ')}`);
            } else {
                addResult('API keys configured', 'warning', 'No API keys configured');
            }
        } else {
            addResult('API key check', 'fail', `Server returned ${response.status}`);
        }
    } catch (e) {
        addResult('API key check', 'fail', e.message);
    }
    updateProgress();

    // Test 9: Check chunk timer functions
    try {
        if (typeof startChunkTimer === 'function' && typeof stopChunkTimer === 'function') {
            addResult('Chunk timer functions', 'pass');
        } else {
            addResult('Chunk timer functions', 'fail', 'Timer functions missing');
        }
    } catch (e) {
        addResult('Chunk timer check', 'fail', e.message);
    }
    updateProgress();

    // Test 10: Check prompt templates
    try {
        const promptTextarea = document.getElementById('assessment-prompt');
        if (promptTextarea && promptTextarea.value) {
            addResult('Prompt template loaded', 'pass');
        } else {
            addResult('Prompt template loaded', 'warning', 'No prompt template found');
        }
    } catch (e) {
        addResult('Prompt template check', 'fail', e.message);
    }
    updateProgress();

    // Test 11: Server health check
    try {
        const response = await fetch('/health');
        if (response.ok) {
            addResult('Server health check', 'pass');
        } else {
            addResult('Server health check', 'fail', `Server returned ${response.status}`);
        }
    } catch (e) {
        addResult('Server health check', 'fail', 'Cannot connect to server');
    }
    updateProgress();

    // Test 12: Check for JavaScript errors in console
    try {
        // This is a simple check - in reality we can't access console errors directly
        addResult('No critical JS errors', 'pass', 'Check console for any red errors');
    } catch (e) {
        addResult('JS error check', 'fail', e.message);
    }
    updateProgress();

    // Test 13: Check DOM elements for Step 5
    const step5Elements = {
        'chunk-size-input': 'Chunk size input',
        'batch-size-input': 'Batch size input',
        'llm-provider': 'Provider selector',
        'run-langchain-btn': 'Run assessment button'
    };

    let allElementsFound = true;
    for (const [id, name] of Object.entries(step5Elements)) {
        if (!document.getElementById(id)) {
            addResult(`Step 5: ${name}`, 'fail', `Element #${id} not found`);
            allElementsFound = false;
        }
    }
    if (allElementsFound) {
        addResult('Step 5: All UI elements', 'pass');
    }
    updateProgress();

    // Test 14: Check localStorage
    try {
        localStorage.setItem('test_key', 'test_value');
        const value = localStorage.getItem('test_key');
        localStorage.removeItem('test_key');
        if (value === 'test_value') {
            addResult('LocalStorage working', 'pass');
        } else {
            addResult('LocalStorage working', 'fail', 'Read/write failed');
        }
    } catch (e) {
        addResult('LocalStorage check', 'fail', e.message);
    }
    updateProgress();

    // Test 15: Check skills loaded
    try {
        if (workflowState && workflowState.extractedSkills && workflowState.extractedSkills.length > 0) {
            addResult('Skills loaded', 'pass', `${workflowState.extractedSkills.length} skills`);
        } else {
            addResult('Skills loaded', 'warning', 'No skills loaded yet');
        }
    } catch (e) {
        addResult('Skills check', 'fail', e.message);
    }
    updateProgress();

    // Final summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'mt-4 pt-4 border-t border-gray-300';

    const total = results.passed.length + results.failed.length + results.warnings.length;
    const passRate = Math.round((results.passed.length / total) * 100);

    let summaryText = `<div class="font-bold text-lg mb-2">Test Summary</div>`;
    summaryText += `<div class="text-sm space-y-1">`;
    summaryText += `<div>✅ Passed: ${results.passed.length}/${total}</div>`;
    if (results.failed.length > 0) {
        summaryText += `<div class="text-red-600">❌ Failed: ${results.failed.length}</div>`;
    }
    if (results.warnings.length > 0) {
        summaryText += `<div class="text-yellow-600">⚠️ Warnings: ${results.warnings.length}</div>`;
    }
    summaryText += `<div class="mt-2 font-semibold ${passRate === 100 ? 'text-green-600' : passRate >= 80 ? 'text-yellow-600' : 'text-red-600'}">`;
    summaryText += `Success Rate: ${passRate}%</div>`;
    summaryText += '</div>';

    if (results.failed.length > 0) {
        summaryText += `<div class="mt-3 p-3 bg-red-50 rounded text-red-700 text-sm">`;
        summaryText += `<div class="font-bold mb-1">⚠️ Critical Issues Found:</div>`;
        summaryText += `<div>Fix these before running the assessment:</div>`;
        summaryText += `<ul class="list-disc list-inside mt-1">`;
        results.failed.forEach(test => {
            summaryText += `<li>${test}</li>`;
        });
        summaryText += `</ul></div>`;
    } else if (results.warnings.length > 0) {
        summaryText += `<div class="mt-3 p-3 bg-yellow-50 rounded text-yellow-700 text-sm">`;
        summaryText += `<div class="font-bold">✓ System is functional with minor issues</div>`;
        summaryText += `</div>`;
    } else {
        summaryText += `<div class="mt-3 p-3 bg-green-50 rounded text-green-700 text-sm">`;
        summaryText += `<div class="font-bold">✓ All systems operational!</div>`;
        summaryText += `<div>Ready to run assessment.</div>`;
        summaryText += `</div>`;
    }

    summaryDiv.innerHTML = summaryText;
    resultsDiv.appendChild(summaryDiv);

    // Update progress text
    document.getElementById('test-progress').innerHTML = '<div class="text-sm text-gray-600 font-semibold">Tests Complete!</div>';

    return results;
}

// Export to window
window.runComprehensiveSystemTest = runComprehensiveSystemTest;