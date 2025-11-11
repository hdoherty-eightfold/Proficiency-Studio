# SkillsProfGen - AI-Powered Skills Assessment System

> Modern React + TypeScript frontend with FastAPI backend for comprehensive skills proficiency evaluation.

## 🚀 Overview

SkillsProfGen 2.0 is a complete rewrite of the skills proficiency assessment system with a modern React frontend and all existing functionality from the original system. It combines AI-powered assessment with RAG pipeline technology and Claude agents for intelligent orchestration.

### ✨ Key Features

- **Modern UI**: React 18 + TypeScript + Tailwind CSS with dark mode support
- **AI-Powered Assessment**: Multiple LLM providers (OpenAI, Anthropic, Google Gemini)
- **RAG Pipeline**: PyTorch-based vector similarity search
- **Eightfold Integration**: Direct API integration with OAuth authentication
- **Multi-Method Assessment**: Direct LLM, RAG-Enhanced, and Python-based evaluation
- **Real-time Progress**: Live assessment tracking with WebSocket support
- **Comprehensive Results**: Detailed proficiency analysis and comparative reports

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/          # UI components by feature
│   │   ├── layout/          # Sidebar, TopBar, Navigation
│   │   ├── auth/            # Authentication & Environment
│   │   ├── skills/          # Skills extraction & management
│   │   ├── upload/          # Resume upload
│   │   ├── assessment/      # LLM config & execution
│   │   ├── results/         # Results display
│   │   └── common/          # Shared components
│   ├── contexts/            # React state management
│   ├── services/            # API client services
│   └── types/               # TypeScript definitions
├── package.json
└── tailwind.config.js
```

### Backend (FastAPI + Python)
```
backend/
├── app/
│   ├── core/                # Existing SkillsProfGen modules
│   ├── claude_agents/       # AI agents
│   ├── config/              # Configuration management
│   └── api/                 # API endpoints
├── main.py                  # FastAPI application
└── requirements.txt
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- At least one LLM API key (OpenAI, Anthropic, etc.)

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 3. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📋 Workflow Steps

### 1. Environment & Authentication
- Select Eightfold environment (USAA TM, ADoherty Demo, EU Dev)
- Configure OAuth credentials
- Test API connectivity

### 2. Skills Extraction & Management
- Extract skills from JIE roles
- Upload custom skills lists
- Search skill taxonomies

### 3. Resume Upload & Analysis
- Upload candidate resumes (PDF, DOC, DOCX, TXT)
- Automatic skills extraction
- Experience level analysis

### 4. LLM Provider Configuration
- Configure API keys for multiple providers
- Set assessment parameters
- Select assessment methods

### 5. Assessment Execution
- Real-time progress tracking
- Multi-method comparison
- Batch processing with concurrency

### 6. Results Management & Analysis
- Detailed proficiency reports
- Method comparison analysis
- Export capabilities
- Assessment history

## 🎯 Assessment Methods

### Direct LLM Assessment
Fast assessment using advanced language models with structured prompts.

### RAG-Enhanced Assessment
Context-aware assessment using vector similarity search and semantic matching.

### Python-Based Matching
Rule-based keyword matching with experience extraction.

## 📊 Proficiency Levels

- **Novice (1)**: Basic understanding, requires significant guidance
- **Developing (2)**: Growing competence, occasional guidance needed
- **Intermediate (3)**: Solid proficiency, works independently
- **Advanced (4)**: High competence, mentors others
- **Expert (5)**: Deep expertise, thought leader

## 🔧 Development

### Frontend Development
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
```

### Backend Development
```bash
cd backend
python main.py       # Development server with auto-reload
pytest              # Run tests
```

### Environment Variables

Create `.env` files in both frontend and backend:

**Frontend (.env)**
```
VITE_API_URL=http://localhost:8000
```

**Backend (.env)**
```
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
GROK_API_KEY=gsk_...

# Eightfold Credentials
EIGHTFOLD_USERNAME=your_username
EIGHTFOLD_PASSWORD=your_password

# Performance Settings
PYTORCH_DEVICE=auto
SKILLS_BATCH_SIZE=100
MAX_CONCURRENT_BATCHES=3
```

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run test
```

### Backend Testing
```bash
cd backend
pytest
```

## 📚 API Documentation

Full API documentation is available at http://localhost:8000/docs when running the backend.

### Key Endpoints

- `GET /api/environments` - List available environments
- `POST /api/auth/test-connection` - Test authentication
- `POST /api/llm/configure` - Configure LLM providers
- `POST /api/skills/upload` - Upload skills list
- `POST /api/assessment/start` - Start assessment
- `GET /api/assessment/{id}/results` - Get results

## 🎨 UI Components

The UI follows the SnapMap design system with:
- Sidebar navigation with step indicators
- Dark mode support with system preference detection
- Responsive design for desktop and mobile
- Toast notifications for user feedback
- Loading states and progress indicators

## 🔄 Migration from Original

This version maintains 100% compatibility with the original SkillsProfGen:
- All existing core modules preserved
- Same assessment algorithms and methods
- Compatible with existing data and configurations
- Enhanced with modern UI and improved user experience

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

- Create an issue on GitHub
- Check the API documentation at `/docs`
- Review the workflow tips in the application

---

**Built with ❤️ using React, TypeScript, FastAPI, and Claude AI**