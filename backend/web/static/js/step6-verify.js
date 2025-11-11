// Step 6 Verification - Check if updates were actually persisted

// Helper function to get the correct Eightfold API base URL
function getEightfoldApiUrl(environment) {
    // All environments use the same API URL
    // Sandbox vs production is determined by credentials, not URL
    return 'https://apiv2.eightfold.ai';
}

async function verifyRoleUpdates() {
    
    // Get the environment
    const envSelect = document.getElementById('step6-environment');
    const environment = envSelect?.value || 'unknown';
    
    // Show verification status
    const statusContainer = document.getElementById('operation-status');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="bg-gray-900 text-blue-400 p-4 rounded-lg font-mono text-xs">
                <div class="mb-2">🔍 Verifying role updates...</div>
                <div id="verification-log" class="space-y-1 max-h-96 overflow-y-auto"></div>
            </div>
        `;
    }
    
    const verificationLog = document.getElementById('verification-log');
    
    function addToVerificationLog(message, type = 'info') {
        if (verificationLog) {
            const entry = document.createElement('div');
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            entry.className = type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : type === 'warning' ? 'text-yellow-400' : 'text-gray-300';
            entry.textContent = `[${timestamp}] ${message}`;
            verificationLog.appendChild(entry);
            verificationLog.scrollTop = verificationLog.scrollHeight;
        }
    }
    
    try {
        addToVerificationLog('=== VERIFICATION STARTED ===');
        addToVerificationLog(`Environment: ${environment}`);
        addToVerificationLog('Fetching current roles from Eightfold API...');
        
        // Get auth token from workflow state or session storage
        const authToken = window.workflowState?.authToken || sessionStorage.getItem('eightfold_auth_token');
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        
        // Use proxy to avoid CORS issues
        const apiBaseUrl = getEightfoldApiUrl(environment);
        
        const proxyRequest = {
            endpoint: '/api/v2/JIE/roles?limit=100',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            base_url: apiBaseUrl
        };
        
        const response = await fetch('/api/eightfold/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyRequest)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch roles: ${response.status}`);
        }
        
        const result = await response.json();
        const roles = result.data || [];
        
        addToVerificationLog(`✅ Fetched ${roles.length} roles from API`);
        
        // Check if we have previous role data to compare
        if (!window.workflowState || !window.workflowState.jieRoles) {
            addToVerificationLog('⚠️ No previous role data to compare against', 'warning');
            addToVerificationLog('Cannot verify if updates were applied');
            return;
        }
        
        const originalRoles = window.workflowState.jieRoles;
        const assessmentResults = window.workflowState.assessmentResults;
        
        if (!assessmentResults || !assessmentResults.skills) {
            addToVerificationLog('⚠️ No assessment results to verify against', 'warning');
            return;
        }
        
        // Build proficiency map from assessment
        const expectedProficiencyMap = {};
        assessmentResults.skills.forEach(skill => {
            const skillName = skill.skill || skill.skill_name || skill.name;
            expectedProficiencyMap[skillName] = skill.proficiency;
        });
        
        addToVerificationLog(`Comparing ${roles.length} roles with expected proficiencies...`);
        addToVerificationLog('');
        
        // Analyze each role
        let rolesWithProficiencies = 0;
        let rolesWithNullProficiencies = 0;
        let rolesMatched = 0;
        let skillsChecked = 0;
        let skillsWithValues = 0;
        let skillsWithNull = 0;
        let skillsMatchingExpected = 0;
        let skillsMismatchingExpected = 0;
        
        // Sample some roles for detailed checking
        const samplesToShow = 5;
        let samplesShown = 0;
        
        for (const role of roles) {
            if (!role.skillProficiencies || role.skillProficiencies.length === 0) {
                continue;
            }
            
            let roleHasAnyProficiency = false;
            let roleHasAllNull = true;
            let matchCount = 0;
            let mismatchCount = 0;
            
            for (const skill of role.skillProficiencies) {
                skillsChecked++;
                
                if (skill.proficiency !== null && skill.proficiency !== undefined) {
                    skillsWithValues++;
                    roleHasAnyProficiency = true;
                    roleHasAllNull = false;
                    
                    // Check if it matches expected
                    const expected = expectedProficiencyMap[skill.name];
                    if (expected !== undefined) {
                        if (skill.proficiency === expected) {
                            matchCount++;
                            skillsMatchingExpected++;
                        } else {
                            mismatchCount++;
                            skillsMismatchingExpected++;
                        }
                    }
                } else {
                    skillsWithNull++;
                }
            }
            
            if (roleHasAnyProficiency) {
                rolesWithProficiencies++;
            } else if (roleHasAllNull) {
                rolesWithNullProficiencies++;
            }
            
            // Show details for first few roles
            if (samplesShown < samplesToShow && role.skillProficiencies.length > 0) {
                const sampleSkills = role.skillProficiencies.slice(0, 3);
                addToVerificationLog(`Sample Role: "${role.title}"`);
                for (const skill of sampleSkills) {
                    const expected = expectedProficiencyMap[skill.name];
                    const status = skill.proficiency === null ? '❌ NULL' : 
                                  skill.proficiency === expected ? '✅ MATCH' : 
                                  expected !== undefined ? '⚠️ MISMATCH' : '❓ NOT IN ASSESSMENT';
                    addToVerificationLog(`  - ${skill.name}: ${skill.proficiency} ${status} (expected: ${expected || 'N/A'})`);
                }
                if (role.skillProficiencies.length > 3) {
                    addToVerificationLog(`  ... and ${role.skillProficiencies.length - 3} more skills`);
                }
                samplesShown++;
            }
        }
        
        addToVerificationLog('');
        addToVerificationLog('=== VERIFICATION RESULTS ===');
        addToVerificationLog(`Total Roles Checked: ${roles.length}`);
        addToVerificationLog(`Roles with Proficiency Values: ${rolesWithProficiencies}`);
        addToVerificationLog(`Roles with All NULL Proficiencies: ${rolesWithNullProficiencies}`);
        addToVerificationLog('');
        addToVerificationLog(`Total Skills Checked: ${skillsChecked}`);
        addToVerificationLog(`Skills with Values: ${skillsWithValues}`);
        addToVerificationLog(`Skills with NULL: ${skillsWithNull}`);
        addToVerificationLog(`Skills Matching Expected: ${skillsMatchingExpected}`);
        addToVerificationLog(`Skills Not Matching Expected: ${skillsMismatchingExpected}`);
        
        // Determine if updates were successful
        if (skillsWithValues === 0) {
            addToVerificationLog('');
            addToVerificationLog('❌ VERIFICATION FAILED: All proficiencies are NULL', 'error');
            addToVerificationLog('The Eightfold API returned 200 OK but did not persist the updates', 'error');
            addToVerificationLog('This is a known limitation of the sandbox environment', 'warning');
        } else if (skillsMatchingExpected > skillsMismatchingExpected) {
            addToVerificationLog('');
            addToVerificationLog('✅ VERIFICATION SUCCESSFUL: Updates were persisted', 'success');
            addToVerificationLog(`${skillsMatchingExpected} skills have the expected proficiency values`, 'success');
        } else {
            addToVerificationLog('');
            addToVerificationLog('⚠️ PARTIAL SUCCESS: Some updates may have been applied', 'warning');
            addToVerificationLog(`Check the detailed logs for more information`, 'warning');
        }
        
        // Update the response monitor with verification results
        const responseMonitor = document.getElementById('step6-response-json');
        if (responseMonitor) {
            responseMonitor.textContent = JSON.stringify({
                verification: 'complete',
                timestamp: new Date().toISOString(),
                environment: environment,
                results: {
                    total_roles: roles.length,
                    roles_with_proficiencies: rolesWithProficiencies,
                    roles_with_null_proficiencies: rolesWithNullProficiencies,
                    total_skills: skillsChecked,
                    skills_with_values: skillsWithValues,
                    skills_with_null: skillsWithNull,
                    skills_matching_expected: skillsMatchingExpected,
                    skills_not_matching: skillsMismatchingExpected,
                    update_persisted: skillsWithValues > 0
                }
            }, null, 2);
        }
        
    } catch (error) {
        addToVerificationLog(`❌ Verification Error: ${error.message}`, 'error');
        console.error('Verification error:', error);
    }
}

// Add verification button to Step 6
function addVerificationButton() {
    const step6Controls = document.querySelector('#step-6 .flex.space-x-4');
    if (step6Controls && !document.getElementById('verify-updates-btn')) {
        const verifyBtn = document.createElement('button');
        verifyBtn.id = 'verify-updates-btn';
        verifyBtn.className = 'px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200';
        verifyBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Verify Updates';
        verifyBtn.onclick = verifyRoleUpdates;
        step6Controls.appendChild(verifyBtn);
    }
}

// Auto-add the button when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addVerificationButton, 1000);
});

// Also try to add it now if the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    addVerificationButton();
}