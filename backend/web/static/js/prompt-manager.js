// Prompt Manager - handles switching between verbose and simplified prompts

// Store both prompt templates
const promptTemplates = {
    verbose: `SKILLS ASSESSMENT PROMPT FOR PROFICIENCY ASSIGNMENT

You are an expert skills assessment specialist. Your task is to evaluate the skills provided in the JSON request data and assign a PROFICIENCY value (numeric: 1, 2, 3, 4, or 5) representing the skill competence.

PROFICIENCY DEFINITIONS:

PROFICIENCY 1 (Novice)
- Mastery Range: 0-20%
- Characteristics:
  • Has basic awareness or theoretical knowledge
  • Requires constant supervision and guidance
  • Can perform simple, routine tasks with assistance
  • Limited practical application experience
- Typical Experience: 0-1 years in the skill area
- Work Autonomy: Cannot work independently, needs continuous support

PROFICIENCY 2 (Developing)
- Mastery Range: 21-40%
- Characteristics:
  • Understands fundamental concepts and principles
  • Can perform basic tasks with occasional guidance
  • Developing practical skills through application
  • Requires supervision for complex tasks
- Typical Experience: 1-2 years in the skill area
- Work Autonomy: Can handle routine tasks with periodic check-ins

PROFICIENCY 3 (Intermediate)
- Mastery Range: 41-60%
- Characteristics:
  • Solid working knowledge and consistent application
  • Can work independently on standard tasks
  • Requires minimal supervision
  • Can troubleshoot common issues
- Typical Experience: 2-5 years in the skill area
- Work Autonomy: Independent on standard work, needs guidance for complex scenarios

PROFICIENCY 4 (Advanced)
- Mastery Range: 61-80%
- Characteristics:
  • Comprehensive understanding and expertise
  • Can handle complex, non-routine situations
  • Provides guidance and mentoring to others
  • Recognized as a reliable resource
- Typical Experience: 5-8 years in the skill area
- Work Autonomy: Fully independent, can guide others

PROFICIENCY 5 (Expert)
- Mastery Range: 81-100%
- Characteristics:
  • Master knowledge and industry thought leader
  • Innovates and develops new approaches
  • Consulted for strategic decisions
  • Teaches and develops organizational capability
- Typical Experience: 8+ years in the skill area
- Work Autonomy: Sets standards and best practices for others

CONFIDENCE SCORE GUIDELINES:

The confidence_score (0.0 to 1.0) represents your certainty in the proficiency assignment.

Confidence Score Scale:
- 0.9-1.0 (Very High Confidence):
  • Skill has universally accepted, clear industry standards
  • Well-established certifications or benchmarks exist
  • Examples: SQL, Java, Project Management, Microsoft Excel

- 0.7-0.89 (High Confidence):
  • Generally accepted standards across most organizations
  • Some variation in definitions but core competencies are clear
  • Examples: Leadership, Risk Assessment, Data Analysis

- 0.5-0.69 (Moderate Confidence):
  • Definitions vary significantly across industries/organizations
  • Context-dependent proficiency requirements
  • Examples: Strategic Planning, Innovation, Cultural Transformation

- 0.3-0.49 (Low Confidence):
  • Lacks standardized industry definitions
  • Highly subjective or context-specific skill
  • Examples: Emotional Resilience, Creativity, Work-Life Balance Programs

- 0.0-0.29 (Very Low Confidence):
  • Ambiguous, emerging, or highly specialized skill
  • No established standards or frameworks
  • Examples: Proprietary tools, company-specific processes

## Assessment Factors

Consider these factors when assigning proficiency:
1. Skill Complexity: Technical depth and breadth required
2. Industry Standards: Existence of certifications, frameworks, or benchmarks
3. Learning Curve: Typical time to develop competency
4. Market Value: Demand and scarcity in the job market
5. Impact Scope: Strategic vs. operational impact
6. Transferability: How universal vs. context-specific the skill is
7. Measurability: Objective vs. subjective assessment criteria

## Output Format

Return a JSON object with an "assessments" array. Each assessment object must contain:
- skill_name: exact skill name from input
- proficiency: number 1-5
- confidence_score: number 0.0-1.0
- reasoning: brief explanation WITHOUT restating the proficiency level (focus on WHY this level was chosen)

The response must be valid JSON only, no additional text.

## Quality Assurance Checklist
✓ Every skill has a numeric proficiency value
✓ Proficiency values are integers 1-5
✓ Confidence scores genuinely reflect assessment certainty
✓ Similar/related skills have consistent proficiency values
✓ Distribution follows realistic patterns (not all 4s and 5s)
✓ Reasoning explains WHY without repeating the level name/number
✓ Output is valid JSON format

## Reasoning Guidelines
DO: "Requires deep knowledge to design security policies and oversee implementation"
DON'T: "Advanced (4) reflects the ability to design security policies"
DO: "Core skill with established techniques for analyzing datasets"
DON'T: "Intermediate (3) indicates ability to analyze datasets"

IMPORTANT NOTES:
- Proficiency Required: Every skill MUST have a proficiency (numeric 1-5)
- Confidence Honesty: Don't default to high confidence - be realistic about uncertainty
- Context Awareness: Consider that these assessments may be for role requirements, individual assessments, or skill inventories

Begin your assessment now. For each skill provided in the JSON request data, provide the numeric proficiency (1-5) along with a confidence score that genuinely reflects your certainty in the assessment.`,

    simplified: `SIMPLIFIED_PROMPT_MARKER

Rate each skill 1-5:
1=Novice (beginner, needs supervision)
2=Developing (basic knowledge, occasional help)
3=Intermediate (competent, works independently)
4=Advanced (expert, mentors others)
5=Expert (master, innovates)

Skills to assess: {skills_to_assess}

Return ONLY valid JSON with this structure:
{"assessments": [{"skill_name": "skill name here", "proficiency": number_between_1_and_5}]}

Example for one skill:
{"assessments": [{"skill_name": "Python", "proficiency": 3}]}

IMPORTANT:
- Return ONLY valid JSON
- Keep response minimal for faster processing`
};

// Track current prompt type
let currentPromptType = 'simplified';  // Default to simplified for faster processing

// Function to switch between prompt types
function switchPromptType(type) {
    currentPromptType = type;
    const promptTextarea = document.getElementById('assessment-prompt');
    const indicator = document.getElementById('prompt-type-indicator');
    const promptModeDisplay = document.getElementById('prompt-mode-display');

    if (!promptTextarea) {
        console.warn('Prompt textarea not found');
        return;
    }

    if (type === 'simplified') {
        // Force set the simplified prompt
        promptTextarea.value = promptTemplates.simplified;

        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-bolt"></i> Simplified mode active (faster)';
            indicator.className = 'ml-auto text-xs text-green-600';
        }

        // Update Step 5 indicator
        if (promptModeDisplay) {
            promptModeDisplay.innerHTML = '<i class="fas fa-bolt mr-1"></i>Simplified (Fast)';
            promptModeDisplay.className = 'ml-2 text-sm font-bold text-green-600 dark:text-green-400';
        }
    } else {
        // Set verbose prompt
        promptTextarea.value = promptTemplates.verbose;

        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-info-circle"></i> Verbose mode active';
            indicator.className = 'ml-auto text-xs text-gray-500';
        }

        // Update Step 5 indicator
        if (promptModeDisplay) {
            promptModeDisplay.innerHTML = '<i class="fas fa-file-text mr-1"></i>Verbose (Detailed)';
            promptModeDisplay.className = 'ml-2 text-sm font-bold text-blue-600 dark:text-blue-400';
        }
    }

    // Save preference to localStorage
    localStorage.setItem('promptType', type);

    // Dispatch event to notify other components
    promptTextarea.dispatchEvent(new Event('change'));

    // Switched to prompt mode - textarea updated
}

// Make function globally available
window.switchPromptType = switchPromptType;

// Load saved preference on page load
function loadPromptPreference() {
    const savedType = localStorage.getItem('promptType') || 'simplified';  // Default to simplified
    // Loading prompt preference

    const radioButton = document.querySelector(`input[name="prompt-type"][value="${savedType}"]`);
    if (radioButton) {
        radioButton.checked = true;
    }

    // Always call switchPromptType to ensure the textarea is updated
    switchPromptType(savedType);
}

// Make function globally available
window.loadPromptPreference = loadPromptPreference;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize immediately and override any server-loaded prompt
        loadPromptPreference();
    });
} else {
    // DOM is already loaded - initialize immediately
    loadPromptPreference();
}