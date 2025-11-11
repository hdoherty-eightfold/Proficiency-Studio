# Project Brief - Skills Proficiency Generator

## Project Vision
AI-powered skills proficiency assessment system that combines RAG pipeline with Claude agents for intelligent skill evaluation and proficiency mapping.

## Core Requirements

### Functional Requirements
1. **Multi-Method Assessment**
   - Direct LLM assessment using various providers
   - RAG-enhanced assessment with vector similarity
   - Barebones Python-based keyword matching
   - Comparison and agreement scoring across methods

2. **API Integration**
   - Direct Eightfold API integration (NO wrappers)
   - Support for multiple environments (US, EU)
   - OAuth2 and Basic Auth support
   - Real-time API exploration and testing

3. **LLM Support**
   - OpenAI GPT models
   - Anthropic Claude models
   - Google Gemini models
   - Grok models
   - Session-based API key management

4. **RAG Pipeline**
   - PyTorch-based vector similarity
   - Sentence transformer embeddings
   - GPU/MPS/CPU auto-detection
   - Persistent embedding storage

### Non-Functional Requirements
1. **Performance**
   - Assessment generation < 5 seconds
   - API response time < 2 seconds
   - UI updates < 100ms

2. **Security**
   - No API keys stored in code
   - Session-based credential management
   - Secure OAuth2 implementation

3. **Usability**
   - Dark mode support
   - Real-time progress monitoring
   - API request replay capability
   - Comprehensive error messages

## Project Scope

### In Scope
- Skills proficiency assessment from resumes
- Integration with Eightfold API for job roles
- Multi-LLM comparison and evaluation
- RAG pipeline for enhanced accuracy
- Web-based UI with API explorer
- Multi-environment support (US, EU)

### Out of Scope
- Mobile application
- Offline functionality
- Custom ML model training
- Direct database access
- User authentication system

## Success Criteria
1. All three assessment methods functional
2. Agreement scores > 80% between methods
3. API integration working for all environments
4. auto_test.py passing all tests
5. Performance targets met
6. No hardcoded credentials

## Key Stakeholders
- Development team
- API integration users
- Assessment evaluators
- System administrators

## Technical Stack
- **Backend**: Python, Flask/FastAPI
- **Frontend**: HTML, JavaScript, CSS
- **ML/AI**: PyTorch, Sentence Transformers, LangChain
- **APIs**: Eightfold, OpenAI, Anthropic, Google, Grok
- **Testing**: pytest, auto_test.py

## Delivery Timeline
- Phase 1: Core assessment engine ✅
- Phase 2: API integration ✅
- Phase 3: Multi-environment support ✅
- Phase 4: EU environment integration (current)
- Phase 5: Production deployment (pending)