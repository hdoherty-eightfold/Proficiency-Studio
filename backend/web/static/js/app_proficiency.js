// Global variables for proficiency assessment
let extractedSkillsData = [];
let assessmentResult = null;
let langchainRequest = null;
let langchainResponse = null;

// Extract skills for assessment
async function extractSkillsForAssessment() {
    const username = document.getElementById('api-eightfold-username').value;
    const password = document.getElementById('api-eightfold-password').value;
    
    if (!username || !password) {
        showNotification('Please configure Eightfold credentials first', 'error');
        return;
    }
    
    // Log API activity
    logAPIActivity('Extracting skills from Eightfold API...', 'request');
    
    try {
        const response = await fetch('/api/skills/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            extractedSkillsData = result.skills;
            displayExtractedSkills(result.skills);

            // IMMEDIATELY update NEW skills count display
            const skillsCountNEW = document.getElementById('skills-count-NEW');
            if (skillsCountNEW) {
                skillsCountNEW.textContent = `${result.skills.length} skills ready`;
            }

            // Update batch calculations with the loaded skills
            if (typeof updateBatchCalculations === 'function') {
                updateBatchCalculations();
            } else if (typeof window.updateBatchCalculations === 'function') {
                window.updateBatchCalculations();
            }
            
            // Update the initial JSON display with the full response
            const initialJsonElement = document.getElementById('initial-json');
            if (initialJsonElement) {
                initialJsonElement.textContent = JSON.stringify(result, null, 2);
            }
            
            // Also update the LangChain request display with the extracted skills
            const langchainRequestElement = document.getElementById('langchain-request-json');
            if (langchainRequestElement) {
                langchainRequestElement.textContent = JSON.stringify({
                    message: "Skills extracted from API",
                    count: result.count,
                    source: result.source,
                    skills: result.skills
                }, null, 2);
            }
            
            logAPIActivity(`Successfully extracted ${result.count} skills`, 'success');
            showNotification(`Extracted ${result.count} skills from API`, 'success');
        } else {
            logAPIActivity(`Error: ${result.message}`, 'error');
            showNotification(result.message || 'Failed to extract skills', 'error');
            
            // Show error in JSON display
            const initialJsonElement = document.getElementById('initial-json');
            if (initialJsonElement) {
                initialJsonElement.textContent = JSON.stringify(result, null, 2);
            }
        }
    } catch (error) {
        logAPIActivity(`Error: ${error.message}`, 'error');
        showNotification('Failed to extract skills: ' + error.message, 'error');
        
        // Show error in JSON display
        const initialJsonElement = document.getElementById('initial-json');
        if (initialJsonElement) {
            initialJsonElement.textContent = JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString()
            }, null, 2);
        }
    }
}

// Use test skills
function useTestSkills() {
    const testSkills = [
        { id: '1', name: 'Python', category: 'Programming' },
        { id: '2', name: 'JavaScript', category: 'Programming' },
        { id: '3', name: 'React', category: 'Frontend' },
        { id: '4', name: 'Docker', category: 'DevOps' },
        { id: '5', name: 'Kubernetes', category: 'DevOps' },
        { id: '6', name: 'Machine Learning', category: 'AI/ML' },
        { id: '7', name: 'AWS', category: 'Cloud' }
    ];
    
    extractedSkillsData = testSkills;
    displayExtractedSkills(testSkills);

    // IMMEDIATELY update NEW skills count display for test skills
    const skillsCountNEW = document.getElementById('skills-count-NEW');
    if (skillsCountNEW) {
        skillsCountNEW.textContent = `${testSkills.length} skills ready`;
    }

    // Update batch calculations with the loaded test skills
    if (typeof updateBatchCalculations === 'function') {
        updateBatchCalculations();
    } else if (typeof window.updateBatchCalculations === 'function') {
        window.updateBatchCalculations();
    }

    logAPIActivity('Using test skills data', 'info');
    showNotification('Loaded 7 test skills', 'success');
}

// Display extracted skills
function displayExtractedSkills(skills) {
    const display = document.getElementById('extracted-skills-display');
    const list = document.getElementById('extracted-skills-list');
    
    display.classList.remove('hidden');
    
    const skillsHtml = skills.map(skill => 
        `<div class="flex justify-between items-center py-1">
            <span class="text-gray-700">${skill.name || skill.skill_name}</span>
            <span class="text-xs text-gray-500">${skill.category || ''}</span>
        </div>`
    ).join('');
    
    list.innerHTML = skillsHtml;
    document.getElementById('skills-extraction-status').textContent = `${skills.length} skills ready for assessment`;
}

// Assess proficiencies
async function assessProficiencies() {
    if (extractedSkillsData.length === 0) {
        showNotification('Please extract skills first', 'error');
        return;
    }
    
    const resumeText = document.getElementById('resume-text-assess').value;
    if (!resumeText.trim()) {
        showNotification('Please enter resume text', 'error');
        return;
    }
    
    const provider = document.getElementById('llm-provider')?.value || 'openai';
    
    logAPIActivity('Sending skills to LLM for proficiency assessment...', 'request');
    showNotification('Assessing proficiencies...', 'info');
    
    try {
        const response = await fetch('/api/skills/assess-proficiencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                skills: extractedSkillsData,
                resume_text: resumeText,
                provider: provider,
                proficiency_levels: ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert']
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            assessmentResult = result;
            displayProficiencyResults(result);
            logAPIActivity(`Assessment complete: ${result.total_skills} skills assessed`, 'success');
            logAPIActivity(`Reasoning saved to: ${result.reasoning_file_path}`, 'info');
            showNotification('Proficiency assessment complete!', 'success');
        } else {
            logAPIActivity(`Error: ${result.detail}`, 'error');
            showNotification('Assessment failed: ' + result.detail, 'error');
        }
    } catch (error) {
        logAPIActivity(`Error: ${error.message}`, 'error');
        showNotification('Failed to assess proficiencies: ' + error.message, 'error');
    }
}

// Display proficiency results
function displayProficiencyResults(result) {
    const resultsDiv = document.getElementById('proficiency-results');
    const content = document.getElementById('proficiency-results-content');
    const llmDisplay = document.getElementById('llm-response-display');
    const llmContent = document.getElementById('llm-response-content');
    
    resultsDiv.classList.remove('hidden');
    llmDisplay.classList.remove('hidden');
    
    // Display assessed skills with proficiency levels
    const skillsHtml = result.assessed_skills.map(skill => {
        const levelColor = getProficiencyColor(skill.proficiency_level);
        return `
            <div class="border rounded-lg p-3 mb-2">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="font-semibold">${skill.skill_name}</span>
                        <span class="ml-2 px-2 py-1 ${levelColor} rounded text-xs">
                            ${skill.proficiency_level}
                        </span>
                    </div>
                    <span class="text-xs text-gray-500">
                        Confidence: ${(skill.confidence_score * 100).toFixed(0)}%
                    </span>
                </div>
                <div class="text-sm text-gray-600">
                    <p class="mb-1"><strong>Reasoning:</strong> ${skill.reasoning}</p>
                    ${skill.years_experience ? `<p class="text-xs">Experience: ~${skill.years_experience} years</p>` : ''}
                </div>
                ${skill.evidence.length > 0 ? `
                    <div class="mt-2 text-xs text-gray-500">
                        <strong>Evidence:</strong>
                        <ul class="list-disc list-inside">
                            ${skill.evidence.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    content.innerHTML = skillsHtml;
    
    // Display LLM information
    llmContent.innerHTML = `
        <div class="space-y-2">
            <div><strong>Provider:</strong> ${result.llm_provider}</div>
            <div><strong>Skills Assessed:</strong> ${result.total_skills}</div>
            <div><strong>Timestamp:</strong> ${new Date(result.timestamp).toLocaleString()}</div>
            <div><strong>File Path:</strong> <code class="text-xs bg-gray-100 px-1 rounded">${result.reasoning_file_path}</code></div>
        </div>
    `;
}

// Get proficiency level color
function getProficiencyColor(level) {
    const colors = {
        'Novice': 'bg-gray-100 text-gray-700',
        'Developing': 'bg-blue-100 text-blue-700',
        'Intermediate': 'bg-yellow-100 text-yellow-700',
        'Advanced': 'bg-green-100 text-green-700',
        'Expert': 'bg-purple-100 text-purple-700'
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
}

// Log API activity
function logAPIActivity(message, type = 'info') {
    const log = document.getElementById('api-activity-log');
    if (!log) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const typeIcon = {
        'request': '→',
        'success': '✓',
        'error': '✗',
        'info': 'ℹ'
    }[type] || '•';
    
    const color = {
        'request': 'text-blue-600',
        'success': 'text-green-600',
        'error': 'text-red-600',
        'info': 'text-gray-600'
    }[type] || 'text-gray-600';
    
    const entry = document.createElement('div');
    entry.className = `${color} mb-1`;
    entry.innerHTML = `<span class="text-gray-400">[${timestamp}]</span> ${typeIcon} ${message}`;
    
    // Clear initial message if present
    if (log.querySelector('.text-gray-500')) {
        log.innerHTML = '';
    }
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Download reasoning JSON
function downloadReasoningJSON() {
    if (!assessmentResult) {
        showNotification('No assessment results to download', 'error');
        return;
    }
    
    const dataStr = JSON.stringify({
        timestamp: assessmentResult.timestamp,
        llm_provider: assessmentResult.llm_provider,
        total_skills: assessmentResult.total_skills,
        assessed_skills: assessmentResult.assessed_skills,
        api_request_payload: assessmentResult.api_request_payload
    }, null, 2);
    
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `proficiency_reasoning_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Downloaded reasoning JSON', 'success');
}

// View API payload
function viewAPIPayload() {
    if (!assessmentResult) {
        showNotification('No assessment results available', 'error');
        return;
    }
    
    // Use assessed_skills for actual data, api_request_payload is now just metadata
    const payload = JSON.stringify(assessmentResult.assessed_skills || assessmentResult.api_request_payload, null, 2);
    
    // Create a modal or alert to show the payload
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl max-h-screen overflow-auto">
            <h3 class="text-lg font-semibold mb-4">API Update Payload</h3>
            <pre class="bg-gray-100 p-4 rounded text-xs overflow-x-auto">${payload}</pre>
            <button onclick="this.parentElement.parentElement.remove()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Close
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// New function for main tab assessment with LangChain
async function assessProficienciesMain() {
    // Get skills from either extracted data or textarea
    let skills = [];
    if (extractedSkillsData.length > 0) {
        skills = extractedSkillsData;
    } else {
        // Parse from textarea
        const skillsText = document.getElementById('skills-list').value;
        const skillLines = skillsText.split('\n').filter(line => line.trim());
        skills = skillLines.map((name, index) => ({
            id: `skill_${index}`,
            name: name.trim(),
            skill_name: name.trim()
        }));
    }
    
    if (skills.length === 0) {
        showNotification('Please enter or load skills to assess', 'error');
        return;
    }
    
    // Prompt user for resume text if not available
    const resumeText = prompt('Please enter resume text for proficiency assessment:', 
        `Senior Software Engineer with 8+ years of experience in full-stack development.

Technical Skills:
- Python (6 years): Built production ML pipelines, Django REST APIs  
- JavaScript/React (4 years): Developed SPAs, component libraries
- Docker/Kubernetes (3 years): Managed containerized microservices
- Machine Learning (2 years): Implemented recommendation systems
- AWS (5 years): Architected cloud infrastructure, Lambda functions`);
    
    if (!resumeText || !resumeText.trim()) {
        showNotification('Resume text is required for assessment', 'error');
        return;
    }
    
    const provider = document.getElementById('llm-provider')?.value || 'openai';
    const promptTemplate = document.getElementById('assessment-prompt').value;
    
    // Get proficiency levels from UI
    const proficiencyLevels = getProficiencyLevelsFromUI();
    
    // Build request
    langchainRequest = {
        skills: skills,
        resume_text: resumeText,
        provider: provider,
        proficiency_levels: proficiencyLevels,
        prompt_template: promptTemplate,
        use_langchain: true
    };
    
    // Display request JSON
    document.getElementById('langchain-request-json').textContent = JSON.stringify(langchainRequest, null, 2);
    
    logAPIActivity('Sending skills to LangChain for proficiency assessment...', 'request');
    showNotification('Assessing proficiencies with LangChain...', 'info');
    
    try {
        const response = await fetch('/api/skills/assess-proficiencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(langchainRequest)
        });
        
        const result = await response.json();
        langchainResponse = result;
        
        // Display response JSON
        document.getElementById('langchain-response-json').textContent = JSON.stringify(result, null, 2);
        
        if (result.success) {
            assessmentResult = result;
            displayProficiencyResults(result);
            
            // Update the enhanced JSON display with proficiencies
            // Use assessed_skills for the actual data (api_request_payload is just metadata now)
            const displayData = result.assessed_skills || [];
            document.getElementById('enhanced-json').textContent = JSON.stringify(displayData, null, 2);
            
            logAPIActivity(`Assessment complete: ${result.total_skills} skills assessed via LangChain`, 'success');
            logAPIActivity(`Reasoning saved to: ${result.reasoning_file_path}`, 'info');
            showNotification('LangChain proficiency assessment complete!', 'success');
        } else {
            const errorMsg = result.detail || result.error || 'Unknown error';
            const skillCount = result.total_skills || 0;
            const assessedCount = result.assessed_skills ? result.assessed_skills.length : 0;
            
            logAPIActivity(`Error: ${errorMsg}`, 'error');
            logAPIActivity(`Skills processed: ${assessedCount}/${skillCount}`, 'info');
            
            if (result.llm_response && result.llm_response.parsed_assessments === 0) {
                logAPIActivity(`LLM response parsing failed - 0 assessments extracted`, 'warning');
                logAPIActivity(`Raw response length: ${result.llm_response.raw_length || 0} characters`, 'info');
            }
            
            showNotification('Assessment failed: ' + errorMsg, 'error');
        }
    } catch (error) {
        logAPIActivity(`Error: ${error.message}`, 'error');
        showNotification('Failed to assess proficiencies: ' + error.message, 'error');
        
        // Display error in response
        document.getElementById('langchain-response-json').textContent = JSON.stringify({
            error: error.message,
            timestamp: new Date().toISOString()
        }, null, 2);
    }
}

// Helper function to get proficiency levels from UI
function getProficiencyLevelsFromUI() {
    // Try to get from the proficiency config if it exists
    const levelElements = document.querySelectorAll('#proficiency-levels-editor input');
    if (levelElements.length > 0) {
        return Array.from(levelElements).map(input => input.value).filter(v => v);
    }
    
    // Default levels
    return ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert'];
}

// Toggle JSON display visibility
function toggleJSONDisplay(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        if (element.style.display === 'none') {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    }
}