# Product Context - Skills Proficiency Generator

## Why This Project Exists

### Problem Statement
Organizations struggle to accurately assess candidate skills and map them to job requirements. Traditional keyword matching is insufficient, and manual assessment is time-consuming and inconsistent. There's a need for an intelligent system that can:
- Accurately extract skills from resumes
- Map skills to proficiency levels
- Compare candidates against job requirements
- Provide consistent, unbiased assessments

### Solution Approach
The Skills Proficiency Generator combines multiple AI technologies to provide comprehensive skill assessment:
1. **RAG Pipeline**: Uses vector similarity for context-aware matching
2. **LLM Integration**: Leverages multiple AI models for diverse perspectives
3. **Hybrid Approach**: Combines AI with rule-based systems for reliability
4. **API Integration**: Connects with enterprise HR systems (Eightfold)

## How It Should Work

### User Journey
1. **Setup Phase**
   - Select environment (US/EU)
   - Configure API credentials
   - Choose LLM providers

2. **Assessment Phase**
   - Upload resume or paste text
   - System extracts skills automatically
   - Three methods process in parallel
   - Results compared and scored

3. **Review Phase**
   - View proficiency levels for each skill
   - Compare agreement between methods
   - Export results for further analysis
   - Iterate with different parameters

### Core Workflows

#### Skills Extraction Workflow
```
Resume Input → Text Extraction → Skill Identification → 
Proficiency Mapping → Validation → Output
```

#### API Integration Workflow
```
Environment Selection → Authentication → Role Fetching → 
Skill Extraction → Local Processing → Results Display
```

#### Assessment Comparison Workflow
```
Direct LLM ──┐
RAG-Enhanced ├→ Comparison Engine → Agreement Scoring → UI Display
Barebones ───┘
```

## User Experience Goals

### Primary Goals
1. **Accuracy**: Achieve >85% accuracy in skill assessment
2. **Speed**: Complete assessment in <5 seconds
3. **Transparency**: Show how decisions are made
4. **Flexibility**: Support multiple methods and providers

### User Interface Principles
1. **Clarity**: Clear indication of system status
2. **Feedback**: Real-time progress updates
3. **Control**: Allow users to customize parameters
4. **Recovery**: Graceful error handling with clear messages

### Key Features

#### API Explorer
- Test API endpoints directly
- View request/response details
- Replay requests with modifications
- Support for multiple environments

#### Assessment Dashboard
- Side-by-side method comparison
- Visual agreement indicators
- Proficiency level distribution
- Export capabilities

#### Configuration Management
- Environment switching
- API key management
- LLM provider selection
- Performance tuning

## Integration Points

### Eightfold API
- **Purpose**: Fetch job roles and skill requirements
- **Endpoints**: JIE roles, positions, skills
- **Environments**: US, EU with different base URLs

### LLM Providers
- **OpenAI**: GPT-3.5, GPT-4 models
- **Anthropic**: Claude models
- **Google**: Gemini models
- **Grok**: X.AI models

### Internal Systems
- **RAG Pipeline**: Vector similarity engine
- **Cache Layer**: Performance optimization
- **Session Management**: Credential handling

## Success Metrics

### Technical Metrics
- API response time < 2s
- Assessment accuracy > 85%
- System uptime > 99%
- Error rate < 1%

### Business Metrics
- Time saved per assessment
- Consistency improvement
- User satisfaction score
- Adoption rate

## Future Enhancements
1. **Batch Processing**: Handle multiple resumes
2. **Custom Models**: Train domain-specific models
3. **Advanced Analytics**: Skill gap analysis
4. **Integration Expansion**: More HR systems
5. **Mobile Support**: Responsive design