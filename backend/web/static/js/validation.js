// Validation Functions for Request/Response Comparison

// Store all operations for validation
window.operationHistory = [];

// Function to store operation data
function storeOperation(request, response) {
    window.operationHistory.push({
        timestamp: new Date().toISOString(),
        request: request,
        response: response
    });
}

// Validate Updated Skills - Fetch current roles and compare with assessments to verify updates
async function validateUpdatedSkills() {

    // Get the operation status box
    const operationStatusBox = document.getElementById('operation-status');
    if (!operationStatusBox) {
        showNotification('Operation status box not found', 'error');
        return;
    }

    // Clear and initialize the operation status box
    operationStatusBox.innerHTML = `
        <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs">
            <div class="mb-2">🔄 Starting validation of updated skills...</div>
            <div id="validation-log" class="space-y-1 max-h-96 overflow-y-auto"></div>
        </div>
    `;

    const validationLog = document.getElementById('validation-log');

    function addToValidationLog(message, type = 'info') {
        if (validationLog) {
            const entry = document.createElement('div');
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            entry.className = type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : type === 'warning' ? 'text-yellow-400' : 'text-gray-300';
            entry.textContent = `[${timestamp}] ${message}`;
            validationLog.appendChild(entry);
            validationLog.scrollTop = validationLog.scrollHeight;
        }
    }

    try {
        addToValidationLog('=== VALIDATION STARTED ===');

        // Step 1: Get the expected skills from our assessment/update data
        addToValidationLog('Getting expected skill values from update data...');

        // Get the skills we expect to have been updated
        let expectedSkillsMap = new Map();

        // Check if we have LatestSkills.json available (the skills we sent for update)
        const latestSkillsResponse = await fetch('/api/latest-skills');
        if (latestSkillsResponse.ok) {
            const latestSkills = await latestSkillsResponse.json();
            const latestSkillsArray = latestSkills.skills || latestSkills;

            latestSkillsArray.forEach(skill => {
                const skillName = skill.skill || skill.skill_name || skill.name;
                if (skillName) {
                    expectedSkillsMap.set(skillName.toLowerCase().trim(), {
                        name: skillName,
                        proficiency: skill.proficiency,
                        level: skill.level,
                        confidence_score: skill.confidence_score,
                        reasoning: skill.reasoning
                    });
                }
            });

            addToValidationLog(`✅ Loaded ${expectedSkillsMap.size} expected skill values`, 'success');
        } else {
            // Fall back to assessment results if LatestSkills.json not available
            const assessmentData = window.workflowState?.assessmentResults?.skills ||
                                   window.chunkingState?.accumulatedResults || [];

            assessmentData.forEach(skill => {
                const skillName = skill.skill || skill.skill_name || skill.name;
                if (skillName) {
                    expectedSkillsMap.set(skillName.toLowerCase().trim(), skill);
                }
            });

            addToValidationLog(`✅ Using ${expectedSkillsMap.size} skills from assessment data`, 'success');
        }

        // Step 2: Get authentication
        const authToken = window.workflowState?.authToken ||
                         window.workflowState?.eightfoldToken ||
                         sessionStorage.getItem('eightfold_auth_token') ||
                         sessionStorage.getItem('eightfold_token');

        if (!authToken) {
            addToValidationLog('❌ No authentication token found', 'error');
            return;
        }

        // Step 3: Fetch current JIE roles from Eightfold API
        addToValidationLog('Fetching current JIE roles from Eightfold API...');

        const rolesResponse = await fetch('/api/eightfold/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: '/api/v2/JIE/roles',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                },
                body: null,
                base_url: 'https://apiv2.eightfold.ai'
            })
        });

        if (!rolesResponse.ok) {
            throw new Error(`Proxy request failed: ${rolesResponse.status} ${rolesResponse.statusText}`);
        }

        const proxyResult = await rolesResponse.json();

        // Check the actual Eightfold API status code
        if (!proxyResult.success || proxyResult.status_code !== 200) {
            throw new Error(`Eightfold API returned ${proxyResult.status_code}: ${proxyResult.data || 'Unknown error'}`);
        }

        const currentRoles = proxyResult.data?.data || [];

        addToValidationLog(`✅ Retrieved ${currentRoles.length} roles from Eightfold API`, 'success');

        // Step 4: Process each role and compare skills
        addToValidationLog('');
        addToValidationLog('=== VALIDATING UPDATES (GET from Eightfold API) ===');
        addToValidationLog('Checking if skills were actually updated in Eightfold...');

        let totalSkillsProcessed = 0;
        let skillsConfirmedUpdated = 0;
        let skillsNotUpdated = 0;
        let skillsMismatched = 0;
        let skillsNotExpected = 0;

        // Process each role from Eightfold API
        for (const role of currentRoles) {
            if (!role.skillProficiencies || role.skillProficiencies.length === 0) {
                continue; // Skip roles with no skills
            }

            addToValidationLog(`\nRole: "${role.title}" (${role.skillProficiencies.length} skills)`);

            for (const skill of role.skillProficiencies) {
                totalSkillsProcessed++;
                const skillKey = skill.name.toLowerCase().trim();
                const expectedSkill = expectedSkillsMap.get(skillKey);

                // This is the current value in Eightfold (from GET request)
                const currentProf = skill.proficiency;

                if (!expectedSkill) {
                    // Skill exists in Eightfold but wasn't in our update data
                    skillsNotExpected++;
                    if (currentProf === null || currentProf === undefined || currentProf === 3) {
                        addToValidationLog(`  ⏭️ SKIPPED: "${skill.name}" - Not updated (default value: ${currentProf})`, 'info');
                    } else {
                        addToValidationLog(`  ℹ️ EXISTING: "${skill.name}" - Has value ${currentProf} (not in update data)`, 'info');
                    }
                    continue;
                }

                // Compare current value in Eightfold with what we expected to update it to
                const expectedProf = expectedSkill.proficiency;

                if (currentProf === expectedProf) {
                    skillsConfirmedUpdated++;
                    addToValidationLog(`  ✅ CONFIRMED: "${skill.name}" - Successfully updated to ${currentProf}`, 'success');
                } else if (currentProf === null || currentProf === undefined || currentProf === 3) {
                    skillsNotUpdated++;
                    addToValidationLog(`  ❌ NOT UPDATED: "${skill.name}" - Still has default (${currentProf}), expected ${expectedProf}`, 'error');
                } else {
                    skillsMismatched++;
                    addToValidationLog(`  ⚠️ MISMATCH: "${skill.name}" - Current: ${currentProf}, Expected: ${expectedProf}`, 'warning');
                }
            }
        }

        // Step 5: Display summary at the bottom
        addToValidationLog('');
        addToValidationLog('=== VALIDATION SUMMARY ===');
        addToValidationLog(`Total skills checked in Eightfold: ${totalSkillsProcessed}`);
        addToValidationLog(`✅ Confirmed updated: ${skillsConfirmedUpdated}`, 'success');
        addToValidationLog(`❌ Not updated: ${skillsNotUpdated}`, skillsNotUpdated > 0 ? 'error' : 'info');
        addToValidationLog(`⚠️ Mismatched values: ${skillsMismatched}`, skillsMismatched > 0 ? 'warning' : 'info');
        addToValidationLog(`ℹ️ Skills not in update data: ${skillsNotExpected}`, 'info');

        // Calculate percentages
        const skillsWeExpectedToUpdate = skillsConfirmedUpdated + skillsNotUpdated + skillsMismatched;
        const confirmRate = skillsWeExpectedToUpdate > 0 ? ((skillsConfirmedUpdated / skillsWeExpectedToUpdate) * 100).toFixed(1) : 0;
        const failRate = skillsWeExpectedToUpdate > 0 ? ((skillsNotUpdated / skillsWeExpectedToUpdate) * 100).toFixed(1) : 0;
        const mismatchRate = skillsWeExpectedToUpdate > 0 ? ((skillsMismatched / skillsWeExpectedToUpdate) * 100).toFixed(1) : 0;

        addToValidationLog('');
        addToValidationLog(`📊 Confirmation rate: ${confirmRate}% successfully updated`);
        addToValidationLog(`📊 Failure rate: ${failRate}% not updated`);
        addToValidationLog(`📊 Mismatch rate: ${mismatchRate}% have unexpected values`);

        addToValidationLog('');
        addToValidationLog('=== VALIDATION COMPLETE ===');
        addToValidationLog('Validation confirmed by GET request to Eightfold API');

        // Show success notification
        if (skillsNotUpdated === 0 && skillsMismatched === 0) {
            showNotification(`✅ Perfect! All ${skillsConfirmedUpdated} skills confirmed as updated in Eightfold.`, 'success');
        } else if (skillsConfirmedUpdated > skillsNotUpdated) {
            showNotification(`✅ Validation complete. ${skillsConfirmedUpdated} confirmed, ${skillsNotUpdated} not updated.`, 'warning');
        } else {
            showNotification(`❌ Validation shows issues. Only ${skillsConfirmedUpdated} confirmed, ${skillsNotUpdated} not updated.`, 'error');
        }

        // Store validation report for download
        window.lastValidationReport = {
            timestamp: new Date().toISOString(),
            eightfoldApiStatus: '200 OK',
            totalSkillsProcessed: totalSkillsProcessed,
            skillsConfirmedUpdated: skillsConfirmedUpdated,
            skillsNotUpdated: skillsNotUpdated,
            skillsMismatched: skillsMismatched,
            skillsNotExpected: skillsNotExpected,
            confirmationRate: confirmRate,
            failureRate: failRate,
            mismatchRate: mismatchRate,
            totalRoles: currentRoles.length,
            expectedSkillsCount: expectedSkillsMap.size,
            validationMethod: 'GET request to Eightfold API to confirm updates'
        };

    } catch (error) {
        console.error('Validation error:', error);
        addToValidationLog(`❌ ERROR: ${error.message}`, 'error');
        addToValidationLog('=== VALIDATION FAILED ===', 'error');
        showNotification(`Validation failed: ${error.message}`, 'error');
    }
}

// View operation logs
async function viewOperationLogs() {
    try {
        const response = await fetch('/api/operation-logs');
        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }
        
        const data = await response.json();
        const logs = data.logs || [];
        
        // Create a modal to display logs
        const modalHTML = `
            <div id="logs-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
                    <div class="p-6 border-b dark:border-gray-700">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold">Operation Logs</h2>
                            <button onclick="document.getElementById('logs-modal').remove()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6 overflow-y-auto max-h-[60vh]">
                        <div class="space-y-3">
                            ${logs.map(log => `
                                <div class="border dark:border-gray-700 rounded p-3">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <span class="font-semibold">${log.operation_type}</span>
                                            <div class="text-sm text-gray-600">${new Date(log.timestamp).toLocaleString()}</div>
                                        </div>
                                        <button onclick="downloadOperationLog('${log.operation_id}')" class="text-blue-600 hover:text-blue-800">
                                            <i class="fas fa-download"></i>
                                        </button>
                                    </div>
                                    ${log.summary ? `
                                        <div class="text-sm space-y-1">
                                            <div>Total Roles: ${log.summary.total_roles || 0}</div>
                                            <div>Successful: ${log.summary.successful_updates || 0}</div>
                                            <div>Failed: ${log.summary.failed_updates || 0}</div>
                                            <div>Success Rate: ${log.summary.success_rate?.toFixed(1) || 0}%</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('Error fetching logs:', error);
        showNotification('Failed to fetch operation logs', 'error');
    }
}

// Download specific operation log
async function downloadOperationLog(operationId) {
    try {
        const response = await fetch(`/api/operation-logs/${operationId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch log');
        }
        
        const logData = await response.json();
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `operation_${operationId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error downloading log:', error);
        showNotification('Failed to download log', 'error');
    }
}

// Download validation report
function downloadValidationReport() {
    if (!window.lastValidationReport) {
        showNotification('No validation report available. Run validation first.', 'warning');
        return;
    }
    
    const blob = new Blob([JSON.stringify(window.lastValidationReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Validation report downloaded', 'success');
}

// Export functions
window.validateUpdatedSkills = validateUpdatedSkills;
window.validateAllOperations = validateUpdatedSkills; // Backward compatibility
window.viewOperationLogs = viewOperationLogs;
window.downloadOperationLog = downloadOperationLog;
window.downloadValidationReport = downloadValidationReport;