# 🎯 Agent Operator Workflow Extended v1 - Enhanced Template

## Quick Start
Replace bracketed placeholders with your specific requirements. This streamlined template ensures efficient agent coordination with parallel processing, clear success metrics, and robust error handling.

---

## 📋 **CORE TEMPLATE**

```markdown
## Task: [YOUR REQUEST HERE - Be specific and measurable]

## User Confirmation Required
- [ ] Present detailed plan before execution
- [ ] Await explicit approval
- [ ] Document any plan modifications

## Context
- System: [e.g., Workday, SuccessFactors, Taleo, Oracle HCM]
- Priority: [Critical/High/Medium/Low]
- Dependencies: [List blocking factors or prerequisites]
- Success Criteria: [Define measurable expected outcomes]
- Related Files: [Specific files to reference, if known]

## Constraints
- Performance: [Response time/processing requirements]
- Security: [Access levels, compliance needs]
- Rollback Strategy: [Recovery approach if failure occurs]
- Deadline: [Time constraints, if applicable]

## Expected Output Format
- [ ] Solution implementation with code citations
- [ ] Schema validation results
- [ ] Test results or validation proof
- [ ] Performance metrics (if applicable)
- [ ] Prompt improvement analysis (how this prompt could be better)
```

---

## 🛡️ **MANDATORY USER CONFIRMATION STEP**

```markdown
## CRITICAL: Plan Approval Required
1. **ALWAYS present the execution plan to the user FIRST**
2. **WAIT for explicit user confirmation before proceeding**
3. **DO NOT execute any changes without approval**
4. **UTILIZE ALL available agents from .cursor/rules/ folder as needed**

### Plan Presentation Format:
"I've analyzed your request and here's my proposed plan:

**Objective**: [Restate the task]

**Execution Plan**:
1. [Step 1 with estimated time]
2. [Step 2 with estimated time]
3. [Step 3 with estimated time]

**Potential Risks**: [Any identified risks]
**Rollback Strategy**: [How to undo if needed]

**Shall I proceed with this plan?** (Yes/No/Modify)"
```

---

## 🚀 **PARALLEL EXECUTION WORKFLOW**

### Phase 0: Plan & Confirm (MANDATORY)
```yaml
user_confirmation:
  - present_plan: Show detailed execution strategy
  - identify_risks: Highlight potential issues
  - await_approval: GET EXPLICIT CONFIRMATION
  - proceed_only_if: User responds with "Yes" or equivalent
```

### Phase 1: Discovery (Parallel Execution)
```yaml
parallel_tasks:
  - agent_delegation:
      action: Scan .cursor/rules/ for ALL relevant agents
      agents_to_use: [Based on task keywords and system requirements]
      coordination: Solution Architect as primary coordinator
  - code_analysis:
      action: Search and analyze relevant code
      output: file:lines citations with purpose
  - schema_validation:
      action: Locate and validate configurations
      output: schema version, constraints, compatibility
  - dependency_mapping:
      action: Identify system interactions
      output: upstream/downstream dependencies
```

### Phase 2: Implementation (Sequential)
```yaml
sequential_tasks:
  - primary_solution:
      checkpoints: [25%, 50%, 75%, 100%]
      validation: Against success criteria
  - performance_metrics:
      measure: [latency, throughput, resource usage]
  - error_handling:
      implement: Fallback mechanisms
```

### Phase 3: Verification (Parallel)
```yaml
parallel_validation:
  - unit_tests: Run isolated component tests
  - integration_tests: Validate system interactions
  - schema_compliance: Confirm configuration validity
  - performance_benchmarks: Compare against requirements
```

### Phase 4: Learning Capture (Post-Execution)
```yaml
learning_analysis:
  - prompt_gaps: Identify missing information from original prompt
  - enhanced_template: Generate improved prompt version
  - pattern_extraction: Document reusable solutions
  - agent_optimization: Suggest better agent coordination
  - knowledge_storage: Save learnings for future use
```

---

## 📊 **STRUCTURED EVIDENCE FORMAT**

### Code References
```yaml
citations:
  - file: [path/to/file.py]
    lines: [start-end]
    purpose: [Why this code is relevant]
    dependencies: [Required libraries/modules]
    modifications: [Changes needed, if any]
```

### Schema Validations
```yaml
schemas:
  - file: [path/to/schema.json]
    version: [x.y.z]
    validated_fields: [list of fields checked]
    constraints: 
      required: [true/false]
      format: [data type/pattern]
      limits: [min/max values]
    compatibility: [Systems/versions supported]
```

---

## 🔄 **ITERATION PROTOCOL**

```markdown
## Feedback Loop
1. Initial Attempt
   - Execute solution
   - Collect metrics
   - Document results

2. Validation Check
   - ✅ Success: Proceed to deployment
   - ❌ Failure: Continue to step 3

3. Refinement Strategy
   - Analyze failure reason:
     * Performance bottleneck → Optimize algorithm
     * Schema violation → Adjust configuration
     * Integration error → Review dependencies
   - Apply targeted fix
   - Return to step 1 (max 3 iterations)

4. Escalation Path
   - If 3 iterations fail:
     * Document all attempts
     * Identify root blockers
     * Propose alternative approach
```

---

## 🧠 **LEARNING & IMPROVEMENT FEEDBACK**

```markdown
## Post-Execution Analysis (MANDATORY after task completion)

### Prompt Effectiveness Review
After completing the task, provide the following analysis:

**1. What Information Would Have Helped?**
- Missing context that caused delays: [List specific items]
- Ambiguous requirements that needed clarification: [List items]
- Assumed dependencies that should have been explicit: [List items]

**2. Enhanced Prompt Template**
"Based on this execution, the original prompt could be improved as follows:

ORIGINAL: [Original task statement]

IMPROVED: [Enhanced version with specific details that would have prevented issues]

KEY ADDITIONS:
- [Specific context item 1]
- [Specific context item 2]
- [Performance requirement that was discovered]
- [Security constraint that emerged]
- [Integration detail that was missing]"

**3. Discovery Insights**
- Unexpected findings: [What was discovered during execution]
- Hidden dependencies: [Systems/files not mentioned but critical]
- Performance bottlenecks: [Issues that could be flagged upfront]

**4. Agent Utilization Analysis**
- Agents that were needed but not initially identified: [List]
- Agents that could have been engaged earlier: [List]
- Parallel opportunities missed: [Tasks that could run concurrently]

**5. Reusable Patterns Identified**
```yaml
pattern_name: [Descriptive name]
trigger_keywords: [Words that indicate this pattern]
solution_template: [Reusable approach]
required_agents: [Agents always needed for this pattern]
common_pitfalls: [Issues to watch for]
```

### Learning Storage Recommendation
Save this analysis to: .cursor/prompt-templates/learning/[task-type]-[date].md
This creates a knowledge base for improving future prompts.
```

---

## ⚠️ **ERROR HANDLING MATRIX**

| Scenario | Detection Method | Fallback Strategy | Recovery Time |
|----------|-----------------|-------------------|---------------|
| API Unavailable | HTTP 5xx/timeout | Cache/queue requests | 5-10 min |
| Schema Invalid | Validation error | Use previous version | Immediate |
| Performance Degraded | Metrics threshold | Scale resources/optimize | 15-30 min |
| Auth Failure | 401/403 response | Refresh tokens/re-auth | 1-2 min |
| Data Corruption | Checksum mismatch | Restore from backup | 30-60 min |

---

## 🎯 **OPTIMIZED EXAMPLES**

### Example 1: Workday Integration (Complex)
```markdown
## Task: Configure Workday RAAS reports for custom fields with OAuth2 JWT authentication

## Context
- System: Workday RAAS
- Priority: High
- Dependencies: OAuth2 server, JWT library, RAAS endpoint access
- Success Criteria: 
  * Extract 3 custom fields (department, cost_center, hire_date)
  * Response time < 2 seconds
  * 99.9% authentication success rate
- Related Files: workday_raas.py, oauth_config.json

## Constraints
- Performance: Max 2s response time, handle 100 req/min
- Security: JWT expiration 1hr, rotate secrets monthly
- Rollback Strategy: Revert to basic auth if OAuth fails 3x
- Deadline: Production deployment by EOW

## Expected Output Format
- [x] RAAS configuration with field mappings
- [x] OAuth2 JWT implementation with token refresh
- [x] Performance test results showing <2s response
- [x] Schema validation against workday.schema.json v2.1
```

### Example 2: Bug Analysis (Focused)
```markdown
## Task: Apply button shows active for archived jobs but fails on click

## Context
- System: Career Hub UI
- Priority: Critical
- Dependencies: Job status API, UI state manager
- Success Criteria:
  * Button disabled for archived jobs
  * Clear user feedback on job status
  * No console errors
- Related Files: apply_button.js, job_status_handler.py

## Constraints
- Performance: UI update within 100ms
- Security: Validate job status server-side
- Rollback Strategy: Feature flag to restore old behavior
- Deadline: Hotfix within 4 hours

## Expected Output Format
- [x] Root cause analysis with code citations
- [x] Fix implementation with test coverage
- [x] UI/UX validation screenshots
- [x] Performance metrics pre/post fix
```

### Example 3: Performance Optimization (Metrics-Driven)
```markdown
## Task: Position search API taking 5+ seconds, needs optimization

## Context
- System: Search API/PostgreSQL
- Priority: High
- Dependencies: Database indexes, caching layer
- Success Criteria:
  * Response time < 500ms for 95th percentile
  * Support 1000 concurrent users
  * No increase in error rate
- Related Files: position_search.py, search_queries.sql

## Constraints
- Performance: Target 10x improvement (5s → 500ms)
- Security: Maintain row-level security
- Rollback Strategy: Query plan backup, index rollback script
- Deadline: Complete optimization in 2 sprints

## Expected Output Format
- [x] Query analysis with execution plans
- [x] Index optimization strategy
- [x] Caching implementation
- [x] Load test results at 1000 users
```

---

## 🔧 **AGENT COORDINATION & DELEGATION**

### Available Agents Directory
```markdown
## IMPORTANT: Always scan .cursor/rules/ folder for ALL available agents
The system should automatically identify and utilize relevant agents including but not limited to:
- solution-architect-role.mdc (Primary Coordinator)
- workday-integration-expert.mdc
- successfactors-integration-expert.mdc
- taleo-oracle-integration-expert.mdc
- oracle-hcm-integration-expert.mdc
- ukg-integration-expert.mdc
- sql-pro.mdc
- python-pro.mdc
- debugger.mdc
- error-detective.mdc
- code-reviewer.mdc
- integration-analysis.mdc
- customer-management.mdc
- eightfold-engineering-support.mdc
- agent-operator-workflow.mdc
- And ANY OTHER agents found in .cursor/rules/

## Agent Selection Strategy
1. Scan ALL .mdc files in .cursor/rules/
2. Match task keywords to agent expertise
3. Engage multiple agents in parallel when beneficial
4. Coordinate through Solution Architect
```

### System-Specific Triggers
```yaml
workday:
  keywords: [RAAS, OAuth2, JWT, webhook, custom_report]
  agent: workday-integration-expert

successfactors:
  keywords: [SAP, OData, SFTP, EC, RCM]
  agent: successfactors-integration-expert

taleo:
  keywords: [Oracle, TBE, REST, requisition, candidate]
  agent: taleo-oracle-integration-expert

oracle_hcm:
  keywords: [HCM, Fusion, SOAP, HDL, HCM_Extract]
  agent: oracle-hcm-integration-expert
```

### Task-Type Triggers
```yaml
performance:
  keywords: [slow, optimize, latency, bottleneck, scale]
  agents: [sql-pro, code-reviewer, debugger]

integration:
  keywords: [API, webhook, SFTP, sync, mapping]
  agents: [integration-analysis, data-mapping]

debugging:
  keywords: [error, bug, exception, crash, failure]
  agents: [debugger, error-detective, code-reviewer]
```

---

## ✅ **SUBMISSION CHECKLIST**

Before submitting your prompt:

**User Interaction Requirements**
- [ ] Plan will be presented BEFORE any execution
- [ ] User confirmation will be explicitly requested
- [ ] No changes will be made without approval

**Clarity & Specificity**
- [ ] Task is specific and measurable
- [ ] Success criteria are quantifiable
- [ ] Dependencies are identified

**Technical Requirements**
- [ ] Performance targets defined
- [ ] Security constraints specified
- [ ] Rollback strategy documented

**Evidence & Validation**
- [ ] Code citation format specified
- [ ] Schema validation required
- [ ] Test coverage expectations set

**Optimization**
- [ ] Parallel tasks identified
- [ ] Iteration limits defined (max 3)
- [ ] Error handling matrix completed

---

## 📈 **METRICS TRACKING**

```yaml
tracking_metrics:
  efficiency:
    - time_to_solution: [target vs actual]
    - iterations_required: [1, 2, or 3]
    - parallel_task_savings: [% time saved]
  
  quality:
    - code_coverage: [% tested]
    - schema_compliance: [pass/fail]
    - performance_met: [yes/no]
  
  reliability:
    - error_rate: [% failures]
    - rollback_frequency: [count]
    - mttr: [mean time to recovery]
```

---

## 💡 **TIPS FOR MAXIMUM EFFECTIVENESS**

1. **Always Confirm First**: Present plan → Get approval → Execute
2. **Be Specific**: "Optimize search" → "Reduce search API response from 5s to <500ms"
3. **Set Measurable Goals**: "Fast" → "95th percentile <500ms"
4. **Include Context**: Always specify system, files, and dependencies
5. **Plan for Failure**: Every task needs a rollback strategy
6. **Leverage Parallelism**: Identify independent tasks for concurrent execution
7. **Document Evidence**: Require citations for all code/schema references
8. **Iterate Smartly**: Set max iterations to prevent infinite loops
9. **Track Metrics**: Measure before/after for objective validation

---

**Version**: AOWex1 - Enhanced Agent Operator Workflow v1.1
**Last Updated**: 2025-08-14
**Improvements**: 
- 60% more concise than original
- Parallel processing workflows
- Metrics-driven validation
- Robust error handling
- Mandatory user confirmation
- Comprehensive agent utilization
- Self-learning prompt improvement mechanism