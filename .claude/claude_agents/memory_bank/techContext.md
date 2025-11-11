# Tech Context - Skills Proficiency Generator

## Technologies Used

### Core Languages & Frameworks
- **Python 3.11+**: Primary backend language
- **Flask/FastAPI**: Web framework for API endpoints
- **JavaScript (ES6+)**: Frontend interactivity
- **HTML5/CSS3**: UI structure and styling

### AI/ML Libraries
- **PyTorch**: Deep learning framework for embeddings
- **Sentence Transformers**: Pre-trained models for text embeddings
- **LangChain**: LLM orchestration and chaining
- **OpenAI SDK**: GPT model integration
- **Anthropic SDK**: Claude model integration
- **Google Generative AI**: Gemini model integration

### Data Processing
- **NumPy**: Numerical computations
- **Pandas**: Data manipulation (optional)
- **JSON**: Data serialization
- **PyPDF2**: PDF text extraction

### Web Technologies
- **Fetch API**: Frontend HTTP requests
- **WebSockets**: Real-time updates (planned)
- **LocalStorage**: Client-side data persistence
- **CSS Variables**: Dark mode theming

### Testing & Quality
- **pytest**: Unit and integration testing
- **auto_test.py**: Custom test suite
- **Coverage.py**: Code coverage analysis
- **Black**: Code formatting
- **pylint**: Code quality checks

## Development Setup

### Prerequisites
```bash
# Python 3.11 or higher
python --version

# pip package manager
pip --version

# Virtual environment
python -m venv venv
source venv/bin/activate  # Unix/Mac
venv\Scripts\activate     # Windows
```

### Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Key packages
pip install flask fastapi uvicorn
pip install torch sentence-transformers
pip install openai anthropic google-generativeai
pip install langchain langchain-community
pip install pytest pytest-asyncio
```

### Environment Variables
```bash
# .env file (not in repo)
FLASK_ENV=development
FLASK_DEBUG=1
LOG_LEVEL=INFO

# API Keys (session-based, not stored)
# Configured via UI at runtime
```

### Directory Structure
```
skill_prof_gen/
├── app_fastapi.py           # Main application entry
├── auto_test.py              # Comprehensive test suite
├── claude_agents/            # Agent implementations
│   ├── operator_agent.py     # Master coordinator
│   ├── controller_agent.py   # Task controller
│   ├── memory_bank/          # Project knowledge
│   └── AOWex1_SkillProf.md   # Workflow template
├── config/
│   ├── environments.py       # Multi-env support
│   └── settings.py           # App configuration
├── core/
│   ├── rag_pipeline.py        # Vector search engine
│   ├── llm_service.py         # LLM abstraction
│   ├── eightfold_client.py    # API integration
│   └── models.py             # Data models
├── data/
│   ├── embeddings.pt          # Cached embeddings
│   └── skills_metadata.json  # Skills database
├── web/
│   ├── static/
│   │   ├── css/               # Stylesheets
│   │   └── js/                # JavaScript
│   └── templates/
│       └── index.html         # Main UI
└── tests/                    # Test suites
```

## Technical Constraints

### Performance Requirements
- Max response time: 5 seconds for assessment
- Max API latency: 2 seconds
- Max UI update: 100ms
- Memory limit: 2GB for embeddings
- Concurrent users: 50+

### Compatibility
- Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Python: 3.11+ required
- Node.js: Not required (pure Python backend)
- OS: Windows, macOS, Linux

### API Limitations
- Eightfold: Rate limit 100 req/min
- OpenAI: 3 RPM (free tier), 60 RPM (paid)
- Anthropic: Variable based on tier
- Google: 60 QPM (queries per minute)

### Security Requirements
- No hardcoded credentials
- HTTPS only in production
- Session timeout: 30 minutes
- Input sanitization required
- XSS protection enabled

## Dependencies

### Critical Dependencies
```python
# requirements.txt (essential)
flask>=2.3.0
fastapi>=0.100.0
uvicorn>=0.23.0
torch>=2.0.0
sentence-transformers>=2.2.0
openai>=1.0.0
anthropic>=0.25.0
google-generativeai>=0.3.0
langchain>=0.1.0
pydantic>=2.0.0
requests>=2.31.0
pytest>=7.4.0
```

### Optional Dependencies
```python
# For enhanced features
pandas  # Data analysis
numpy   # Numerical operations
pillow  # Image processing
pypdf2  # PDF extraction
redis   # Caching (future)
celery  # Task queue (future)
```

### Version Management
```bash
# Pin versions for production
pip freeze > requirements.lock

# Install exact versions
pip install -r requirements.lock
```

## Development Tools

### IDE Configuration
```json
// .vscode/settings.json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "python.testing.pytestEnabled": true,
  "editor.formatOnSave": true
}
```

### Git Configuration
```bash
# .gitignore essentials
venv/
__pycache__/
*.pyc
.env
.env.*
data/embeddings.pt
cookies.txt
*.log
.coverage
htmlcov/
```

### Testing Commands
```bash
# Run all tests
python auto_test.py

# Run specific test
pytest tests/test_api_endpoints.py

# Run with coverage
pytest --cov=core --cov-report=html

# Run integration tests
python test_eu_environments.py
```

## Deployment Considerations

### Production Requirements
- WSGI server (Gunicorn/uWSGI)
- Reverse proxy (Nginx)
- SSL certificates
- Environment isolation
- Log aggregation
- Monitoring (Prometheus/Grafana)

### Docker Support (Future)
```dockerfile
# Dockerfile (planned)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app_fastapi:app", "--host", "0.0.0.0"]
```

### Scaling Strategy
- Horizontal scaling for API servers
- Shared cache layer (Redis)
- Load balancer for distribution
- CDN for static assets
- Database for persistent storage

## Known Technical Debt

1. **Embedding Regeneration**: Currently manual, needs automation
2. **Cache Invalidation**: No smart invalidation strategy
3. **Error Recovery**: Limited retry mechanisms
4. **Batch Processing**: Not implemented yet
5. **WebSocket Support**: Planned but not implemented
6. **Database Integration**: Currently file-based
7. **Logging**: Needs centralized logging solution
8. **Metrics**: Limited observability