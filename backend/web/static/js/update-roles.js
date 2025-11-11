// Update Roles Functions - Apply assessed proficiencies to Eightfold roles

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

// Function to update roles back to source environment
async function updateRolesToSource() {
    
    // Check if we have required data
    console.log('DEBUG: Checking workflow state...', {
        hasWorkflowState: !!window.workflowState,
        hasJieRoles: !!(window.workflowState && window.workflowState.jieRoles),
        jieRolesLength: window.workflowState?.jieRoles?.length || 0,
        hasAssessmentResults: !!(window.workflowState && window.workflowState.assessmentResults),
        assessmentResultsKeys: window.workflowState?.assessmentResults ? Object.keys(window.workflowState.assessmentResults) : []
    });

    // Try to get JIE roles from either the main workflow state or assessment results
    let jieRoles = window.workflowState?.jieRoles;
    if (!jieRoles && window.workflowState?.assessmentResults?.roles) {
        jieRoles = window.workflowState.assessmentResults.roles;
        console.log('DEBUG: Using JIE roles from assessment results');
    }

    if (!jieRoles || jieRoles.length === 0) {
        showNotification('No JIE roles available. Please fetch roles first (Step 2) or load a previous assessment that includes role data.', 'error');
        return;
    }

    if (!window.workflowState.assessmentResults) {
        showNotification('No assessment results available. Please run assessment first (Step 5) or load a previous assessment.', 'error');
        return;
    }
    
    const roles = jieRoles; // Use the dynamically determined roles
    const assessmentResults = window.workflowState.assessmentResults;
    
    // Build proficiency map from assessment results - store BOTH proficiency and level
    const proficiencyMap = {};
    const normalizedProficiencyMap = {};  // Add normalized map for case-insensitive matching
    
    // Handle different assessment result formats
    if (assessmentResults.skills) {
        assessmentResults.skills.forEach(skill => {
            // Handle various field name formats from assessment
            // The backend returns 'skill_name' in the assessment results
            const skillName = skill.skill_name || skill.skill || skill.name;
            
            // Get both proficiency (numeric) and level (text)
            const profValue = skill.proficiency;
            const levelText = skill.level;
            
            // Only add to map if we have actual assessment data
            if (profValue !== undefined && profValue !== null && levelText !== "Not Assessed") {
                const skillData = {
                    proficiency: profValue,
                    level: levelText
                };
                
                proficiencyMap[skillName] = skillData;
                
                // Also add to normalized map for case-insensitive matching
                const normalizedName = normalizeSkillName(skillName);
                normalizedProficiencyMap[normalizedName] = skillData;
            }
            // Skip skills that weren't assessed - don't add defaults
        });
    }
    
    
    // Count total skills across all roles
    let totalSkillsInRoles = 0;
    roles.forEach(role => {
        if (role.skillProficiencies) {
            totalSkillsInRoles += role.skillProficiencies.length;
        }
    });
    
    // Get the correct environment name
    const envSelect = document.getElementById('step6-environment');
    const environment = envSelect?.options[envSelect.selectedIndex]?.text || envSelect?.value || 'unknown';
    
    // Initialize operation log
    const operationLog = [];
    const statusContainer = document.querySelector('.operation-status') || document.getElementById('operation-status');
    
    function addToLog(message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        operationLog.push(`[${timestamp}] ${message}`);
        updateOperationStatus(operationLog.join('\n'));
    }
    
    function updateOperationStatus(content) {
        if (statusContainer) {
            statusContainer.innerHTML = `
                <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-y-auto" style="max-height: 400px;">
                    <pre>${content}</pre>
                </div>
            `;
            statusContainer.scrollTop = statusContainer.scrollHeight;
        }
    }
    
    // Start logging
    addToLog(`=== ROLE UPDATE OPERATION STARTED ===`);
    addToLog(`Environment: ${environment}`);
    addToLog(`Total roles to process: ${roles.length}`);
    addToLog(`Total skills in assessment: ${Object.keys(proficiencyMap).length}`);
    addToLog('');
    
    // Update Request JSON monitor - use the specific Step 6 elements
    const requestMonitor = document.getElementById('step6-request-json');
    if (requestMonitor) {
        requestMonitor.textContent = JSON.stringify({
            operation: 'update-to-source',
            total_roles: roles.length,
            environment: environment,
            timestamp: new Date().toISOString()
        }, null, 2);
    }
    
    // Update each role
    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;
    let skippedCount = 0;
    const failedRoles = [];  // Track which roles failed
    const updatePromises = [];
    const totalRoles = roles.length;
    
    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const roleNum = i + 1;
        
        if (!role.skillProficiencies || role.skillProficiencies.length === 0) {
            skippedCount++;
            addToLog(`[${roleNum}/${totalRoles}] SKIPPED: "${role.title}" (no skills defined)`);
            continue;
        }
        
        addToLog(`[${roleNum}/${totalRoles}] PROCESSING: "${role.title}"`);
        addToLog(`  ├─ Role ID: ${role.id || 'N/A'}`);
        addToLog(`  ├─ Total skills: ${role.skillProficiencies.length}`);
        
        // Build updated skills array with BOTH proficiency and level
        let changedSkills = 0;
        const updatedSkills = [];
        
        // Debug log the proficiencyMap for first role
        if (i === 0) {
        }
        
        role.skillProficiencies.forEach(skill => {
            const skillName = skill.name;
            const oldProficiency = skill.proficiency;
            
            // Try exact match first
            let assessmentData = proficiencyMap[skillName];
            
            // If no exact match, try normalized case-insensitive match
            if (!assessmentData) {
                const normalizedName = normalizeSkillName(skillName);
                assessmentData = normalizedProficiencyMap[normalizedName];
            }
            
            if (assessmentData) {
                // Only include skills that were actually assessed
                const newProficiency = assessmentData.proficiency;
                const newLevel = assessmentData.level;

                // Debug first few skills to see actual values
                if (i === 0 && updatedSkills.length < 3) {
                    addToLog(`  ├─ DEBUG: Skill "${skillName}": oldProf=${oldProficiency} (${typeof oldProficiency}), newProf=${newProficiency} (${typeof newProficiency}), equal=${oldProficiency === newProficiency}`);
                }

                if (newProficiency !== oldProficiency) {
                    changedSkills++;
                    addToLog(`  ├─ Skill update: "${skillName}": ${oldProficiency || 'null'} → ${newProficiency} (${newLevel})`);
                }
                
                // Create skill object WITHOUT level for API (level is read-only)
                const skillObj = {
                    name: skillName,
                    proficiency: newProficiency,
                    // DO NOT include level - it's read-only in Eightfold API
                    skillGroupList: []
                };
                
                // Debug log for first skill of first role
                if (i === 0 && updatedSkills.length === 0) {
                }
                
                updatedSkills.push(skillObj);
            } else {
                // Skill was not assessed - keep original if it had a value, otherwise skip
                if (skill.proficiency) {
                    updatedSkills.push({
                        name: skillName,
                        proficiency: skill.proficiency,
                        // DO NOT include level - it's read-only in Eightfold API
                        skillGroupList: []
                    });
                }
                // If no original proficiency and not assessed, skip entirely
            }
        });
        
        if (changedSkills === 0) {
            addToLog(`  └─ SKIPPED: No proficiency changes needed (all skills already have correct values)`);
            skippedCount++;
            continue;  // Skip this role entirely - no API call needed
        } else {
            addToLog(`  ├─ Updated ${changedSkills} skill proficiencies`);
        }
        
        // Prepare update payload (id excluded as it's read-only)
        const updatePayload = {
            title: role.title,
            skillProficiencies: updatedSkills,
            roleDescription: role.roleDescription || "",
            archivalStatus: role.archivalStatus || false
        };

        // CRITICAL DEBUG: Log the updatePayload to ensure no id field
        addToLog(`  ├─ DEBUG: updatePayload keys: ${Object.keys(updatePayload).join(', ')}`);
        if (updatePayload.id !== undefined) {
            addToLog(`  ├─ ERROR: updatePayload contains id field: ${updatePayload.id}`);
        }
        
        // Log the request
        addToLog(`  └─ Sending POST to /api/roles/update-to-source...`);
        
        // Count how many skills were matched from LLM assessment
        const matchedFromLLM = updatedSkills.filter(s => {
            // Check if skill was matched (either exact or normalized)
            if (proficiencyMap[s.name]) return true;
            const normalizedName = normalizeSkillName(s.name);
            return normalizedProficiencyMap[normalizedName] !== undefined;
        }).length;
        
        // Update request monitor for this specific role
        if (requestMonitor) {
            // Log first few skills to debug
            if (i === 0) {
            }
            
            requestMonitor.textContent = JSON.stringify({
                operation: 'update-role',
                role_index: roleNum,
                total_roles: totalRoles,
                role_id: role.id,
                role_title: role.title,
                total_skills: role.skillProficiencies.length,
                matched_from_llm: matchedFromLLM,
                changed_skills: changedSkills,
                environment: environment,
                note: 'level field excluded from API payload (read-only)',
                payload: {
                    title: updatePayload.title,
                    skillProficiencies: updatePayload.skillProficiencies,  // Level excluded (read-only)
                    roleDescription: updatePayload.roleDescription,
                    archivalStatus: updatePayload.archivalStatus
                }
            }, null, 2);
        }
        
        // Make direct API call to Eightfold (removing proxy)
        const startTime = Date.now();
        
        // Get auth token from workflow state or session
        const authToken = window.workflowState?.eightfoldToken || 
                         sessionStorage.getItem('eightfold_token') || 
                         window.eightfoldAuthToken;
        
        if (!authToken) {
            addToLog(`     ✗ ERROR: No authentication token available. Please authenticate with Eightfold first.`);
            failCount++;
            processedCount++;
            continue;  // Use continue instead of return since we're in a loop
        }
        
        // Get the API base URL (all environments use the same URL)
        const apiBaseUrl = 'https://apiv2.eightfold.ai';
        
        // CRITICAL: Ensure NO id field is included in request body
        const requestBody = {
            title: updatePayload.title,
            skillProficiencies: updatePayload.skillProficiencies,
            roleDescription: updatePayload.roleDescription,
            archivalStatus: updatePayload.archivalStatus
        };

        // Debug log to verify no id field
        addToLog(`  ├─ DEBUG: Request body keys: ${Object.keys(requestBody).join(', ')}`);
        if (requestBody.id !== undefined) {
            addToLog(`  ├─ WARNING: id field detected in request body: ${requestBody.id}`);
        }

        // Use proxy to avoid CORS issues
        const proxyRequest = {
            endpoint: `/api/v2/JIE/roles/${role.id}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: requestBody,
            base_url: apiBaseUrl
        };
        
        // CRITICAL DEBUG: Log the exact proxy request before sending
        addToLog(`  ├─ DEBUG: proxyRequest.body keys: ${Object.keys(proxyRequest.body).join(', ')}`);
        if (proxyRequest.body.id !== undefined) {
            addToLog(`  ├─ ERROR: proxyRequest.body contains id field: ${proxyRequest.body.id}`);
        }

        const updatePromise = fetch('/api/eightfold/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyRequest)
        })
        .then(async response => {
            processedCount++;
            const duration = Date.now() - startTime;
            
            // Parse the direct API response
            let apiResult;
            try {
                apiResult = await response.json();
            } catch (e) {
                apiResult = await response.text();
            }
            
            // CRITICAL: Check the Eightfold API status properly - proxy response structure is different
            // The proxy response structure: { success: boolean, status_code: number, data: {...} }
            const actualApiSuccess = response.ok && apiResult?.success === true && apiResult?.status_code && apiResult.status_code >= 200 && apiResult.status_code < 300;

            // Debug log the response details
            addToLog(`  ├─ DEBUG: Proxy response.ok: ${response.ok}`);
            addToLog(`  ├─ DEBUG: apiResult.success: ${apiResult?.success}`);
            addToLog(`  ├─ DEBUG: apiResult.status_code: ${apiResult?.status_code}`);
            addToLog(`  ├─ DEBUG: actualApiSuccess: ${actualApiSuccess}`);

            if (actualApiSuccess) {
                successCount++;
                addToLog(`     ✓ SUCCESS: Role updated in ${duration}ms`);
                addToLog(`     └─ Response: ${apiResult.status_code || response.status} (Eightfold API)`);
                
                // Update response monitor
                const responseMonitor = document.getElementById('step6-response-json');
                if (responseMonitor) {
                    responseMonitor.textContent = JSON.stringify({
                        status: 'in_progress',
                        last_role: role.title,
                        processed: processedCount,
                        total: totalRoles - skippedCount,
                        successful: successCount,
                        failed: failCount,
                        skipped: skippedCount,
                        progress_percentage: Math.round((processedCount / (totalRoles - skippedCount)) * 100),
                        last_response: apiResult
                    }, null, 2);
                }
                
                return apiResult;
            } else {
                failCount++;

                // Extract error details from proxy response
                const proxyStatus = response.status;
                const eightfoldStatus = apiResult?.status_code || proxyStatus;
                const errorData = apiResult?.data;
                const errorMessage = apiResult?.data?.message || apiResult?.data?.error || apiResult?.data || apiResult?.error || 'Unknown error';

                // Log detailed error information
                addToLog(`     ✗ FAILED: Eightfold API returned ${eightfoldStatus}`);
                addToLog(`     └─ Proxy Status: ${proxyStatus}, Eightfold Status: ${eightfoldStatus}`);
                addToLog(`     └─ Error Data: ${JSON.stringify(errorData, null, 2)}`);

                // Special handling for read-only field errors (400 status with specific error message)
                if (eightfoldStatus === 400 && (
                    (typeof errorData === 'object' && JSON.stringify(errorData).includes('error_read_only_fields')) ||
                    (typeof errorMessage === 'string' && errorMessage.includes('error_read_only_fields'))
                )) {
                    addToLog(`     └─ NOTE: This is a read-only field error - check if 'id' field was included in request`);
                }
                
                // Track failed role with detailed error info
                failedRoles.push({
                    role_id: role.id,
                    role_title: role.title,
                    proxy_status: proxyStatus,
                    eightfold_status: eightfoldStatus,
                    error: errorMessage,
                    error_data: errorData
                });
                
                // Update response monitor with error
                const responseMonitor = document.getElementById('step6-response-json');
                if (responseMonitor) {
                    responseMonitor.textContent = JSON.stringify({
                        status: 'in_progress',
                        last_role: role.title,
                        processed: processedCount,
                        total: totalRoles - skippedCount,
                        successful: successCount,
                        failed: failCount,
                        skipped: skippedCount,
                        progress_percentage: Math.round((processedCount / (totalRoles - skippedCount)) * 100),
                        last_error: {
                            role: role.title,
                            proxy_status: proxyStatus,
                            eightfold_status: eightfoldStatus,
                            error: errorMessage,
                            error_data: errorData
                        }
                    }, null, 2);
                }
                
                // Don't throw - just return null to indicate failure
                return null;
            }
        })
        .catch(error => {
            // Network or other error
            failCount++;
            processedCount++;
            addToLog(`     ✗ ERROR: ${error.message}`);
            
            // Track failed role
            failedRoles.push({
                role_id: role.id,
                role_title: role.title,
                status: 'network_error',
                error: error.message
            });
            
            // Update response monitor with error
            const responseMonitor = document.getElementById('step6-response-json');
            if (responseMonitor) {
                responseMonitor.textContent = JSON.stringify({
                    status: 'in_progress',
                    last_role: role.title,
                    processed: processedCount,
                    total: totalRoles - skippedCount,
                    successful: successCount,
                    failed: failCount,
                    skipped: skippedCount,
                    progress_percentage: Math.round((processedCount / (totalRoles - skippedCount)) * 100),
                    last_error: {
                        role: role.title,
                        status: 'network_error',
                        error: error.message
                    }
                }, null, 2);
            }
        });
        
        updatePromises.push(updatePromise);
        
        // Add progress summary every 10 roles
        if (roleNum % 10 === 0 || roleNum === totalRoles) {
            updatePromise.then(() => {
                addToLog('');
                addToLog(`PROGRESS: ${processedCount}/${totalRoles - skippedCount} processed (${Math.round((processedCount / (totalRoles - skippedCount)) * 100)}%)`);
                addToLog(`          Success: ${successCount} | Failed: ${failCount} | Skipped: ${skippedCount}`);
                addToLog('');
            });
        }
    }
    
    // Wait for all updates to complete
    try {
        await Promise.all(updatePromises);
        
        const actualProcessed = totalRoles - skippedCount;
        const successRate = actualProcessed > 0 ? Math.round((successCount / actualProcessed) * 100) : 0;
        
        addToLog('');
        addToLog(`=== OPERATION COMPLETE ===`);
        addToLog(`Total Roles: ${totalRoles}`);
        addToLog(`✅ Successfully Updated: ${successCount} (roles with actual proficiency changes)`);
        addToLog(`❌ Failed: ${failCount}`);
        addToLog(`⏭️ Skipped: ${skippedCount} (${skippedCount} no changes needed + roles without skills)`);
        addToLog(`Success Rate: ${successRate}%`);
        addToLog(`Completed at: ${new Date().toISOString()}`);
        
        // List failed roles if any
        if (failedRoles.length > 0) {
            addToLog('');
            addToLog(`=== FAILED ROLES ===`);
            failedRoles.forEach((failed, index) => {
                addToLog(`${index + 1}. ${failed.role_title}`);
                addToLog(`   ID: ${failed.role_id}`);
                addToLog(`   Error: ${failed.error}`);
            });
        }
        
        // Show notification
        let message;
        if (successCount > 0) {
            message = `✓ Successfully updated ${successCount} roles with actual changes. ${skippedCount} roles skipped (no changes needed).`;
        } else if (skippedCount === totalRoles) {
            message = `ℹ️ All roles already have correct proficiencies - no updates needed!`;
        } else {
            message = `✗ Failed to update roles. Check the operation log for details.`;
        }
        showNotification(message, successCount > 0 ? 'success' : (skippedCount === totalRoles ? 'info' : 'error'));
        
        // Update final response display
        const responseMonitor = document.getElementById('step6-response-json');
        if (responseMonitor) {
            responseMonitor.textContent = JSON.stringify({
                operation: 'update-to-source',
                status: 'complete',
                environment: environment,
                total_roles: totalRoles,
                processed: processedCount,
                successful: successCount,
                failed: failCount,
                skipped: skippedCount,
                success_rate: `${successRate}%`,
                failed_roles: failedRoles,
                timestamp: new Date().toISOString()
            }, null, 2);
        }
        
        
    } catch (error) {
        console.error('Error during bulk update:', error);
        addToLog(`✗ CRITICAL ERROR: ${error.message}`);
        showNotification('Error updating roles. Check operation log for details.', 'error');
    }
}

// Function to create roles in target environment
// createRolesToTarget function is implemented in workflow.js - don't override it

// Function to wipe proficiencies from roles
async function wipeProficiencies() {
    if (!confirm('Are you sure you want to remove all proficiencies from roles?')) {
        return;
    }
    
    showNotification('Wipe proficiencies functionality coming soon!', 'info');
}

// Function to delete all roles (already exists in workflow.js)
// Just ensure it's accessible
if (typeof deleteAllRoles === 'undefined') {
    async function deleteAllRoles() {
        // This should be handled by the main workflow.js
        showNotification('Please use the Delete All Roles function from the main workflow.', 'info');
    }
}

// Export functions to global scope
window.updateRolesToSource = updateRolesToSource;
// createRolesToTarget is exported by workflow.js
window.wipeProficiencies = wipeProficiencies;