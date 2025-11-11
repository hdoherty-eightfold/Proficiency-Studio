// API Explorer JavaScript
// Comprehensive Eightfold API endpoint tester with direct request/response viewing

// Complete catalog of Eightfold API endpoints
const apiEndpoints = {
    'JIE (Job Intelligence Engine)': {
        'List JIE Roles': {
            method: 'GET',
            path: '/api/v2/JIE/roles',
            queryParams: ['limit', 'offset', 'filter', 'sort'],
            description: 'List all JIE roles with optional filtering and pagination'
        },
        'Get JIE Role': {
            method: 'GET',
            path: '/api/v2/JIE/roles/{roleId}',
            pathParams: ['roleId'],
            description: 'Get a specific JIE role by ID'
        },
        'Create JIE Role': {
            method: 'POST',
            path: '/api/v2/JIE/roles',
            body: true,
            bodyExample: {
                title: 'Software Engineer',
                description: 'Role description',
                skillProficiencies: []
            },
            description: 'Create a new JIE role'
        },
        'Update JIE Role': {
            method: 'PUT',
            path: '/api/v2/JIE/roles/{roleId}',
            pathParams: ['roleId'],
            body: true,
            description: 'Update an existing JIE role'
        },
        'Delete JIE Role': {
            method: 'DELETE',
            path: '/api/v2/JIE/roles/{roleId}',
            pathParams: ['roleId'],
            description: 'Delete a JIE role'
        }
    },
    'Profile Management': {
        'Get Profile': {
            method: 'GET',
            path: '/api/v2/core/profiles/{profileId}',
            pathParams: ['profileId'],
            queryParams: ['include', 'exclude'],
            description: 'Get a specific profile by ID'
        },
        'List Profiles': {
            method: 'GET',
            path: '/api/v2/core/profiles',
            queryParams: ['limit', 'offset', 'filter', 'sort', 'query'],
            description: 'List profiles with filtering and pagination'
        },
        'Create Profile': {
            method: 'POST',
            path: '/api/v2/core/profiles',
            body: true,
            bodyExample: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                skills: []
            },
            description: 'Create a new profile'
        },
        'Update Profile': {
            method: 'PUT',
            path: '/api/v2/core/profiles',
            body: true,
            description: 'Update an existing profile'
        },
        'Patch Profile': {
            method: 'PATCH',
            path: '/api/v2/core/profiles',
            body: true,
            description: 'Partially update a profile'
        },
        'Delete Profile': {
            method: 'DELETE',
            path: '/api/v2/core/profiles',
            queryParams: ['profileId'],
            description: 'Delete a profile'
        },
        'Get Matched Positions': {
            method: 'GET',
            path: '/api/v2/core/profiles/matched-positions',
            queryParams: ['profileId', 'limit', 'offset'],
            description: 'Get positions matched to a profile'
        },
        'Get Profile Attachments': {
            method: 'GET',
            path: '/api/v2/core/profiles/attachments',
            queryParams: ['profileId'],
            description: 'Get attachments for a profile'
        },
        'Update Profile Stages': {
            method: 'POST',
            path: '/api/v2/core/profiles/stages',
            body: true,
            description: 'Update profile workflow stages'
        },
        'Batch Fetch Profiles': {
            method: 'POST',
            path: '/api/v2/core/profiles/batch-fetch',
            body: true,
            bodyExample: {
                profileIds: ['id1', 'id2', 'id3']
            },
            description: 'Fetch multiple profiles in a single request'
        }
    },
    'Position Management': {
        'Get Position': {
            method: 'GET',
            path: '/api/v2/core/positions/{positionId}',
            pathParams: ['positionId'],
            queryParams: ['include', 'exclude'],
            description: 'Get a specific position by ID'
        },
        'List Positions': {
            method: 'GET',
            path: '/api/v2/core/positions',
            queryParams: ['limit', 'offset', 'filter', 'sort', 'status'],
            description: 'List positions with filtering and pagination'
        },
        'Create Position': {
            method: 'POST',
            path: '/api/v2/core/positions',
            body: true,
            bodyExample: {
                title: 'Software Engineer',
                department: 'Engineering',
                location: 'San Francisco',
                requirements: []
            },
            description: 'Create a new position'
        },
        'Update Position': {
            method: 'PUT',
            path: '/api/v2/core/positions',
            body: true,
            description: 'Update an existing position'
        },
        'Patch Position': {
            method: 'PATCH',
            path: '/api/v2/core/positions',
            body: true,
            description: 'Partially update a position'
        },
        'Get Matched Candidates': {
            method: 'GET',
            path: '/api/v2/core/positions/matched-candidates',
            queryParams: ['positionId', 'limit', 'offset'],
            description: 'Get candidates matched to a position'
        },
        'Get Position Applicants': {
            method: 'GET',
            path: '/api/v2/core/positions/applicants',
            queryParams: ['positionId', 'limit', 'offset', 'status'],
            description: 'Get applicants for a position'
        },
        'Batch Fetch Positions': {
            method: 'POST',
            path: '/api/v2/core/positions/batch-fetch',
            body: true,
            bodyExample: {
                positionIds: ['id1', 'id2', 'id3']
            },
            description: 'Fetch multiple positions in a single request'
        }
    },
    'ATS (Applicant Tracking)': {
        'Get ATS Position': {
            method: 'GET',
            path: '/api/v2/core/ats-systems/{systemId}/ats-positions/{atsPositionId}',
            pathParams: ['systemId', 'atsPositionId'],
            description: 'Get ATS position details'
        },
        'List ATS Positions': {
            method: 'GET',
            path: '/api/v2/core/ats-positions',
            queryParams: ['limit', 'offset', 'systemId', 'status'],
            description: 'List ATS positions'
        },
        'Create ATS Position': {
            method: 'POST',
            path: '/api/v2/core/ats-positions',
            body: true,
            description: 'Create a new ATS position'
        },
        'Update ATS Position': {
            method: 'PUT',
            path: '/api/v2/core/ats-positions',
            body: true,
            description: 'Update an ATS position'
        },
        'Patch ATS Position': {
            method: 'PATCH',
            path: '/api/v2/core/ats-positions',
            body: true,
            description: 'Partially update an ATS position'
        }
    },
    'Career Navigation': {
        'Get Career Path': {
            method: 'GET',
            path: '/api/v2/careerhub/career-path',
            queryParams: ['profileId', 'targetRole'],
            description: 'Get career path recommendations'
        },
        'Get Skills Suggestions': {
            method: 'GET',
            path: '/api/v2/careerhub/skills/suggestions',
            queryParams: ['profileId', 'roleId'],
            description: 'Get skill development suggestions'
        },
        'Get Learning Resources': {
            method: 'GET',
            path: '/api/v2/careerhub/learning',
            queryParams: ['skillId', 'profileId'],
            description: 'Get learning resources for skills'
        }
    },
    'Employee Management': {
        'List Employees': {
            method: 'GET',
            path: '/api/v2/core/employees',
            queryParams: ['limit', 'offset', 'department', 'location', 'status'],
            description: 'List employees with filtering'
        },
        'Get Employee': {
            method: 'GET',
            path: '/api/v2/core/employees/{employeeId}',
            pathParams: ['employeeId'],
            description: 'Get employee details'
        },
        'Update Employee': {
            method: 'PUT',
            path: '/api/v2/core/employees/{employeeId}',
            pathParams: ['employeeId'],
            body: true,
            description: 'Update employee information'
        }
    },
    'Succession Planning': {
        'Get Succession Plans': {
            method: 'GET',
            path: '/api/v2/succession/plans',
            queryParams: ['limit', 'offset', 'roleId', 'status'],
            description: 'List succession plans'
        },
        'Create Succession Plan': {
            method: 'POST',
            path: '/api/v2/succession/plans',
            body: true,
            bodyExample: {
                roleId: 'role123',
                successors: [],
                timeline: '6 months'
            },
            description: 'Create a succession plan'
        },
        'Get Succession Candidates': {
            method: 'GET',
            path: '/api/v2/succession/candidates',
            queryParams: ['roleId', 'limit'],
            description: 'Get potential successors for a role'
        }
    },
    'Demand Management': {
        'Get Demand Forecast': {
            method: 'GET',
            path: '/api/v2/demand/forecast',
            queryParams: ['department', 'timeframe', 'skillCategory'],
            description: 'Get workforce demand forecast'
        },
        'Get Skills Gap Analysis': {
            method: 'GET',
            path: '/api/v2/demand/skills-gap',
            queryParams: ['department', 'roleId'],
            description: 'Analyze skills gaps in organization'
        }
    },
    'Booking': {
        'Get Bookings': {
            method: 'GET',
            path: '/api/v2/booking/bookings',
            queryParams: ['profileId', 'startDate', 'endDate', 'status'],
            description: 'List bookings'
        },
        'Create Booking': {
            method: 'POST',
            path: '/api/v2/booking/bookings',
            body: true,
            bodyExample: {
                profileId: 'profile123',
                projectId: 'project456',
                startDate: '2024-01-01',
                endDate: '2024-03-31'
            },
            description: 'Create a new booking'
        }
    },
    'SCIM (User Management)': {
        'List Users': {
            method: 'GET',
            path: '/api/v2/scim/Users',
            queryParams: ['filter', 'startIndex', 'count'],
            description: 'List SCIM users'
        },
        'Get User': {
            method: 'GET',
            path: '/api/v2/scim/Users/{userId}',
            pathParams: ['userId'],
            description: 'Get SCIM user details'
        },
        'Create User': {
            method: 'POST',
            path: '/api/v2/scim/Users',
            body: true,
            bodyExample: {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                userName: 'user@example.com',
                name: {
                    givenName: 'John',
                    familyName: 'Doe'
                }
            },
            description: 'Create a SCIM user'
        },
        'Update User': {
            method: 'PUT',
            path: '/api/v2/scim/Users/{userId}',
            pathParams: ['userId'],
            body: true,
            description: 'Update a SCIM user'
        },
        'Delete User': {
            method: 'DELETE',
            path: '/api/v2/scim/Users/{userId}',
            pathParams: ['userId'],
            description: 'Delete a SCIM user'
        }
    }
};

// State management
let explorerState = {
    selectedEndpoint: null,
    authToken: null,
    apiUrl: 'https://apiv2.eightfold.ai',
    responseViewer: null,
    requestHistory: []
};

// Debug: Script loaded and API endpoints available

// Initialize on page load - simplified version
document.addEventListener('DOMContentLoaded', function() {
    // DOMContentLoaded event fired
});

// Initialize when switching to the API Explorer tab
window.initializeApiExplorer = function() {
    // Initialize API Explorer called
    
    // Check if container exists
    const container = document.getElementById('endpoint-categories');
    if (!container) {
        console.error('API Explorer: Container not found!');
        return;
    }
    
    // Container found, initializing...
    
    // Try to initialize
    try {
        initializeExplorer();
    } catch (error) {
        console.error('API Explorer: Error during initialization:', error);
        // Fallback - show a simple message
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-4">Error loading API endpoints. Check console for details.</p>';
    }
};

// Auto-initialize after a delay as fallback
setTimeout(function() {
    const container = document.getElementById('endpoint-categories');
    if (container && container.children.length === 0) {
        // Auto-initializing after delay
        window.initializeApiExplorer();
    }
}, 1000);

function initializeExplorer() {
    // Initializing API Explorer
    renderEndpointCategories();
    initializeResponseViewer();
    checkAuthenticationStatus();
    // API Explorer initialized
}

function renderEndpointCategories() {
    const container = document.getElementById('endpoint-categories');
    if (!container) {
        console.error('Could not find endpoint-categories container');
        return;
    }
    
    // Rendering endpoint categories
    // Number of categories: Object.keys(apiEndpoints).length
    
    // Check if apiEndpoints is defined
    if (!apiEndpoints || typeof apiEndpoints !== 'object') {
        console.error('apiEndpoints is not defined or not an object');
        container.innerHTML = '<p class="text-red-500 p-4">Error: API endpoints data not loaded</p>';
        return;
    }
    
    let html = '';
    
    for (const [category, endpoints] of Object.entries(apiEndpoints)) {
        html += `
            <div class="endpoint-category">
                <button onclick="toggleCategory('${category.replace(/'/g, "\\'")}')" 
                    class="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium text-sm dark:text-gray-200 flex items-center justify-between transition-colors">
                    <span><i class="fas fa-folder mr-2"></i>${category}</span>
                    <i class="fas fa-chevron-down text-xs category-chevron"></i>
                </button>
                <div id="category-${category.replace(/[^a-zA-Z0-9]/g, '-')}" class="pl-4 mt-1 space-y-1 hidden">
        `;
        
        for (const [name, config] of Object.entries(endpoints)) {
            const methodColor = getMethodColor(config.method);
            html += `
                <button onclick='selectEndpoint(${JSON.stringify(category)}, ${JSON.stringify(name)})' 
                    class="w-full text-left px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-sm dark:text-gray-300 flex items-center transition-colors">
                    <span class="px-1 py-0.5 text-xs font-bold text-white ${methodColor} rounded mr-2">
                        ${config.method}
                    </span>
                    <span class="truncate">${name}</span>
                </button>
            `;
        }
        
        html += '</div></div>';
    }
    
    if (html.trim() === '') {
        console.error('No HTML generated for categories');
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No API endpoints available</p>';
    } else {
        // Clear existing content first
        container.innerHTML = '';
        
        // Force a reflow
        container.offsetHeight;
        
        // Set the new content
        container.innerHTML = html;
        
        // Force another reflow and set explicit display
        container.style.display = 'block';
        container.style.minHeight = '200px';
        
        // Categories rendered successfully, total HTML length: html.length
        
        // Debug: Check if content is actually visible
        setTimeout(() => {
            const firstCategory = container.querySelector('.endpoint-category');
            if (firstCategory) {
                // First category found, container properly displayed
            } else {
                console.error('No category elements found after rendering!');
            }
        }, 100);
    }
}

function getMethodColor(method) {
    const colors = {
        'GET': 'bg-green-500',
        'POST': 'bg-blue-500',
        'PUT': 'bg-yellow-500',
        'PATCH': 'bg-orange-500',
        'DELETE': 'bg-red-500'
    };
    return colors[method] || 'bg-gray-500';
}

function toggleCategory(category) {
    const categoryId = `category-${category.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const element = document.getElementById(categoryId);
    if (element) {
        element.classList.toggle('hidden');
    }
}

function filterEndpoints(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    for (const [category, endpoints] of Object.entries(apiEndpoints)) {
        const categoryId = `category-${category.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const categoryElement = document.getElementById(categoryId);
        
        let hasVisibleEndpoints = false;
        
        if (categoryElement) {
            const buttons = categoryElement.querySelectorAll('button');
            
            buttons.forEach(button => {
                const text = button.textContent.toLowerCase();
                if (text.includes(term)) {
                    button.style.display = 'flex';
                    hasVisibleEndpoints = true;
                } else {
                    button.style.display = 'none';
                }
            });
            
            // Show category if it has matching endpoints
            if (hasVisibleEndpoints && term) {
                categoryElement.classList.remove('hidden');
            }
        }
    }
}

function selectEndpoint(category, name) {
    const endpoint = apiEndpoints[category][name];
    if (!endpoint) return;
    
    explorerState.selectedEndpoint = {
        category,
        name,
        ...endpoint
    };
    
    // Update UI
    updateSelectedEndpoint();
    buildParametersForm();
}

function updateSelectedEndpoint() {
    const methodElement = document.getElementById('selected-method');
    const endpointElement = document.getElementById('selected-endpoint');
    
    if (!explorerState.selectedEndpoint) return;
    
    const { method, path } = explorerState.selectedEndpoint;
    
    methodElement.textContent = method;
    methodElement.className = `px-2 py-1 text-xs font-bold text-white rounded ${getMethodColor(method)}`;
    endpointElement.textContent = path;
}

function buildParametersForm() {
    if (!explorerState.selectedEndpoint) return;
    
    const { pathParams, queryParams, body, bodyExample } = explorerState.selectedEndpoint;
    
    // Path parameters
    const pathParamsDiv = document.getElementById('path-params');
    const pathParamsInputs = document.getElementById('path-params-inputs');
    
    if (pathParams && pathParams.length > 0) {
        pathParamsDiv.classList.remove('hidden');
        pathParamsInputs.innerHTML = pathParams.map(param => `
            <div class="flex items-center gap-2">
                <label class="w-32 text-sm font-medium">${param}:</label>
                <input type="text" id="path-${param}" class="flex-1 px-2 py-1 border rounded text-sm" 
                    placeholder="Enter ${param}">
            </div>
        `).join('');
    } else {
        pathParamsDiv.classList.add('hidden');
    }
    
    // Query parameters
    const queryParamsDiv = document.getElementById('query-params');
    const queryParamsInputs = document.getElementById('query-params-inputs');
    
    if (queryParams && queryParams.length > 0) {
        queryParamsDiv.classList.remove('hidden');
        queryParamsInputs.innerHTML = queryParams.map(param => `
            <div class="flex items-center gap-2">
                <label class="w-32 text-sm font-medium">${param}:</label>
                <input type="text" id="query-${param}" class="flex-1 px-2 py-1 border rounded text-sm" 
                    placeholder="Optional">
            </div>
        `).join('');
    } else {
        queryParamsDiv.classList.add('hidden');
    }
    
    // Request body
    const requestBodyDiv = document.getElementById('request-body');
    const requestBodyInput = document.getElementById('request-body-input');
    
    if (body) {
        requestBodyDiv.classList.remove('hidden');
        if (bodyExample) {
            requestBodyInput.value = JSON.stringify(bodyExample, null, 2);
        } else {
            requestBodyInput.value = '{\n  \n}';
        }
    } else {
        requestBodyDiv.classList.add('hidden');
    }
}

function initializeResponseViewer() {
    const container = document.getElementById('response-viewer-container');
    if (container) {
        container.innerHTML = '<div id="api-response-viewer"></div>';
        explorerState.responseViewer = new JsonViewer('api-response-viewer', {
            theme: 'dark',
            searchable: true,
            copyable: true,
            collapsible: true
        });
    }
}

function checkAuthenticationStatus() {
    // Check if we can use authentication from the workflow
    const authState = window.getAuthState ? window.getAuthState() : null;
    
    if (authState && authState.authenticated) {
        explorerState.authToken = authState.authToken;
        explorerState.apiUrl = authState.apiUrl;
        updateAuthStatus(true);
    } else {
        updateAuthStatus(false);
    }
}

function updateAuthStatus(authenticated) {
    const statusElement = document.getElementById('explorer-auth-status');
    if (statusElement) {
        if (authenticated) {
            statusElement.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Authenticated</span>';
        } else {
            statusElement.innerHTML = '<span class="text-red-600"><i class="fas fa-times-circle mr-1"></i>Not authenticated</span>';
        }
    }
}

function useWorkflowAuth() {
    const authState = window.getAuthState ? window.getAuthState() : null;
    
    if (!authState || !authState.authenticated) {
        showNotification('Please authenticate in the Skills Proficiency Workflow tab first.', 'error');
        switchTab('workflow');
        return;
    }
    
    explorerState.authToken = authState.authToken;
    explorerState.apiUrl = authState.apiUrl;
    updateAuthStatus(true);
    
    showNotification('Authentication imported from workflow', 'success');
}

async function executeRequest() {
    if (!explorerState.selectedEndpoint) {
        showNotification('Please select an endpoint first', 'error');
        return;
    }
    
    if (!explorerState.authToken) {
        showNotification('Please authenticate first', 'error');
        return;
    }
    
    const { method, path, pathParams, queryParams, body } = explorerState.selectedEndpoint;
    
    // Build the URL
    let url = path;
    
    // Replace path parameters
    if (pathParams) {
        for (const param of pathParams) {
            const value = document.getElementById(`path-${param}`)?.value;
            if (!value) {
                showNotification(`Please provide value for path parameter: ${param}`, 'error');
                return;
            }
            url = url.replace(`{${param}}`, value);
        }
    }
    
    // Add query parameters
    const queryParamValues = {};
    if (queryParams) {
        for (const param of queryParams) {
            const value = document.getElementById(`query-${param}`)?.value;
            if (value) {
                queryParamValues[param] = value;
            }
        }
    }
    
    // Get request body
    let requestBody = null;
    if (body) {
        const bodyInput = document.getElementById('request-body-input');
        try {
            requestBody = JSON.parse(bodyInput.value);
        } catch (e) {
            showNotification('Invalid JSON in request body', 'error');
            return;
        }
    }
    
    // Disable execute button
    const executeBtn = document.getElementById('execute-btn');
    executeBtn.disabled = true;
    executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Executing...';
    
    const startTime = Date.now();
    
    try {
        // Make the API call through our explorer endpoint
        const response = await fetch('/api/eightfold/explorer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method,
                endpoint: url,
                query_params: queryParamValues,
                body: requestBody,
                auth_token: explorerState.authToken,
                base_url: explorerState.apiUrl
            })
        });
        
        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        // Display response
        displayResponse(data, responseTime);
        
        // Add to history
        addToHistory({
            timestamp: new Date().toISOString(),
            endpoint: explorerState.selectedEndpoint.name,
            method,
            url,
            response: data
        });
        
    } catch (error) {
        console.error('Request failed:', error);
        displayError(error.message);
    } finally {
        // Re-enable execute button
        executeBtn.disabled = false;
        executeBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Execute Request';
    }
}

function displayResponse(data, responseTime) {
    // Show response status
    const statusDiv = document.getElementById('response-status');
    const statusCode = document.getElementById('response-status-code');
    const timeElement = document.getElementById('response-time');
    
    statusDiv.classList.remove('hidden');
    
    const status = data.status_code || 200;
    const statusText = getStatusText(status);
    statusCode.textContent = `${status} ${statusText}`;
    statusCode.className = `font-bold ${status < 400 ? 'text-green-600' : 'text-red-600'}`;
    
    timeElement.textContent = `${responseTime}ms`;
    
    // Display response body
    if (explorerState.responseViewer) {
        explorerState.responseViewer.setJson(data.response || data, {
            filename: 'api_response'
        });
    }
    
    // Store response headers if available
    window.lastResponseHeaders = data.headers || {};
}

function getStatusText(code) {
    const statusTexts = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Internal Server Error'
    };
    return statusTexts[code] || '';
}

function displayError(message) {
    const statusDiv = document.getElementById('response-status');
    statusDiv.classList.remove('hidden');
    
    const statusCode = document.getElementById('response-status-code');
    statusCode.textContent = 'Error';
    statusCode.className = 'font-bold text-red-600';
    
    if (explorerState.responseViewer) {
        explorerState.responseViewer.setJson({
            error: message
        });
    }
}

function copyAsCurl() {
    if (!explorerState.selectedEndpoint) {
        showNotification('Please select an endpoint first', 'error');
        return;
    }
    
    const { method, path } = explorerState.selectedEndpoint;
    let url = `${explorerState.apiUrl}${path}`;
    
    // Build cURL command
    let curlCommand = `curl -X ${method} \\\n`;
    curlCommand += `  '${url}' \\\n`;
    curlCommand += `  -H 'Authorization: Bearer YOUR_TOKEN' \\\n`;
    curlCommand += `  -H 'Content-Type: application/json'`;
    
    if (method !== 'GET' && method !== 'DELETE') {
        curlCommand += ` \\\n  -d '{"key": "value"}'`;
    }
    
    navigator.clipboard.writeText(curlCommand).then(() => {
        showNotification('cURL command copied to clipboard', 'success');
    });
}

function viewResponseHeaders() {
    const headers = window.lastResponseHeaders || {};
    showNotification('Response headers copied to clipboard', 'success');
    navigator.clipboard.writeText(JSON.stringify(headers, null, 2));
}

function downloadResponse() {
    if (!explorerState.responseViewer) return;
    explorerState.responseViewer.downloadJson();
}

function addToHistory(entry) {
    explorerState.requestHistory.unshift(entry);
    if (explorerState.requestHistory.length > 20) {
        explorerState.requestHistory.pop();
    }
}

function showNotification(message, type = 'info') {
    // Simple notification (could be enhanced with a toast library)
    const color = type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue';
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 bg-${color}-500 text-white rounded shadow-lg z-50`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// LangChain API Documentation Query Functions
function openApiDocConfig() {
    // Reuse the existing LangChain configuration popup
    // This would open a similar config as the main workflow
    showNotification('LangChain configuration for API Documentation Assistant - Coming soon!', 'info');
}

async function queryApiDocs() {
    const query = document.getElementById('api-doc-query').value;
    if (!query) return;
    
    const responseDiv = document.getElementById('api-doc-response');
    const answerDiv = document.getElementById('api-doc-answer');
    
    responseDiv.classList.remove('hidden');
    answerDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Thinking...';
    
    try {
        const response = await fetch('/api/langchain/api-docs-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                context: 'eightfold_api'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            answerDiv.innerHTML = data.answer;
        } else {
            answerDiv.innerHTML = `<span class="text-red-600">Error: ${data.error}</span>`;
        }
    } catch (error) {
        answerDiv.innerHTML = `<span class="text-red-600">Failed to query API documentation</span>`;
    }
}