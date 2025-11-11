// Step 6 Operations - CRUD operations for role management

// Function to create a new role
async function createNewRole() {
    
    const roleName = document.getElementById('new-role-name')?.value;
    const roleDescription = document.getElementById('new-role-description')?.value;
    
    if (!roleName) {
        showNotification('Please enter a role name', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/roles/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: roleName,
                description: roleDescription,
                skillProficiencies: []
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Refresh the role list
            if (window.fetchJIERoles) {
                window.fetchJIERoles();
            }
            
            // Clear the form
            document.getElementById('new-role-name').value = '';
            document.getElementById('new-role-description').value = '';
            
            showNotification('Role created successfully!', 'success');
        } else {
            const error = await response.text();
            console.error('Failed to create role:', error);
            showNotification('Failed to create role. Check console for details.', 'error');
        }
    } catch (error) {
        console.error('Error creating role:', error);
        showNotification('Error creating role. Check console for details.', 'error');
    }
}

// Function to update an existing role
async function updateRole() {
    
    if (!window.workflowState || !window.workflowState.selectedRole) {
        showNotification('Please select a role first', 'error');
        return;
    }
    
    const role = window.workflowState.selectedRole;
    const updatedName = prompt('Enter new name for the role:', role.title);
    
    if (!updatedName) return;
    
    try {
        const response = await fetch(`/api/roles/update/${role.id || role.title}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: updatedName,
                description: role.description,
                skillProficiencies: role.skillProficiencies
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Refresh the role list
            if (window.fetchJIERoles) {
                window.fetchJIERoles();
            }
            
            showNotification('Role updated successfully!', 'success');
        } else {
            const error = await response.text();
            console.error('Failed to update role:', error);
            showNotification('Failed to update role. This operation may not be supported in sandbox.', 'warning');
        }
    } catch (error) {
        console.error('Error updating role:', error);
        showNotification('Error updating role. Check console for details.', 'error');
    }
}

// Function to delete a role
async function deleteRole() {
    
    if (!window.workflowState || !window.workflowState.selectedRole) {
        showNotification('Please select a role first', 'error');
        return;
    }
    
    const role = window.workflowState.selectedRole;
    
    if (!confirm(`Are you sure you want to delete the role "${role.title}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/roles/delete/${role.id || role.title}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            
            // Clear selection
            window.workflowState.selectedRole = null;
            document.getElementById('step-6-role-details').innerHTML = '';
            
            // Refresh the role list
            if (window.fetchJIERoles) {
                window.fetchJIERoles();
            }
            
            showNotification('Role deleted successfully!', 'success');
        } else {
            const error = await response.text();
            console.error('Failed to delete role:', error);
            showNotification('Failed to delete role. This operation may not be supported in sandbox.', 'warning');
        }
    } catch (error) {
        console.error('Error deleting role:', error);
        showNotification('Error deleting role. Check console for details.', 'error');
    }
}

// Function to add a skill to a role
async function addSkillToRole() {
    
    if (!window.workflowState || !window.workflowState.selectedRole) {
        showNotification('Please select a role first', 'error');
        return;
    }
    
    const skillName = prompt('Enter skill name:');
    if (!skillName) return;
    
    const proficiencyLevel = prompt('Enter proficiency level (1-5):\n1 = Novice\n2 = Developing\n3 = Intermediate\n4 = Advanced\n5 = Expert', '3');
    
    // Convert to number and validate
    const proficiencyNum = parseFloat(proficiencyLevel);
    if (isNaN(proficiencyNum) || proficiencyNum < 1 || proficiencyNum > 5) {
        showNotification('Please enter a number between 1 and 5', 'error');
        return;
    }
    
    const role = window.workflowState.selectedRole;
    
    // Add skill to the role object
    if (!role.skillProficiencies) {
        role.skillProficiencies = [];
    }
    
    role.skillProficiencies.push({
        name: skillName,
        proficiency: proficiencyNum,  // Use numeric value
        skillGroupList: []  // REQUIRED field for API
    });
    
    // Update the role via API
    try {
        const response = await fetch(`/api/roles/update/${role.id || role.title}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(role)
        });
        
        if (response.ok) {
            
            // Refresh the display
            displayRoleDetails(role);
            
            showNotification('Skill added successfully!', 'success');
        } else {
            // Even if API fails, show locally
            displayRoleDetails(role);
            showNotification('Skill added locally. Note: Changes may not persist in sandbox environment.', 'warning');
        }
    } catch (error) {
        console.error('Error adding skill:', error);
        // Show locally even if API fails
        displayRoleDetails(role);
        showNotification('Skill added locally. Note: Changes may not persist.', 'warning');
    }
}

// Function to remove a skill from a role
async function removeSkillFromRole(skillName) {
    
    if (!window.workflowState || !window.workflowState.selectedRole) {
        showNotification('Please select a role first', 'error');
        return;
    }
    
    const role = window.workflowState.selectedRole;
    
    if (!role.skillProficiencies) return;
    
    // Remove the skill
    role.skillProficiencies = role.skillProficiencies.filter(s => s.name !== skillName);
    
    // Update the role via API
    try {
        const response = await fetch(`/api/roles/update/${role.id || role.title}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(role)
        });
        
        if (response.ok) {
            
            // Refresh the display
            displayRoleDetails(role);
            
            showNotification('Skill removed successfully!', 'success');
        } else {
            // Even if API fails, show locally
            displayRoleDetails(role);
            showNotification('Skill removed locally. Note: Changes may not persist in sandbox environment.', 'warning');
        }
    } catch (error) {
        console.error('Error removing skill:', error);
        // Show locally even if API fails
        displayRoleDetails(role);
        showNotification('Skill removed locally. Note: Changes may not persist.', 'warning');
    }
}

// Function to export role data
function exportRoleData() {
    
    if (!window.workflowState || !window.workflowState.jieRoles) {
        showNotification('No roles available to export. Fetch JIE Roles first.', 'error');
        return;
    }
    
    const roles = window.workflowState.jieRoles;
    const exportData = {
        timestamp: new Date().toISOString(),
        environment: document.getElementById('environmentSelect')?.value || 'Unknown',
        roles: roles,
        totalRoles: roles.length,
        totalSkills: roles.reduce((sum, role) => sum + (role.skillProficiencies?.length || 0), 0)
    };
    
    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
}

// Function to import role data
async function importRoleData() {
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.roles || !Array.isArray(data.roles)) {
                showNotification('Invalid role data format', 'error');
                return;
            }
            
            // Store imported roles
            window.workflowState.jieRoles = data.roles;
            
            // Populate dropdowns
            populateRoleDropdown(data.roles);
            populateRoleManagementDropdown(data.roles);
            
            showNotification(`Imported ${data.roles.length} roles with ${data.totalSkills || 0} total skills`, 'success');
        } catch (error) {
            console.error('Error importing role data:', error);
            showNotification('Failed to import role data. Check file format.', 'error');
        }
    };
    
    input.click();
}

// Initialize operations when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Step 6 Operations script loaded
    
    // Add any initialization code here
});

// Export functions for use in other scripts
window.createNewRole = createNewRole;
window.updateRole = updateRole;
window.deleteRole = deleteRole;
window.addSkillToRole = addSkillToRole;
window.removeSkillFromRole = removeSkillFromRole;
window.exportRoleData = exportRoleData;
window.importRoleData = importRoleData;