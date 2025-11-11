// Step 6 Workflow - Role Management and Dropdown Population

// Function to populate the role dropdown in Step 6
function populateRoleDropdown(roles) {
    // Only try to populate if Step 6 elements exist
    const roleSelect = document.getElementById('step-6-role-select');
    if (!roleSelect) {
        // Element not found, skip silently (Step 6 may not be loaded yet)
        return;
    }
    
    
    // Clear existing options
    roleSelect.innerHTML = '<option value="">Select a role...</option>';
    
    if (!roles || roles.length === 0) {
        roleSelect.innerHTML = '<option value="">No roles available - Fetch JIE Roles first</option>';
        return;
    }
    
    // Add roles as options
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.id || role.title || '';
        option.textContent = role.title || 'Unnamed Role';
        
        // Add skill count to the option text if available
        if (role.skillProficiencies && role.skillProficiencies.length > 0) {
            option.textContent += ` (${role.skillProficiencies.length} skills)`;
        }
        
        roleSelect.appendChild(option);
    });
    
}

// Function to populate the role management dropdown
function populateRoleManagementDropdown(roles) {
    
    const managementSelect = document.getElementById('role-management-select');
    if (managementSelect) {
        managementSelect.innerHTML = '<option value="">Select a role to manage...</option>';
        
        if (roles && roles.length > 0) {
            roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id || role.title || '';
                option.textContent = role.title || 'Unnamed Role';
                managementSelect.appendChild(option);
            });
        }
    }
}

// Function to handle role selection in Step 6
function onStep6RoleSelect() {
    const roleSelect = document.getElementById('step-6-role-select');
    if (!roleSelect) return;
    
    const selectedRole = roleSelect.value;
    
    // Find the selected role in workflowState
    if (window.workflowState && window.workflowState.jieRoles) {
        const role = window.workflowState.jieRoles.find(r => 
            (r.id && r.id === selectedRole) || (r.title === selectedRole)
        );
        
        if (role) {
            displayRoleDetails(role);
            
            // Store selected role for operations
            window.workflowState.selectedRole = role;
        }
    }
}

// Function to display role details
function displayRoleDetails(role) {
    const detailsContainer = document.getElementById('step-6-role-details');
    if (!detailsContainer) {
        console.warn('Role details container not found');
        return;
    }
    
    let detailsHTML = `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
            <h4 class="font-semibold text-lg mb-2">${role.title || 'Unnamed Role'}</h4>
    `;
    
    if (role.description) {
        detailsHTML += `<p class="text-gray-600 dark:text-gray-300 mb-3">${role.description}</p>`;
    }
    
    if (role.skillProficiencies && role.skillProficiencies.length > 0) {
        detailsHTML += `
            <div class="mt-3">
                <h5 class="font-medium mb-2">Skills (${role.skillProficiencies.length}):</h5>
                <div class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        `;
        
        role.skillProficiencies.forEach(skill => {
            const proficiency = skill.proficiency || skill.level || 'Not specified';
            detailsHTML += `
                <div class="bg-white dark:bg-gray-800 rounded p-2 text-sm">
                    <span class="font-medium">${skill.name}</span>
                    <span class="text-gray-500 dark:text-gray-400 ml-2">${proficiency}</span>
                </div>
            `;
        });
        
        detailsHTML += `
                </div>
            </div>
        `;
    } else {
        detailsHTML += '<p class="text-gray-500 dark:text-gray-400">No skills defined for this role</p>';
    }
    
    detailsHTML += '</div>';
    
    detailsContainer.innerHTML = detailsHTML;
}

// Function to ensure Step 6 is properly initialized
function initializeStep6() {
    
    // Check if workflowState exists and has roles
    if (window.workflowState && window.workflowState.jieRoles) {
        populateRoleDropdown(window.workflowState.jieRoles);
        populateRoleManagementDropdown(window.workflowState.jieRoles);
    }
    
    // Add event listener for role selection
    const roleSelect = document.getElementById('step-6-role-select');
    if (roleSelect) {
        roleSelect.addEventListener('change', onStep6RoleSelect);
    }
    
    // Also check for credentials and populate if available
    ensureStep6Populated();
}

// Function to ensure Step 6 fields are populated
function ensureStep6Populated() {
    
    // Get current environment configuration
    const currentEnv = document.getElementById('environmentSelect')?.value;
    if (!currentEnv) return;
    
    // Try to get credentials from the environment configuration
    fetch('/api/environments')
        .then(response => response.json())
        .then(data => {
            const envs = data.environments || {};
            const current = data.current;
            
            // Find the current environment details
            let envConfig = null;
            if (typeof envs === 'object' && !Array.isArray(envs)) {
                envConfig = envs[current] || envs[currentEnv];
            }
            
            if (envConfig) {
                // Populate Step 6 auth fields if they exist
                const step6Username = document.getElementById('step-6-username');
                const step6Password = document.getElementById('step-6-password');
                const step6ApiUrl = document.getElementById('step-6-api-url');
                
                if (step6Username && envConfig.eightfold_username) {
                    step6Username.value = envConfig.eightfold_username;
                }
                if (step6Password && envConfig.eightfold_password) {
                    step6Password.value = envConfig.eightfold_password;
                }
                if (step6ApiUrl && envConfig.eightfold_api_url) {
                    step6ApiUrl.value = envConfig.eightfold_api_url;
                }
                
            }
        })
        .catch(error => {
            console.error('Error fetching environment config for Step 6:', error);
        });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeStep6();
});

// Export functions for use in other scripts
window.populateRoleDropdown = populateRoleDropdown;
window.populateRoleManagementDropdown = populateRoleManagementDropdown;
window.onStep6RoleSelect = onStep6RoleSelect;
window.initializeStep6 = initializeStep6;
window.ensureStep6Populated = ensureStep6Populated;