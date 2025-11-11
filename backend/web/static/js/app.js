// Skills Proficiency Generator - Main JavaScript

let currentProvider = 'openai';
let systemInfo = {};

// Helper function to get the correct Eightfold API base URL
function getEightfoldApiUrl(environment) {
    // All environments use the same API URL
    // Sandbox vs production is determined by credentials, not URL
    return 'https://apiv2.eightfold.ai';
}

// Function to handle endpoint preset selection
function selectPresetEndpoint() {
    const preset = document.getElementById('api-endpoint-preset');
    const endpointInput = document.getElementById('api-test-endpoint');
    const methodSelect = document.getElementById('api-test-method');
    const infoDiv = document.getElementById('endpoint-info');
    const descriptionSpan = document.getElementById('endpoint-description');
    
    if (preset.value) {
        const [endpoint, method, description] = preset.value.split('|');
        
        // Set the endpoint value
        endpointInput.value = endpoint;
        
        // Set the method
        methodSelect.value = method;
        
        // Show description
        descriptionSpan.textContent = description;
        infoDiv.classList.remove('hidden');
        
        // Add authentication type indicator based on endpoint
        let authType = 'OAuth Bearer Token';
        if (endpoint.includes('/roles/skills_engine_fetch')) {
            authType = 'OAuth Session/UI (Internal)';
        } else if (endpoint.includes('/skills_engine/research')) {
            authType = 'OAuth/Bearer Token (Partner/Internal)';
        } else if (endpoint.includes('/api/v2/JIE/roles/{role_id}/skills')) {
            authType = 'OAuth Bearer Token (Partner/Internal)';
        }
        
        descriptionSpan.textContent = `${description} - Auth: ${authType}`;
        
        // Show placeholder hint for role_id
        if (endpoint.includes('{role_id}')) {
            endpointInput.placeholder = 'Replace {role_id} with actual role ID';
        }
        
        // Show/hide body section based on method
        const bodySection = document.getElementById('api-body-section');
        if (method === 'POST' || method === 'PUT') {
            bodySection.classList.remove('hidden');
            
            // Add example body for specific endpoints
            const bodyTextarea = document.getElementById('api-test-body');
            if (endpoint.includes('/skills_engine/research')) {
                bodyTextarea.value = JSON.stringify({
                    "skill_name": "Python",
                    "include_trends": true,
                    "include_descriptions": true
                }, null, 2);
            }
        } else {
            bodySection.classList.add('hidden');
        }
    } else {
        // Clear everything if no selection
        endpointInput.value = '';
        infoDiv.classList.add('hidden');
        document.getElementById('api-body-section').classList.add('hidden');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    
    checkSystemHealth();
    
    // Load assessment settings with delay to ensure DOM is ready
    setTimeout(async () => {
        expandStep3(); // Ensure Step 3 is expanded
        await loadAssessmentSettings();

        // Now load the prompt preference from prompt-manager.js
        // This ensures the user's preference (simplified) overrides the server default (verbose)
        if (typeof loadPromptPreference === 'function') {
            loadPromptPreference();
        }

        // Double-check that prompt loaded, if not force load it
        setTimeout(() => {
            const promptField = document.getElementById('assessment-prompt');
            if (promptField && (!promptField.value || promptField.value.trim() === '')) {
                forceLoadPrompt();
            }
        }, 1000);
    }, 500);
    
    // Load configurations immediately
    await loadConfigurations();
    await loadAPITestConfigurations();
    // Load the current configuration to populate credentials
    await loadCurrentConfiguration();
    // Load implementation code for all methods
    loadMethodCode('all');
    // Initialize API tester
    initializeAPITester();
    // Initialize enhanced search after a small delay to ensure DOM is ready
    setTimeout(initializeEnhancedSearch, 100);
    // Initialize assessment prompt
    initializeAssessmentPrompt();
    
    // Add auto-save on field changes
    const fieldsToAutoSave = [
        'api-eightfold-username',
        'api-eightfold-password',
        'api-openai',
        'api-anthropic',
        'api-google',
        'api-grok'
    ];
    
    fieldsToAutoSave.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', async () => {
                await saveConfiguration();
            });
        }
    });
});

// Load configurations into API tester
async function loadAPITestConfigurations() {
    try {
        const response = await fetch('/api/environments');
        const data = await response.json();
        
        const selector = document.getElementById('api-test-config');
        if (!selector) {
            return;
        }
        
        // Handle array format from API
        if (data.environments && data.environments.length > 0) {
            selector.innerHTML = '';  // Clear existing options
            const firstOption = selector.options[0];
            selector.innerHTML = '';
            if (firstOption && firstOption.value === '') {
                selector.appendChild(firstOption);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Select Configuration --';
                selector.appendChild(option);
            }
            
            for (const name of data.environments) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                selector.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Error loading API test configurations:', error);
    }
}

function initializeAPITester() {
    // Initialize API tester if needed
}

// API Key Management (moved to environment management section)

function updateApiStatus(configured) {
    const statusDiv = document.getElementById('api-status');
    statusDiv.innerHTML = `
        <div class="flex flex-wrap gap-2 mt-2">
            ${configured.map(provider => `
                <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    <i class="fas fa-check-circle mr-1"></i>${provider}
                </span>
            `).join('')}
        </div>
    `;
}

// Load roles data from API
async function extractSkills() {
    // First check API status
    try {
        const statusResponse = await fetch('/api/status/eightfold');
        const status = await statusResponse.json();
        
        // Update API status display with actual URLs
        document.getElementById('api-url').textContent = 'https://apiv2.eightfold.ai/api/v2/JIE/roles';
        document.getElementById('api-auth-url').textContent = 'https://apiv2.eightfold.ai/oauth/v1/authenticate';
        document.getElementById('api-username').textContent = status.username || 'Not set';
        document.getElementById('api-token-preview').textContent = status.token_preview || 'No token';
        document.getElementById('api-auth-status').innerHTML = status.authenticated 
            ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Authenticated</span>'
            : '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Not authenticated</span>';
    } catch (e) {
        console.error('Error checking API status:', e);
    }
    
    // Now fetch roles with skillProficiencies
    try {
        const response = await fetch('/api/roles/extract');
        const result = await response.json();
        
        // Update API connection display
        document.getElementById('api-url').textContent = result.api_url || 'Unknown';
        document.getElementById('api-auth-status').innerHTML = result.auth_status === 'authenticated'
            ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Authenticated</span>'
            : '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Not authenticated</span>';
        document.getElementById('api-skills-count').textContent = result.count;
        document.getElementById('api-last-response').textContent = new Date(result.timestamp).toLocaleTimeString();
        
        if (result.success) {
            // Store the initial roles data
            initialSkillsData = result.roles;
            
            // Display in the JSON view
            document.getElementById('initial-json').textContent = JSON.stringify(result.roles, null, 2);
            
            // Extract unique skills from all roles for the skills list
            const allSkills = new Set();
            result.roles.forEach(role => {
                if (role.skillProficiencies) {
                    role.skillProficiencies.forEach(skill => {
                        allSkills.add(skill.name);
                    });
                }
            });
            
            // Populate skills list with unique skills from roles
            const uniqueSkills = Array.from(allSkills).slice(0, 20);
            document.getElementById('skills-list').value = uniqueSkills.join('\n');
            
            // Hide error display
            document.getElementById('api-error-display').classList.add('hidden');
            
            // Show appropriate notification based on source
            if (result.source === 'demo_data') {
                showNotification(`Loaded ${result.count} demo roles with skills (API authentication failed)`, 'warning');
            } else {
                showNotification(`${result.message} - Extracted ${uniqueSkills.length} unique skills`, 'success');
            }
        } else {
            // Show error
            document.getElementById('api-error-display').classList.remove('hidden');
            document.getElementById('api-error-message').textContent = result.error || 'Unknown error';
            showNotification('Error loading roles: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        document.getElementById('api-error-display').classList.remove('hidden');
        document.getElementById('api-error-message').textContent = error.toString();
        showNotification('Error loading roles', 'error');
    }
}

async function autoDetectSkills() {
    // Auto-detect from existing skills or use demo skills
    const demoSkills = ['Python', 'JavaScript', 'React', 'Docker', 'Kubernetes', 'AWS', 'Machine Learning'];
    document.getElementById('skills-list').value = demoSkills.join('\n');
    showNotification('Loaded demo skills for testing', 'info');
    return;
    
    // Simple skill detection from text
    const commonSkills = ['Python', 'JavaScript', 'React', 'Docker', 'Kubernetes', 
                         'Machine Learning', 'TensorFlow', 'PyTorch', 'AWS', 'SQL',
                         'Git', 'Agile', 'REST APIs', 'Microservices'];
    
    const detectedSkills = commonSkills.filter(skill => 
        text.toLowerCase().includes(skill.toLowerCase())
    );
    
    document.getElementById('skills-list').value = detectedSkills.join('\n');
    showNotification(`Auto-detected ${detectedSkills.length} skills`, 'success');
}

// Assessment Functions
async function runAssessment(method) {
    const skills = document.getElementById('skills-list').value.split('\n').filter(s => s.trim());
    const provider = document.getElementById('llm-provider').value;
    const contextDocs = document.getElementById('context-docs').value;
    
    if (skills.length === 0) {
        showNotification('Please enter skills to assess', 'warning');
        return;
    }
    
    showLoading(true);
    
    // Update active LLM provider display
    updateActiveLLMDisplay(provider);
    
    // Map new method names to backend method names
    const methodMap = {
        'enhanced': 'direct',
        'rag_enhanced': 'rag',
        'python': 'barebones'
    };
    
    try {
        const requestData = {
            skills: skills,
            provider: provider,
            method: methodMap[method] || method,
            use_rag: method === 'rag_enhanced'
        };
        
        if (method === 'rag_enhanced' && contextDocs) {
            requestData.context_documents = [contextDocs];
        }
        
        const response = await fetch('/api/assess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        showLoading(false);
        
        if (result.success) {
            displayResults(result, method);
            
            // Load and display the code for this method
            loadMethodCode(method);
            
            // Display enhanced JSON with proficiencies
            if (result.proficiencies) {
                enhancedSkillsData = result.proficiencies;
                document.getElementById('enhanced-json').textContent = JSON.stringify(result.proficiencies, null, 2);
            }
        } else {
            showNotification('Assessment failed: ' + result.error, 'error');
        }
    } catch (error) {
        showLoading(false);
        showNotification('Error during assessment', 'error');
    }
}

async function compareAllMethods() {
    const skills = document.getElementById('skills-list').value.split('\n').filter(s => s.trim());
    const provider = document.getElementById('llm-provider').value;
    const contextDocs = document.getElementById('context-docs').value;
    
    if (skills.length === 0) {
        showNotification('Please enter skills to assess', 'warning');
        return;
    }
    
    showLoading(true);
    document.getElementById('comparison-section').classList.remove('hidden');
    
    try {
        const requestData = {
            skills: skills,
            provider: provider
        };
        
        if (contextDocs) {
            requestData.context_documents = [contextDocs];
        }
        
        const response = await fetch('/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        showLoading(false);
        
        if (result.success) {
            displayComparison(result);
        } else {
            showNotification('Comparison failed: ' + result.error, 'error');
        }
    } catch (error) {
        showLoading(false);
        showNotification('Error during comparison', 'error');
    }
}

// Display Functions
function displayResults(result, method) {
    const container = document.getElementById('results-container');
    const proficiencies = result.proficiencies || [];
    
    const methodColors = {
        'enhanced': 'blue',
        'rag_enhanced': 'purple',
        'python': 'green'
    };
    
    const color = methodColors[method] || 'gray';
    
    let html = `
        <div class="mb-4">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold">
                    <span class="text-${color}-600">${method.charAt(0).toUpperCase() + method.slice(1)}</span> Assessment
                </h3>
                <span class="text-sm text-gray-600">
                    ${result.result?.processing_time?.toFixed(2) || '0'}s
                </span>
            </div>
            <p class="text-sm text-gray-600 mt-1">
                Provider: ${result.result?.provider || 'Unknown'} | 
                Skills: ${proficiencies.length}
                ${result.result?.rag_context_used ? ' | Context Enhanced' : ''}
            </p>
        </div>
        
        <div class="space-y-3 max-h-96 overflow-y-auto">
    `;
    
    proficiencies.forEach(prof => {
        const skill = prof.skill || { name: prof.skill_name || prof.skill };
        const profLevel = prof.proficiency_level || prof.proficiency || 'Unknown';
        const confidence = prof.confidence_score || 0.7;
        const reasoning = prof.reasoning || 'No reasoning provided';
        
        const levelColors = {
            'Novice': 'bg-gray-100 text-gray-800',
            'Developing': 'bg-blue-100 text-blue-800',
            'Intermediate': 'bg-yellow-100 text-yellow-800',
            'Advanced': 'bg-green-100 text-green-800',
            'Expert': 'bg-purple-100 text-purple-800'
        };
        
        const levelColor = levelColors[profLevel] || 'bg-gray-100 text-gray-800';
        
        html += `
            <div class="border rounded-lg p-4 hover:shadow-md transition">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-gray-900">${skill.name || skill}</h4>
                    <span class="px-3 py-1 rounded-full text-sm ${levelColor}">
                        ${profLevel}
                    </span>
                </div>
                
                <div class="mb-2">
                    <div class="flex items-center text-sm text-gray-600">
                        <span>Confidence:</span>
                        <div class="ml-2 flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                            <div class="bg-${color}-600 h-2 rounded-full" style="width: ${confidence * 100}%"></div>
                        </div>
                        <span class="ml-2">${(confidence * 100).toFixed(0)}%</span>
                    </div>
                </div>
                
                <p class="text-sm text-gray-700">${reasoning}</p>
                
                ${prof.evidence && prof.evidence.length > 0 ? `
                    <div class="mt-2 text-xs text-gray-600">
                        <span class="font-medium">Evidence:</span>
                        <ul class="list-disc list-inside mt-1">
                            ${prof.evidence.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += `
        </div>
        
        <div class="mt-4 pt-4 border-t">
            <button onclick="exportResults(${JSON.stringify(result).replace(/"/g, '&quot;')})" 
                class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 mr-2">
                <i class="fas fa-download mr-2"></i>Export
            </button>
            <button onclick="updateToAPI(${JSON.stringify(proficiencies).replace(/"/g, '&quot;')})" 
                class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                <i class="fas fa-upload mr-2"></i>Update to API
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

function displayComparison(result) {
    const container = document.getElementById('comparison-results');
    const comparison = result.comparison;
    
    let html = '';
    
    // Display each method's results
    ['direct', 'rag', 'barebones'].forEach(method => {
        const methodResult = result.results[method];
        const proficiencies = methodResult?.proficiencies || methodResult?.results || [];
        
        html += `
            <div class="border rounded-lg p-4">
                <h4 class="font-semibold mb-2 text-center">${method.charAt(0).toUpperCase() + method.slice(1)}</h4>
                <div class="text-sm space-y-2">
                    <p>Skills: ${proficiencies.length}</p>
                    ${methodResult?.metrics ? `<p>Time: ${methodResult.metrics.processing_time.toFixed(2)}s</p>` : ''}
                    
                    <div class="mt-3 space-y-1">
                        ${proficiencies.slice(0, 5).map(p => `
                            <div class="flex justify-between text-xs">
                                <span>${p.skill?.name || p.skill_name || p.skill}</span>
                                <span class="font-medium">${p.proficiency_level || p.proficiency}</span>
                            </div>
                        `).join('')}
                        ${proficiencies.length > 5 ? '<p class="text-xs text-gray-500">...</p>' : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Display comparison analysis if available
    if (comparison) {
        const analysisHtml = `
            <div class="mt-6 bg-yellow-50 rounded-lg p-4">
                <h4 class="font-semibold mb-3">Comparison Analysis</h4>
                <div class="space-y-2 text-sm">
                    <p><strong>Agreement Score:</strong> ${(comparison.agreement_score * 100).toFixed(1)}%</p>
                    <p><strong>Methods Compared:</strong> ${comparison.approaches_compared.join(', ')}</p>
                    
                    ${comparison.recommendations && comparison.recommendations.length > 0 ? `
                        <div class="mt-3">
                            <p class="font-medium">Recommendations:</p>
                            <ul class="list-disc list-inside mt-1 space-y-1">
                                ${comparison.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('comparison-section').insertAdjacentHTML('beforeend', analysisHtml);
    }
}

// Demo Functions
async function runDemo(type) {
    showNotification(`Running ${type} demo...`, 'info');
    
    // Set demo data
    document.getElementById('profile-text').value = "Senior Software Engineer with 5+ years of experience in Python, React, and cloud technologies. Led development of microservices architecture using Docker and Kubernetes. Expert in machine learning with TensorFlow and PyTorch.";
    
    if (type === 'rag') {
        document.getElementById('context-docs').value = "Senior engineers should have expert-level proficiency in their primary programming languages and advanced knowledge of system architecture.";
    }
    
    // Auto-detect skills
    autoDetectSkills();
    
    // Run assessment after a short delay
    setTimeout(() => {
        runAssessment(type === 'rag' ? 'rag' : 'direct');
    }, 500);
}

// QA Functions
async function runQA() {
    showNotification('Running QA tests...', 'info');
    
    try {
        const response = await fetch('/api/qa/run');
        const results = await response.json();
        
        // Display QA results in modal
        const modalContent = `
            <div class="space-y-4">
                <h4 class="font-semibold">QA Test Results</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center">
                        <p class="text-2xl font-bold ${results.summary.failed > 0 ? 'text-red-600' : 'text-green-600'}">
                            ${results.summary.passed}/${results.summary.total_tests}
                        </p>
                        <p class="text-sm text-gray-600">Tests Passed</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold">${results.summary.pass_rate.toFixed(0)}%</p>
                        <p class="text-sm text-gray-600">Pass Rate</p>
                    </div>
                </div>
                
                <div class="space-y-2 max-h-64 overflow-y-auto">
                    ${results.tests.map(test => `
                        <div class="border rounded p-2">
                            <div class="flex justify-between">
                                <span class="font-medium">${test.name}</span>
                                <span class="text-sm ${test.status === 'passed' ? 'text-green-600' : 'text-red-600'}">
                                    ${test.status.toUpperCase()}
                                </span>
                            </div>
                            ${test.message ? `<p class="text-sm text-gray-600">${test.message}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        showModal('QA Test Results', modalContent);
        
    } catch (error) {
        showNotification('Error running QA tests', 'error');
    }
}

// System Functions
async function checkSystemHealth() {
    try {
        const response = await fetch('/api/health');
        const health = await response.json();
        
        if (health.status === 'healthy') {
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

window.showSystemInfo = async function showSystemInfo() {
    try {
        const response = await fetch('/api/system/info');
        const info = await response.json();
        
        const content = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-semibold mb-2">RAG System Statistics</h4>
                    <div class="bg-gray-50 p-3 rounded">
                        <p>Total Skills: ${info.rag_stats.total_skills}</p>
                        <p>Embedding Dimension: ${info.rag_stats.embedding_dimension}</p>
                        <p>Device: ${info.rag_stats.device}</p>
                        <p>Memory Usage: ${info.rag_stats.memory_usage_mb.toFixed(2)} MB</p>
                    </div>
                </div>
                
                <div>
                    <h4 class="font-semibold mb-2">Provider Status</h4>
                    <div class="flex gap-2">
                        ${Object.entries(info.provider_status).map(([provider, status]) => `
                            <span class="px-2 py-1 rounded text-sm ${status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                                ${provider}: ${status ? 'Ready' : 'Not configured'}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-semibold mb-2">Implementation Comparison</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="px-3 py-2 text-left">Method</th>
                                    <th class="px-3 py-2">Complexity</th>
                                    <th class="px-3 py-2">Performance</th>
                                    <th class="px-3 py-2">Accuracy</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(info.implementation_comparison.comparison).map(([method, details]) => `
                                    <tr class="border-b">
                                        <td class="px-3 py-2 font-medium">${method}</td>
                                        <td class="px-3 py-2 text-center">${details.complexity}</td>
                                        <td class="px-3 py-2 text-center">${details.performance}</td>
                                        <td class="px-3 py-2 text-center">${details.accuracy}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                        <strong>Recommendation:</strong> ${info.implementation_comparison.recommendation}
                    </p>
                </div>
            </div>
        `;
        
        document.getElementById('system-info-content').innerHTML = content;
        document.getElementById('system-modal').classList.remove('hidden');
        
    } catch (error) {
        showNotification('Error loading system info', 'error');
    }
}

function closeSystemInfo() {
    document.getElementById('system-modal').classList.add('hidden');
}

// Global variables
let currentSettings = {};
let initialSkillsData = null;
let enhancedSkillsData = null;
let currentEnvironment = null;

// Preset API keys - Set these via environment variables
const PRESET_OPENAI_KEY = process.env.OPENAI_API_KEY || "your-openai-key";
const PRESET_GEMINI_KEY = process.env.GEMINI_API_KEY || "your-gemini-key";

// Preset key functions
async function applyPresetOpenAI() {
    const preset = document.getElementById('preset-openai').value;
    const openaiInput = document.getElementById('api-openai');
    
    if (preset === 'preset') {
        openaiInput.value = PRESET_OPENAI_KEY;
        updateAIProviderStatus('openai-ai-status', true);
        showNotification('Preset OpenAI key applied', 'success');
        // Automatically save the key
        await saveApiKeys();
    } else {
        openaiInput.value = '';
        updateAIProviderStatus('openai-ai-status', false);
    }
}

async function applyPresetGoogle() {
    const preset = document.getElementById('preset-google').value;
    const googleInput = document.getElementById('api-google');
    
    if (preset === 'preset') {
        googleInput.value = PRESET_GEMINI_KEY;
        updateAIProviderStatus('google-ai-status', true);
        showNotification('Preset Google key applied', 'success');
        // Automatically save the key
        await saveApiKeys();
    } else {
        googleInput.value = '';
        updateAIProviderStatus('google-ai-status', false);
    }
}

function updateAIProviderStatus(elementId, hasValue) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }
    if (hasValue) {
        element.className = 'fas fa-circle text-green-500 mr-2';
    } else {
        element.className = 'fas fa-circle text-gray-400 mr-2';
    }
}

// Load and display assessment settings
async function loadAssessmentSettings() {
    try {
        const response = await fetch('/api/settings/assessment');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        currentSettings = await response.json();

        // Store the verbose prompt from server for later use if needed
        // But don't set it in the textarea - let prompt-manager.js handle that
        if (currentSettings.proficiency_prompt) {
            // Store verbose prompt in the template if needed
            if (window.promptTemplates) {
                window.promptTemplates.verbose = currentSettings.proficiency_prompt;
            }
        }

        // Don't set any prompt here - prompt-manager.js will handle it
        
        // Display editable proficiency levels
        displayProficiencyLevels();
        
        // Display current levels in the main view
        const levelsDisplay = document.getElementById('proficiency-levels-display');
        if (levelsDisplay && currentSettings.proficiency_levels) {
            const levelsList = Object.entries(currentSettings.proficiency_levels)
                .sort(([,a], [,b]) => a - b)
                .map(([name, value]) => `${name} (${value})`)
                .join(', ');
            levelsDisplay.textContent = levelsList;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error loading assessment settings:', error);
        return false;
    }
}

// Make this function available globally for testing
window.reloadPrompt = loadAssessmentSettings;

// Simple direct test function
window.testPromptLoad = async function() {
    
    const promptField = document.getElementById('assessment-prompt');
    if (!promptField) {
        return false;
    }
    
    
    // Test with simple content first
    promptField.value = 'TEST CONTENT - If you see this, the textarea is working!';
    
    // Now try loading from API
    try {
        const response = await fetch('/api/settings/assessment');
        const data = await response.json();
        
        if (data.proficiency_prompt) {
            promptField.value = data.proficiency_prompt;
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
};

// Force load prompt into Step 3 textarea - debugging function
window.forceLoadPrompt = async function() {
    
    // First, make sure Step 3 is expanded
    const content = document.getElementById('proficiency-section-content');
    if (content && content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        const icon = document.getElementById('proficiency-toggle-icon');
        if (icon) {
            icon.className = 'fas fa-chevron-up text-xl';
        }
    }
    
    const promptField = document.getElementById('assessment-prompt');
    if (!promptField) {
        return false;
    }
    
    try {
        const response = await fetch('/api/settings/assessment');
        const settings = await response.json();
        
        if (settings.proficiency_prompt) {
            promptField.value = settings.proficiency_prompt;
            
            // Highlight the textarea
            promptField.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                promptField.style.backgroundColor = '';
            }, 2000);
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
};

// Ensure Step 3 is expanded on page load
window.expandStep3 = function() {
    const content = document.getElementById('proficiency-section-content');
    if (content && content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        const icon = document.getElementById('proficiency-toggle-icon');
        if (icon) {
            icon.className = 'fas fa-chevron-up text-xl';
        }
        return true;
    }
    return false;
};

// Display proficiency levels in editor
function displayProficiencyLevels() {
    const editor = document.getElementById('proficiency-levels-editor');
    if (!editor) {
        return;
    }
    editor.innerHTML = '';
    
    // Sort levels by value
    const sortedLevels = Object.entries(currentSettings.proficiency_levels)
        .sort(([,a], [,b]) => a - b);
    
    sortedLevels.forEach(([name, value]) => {
        const levelDiv = document.createElement('div');
        levelDiv.className = 'flex items-center gap-2';
        levelDiv.innerHTML = `
            <input type="text" 
                   data-level-name="${name}" 
                   value="${name}" 
                   class="flex-1 px-2 py-1 border rounded text-sm"
                   placeholder="Level name">
            <input type="text" 
                   data-level-value="${name}" 
                   value="${value}" 
                   class="w-16 px-2 py-1 border rounded text-sm"
                   placeholder="Value">
            <button onclick="removeLevel('${name}')" 
                    class="text-red-600 hover:text-red-700">
                <i class="fas fa-trash text-sm"></i>
            </button>
        `;
        editor.appendChild(levelDiv);
    });
    
    // Add new level button
    const addButton = document.createElement('button');
    addButton.className = 'text-blue-600 hover:text-blue-700 text-sm mt-2';
    addButton.innerHTML = '<i class="fas fa-plus mr-1"></i>Add Level';
    addButton.onclick = addProficiencyLevel;
    editor.appendChild(addButton);
}

// Toggle proficiency configuration
function toggleProficiencyConfig() {
    const config = document.getElementById('proficiency-config');
    const toggleText = document.getElementById('config-toggle-text');
    
    if (config.classList.contains('hidden')) {
        config.classList.remove('hidden');
        toggleText.textContent = 'Close';
    } else {
        config.classList.add('hidden');
        toggleText.textContent = 'Edit';
    }
}

// Add new proficiency level
function addProficiencyLevel() {
    const maxValue = Math.max(...Object.values(currentSettings.proficiency_levels), 0) + 1;
    const newName = `Level ${maxValue}`;
    currentSettings.proficiency_levels[newName] = maxValue;
    displayProficiencyLevels();
}

// Remove proficiency level
function removeLevel(name) {
    delete currentSettings.proficiency_levels[name];
    displayProficiencyLevels();
}

// Save proficiency levels
async function saveProficiencyLevels() {
    const editor = document.getElementById('proficiency-levels-editor');
    const newLevels = {};
    
    // Collect all level inputs
    const nameInputs = editor.querySelectorAll('input[data-level-name]');
    nameInputs.forEach(input => {
        const oldName = input.getAttribute('data-level-name');
        const newName = input.value.trim();
        const valueInput = editor.querySelector(`input[data-level-value="${oldName}"]`);
        
        if (newName && valueInput) {
            newLevels[newName] = parseInt(valueInput.value);
        }
    });
    
    try {
        const response = await fetch('/api/settings/proficiency-levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ levels: newLevels })
        });
        
        const result = await response.json();
        if (result.success) {
            currentSettings.proficiency_levels = result.proficiency_levels;
            showNotification('Proficiency levels updated successfully', 'success');
            displayProficiencyLevels();
        } else {
            showNotification('Error updating proficiency levels', 'error');
        }
    } catch (error) {
        showNotification('Error saving proficiency levels', 'error');
        console.error(error);
    }
}

// Utility Functions
function showLoading(show) {
    const container = document.getElementById('results-container');
    if (show) {
        container.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                    <p class="text-gray-600">Processing assessment...</p>
                </div>
            </div>
        `;
    }
}

function showNotification(message, type) {
    const colors = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-yellow-500',
        'info': 'bg-blue-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white ${colors[type] || colors.info} shadow-lg z-50 transition-opacity`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showModal(title, content) {
    // Close any existing modal first
    const existingModal = document.querySelector('.modal-container');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 modal-container';
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold">${title}</h3>
                    <button onclick="this.closest('.modal-container').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${content}
            </div>
        </div>
    `;
    
    // Add click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

async function exportResults(result) {
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skills_assessment_${new Date().toISOString()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('Results exported', 'success');
}

// Toggle additional providers
function toggleAdditionalProviders() {
    const additionalProviders = document.getElementById('additional-providers');
    const toggleBtn = document.getElementById('toggle-providers-btn');
    
    if (additionalProviders.classList.contains('hidden')) {
        additionalProviders.classList.remove('hidden');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i>Show fewer providers';
    } else {
        additionalProviders.classList.add('hidden');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>Show more providers';
    }
}

// Auto-show additional providers if they are configured
function checkAndShowAdditionalProviders() {
    const anthropicInput = document.getElementById('api-anthropic');
    const grokInput = document.getElementById('api-grok');
    
    if ((anthropicInput && anthropicInput.value.trim()) || (grokInput && grokInput.value.trim())) {
        const additionalProviders = document.getElementById('additional-providers');
        const toggleBtn = document.getElementById('toggle-providers-btn');
        
        additionalProviders.classList.remove('hidden');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i>Show fewer providers';
    }
}

// Manual refresh function for debugging
window.refreshDropdowns = async function() {
    await loadConfigurations();
    await loadAPITestConfigurations();
}

// Configuration Management Functions
async function loadConfigurations() {
    try {
        const response = await fetch('/api/environments');
        const data = await response.json();
        
        const selector = document.getElementById('config-selector');
        if (!selector) {
            return;
        }
        
        // Handle array format from API
        if (data.environments && data.environments.length > 0) {
            selector.innerHTML = '';
            
            // Add placeholder option
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '── Select Configuration ──';
            placeholder.disabled = true;
            selector.appendChild(placeholder);
            
            // Add configurations to selector
            for (const name of data.environments) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                if (name === data.current) {
                    option.selected = true;
                }
                selector.appendChild(option);
            }
            
            // If no current environment is selected, show placeholder
            if (!data.current || !data.environments.includes(data.current)) {
                selector.value = '';
            }
        }
        
        // Set the current selection if it exists
        if (data.current && data.environments.includes(data.current)) {
            selector.value = data.current;
        }
        
    } catch (error) {
        console.error('Error loading configurations:', error);
        // Keep the static options if API fails
        const selector = document.getElementById('config-selector');
        if (selector && selector.options.length > 0) {
            // Set USAA TM Sandbox as selected by default
            selector.value = 'USAA TM Sandbox';
        }
    }
}

async function loadCurrentConfiguration() {
    try {
        const response = await fetch('/api/environments/current');
        const data = await response.json();
        
        // Handle the response - now includes both current and config
        if (data.current) {
            // Set the dropdown to the current environment
            const selector = document.getElementById('config-selector');
            if (selector) {
                selector.value = data.current;
            }
            
            // Load the configuration data if available
            if (data.config) {
                // Populate Eightfold credentials
                if (data.config.eightfold_username) {
                    document.getElementById('api-eightfold-username').value = data.config.eightfold_username;
                }
                if (data.config.eightfold_password) {
                    document.getElementById('api-eightfold-password').value = data.config.eightfold_password;
                }
                
                // Populate LLM API keys
                if (data.config.openai_api_key) {
                    document.getElementById('api-openai').value = data.config.openai_api_key;
                }
                if (data.config.google_api_key) {
                    document.getElementById('api-google').value = data.config.google_api_key;
                }
                if (data.config.anthropic_api_key) {
                    document.getElementById('api-anthropic').value = data.config.anthropic_api_key;
                }
                if (data.config.grok_api_key) {
                    document.getElementById('api-grok').value = data.config.grok_api_key;
                }
                
                // Update configuration status with the loaded config
                updateConfigurationStatus(data.config);
            } else {
                // No config data - show not configured
                updateConfigurationStatus({});
            }
        }
        
        // Check if additional providers should be shown
        checkAndShowAdditionalProviders();
        
    } catch (error) {
        console.error('Error loading current configuration:', error);
        // Update configuration status with empty config to avoid errors
        updateConfigurationStatus({});
    }
}

function updateConfigurationStatus(config) {
    // Check if config exists first
    if (!config) {
        config = {};
    }
    // Update Eightfold status
    const eightfoldConfigured = config.eightfold_username && config.eightfold_username.trim();
    const eightfoldStatus = document.getElementById('eightfold-status');
    const eightfoldStatusText = document.getElementById('eightfold-status-text');
    
    if (eightfoldStatus) {
        eightfoldStatus.className = eightfoldConfigured 
            ? 'fas fa-circle text-green-500 mr-1'
            : 'fas fa-circle text-gray-400 mr-1';
    }
    
    if (eightfoldStatusText) {
        eightfoldStatusText.textContent = eightfoldConfigured 
            ? `Configured (${config.eightfold_username})`
            : 'Not configured';
    }
    
    // Update AI provider status
    updateAIProviderStatus('openai-ai-status', config.openai_api_key);
    updateAIProviderStatus('anthropic-ai-status', config.anthropic_api_key);
    updateAIProviderStatus('google-ai-status', config.google_api_key);
    updateAIProviderStatus('grok-ai-status', config.grok_api_key);
    
    // Update preset dropdowns
    const presetOpenai = document.getElementById('preset-openai');
    const presetGoogle = document.getElementById('preset-google');
    
    if (presetOpenai) {
        if (config.openai_api_key === PRESET_OPENAI_KEY) {
            presetOpenai.value = 'preset';
        } else {
            presetOpenai.value = '';
        }
    }
    
    if (presetGoogle) {
        if (config.google_api_key === PRESET_GEMINI_KEY) {
            presetGoogle.value = 'preset';
        } else {
            presetGoogle.value = '';
        }
    }
}

async function loadConfiguration() {
    const selector = document.getElementById('config-selector');
    if (!selector) {
        return;
    }
    const selectedConfig = selector.value;
    
    if (!selectedConfig) {
        return;
    }
    
    // Load the configuration for the selected environment
    // No special handling for USAA TM Sandbox - treat it like any other environment
    
    try {
        const response = await fetch('/api/environments/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ environment: selectedConfig })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(`Loaded ${selectedConfig} configuration`, 'success');
            
            // Update the form fields with the loaded configuration
            if (result.config) {
                if (result.config.eightfold_username) {
                    document.getElementById('api-eightfold-username').value = result.config.eightfold_username;
                }
                if (result.config.eightfold_password) {
                    document.getElementById('api-eightfold-password').value = result.config.eightfold_password;
                }
                if (result.config.openai_api_key) {
                    document.getElementById('api-openai').value = result.config.openai_api_key;
                }
                if (result.config.google_api_key) {
                    document.getElementById('api-google').value = result.config.google_api_key;
                }
                if (result.config.anthropic_api_key) {
                    document.getElementById('api-anthropic').value = result.config.anthropic_api_key;
                }
                if (result.config.grok_api_key) {
                    document.getElementById('api-grok').value = result.config.grok_api_key;
                }
                
                // Save credentials to session
                await saveApiKeys();
                
                // Update status indicators
                updateConfigurationStatus(result.config);
            }
            
            // Automatically test Eightfold authentication if credentials are present
            const username = document.getElementById('api-eightfold-username').value;
            const password = document.getElementById('api-eightfold-password').value;
            if (username && password) {
                setTimeout(() => {
                    if (typeof window.testEightfoldAuth === 'function') {
                        window.testEightfoldAuth();
                    } else if (typeof testEightfoldAuth === 'function') {
                        testEightfoldAuth();
                    }
                }, 500);
            }
        } else {
            showNotification('Error loading configuration', 'error');
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        showNotification('Error loading configuration', 'error');
    }
}

function showConfigModal() {
    document.getElementById('config-modal').classList.remove('hidden');
}

function closeConfigModal() {
    document.getElementById('config-modal').classList.add('hidden');
    // Clear form
    document.getElementById('new-config-name').value = '';
    document.getElementById('new-config-description').value = '';
}

// New configuration modal functions
function showNewConfigModal() {
    document.getElementById('new-config-modal').classList.remove('hidden');
}

function closeNewConfigModal() {
    document.getElementById('new-config-modal').classList.add('hidden');
    // Clear form
    document.getElementById('new-config-name').value = '';
    document.getElementById('new-config-description').value = '';
    document.getElementById('new-config-api-url').value = 'https://apiv2.eightfold.ai';
    document.getElementById('new-config-username').value = '';
    document.getElementById('new-config-password').value = '';
}

async function createNewConfiguration() {
    const name = document.getElementById('new-config-name').value.trim();
    const description = document.getElementById('new-config-description').value.trim();
    const apiUrl = document.getElementById('new-config-api-url').value.trim();
    const username = document.getElementById('new-config-username').value.trim();
    const password = document.getElementById('new-config-password').value;
    
    if (!name) {
        showNotification('Configuration name is required', 'warning');
        return;
    }
    
    // Create new configuration with provided data
    const config = {
        description: description,
        eightfold_api_url: apiUrl || 'https://apiv2.eightfold.ai',
        eightfold_username: username,
        eightfold_password: password,
        openai_api_key: '',
        anthropic_api_key: '',
        google_api_key: '',
        grok_api_key: ''
    };
    
    try {
        const response = await fetch('/api/environments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                config: config
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(`Configuration "${name}" created successfully`, 'success');
            closeNewConfigModal();
            await loadConfigurations();
            
            // Switch to the new configuration
            document.getElementById('config-selector').value = name;
            await loadConfiguration();
            
            // If credentials were provided, save them to the session
            if (username || password) {
                const keys = {};
                if (username) keys.eightfold_username = username;
                if (password) keys.eightfold_password = password;
                
                await fetch('/api/keys/set', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(keys)
                });
            }
        } else {
            showNotification(result.error || 'Error creating configuration', 'error');
        }
    } catch (error) {
        showNotification('Error creating configuration', 'error');
    }
}

async function saveConfiguration() {
    const name = document.getElementById('save-config-name').value.trim();
    const description = document.getElementById('save-config-description').value.trim();
    
    if (!name) {
        showNotification('Configuration name is required', 'warning');
        return;
    }
    
    // Get current form values
    const config = {
        description: description,
        openai_api_key: document.getElementById('api-openai').value,
        anthropic_api_key: document.getElementById('api-anthropic').value,
        google_api_key: document.getElementById('api-google').value,
        grok_api_key: document.getElementById('api-grok').value,
        eightfold_username: document.getElementById('api-eightfold-username').value,
        eightfold_api_url: currentEnvironment?.eightfold_api_url || 'https://apiv2.eightfold.ai'
        // Don't save password
    };
    
    try {
        const response = await fetch('/api/environments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                config: config
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(`Configuration "${name}" saved successfully`, 'success');
            closeConfigModal();
            await loadConfigurations();
            
            // Switch to the new configuration
            document.getElementById('config-selector').value = name;
            await loadConfiguration();
        } else {
            showNotification(result.error || 'Error saving configuration', 'error');
        }
    } catch (error) {
        showNotification('Error saving configuration', 'error');
    }
}

async function editConfiguration() {
    const selector = document.getElementById('config-selector');
    const selectedConfig = selector.value;
    
    if (!selectedConfig) {
        showNotification('No configuration selected', 'warning');
        return;
    }
    
    // Check if it's a read-only configuration
    if (currentEnvironment && currentEnvironment.read_only) {
        showNotification(`Configuration "${selectedConfig}" is read-only and cannot be edited`, 'warning');
        return;
    }
    
    try {
        // Get the current configuration details
        const response = await fetch(`/api/environments`);
        const data = await response.json();
        const config = data.environments[selectedConfig];
        
        if (!config) {
            showNotification('Configuration not found', 'error');
            return;
        }
        
        // Show the new configuration modal but populate it with existing data
        document.getElementById('new-config-modal').classList.remove('hidden');
        
        // Update modal title
        const modalTitle = document.querySelector('#new-config-modal h3');
        modalTitle.textContent = 'Edit API Configuration';
        
        // Populate form fields
        document.getElementById('new-config-name').value = config.name || selectedConfig;
        document.getElementById('new-config-description').value = config.description || '';
        document.getElementById('new-config-api-url').value = config.eightfold_api_url || 'https://apiv2.eightfold.ai';
        document.getElementById('new-config-username').value = config.eightfold_username || '';
        // Show password for TM Sandbox since it's a demo environment
        if (selectedConfig === 'USAA TM Sandbox' && config.eightfold_password) {
            document.getElementById('new-config-password').value = config.eightfold_password;
        } else {
            document.getElementById('new-config-password').value = '';
        }
        
        // Update the button to save changes instead of creating new
        const saveButton = document.querySelector('#new-config-modal button[onclick="createNewConfiguration()"]');
        saveButton.textContent = 'Save Changes';
        saveButton.onclick = async function() {
            await updateExistingConfiguration(selectedConfig);
        };
        
    } catch (error) {
        showNotification('Error loading configuration', 'error');
    }
}

async function updateExistingConfiguration(originalName) {
    const name = document.getElementById('new-config-name').value.trim();
    const description = document.getElementById('new-config-description').value.trim();
    const apiUrl = document.getElementById('new-config-api-url').value.trim();
    const username = document.getElementById('new-config-username').value.trim();
    const password = document.getElementById('new-config-password').value;
    
    if (!name) {
        showNotification('Configuration name is required', 'warning');
        return;
    }
    
    // Build update config object
    const config = {
        name: name,
        description: description,
        eightfold_api_url: apiUrl || 'https://apiv2.eightfold.ai',
        eightfold_username: username
    };
    
    // Only include password if it was entered (don't overwrite with empty)
    if (password) {
        config.eightfold_password = password;
    }
    
    try {
        // If name changed, we need to delete old and create new
        if (name !== originalName) {
            // Create new configuration
            const createResponse = await fetch('/api/environments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    config: config
                })
            });
            
            if (createResponse.ok) {
                // Delete old configuration
                await fetch(`/api/environments/${originalName}`, {
                    method: 'DELETE'
                });
            }
        } else {
            // Just update the existing configuration
            const response = await fetch(`/api/environments/${originalName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            
            const result = await response.json();
            if (!result.success) {
                showNotification(result.error || 'Error updating configuration', 'error');
                return;
            }
        }
        
        showNotification(`Configuration "${name}" updated successfully`, 'success');
        
        // Reset modal and close
        closeNewConfigModal();
        
        // Reset the button back to create new
        const saveButton = document.querySelector('#new-config-modal button[onclick]');
        saveButton.textContent = 'Create Configuration';
        saveButton.onclick = createNewConfiguration;
        
        // Reset modal title
        const modalTitle = document.querySelector('#new-config-modal h3');
        modalTitle.textContent = 'New API Configuration';
        
        // Reload configurations and switch to updated one
        await loadConfigurations();
        document.getElementById('config-selector').value = name;
        await loadConfiguration();
        
        // Update credentials in session if provided
        if (username || password) {
            const keys = {};
            if (username) keys.eightfold_username = username;
            if (password) keys.eightfold_password = password;
            
            await fetch('/api/keys/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keys)
            });
        }
        
    } catch (error) {
        showNotification('Error updating configuration', 'error');
    }
}

async function deleteConfiguration() {
    const selector = document.getElementById('config-selector');
    const selectedConfig = selector.value;
    
    if (!selectedConfig) {
        showNotification('No configuration selected', 'warning');
        return;
    }
    
    if (selectedConfig === 'Default Configuration') {
        showNotification('Cannot delete default configuration', 'warning');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${selectedConfig}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/environments/${selectedConfig}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(`Configuration "${selectedConfig}" deleted`, 'success');
            await loadConfigurations();
        } else {
            showNotification(result.error || 'Error deleting configuration', 'error');
        }
    } catch (error) {
        showNotification('Error deleting configuration', 'error');
    }
}

// Save configuration to current environment
async function saveConfiguration() {
    const configuration = {
        eightfold_username: document.getElementById('api-eightfold-username').value,
        eightfold_password: document.getElementById('api-eightfold-password').value,
        openai_api_key: document.getElementById('api-openai').value,
        anthropic_api_key: document.getElementById('api-anthropic').value,
        google_api_key: document.getElementById('api-google').value,
        grok_api_key: document.getElementById('api-grok').value
    };
    
    try {
        const response = await fetch('/api/configuration/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configuration)
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Configuration saved successfully', 'success');
        } else {
            showNotification('Error saving configuration', 'error');
        }
        return result.success;
    } catch (error) {
        console.error('Error saving configuration:', error);
        showNotification('Error saving configuration', 'error');
        return false;
    }
}

// Test Eightfold authentication
// Note: The actual testEightfoldAuth function is defined in workflow.js
// This OLD version has been removed to avoid conflicts

// Update connection details in the UI
function updateConnectionDetails(username, apiUrl, token) {
    // Update API URL
    const apiUrlElem = document.getElementById('api-url');
    if (apiUrlElem) {
        apiUrlElem.textContent = apiUrl;
    }
    
    // Update Auth Status
    const authStatusElem = document.getElementById('api-auth-status');
    if (authStatusElem) {
        authStatusElem.innerHTML = '<span class="px-1 py-0.5 bg-green-200 text-green-700 rounded text-xs">Authenticated</span>';
    }
    
    // Update Username
    const usernameElem = document.getElementById('api-username');
    if (usernameElem) {
        usernameElem.textContent = username;
    }
    
    // Update Token Preview
    const tokenPreviewElem = document.getElementById('api-token-preview');
    if (tokenPreviewElem) {
        tokenPreviewElem.textContent = token ? token.substring(0, 20) + '...' : 'None';
    }
    
    // Update Last Response
    const lastResponseElem = document.getElementById('api-last-response');
    if (lastResponseElem) {
        const now = new Date().toLocaleTimeString();
        lastResponseElem.textContent = now;
    }
}

// Removed duplicate function - see testLLMKeys function below which handles actual API testing

async function saveApiKeys() {
    const keys = {};
    
    ['openai', 'anthropic', 'google', 'grok'].forEach(provider => {
        const value = document.getElementById(`api-${provider}`).value;
        if (value) keys[provider] = value;
    });
    
    // Eightfold credentials
    const eightfoldUsername = document.getElementById('api-eightfold-username').value;
    const eightfoldPassword = document.getElementById('api-eightfold-password').value;
    if (eightfoldUsername) keys.eightfold_username = eightfoldUsername;
    if (eightfoldPassword) keys.eightfold_password = eightfoldPassword;
    
    try {
        // First save to session
        const response = await fetch('/api/keys/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(keys)
        });
        
        const result = await response.json();
        if (result.success) {
            // Then update environment configuration
            if (currentEnvironment) {
                const envName = document.getElementById('config-selector').value;
                const updateData = {};
                
                // Only update non-password fields in environment
                if (keys.openai_api_key) updateData.openai_api_key = keys.openai_api_key;
                if (keys.anthropic_api_key) updateData.anthropic_api_key = keys.anthropic_api_key;
                if (keys.google_api_key) updateData.google_api_key = keys.google_api_key;
                if (keys.grok_api_key) updateData.grok_api_key = keys.grok_api_key;
                if (keys.eightfold_username) updateData.eightfold_username = keys.eightfold_username;
                
                await fetch(`/api/environments/${envName}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
            }
            
            showNotification('API keys saved successfully', 'success');
            updateApiStatus(result.providers_configured);
        }
    } catch (error) {
        showNotification('Error saving API keys', 'error');
    }
}

async function updateToAPI(proficiencies) {
    try {
        const response = await fetch('/api/skills/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proficiencies: proficiencies })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Updated ${result.updated} skills successfully`, 'success');
        } else {
            showNotification('Update failed: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Error updating skills', 'error');
    }
}

// Update active LLM provider display
function updateActiveLLMDisplay(provider) {
    const providerNames = {
        'openai': 'OpenAI (GPT-4)',
        'anthropic': 'Anthropic (Claude)',
        'google': 'Google (Gemini Pro 2.5)',
        'grok': 'Grok'
    };
    
    document.getElementById('active-llm-provider').textContent = providerNames[provider] || provider;
    
    // Check if provider is configured
    const statusElement = document.getElementById(provider + '-ai-status');
    const isConfigured = statusElement && statusElement.classList.contains('text-green-500');
    
    const llmStatusEl = document.getElementById('llm-provider-status');
    if (isConfigured) {
        llmStatusEl.innerHTML = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Ready</span>';
    } else {
        llmStatusEl.innerHTML = '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Not configured</span>';
    }
}

// Load implementation code for display
async function loadMethodCode(method) {
    try {
        const response = await fetch('/api/code/' + method);
        const data = await response.json();
        
        if (data.success) {
            // Load all three implementations
            document.getElementById('code-enhanced').value = data.codes.enhanced || '';
            document.getElementById('code-rag-enhanced').value = data.codes.rag_enhanced || '';
            document.getElementById('code-python').value = data.codes.python || '';
        }
    } catch (error) {
        console.error('Error loading code:', error);
    }
}

// Save and run modified code
async function saveAndRunCode(method) {
    const code = document.getElementById('code-' + method).value;
    const skills = document.getElementById('skills-list').value.split('\n').filter(s => s.trim());
    const provider = document.getElementById('llm-provider').value;
    
    if (skills.length === 0) {
        showNotification('Please enter skills to assess', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/assess/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                skills: skills,
                provider: provider,
                method: method,
                custom_code: code
            })
        });
        
        const result = await response.json();
        showLoading(false);
        
        if (result.success) {
            displayResults(result, method);
            showNotification('Code executed successfully', 'success');
        } else {
            showNotification('Code execution failed: ' + result.error, 'error');
        }
    } catch (error) {
        showLoading(false);
        showNotification('Error running custom code', 'error');
    }
}

// Compare different LLMs instead of methods
async function compareLLMs() {
    const skills = document.getElementById('skills-list').value.split('\n').filter(s => s.trim());
    const method = 'enhanced'; // Use enhanced approach for comparison
    
    if (skills.length === 0) {
        showNotification('Please enter skills to assess', 'warning');
        return;
    }
    
    showLoading(true);
    document.getElementById('comparison-section').classList.remove('hidden');
    
    try {
        const response = await fetch('/api/compare/llms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                skills: skills,
                method: method
            })
        });
        
        const result = await response.json();
        showLoading(false);
        
        if (result.success) {
            displayLLMComparison(result);
        } else {
            showNotification('LLM comparison failed: ' + result.error, 'error');
        }
    } catch (error) {
        showLoading(false);
        showNotification('Error during LLM comparison', 'error');
    }
}

// Display LLM comparison results
function displayLLMComparison(result) {
    const container = document.getElementById('comparison-results');
    const providers = result.providers || [];
    
    let html = '';
    
    providers.forEach(provider => {
        const providerResult = result.results[provider.id];
        if (!providerResult) return;
        
        const proficiencies = providerResult.proficiencies || [];
        const statusColor = provider.configured ? 'text-green-600' : 'text-red-600';
        const statusText = provider.configured ? 'Configured' : 'Not Configured';
        
        html += `
            <div class="border rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold">${provider.name}</h4>
                    <span class="text-xs ${statusColor}">${statusText}</span>
                </div>
                ${provider.configured ? `
                    <div class="text-sm space-y-2">
                        <p>Skills Assessed: ${proficiencies.length}</p>
                        <p>Processing Time: ${providerResult.processing_time?.toFixed(2) || 'N/A'}s</p>
                        
                        <div class="mt-3 space-y-1">
                            ${proficiencies.slice(0, 3).map(p => `
                                <div class="flex justify-between text-xs">
                                    <span>${p.skill?.name || p.skill_name || p.skill}</span>
                                    <span class="font-medium">${p.proficiency_level || p.proficiency}</span>
                                </div>
                            `).join('')}
                            ${proficiencies.length > 3 ? '<p class="text-xs text-gray-500">...</p>' : ''}
                        </div>
                    </div>
                ` : '<p class="text-sm text-gray-500">API key not configured</p>'}
            </div>
        `;
    });
    
    container.innerHTML = html || '<p class="text-center text-gray-500">No LLM providers available for comparison</p>';
}

// API Testing Functions
async function testAuthentication() {
    const authUrl = document.getElementById('api-test-auth-url').value;
    const username = document.getElementById('api-test-username').value;
    const password = document.getElementById('api-test-password').value;
    const preAuth = document.getElementById('api-test-preauth').value;
    
    // Clear previous results
    const resultsDiv = document.getElementById('api-test-results');
    resultsDiv.innerHTML = '';
    
    // Show request details
    const requestDetails = {
        url: authUrl,
        method: 'POST',
        headers: {
            'Authorization': `Basic ${preAuth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: {
            grantType: 'password',
            username: username,
            password: password
        }
    };
    
    // Display request details
    resultsDiv.innerHTML += `
        <div class="border rounded-lg p-4 bg-blue-50">
            <h3 class="font-semibold mb-2">🔐 Authentication Request</h3>
            <div class="space-y-2 text-sm">
                <div><strong>URL:</strong> <code class="bg-white px-2 py-1 rounded">${authUrl}</code></div>
                <div><strong>Method:</strong> POST</div>
                <div><strong>Headers:</strong>
                    <pre class="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">${JSON.stringify(requestDetails.headers, null, 2)}</pre>
                </div>
                <div><strong>Body:</strong>
                    <pre class="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">${JSON.stringify(requestDetails.body, null, 2)}</pre>
                </div>
            </div>
        </div>
    `;
    
    try {
        // Update status
        document.getElementById('auth-test-status').innerHTML = '<span class="text-yellow-600">Testing...</span>';
        
        const response = await fetch('/api/test/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                api_url: authUrl.replace('/oauth/v1/authenticate', '')
            })
        });
        
        const result = await response.json();
        
        // Show authentication code details
        if (result.code_details) {
            resultsDiv.innerHTML += `
                <div class="border rounded-lg p-4 bg-purple-50 mt-4">
                    <h3 class="font-semibold mb-2">📄 Python Code Being Executed</h3>
                    <pre class="bg-gray-900 text-green-400 p-4 rounded mt-2 overflow-x-auto text-xs font-mono">${result.code_details.python_code || 'No code details available'}</pre>
                </div>
                <div class="border rounded-lg p-4 bg-gray-50 mt-4">
                    <h3 class="font-semibold mb-2">📝 Authentication Request Details</h3>
                    <div class="space-y-2 text-sm">
                        <div><strong>Method:</strong> ${result.code_details.method}</div>
                        <div><strong>URL:</strong> <code class="bg-white px-2 py-1 rounded">${result.code_details.url}</code></div>
                        <div><strong>Headers:</strong>
                            <pre class="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">${JSON.stringify(result.code_details.headers, null, 2)}</pre>
                        </div>
                        <div><strong>Body:</strong>
                            <pre class="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">${JSON.stringify(result.code_details.body, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Display response
        resultsDiv.innerHTML += `
            <div class="border rounded-lg p-4 mt-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}">
                <h3 class="font-semibold mb-2">${result.success ? '✅' : '❌'} Authentication Response</h3>
                <div class="space-y-2 text-sm">
                    <div><strong>Status:</strong> ${response.status} ${response.statusText}</div>
                    <div><strong>Success:</strong> ${result.success}</div>
                    ${result.auth_response && result.auth_response.bearer_token ? `
                        <div class="mt-2 p-3 bg-white rounded border">
                            <strong class="block mb-2">🔑 Full Bearer Token:</strong>
                            <div class="bg-gray-100 p-2 rounded">
                                <code class="text-xs break-all font-mono">${result.auth_response.bearer_token}</code>
                            </div>
                            <button onclick="navigator.clipboard.writeText('${result.auth_response.bearer_token}')" class="mt-2 text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700">
                                <i class="fas fa-copy mr-1"></i>Copy Token
                            </button>
                        </div>
                    ` : ''}
                    ${result.error ? `<div><strong>Error:</strong> ${result.error}</div>` : ''}
                </div>
            </div>
        `;
        
        // Display API test response if available
        if (result.api_response) {
            resultsDiv.innerHTML += `
                <div class="border rounded-lg p-4 mt-4 bg-indigo-50">
                    <h3 class="font-semibold mb-2">🔍 API Test Call Response</h3>
                    <div class="space-y-3 text-sm">
                        <div><strong>Endpoint:</strong> <code class="bg-white px-2 py-1 rounded text-xs">${result.api_response.url}</code></div>
                        <div><strong>Method:</strong> ${result.api_response.method}</div>
                        <div><strong>Status Code:</strong> <span class="${result.api_response.status_code === 200 ? 'text-green-600' : 'text-red-600'} font-medium">${result.api_response.status_code || 'N/A'}</span></div>
                        ${result.api_response.headers ? `
                            <div>
                                <strong>Response Headers:</strong>
                                <pre class="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">${JSON.stringify(result.api_response.headers, null, 2)}</pre>
                            </div>
                        ` : ''}
                        <div>
                            <strong>Response Body:</strong>
                            <pre class="bg-white p-2 rounded mt-1 overflow-x-auto text-xs max-h-64">${result.api_response.error ? result.api_response.error : JSON.stringify(result.api_response.body, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (result.success && result.auth_response && result.auth_response.bearer_token) {
            // Auto-fill bearer token field
            document.getElementById('api-test-bearer').value = result.auth_response.bearer_token;
            document.getElementById('auth-test-status').innerHTML = '<span class="text-green-600">✓ Authenticated</span>';
            
            // Show notification
            showNotification('Authentication successful! Bearer token has been populated.', 'success');
        } else {
            document.getElementById('auth-test-status').innerHTML = '<span class="text-red-600">✗ Failed</span>';
            showNotification(result.error || 'Authentication failed', 'error');
        }
        
    } catch (error) {
        resultsDiv.innerHTML += `
            <div class="border rounded-lg p-4 mt-4 bg-red-50">
                <h3 class="font-semibold mb-2">❌ Error</h3>
                <div class="text-sm">${error.message}</div>
            </div>
        `;
        document.getElementById('auth-test-status').innerHTML = '<span class="text-red-600">✗ Error</span>';
        showNotification('Error during authentication: ' + error.message, 'error');
    }
}

// Removed duplicate testAPICall function - using the one below

async function loadAPITestConfig() {
    const selector = document.getElementById('api-test-config');
    const selectedConfig = selector.value;
    
    if (!selectedConfig) return;
    
    try {
        // Get environment data
        const response = await fetch('/api/environments');
        const data = await response.json();
        
        const env = data.environments[selectedConfig];
        if (env) {
            // Fill in the fields
            if (env.eightfold_username) {
                document.getElementById('api-test-username').value = env.eightfold_username;
            }
            if (env.eightfold_password) {
                document.getElementById('api-test-password').value = env.eightfold_password;
            }
            if (env.eightfold_api_url) {
                document.getElementById('api-test-auth-url').value = env.eightfold_api_url + '/oauth/v1/authenticate';
            }
            
            showNotification(`Loaded ${selectedConfig} configuration`, 'success');
        }
    } catch (error) {
        showNotification('Error loading configuration: ' + error.message, 'error');
    }
}

function clearAPITestResults() {
    document.getElementById('api-test-results').innerHTML = `
        <div class="text-center text-gray-500 py-8">
            <i class="fas fa-info-circle text-4xl mb-4"></i>
            <p>Authentication and API call results will appear here</p>
            <p class="text-sm mt-2">All request details including URLs, headers, and tokens will be shown</p>
        </div>
    `;
    document.getElementById('auth-test-status').innerHTML = 'Not tested';
    document.getElementById('api-call-status').innerHTML = 'Not tested';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
        showNotification('Failed to copy: ' + err, 'error');
    });
}

function saveAPITestResults() {
    const results = document.getElementById('api-test-results').innerHTML;
    const blob = new Blob([results], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-test-results-${new Date().toISOString()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Results saved!', 'success');
}

// Tab switching functionality
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active state from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab content
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // Add active state to selected tab
    const activeTab = document.getElementById(`tab-${tabName}`);
    activeTab.classList.remove('border-transparent', 'text-gray-500');
    activeTab.classList.add('border-blue-500', 'text-blue-600');
}

// API Tester Functions
function initializeAPITester() {
    // Load configurations into API tester dropdown
    loadAPITesterConfigs();
}

// API Test Configuration Management
let apiTestConfigs = JSON.parse(localStorage.getItem('apiTestConfigs') || '{}');
let currentAPIConfigName = null;

function showNewAPIConfigModal() {
    document.getElementById('api-config-modal').classList.remove('hidden');
    document.getElementById('api-config-name').value = '';
    document.getElementById('api-config-auth-url').value = 'https://apiv2.eightfold.ai/oauth/v1/authenticate';
    document.getElementById('api-config-username').value = '';
    document.getElementById('api-config-password').value = '';
    document.getElementById('api-config-endpoint').value = '';
    document.getElementById('api-config-method').value = 'GET';
    currentAPIConfigName = null;
}

function closeAPIConfigModal() {
    document.getElementById('api-config-modal').classList.add('hidden');
    currentAPIConfigName = null;
}

function saveAPIConfiguration() {
    const name = document.getElementById('api-config-name').value.trim();
    if (!name) {
        showNotification('Configuration name is required', 'error');
        return;
    }
    
    const config = {
        authUrl: document.getElementById('api-config-auth-url').value,
        username: document.getElementById('api-config-username').value,
        password: document.getElementById('api-config-password').value,
        endpoint: document.getElementById('api-config-endpoint').value,
        method: document.getElementById('api-config-method').value
    };
    
    // If editing, delete the old config
    if (currentAPIConfigName && currentAPIConfigName !== name) {
        delete apiTestConfigs[currentAPIConfigName];
    }
    
    apiTestConfigs[name] = config;
    localStorage.setItem('apiTestConfigs', JSON.stringify(apiTestConfigs));
    
    loadAPITesterConfigs();
    closeAPIConfigModal();
    showNotification(`Configuration "${name}" saved`, 'success');
}

function loadAPITesterConfigs() {
    const select = document.getElementById('api-test-config');
    if (!select) {
        return;
    }
    select.innerHTML = '<option value="">-- Select Configuration --</option>';
    
    for (const [name, config] of Object.entries(apiTestConfigs)) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
}

function editAPIConfig() {
    const selected = document.getElementById('api-test-config').value;
    if (!selected) {
        showNotification('Please select a configuration to edit', 'warning');
        return;
    }
    
    const config = apiTestConfigs[selected];
    if (!config) return;
    
    document.getElementById('api-config-modal').classList.remove('hidden');
    document.getElementById('api-config-name').value = selected;
    document.getElementById('api-config-auth-url').value = config.authUrl || '';
    document.getElementById('api-config-username').value = config.username || '';
    document.getElementById('api-config-password').value = config.password || '';
    document.getElementById('api-config-endpoint').value = config.endpoint || '';
    document.getElementById('api-config-method').value = config.method || 'GET';
    currentAPIConfigName = selected;
}

function deleteAPIConfig() {
    const selected = document.getElementById('api-test-config').value;
    if (!selected) {
        showNotification('Please select a configuration to delete', 'warning');
        return;
    }
    
    if (confirm(`Delete configuration "${selected}"?`)) {
        delete apiTestConfigs[selected];
        localStorage.setItem('apiTestConfigs', JSON.stringify(apiTestConfigs));
        loadAPITesterConfigs();
        clearAPITestForm();
        showNotification(`Configuration "${selected}" deleted`, 'success');
    }
}

function saveCurrentAPIConfig() {
    const authUrl = document.getElementById('api-test-auth-url').value;
    const username = document.getElementById('api-test-username').value;
    const endpoint = document.getElementById('api-test-endpoint').value;
    
    if (!authUrl || !username) {
        showNotification('Auth URL and username are required', 'error');
        return;
    }
    
    // Prompt for configuration name
    const name = prompt('Enter a name for this configuration:');
    if (!name) return;
    
    const config = {
        authUrl: authUrl,
        username: username,
        password: document.getElementById('api-test-password').value,
        endpoint: endpoint,
        method: document.getElementById('api-test-method').value
    };
    
    apiTestConfigs[name] = config;
    localStorage.setItem('apiTestConfigs', JSON.stringify(apiTestConfigs));
    
    loadAPITesterConfigs();
    document.getElementById('api-test-config').value = name;
    showNotification(`Configuration "${name}" saved`, 'success');
}

function clearAPITestForm() {
    document.getElementById('api-test-config').value = '';
    document.getElementById('api-test-auth-url').value = 'https://apiv2.eightfold.ai/oauth/v1/authenticate';
    document.getElementById('api-test-username').value = '';
    document.getElementById('api-test-password').value = '';
    document.getElementById('api-test-preauth').value = 'MU92YTg4T1JyMlFBVktEZG8wc1dycTdEOnBOY1NoMno1RlFBMTZ6V2QwN3cyeUFvc3QwTU05MmZmaXFFRDM4ZzJ4SFVyMGRDaw==';
    document.getElementById('api-test-endpoint').value = '';
    document.getElementById('api-test-method').value = 'GET';
    document.getElementById('api-test-bearer').value = '';
    document.getElementById('api-endpoint-preset').value = '';
    document.getElementById('endpoint-info').classList.add('hidden');
    document.getElementById('api-body-section').classList.add('hidden');
}

async function loadAPITesterConfigs() {
    try {
        const response = await fetch('/api/environments');
        const data = await response.json();
        
        const selector = document.getElementById('api-test-config');
        if (!selector) {
            return;
        }
        selector.innerHTML = '<option value="">-- Select Configuration --</option>';
        
        for (const [name, env] of Object.entries(data.environments)) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selector.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading configurations:', error);
    }
}

function loadAPITestConfig() {
    const configName = document.getElementById('api-test-config').value;
    if (!configName) return;
    
    // Get configuration from stored environments
    fetch('/api/environments')
        .then(response => response.json())
        .then(data => {
            const config = data.environments[configName];
            if (config) {
                document.getElementById('api-test-username').value = config.eightfold_username || '';
                document.getElementById('api-test-password').value = config.eightfold_password || '';
                if (config.eightfold_api_url) {
                    const authUrl = config.eightfold_api_url + '/oauth/v1/authenticate';
                    document.getElementById('api-test-auth-url').value = authUrl;
                }
            }
        });
}

async function testAuthentication() {
    const authUrl = document.getElementById('api-test-auth-url').value;
    const username = document.getElementById('api-test-username').value;
    const password = document.getElementById('api-test-password').value;
    const preAuth = document.getElementById('api-test-preauth').value;
    
    // Update status
    document.getElementById('auth-test-status').textContent = 'Testing...';
    document.getElementById('auth-test-status').className = 'text-sm text-yellow-600';
    
    // Show authentication code/request details
    const authenticationCode = `# OAuth Password Grant Authentication
import requests

# OAuth endpoint
auth_url = "${authUrl}"

# Required Authorization header for OAuth
headers = {
    "Authorization": "Basic ${preAuth}",
    "Content-Type": "application/json"
}

# Request body with password grant
body = {
    "grantType": "password",
    "username": "${username}",
    "password": "${password}"
}

# Make authentication request
response = requests.post(auth_url, headers=headers, json=body)

if response.status_code == 200:
    data = response.json()
    # Token is in data.access_token structure
    token_data = data.get("data", {})
    access_token = token_data.get("access_token")
    print(f"Successfully authenticated! Token: {access_token[:50]}...")
else:
    print(f"Authentication failed: {response.status_code}")
    print(f"Response: {response.text}")`;
    
    document.getElementById('api-test-request').textContent = authenticationCode;
    
    try {
        const response = await fetch('/api/test/authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_url: authUrl,
                username: username,
                password: password,
                pre_auth: preAuth
            })
        });
        
        const result = await response.json();
        
        // Update response display - show the authentication response JSON
        document.getElementById('api-test-response').textContent = JSON.stringify(result.auth_response, null, 2);
        
        if (result.success && result.bearer_token) {
            document.getElementById('auth-test-status').textContent = 'Success - Token received';
            document.getElementById('auth-test-status').className = 'text-sm text-green-600';
            
            // Hide error if success
            document.getElementById('api-test-error').classList.add('hidden');
        } else {
            document.getElementById('auth-test-status').textContent = `Failed - ${result.status_code || 'Unknown error'}`;
            document.getElementById('auth-test-status').className = 'text-sm text-red-600';
            document.getElementById('api-test-bearer').value = '';
        }
        
        // Show/hide error
        if (result.error) {
            document.getElementById('api-test-error').classList.remove('hidden');
            document.getElementById('api-test-error-msg').textContent = result.error;
        } else {
            document.getElementById('api-test-error').classList.add('hidden');
        }
        
    } catch (error) {
        document.getElementById('auth-test-status').textContent = 'Error - Request failed';
        document.getElementById('auth-test-status').className = 'text-sm text-red-600';
        document.getElementById('api-test-response').textContent = error.toString();
    }
}

async function testAPICall() {
    const baseUrl = document.getElementById('api-test-auth-url').value.replace('/oauth/v1/authenticate', '');
    const endpoint = document.getElementById('api-test-endpoint').value;
    const method = document.getElementById('api-test-method').value;
    const token = document.getElementById('api-test-bearer').value;
    
    if (!token) {
        showNotification('Please authenticate first to get a bearer token', 'warning');
        return;
    }
    
    // Update status
    document.getElementById('api-call-status').textContent = 'Testing...';
    document.getElementById('api-call-status').className = 'text-sm text-yellow-600';
    
    // Get request body if applicable
    let requestBody = null;
    if (method === 'POST' || method === 'PUT') {
        const bodyText = document.getElementById('api-test-body').value;
        if (bodyText) {
            try {
                requestBody = JSON.parse(bodyText);
            } catch (e) {
                showNotification('Invalid JSON in request body', 'error');
                return;
            }
        }
    }
    
    // Show request details
    const requestDetails = {
        url: baseUrl + endpoint,
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (requestBody) {
        requestDetails.body = requestBody;
    }
    
    document.getElementById('api-test-request').textContent = JSON.stringify(requestDetails, null, 2);
    
    try {
        const requestPayload = {
            url: baseUrl + endpoint,
            method: method,
            token: token
        };
        
        if (requestBody) {
            requestPayload.body = requestBody;
        }
        
        const response = await fetch('/api/test/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });
        
        const result = await response.json();
        
        // Update response display
        document.getElementById('api-test-response').textContent = JSON.stringify(result.response_data, null, 2);
        
        if (result.success) {
            document.getElementById('api-call-status').textContent = `Success - ${result.status_code}`;
            document.getElementById('api-call-status').className = 'text-sm text-green-600';
        } else {
            document.getElementById('api-call-status').textContent = `Failed - ${result.status_code || 'Unknown error'}`;
            document.getElementById('api-call-status').className = 'text-sm text-red-600';
        }
        
    } catch (error) {
        document.getElementById('api-call-status').textContent = 'Error - Request failed';
        document.getElementById('api-call-status').className = 'text-sm text-red-600';
        document.getElementById('api-test-response').textContent = error.toString();
    }
}

function saveAPIResponse() {
    const responseText = document.getElementById('api-test-response').textContent;
    
    try {
        const data = JSON.parse(responseText);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api_response_${new Date().toISOString()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification('Response saved', 'success');
    } catch (error) {
        showNotification('Cannot save - response is not valid JSON', 'error');
    }
}

// Test LLM API Keys - Actually test the API keys
async function testSelectedLLM() {
    const resultsDiv = document.getElementById('llm-test-results');
    if (!resultsDiv) {
        console.error('LLM test results div not found');
        return;
    }
    
    // Get the selected provider
    const selectedProvider = document.getElementById('llm-provider').value;
    
    // Show the results div
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = `<div class="text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Testing ${selectedProvider} connection...</div>`;
    
    try {
        // First save the current keys
        await saveApiKeys();
        
        // Test only the selected provider
        const testResponse = await fetch('/api/keys/test-single', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ provider: selectedProvider })
        });
        
        if (!testResponse.ok) {
            throw new Error(`HTTP error! status: ${testResponse.status}`);
        }
        
        const result = await testResponse.json();
        
        // Display the result for the selected provider
        let html = '';
        if (!result.configured) {
            // Not configured
            html = `
                <div class="border rounded-lg p-4 bg-gray-50">
                    <h4 class="font-semibold text-gray-700 mb-2">
                        <i class="fas fa-circle text-gray-400 mr-2"></i>${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API
                    </h4>
                    <div class="text-sm text-gray-600">
                        <div>Status: <span class="font-medium">Not Configured</span></div>
                        <div class="mt-1">Please enter an API key above and save configuration.</div>
                    </div>
                </div>
            `;
        } else if (result.status === 'valid') {
            // Configured and valid
            html = `
                <div class="border rounded-lg p-4 bg-green-50">
                    <h4 class="font-semibold text-green-800 mb-2">
                        <i class="fas fa-check-circle text-green-600 mr-2"></i>${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API
                    </h4>
                    <div class="text-sm text-gray-700">
                        <div>Status: <span class="font-medium text-green-600">Valid & Working</span></div>
                        <div class="mt-1">Message: ${result.message || 'API key is valid and working'}</div>
                        ${result.response ? `<div class="mt-2 p-2 bg-white rounded border border-green-200"><strong>Test Response:</strong> "${result.response}"</div>` : ''}
                    </div>
                </div>
            `;
            // Update the status indicator
            updateLLMStatus(selectedProvider, true);
        } else {
            // Configured but invalid
            html = `
                <div class="border rounded-lg p-4 bg-red-50">
                    <h4 class="font-semibold text-red-800 mb-2">
                        <i class="fas fa-times-circle text-red-600 mr-2"></i>${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API
                    </h4>
                    <div class="text-sm text-gray-700">
                        <div>Status: <span class="font-medium text-red-600">Invalid</span></div>
                        <div class="mt-1">Error: ${result.error || result.message || 'API key validation failed'}</div>
                        <div class="mt-2 text-xs text-gray-600">Please check your API key and try again.</div>
                    </div>
                </div>
            `;
            // Update the status indicator
            updateLLMStatus(selectedProvider, false);
        }
        
        resultsDiv.innerHTML = html;
        
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                <h3 class="font-semibold text-red-800 mb-2">
                    <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>Test Failed
                </h3>
                <div class="text-sm text-gray-700">
                    <div><strong>Error:</strong> ${error.message}</div>
                </div>
            </div>
        `;
    }
}

// Helper function to update LLM status indicators
function updateLLMStatus(provider, isValid) {
    const statusIcon = document.getElementById(`${provider}-ai-status`);
    const statusText = document.getElementById(`${provider}-ai-status-text`);
    
    if (statusIcon && statusText) {
        if (isValid) {
            statusIcon.className = 'fas fa-circle text-green-500 mr-2';
            statusText.textContent = 'Connected';
            statusText.className = 'text-xs text-green-600';
        } else {
            statusIcon.className = 'fas fa-circle text-red-500 mr-2';
            statusText.textContent = 'Invalid Key';
            statusText.className = 'text-xs text-red-600';
        }
    }
}

// Initialize assessment prompt
function initializeAssessmentPrompt() {
    const promptField = document.getElementById('assessment-prompt');
    if (promptField) {
        if (!promptField.value || promptField.value.trim() === '') {
            promptField.value = `SKILLS ASSESSMENT PROMPT FOR PROFICIENCY ASSIGNMENT

You are an expert skills assessment specialist. Your task is to evaluate the skills provided and assign a PROFICIENCY value (numeric: 1, 2, 3, 4, or 5) representing the skill competence.

PROFICIENCY DEFINITIONS:
1 = Novice (0-20% mastery)
2 = Developing (21-40% mastery)
3 = Intermediate (41-60% mastery)
4 = Advanced (61-80% mastery)
5 = Expert (81-100% mastery)

Return JSON: {"assessments": [{"skill_name": "exact name", "proficiency": 1-5, "confidence_score": 0.0-1.0, "reasoning": "brief explanation"}]}`;
        } else {
        }
    } else {
    }
}

// Keep the old function for backwards compatibility but redirect to new one
async function testLLMKeys() {
    return testSelectedLLM();
}

async function debugEightfoldConnection() {
    const username = document.getElementById('api-eightfold-username').value;
    const password = document.getElementById('api-eightfold-password').value;
    
    if (!username || !password) {
        showNotification('Please configure Eightfold credentials first', 'error');
        return;
    }
    
    // Create a debug modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">API Debug Information</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="debug-content">
                <div class="text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Testing API connection...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const debugContent = document.getElementById('debug-content');
    
    try {
        // Test authentication
        const authResponse = await fetch('/api/test/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const authResult = await authResponse.json();
        
        // Extract skills using direct API call
        const token = authResult.auth_response?.bearer_token;
        const apiBaseUrl = getEightfoldApiUrl();
        const rolesUrl = `${apiBaseUrl}/api/v2/JIE/roles?limit=10`;
        
        const skillsResponse = await fetch(rolesUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        const skillsResult = await skillsResponse.json();
        
        // Display debug information
        debugContent.innerHTML = `
            <div class="space-y-4">
                <!-- Authentication Section -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-2">Authentication Status</h4>
                    <div class="text-sm space-y-1">
                        <div>Status: <span class="font-medium ${authResult.authenticated ? 'text-green-600' : 'text-red-600'}">
                            ${authResult.authenticated ? 'Authenticated' : 'Failed'}
                        </span></div>
                        <div>Message: ${authResult.message}</div>
                        ${authResult.auth_response?.bearer_token ? 
                            `<div>Token: <code class="text-xs bg-gray-100 px-1 rounded">${authResult.auth_response.bearer_token.substring(0, 20)}...</code></div>` : ''}
                    </div>
                </div>
                
                <!-- API Request -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-2">API Request</h4>
                    <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto">${JSON.stringify(skillsRequest, null, 2)}</pre>
                </div>
                
                <!-- API Response -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-2">API Response</h4>
                    <div class="text-sm mb-2">
                        Status: <span class="font-medium ${skillsResult.success ? 'text-green-600' : 'text-red-600'}">
                            ${skillsResult.status_code || 'Unknown'} - ${skillsResult.success ? 'Success' : 'Failed'}
                        </span><br>
                        Endpoint: <code class="text-xs bg-gray-100 px-1 rounded">${skillsResult.eightfold_endpoint || 'N/A'}</code>
                    </div>
                    <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-96">${JSON.stringify(skillsResult, null, 2)}</pre>
                </div>
                
                <!-- Code Details -->
                ${authResult.code_details ? `
                    <div class="border rounded-lg p-4">
                        <h4 class="font-semibold mb-2">Python Code</h4>
                        <pre class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">${authResult.code_details.python_code}</pre>
                    </div>
                ` : ''}
            </div>
            
            <div class="mt-4 flex justify-end">
                <button onclick="this.closest('.fixed').remove()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Close
                </button>
            </div>
        `;
        
    } catch (error) {
        debugContent.innerHTML = `
            <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                <h3 class="font-semibold text-red-800 mb-2">Debug Error</h3>
                <div class="text-sm text-gray-700">
                    <div><strong>Error:</strong> ${error.message}</div>
                </div>
            </div>
        `;
    }
}

// Original debugEightfoldConnection continues below
async function debugEightfoldConnection_old() {
    const username = document.getElementById('api-eightfold-username').value;
    const password = document.getElementById('api-eightfold-password').value;
    
    showNotification('Running API diagnostics...', 'info');
    
    try {
        const response = await fetch('/api/debug/eightfold', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username,
                password: password 
            })
        });
        
        const result = await response.json();
        
        // Display debug results in a modal
        let debugHtml = `
            <div class="space-y-4">
                <div class="bg-blue-50 p-3 rounded">
                    <h4 class="font-semibold text-blue-900">Environment Information</h4>
                    <p class="text-sm">Current Environment: ${result.current_environment}</p>
                    <p class="text-sm">Base URL: ${result.base_url}</p>
                </div>
                
                <div class="space-y-3">
                    <h4 class="font-semibold">API Connection Test Results</h4>
        `;
        
        result.steps.forEach(step => {
            const statusColor = {
                'success': 'text-green-600',
                'warning': 'text-yellow-600', 
                'error': 'text-red-600',
                'info': 'text-blue-600',
                'skipped': 'text-gray-600'
            }[step.status] || 'text-gray-600';
            
            const statusIcon = {
                'success': 'fa-check-circle',
                'warning': 'fa-exclamation-triangle',
                'error': 'fa-times-circle',
                'info': 'fa-info-circle',
                'skipped': 'fa-minus-circle'
            }[step.status] || 'fa-circle';
            
            debugHtml += `
                <div class="border rounded p-3 ${step.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200'}">
                    <div class="flex items-start gap-2">
                        <i class="fas ${statusIcon} ${statusColor} mt-1"></i>
                        <div class="flex-1">
                            <p class="font-medium">${step.step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                            <p class="text-sm text-gray-600">${step.details}</p>
                            <p class="text-xs text-gray-500 font-mono">${step.url}</p>
                            ${step.response_preview ? `<details class="mt-2"><summary class="text-xs cursor-pointer">Response Preview</summary><pre class="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">${step.response_preview}</pre></details>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        debugHtml += `
                </div>
                
                <div class="bg-yellow-50 p-3 rounded">
                    <h4 class="font-semibold text-yellow-900">Next Steps</h4>
                    <ul class="text-sm text-yellow-800 list-disc list-inside">
                        <li>Check if the base URL is correct for your environment</li>
                        <li>Verify your username and password are correct</li>
                        <li>Look for any authentication or endpoint errors above</li>
                        <li>Contact your Eightfold administrator if needed</li>
                    </ul>
                </div>
            </div>
        `;
        
        showModal('API Connection Diagnostics', debugHtml);
        
    } catch (error) {
        showNotification('Error running API diagnostics: ' + error.message, 'error');
    }
}

// Copy JSON content to clipboard
function copyJSONContent(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    if (text === 'No request sent yet' || text === 'No response yet') {
        showNotification('No content to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('JSON copied to clipboard', 'success');
    }).catch(err => {
        showNotification('Failed to copy: ' + err, 'error');
    });
}

// Enhanced JSON Search with Navigation
class JSONSearcher {
    constructor(elementId, searchInputId) {
        this.elementId = elementId;
        this.searchInputId = searchInputId;
        this.element = document.getElementById(elementId);
        this.originalContent = null;
        this.matches = [];
        this.currentMatchIndex = 0;
        this.searchTerm = '';
        
        // Create search controls UI
        this.setupSearchControls();
    }
    
    setupSearchControls() {
        const searchInput = document.getElementById(this.searchInputId);
        if (!searchInput) {
            return;
        }
        const searchContainer = searchInput.parentElement;
        
        // Add search controls after the input
        const controlsHtml = `
            <div id="${this.elementId}-search-controls" class="flex items-center gap-2 mt-2 text-sm">
                <div class="text-gray-600">
                    <span id="${this.elementId}-match-count">0 matches</span>
                </div>
                <div class="flex gap-1">
                    <button onclick="jsonSearchers['${this.elementId}'].previousMatch()" 
                            id="${this.elementId}-prev-btn"
                            class="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled>
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button onclick="jsonSearchers['${this.elementId}'].nextMatch()" 
                            id="${this.elementId}-next-btn"
                            class="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button onclick="jsonSearchers['${this.elementId}'].clearSearch()" 
                            class="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        searchContainer.insertAdjacentHTML('afterend', controlsHtml);
        
        // Update input handler
        searchInput.onkeyup = (e) => {
            this.search(e.target.value);
            if (e.key === 'Enter' && this.matches.length > 0) {
                this.nextMatch();
            }
        };
    }
    
    search(searchTerm) {
        // Store original content on first search
        if (!this.originalContent) {
            this.originalContent = this.element.textContent;
        }
        
        this.searchTerm = searchTerm;
        this.matches = [];
        this.currentMatchIndex = 0;
        
        // Reset if search is empty
        if (!searchTerm) {
            this.element.innerHTML = escapeHtml(this.originalContent);
            this.updateMatchCount();
            return;
        }
        
        // Find all matches
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearch, 'gi');
        const text = this.originalContent;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            this.matches.push({
                start: match.index,
                end: match.index + match[0].length,
                text: match[0]
            });
        }
        
        // Highlight all matches
        this.highlightMatches();
        this.updateMatchCount();
        
        // Scroll to first match if any
        if (this.matches.length > 0) {
            this.scrollToMatch(0);
        }
    }
    
    highlightMatches() {
        if (this.matches.length === 0) {
            this.element.innerHTML = escapeHtml(this.originalContent);
            return;
        }
        
        let html = '';
        let lastEnd = 0;
        
        this.matches.forEach((match, index) => {
            // Add text before match
            html += escapeHtml(this.originalContent.substring(lastEnd, match.start));
            
            // Add highlighted match
            const isCurrentMatch = index === this.currentMatchIndex;
            const highlightClass = isCurrentMatch 
                ? 'bg-orange-400 text-white font-bold' 
                : 'bg-yellow-300 text-black';
            
            html += `<span class="${highlightClass}" data-match-index="${index}">${escapeHtml(match.text)}</span>`;
            lastEnd = match.end;
        });
        
        // Add remaining text
        html += escapeHtml(this.originalContent.substring(lastEnd));
        
        this.element.innerHTML = html;
    }
    
    nextMatch() {
        if (this.matches.length === 0) return;
        
        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
        this.highlightMatches();
        this.scrollToMatch(this.currentMatchIndex);
        this.updateMatchCount();
    }
    
    previousMatch() {
        if (this.matches.length === 0) return;
        
        this.currentMatchIndex = this.currentMatchIndex === 0 
            ? this.matches.length - 1 
            : this.currentMatchIndex - 1;
        
        this.highlightMatches();
        this.scrollToMatch(this.currentMatchIndex);
        this.updateMatchCount();
    }
    
    scrollToMatch(index) {
        const matchElement = this.element.querySelector(`[data-match-index="${index}"]`);
        if (matchElement) {
            matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    updateMatchCount() {
        const countElement = document.getElementById(`${this.elementId}-match-count`);
        const prevBtn = document.getElementById(`${this.elementId}-prev-btn`);
        const nextBtn = document.getElementById(`${this.elementId}-next-btn`);
        
        if (this.matches.length === 0) {
            countElement.textContent = this.searchTerm ? 'No matches' : '0 matches';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        } else {
            countElement.textContent = `${this.currentMatchIndex + 1} of ${this.matches.length} matches`;
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        }
    }
    
    clearSearch() {
        const searchInput = document.getElementById(this.searchInputId);
        searchInput.value = '';
        this.search('');
    }
}

// Store searcher instances
const jsonSearchers = {};

// Initialize enhanced search for API response
function initializeEnhancedSearch() {
    // API Tester response
    if (!jsonSearchers['api-test-response']) {
        jsonSearchers['api-test-response'] = new JSONSearcher('api-test-response', 'api-response-search');
    }
    
    // Skills tab JSON blocks
    if (!jsonSearchers['initial-json']) {
        jsonSearchers['initial-json'] = new JSONSearcher('initial-json', 'initial-json-search');
    }
    
    if (!jsonSearchers['enhanced-json']) {
        jsonSearchers['enhanced-json'] = new JSONSearcher('enhanced-json', 'enhanced-json-search');
    }
}

// Legacy search function for backwards compatibility
function searchJSONContent(elementId, searchTerm) {
    if (jsonSearchers[elementId]) {
        jsonSearchers[elementId].search(searchTerm);
    }
}

// Load roles from API
async function loadRolesFromAPI() {
    const initialJsonElement = document.getElementById('initial-json');
    
    try {
        showNotification('Loading roles from Eightfold API...', 'info');
        
        const response = await fetch('/api/roles/extract');
        const result = await response.json();
        
        if (result.success) {
            // Display the roles data
            initialJsonElement.textContent = JSON.stringify(result.data, null, 2);
            
            // Initialize syntax highlighting if available
            if (typeof Prism !== 'undefined') {
                initialJsonElement.innerHTML = Prism.highlight(
                    JSON.stringify(result.data, null, 2),
                    Prism.languages.json,
                    'json'
                );
            }
            
            // Show statistics
            const roleCount = result.data.data ? result.data.data.length : 0;
            const skillCount = result.skills_extracted || 0;
            showNotification(`Successfully loaded ${roleCount} roles with ${skillCount} unique skills from API`, 'success');
            
        } else {
            showNotification(`Error: ${result.error}`, 'error');
            initialJsonElement.innerHTML = '<div class="text-red-600">Error loading roles from API. Please check your Eightfold configuration.</div>';
        }
        
    } catch (error) {
        console.error('Error loading roles from API:', error);
        showNotification('Error loading roles: ' + error.message, 'error');
        initialJsonElement.innerHTML = '<div class="text-red-600">Error loading roles. Please check the console for details.</div>';
    }
}

// Load roles from Roles_export.json file
async function loadRolesFromFile() {
    const initialJsonElement = document.getElementById('initial-json');
    
    try {
        showNotification('Loading roles from Roles_export.json...', 'info');
        
        const response = await fetch('/api/roles/export');
        const result = await response.json();
        
        if (result.success) {
            // Display the roles data
            initialJsonElement.textContent = JSON.stringify(result.data, null, 2);
            
            // Initialize syntax highlighting if available
            if (typeof Prism !== 'undefined') {
                initialJsonElement.innerHTML = Prism.highlight(
                    JSON.stringify(result.data, null, 2),
                    Prism.languages.json,
                    'json'
                );
            }
            
            // Show statistics
            const roleCount = result.data.data ? result.data.data.length : 0;
            showNotification(`Successfully loaded ${roleCount} roles from Roles_export.json`, 'success');
            
        } else {
            showNotification(`Error: ${result.error}`, 'error');
            initialJsonElement.innerHTML = '<div class="text-red-600">Error loading roles. Please ensure Roles_export.json exists in the project root.</div>';
        }
        
    } catch (error) {
        console.error('Error loading roles:', error);
        showNotification('Error loading roles: ' + error.message, 'error');
        initialJsonElement.innerHTML = '<div class="text-red-600">Error loading roles. Please check the console for details.</div>';
    }
}

// Fill proficiencies for roles
async function fillRoleProficiencies() {
    const initialJsonElement = document.getElementById('initial-json');
    const enhancedJsonElement = document.getElementById('enhanced-json');
    
    if (!initialJsonElement || !initialJsonElement.textContent) {
        showNotification('Please load roles data first from the API Tester', 'warning');
        return;
    }
    
    try {
        // Parse the initial JSON
        let rolesData;
        try {
            rolesData = JSON.parse(initialJsonElement.textContent);
        } catch (e) {
            showNotification('Invalid JSON in Initial API Response', 'error');
            return;
        }
        
        // Get the selected AI provider
        const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'openai';
        
        // Show loading state
        showNotification('Processing roles with LLM to fill proficiencies...', 'info');
        enhancedJsonElement.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i><p class="mt-2">Analyzing roles and determining proficiencies...</p></div>';
        
        // Call the API to fill proficiencies
        const response = await fetch('/api/roles/fill-proficiencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roles_data: rolesData,
                provider: provider
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Display the processed roles with proficiencies
            enhancedJsonElement.textContent = JSON.stringify(result.processed_roles, null, 2);
            
            // Initialize syntax highlighting
            if (typeof Prism !== 'undefined') {
                enhancedJsonElement.innerHTML = Prism.highlight(
                    JSON.stringify(result.processed_roles, null, 2),
                    Prism.languages.json,
                    'json'
                );
            }
            
            // Show statistics
            const stats = result.stats;
            showNotification(
                `Successfully processed ${stats.total_roles} roles with ${stats.total_skills_processed} skills. ` +
                `Rationale exported to: ${result.rationale_export_file}`,
                'success'
            );
            
            // Display rationale in assessment results section
            if (result.rationale_export && result.rationale_export.length > 0) {
                displayRationaleResults(result.rationale_export);
            }
            
        } else {
            showNotification(`Error: ${result.error}`, 'error');
            enhancedJsonElement.innerHTML = '<div class="text-red-600">Error processing roles. Please check your API configuration.</div>';
        }
        
    } catch (error) {
        console.error('Error filling proficiencies:', error);
        showNotification('Error processing roles: ' + error.message, 'error');
        enhancedJsonElement.innerHTML = '<div class="text-red-600">Error processing roles. Please check the console for details.</div>';
    }
}

// Display rationale results in the assessment results section
function displayRationaleResults(rationaleData) {
    // Display in both results containers
    const resultsContainer = document.getElementById('results-container');
    const apiTesterResults = document.getElementById('api-tester-results');
    
    if (!resultsContainer && !apiTesterResults) return;
    
    // Group rationale by role
    const groupedByRole = {};
    rationaleData.forEach(item => {
        if (!groupedByRole[item.role_title]) {
            groupedByRole[item.role_title] = [];
        }
        groupedByRole[item.role_title].push(item);
    });
    
    // Build HTML for display
    let html = '<div class="space-y-6">';
    
    for (const [roleTitle, skills] of Object.entries(groupedByRole)) {
        html += `
            <div class="border rounded-lg p-4">
                <h3 class="font-semibold text-lg mb-3">${roleTitle}</h3>
                <div class="space-y-2">
        `;
        
        skills.forEach(skill => {
            const proficiencyLabel = ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert'][skill.proficiency - 1] || 'Unknown';
            const criticalityColor = skill.criticality === 'Core' ? 'red' : skill.criticality === 'Important' ? 'yellow' : 'gray';
            
            html += `
                <div class="bg-gray-50 rounded p-3">
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-medium">${skill.skill_name}</span>
                        <div class="flex gap-2">
                            <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                Level ${skill.proficiency} - ${proficiencyLabel}
                            </span>
                            <span class="px-2 py-1 bg-${criticalityColor}-100 text-${criticalityColor}-800 rounded text-sm">
                                ${skill.criticality}
                            </span>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600">${skill.rationale}</p>
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    html += '</div>';
    
    // Update both containers if they exist
    if (resultsContainer) {
        resultsContainer.innerHTML = html;
    }
    if (apiTesterResults) {
        apiTesterResults.innerHTML = html;
        // Scroll to results in API tester tab
        apiTesterResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}