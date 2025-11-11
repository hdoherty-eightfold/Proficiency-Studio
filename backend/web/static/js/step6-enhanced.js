// Enhanced Step 6 Operations with Full API Logging

// Global storage for all API transactions
window.step6ApiTransactions = [];

// Create or get the API details modal
function getOrCreateApiDetailsModal() {
    let modal = document.getElementById('api-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'api-details-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden z-50 overflow-y-auto';
        modal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div class="flex justify-between items-center p-4 border-b dark:border-gray-700">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Complete API Transaction Log</h3>
                        <button onclick="closeApiDetailsModal()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="p-4 overflow-y-auto" style="max-height: calc(90vh - 120px);">
                        <div id="api-details-content" class="space-y-4">
                            <!-- Transaction details will be inserted here -->
                        </div>
                    </div>
                    <div class="flex justify-end p-4 border-t dark:border-gray-700">
                        <button onclick="exportApiLogs()" class="mr-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Export Logs
                        </button>
                        <button onclick="clearApiLogs()" class="mr-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Clear Logs
                        </button>
                        <button onclick="closeApiDetailsModal()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

// Function to show API details modal
function showApiDetailsModal() {
    const modal = getOrCreateApiDetailsModal();
    const content = document.getElementById('api-details-content');
    
    if (window.step6ApiTransactions.length === 0) {
        content.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No API transactions recorded yet.</p>';
    } else {
        content.innerHTML = window.step6ApiTransactions.map((transaction, index) => `
            <div class="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-gray-900 dark:text-white">
                        Transaction #${index + 1}: ${transaction.operation}
                    </h4>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${transaction.timestamp}</span>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <!-- Request Section -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <h5 class="font-medium text-gray-700 dark:text-gray-300">📤 Request:</h5>
                            <div class="flex gap-2">
                                <button onclick="copyTransactionData(${index}, 'request')" class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                                    <i class="fas fa-copy mr-1"></i>Copy
                                </button>
                                <button onclick="downloadTransactionData(${index}, 'request')" class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                                    <i class="fas fa-download mr-1"></i>Download
                                </button>
                            </div>
                        </div>
                        <div class="bg-gray-900 rounded p-3 overflow-x-auto">
                            <pre id="request-${index}" class="text-xs text-green-400 font-mono">${JSON.stringify(transaction.request, null, 2)}</pre>
                        </div>
                        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <p>Method: ${transaction.method}</p>
                            <p>URL: ${transaction.url}</p>
                            <p>Headers: ${JSON.stringify(transaction.headers)}</p>
                        </div>
                    </div>
                    
                    <!-- Response Section -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <h5 class="font-medium text-gray-700 dark:text-gray-300">📥 Response:</h5>
                            <div class="flex gap-2">
                                <button onclick="copyTransactionData(${index}, 'response')" class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                                    <i class="fas fa-copy mr-1"></i>Copy
                                </button>
                                <button onclick="downloadTransactionData(${index}, 'response')" class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                                    <i class="fas fa-download mr-1"></i>Download
                                </button>
                            </div>
                        </div>
                        <div class="bg-gray-900 rounded p-3 overflow-x-auto">
                            <pre id="response-${index}" class="text-xs ${transaction.success ? 'text-green-400' : 'text-red-400'} font-mono">${JSON.stringify(transaction.response, null, 2)}</pre>
                        </div>
                        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <p>Status: ${transaction.status} ${transaction.statusText}</p>
                            <p>Duration: ${transaction.duration}ms</p>
                            <p>Success: ${transaction.success ? '✅' : '❌'}</p>
                        </div>
                    </div>
                </div>
                
                ${transaction.error ? `
                    <div class="mt-3 p-2 bg-red-100 dark:bg-red-900 rounded">
                        <p class="text-sm text-red-700 dark:text-red-300">Error: ${transaction.error}</p>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    modal.classList.remove('hidden');
}

// Function to close API details modal
function closeApiDetailsModal() {
    const modal = document.getElementById('api-details-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Function to export API logs
function exportApiLogs() {
    const dataStr = JSON.stringify(window.step6ApiTransactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `api-logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Function to clear API logs
function clearApiLogs() {
    if (confirm('Are you sure you want to clear all API logs?')) {
        window.step6ApiTransactions = [];
        showApiDetailsModal(); // Refresh the modal
    }
}

// Function to normalize skill names for case-insensitive matching
function normalizeSkillName(skillName) {
    if (!skillName) return '';
    
    // Convert to lowercase
    let normalized = skillName.toLowerCase();
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Remove special characters except alphanumeric, spaces, and hyphens
    normalized = normalized.replace(/[^\w\s\-]/g, '');
    
    // Trim whitespace
    normalized = normalized.trim();
    
    return normalized;
}

// Enhanced update roles function with comprehensive logging
async function updateRolesToSourceEnhanced() {
    // Starting enhanced updateRolesToSource
    
    // Clear previous transactions
    window.step6ApiTransactions = [];
    
    // Check if we have required data
    if (!window.workflowState) {
        showNotification('Workflow state not initialized.', 'error');
        return;
    }

    if (!window.workflowState.assessmentResults) {
        showNotification('No assessment results available. Please run assessment first (Step 5).', 'error');
        return;
    }

    // Try to get roles from JIE roles or from assessment results (if loaded from file)
    let roles = window.workflowState.jieRoles || [];

    // If no JIE roles but we have assessment results with roles, use those
    if ((!roles || roles.length === 0) && window.workflowState.assessmentResults?.roles) {
        roles = window.workflowState.assessmentResults.roles;
        console.log('Using roles from loaded assessment instead of fetching from API');
    }

    if (!roles || roles.length === 0) {
        showNotification('No roles available. Please either fetch JIE roles (Step 2) or load an assessment with role data.', 'error');
        return;
    }

    const assessmentResults = window.workflowState.assessmentResults;
    
    // Build proficiency map from assessment results
    const proficiencyMap = {};
    const normalizedProficiencyMap = {};  // Add normalized map for case-insensitive matching
    
    // Handle different assessment result formats
    // The assessment results should have skills with both proficiency (numeric) and level (text)
    if (assessmentResults.skills && assessmentResults.skills.length > 0) {
        // Processing assessment skills
        assessmentResults.skills.forEach(skill => {
            const skillName = skill.skill || skill.skill_name || skill.name;
            
            // Get numeric proficiency - this should already be numeric from the LLM
            let profValue = skill.proficiency;
            
            // If for some reason we only have the text level, convert it
            if (!profValue && skill.level) {
                const textToNum = {
                    'Novice': 1,
                    'Developing': 2,
                    'Intermediate': 3,
                    'Advanced': 4,
                    'Expert': 5
                };
                profValue = textToNum[skill.level] || 3;
            } else if (typeof profValue === 'string') {
                // Handle case where proficiency is a string number
                profValue = parseInt(profValue);
            }
            
            // Ensure it's a valid number between 1-5
            profValue = Math.max(1, Math.min(5, parseInt(profValue) || 3));
            
            proficiencyMap[skillName] = profValue;
            
            // Also add to normalized map for case-insensitive matching
            const normalizedName = normalizeSkillName(skillName);
            normalizedProficiencyMap[normalizedName] = profValue;
        });
    } else {
        console.error('No skills found in assessment results!');
        showNotification('No skills found in assessment results. Please run assessment first.', 'error');
        return;
    }
    
    // Proficiency map built
    
    // Get the correct environment name
    const envSelect = document.getElementById('step6-environment');
    const environment = envSelect?.options[envSelect.selectedIndex]?.text || envSelect?.value || 'unknown';
    
    // Get operation status container
    const statusContainer = document.getElementById('operation-status');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs">
                <div class="mb-2">🔄 Starting role update operation...</div>
                <div id="operation-log" class="space-y-1 max-h-96 overflow-y-auto"></div>
            </div>
        `;
    }
    
    const operationLog = document.getElementById('operation-log');
    
    function addToOperationLog(message, type = 'info') {
        if (operationLog) {
            const entry = document.createElement('div');
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            entry.className = type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : 'text-gray-300';
            entry.textContent = `[${timestamp}] ${message}`;
            operationLog.appendChild(entry);
            operationLog.scrollTop = operationLog.scrollHeight;
        }
    }
    
    // Add button to view full details
    const viewDetailsBtn = document.createElement('button');
    viewDetailsBtn.className = 'mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700';
    viewDetailsBtn.textContent = 'View Full API Details';
    viewDetailsBtn.onclick = showApiDetailsModal;
    statusContainer.appendChild(viewDetailsBtn);
    
    // Start logging
    addToOperationLog('=== ROLE UPDATE OPERATION STARTED ===');
    addToOperationLog(`Environment: ${environment}`);
    addToOperationLog(`Total roles available: ${roles.length}`);
    addToOperationLog(`Total unique skills assessed: ${Object.keys(proficiencyMap).length}`);
    
    // Count roles with/without skills
    const rolesWithSkills = roles.filter(r => r.skillProficiencies && r.skillProficiencies.length > 0).length;
    const rolesWithoutSkills = roles.length - rolesWithSkills;
    addToOperationLog(`Roles with skills: ${rolesWithSkills}`);
    addToOperationLog(`Roles without skills: ${rolesWithoutSkills} (will be skipped)`);
    
    // Process each role
    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const roleNum = i + 1;
        
        if (!role.skillProficiencies || role.skillProficiencies.length === 0) {
            skippedCount++;
            addToOperationLog(`[${roleNum}/${roles.length}] SKIPPED: "${role.title}" (no skills)`, 'info');
            continue;
        }
        
        // Check for authentication first before processing
        const authToken = window.workflowState?.authToken || sessionStorage.getItem('eightfold_auth_token');
        if (!authToken) {
            addToOperationLog(`[${roleNum}/${roles.length}] SKIPPED: "${role.title}" - No authentication token available`, 'error');
            failCount++;
            continue;
        }
        
        addToOperationLog(`[${roleNum}/${roles.length}] 🔄 Processing: "${role.title}"`);
        
        // Build updated skills array by merging role skills with LLM proficiencies
        let changedSkills = 0;
        let matchedSkills = 0;
        const updatedSkills = role.skillProficiencies.map(skill => {
            const skillName = skill.name;
            const oldProficiency = skill.proficiency;
            
            // Try exact match first
            let newProficiency = proficiencyMap[skillName];
            
            // If no exact match, try normalized case-insensitive match
            if (newProficiency === undefined) {
                const normalizedName = normalizeSkillName(skillName);
                newProficiency = normalizedProficiencyMap[normalizedName];
            }
            
            if (newProficiency !== undefined) {
                matchedSkills++;
                if (newProficiency !== oldProficiency) {
                    changedSkills++;
                }
            }
            
            // Merge: Use LLM proficiency if available, otherwise keep original
            // Only send fields that should be updatable
            return {
                name: skillName,  // Keep original name
                proficiency: newProficiency !== undefined ? newProficiency : (oldProficiency || 3)
                // Remove skillGroupList which might be read-only
            };
        });
        
        // Log what we're attempting to do (not what was done)
        addToOperationLog(`  Skills: ${role.skillProficiencies.length} total, ${matchedSkills} matched from LLM, ${changedSkills} to be updated`);
        
        // Prepare update payload - include all fields that Eightfold API expects
        const updatePayload = {
            title: role.title,  // Required field
            skillProficiencies: updatedSkills,
            roleDescription: role.roleDescription || "",  // Include existing description or empty string
            archivalStatus: role.archivalStatus || false  // Include existing status or default to false
        };
        
        // Prepare request body
        const requestBody = {
            role: updatePayload,
            environment: environment
        };
        
        // Update the request monitor to show what we're sending
        const requestMonitor = document.getElementById('step6-request-json');
        if (requestMonitor) {
            requestMonitor.textContent = JSON.stringify({
                operation: 'update-role',
                role_index: roleNum,
                total_roles: roles.length,
                role_id: role.id,
                role_title: role.title,
                total_skills: updatedSkills.length,
                matched_from_llm: matchedSkills,
                changed_skills: changedSkills,
                environment: environment,
                payload: updatePayload
            }, null, 2);
        }
        
        // Get the API base URL (all environments use the same URL)
        const apiBaseUrl = 'https://apiv2.eightfold.ai';
        
        const apiUrl = `${apiBaseUrl}/api/v2/JIE/roles/${role.id}`;
        
        // Log the transaction
        const transaction = {
            operation: `Update Role #${roleNum}`,
            timestamp: new Date().toISOString(),
            method: 'PUT',
            url: apiUrl,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            request: updatePayload,
            roleTitle: role.title,
            roleId: role.id,
            totalSkills: updatedSkills.length,
            matchedFromLLM: matchedSkills,
            changedSkills: changedSkills
        };
        
        const startTime = Date.now();
        
        try {
            // Use proxy to avoid CORS issues
            const proxyRequest = {
                endpoint: `/api/v2/JIE/roles/${role.id}`,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: updatePayload,
                base_url: apiBaseUrl
            };
            
            const response = await fetch('/api/eightfold/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(proxyRequest)
            });
            
            const duration = Date.now() - startTime;
            processedCount++;
            
            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                responseData = await response.text();
            }
            
            // Check the actual Eightfold API response status inside the proxy response
            const actualApiSuccess = response.ok && responseData?.success === true &&
                                    responseData?.status_code && responseData.status_code >= 200 &&
                                    responseData.status_code < 300;

            transaction.response = responseData;
            transaction.status = responseData?.status_code || response.status;
            transaction.statusText = responseData?.statusText || response.statusText;
            transaction.duration = duration;
            transaction.success = actualApiSuccess;

            if (actualApiSuccess) {
                successCount++;
                const statusCode = responseData?.status_code || response.status;
                addToOperationLog(`  ✅ SUCCESS [${statusCode}] in ${duration}ms (${changedSkills} skill proficiencies updated)`, 'success');
                
                // Update response monitor
                const responseMonitor = document.getElementById('step6-response-json');
                if (responseMonitor) {
                    responseMonitor.textContent = JSON.stringify({
                        operation: 'update-role',
                        status: 'completed',
                        role_index: roleNum,
                        total_roles: roles.length,
                        role_title: role.title,
                        successful: true,
                        duration_ms: duration,
                        environment: environment,
                        response: responseData,
                        timestamp: new Date().toISOString()
                    }, null, 2);
                }
            } else {
                failCount++;
                const statusCode = responseData?.status_code || response.status;
                const errorMessage = responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`;
                transaction.error = errorMessage;
                addToOperationLog(`  ❌ FAILED [${statusCode}]: ${errorMessage} (0 skills updated)`, 'error');
                
                // Update response monitor with error
                const responseMonitor = document.getElementById('step6-response-json');
                if (responseMonitor) {
                    responseMonitor.textContent = JSON.stringify({
                        operation: 'update-role',
                        status: 'failed',
                        role_index: roleNum,
                        total_roles: roles.length,
                        role_title: role.title,
                        successful: false,
                        error: transaction.error,
                        response: responseData,
                        timestamp: new Date().toISOString()
                    }, null, 2);
                }
            }
            
        } catch (error) {
            failCount++;
            processedCount++;
            transaction.error = error.message;
            transaction.success = false;
            addToOperationLog(`  ❌ UPDATE ERROR: ${error.message} (0 skills updated)`, 'error');
        }
        
        // Store the transaction
        window.step6ApiTransactions.push(transaction);
        
        // Update progress with running counts
        const totalToProcess = roles.length - skippedCount || 1; // Avoid division by zero
        const progressPercent = Math.round((processedCount / totalToProcess) * 100);
        addToOperationLog(`Progress: ${progressPercent}% (${processedCount}/${totalToProcess}) | ✅ ${successCount} success | ❌ ${failCount} failed | ⏭️ ${skippedCount} skipped`, 'info');

        // Update the progress UI elements
        const progressPercentEl = document.getElementById('step6-progress-percent');
        const progressBarEl = document.getElementById('step6-progress-bar');
        if (progressPercentEl) {
            progressPercentEl.textContent = `${progressPercent}%`;
        }
        if (progressBarEl) {
            progressBarEl.style.width = `${progressPercent}%`;
        }
    }
    
    // Final summary
    addToOperationLog('');
    addToOperationLog('=== OPERATION COMPLETE ===');
    addToOperationLog(`Total Roles: ${roles.length}`);
    addToOperationLog(`✅ Successfully Updated: ${successCount}`);
    addToOperationLog(`❌ Failed: ${failCount}`);
    addToOperationLog(`⏭️ Skipped (no skills): ${skippedCount}`);
    addToOperationLog(`📊 Total Processed: ${processedCount} (${successCount + failCount})`);
    addToOperationLog(`📈 Coverage: ${Math.round(((successCount + failCount) / roles.length) * 100)}% of all roles`);

    // Update progress to 100% when complete
    const progressPercentEl = document.getElementById('step6-progress-percent');
    const progressBarEl = document.getElementById('step6-progress-bar');
    if (progressPercentEl) {
        progressPercentEl.textContent = '100%';
    }
    if (progressBarEl) {
        progressBarEl.style.width = '100%';
    }

    // Update operation status header to show completion
    const operationStatusContainer = document.getElementById('operation-status');
    if (operationStatusContainer) {
        const statusHeader = operationStatusContainer.querySelector('div:first-child > div:first-child');
        if (statusHeader) {
            statusHeader.innerHTML = '✅ Operation completed successfully!';
            statusHeader.className = 'mb-2 text-green-400 font-bold';
        }
    }

    // Update Step 6 indicator to green (completed)
    if (typeof updateWorkflowStep === 'function') {
        updateWorkflowStep(6, 'completed', 'Role updates completed successfully');
    }

    // Show notification
    if (failCount === 0) {
        showNotification(`Successfully updated ${successCount} roles!`, 'success');
    } else {
        showNotification(`Updated ${successCount} roles, ${failCount} failed. Check logs for details.`, 'warning');
    }
    
    // Highlight the view details button
    viewDetailsBtn.classList.add('animate-pulse');
    setTimeout(() => viewDetailsBtn.classList.remove('animate-pulse'), 3000);
}

// Replace the original function
window.updateRolesToSource = updateRolesToSourceEnhanced;

// Clear operation status logs and reset progress
window.clearOperationStatus = function() {
    // Clear the operation log
    const operationLog = document.getElementById('operation-log');
    if (operationLog) {
        operationLog.innerHTML = '<div class="text-gray-500">Logs cleared. Ready for new operation.</div>';
    }

    // Reset progress bar to 0%
    const progressPercentEl = document.getElementById('step6-progress-percent');
    const progressBarEl = document.getElementById('step6-progress-bar');
    if (progressPercentEl) {
        progressPercentEl.textContent = '0%';
    }
    if (progressBarEl) {
        progressBarEl.style.width = '0%';
    }

    // Clear request and response monitors
    const requestMonitor = document.getElementById('step6-request-json');
    if (requestMonitor) {
        requestMonitor.textContent = '// Request will appear here when operation starts';
    }

    const responseMonitor = document.getElementById('step6-response-json');
    if (responseMonitor) {
        responseMonitor.textContent = '// No response received yet';
    }

    // Clear the transaction history (but keep a backup if needed)
    if (window.step6ApiTransactions && window.step6ApiTransactions.length > 0) {
        window.step6ApiTransactionsBackup = [...window.step6ApiTransactions];
        window.step6ApiTransactions = [];
    }

    showNotification('Operation logs cleared. Ready for new update operation.', 'info');
};

// Copy transaction data to clipboard
function copyTransactionData(index, type) {
    const transaction = window.step6ApiTransactions[index];
    if (!transaction) return;
    
    const data = type === 'request' ? transaction.request : transaction.response;
    const jsonString = JSON.stringify(data, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`, 'success');
    }).catch(err => {
        showNotification('Failed to copy to clipboard', 'error');
    });
}

// Download transaction data as JSON file
function downloadTransactionData(index, type) {
    const transaction = window.step6ApiTransactions[index];
    if (!transaction) return;
    
    const data = type === 'request' ? transaction.request : transaction.response;
    const jsonString = JSON.stringify(data, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${transaction.operation}_${type}_${timestamp}.json`;
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} downloaded as ${filename}`, 'success');
}

// Export functions to window
window.copyTransactionData = copyTransactionData;
window.downloadTransactionData = downloadTransactionData;