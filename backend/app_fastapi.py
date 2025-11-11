"""
FastAPI Web Application - Skills Proficiency Generator
Combines Claude agents with RAG pipeline with automatic hot-reload support
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, Response
from contextlib import asynccontextmanager
import os
import secrets
from datetime import datetime
import logging
import json
import httpx
from pathlib import Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

# Create comprehensive logging directory
OPERATION_LOGS_DIR = Path("operation_logs")
OPERATION_LOGS_DIR.mkdir(exist_ok=True)

# Import core components
from config.settings import settings
from config.environments import env_manager
from core.eightfold_client import EightfoldClient
from core.careerhub_client import CareerHubClient
from core.rag_pipeline import RAGSkillsAnalyzer
from core.models import AssessmentRequest, AssessmentResult, ComparisonResult
from core.project_models import ProjectStatus, ApplicationRequest, ApplicationResponse
from core.langchain_service import langchain_service
from core.role_crud_endpoints import RoleCRUDService
from core.assessment_storage import AssessmentStorage

# Import Claude agents
from claude_agents import (
    ControllerAgent, TaskAgent, QAAgent, 
    DemoAgent, EvaluationAgent
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Session storage (in production, use Redis or similar)
sessions_storage: Dict[str, Dict[str, Any]] = {}
api_keys_storage: Dict[str, Dict[str, Any]] = {}

# Sandbox configurations storage
sandbox_configs_file = Path.home() / '.skill_prof_gen' / 'sandbox_configs.json'
sandbox_configs_file.parent.mkdir(parents=True, exist_ok=True)

def load_sandbox_configs() -> Dict[str, Any]:
    """Load sandbox configurations from file"""
    if sandbox_configs_file.exists():
        try:
            with open(sandbox_configs_file, 'r') as f:
                configs = json.load(f)

                # Clean up empty or invalid configurations
                cleaned_configs = {}
                for key, config in configs.items():
                    if (key and key.strip() and
                        config and
                        isinstance(config, dict) and
                        config.get('name') and
                        config['name'].strip()):
                        cleaned_configs[key.strip()] = config

                # Save cleaned configs if any were removed
                if len(cleaned_configs) != len(configs):
                    save_sandbox_configs(cleaned_configs)

                return cleaned_configs
        except Exception as e:
            logger.error(f"Error loading sandbox configs: {e}")
    return {}

def save_sandbox_configs(configs: Dict[str, Any]):
    """Save sandbox configurations to file"""
    try:
        with open(sandbox_configs_file, 'w') as f:
            json.dump(configs, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving sandbox configs: {e}")

# Initialize components globally
eightfold_client: Optional[EightfoldClient] = None
careerhub_client: Optional[CareerHubClient] = None
rag_analyzer: Optional[RAGSkillsAnalyzer] = None
controller_agent: Optional[ControllerAgent] = None
assessment_storage: AssessmentStorage = AssessmentStorage()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global eightfold_client, careerhub_client, rag_analyzer, controller_agent
    
    # Startup
    logger.info("Starting FastAPI application...")
    
    # Initialize components
    eightfold_client = EightfoldClient()
    careerhub_client = CareerHubClient()
    rag_analyzer = RAGSkillsAnalyzer()
    controller_agent = ControllerAgent()
    
    # Update Eightfold client with current environment settings
    current_env = env_manager.get_current_config()
    if current_env:
        if current_env.get('eightfold_api_url'):
            eightfold_client.base_url = current_env['eightfold_api_url']
            logger.info(f"Set Eightfold client base URL to: {eightfold_client.base_url}")
        
        logger.info("Skipping auto-authentication on startup")
    
    # Skills will be loaded from API when credentials are provided
    logger.info("Skills will be loaded when API credentials are provided")
    
    yield
    
    # Shutdown
    logger.info("Shutting down FastAPI application...")

# Initialize FastAPI app with lifespan manager
app = FastAPI(
    title="Skills Proficiency Generator",
    description="AI-powered skills proficiency assessment system",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip middleware removed - was causing Content-Length issues with large responses
# app.add_middleware(GZipMiddleware, minimum_size=1000)

# Mount static files
app.mount("/static", StaticFiles(directory="web/static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="web/templates")

# Dependency to get session
async def get_session(request: Request) -> Dict[str, Any]:
    """Get or create session for the request"""
    session_id = request.cookies.get("session_id")
    
    if not session_id:
        session_id = secrets.token_urlsafe(32)
    
    if session_id not in sessions_storage:
        sessions_storage[session_id] = {"session_id": session_id}
    
    # Store session_id in the session dict for cookie setting
    sessions_storage[session_id]["session_id"] = session_id
    sessions_storage[session_id]["_needs_cookie"] = session_id not in request.cookies
    
    return sessions_storage[session_id]

# Request/Response models
class APIKeysUpdate(BaseModel):
    openai: Optional[str] = None
    anthropic: Optional[str] = None
    google: Optional[str] = None
    grok: Optional[str] = None

class ConfigurationUpdate(BaseModel):
    eightfold_username: Optional[str] = None
    eightfold_password: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    grok_api_key: Optional[str] = None

class SkillsExtractRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

class SkillsProficiencyRequest(BaseModel):
    """Request for assessing proficiencies of skills"""
    skills: List[Dict[str, Any]]  # Skills from API
    resume_text: str  # Resume text to assess against
    provider: str = "openai"  # LLM provider
    model: Optional[str] = Field(
        default=None,
        description="Specific model to use (e.g., gpt-4, gpt-3.5-turbo)"
    )
    proficiency_levels: List[str] = Field(
        default=["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        description="Proficiency levels to use for assessment"
    )
    prompt_template: Optional[str] = Field(
        default=None,
        description="Custom prompt template for assessment"
    )
    use_langchain: bool = Field(
        default=False,
        description="Whether to use LangChain for processing"
    )
    api_key: Optional[str] = Field(
        default=None,
        description="API key for the provider (fallback when session storage fails)"
    )

class SkillProficiencyAssessment(BaseModel):
    """Assessment of a single skill's proficiency"""
    skill_name: str
    proficiency: int = Field(ge=1, le=5)  # Numeric proficiency (1-5)
    confidence_score: float = Field(ge=0.0, le=1.0)
    reasoning: str

class ProficiencyAssessmentResponse(BaseModel):
    """Response for proficiency assessment"""
    success: bool
    total_skills: int
    assessed_skills: List[SkillProficiencyAssessment]
    llm_provider: str
    llm_request: Dict[str, Any]
    llm_response: Dict[str, Any]
    api_request_payload: Dict[str, Any]  # For API update
    reasoning_file_path: str
    saved_assessment_file: Optional[str] = None  # Filename of saved assessment
    timestamp: str
    warning: Optional[str] = Field(default=None, description="Warning message about processing issues")
    batch_info: Optional[Dict[str, Any]] = Field(default=None, description="Batch processing information including UI settings")
    error: Optional[str] = Field(default=None, description="Error message if assessment failed")
    detail: Optional[str] = Field(default=None, description="Detailed error information")

class AuthTestRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    api_url: Optional[str] = None
    auth_header: Optional[str] = None  # Allow custom auth header for different environments

class AuthResponse(BaseModel):
    bearer_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: Optional[int] = None
    user_info: Optional[Dict[str, Any]] = None
    status_code: Optional[int] = None
    body: Optional[Dict[str, Any]] = None

class APITestResponse(BaseModel):
    endpoint: str
    status_code: Optional[int] = None
    test_description: str
    headers: Optional[Dict[str, Any]] = None
    body: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    response: Optional[str] = None

class CodeDetails(BaseModel):
    python_code: str
    description: str
    step: str

class AuthTestResponse(BaseModel):
    success: bool
    message: str
    authenticated: bool
    auth_response: Optional[AuthResponse] = None
    api_test_response: Optional[APITestResponse] = None
    code_details: Optional[CodeDetails] = None
    request_details: Optional[Dict[str, Any]] = None

class SandboxConfig(BaseModel):
    name: str
    apiUrl: str = Field(default="https://apiv2.eightfold.ai")
    username: str
    password: str
    description: Optional[str] = None
    authHeader: Optional[str] = None
    grantType: Optional[str] = Field(default="password")

class SandboxConfigsResponse(BaseModel):
    configs: Dict[str, Any]

# Routes
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/test", response_class=HTMLResponse)
async def test_page(request: Request):
    """Test page for debugging API Explorer"""
    return templates.TemplateResponse("test_api_explorer.html", {"request": request})

@app.get("/favicon.ico")
async def favicon():
    """Return a simple favicon to avoid 404 errors"""
    favicon_path = "web/static/favicon.ico"
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")
    else:
        # Return 204 No Content for missing favicon
        return JSONResponse(content={}, status_code=204)

@app.get("/api/status")
async def api_status():
    """Get API status"""
    return JSONResponse({
        "status": "running",
        "version": "2.0.0",
        "server": "FastAPI with auto-reload",
        "timestamp": datetime.now().isoformat()
    })

@app.get("/api/keys/status")
async def api_keys_status(session: Dict = Depends(get_session)):
    """Get API keys configuration status from session storage"""
    session_id = session.get('session_id', '')
    stored_keys = api_keys_storage.get(session_id, {})
    
    def is_configured(key):
        return bool(key and not key.startswith('your_') and not key.endswith('_here'))
    
    # Debug logging
    logger.info(f"Google API key from settings: {settings.google_api_key}")
    logger.info(f"Google API key configured: {is_configured(settings.google_api_key)}")
    
    return JSONResponse({
        "openai": is_configured(stored_keys.get('openai', '')) or is_configured(settings.openai_api_key),
        "anthropic": is_configured(stored_keys.get('anthropic', '')) or is_configured(settings.anthropic_api_key),
        "google": is_configured(stored_keys.get('google', '')) or is_configured(settings.google_api_key),
        "grok": is_configured(stored_keys.get('grok', '')) or is_configured(settings.grok_api_key),
        "eightfold": bool(eightfold_client.auth_token) if eightfold_client else False
    })

@app.post("/api/keys/set-preset-google")
async def set_preset_google_key(session: Dict = Depends(get_session)):
    """Set the preset Google API key in session storage"""
    session_id = session.get('session_id', '')
    if session_id not in api_keys_storage:
        api_keys_storage[session_id] = {}
    
    # Use the key from environment variables, not hardcoded
    # Only set if environment has a valid key configured
    if settings.google_api_key and not settings.google_api_key.startswith('your_'):
        api_keys_storage[session_id]['google'] = settings.google_api_key
    
    return JSONResponse({
        "success": True,
        "message": "Preset Google API key has been set",
        "key_preview": preset_key[:10] + "..."
    })

@app.post("/api/keys/test")
async def test_llm_keys(session: Dict = Depends(get_session)):
    """Test LLM API keys by making actual API calls"""
    session_id = session.get('session_id', '')
    stored_keys = api_keys_storage.get(session_id, {})
    
    results = {}
    
    # Test OpenAI
    if 'openai' in stored_keys and stored_keys['openai']:
        try:
            import openai
            client = openai.OpenAI(api_key=stored_keys['openai'])
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Say 'API key works'"}],
                max_tokens=10
            )
            results['openai'] = {
                "configured": True,
                "status": "valid",
                "message": "OpenAI API key is valid",
                "response": response.choices[0].message.content
            }
        except Exception as e:
            results['openai'] = {
                "configured": True,
                "status": "invalid",
                "error": str(e)
            }
    else:
        results['openai'] = {"configured": False}
    
    # Test Anthropic
    if 'anthropic' in stored_keys and stored_keys['anthropic']:
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=stored_keys['anthropic'])
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Say 'API key works'"}]
            )
            results['anthropic'] = {
                "configured": True,
                "status": "valid",
                "message": "Anthropic API key is valid",
                "response": response.content[0].text
            }
        except Exception as e:
            results['anthropic'] = {
                "configured": True,
                "status": "invalid",
                "error": str(e)
            }
    else:
        results['anthropic'] = {"configured": False}
    
    # Test Google - check both session storage and settings fallback
    google_key = stored_keys.get('google') or settings.google_api_key
    if google_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=google_key)
            # Use a reliable model that's known to work
            model = genai.GenerativeModel('gemini-2.5-pro')
            response = model.generate_content("Say 'API key works'")
            results['google'] = {
                "configured": True,
                "status": "valid",
                "message": "Google API key is valid (from settings fallback)" if not stored_keys.get('google') else "Google API key is valid",
                "response": response.text
            }
        except Exception as e:
            results['google'] = {
                "configured": True,
                "status": "invalid",
                "error": str(e)
            }
    else:
        results['google'] = {"configured": False}
    
    # Test Grok (placeholder)
    if 'grok' in stored_keys and stored_keys['grok']:
        results['grok'] = {
            "configured": True,
            "status": "valid",
            "message": "Grok API key stored (not tested)",
            "response": "Grok testing not implemented"
        }
    else:
        results['grok'] = {"configured": False}
    
    return JSONResponse(results)

@app.post("/api/test-gemini-connection")
async def test_gemini_connection(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Test Google Gemini connection specifically"""
    api_key = request.get('api_key')
    model = request.get('model', 'gemini-2.5-pro')
    provider = request.get('provider', 'google')
    
    if not api_key:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "API key is required"}
        )
    
    attempted_models = [model]  # Track attempted models for debugging
    
    try:
        import google.generativeai as genai
        
        # Configure the API key
        genai.configure(api_key=api_key)
        
        # Try to create and test the model
        try:
            gemini_model = genai.GenerativeModel(model)
            
            # Test with a simple prompt
            test_prompt = "Hello! Please respond with 'Connection successful' to confirm the API is working."
            response = gemini_model.generate_content(test_prompt)
            
            # Store the working API key in session
            session_id = session.get('session_id', '')
            if session_id:
                current_keys = api_keys_storage.get(session_id, {})
                current_keys[provider] = api_key
                api_keys_storage[session_id] = current_keys
            
            return JSONResponse(content={
                "success": True,
                "model": model,
                "test_response": response.text[:100] + "..." if len(response.text) > 100 else response.text,
                "message": f"Successfully connected to {model}"
            })
            
        except Exception as model_error:
            # If the specific model fails, try fallbacks in order of preference
            fallback_models = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-pro"]
            
            # Remove the original model from fallbacks to avoid infinite loop
            if model in fallback_models:
                fallback_models.remove(model)
            
            for fallback_model_name in fallback_models:
                try:
                    fallback_model = genai.GenerativeModel(fallback_model_name)
                    test_prompt = "Hello! Please respond with 'Connection successful' to confirm the API is working."
                    response = fallback_model.generate_content(test_prompt)
                    
                    # Store the working API key in session
                    session_id = session.get('session_id', '')
                    if session_id:
                        current_keys = api_keys_storage.get(session_id, {})
                        current_keys[provider] = api_key
                        api_keys_storage[session_id] = current_keys
                    
                    return JSONResponse(content={
                        "success": True,
                        "model": fallback_model_name,
                        "test_response": response.text[:100] + "..." if len(response.text) > 100 else response.text,
                        "message": f"Connected using fallback model {fallback_model_name} (original model {model} had issues: {str(model_error)[:100]})"
                    })
                except Exception as fallback_error:
                    continue  # Try next fallback
            
            # If all fallbacks failed, raise the original error
            raise model_error
            
    except Exception as e:
        error_message = str(e)
        if "API_KEY_INVALID" in error_message:
            error_message = "Invalid API key. Please check your Google AI Studio API key."
        elif "PERMISSION_DENIED" in error_message:
            error_message = "Permission denied. Please ensure your API key has access to Gemini models."
        elif "QUOTA_EXCEEDED" in error_message:
            error_message = "API quota exceeded. Please check your usage limits."
        
        # Detailed debug information for the popup
        debug_info = {
            "error_type": type(e).__name__,
            "original_error": str(e),
            "attempted_models": attempted_models,
            "request_details": {
                "provider": provider,
                "original_model": model,
                "api_key_provided": bool(api_key and len(api_key) > 10),
                "api_key_prefix": api_key[:10] + "..." if api_key and len(api_key) > 10 else "Not provided"
            },
            "test_prompt": "Hello! Please respond with 'Connection successful' to confirm the API is working."
        }
        
        return JSONResponse(
            status_code=400,
            content={
                "success": False, 
                "error": error_message,
                "debug_info": debug_info,
                "attempted_models": attempted_models
            }
        )

@app.post("/api/keys/test-with-models")
async def test_api_key_with_models(request: Dict[str, str], session: Dict = Depends(get_session)):
    """Test a single LLM provider and return available models"""
    provider = request.get("provider")
    
    if not provider:
        return JSONResponse({
            "status": "error",
            "message": "No provider specified"
        }, status_code=400)
    
    # Get session API keys
    session_id = session.get('session_id', '')
    session_keys = api_keys_storage.get(session_id, {})
    
    if provider not in session_keys:
        return JSONResponse({
            "status": "error",
            "message": f"{provider} API key not configured",
            "models": []
        })
    
    # Test the API key and get models
    try:
        if provider == "openai":
            import openai
            openai.api_key = session_keys[provider]
            
            # Get available models
            models_response = openai.models.list()
            models = [model.id for model in models_response.data 
                     if 'gpt' in model.id.lower()]
            
            # Test with a simple completion
            test_response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5
            )
            
            return JSONResponse({
                "status": "success",
                "provider": provider,
                "endpoint": "https://api.openai.com/v1",
                "models": sorted(models),
                "response": test_response.choices[0].message.content,
                "message": f"OpenAI API key valid. Found {len(models)} models."
            })
            
        elif provider == "google":
            import google.generativeai as genai
            genai.configure(api_key=session_keys[provider])
            
            # Get available models
            models_list = genai.list_models()
            models = [model.name.replace('models/', '') 
                     for model in models_list 
                     if 'generateContent' in model.supported_generation_methods]
            
            # Test with a simple prompt - use first available model or fallback
            test_model = models[0] if models else 'gemini-2.5-flash'
            try:
                model = genai.GenerativeModel(test_model)
            except:
                model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content("Hi")
            
            return JSONResponse({
                "status": "success",
                "provider": provider,
                "endpoint": "https://generativelanguage.googleapis.com",
                "models": sorted(models),
                "response": response.text[:100] if response.text else "Success",
                "message": f"Google API key valid. Found {len(models)} models."
            })
            
        elif provider == "anthropic":
            import anthropic
            client = anthropic.Anthropic(api_key=session_keys[provider])
            
            # Anthropic doesn't have a list models endpoint, use known models
            models = ["claude-3-opus-20240229", "claude-3-sonnet-20240229", 
                     "claude-2.1", "claude-instant-1.2"]
            
            # Test with a simple message
            response = client.messages.create(
                model="claude-2.1",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            
            return JSONResponse({
                "status": "success",
                "provider": provider,
                "endpoint": "https://api.anthropic.com",
                "models": models,
                "response": response.content[0].text if response.content else "Success",
                "message": f"Anthropic API key valid. {len(models)} models available."
            })
            
        elif provider == "kimi":
            # Kimi (Moonshot) - OpenAI compatible API
            import openai
            
            # Configure for Kimi's endpoint
            client = openai.OpenAI(
                api_key=session_keys[provider],
                base_url="https://api.moonshot.cn/v1"
            )
            
            # Try to fetch models dynamically first
            models = []
            try:
                # Attempt to list models like OpenAI
                models_response = client.models.list()
                models = [model.id for model in models_response.data]
            except:
                # If listing fails, fallback to known models (largest context first)
                models = ["moonshot-v2-128k", "moonshot-v2-32k", "moonshot-v2-8k", 
                         "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"]
            
            # Test with a simple completion
            try:
                test_response = client.chat.completions.create(
                    model=models[0] if models else "moonshot-v2-128k",
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=5
                )
                
                return JSONResponse({
                    "status": "success",
                    "provider": provider,
                    "endpoint": "https://api.moonshot.cn/v1",
                    "models": models,
                    "response": test_response.choices[0].message.content,
                    "message": f"Kimi API key valid. {len(models)} models available."
                })
            except Exception as e:
                return JSONResponse({
                    "status": "error",
                    "provider": provider,
                    "message": f"Kimi API error: {str(e)}",
                    "models": models
                })
                
        elif provider == "deepseek":
            # DeepSeek - OpenAI compatible API
            import openai
            
            # Configure for DeepSeek's endpoint
            client = openai.OpenAI(
                api_key=session_keys[provider],
                base_url="https://api.deepseek.com"
            )
            
            # Try to fetch models dynamically first
            models = []
            try:
                # Attempt to list models like OpenAI
                models_response = client.models.list()
                models = [model.id for model in models_response.data]
            except:
                # If listing fails, fallback to known models
                models = ["deepseek-chat", "deepseek-coder"]
            
            # Test with a simple completion
            try:
                test_response = client.chat.completions.create(
                    model=models[0] if models else "deepseek-chat",
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=5
                )
                
                return JSONResponse({
                    "status": "success",
                    "provider": provider,
                    "endpoint": "https://api.deepseek.com",
                    "models": models,
                    "response": test_response.choices[0].message.content,
                    "message": f"DeepSeek API key valid. {len(models)} models available."
                })
            except Exception as e:
                return JSONResponse({
                    "status": "error",
                    "provider": provider,
                    "message": f"DeepSeek API error: {str(e)}",
                    "models": models
                })
                
        else:
            return JSONResponse({
                "status": "error",
                "message": f"Provider {provider} not supported",
                "models": []
            })
            
    except Exception as e:
        return JSONResponse({
            "status": "error",
            "provider": provider,
            "message": str(e),
            "models": []
        })

@app.post("/api/keys/test-single")
async def test_single_llm_key(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Test a single LLM API key by making an actual API call"""
    provider = request.get('provider', 'openai')
    session_id = session.get('session_id', '')
    stored_keys = api_keys_storage.get(session_id, {})
    
    # Test the specified provider
    if provider == 'openai':
        if 'openai' in stored_keys and stored_keys['openai']:
            try:
                import openai
                client = openai.OpenAI(api_key=stored_keys['openai'])
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "Say 'API key works' in 3 words"}],
                    max_tokens=10
                )
                return JSONResponse({
                    "configured": True,
                    "status": "valid",
                    "message": "OpenAI API key is valid and working",
                    "response": response.choices[0].message.content
                })
            except Exception as e:
                return JSONResponse({
                    "configured": True,
                    "status": "invalid",
                    "error": str(e)
                })
        else:
            return JSONResponse({"configured": False})
    
    elif provider == 'anthropic':
        if 'anthropic' in stored_keys and stored_keys['anthropic']:
            try:
                from anthropic import Anthropic
                client = Anthropic(api_key=stored_keys['anthropic'])
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "Say 'API key works' in 3 words"}]
                )
                return JSONResponse({
                    "configured": True,
                    "status": "valid",
                    "message": "Anthropic API key is valid and working",
                    "response": response.content[0].text
                })
            except Exception as e:
                return JSONResponse({
                    "configured": True,
                    "status": "invalid",
                    "error": str(e)
                })
        else:
            return JSONResponse({"configured": False})
    
    elif provider == 'google':
        if 'google' in stored_keys and stored_keys['google']:
            try:
                import google.generativeai as genai
                genai.configure(api_key=stored_keys['google'])
                # Try latest model first
                try:
                    model = genai.GenerativeModel('gemini-2.5-flash')
                except:
                    model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content("Say 'API key works' in 3 words")
                return JSONResponse({
                    "configured": True,
                    "status": "valid",
                    "message": "Google API key is valid and working",
                    "response": response.text
                })
            except Exception as e:
                return JSONResponse({
                    "configured": True,
                    "status": "invalid",
                    "error": str(e)
                })
        else:
            return JSONResponse({"configured": False})
    
    elif provider == 'grok':
        if 'grok' in stored_keys and stored_keys['grok']:
            return JSONResponse({
                "configured": True,
                "status": "valid",
                "message": "Grok API key stored (testing not implemented)",
                "response": "Key stored successfully"
            })
        else:
            return JSONResponse({"configured": False})
    
    elif provider == 'kimi':
        if 'kimi' in stored_keys and stored_keys['kimi']:
            try:
                import openai
                client = openai.OpenAI(
                    api_key=stored_keys['kimi'],
                    base_url="https://api.moonshot.cn/v1"
                )
                response = client.chat.completions.create(
                    model="moonshot-v1-8k",
                    messages=[{"role": "user", "content": "Say 'API key works' in 3 words"}],
                    max_tokens=10
                )
                return JSONResponse({
                    "configured": True,
                    "status": "valid",
                    "message": "Kimi API key is valid and working",
                    "response": response.choices[0].message.content
                })
            except Exception as e:
                return JSONResponse({
                    "configured": True,
                    "status": "invalid",
                    "error": str(e)
                })
        else:
            return JSONResponse({"configured": False})
    
    elif provider == 'deepseek':
        if 'deepseek' in stored_keys and stored_keys['deepseek']:
            try:
                import openai
                client = openai.OpenAI(
                    api_key=stored_keys['deepseek'],
                    base_url="https://api.deepseek.com"
                )
                response = client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[{"role": "user", "content": "Say 'API key works' in 3 words"}],
                    max_tokens=10
                )
                return JSONResponse({
                    "configured": True,
                    "status": "valid",
                    "message": "DeepSeek API key is valid and working",
                    "response": response.choices[0].message.content
                })
            except Exception as e:
                return JSONResponse({
                    "configured": True,
                    "status": "invalid",
                    "error": str(e)
                })
        else:
            return JSONResponse({"configured": False})
    
    else:
        return JSONResponse({
            "configured": False,
            "error": f"Unknown provider: {provider}"
        })

@app.post("/api/keys/update")
async def update_api_keys(keys: APIKeysUpdate, session: Dict = Depends(get_session)):
    """Update API keys in session storage"""
    session_id = session.get('session_id', '')
    
    if session_id not in api_keys_storage:
        api_keys_storage[session_id] = {}
    
    # Update only provided keys
    if keys.openai is not None:
        api_keys_storage[session_id]['openai'] = keys.openai
    if keys.anthropic is not None:
        api_keys_storage[session_id]['anthropic'] = keys.anthropic
    if keys.google is not None:
        api_keys_storage[session_id]['google'] = keys.google
    if keys.grok is not None:
        api_keys_storage[session_id]['grok'] = keys.grok
    
    # Update RAG analyzer with session keys
    if rag_analyzer and rag_analyzer.llm_service:
        # Store keys in LLM service for this session
        for key, value in api_keys_storage[session_id].items():
            if key == 'openai':
                rag_analyzer.llm_service.openai_api_key = value
            elif key == 'anthropic':
                rag_analyzer.llm_service.anthropic_api_key = value
            elif key == 'google':
                rag_analyzer.llm_service.google_api_key = value
            elif key == 'grok':
                rag_analyzer.llm_service.grok_api_key = value
    
    response = JSONResponse({
        "status": "success",
        "message": "API keys updated for session"
    })
    
    # Set session cookie if needed
    if session.get("_needs_cookie"):
        response.set_cookie("session_id", session_id, httponly=True, secure=False, samesite="lax")
    
    return response

@app.get("/api/environments")
async def get_environments():
    """Get available environments"""
    environments = env_manager.get_environments()
    
    # Ensure we have USAA TM Sandbox
    if not environments or "USAA TM Sandbox" not in environments:
        # Force recreation if missing
        env_manager._create_default_environments()
        environments = env_manager.get_environments()
    
    # Get current environment, default to USAA TM Sandbox
    current = env_manager.get_current_environment()
    if not current or current not in environments:
        current = "USAA TM Sandbox"
        env_manager.set_current_environment(current)
    
    return JSONResponse({
        "environments": list(environments.keys()),
        "current": current
    })

@app.post("/api/environments/{env_name}")
async def switch_environment(env_name: str):
    """Switch to a different environment"""
    global eightfold_client
    
    try:
        # Get the environment config
        environments = env_manager.get_environments()
        if env_name not in environments:
            raise ValueError(f"Environment '{env_name}' not found")
        
        config = environments[env_name]
        env_manager.current_env = env_name
        
        # Update Eightfold client with new environment
        if eightfold_client and config.get('eightfold_api_url'):
            eightfold_client.base_url = config['eightfold_api_url']
            eightfold_client.auth_token = None  # Reset auth token
            
        return JSONResponse({
            "status": "success",
            "environment": env_name,
            "config": config
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

async def test_api_endpoint(client: EightfoldClient, endpoint: str) -> APITestResponse:
    """Test an API endpoint with the authenticated client"""
    try:
        response = client.session.get(
            endpoint,
            params={"limit": 1},  # Minimal request for auth testing
            headers={"Authorization": f"Bearer {client.auth_token}"},
            timeout=10
        )
        
        # For authentication testing, we only care about the status, not the data
        simplified_body = None
        error_message = None
        
        if response.status_code == 200:
            # Success - just indicate the token works
            simplified_body = {
                "status": "Token verified successfully",
                "endpoint_accessible": True,
                "message": "Bearer token is valid and working"
            }
        else:
            error_message = f"HTTP {response.status_code}: Authentication may have failed"
            simplified_body = {
                "status": "Token verification failed",
                "endpoint_accessible": False,
                "error_code": response.status_code
            }
        
        return APITestResponse(
            endpoint=endpoint,
            status_code=response.status_code,
            test_description="Bearer token verification",
            headers=None,  # Don't include headers in response
            body=simplified_body,
            error=error_message,
            response=f"Token verification: {'Success' if response.status_code == 200 else 'Failed'}"
        )
        
    except Exception as e:
        return APITestResponse(
            endpoint=endpoint,
            test_description="Bearer token verification",
            error=f"Connection error: {str(e)}",
            body={"status": "Unable to verify token", "error": str(e)},
            response="Token verification failed - connection error"
        )

@app.post("/api/test/auth", response_model=AuthTestResponse)
async def test_authentication(auth_request: AuthTestRequest):
    """Test Eightfold API authentication with detailed response"""
    if not eightfold_client:
        raise HTTPException(status_code=500, detail="Eightfold client not initialized")
    
    username = auth_request.username
    password = auth_request.password
    api_url = auth_request.api_url or "https://apiv2.eightfold.ai"
    
    if not username or not password:
        return AuthTestResponse(
            success=False,
            message="Username and password are required",
            authenticated=False,
            code_details=CodeDetails(
                python_code="# Error: Missing credentials",
                description="Username and password must be provided",
                step="Validation"
            )
        )
    
    try:
        # Use custom auth header if provided, otherwise use default TM Sandbox one
        if auth_request.auth_header:
            # Extract the Basic auth value from the provided header
            if auth_request.auth_header.startswith("Basic "):
                PRE_AUTH_VALUE = auth_request.auth_header[6:]  # Remove "Basic " prefix
            else:
                PRE_AUTH_VALUE = auth_request.auth_header
        else:
            # Default to TM Sandbox auth header
            PRE_AUTH_VALUE = "MU92YTg4T1JyMlFBVktEZG8wc1dycTdEOnBOY1NoMno1RlFBMTZ6V2QwN3cyeUFvc3QwTU05MmZmaXFFRDM4ZzJ4SFVyMGRDaw=="
        
        # Prepare code details for transparency
        code_details = CodeDetails(
            python_code=f'''# Eightfold API Authentication
import requests

# OAuth endpoint for authentication
auth_url = "{api_url}/oauth/v1/authenticate"

# Pre-auth value for Basic auth header (standard Eightfold client credentials)
PRE_AUTH_VALUE = "MU92YTg4T1JyMlFBVktEZG8wc1dycTdEOnBOY1NoMno1RlFBMTZ6V2QwN3cyeUFvc3QwTU05MmZmaXFFRDM4ZzJ4SFVyMGRDaw=="

headers = {{
    "Authorization": f"Basic {{PRE_AUTH_VALUE}}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}}

payload = {{
    "grantType": "password",
    "username": "{username}",
    "password": "{password}"
}}

# Make authentication request
response = requests.post(auth_url, headers=headers, json=payload, timeout=30)''',
            description="OAuth authentication flow with Eightfold API",
            step="Authentication"
        )
        
        # Real authentication
        success = eightfold_client.authenticate(username, password)
        
        if success and eightfold_client.auth_token:
            # Create auth response
            auth_response = AuthResponse(
                bearer_token=eightfold_client.auth_token,
                token_type="Bearer",
                user_info={"username": username},
                status_code=200,
                body={
                    "access_token": eightfold_client.auth_token,
                    "token_type": "Bearer",
                    "username": username,
                    "authenticated": True
                }
            )
            
            # Test the token with a real API endpoint
            test_endpoint = f"{api_url}/api/v2/core/positions"
            api_test_response = await test_api_endpoint(eightfold_client, test_endpoint)
            
            # Build complete request details for reproducibility
            auth_request_details = {
                "endpoint": f"{api_url}/oauth/v1/authenticate",
                "method": "POST",
                "headers": {
                    "Authorization": f"Basic {PRE_AUTH_VALUE}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                "body": {
                    "grantType": "password",
                    "username": username,
                    "password": "***" # Masked for security
                },
                "timestamp": datetime.now().isoformat(),
                "base_url": api_url
            }
            
            return AuthTestResponse(
                success=True,
                message="Authentication successful",
                authenticated=True,
                auth_response=auth_response,
                api_test_response=api_test_response,
                code_details=code_details,
                request_details=auth_request_details
            )
        else:
            # Authentication failed - provide detailed error response
            auth_response = AuthResponse(
                bearer_token=None,
                token_type="Bearer",
                user_info={"username": username},
                status_code=401,
                body={
                    "error": "Authentication failed",
                    "message": "Invalid credentials or API unavailable",
                    "username": username,
                    "authenticated": False
                }
            )
            
            return AuthTestResponse(
                success=False,
                message="Authentication failed - invalid credentials or API unavailable",
                authenticated=False,
                auth_response=auth_response,
                code_details=code_details
            )
                
    except Exception as e:
        logger.error(f"Error testing authentication: {e}")
        
        # Error response
        auth_response = AuthResponse(
            bearer_token=None,
            token_type="Bearer",
            user_info={"username": username},
            status_code=500,
            body={
                "error": "Server error",
                "message": str(e),
                "username": username,
                "authenticated": False
            }
        )
        
        return AuthTestResponse(
            success=False,
            message=f"Authentication error: {str(e)}",
            authenticated=False,
            auth_response=auth_response,
            code_details=code_details
        )

@app.get("/api/latest-skills")
async def get_latest_skills():
    """Get the latest skills from LatestSkills.json"""
    try:
        latest_skills_path = Path("core/LatestSkills.json")
        if not latest_skills_path.exists():
            return JSONResponse(
                status_code=404,
                content={"error": "LatestSkills.json not found. Please run a skill assessment first."}
            )

        with open(latest_skills_path, 'r', encoding='utf-8') as f:
            skills_data = json.load(f)

        return JSONResponse(content=skills_data)
    except json.JSONDecodeError as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Invalid JSON in LatestSkills.json: {str(e)}"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to load latest skills: {str(e)}"}
        )

@app.get("/api/assessments/list")
async def list_assessments(limit: int = 50):
    """List saved assessment files with metadata"""
    try:
        assessments = assessment_storage.list_assessments(limit=limit)
        return {
            "success": True,
            "assessments": assessments,
            "storage_info": assessment_storage.get_storage_info()
        }
    except Exception as e:
        logger.error(f"Error listing assessments: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/assessments/load/{filename}")
async def load_assessment(filename: str):
    """Load a specific assessment by filename"""
    try:
        assessment = assessment_storage.load_assessment(filename)
        if assessment:
            return {
                "success": True,
                "assessment": assessment
            }
        else:
            raise HTTPException(status_code=404, detail="Assessment not found")
    except Exception as e:
        logger.error(f"Error loading assessment {filename}: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/assessments/save")
async def save_assessment(assessment_data: Dict[str, Any]):
    """Save an assessment to disk"""
    try:
        filename = assessment_storage.save_assessment(assessment_data)
        return {
            "success": True,
            "filename": filename,
            "message": f"Assessment saved as {filename}"
        }
    except Exception as e:
        logger.error(f"Error saving assessment: {e}")
        return {"success": False, "error": str(e)}

@app.delete("/api/assessments/{filename}")
async def delete_assessment(filename: str):
    """Delete a specific assessment"""
    try:
        success = assessment_storage.delete_assessment(filename)
        if success:
            return {"success": True, "message": f"Assessment {filename} deleted"}
        else:
            raise HTTPException(status_code=404, detail="Assessment not found")
    except Exception as e:
        logger.error(f"Error deleting assessment {filename}: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/skills/assess-proficiencies-simple")
async def assess_skills_simple(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Simplified assessment - just skills and proficiency levels, no resume"""
    import json
    from datetime import datetime
    import os
    
    try:
        logger.info(f"[{datetime.now().strftime('%H:%M:%S')}] assess_skills_simple endpoint called")
        logger.info(f"Request size: {len(json.dumps(request))} bytes")

        # Get session API keys
        session_id = session.get('session_id', '')
        session_keys = api_keys_storage.get(session_id, {})

        skills = request.get('skills', [])
        provider = request.get('provider', 'openai')
        model = request.get('model', None)
        proficiency_levels = request.get('proficiency_levels', ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert'])
        prompt_template = request.get('prompt_template')
        use_langchain = request.get('use_langchain', True)
        response_format = request.get('response_format', 'json')  # json, compact, minimal, csv
        include_reasoning = request.get('include_reasoning', False)  # Whether to include reasoning in response
        # Extract batch configuration from request - USE UI VALUES, no backend defaults
        batch_size = request.get('batch_size')  # UI must provide this
        concurrent_batches = request.get('concurrent_batches')  # UI must provide this
        processing_mode = request.get('processing_mode')  # UI must provide this

        # Extract chunk persistence parameters
        enable_chunk_persistence = request.get('enable_chunk_persistence', False)
        restart_from_chunk = request.get('restart_from_chunk', None)
        chunk_session_id = request.get('session_id', session_id)

        # Log what we received to ensure UI values are being used
        if batch_size is None:
            logger.warning("No batch_size provided by UI, using user's last saved preference")
            batch_size = 650  # Only as last resort
        if concurrent_batches is None:
            logger.warning("No concurrent_batches provided by UI, using user's preference")
            concurrent_batches = 2  # User-friendly default
        if processing_mode is None:
            logger.warning("No processing_mode provided by UI, using user's preference")
            processing_mode = 'parallel'  # User-friendly default

        logger.info(f"Provider: {provider}, Model: {model}, Skills count: {len(skills)}")
        logger.info(f"Batch config - size: {batch_size}, concurrent: {concurrent_batches}, mode: {processing_mode}")

        # Support for chunking - process only a subset of skills
        # IMPORTANT: Frontend pre-slices the array and always sends chunk_start=0
        # We should NOT re-slice the array here
        chunk_start = request.get('chunk_start', 0)  # 0-indexed
        chunk_size = request.get('chunk_size', None)
        is_chunked = request.get('is_chunked', False)  # New flag to indicate pre-chunked data

        # Debug logging to understand the chunk parameters
        logger.info(f"[DEBUG] Chunk parameters - chunk_start: {chunk_start}, chunk_size: {chunk_size}, is_chunked: {is_chunked}, skills_count: {len(skills)}")

        # If frontend indicates data is pre-chunked, don't slice again
        if is_chunked:
            logger.info(f"Processing pre-chunked data: {len(skills)} skills")
        elif chunk_size and chunk_start == 0 and len(skills) == chunk_size:
            # Frontend likely already sliced if array size matches chunk_size exactly
            logger.info(f"Skills array size matches chunk_size, assuming pre-chunked: {len(skills)} skills")
        elif chunk_size and chunk_start >= 0 and len(skills) > chunk_size:
            # Only slice if we have more skills than chunk_size and valid start position
            original_total = len(skills)
            end_index = min(chunk_start + chunk_size, len(skills))
            skills = skills[chunk_start:end_index]
            logger.info(f"Sliced skills array: positions {chunk_start+1} to {chunk_start+len(skills)} of {original_total} total")
        else:
            # Process all skills as-is
            logger.info(f"Processing all {len(skills)} skills without slicing")
        
        if not skills:
            return JSONResponse({
                "success": False,
                "detail": "No skills provided"
            })
        
        # Build the skills list text
        skills_text = "\n".join([f"- {skill.get('name', skill.get('skill_name', ''))}" 
                                for skill in skills])
        proficiency_text = "\n".join([f"- {level}" for level in proficiency_levels])
        
        # Use LangChain if requested
        if use_langchain:
            # Initialize LangChain service
            from core.langchain_service import LangChainService
            langchain_service = LangChainService()

            # Update LangChain service with session keys
            if session_keys:
                langchain_service.update_api_keys(session_keys)
            
            # Get the appropriate API key
            provider_key = session_keys.get(provider)
            
            # IMPORTANT: Check if we need to modify the prompt based on include_reasoning
            # If user provided a prompt but wants no reasoning, we need to modify it
            if prompt_template and not include_reasoning and 'reasoning' in prompt_template.lower():
                # User provided a prompt with reasoning but turned off reasoning
                # Replace the prompt with one that doesn't ask for reasoning
                logger.info("Modifying user prompt to remove reasoning requirement")
                prompt_template = prompt_template.replace('"reasoning": "', '"reasoning_REMOVED": "')
                prompt_template = prompt_template.replace('"reasoning":', '"reasoning_REMOVED":')
                # Add instruction to not include reasoning
                prompt_template += "\n\nIMPORTANT: Do NOT include a 'reasoning' field in your response."

            # Use default if prompt_template is None or empty string
            elif not prompt_template:  # This handles None, empty string, or any falsy value
                logger.warning("No prompt template provided from UI, using minimal default")

                # Choose prompt based on response format to minimize tokens
                if response_format == 'minimal':
                    # Ultra-minimal: just arrays - FAST processing
                    prompt_template = """For each skill below, provide [proficiency_number, confidence_decimal].
Proficiency: 1=Novice, 2=Developing, 3=Intermediate, 4=Advanced, 5=Expert
Confidence: 0.0 to 1.0

Return ONLY a JSON array matching the order of skills:
[[3, 0.8], [4, 0.9], [2, 0.6], ...]

Skills to assess:
{skills_to_assess}

IMPORTANT: Return ONLY the array, no other text."""

                elif response_format == 'compact':
                    # Compact: abbreviated keys, no reasoning
                    prompt_template = """Rate skills 1-5 with confidence 0-1.
Return JSON with abbreviated keys (s=skill, p=proficiency, c=confidence):
{{"assessments": [{{"s": "skill name", "p": 3, "c": 0.8}}]}}
Skills: {skills_to_assess}"""

                elif response_format == 'csv':
                    # CSV format
                    prompt_template = """Rate skills 1-5 with confidence 0-1.
Return CSV format (no headers): skill_name,proficiency,confidence
Example:
Python,4,0.85
JavaScript,3,0.70
Skills: {skills_to_assess}"""

                else:
                    # Default JSON format - check if reasoning should be included
                    if include_reasoning:
                        prompt_template = """Assign proficiency levels to these skills: {skills_to_assess}

Proficiency scale: 1=Novice, 2=Developing, 3=Intermediate, 4=Advanced, 5=Expert
Confidence score: 0.0 to 1.0 (decimal)

Return JSON format with reasoning:
{{
    "assessments": [
        {{
            "skill_name": "exact skill name",
            "proficiency": 3,
            "confidence_score": 0.85,
            "reasoning": "brief explanation"
        }}
    ]
}}

Process ALL skills. Return ONLY valid JSON."""
                    else:
                        prompt_template = """Assign proficiency levels to these skills: {skills_to_assess}

Proficiency scale: 1=Novice, 2=Developing, 3=Intermediate, 4=Advanced, 5=Expert
Confidence score: 0.0 to 1.0 (decimal)

Return JSON format WITHOUT reasoning field:
{{
    "assessments": [
        {{
            "skill_name": "exact skill name",
            "proficiency": 3,
            "confidence_score": 0.85
        }}
    ]
}}

Process ALL skills. Return ONLY valid JSON, NO reasoning field."""
            
            # Call LangChain without resume_text
            logger.info(f"[{datetime.now().strftime('%H:%M:%S')}] Starting LangChain assessment...")
            logger.info(f"Calling assess_with_langchain with {len(skills)} skills")

            langchain_result = langchain_service.assess_with_langchain(
                skills=skills,
                resume_text="",  # Empty resume since we're just assigning default levels
                provider=provider,
                proficiency_levels=proficiency_levels,
                prompt_template_str=prompt_template,
                api_key=provider_key,
                model=model,
                batch_size=batch_size,
                concurrent_batches=concurrent_batches,
                processing_mode=processing_mode,
                enable_chunk_persistence=enable_chunk_persistence,
                restart_from_chunk=restart_from_chunk,
                session_id=chunk_session_id
            )
            
            # Parse response and check for batch failures
            raw_response = langchain_result.get('raw_response', '{}')
            llm_response_text = raw_response
            langchain_success = langchain_result.get('success', False)
            batch_info = langchain_result.get('batch_info', {})
            chunk_info = langchain_result.get('chunk_info', {})
            warning_message = langchain_result.get('warning')
            
            try:
                logger.info(f"Parsing raw_response: {raw_response[:200]}...")
                # Clean the response to remove markdown code blocks
                import re
                # Pattern to match ```json ... ``` or ``` ... ```
                code_block_pattern = r'```(?:json)?\s*(.*?)\s*```'
                match = re.search(code_block_pattern, raw_response, re.DOTALL)

                if match:
                    cleaned_response = match.group(1).strip()
                    logger.info(f"Extracted JSON from code block: {cleaned_response[:100]}...")
                else:
                    cleaned_response = raw_response.strip()

                logger.info(f"Cleaned response: {cleaned_response[:200]}...")

                # Parse based on response format
                assessments = []

                if response_format == 'csv':
                    # Parse CSV format
                    lines = cleaned_response.strip().split('\n')
                    for line in lines:
                        parts = line.strip().split(',')
                        if len(parts) >= 3:
                            assessments.append({
                                'skill_name': parts[0].strip().strip('"'),
                                'proficiency': int(parts[1].strip()),
                                'confidence_score': float(parts[2].strip())
                            })
                    logger.info(f"Parsed CSV: {len(assessments)} assessments")

                elif response_format == 'minimal':
                    # Parse minimal array format [[p, c], ...]
                    parsed = json.loads(cleaned_response)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        # Match with input skills by index - optimized
                        assessments = [
                            {
                                'skill_name': skills[i].get('name', skills[i].get('skill_name', '')),
                                'proficiency': int(item[0]) if isinstance(item[0], (int, float)) else 3,
                                'confidence_score': float(item[1]) if len(item) > 1 and isinstance(item[1], (int, float)) else 0.5,
                                'reasoning': ''  # No reasoning in minimal format
                            }
                            for i, item in enumerate(parsed)
                            if i < len(skills) and isinstance(item, list) and len(item) >= 2
                        ]
                    logger.info(f"Parsed minimal format: {len(assessments)} assessments")

                elif response_format == 'compact':
                    # Parse compact format with abbreviated keys
                    parsed = json.loads(cleaned_response)
                    if isinstance(parsed, dict):
                        compact_assessments = parsed.get('assessments', [])
                        for item in compact_assessments:
                            assessments.append({
                                'skill_name': item.get('s', ''),
                                'proficiency': item.get('p', 3),
                                'confidence_score': item.get('c', 0.5)
                            })
                    logger.info(f"Parsed compact format: {len(assessments)} assessments")

                else:
                    # Default JSON parsing
                    parsed = json.loads(cleaned_response)

                    # Handle both list and object formats
                    if isinstance(parsed, list):
                        # Direct list of assessments
                        assessments = parsed
                        logger.info(f"Parsed as list: {len(assessments)} assessments")
                    elif isinstance(parsed, dict):
                        # Object with assessments key
                        assessments = parsed.get('assessments', [])
                        logger.info(f"Parsed as dict: {len(assessments)} assessments from 'assessments' key")
                    else:
                        assessments = []
                        logger.warning(f"Unexpected response type: {type(parsed)}")
                logger.info(f"Successfully parsed {len(assessments)} assessments")
            except Exception as e:
                logger.error(f"Failed to parse LangChain response: {e}")
                logger.error(f"Raw response length: {len(raw_response)} chars")
                logger.error(f"Raw response last 100 chars: {raw_response[-100:]}")

                # Enhanced truncation detection with better validation
                is_truncated = False
                truncation_reason = ""

                if raw_response:
                    # First, try to extract any partial results
                    partial_results = []
                    try:
                        # Look for complete JSON objects even in truncated response
                        import re
                        skill_pattern = r'\{[^{}]*"skill(?:_name)?"[^{}]*\}'
                        matches = re.findall(skill_pattern, raw_response)
                        for match in matches:
                            try:
                                skill_obj = json.loads(match)
                                if 'skill' in skill_obj or 'skill_name' in skill_obj:
                                    partial_results.append(skill_obj)
                            except:
                                pass
                        logger.info(f"Extracted {len(partial_results)} partial results from potentially truncated response")
                    except Exception as pe:
                        logger.error(f"Could not extract partial results: {pe}")

                    # Check various truncation indicators
                    response_trimmed = raw_response.rstrip()
                    if not response_trimmed.endswith('}') and not response_trimmed.endswith('```') and not response_trimmed.endswith(']'):
                        is_truncated = True
                        truncation_reason = "Response doesn't end with valid JSON closure"
                    elif "line 309" in str(e) or "Expecting value" in str(e):
                        # Common JSON parsing error when truncated
                        is_truncated = True
                        truncation_reason = f"JSON parsing failed: {str(e)[:100]}"
                    elif len(raw_response) > 10000:
                        # Only check bracket balance for large responses
                        open_brackets = raw_response.count('{') + raw_response.count('[')
                        close_brackets = raw_response.count('}') + raw_response.count(']')
                        if open_brackets != close_brackets:
                            is_truncated = True
                            truncation_reason = f"Unbalanced brackets: {open_brackets} open vs {close_brackets} close"

                if is_truncated:
                    # Response was likely truncated
                    error_detail = f"Response appears truncated ({len(raw_response)} chars). {truncation_reason}. "

                    # Check if we got partial results - if we did, return them as successful partial assessment
                    if partial_results and len(partial_results) > 0:
                        logger.info(f"Returning {len(partial_results)} partial results from truncated response")
                        assessments = partial_results
                        # Continue processing with partial results instead of failing
                        warning_message = f"Response truncated but recovered {len(partial_results)}/{len(skills)} skills"
                    else:
                        error_detail += f"Could not recover any partial results. "

                    # Only return error if we have NO partial results
                    if not assessments or len(assessments) == 0:
                        # Provider-specific recommendations - be more conservative
                        if provider == 'google':
                            # For Google, if 650 worked but 573 didn't, it might be specific skill content
                            # Don't just reduce size, consider the content
                            if len(skills) > 500:
                                suggested_size = 400  # Safe size for Google
                            else:
                                suggested_size = min(300, max(100, len(skills)*2//3))
                            error_detail += f"Google Gemini output limit hit. Current batch: {len(skills)} skills. Try {suggested_size} skills."

                            # Log which skills might be problematic
                            logger.warning(f"Truncation at chunk with skills {len(skills)}: May contain complex skill names")
                        else:
                            suggested_size = min(300, max(50, len(skills)*2//3))
                            error_detail += f"Current batch: {len(skills)} skills. Try reducing to {suggested_size}."

                        return JSONResponse({
                            "success": False,
                            "detail": error_detail,
                            "error_type": "truncated_response",
                            "response_length": len(raw_response),
                            "batch_size": len(skills),
                            "provider": provider,
                            "truncation_reason": truncation_reason,
                            "suggested_batch_size": suggested_size
                        }, status_code=500)
                else:
                    # Other parsing error
                    return JSONResponse({
                        "success": False,
                        "detail": f"Failed to parse AI response: {str(e)}",
                        "error_type": "parse_error",
                        "response_length": len(raw_response),
                        "batch_size": len(skills)
                    }, status_code=500)

                # If we don't have assessments set yet, initialize as empty
                if 'assessments' not in locals():
                    assessments = []
            
            # Build assessed skills list
            assessed_skills = []
            for skill in skills:
                skill_name = skill.get('name', skill.get('skill_name', ''))
                
                # Find assessment for this skill - handle both dict and list items
                assessment = None
                if isinstance(assessments, list) and assessments:
                    for a in assessments:
                        # Check if assessment item is a dict
                        if isinstance(a, dict):
                            if a.get('skill_name') == skill_name or a.get('skill') == skill_name:
                                assessment = a
                                break

                if assessment and isinstance(assessment, dict):
                    # Get both proficiency (numeric) and level (text)
                    level_text = assessment.get('level', assessment.get('proficiency_level', 'Intermediate'))
                    proficiency_num = assessment.get('proficiency')
                    
                    # If we don't have proficiency number, derive it from level text
                    if proficiency_num is None:
                        level_to_num = {"Novice": 1, "Developing": 2, "Intermediate": 3, "Advanced": 4, "Expert": 5}
                        proficiency_num = level_to_num.get(level_text, 3)
                    
                    # Only include reasoning if it was requested and provided
                    reasoning_text = assessment.get('reasoning', '')
                    if not include_reasoning:
                        reasoning_text = ''  # Clear reasoning if not requested
                    elif not reasoning_text:
                        reasoning_text = 'No reasoning provided'  # Default only if requested but missing

                    assessed_skills.append(SkillProficiencyAssessment(
                        skill_name=skill_name,
                        proficiency=proficiency_num,
                        confidence_score=float(assessment.get('confidence_score', 0.5)),
                        reasoning=reasoning_text
                    ))
                else:
                    # Skill not assessed - SKIP IT, don't add defaults
                    # Only include skills that were actually assessed by the LLM
                    pass
            
            # Get environment from request
            environment = request.get('environment', 'unknown')
            
            # Get JIE roles from request if available
            jie_roles = request.get('jie_roles', [])
            
            # Prepare assessment data for storage
            assessment_data = {
                "timestamp": datetime.now().isoformat(),
                "environment": environment,
                "model": f"{provider}/{model}" if model else provider,
                "provider": provider,
                "model_name": model,
                "skills": [
                    {
                        "skill_name": skill.skill_name,
                        "proficiency": skill.proficiency,  # Already numeric from the model
                        "confidence_score": skill.confidence_score,
                        "reasoning": skill.reasoning
                    }
                    for skill in assessed_skills
                ],
                "proficiency_levels": {
                    skill.skill_name: skill.proficiency  # Use the proficiency (numeric 1-5)
                    for skill in assessed_skills
                },
                "langchain_response": llm_response_text,
                "statistics": {
                    "total_skills": len(skills),
                    "processing_time": 0,
                    "avg_confidence": sum(s.confidence_score for s in assessed_skills) / len(assessed_skills) if assessed_skills else 0
                },
                "jie_roles": jie_roles,  # Include JIE roles for restoration
                "all_skills": skills  # Include all skills, not just assessed ones
            }
            
            # Save using the storage system
            saved_filename = assessment_storage.save_assessment(assessment_data)
            logger.info(f"Saved assessment to {saved_filename}")
            
            # Also save to old location for compatibility
            os.makedirs("assessment_results", exist_ok=True)
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            json_file_path = f"assessment_results/proficiency_reasoning_{timestamp_str}.json"
            
            reasoning_data = {
                "timestamp": datetime.now().isoformat(),
                "llm_provider": provider,
                "total_skills": len(skills),
                "proficiency_levels_used": proficiency_levels,
                "assessments": [
                    {
                        "skill_name": skill.skill_name,
                        "proficiency": skill.proficiency,  # Numeric (1-5)
                        "confidence_score": skill.confidence_score,
                        "reasoning": skill.reasoning
                    }
                    for skill in assessed_skills
                ],
                "llm_prompt": prompt_template or "Default prompt",
                "llm_raw_response": llm_response_text
            }
            
            with open(json_file_path, 'w') as f:
                json.dump(reasoning_data, f, indent=2)
            
            logger.info(f"Saved reasoning to {json_file_path}")
            
            # Build response
            llm_request = {
                "provider": provider,
                "use_langchain": True,
                "prompt_length": len(prompt_template or ""),
                "skills_count": len(skills),
                "timestamp": datetime.now().isoformat()
            }
            
            # Create API payload metadata (reference, not duplicate data)
            api_payload = {
                "endpoint": "/api/skills/update-proficiencies",
                "method": "POST",
                "description": "Use assessed_skills array for actual data",
                "total_skills": len(assessed_skills),
                "summary": {
                    "skills_assessed": len(assessed_skills),
                    "average_proficiency": sum(s.proficiency for s in assessed_skills) / len(assessed_skills) if assessed_skills else 0,
                    "average_confidence": sum(s.confidence_score for s in assessed_skills) / len(assessed_skills) if assessed_skills else 0
                }
            }
            
            # Determine overall success based on actual results
            # Check how many skills have real assessments vs. fallback "estimated level" reasoning
            real_assessments = sum(1 for skill in assessed_skills
                                 if skill.reasoning.find('estimated level') == -1)
            total_skills_assessed = len(assessed_skills)

            # Consider successful if we have skills and at least 50% are real assessments (not fallbacks)
            # Also consider successful if we have warning_message about recovered skills
            overall_success = (total_skills_assessed > 0 and
                             (langchain_success or real_assessments >= total_skills_assessed * 0.5 or
                              (warning_message and 'recovered' in warning_message)))

            # Log success determination details
            logger.info(f"Success determination: langchain_success={langchain_success}, "
                       f"real_assessments={real_assessments}/{total_skills_assessed}, "
                       f"overall_success={overall_success}")
            
            # Add batch failure information to response
            # OPTIMIZE: Don't include huge raw responses in the API response
            response_data = {
                "success": overall_success,
                "total_skills": len(skills),
                "assessed_skills": assessed_skills,
                "llm_provider": provider,
                # Removed llm_request to reduce size
                "llm_response": {
                    "raw_length": len(llm_response_text),
                    "parsed_assessments": len(assessments),
                    "timestamp": datetime.now().isoformat(),
                    "langchain_success": langchain_success,
                    # Only include summary of batch info, not full details
                    "batch_summary": {
                        "total_batches": batch_info.get("total_batches", 0),
                        "successful_batches": batch_info.get("successful_batches", 0),
                        "failed_batches": batch_info.get("failed_batches", 0)
                    } if batch_info else None
                },
                # Removed api_request_payload to reduce size
                "reasoning_file_path": json_file_path,
                "saved_assessment_file": saved_filename,
                "timestamp": datetime.now().isoformat(),
                "batch_info": batch_info,  # Keep for compatibility
                "chunk_info": chunk_info  # Include chunk_info for persistence tracking
            }
            
            # Add warning if batches failed
            if warning_message or (batch_info and batch_info.get('all_batches_failed')):
                response_data["warning"] = warning_message or "All batch processing failed - results are estimated values only"
                
            # Convert Pydantic models to dicts if needed
            # Ensure assessed_skills are serializable
            if "assessed_skills" in response_data and response_data["assessed_skills"]:
                assessed_list = []
                for skill in response_data["assessed_skills"]:
                    if hasattr(skill, 'dict'):
                        assessed_list.append(skill.dict())
                    elif hasattr(skill, 'model_dump'):
                        assessed_list.append(skill.model_dump())
                    else:
                        assessed_list.append(skill)
                response_data["assessed_skills"] = assessed_list

            # Convert response to JSON string and return as Response
            # This avoids Content-Length header issues with large responses
            json_str = json.dumps(response_data, default=str)  # Use default=str for any remaining non-serializable
            return Response(
                content=json_str,
                media_type="application/json",
                headers={
                    # Don't set Content-Length, let the server handle it
                    "Cache-Control": "no-cache"
                }
            )
        else:
            return JSONResponse({
                "success": False,
                "detail": "Non-LangChain mode not implemented for simple assessment"
            })
            
    except Exception as e:
        logger.error(f"Error in simple assessment: {e}")
        error_msg = str(e)

        # Check for specific error types and provide helpful messages
        if "quota" in error_msg.lower() or "429" in error_msg:
            user_message = "Google API quota exceeded. Free tier allows only 50 requests per day. Please wait 24 hours or use a different API key."
            status_code = 429
        elif "api key" in error_msg.lower() or "invalid" in error_msg.lower():
            user_message = "Invalid or missing API key. Please check your API key configuration."
            status_code = 401
        else:
            # For other errors, try to clean up the message
            # Handle the specific KeyError that occurs with Google's truncated responses
            if error_msg == '"skill_name"' or error_msg == "'skill_name'":
                user_message = "Google Gemini response was truncated due to batch size being too large. Try reducing batch size to 300 or fewer skills per batch."
            else:
                user_message = error_msg
            status_code = 500

        # Return with appropriate HTTP status for errors
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "detail": user_message,
                "error": error_msg  # Include original error for debugging
            }
        )

@app.post("/api/skills/assess-proficiencies", response_model=ProficiencyAssessmentResponse)
async def assess_skill_proficiencies(request: SkillsProficiencyRequest, session: Dict = Depends(get_session)):
    """Assess proficiency levels for extracted skills using LLM with detailed reasoning"""
    import json
    from datetime import datetime
    import os
    
    if not rag_analyzer:
        raise HTTPException(status_code=500, detail="RAG analyzer not initialized")
    
    try:
        # Get session API keys
        session_id = session.get('session_id', '')
        session_keys = api_keys_storage.get(session_id, {})
        
        # Use LangChain if requested
        if request.use_langchain:
            logger.info("Using LangChain for assessment")
            
            # Update LangChain service with session keys
            if session_keys:
                langchain_service.update_api_keys(session_keys)
            
            # Get the appropriate API key for the provider
            provider_key = session_keys.get(request.provider)
            
            # Fallback to API key from request if not in session
            if not provider_key and request.api_key:
                provider_key = request.api_key
            
            # Optimize skills data - remove unnecessary fields to reduce payload
            optimized_skills = []
            for skill in request.skills:
                # Only keep essential fields for LangChain assessment
                optimized_skill = {
                    "name": skill.get("name") or skill.get("skill_name", ""),
                }
                # Add id if it exists (some workflows need it)
                if skill.get("id"):
                    optimized_skill["id"] = skill["id"]
                optimized_skills.append(optimized_skill)
            
            logger.info(f"Optimized skills payload: {len(request.skills)} skills -> {len(optimized_skills)} essential fields only")
            
            # Call LangChain service with optimized data and user configuration
            langchain_result = langchain_service.assess_with_langchain(
                skills=optimized_skills,
                resume_text=request.resume_text or "",  # Empty if not provided
                provider=request.provider,
                proficiency_levels=request.proficiency_levels,
                prompt_template_str=request.prompt_template,
                api_key=provider_key,
                model=request.model,
                # Pass through legitimate LLM configuration parameters
                temperature=getattr(request, 'temperature', None),
                max_tokens=getattr(request, 'max_tokens', None), 
                top_p=getattr(request, 'top_p', None),
                response_format=getattr(request, 'response_format', None)
            )
            
            # Parse the LangChain response
            llm_response_text = langchain_result.get('raw_response', '')
            llm_request = {
                "provider": request.provider,
                "use_langchain": True,
                "chain_type": langchain_result.get('chain_type'),
                "prompt_length": len(langchain_result.get('prompt_used', '')),
                "skills_count": len(request.skills),
                "timestamp": datetime.now().isoformat()
            }
        else:
            # Original implementation without LangChain
            # Update RAG analyzer with session keys
            if rag_analyzer.llm_service and session_keys:
                for key, value in session_keys.items():
                    if key == 'openai':
                        rag_analyzer.llm_service.openai_api_key = value
                    elif key == 'anthropic':
                        rag_analyzer.llm_service.anthropic_api_key = value
                    elif key == 'google':
                        rag_analyzer.llm_service.google_api_key = value
                    elif key == 'grok':
                        rag_analyzer.llm_service.grok_api_key = value
            
            # Prepare the LLM prompt with proficiency levels
            skills_text = "\n".join([f"- {skill.get('name', skill.get('skill_name', ''))}" for skill in request.skills])
            
            prompt = f"""You are an expert skills assessor. Analyze the following resume and assess the proficiency level for each skill.

Proficiency Levels (use these exact terms):
- Novice: Basic understanding, limited practical experience
- Developing: Some experience, can work with guidance
- Intermediate: Solid experience, can work independently
- Advanced: Deep expertise, can mentor others
- Expert: Industry leader, extensive mastery

Resume Text:
{request.resume_text}

Skills to Assess:
{skills_text}

For each skill, provide:
1. Proficiency level (must be one of the levels above)
2. Confidence score (0.0 to 1.0)
3. Evidence from resume (specific quotes or indicators)
4. Detailed reasoning for the assessment
5. Estimated years of experience (if determinable)

Provide your response in the following JSON format:
{{
    "assessments": [
        {{
            "skill_name": "skill name here",
            "proficiency_level": "one of the levels",
            "confidence_score": 0.0-1.0,
            "evidence": ["quote 1", "quote 2"],
            "reasoning": "detailed explanation",
            "years_experience": number or null
        }}
    ]
}}

Be thorough and specific in your reasoning."""
            
            # Log the LLM request
            llm_request = {
                "provider": request.provider,
                "use_langchain": False,
                "prompt_length": len(prompt),
                "skills_count": len(request.skills),
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Sending proficiency assessment request to {request.provider}")
            
            # Call the LLM
            llm_response_text = rag_analyzer.llm_service.call_llm(
                prompt=prompt,
                provider=request.provider
            )
        
        # Parse the LLM response
        try:
            # Clean the response to remove markdown code blocks first
            from core.langchain_service import LangChainService
            langchain_service = LangChainService()
            cleaned_response = langchain_service._clean_json_response(llm_response_text)
            
            # Extract JSON from the cleaned response
            import re
            json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
            if json_match:
                llm_json = json.loads(json_match.group())
            else:
                # Try to parse the entire cleaned response as JSON
                llm_json = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"Response: {llm_response_text[:500]}...")
            # Create a fallback structure
            llm_json = {
                "assessments": [
                    {
                        "skill_name": skill.get('name', skill.get('skill_name', '')),
                        "proficiency_level": "Intermediate",
                        "confidence_score": 0.5,
                        "evidence": ["Could not parse LLM response"],
                        "reasoning": "Fallback assessment due to parsing error",
                        "years_experience": None
                    }
                    for skill in request.skills
                ]
            }
        
        # Build the assessed skills list
        assessed_skills = []
        for skill in request.skills:
            skill_name = skill.get('name', skill.get('skill_name', ''))
            
            # Find the assessment for this skill
            # Handle both list and dict formats
            if isinstance(llm_json, list):
                assessments_list = llm_json
            else:
                assessments_list = llm_json.get('assessments', [])

            assessment = next(
                (a for a in assessments_list 
                 if a.get('skill_name', '').lower() == skill_name.lower()),
                None
            )
            
            if assessment:
                # Get both proficiency (numeric) and level (text)
                level_text = assessment.get('level', assessment.get('proficiency_level', 'Intermediate'))
                proficiency_num = assessment.get('proficiency')
                
                # If we don't have proficiency number, derive it from level text
                if proficiency_num is None:
                    level_to_num = {"Novice": 1, "Developing": 2, "Intermediate": 3, "Advanced": 4, "Expert": 5}
                    proficiency_num = level_to_num.get(level_text, 3)
                
                assessed_skills.append(SkillProficiencyAssessment(
                    skill_name=skill_name,
                    proficiency=proficiency_num,
                    level=level_text,
                    confidence_score=float(assessment.get('confidence_score', 0.5)),
                    reasoning=assessment.get('reasoning', 'No reasoning provided')
                ))
            else:
                # Skill not assessed - SKIP IT, don't add defaults
                # Only include skills that were actually assessed by the LLM
                pass
        
        # Create the reasoning JSON file
        reasoning_data = {
            "timestamp": datetime.now().isoformat(),
            "llm_provider": provider,
            "total_skills": len(skills),
            "proficiency_levels_used": proficiency_levels,
            "assessments": [
                {
                    "skill_name": skill.skill_name,
                    "proficiency": skill.proficiency,
                    "confidence_score": skill.confidence_score,
                    "reasoning": skill.reasoning
                }
                for skill in assessed_skills
            ],
            "llm_prompt": prompt,
            "llm_raw_response": llm_response_text
        }
        
        # Save to JSON file using the new assessment storage system
        # Get environment from the current session or request
        environment = request.get('environment')
        if not environment:
            # Try to get from session context
            environment = 'unknown'
        
        # Get the actual model used
        model_name = request.get('model', '')
        provider = request.get('provider', 'openai')
        
        # Format model string - use actual model if provided, otherwise just provider
        if model_name:
            model_string = f"{provider}/{model_name}"
        else:
            model_string = provider
        
        # Prepare assessment data for storage
        assessment_data = {
            "timestamp": datetime.now().isoformat(),
            "environment": environment,
            "model": model_string,
            "provider": provider,
            "model_name": model_name,
            "skills": [
                {
                    "skill": skill.skill_name,
                    "proficiency": skill.proficiency_level,
                    "confidence": skill.confidence_score
                }
                for skill in assessed_skills
            ],
            "proficiency_levels": {
                skill.skill_name: skill.proficiency_level
                for skill in assessed_skills
            },
            "langchain_response": llm_response_text,
            "statistics": {
                "total_skills": len(skills),
                "processing_time": 0,  # Would need to track actual time
                "avg_confidence": sum(s.confidence_score for s in assessed_skills) / len(assessed_skills) if assessed_skills else 0
            }
        }
        
        # Save using the new storage system
        saved_filename = assessment_storage.save_assessment(assessment_data)
        logger.info(f"Saved assessment to {saved_filename}")
        
        # Also save to old location for compatibility
        os.makedirs("assessment_results", exist_ok=True)
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file_path = f"assessment_results/proficiency_reasoning_{timestamp_str}.json"
        
        with open(json_file_path, 'w') as f:
            json.dump(reasoning_data, f, indent=2)
        
        logger.info(f"Saved reasoning to {json_file_path}")
        
        # Prepare the API update payload (for Eightfold)
        api_payload = {
            "proficiencies": [
                {
                    "skill_name": skill.skill_name,
                    "proficiency": skill.proficiency,
                    "confidence_score": skill.confidence_score,
                    "reasoning": skill.reasoning
                }
                for skill in assessed_skills
            ]
        }
        
        # Build response
        response = ProficiencyAssessmentResponse(
            success=True,
            total_skills=len(skills),
            assessed_skills=assessed_skills,
            llm_provider=provider,
            llm_request=llm_request,
            llm_response={
                "raw_length": len(llm_response_text),
                "parsed_assessments": len(llm_json if isinstance(llm_json, list) else llm_json.get('assessments', [])),
                "timestamp": datetime.now().isoformat()
            },
            api_request_payload=api_payload,
            reasoning_file_path=json_file_path,
            saved_assessment_file=saved_filename,  # Add the saved filename
            timestamp=datetime.now().isoformat()
        )

        # Log response size before returning
        response_dict = response.dict()
        response_json = json.dumps(response_dict)
        logger.info(f"Response size: {len(response_json)} bytes")

        # For very large responses, ensure proper chunked transfer encoding
        if len(response_json) > 1000000:  # Over 1MB
            logger.warning(f"Large response detected: {len(response_json)} bytes - may use chunked transfer encoding")

        return response
        
    except Exception as e:
        logger.error(f"Error assessing proficiencies: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")

        # Return a proper error response instead of raising HTTPException
        # This ensures the response is properly formatted
        return ProficiencyAssessmentResponse(
            success=False,
            total_skills=len(skills) if 'skills' in locals() else 0,
            assessed_skills=[],
            llm_provider=provider if 'provider' in locals() else 'unknown',
            llm_request={},
            llm_response={"error": str(e)},
            api_request_payload={},
            reasoning_file_path="",
            saved_assessment_file="",
            timestamp=datetime.now().isoformat(),
            error=str(e),
            detail=f"Assessment failed: {str(e)}"
        )

@app.post("/api/skills/update-proficiencies")
async def update_skill_proficiencies(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """
    Attempt to update skill proficiencies via Eightfold API
    Note: The Eightfold API sandbox does not provide write endpoints for skill proficiencies
    """
    try:
        skills = request.get("skills", [])
        
        if not eightfold_client or not eightfold_client.auth_token:
            return JSONResponse({
                "success": False,
                "message": "Not authenticated with Eightfold API"
            }, status_code=401)
        
        # Document the endpoints we've tested that don't exist in sandbox
        tested_endpoints = [
            "POST /api/v2/skills/proficiencies",
            "PUT /api/v2/profiles/skills",
            "POST /api/v2/careerhub/skills/update",
            "PUT /api/v2/JIE/roles/{role_id}/skills"
        ]
        
        return JSONResponse({
            "success": False,
            "message": "Eightfold API sandbox does not support skill proficiency updates",
            "tested_endpoints": tested_endpoints,
            "note": "The Eightfold API currently only provides READ access to skill proficiencies via GET /api/v2/JIE/roles",
            "recommendation": "Contact Eightfold support for production API access with write capabilities"
        }, status_code=501)  # 501 Not Implemented
            
    except Exception as e:
        logger.error(f"Error in skill proficiency update: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/eightfold/proxy")
async def eightfold_api_proxy(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Direct proxy to Eightfold API - passes through exact request"""
    import httpx
    from datetime import datetime
    
    try:
        # Extract request details
        endpoint = request.get("endpoint")  # e.g., "/api/v2/JIE/roles"
        method = request.get("method", "GET")
        headers = request.get("headers", {})
        params = request.get("params", {})
        body = request.get("body", {})
        base_url = request.get("base_url", "https://apiv2.eightfold.ai")

        # CRITICAL: Remove 'id' field from body for JIE roles PUT requests
        # The 'id' field is read-only and causes 400 errors
        if method.upper() == "PUT" and "JIE/roles" in endpoint and isinstance(body, dict):
            if "id" in body:
                logger.warning(f"Removing read-only 'id' field from PUT request body: {body.get('id')}")
                body = body.copy()  # Don't modify the original
                del body["id"]
        
        # Build full URL
        full_url = f"{base_url}{endpoint}" if endpoint.startswith("/") else f"{base_url}/{endpoint}"
        
        logger.info(f"Proxying {method} request to: {full_url}")
        
        # Log GET requests for JIE roles
        if method.upper() == "GET" and "JIE/roles" in endpoint:
            request_log = {
                "timestamp": datetime.utcnow().isoformat(),
                "method": method,
                "endpoint": endpoint,
                "full_url": full_url,
                "headers": headers,
                "params": params
            }
            log_file = OPERATION_LOGS_DIR / f"jie_roles_get_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(log_file, 'w') as f:
                json.dump(request_log, f, indent=2)
            logger.info(f"Logged JIE roles GET request to {log_file}")
        
        # Make the actual API call
        async with httpx.AsyncClient() as client:
            if method.upper() == "GET":
                response = await client.get(full_url, headers=headers, params=params, timeout=30.0)
            elif method.upper() == "POST":
                # Special handling for authentication endpoint
                if "/oauth/v1/authenticate" in endpoint:
                    # OAuth authentication needs URL-encoded form data
                    response = await client.post(full_url, headers=headers, data=body, timeout=30.0)
                else:
                    response = await client.post(full_url, headers=headers, json=body, timeout=30.0)
            elif method.upper() == "PUT":
                response = await client.put(full_url, headers=headers, json=body, timeout=30.0)
            elif method.upper() == "DELETE":
                response = await client.delete(full_url, headers=headers, timeout=30.0)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")
        
        # Parse response
        try:
            response_data = response.json()
        except:
            response_data = response.text

        # Log 400 errors for debugging
        if response.status_code == 400:
            error_log = {
                "timestamp": datetime.utcnow().isoformat(),
                "method": method.upper(),
                "endpoint": endpoint,
                "status_code": response.status_code,
                "error_response": response_data,
                "request_body": body if method.upper() in ["POST", "PUT"] else None,
                "request_headers": headers
            }
            logger.error(f"400 Error from Eightfold API - {method} {endpoint}: {response_data}")

            # Save detailed error log
            error_file = OPERATION_LOGS_DIR / f"error_400_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(error_file, 'w') as f:
                json.dump(error_log, f, indent=2)
            logger.error(f"Saved 400 error details to {error_file}")
        
        # Log JIE roles response if it was a GET request
        if method.upper() == "GET" and "JIE/roles" in endpoint:
            response_log = {
                "timestamp": datetime.utcnow().isoformat(),
                "status_code": response.status_code,
                "response_data": response_data,
                "skill_count": len(response_data.get("data", [])[0].get("skillProficiencies", [])) if isinstance(response_data, dict) and response_data.get("data") else 0,
                "role_count": len(response_data.get("data", [])) if isinstance(response_data, dict) else 0
            }
            log_file = OPERATION_LOGS_DIR / f"jie_roles_response_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(log_file, 'w') as f:
                json.dump(response_log, f, indent=2)
            logger.info(f"Logged JIE roles response to {log_file} - {response_log['role_count']} roles, first role has {response_log['skill_count']} skills")
        
        # Build complete request record for replay
        request_record = {
            "timestamp": datetime.now().isoformat(),
            "method": method.upper(),
            "endpoint": endpoint,
            "full_url": full_url,
            "headers": headers,
            "params": params,
            "body": body if method.upper() in ["POST", "PUT"] else None
        }
        
        # Build curl command for replay
        curl_parts = [f'curl -X {method.upper()} "{full_url}"']
        for key, value in headers.items():
            curl_parts.append(f'  -H "{key}: {value}"')
        if params and method.upper() == "GET":
            param_str = "&".join([f"{k}={v}" for k, v in params.items()])
            curl_parts[0] = f'curl -X GET "{full_url}?{param_str}"'
        if body and method.upper() in ["POST", "PUT"]:
            curl_parts.append(f"  -d '{json.dumps(body)}'")
        curl_command = " \\\n".join(curl_parts)
        
        # Store auth token in session if this was an authentication request
        if endpoint == "/oauth/v1/authenticate" and response.status_code == 200:
            if isinstance(response_data, dict):
                # Try to extract token from response
                token = response_data.get("access_token")
                if not token and "data" in response_data:
                    token = response_data["data"].get("access_token")
                if token:
                    session["eightfold_token"] = token
                    logger.info("Stored Eightfold auth token in session")
        
        # Return the response without setting incorrect Content-Length
        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "data": response_data,
            "request": request_record,
            "curl_command": curl_command,
            "eightfold_endpoint": endpoint,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error extracting skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assess")
async def assess_skills(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Perform skills assessment using selected method"""
    if not rag_analyzer:
        raise HTTPException(status_code=500, detail="RAG analyzer not initialized")
    
    try:
        # Handle both 'text' and 'resume_text' fields
        resume_text = request.get('resume_text') or request.get('text', '')
        skills = request.get('skills', [])
        method = request.get('method', 'direct')
        provider = request.get('provider', 'openai')
        
        # Get session API keys
        session_id = session.get('session_id', '')
        session_keys = api_keys_storage.get(session_id, {})
        
        # Update RAG analyzer with session keys (simplified)
        if rag_analyzer.llm_service and session_keys:
            for key, value in session_keys.items():
                if key == 'openai':
                    rag_analyzer.llm_service.openai_api_key = value
                elif key == 'anthropic':
                    rag_analyzer.llm_service.anthropic_api_key = value
                elif key == 'google':
                    rag_analyzer.llm_service.google_api_key = value
                elif key == 'grok':
                    rag_analyzer.llm_service.grok_api_key = value
        
        # Perform assessment based on method
        if method == "direct":
            result = rag_analyzer.assess_skills_direct(
                resume_text=resume_text,
                skills=skills,
                provider=provider
            )
        elif method == "rag":
            result = rag_analyzer.assess_skills_with_rag(
                resume_text=resume_text,
                skills=skills,
                provider=provider
            )
        elif method == "barebones":
            result = rag_analyzer.assess_skills_barebones(
                resume_text=resume_text,
                skills=skills
            )
        elif method == "compare":
            # Run all three methods and compare
            direct_result = rag_analyzer.assess_skills_direct(
                resume_text=resume_text,
                skills=skills,
                provider=provider
            )
            rag_result = rag_analyzer.assess_skills_with_rag(
                resume_text=resume_text,
                skills=skills,
                provider=provider
            )
            barebones_result = rag_analyzer.assess_skills_barebones(
                resume_text=resume_text,
                skills=skills
            )
            
            # Compare results
            comparison = rag_analyzer.compare_assessments(
                direct_result, rag_result, barebones_result
            )
            
            return JSONResponse({
                "status": "success",
                "direct": direct_result.dict(),
                "rag": rag_result.dict(),
                "barebones": barebones_result.dict(),
                "comparison": comparison.dict()
            })
        else:
            raise HTTPException(status_code=400, detail=f"Unknown method: {method}")
        
        return JSONResponse({
            "status": "success",
            "result": result.dict()
        })
        
    except Exception as e:
        logger.error(f"Error in assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint for monitoring
@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "eightfold_client": "initialized" if eightfold_client else "not_initialized",
            "careerhub_client": "initialized" if careerhub_client else "not_initialized",
            "rag_analyzer": "initialized" if rag_analyzer else "not_initialized",
            "controller_agent": "initialized" if controller_agent else "not_initialized",
        },
        "sessions_active": len(sessions_storage),
        "api_keys_configured": len(api_keys_storage)
    }
    
    # Check if any component is not initialized
    if not all([eightfold_client, careerhub_client, rag_analyzer, controller_agent]):
        health_status["status"] = "degraded"
    
    return JSONResponse(health_status)

# Additional endpoints needed by the UI
@app.get("/api/health")
async def api_health():
    """API health check"""
    return await health_check()

@app.get("/api/settings/assessment")
async def get_assessment_settings():
    """Get assessment settings"""
    from config.settings import Settings
    settings = Settings()
    
    return JSONResponse({
        "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
        "proficiency_prompt": settings.skills_proficiency_prompt,
        "default_provider": "openai",
        "methods": ["direct", "rag", "barebones", "compare"]
    })

@app.get("/api/environments/current")
async def get_current_environment():
    """Get current environment with configuration"""
    current = env_manager.get_current_environment()
    if not current:
        current = "USAA TM Sandbox"
    
    # Get the actual configuration
    config = env_manager.get_environment(current) if current else {}
    
    return JSONResponse({
        "current": current,
        "config": config
    })

@app.get("/api/code/all")
async def get_code_all():
    """Get implementation code for all methods"""
    return JSONResponse({
        "methods": {
            "direct": "Direct LLM assessment implementation",
            "rag": "RAG-enhanced assessment implementation",
            "barebones": "Barebones Python implementation"
        }
    })

async def switch_environment(env_name: str):
    """Switch to a different environment and return its configuration"""
    try:
        env_manager.set_current_environment(env_name)
        config = env_manager.get_environment(env_name)
        
        return JSONResponse({
            "success": True,
            "message": f"Switched to {env_name}",
            "config": config
        })
    except Exception as e:
        logger.error(f"Error switching environment: {e}")
        return JSONResponse({
            "success": False,
            "message": f"Error switching environment: {str(e)}"
        }, status_code=500)

@app.post("/api/configuration/save")
async def save_configuration(config: ConfigurationUpdate, session: Dict = Depends(get_session)):
    """Save current configuration to the active environment"""
    try:
        current = env_manager.get_current_environment()
        if not current:
            current = "USAA TM Sandbox"
        
        # Get existing config or create new one
        existing_config = env_manager.get_environment(current) or {}
        
        # Update with new values (only non-None values)
        if config.eightfold_username is not None:
            existing_config['eightfold_username'] = config.eightfold_username
        if config.eightfold_password is not None:
            existing_config['eightfold_password'] = config.eightfold_password
        if config.openai_api_key is not None:
            existing_config['openai_api_key'] = config.openai_api_key
        if config.anthropic_api_key is not None:
            existing_config['anthropic_api_key'] = config.anthropic_api_key
        if config.google_api_key is not None:
            existing_config['google_api_key'] = config.google_api_key
        if config.grok_api_key is not None:
            existing_config['grok_api_key'] = config.grok_api_key
        
        # Save to environment manager
        env_manager.update_environment(current, existing_config)
        
        # Also update session storage for API keys
        session_id = session.get('session_id', '')
        if session_id not in api_keys_storage:
            api_keys_storage[session_id] = {}
        
        if config.openai_api_key:
            api_keys_storage[session_id]['openai'] = config.openai_api_key
        if config.anthropic_api_key:
            api_keys_storage[session_id]['anthropic'] = config.anthropic_api_key
        if config.google_api_key:
            api_keys_storage[session_id]['google'] = config.google_api_key
        if config.grok_api_key:
            api_keys_storage[session_id]['grok'] = config.grok_api_key
        
        return JSONResponse({
            "success": True,
            "message": f"Configuration saved to {current}",
            "environment": current
        })
        
    except Exception as e:
        logger.error(f"Error saving configuration: {e}")
        return JSONResponse({
            "success": False,
            "message": f"Error saving configuration: {str(e)}"
        }, status_code=500)

@app.post("/api/environments/switch")
async def switch_environment_alt(request: Dict[str, Any]):
    """Alternative endpoint for switching environments"""
    env_name = request.get("environment")
    if not env_name:
        raise HTTPException(status_code=400, detail="No environment specified")
    return await switch_environment(env_name)

# API Explorer Endpoint - Direct passthrough to Eightfold API
@app.post("/api/eightfold/explorer")
async def api_explorer(request: Dict[str, Any]):
    """
    Direct API explorer endpoint for testing all Eightfold API endpoints.
    This provides transparent request/response viewing without any wrappers.
    """
    try:
        method = request.get("method", "GET")
        endpoint = request.get("endpoint")
        query_params = request.get("query_params", {})
        body = request.get("body")
        auth_token = request.get("auth_token")
        base_url = request.get("base_url", "https://apiv2.eightfold.ai")
        
        if not endpoint:
            raise HTTPException(status_code=400, detail="No endpoint specified")
        
        if not auth_token:
            raise HTTPException(status_code=401, detail="No authentication token provided")
        
        # Build the full URL
        full_url = f"{base_url}{endpoint}"
        
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Log the request for debugging
        logger.info(f"API Explorer Request: {method} {full_url}")
        logger.info(f"Query params: {query_params}")
        if body:
            logger.info(f"Request body: {json.dumps(body, indent=2)}")
        
        # Make the actual API request
        import requests
        
        # Prepare request parameters
        req_params = {
            "headers": headers,
            "timeout": 30
        }
        
        if query_params:
            req_params["params"] = query_params
        
        if body and method in ["POST", "PUT", "PATCH"]:
            req_params["json"] = body
        
        # Execute the request
        if method == "GET":
            response = requests.get(full_url, **req_params)
        elif method == "POST":
            response = requests.post(full_url, **req_params)
        elif method == "PUT":
            response = requests.put(full_url, **req_params)
        elif method == "PATCH":
            response = requests.patch(full_url, **req_params)
        elif method == "DELETE":
            response = requests.delete(full_url, **req_params)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")
        
        # Prepare response data
        response_data = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "request": {
                "method": method,
                "url": full_url,
                "query_params": query_params,
                "body": body
            }
        }
        
        # Try to parse JSON response
        try:
            response_data["response"] = response.json()
        except:
            response_data["response"] = response.text
        
        logger.info(f"API Explorer Response: {response.status_code}")
        
        return JSONResponse(response_data)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"API Explorer request failed: {e}")
        return JSONResponse({
            "status_code": 500,
            "error": str(e),
            "request": {
                "method": method,
                "url": endpoint
            }
        }, status_code=500)
    except Exception as e:
        logger.error(f"API Explorer error: {e}")
        return JSONResponse({
            "status_code": 500,
            "error": str(e)
        }, status_code=500)

# Eightfold Authentication Endpoint (for role management)
@app.post("/api/eightfold/authenticate")
async def eightfold_authenticate(request: Dict[str, Any]):
    """
    Authenticate with Eightfold API using flexible configuration.
    Supports different grant types and auth headers for different environments.
    """
    try:
        username = request.get("username")
        password = request.get("password")
        api_url = request.get("api_url", "https://apiv2.eightfold.ai")
        grant_type = request.get("grant_type", "password")
        auth_header = request.get("auth_header")
        
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")
        
        # Default auth header (for tm-sandbox)
        default_auth_header = "Basic MU92YTg4T1JyMlFBVktEZG8wc1dycTdEOnBOY1NoMno1RlFBMTZ6V2QwN3cyeUFvc3QwTU05MmZmaXFFRDM4ZzJ4SFVyMGRDaw=="
        
        # Use provided auth header or default
        auth_value = auth_header or default_auth_header
        
        # Build authentication request
        auth_endpoint = f"{api_url}/oauth/v1/authenticate"
        
        headers = {
            "Authorization": auth_value,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Support different grant types
        if grant_type == "password":
            payload = {
                "grant_type": "password",
                "username": username,
                "password": password
            }
        else:
            # Default to grantType for backward compatibility
            payload = {
                "grantType": grant_type,
                "username": username,
                "password": password
            }
        
        logger.info(f"Authenticating with Eightfold: {username} (grant_type: {grant_type})")
        
        # Make authentication request
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                auth_endpoint,
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                auth_data = response.json()
                access_token = auth_data.get("access_token") or auth_data.get("accessToken")
                
                if access_token:
                    return JSONResponse({
                        "success": True,
                        "message": "Authentication successful",
                        "auth_response": {
                            "bearer_token": access_token,
                            "token_type": "Bearer",
                            "user_info": {"username": username},
                            "status_code": 200,
                            "body": auth_data
                        },
                        "request_details": {
                            "endpoint": auth_endpoint,
                            "method": "POST",
                            "grant_type": grant_type,
                            "username": username
                        }
                    })
                else:
                    raise HTTPException(status_code=401, detail="No access token in response")
            
            elif response.status_code == 401:
                return JSONResponse({
                    "success": False,
                    "message": "Authentication failed - invalid credentials",
                    "detail": f"Username: {username}, Status: {response.status_code}",
                    "status_code": response.status_code
                })
            
            else:
                return JSONResponse({
                    "success": False,
                    "message": f"Authentication failed with status {response.status_code}",
                    "detail": response.text,
                    "status_code": response.status_code
                })
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Eightfold authentication: {e}")
        return JSONResponse({
            "success": False,
            "message": "Authentication error",
            "detail": str(e)
        })

# Create JIE Role Endpoint
@app.post("/api/eightfold/create-role")
async def create_jie_role(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """
    Create a new JIE role with skills.
    This endpoint creates a new role in Eightfold.
    """
    try:
        # Extract authorization token from request headers
        auth_header = request.get("headers", {}).get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token required")
        
        token = auth_header.replace("Bearer ", "")
        
        # Extract role creation payload
        title = request.get("title")
        skill_proficiencies = request.get("skillProficiencies", [])
        metadata = request.get("metadata", {})
        
        if not title:
            raise HTTPException(status_code=400, detail="title is required")
        
        # Build Eightfold API request
        # According to API docs: POST /api/v2/JIE/roles
        api_url = "https://apiv2.eightfold.ai"
        endpoint = f"{api_url}/api/v2/JIE/roles"
        
        # Prepare the create payload for Eightfold API
        eightfold_payload = {
            "title": title,
            "skillProficiencies": skill_proficiencies
        }
        
        # Log the request details
        logger.info(f"Creating JIE role '{title}' with {len(skill_proficiencies)} skills")
        
        # Make the API call to Eightfold
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                endpoint,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                json=eightfold_payload,
                timeout=30.0
            )
            
            # Check response
            if response.status_code == 201 or response.status_code == 200:
                return JSONResponse({
                    "success": True,
                    "message": f"Successfully created role '{title}'",
                    "role": eightfold_payload,
                    "skills_created": len(skill_proficiencies),
                    "response": response.json() if response.text else {},
                    "metadata": metadata
                })
            elif response.status_code == 404:
                # Role create endpoint might not exist in sandbox
                return JSONResponse({
                    "success": False,
                    "error": "Role creation endpoint not available in sandbox environment",
                    "detail": "The Eightfold API sandbox does not support role creation. This would work in production with proper permissions.",
                    "status_code": response.status_code
                })
            elif response.status_code == 401:
                return JSONResponse({
                    "success": False,
                    "error": "Authentication failed",
                    "detail": "Invalid or expired token",
                    "status_code": response.status_code
                })
            else:
                return JSONResponse({
                    "success": False,
                    "error": f"API request failed with status {response.status_code}",
                    "detail": response.text,
                    "status_code": response.status_code
                })
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating JIE role: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "detail": "Failed to create role"
        })

# Delete JIE Role Endpoint
@app.delete("/api/eightfold/delete-role")
async def delete_jie_role(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """
    Delete a JIE role.
    This endpoint deletes a role from Eightfold.
    """
    try:
        # Extract authorization token from request headers
        auth_header = request.get("headers", {}).get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token required")
        
        token = auth_header.replace("Bearer ", "")
        
        # Extract role ID
        role_id = request.get("role_id")
        
        if not role_id:
            raise HTTPException(status_code=400, detail="role_id is required")
        
        # Build Eightfold API request
        # According to API docs: DELETE /api/v2/JIE/roles/{role_id}
        api_url = "https://apiv2.eightfold.ai"
        endpoint = f"{api_url}/api/v2/JIE/roles/{role_id}"
        
        # Log the request details
        logger.info(f"Deleting JIE role {role_id}")
        
        # Make the API call to Eightfold
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                endpoint,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=30.0
            )
            
            # Check response
            if response.status_code == 200 or response.status_code == 204:
                return JSONResponse({
                    "success": True,
                    "message": f"Successfully deleted role {role_id}",
                    "role_id": role_id,
                    "response": response.json() if response.text else {}
                })
            elif response.status_code == 404:
                # Role delete endpoint might not exist in sandbox
                return JSONResponse({
                    "success": False,
                    "error": "Role deletion endpoint not available in sandbox environment",
                    "detail": "The Eightfold API sandbox does not support role deletion. This would work in production with proper permissions.",
                    "status_code": response.status_code
                })
            elif response.status_code == 401:
                return JSONResponse({
                    "success": False,
                    "error": "Authentication failed",
                    "detail": "Invalid or expired token",
                    "status_code": response.status_code
                })
            else:
                return JSONResponse({
                    "success": False,
                    "error": f"API request failed with status {response.status_code}",
                    "detail": response.text,
                    "status_code": response.status_code
                })
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting JIE role: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "detail": "Failed to delete role"
        })

# Update JIE Role Endpoint
@app.put("/api/eightfold/update-role")
async def update_jie_role(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """
    Update a JIE role with new proficiencies and levels.
    This endpoint updates skills for a specific role in Eightfold.
    """
    try:
        # Extract authorization token from request headers
        auth_header = request.get("headers", {}).get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization token required")
        
        token = auth_header.replace("Bearer ", "")
        
        # Extract role update payload
        role_id = request.get("role_id")
        title = request.get("title")
        updates = request.get("updates", {})
        metadata = request.get("metadata", {})
        
        if not role_id:
            raise HTTPException(status_code=400, detail="role_id is required")
        
        # Get skills updates
        skill_proficiencies = updates.get("skillProficiencies", [])
        
        if not skill_proficiencies:
            raise HTTPException(status_code=400, detail="No skills to update")
        
        # Build Eightfold API request
        # According to API docs: PUT /api/v2/JIE/roles/{role_id}
        api_url = "https://apiv2.eightfold.ai"
        endpoint = f"{api_url}/api/v2/JIE/roles/{role_id}"
        
        # Prepare the update payload for Eightfold API
        eightfold_payload = {
            "title": title,
            "skillProficiencies": skill_proficiencies
        }
        
        # Log the request details
        logger.info(f"Updating JIE role {role_id} with {len(skill_proficiencies)} skills")
        
        # Make the API call to Eightfold
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.put(
                endpoint,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                json=eightfold_payload,
                timeout=30.0
            )
            
            # Check response
            if response.status_code == 200:
                return JSONResponse({
                    "success": True,
                    "message": f"Successfully updated role {title}",
                    "role_id": role_id,
                    "skills_updated": len(skill_proficiencies),
                    "response": response.json() if response.text else {},
                    "metadata": metadata
                })
            elif response.status_code == 404:
                # Role update endpoint might not exist in sandbox
                return JSONResponse({
                    "success": False,
                    "error": "Role update endpoint not available in sandbox environment",
                    "detail": "The Eightfold API sandbox does not support role updates. This would work in production with proper permissions.",
                    "status_code": response.status_code
                })
            elif response.status_code == 401:
                return JSONResponse({
                    "success": False,
                    "error": "Authentication failed",
                    "detail": "Invalid or expired token",
                    "status_code": response.status_code
                })
            else:
                return JSONResponse({
                    "success": False,
                    "error": f"API request failed with status {response.status_code}",
                    "detail": response.text,
                    "status_code": response.status_code
                })
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating JIE role: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "detail": "Failed to update role"
        })

# LangChain API Documentation Query Endpoint
@app.post("/api/langchain/api-docs-query")
async def query_api_documentation(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """
    Query API documentation using LangChain for natural language questions
    about Eightfold API endpoints
    """
    try:
        query = request.get("query")
        if not query:
            raise HTTPException(status_code=400, detail="No query provided")
        
        # Get API key from session
        session_id = session.get("session_id")
        api_keys = api_keys_storage.get(session_id, {})
        
        # Check for OpenAI key (default for documentation queries)
        openai_key = api_keys.get("openai")
        if not openai_key:
            return JSONResponse({
                "success": False,
                "error": "OpenAI API key required for documentation queries. Please configure in the workflow."
            })
        
        # Initialize LangChain service with API documentation context
        from core.langchain_service import LangChainService
        langchain_service = LangChainService()
        
        # Create a specialized prompt for API documentation
        api_docs_prompt = f"""
        You are an expert on the Eightfold API. Answer questions about API endpoints, parameters, and usage.
        
        Available endpoint categories:
        - JIE (Job Intelligence Engine): roles management
        - Profile Management: user profiles and skills
        - Position Management: job positions
        - ATS: Applicant tracking
        - Career Navigation: career paths and skills suggestions
        - Employee Management
        - Succession Planning
        - Demand Management
        - Booking
        - SCIM: User management
        
        Base URL: https://apiv2.eightfold.ai
        
        User Question: {query}
        
        Provide a clear, concise answer with specific endpoint examples when relevant.
        """
        
        # Get response from LangChain
        response = langchain_service.query_with_context(
            api_docs_prompt,
            model="gpt-3.5-turbo",
            api_key=openai_key
        )
        
        return JSONResponse({
            "success": True,
            "answer": response
        })
        
    except Exception as e:
        logger.error(f"API documentation query error: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# Role CRUD Endpoints for Step 6
@app.get("/api/eightfold/roles")
async def get_eightfold_roles(request: Request, session: Dict = Depends(get_session)):
    """Get roles from Eightfold API"""
    try:
        auth_header = request.headers.get("Authorization", "")
        api_url = request.headers.get("X-API-URL", "https://apiv2.eightfold.ai")
        
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        token = auth_header.replace("Bearer ", "")
        result = await RoleCRUDService.get_roles(token, api_url)
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error fetching roles: {e}")
        return JSONResponse({
            "success": False,
            "detail": str(e)
        }, status_code=500)

@app.post("/api/roles/create")
async def create_role(request: Dict[str, Any], req: Request, session: Dict = Depends(get_session)):
    """Create a new role with skills"""
    try:
        auth_header = req.headers.get("Authorization", "")
        api_url = req.headers.get("X-API-URL", "https://apiv2.eightfold.ai")
        
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        token = auth_header.replace("Bearer ", "")
        result = await RoleCRUDService.create_role(token, api_url, request)
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error creating role: {e}")
        return JSONResponse({
            "success": False,
            "detail": str(e)
        }, status_code=500)

@app.post("/api/roles/update-proficiencies")
async def update_role_proficiencies(request: Dict[str, Any], req: Request, session: Dict = Depends(get_session)):
    """Update role with proficiency levels"""
    try:
        auth_header = req.headers.get("Authorization", "")
        api_url = req.headers.get("X-API-URL", "https://apiv2.eightfold.ai")
        
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        token = auth_header.replace("Bearer ", "")
        result = await RoleCRUDService.update_role_proficiencies(token, api_url, request)
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error updating role: {e}")
        return JSONResponse({
            "success": False,
            "detail": str(e)
        }, status_code=500)

@app.delete("/api/roles/delete")
async def delete_role(request: Dict[str, Any], req: Request, session: Dict = Depends(get_session)):
    """Delete a role"""
    try:
        auth_header = req.headers.get("Authorization", "")
        api_url = req.headers.get("X-API-URL", "https://apiv2.eightfold.ai")
        
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        token = auth_header.replace("Bearer ", "")
        result = await RoleCRUDService.delete_role(token, api_url, request)
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error deleting role: {e}")
        return JSONResponse({
            "success": False,
            "detail": str(e)
        }, status_code=500)

@app.post("/api/roles/sync")
async def sync_roles(request: Dict[str, Any], req: Request, session: Dict = Depends(get_session)):
    """Sync roles from source to target environment"""
    try:
        auth_header = req.headers.get("Authorization", "")
        api_url = req.headers.get("X-API-URL", "https://apiv2.eightfold.ai")
        
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        token = auth_header.replace("Bearer ", "")
        result = await RoleCRUDService.sync_roles(token, api_url, request)
        
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error syncing roles: {e}")
        return JSONResponse({
            "success": False,
            "detail": str(e)
        }, status_code=500)

@app.post("/api/roles/update-to-source")
async def update_roles_to_source(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Update roles with proficiencies in the source environment"""
    try:
        # Create log file for this operation
        operation_id = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        operation_log = {
            "operation_id": operation_id,
            "operation_type": "update_roles_to_source",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": request.get('environment'),
            "get_requests": [],
            "llm_assessments": [],
            "put_requests": [],
            "errors": []
        }
        
        logger.info(f"Updating roles to source environment: {request.get('environment')} - Operation ID: {operation_id}")
        
        # Extract request data - handle both single role and batch formats
        environment = request.get("environment")
        
        # Check if it's a single role or multiple roles
        if "role" in request:
            # Single role update (from update-roles.js)
            roles = [request.get("role")]
        else:
            # Batch update
            roles = request.get("roles", [])
        
        if not roles:
            raise HTTPException(status_code=400, detail="No roles to update")
        
        # Use Eightfold proxy to update roles
        results = []
        for role in roles:
            role_id = role.get("id")
            if not role_id:
                logger.warning(f"Skipping role without ID: {role.get('title')}")
                continue
                
            # Clean skill proficiencies - EXCLUDE level (it's read-only in Eightfold API)
            # Include only: name, proficiency, skillGroupList
            cleaned_skills = []
            for skill in role.get("skillProficiencies", []):
                # Only include fields that Eightfold API accepts
                cleaned_skill = {
                    "name": skill.get("name"),
                    "proficiency": skill.get("proficiency"),
                    # DO NOT include "level" - it's read-only and causes 400 error
                    "skillGroupList": skill.get("skillGroupList", [])
                }
                cleaned_skills.append(cleaned_skill)
                
                # Log level for internal tracking only
                if skill.get("level"):
                    logger.debug(f"Skill {skill.get('name')}: proficiency={skill.get('proficiency')}, level={skill.get('level')} (level excluded from API)")
                    
            # Get auth token from session or use environment credentials
            auth_token = session.get("eightfold_token")
            
            if not auth_token:
                logger.error("No auth token in session - authentication required")
                raise HTTPException(
                    status_code=401, 
                    detail="Not authenticated. Please authenticate with Eightfold first."
                )
            
            # Build Eightfold API request - UPDATE specific role by ID
            # DO NOT include 'id' in body as it's read-only
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
            
            api_request = {
                "endpoint": f"/api/v2/JIE/roles/{role_id}",
                "method": "PUT",
                "headers": headers,
                "body": {
                    "title": role.get("title"),
                    "skillProficiencies": cleaned_skills,
                    "roleDescription": role.get("roleDescription", ""),
                    "archivalStatus": role.get("archivalStatus", False)
                },
                "base_url": "https://apiv2.eightfold.ai"
            }
            
            # Log the PUT request
            operation_log["put_requests"].append({
                "role_id": role_id,
                "role_title": role.get("title"),
                "endpoint": api_request["endpoint"],
                "method": api_request["method"],
                "skills_count": len(cleaned_skills),
                "body": api_request["body"],
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Make the API call
            try:
                response = await eightfold_api_proxy(api_request, session)
                # Check if the proxy call was successful
                if isinstance(response, dict) and not response.get("success", False):
                    logger.error(f"Role update failed for {role_id}: {response}")
                    error_detail = {
                        "role_id": role_id,
                        "role_title": role.get("title"),
                        "success": False,
                        "error": response.get("data", "Unknown error"),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    results.append(error_detail)
                    operation_log["errors"].append(error_detail)
                else:
                    results.append(response)
            except HTTPException as he:
                logger.error(f"HTTP error updating role {role_id}: {he.detail}")
                error_detail = {
                    "role_id": role_id,
                    "role_title": role.get("title"),
                    "success": False,
                    "error": str(he.detail),
                    "timestamp": datetime.utcnow().isoformat()
                }
                results.append(error_detail)
                operation_log["errors"].append(error_detail)
            except Exception as e:
                logger.error(f"Error updating role {role_id}: {e}")
                error_detail = {
                    "role_id": role_id,
                    "role_title": role.get("title"),
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
                results.append(error_detail)
                operation_log["errors"].append(error_detail)
        
        # Check if any updates were successful
        successful_updates = [r for r in results if isinstance(r, dict) and r.get("success", False)]
        all_success = len(successful_updates) == len(results)
        
        # Save the operation log
        operation_log["summary"] = {
            "total_roles": len(roles),
            "successful_updates": len(successful_updates),
            "failed_updates": len(roles) - len(successful_updates),
            "success_rate": (len(successful_updates) / len(roles) * 100) if roles else 0
        }
        
        log_file = OPERATION_LOGS_DIR / f"operation_{operation_id}.json"
        with open(log_file, 'w') as f:
            json.dump(operation_log, f, indent=2)
        logger.info(f"Operation log saved to {log_file}")
        
        return JSONResponse({
            "success": all_success,
            "message": f"Updated {len(successful_updates)} of {len(roles)} roles in source environment",
            "results": results,
            "request": request,
            "timestamp": datetime.utcnow().isoformat(),
            "operation_log_file": str(log_file)
        }, status_code=200 if all_success else 207)  # 207 = Multi-Status for partial success
        
    except Exception as e:
        logger.error(f"Error updating roles to source: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "request": request
        }, status_code=500)

@app.post("/api/roles/create-to-target")
async def create_roles_to_target(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Create new roles with proficiencies in target environment"""
    try:
        logger.info(f"Creating roles in target environment: {request.get('environment')}")
        
        # Extract request data
        environment = request.get("environment")
        roles = request.get("roles", [])
        
        if not roles:
            raise HTTPException(status_code=400, detail="No roles to create")
        
        # Use Eightfold proxy to create roles
        results = []
        for role in roles:
            # Build Eightfold API request
            api_request = {
                "endpoint": "/api/v2/JIE/roles",
                "method": "POST",
                "body": {
                    "title": role.get("title"),
                    "skillProficiencies": role.get("skillProficiencies", [])
                },
                "base_url": "https://apiv2.eightfold.ai"
            }
            
            # Make the API call
            response = await eightfold_api_proxy(api_request, session)
            results.append(response)
        
        return JSONResponse({
            "success": True,
            "message": f"Created {len(roles)} roles in target environment",
            "results": results,
            "request": request,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error creating roles to target: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "request": request
        }, status_code=500)

@app.get("/api/operation-logs")
async def get_operation_logs():
    """Get list of all operation logs"""
    try:
        logs = []
        for log_file in OPERATION_LOGS_DIR.glob("operation_*.json"):
            with open(log_file, 'r') as f:
                log_data = json.load(f)
                logs.append({
                    "filename": log_file.name,
                    "operation_id": log_data.get("operation_id"),
                    "operation_type": log_data.get("operation_type"),
                    "timestamp": log_data.get("timestamp"),
                    "summary": log_data.get("summary", {})
                })
        
        return JSONResponse({
            "success": True,
            "logs": sorted(logs, key=lambda x: x["timestamp"], reverse=True)
        })
    except Exception as e:
        logger.error(f"Error retrieving operation logs: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.get("/api/operation-logs/{operation_id}")
async def get_operation_log(operation_id: str):
    """Get specific operation log by ID"""
    try:
        log_file = OPERATION_LOGS_DIR / f"operation_{operation_id}.json"
        if not log_file.exists():
            raise HTTPException(status_code=404, detail="Operation log not found")
        
        with open(log_file, 'r') as f:
            log_data = json.load(f)
        
        return JSONResponse(log_data)
    except Exception as e:
        logger.error(f"Error retrieving operation log {operation_id}: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/roles/wipe-proficiencies")
async def wipe_role_proficiencies(request: Dict[str, Any], session: Dict = Depends(get_session)):
    """Wipe/remove all proficiencies from roles"""
    try:
        logger.info(f"Wiping proficiencies from roles in: {request.get('environment')}")
        
        # Extract request data
        environment = request.get("environment")
        roles = request.get("roles", [])
        
        if not roles:
            raise HTTPException(status_code=400, detail="No roles specified")
        
        # Use Eightfold proxy to update roles with empty skillProficiencies
        results = []
        for role in roles:
            # Build Eightfold API request with empty skills array
            role_id = role.get("id")
            if not role_id:
                logger.warning(f"Skipping role without ID: {role.get('title')}")
                continue
            
            api_request = {
                "endpoint": f"/api/v2/JIE/roles/{role_id}",
                "method": "PUT",
                "body": {
                    "title": role.get("title"),
                    "skillProficiencies": []  # Empty array to wipe skills
                },
                "base_url": "https://apiv2.eightfold.ai"
            }
            
            # Make the API call
            response = await eightfold_api_proxy(api_request, session)
            results.append(response)
        
        return JSONResponse({
            "success": True,
            "message": f"Wiped proficiencies from {len(roles)} roles",
            "results": results,
            "request": request,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error wiping proficiencies: {e}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "request": request
        }, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app_fastapi:app",
        host="127.0.0.1",
        port=settings.flask_port,
        reload=True,  # Enable auto-reload
        reload_dirs=[".", "core", "claude_agents", "config", "web"],  # Watch these directories
        log_level="info"
    )

# Sandbox Configuration API Endpoints
@app.get("/api/sandbox-configs")
async def get_sandbox_configs():
    """Get all sandbox configurations"""
    configs = load_sandbox_configs()
    return JSONResponse({"configs": configs})

@app.post("/api/sandbox-configs")
async def create_sandbox_config(config: SandboxConfig):
    """Create a new sandbox configuration"""
    configs = load_sandbox_configs()
    
    # Generate a unique key for the config
    config_key = config.name.lower().replace(' ', '-').replace('_', '-')
    
    # Check if config already exists
    if config_key in configs:
        raise HTTPException(status_code=400, detail="Configuration with this name already exists")
    
    # Add the new configuration
    configs[config_key] = {
        "name": config.name,
        "apiUrl": config.apiUrl,
        "username": config.username,
        "password": config.password,
        "description": config.description,
        "authHeader": config.authHeader,
        "grantType": config.grantType
    }
    
    save_sandbox_configs(configs)
    return JSONResponse({"success": True, "message": "Configuration created successfully", "key": config_key})

@app.put("/api/sandbox-configs/{config_key}")
async def update_sandbox_config(config_key: str, config: SandboxConfig):
    """Update an existing sandbox configuration"""
    configs = load_sandbox_configs()
    
    if config_key not in configs:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # Update the configuration
    configs[config_key] = {
        "name": config.name,
        "apiUrl": config.apiUrl,
        "username": config.username,
        "password": config.password,
        "description": config.description,
        "authHeader": config.authHeader,
        "grantType": config.grantType
    }
    
    save_sandbox_configs(configs)
    return JSONResponse({"success": True, "message": "Configuration updated successfully"})

@app.delete("/api/sandbox-configs/{config_key}")
async def delete_sandbox_config(config_key: str):
    """Delete a sandbox configuration"""
    configs = load_sandbox_configs()

    # Handle empty or whitespace-only keys
    if not config_key or config_key.strip() == '':
        raise HTTPException(status_code=400, detail="Invalid configuration key")

    config_key = config_key.strip()

    if config_key not in configs:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # Don't allow deletion of predefined configs
    predefined_keys = ['adoherty-demo', 'dev-sandbox', 'staging-sandbox']
    if config_key in predefined_keys:
        raise HTTPException(status_code=403, detail="Cannot delete predefined configurations")

    del configs[config_key]
    save_sandbox_configs(configs)
    return JSONResponse({"success": True, "message": "Configuration deleted successfully"})

# ============================================
# LangChain Chat API for API Explorer
# ============================================

class ChatRequest(BaseModel):
    """Chat request model for API Explorer assistant"""
    message: str = Field(..., description="User's message")
    context: Optional[str] = Field(None, description="Current API endpoint context")
    provider: str = Field(..., description="LLM provider")
    model: str = Field(..., description="Model name")
    temperature: float = Field(1.0, description="Temperature setting")
    max_tokens: int = Field(1000, description="Max tokens")
    system_prompt: Optional[str] = Field(None, description="System prompt")
    conversation_history: Optional[List[Dict[str, str]]] = Field(None, description="Previous messages")

@app.post("/api/langchain/chat")
async def langchain_chat(request: Request, chat_request: ChatRequest):
    """Handle LangChain chat requests for API Explorer assistant"""
    try:
        # Get session ID from request
        session = await get_session(request)
        session_id = session.get("session_id", "")
        
        # Check if API keys are configured
        if session_id not in api_keys_storage:
            return JSONResponse({
                "success": False,
                "error": "LLM not configured. Please configure API keys first."
            })
        
        api_keys = api_keys_storage[session_id]
        
        # Validate provider API key
        if chat_request.provider not in api_keys:
            return JSONResponse({
                "success": False,
                "error": f"API key not configured for {chat_request.provider}"
            })
        
        # Build the full prompt with context
        full_prompt = chat_request.message
        if chat_request.context:
            full_prompt = f"{chat_request.context}\n\nUser Question: {chat_request.message}"
        
        # Add conversation history if provided
        messages = []
        if chat_request.system_prompt:
            messages.append({"role": "system", "content": chat_request.system_prompt})
        
        if chat_request.conversation_history:
            for msg in chat_request.conversation_history[-5:]:  # Last 5 messages for context
                if msg.get("role") and msg.get("content"):
                    messages.append({"role": msg["role"], "content": msg["content"]})
        
        messages.append({"role": "user", "content": full_prompt})
        
        # Call LangChain service
        result = await langchain_service.generate_with_chain(
            prompt=full_prompt,
            provider=chat_request.provider,
            model=chat_request.model,
            api_keys=api_keys,
            temperature=chat_request.temperature,
            max_tokens=chat_request.max_tokens,
            messages=messages,
            use_langchain=True
        )
        
        if result.get("success"):
            return JSONResponse({
                "success": True,
                "response": result.get("response", ""),
                "model_used": result.get("model_used", chat_request.model),
                "tokens_used": result.get("tokens_used", 0)
            })
        else:
            return JSONResponse({
                "success": False,
                "error": result.get("error", "Failed to generate response")
            })
            
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        })