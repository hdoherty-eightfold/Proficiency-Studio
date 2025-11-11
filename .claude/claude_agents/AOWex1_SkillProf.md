# 🎯 Agent Operator Workflow - Skills Proficiency Generator Edition

## Quick Start for Skills Proficiency Tasks
This optimized template is specifically tailored for the Skills Proficiency Generator project, focusing on RAG pipeline operations, LLM integrations, and Eightfold API interactions.

---

## 📋 **SKILLS PROFICIENCY TASK TEMPLATE**

```markdown
## Task: [YOUR SKILLS PROFICIENCY REQUEST]

## Context
- Component: [RAG Pipeline/LLM Service/Eightfold API/Web UI/Assessment Engine]
- Environment: [USAA TM/ADoherty/EU Vodafone/EU UAT]
- Priority: [Critical/High/Medium/Low]
- Dependencies: 
  * Eightfold API credentials
  * LLM API keys (OpenAI/Anthropic/Google/Grok)
  * RAG pipeline embeddings
- Success Criteria:
  * Assessment accuracy > 85%
  * API response time < 2s
  * All three methods (Direct/RAG/Barebones) functional
- Related Files:
  * core/rag_pipeline.py
  * core/llm_service.py
  * core/eightfold_client.py
  * web/templates/index.html

## Constraints
- Performance: Assessment generation < 5 seconds
- Security: No API keys in code, session-based only
- API Policy: Direct Eightfold API calls only (NO wrappers)
- Testing: Must run auto_test.py after changes
- Rollback: Git reset to last working commit

## Expected Output
- [ ] Working implementation with test results
- [ ] API call details (endpoint, headers, body)
- [ ] Performance metrics
- [ ] Updated CLAUDE.md if patterns discovered
```

---

## 🚀 **PARALLEL EXECUTION WORKFLOW - SKILLS PROFICIENCY**

### Phase 1: Discovery (Parallel)
```yaml
parallel_tasks:
  - eightfold_api_check:
      agent: python_expert
      action: Test Eightfold API connectivity
      endpoints: [/oauth/v1/authenticate, /api/v2/JIE/roles]
      
  - rag_pipeline_status:
      agent: knowledge
      action: Check embeddings and vector DB
      files: [data/embeddings.pt, data/skills_metadata.json]
      
  - llm_availability:
      agent: ai_pipeline
      action: Verify LLM API keys in session
      providers: [OpenAI, Anthropic, Google, Grok]
      
  - ui_component_scan:
      agent: controller
      action: Check UI components
      files: [web/static/js/workflow.js, web/templates/index.html]
```

### Phase 2: Implementation (Sequential)
```yaml
sequential_tasks:
  - implement_solution:
      checkpoints: [API auth, Data fetch, Processing, UI update]
      validation: Against Eightfold API docs
      
  - performance_optimization:
      targets: [Embedding cache, API response cache, Parallel LLM calls]
      
  - error_handling:
      scenarios: [API timeout, Invalid credentials, LLM failure]
```

### Phase 3: Verification (Parallel)
```yaml
parallel_validation:
  - run_auto_test: python auto_test.py
  - api_explorer_test: Test all API endpoints in UI
  - assessment_comparison: Verify all 3 methods work
  - eu_environment_test: Test EU API endpoints
```

---

## 📊 **SKILLS PROFICIENCY SPECIFIC PATTERNS**

### Eightfold API Integration
```yaml
pattern: Direct API Calls
trigger_keywords: [eightfold, api, roles, positions, skills]
required_agents: [python_expert, qa]
implementation:
  - NEVER create wrapper endpoints
  - ALWAYS use direct Eightfold API calls
  - Show full request details in UI
  - Enable request replay functionality
common_issues:
  - Using wrapper endpoints instead of direct calls
  - Not handling EU vs US API URLs
  - Missing Bearer token in headers
```

### RAG Pipeline Operations
```yaml
pattern: Vector Similarity Search
trigger_keywords: [rag, embedding, similarity, vector]
required_agents: [python_expert, evaluation]
implementation:
  - Use sentence-transformers for embeddings
  - Cache embeddings to disk
  - GPU/MPS/CPU auto-detection
common_issues:
  - Missing embeddings file
  - Device compatibility issues
  - Memory overflow with large datasets
```

### LLM Service Management
```yaml
pattern: Multi-Provider LLM
trigger_keywords: [llm, openai, anthropic, claude, gpt]
required_agents: [ai_pipeline, qa]
implementation:
  - Session-based API key storage
  - Provider abstraction layer
  - Fallback handling
common_issues:
  - API keys not in session
  - Rate limiting
  - Model name mismatches
```

---

## 🔄 **SKILLS PROFICIENCY ERROR MATRIX**

| Scenario | Detection | Recovery | Time |
|----------|-----------|----------|------|
| Eightfold API 401 | Auth exception | Re-authenticate with stored creds | 1-2 min |
| EU API Connection | Different base URL | Switch to EU endpoint | Immediate |
| RAG Pipeline Missing | No embeddings.pt | Regenerate from skills data | 5-10 min |
| LLM API Key Invalid | 401/403 response | Prompt user for new key | 1 min |
| Assessment Timeout | >5s response | Use cached results | Immediate |

---

## 🎯 **PROJECT-SPECIFIC EXAMPLES**

### Example 1: Add New Eightfold Environment
```markdown
## Task: Add new Eightfold customer environment with OAuth2 authentication

## Context
- Component: Eightfold API
- Environment: New Customer Production
- Priority: High
- Dependencies: OAuth2 credentials, API endpoint URL
- Success Criteria:
  * Authentication successful
  * Roles endpoint returns data
  * UI dropdown shows new environment
- Related Files: config/environments.py, core/eightfold_client.py

## Constraints
- Performance: Auth < 2s
- Security: Credentials in session only
- API Policy: Direct calls only
- Testing: Run auto_test.py
```

### Example 2: Optimize RAG Pipeline Performance
```markdown
## Task: RAG similarity search taking 3+ seconds, needs optimization

## Context
- Component: RAG Pipeline
- Environment: All
- Priority: Critical
- Dependencies: PyTorch, sentence-transformers
- Success Criteria:
  * Search time < 500ms
  * Accuracy maintained > 85%
  * GPU utilization if available
- Related Files: core/rag_pipeline.py

## Constraints
- Performance: 6x improvement needed
- Security: No data leaks
- Testing: Compare before/after accuracy
```

### Example 3: Fix Assessment Comparison UI
```markdown
## Task: Comparison view not showing agreement scores correctly

## Context
- Component: Web UI
- Environment: All
- Priority: Medium
- Dependencies: Assessment engine, JavaScript
- Success Criteria:
  * All 3 methods visible
  * Agreement scores calculated
  * Dark mode compatible
- Related Files: web/static/js/workflow.js, web/templates/index.html

## Constraints
- Performance: UI update < 100ms
- Testing: Cross-browser compatibility
```

---

## 🧠 **SKILLS PROFICIENCY LEARNING PATTERNS**

### Discovered Optimizations
```yaml
embedding_cache:
  discovery: Embeddings recalculated every request
  solution: Cache to data/embeddings.pt
  improvement: 10x faster similarity search

api_response_cache:
  discovery: Repeated Eightfold API calls
  solution: In-memory cache with TTL
  improvement: 50% reduction in API calls

parallel_assessment:
  discovery: Sequential LLM calls for 3 methods
  solution: Async parallel execution
  improvement: 3x faster assessment generation
```

### Common Task Flows
```yaml
new_environment_setup:
  steps:
    1. Add to config/environments.py
    2. Test authentication
    3. Verify endpoints work
    4. Update UI dropdown
    5. Run auto_test.py

api_integration_debug:
  steps:
    1. Check API Explorer tab
    2. View request details
    3. Test with curl
    4. Update headers if needed
    5. Verify in UI

assessment_accuracy_improvement:
  steps:
    1. Review evaluation metrics
    2. Adjust prompt templates
    3. Update RAG context window
    4. Test with diverse resumes
    5. Compare agreement scores
```

---

## ✅ **SKILLS PROFICIENCY CHECKLIST**

Before executing any task:

**API Requirements**
- [ ] Eightfold credentials available
- [ ] Correct environment selected (US/EU)
- [ ] Direct API calls (no wrappers)

**Testing Requirements**
- [ ] auto_test.py will be run
- [ ] API Explorer tab functional
- [ ] All 3 assessment methods tested

**Code Standards**
- [ ] No API keys in code
- [ ] Session-based storage only
- [ ] Error handling implemented

**Documentation**
- [ ] CLAUDE.md updated if needed
- [ ] Memory bank current
- [ ] Learning patterns captured

---

## 💡 **QUICK TIPS FOR SKILLS PROFICIENCY TASKS**

1. **Always Test EU Environments**: They use different base URLs
2. **Check API Explorer First**: Best way to debug API issues
3. **Run auto_test.py**: Catches most integration issues
4. **Use Direct API Calls**: Never create wrapper endpoints
5. **Cache Aggressively**: Embeddings, API responses, LLM results
6. **Monitor Performance**: Assessment should be < 5 seconds
7. **Validate All 3 Methods**: Direct, RAG, Barebones must all work
8. **Update Memory Bank**: Capture learnings for future sessions

---

**Version**: AOWex1_SkillProf v1.0
**Project**: Skills Proficiency Generator
**Last Updated**: 2025-08-14
**Key Focus**: RAG Pipeline, LLM Integration, Eightfold API