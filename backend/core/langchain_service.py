"""
LangChain Service for proficiency assessment
Integrates with multiple LLM providers using LangChain
"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional, Callable
from pathlib import Path
import time
import hashlib
from datetime import datetime
import re
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
import google.generativeai as genai
from config.settings import settings

logger = logging.getLogger(__name__)

# Create directory for request/response logs
LOG_DIR = Path("assessment_logs")
LOG_DIR.mkdir(exist_ok=True)

class LangChainService:
    """Service for LangChain-based proficiency assessment"""
    
    def __init__(self):
        self.llm_providers = {}
        self.chains = {}
        # Store API keys at instance level for session-based management
        self.openai_api_key = None
        self.anthropic_api_key = None
        self.google_api_key = None
        self.grok_api_key = None
        self.kimi_api_key = None
        self.deepseek_api_key = None
    
    def _supports_json_format(self, model: str) -> bool:
        """Check if model supports response_format json_object"""
        # Models that support JSON response format
        supported_models = [
            'gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 
            'gpt-4-0613', 'gpt-4-32k', 'gpt-4-32k-0613',
            'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0125',
            'gpt-3.5-turbo-1106'
        ]
        return any(supported in model for supported in supported_models)
    
    def _requires_default_temperature(self, model: str) -> bool:
        """Check if model only supports default temperature (1.0)"""
        # Models that only support temperature=1
        restricted_models = ['o1-preview', 'o1-mini', 'o1', 'chatgpt-40', 'gpt-40', 'chatgpt-4o', 'chatgpt-4o-latest']
        
        # Check temporary restricted models (added at runtime after detecting temperature errors)
        if hasattr(self, '_temp_restricted_models'):
            restricted_models.extend(self._temp_restricted_models)
            
        return any(restricted in model.lower() for restricted in restricted_models)
        
    def initialize_provider(self, provider: str, api_key: Optional[str] = None, model: Optional[str] = None, 
                           temperature: Optional[float] = None, max_tokens: Optional[int] = None, 
                           top_p: Optional[float] = None, response_format: Optional[Dict] = None) -> bool:
        """Initialize a specific LLM provider with LangChain"""
        try:
            if provider == "openai":
                key = api_key or self.openai_api_key or settings.openai_api_key
                if not key:
                    logger.warning("OpenAI API key not provided")
                    return False
                
                # Determine model and whether it supports JSON format
                model_name = model or settings.default_model if hasattr(settings, 'default_model') else "gpt-4"
                model_kwargs = {}
                
                # Only add response_format for models that support it
                if self._supports_json_format(model_name):
                    model_kwargs["response_format"] = {"type": "json_object"}
                    
                # Use provided temperature or default to 1.0
                model_temperature = temperature if temperature is not None else 1.0
                
                # Build model kwargs
                if self._supports_json_format(model_name) and response_format:
                    model_kwargs["response_format"] = response_format
                    
                # Build LLM parameters
                llm_params = {
                    "api_key": key,
                    "model_name": model_name,
                    "temperature": model_temperature,
                    "model_kwargs": model_kwargs
                }
                
                # Add max_tokens if provided
                if max_tokens is not None:
                    llm_params["max_tokens"] = max_tokens
                    
                # Add top_p if provided (for models that support it)
                if top_p is not None:
                    model_kwargs["top_p"] = top_p
                    
                self.llm_providers[provider] = ChatOpenAI(**llm_params)
                logger.info("Initialized OpenAI provider with LangChain")
                return True
                
            elif provider == "anthropic":
                key = api_key or self.anthropic_api_key or settings.anthropic_api_key
                if not key:
                    logger.warning("Anthropic API key not provided")
                    return False
                    
                # Build Anthropic parameters with user configuration
                anthropic_params = {
                    "anthropic_api_key": key,
                    "model": model or "claude-3-sonnet-20240229",
                    "temperature": temperature if temperature is not None else 1.0,
                    "max_tokens": max_tokens if max_tokens is not None else 4000
                }
                
                self.llm_providers[provider] = ChatAnthropic(**anthropic_params)
                logger.info("Initialized Anthropic provider with LangChain")
                return True
                
            elif provider == "google":
                key = api_key or self.google_api_key or settings.google_api_key
                if not key:
                    logger.warning("Google API key not provided")
                    return False
                
                # Store the API key
                self.google_api_key = key
                
                # Map of supported models
                supported_models = [
                    "gemini-2.5-pro",
                    "gemini-2.5-flash",
                    "gemini-pro"  # fallback
                ]

                # Use provided model if supported, otherwise fallback
                model_name = model or "gemini-2.5-pro"
                if model_name not in supported_models:
                    logger.warning(f"Unsupported model {model_name}, using gemini-2.5-flash")
                    model_name = "gemini-2.5-flash"
                
                # Create ChatGoogleGenerativeAI instance
                try:
                    self.llm_providers[provider] = ChatGoogleGenerativeAI(
                        model=model_name,
                        google_api_key=key,
                        temperature=temperature if temperature is not None else 1.0,
                        max_output_tokens=max_tokens if max_tokens is not None else None,
                        top_p=top_p if top_p is not None else None
                    )
                except Exception as e:
                    logger.error(f"Failed to initialize Google Gemini: {e}")
                    return False
                logger.info("Initialized Google Gemini provider with wrapper")
                return True
                
            elif provider == "grok":
                # Grok would need specific implementation
                key = api_key or self.grok_api_key or settings.grok_api_key
                if not key:
                    logger.warning("Grok API key not provided")
                    return False
                self.grok_api_key = key
                self.llm_providers[provider] = "grok_configured"
                logger.info("Configured Grok provider")
                return True
                
            elif provider == "kimi":
                # Kimi (Moonshot) API - OpenAI compatible
                key = api_key or self.kimi_api_key
                if not key:
                    logger.warning("Kimi API key not provided")
                    return False
                
                model_name = model or "moonshot-v1-8k"
                
                self.llm_providers[provider] = ChatOpenAI(
                    api_key=key,
                    model_name=model_name,
                    temperature=1.0,
                    base_url="https://api.moonshot.cn/v1"
                )
                logger.info("Initialized Kimi provider with LangChain")
                return True
                
            elif provider == "deepseek":
                # DeepSeek API - OpenAI compatible
                key = api_key or self.deepseek_api_key
                if not key:
                    logger.warning("DeepSeek API key not provided")
                    return False
                
                model_name = model or "deepseek-chat"
                
                self.llm_providers[provider] = ChatOpenAI(
                    api_key=key,
                    model_name=model_name,
                    temperature=1.0,
                    base_url="https://api.deepseek.com"
                )
                logger.info("Initialized DeepSeek provider with LangChain")
                return True
                
            else:
                logger.error(f"Unknown provider: {provider}")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing {provider}: {e}")
            return False
    
    def assess_with_langchain(
        self,
        skills: List[Dict[str, Any]],
        resume_text: str,
        provider: str = "openai",
        proficiency_levels: List[str] = None,
        prompt_template_str: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        progress_callback: Optional[Callable] = None,
        # Add legitimate LLM configuration parameters
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        response_format: Optional[Dict] = None,
        # Add batch configuration parameters
        batch_size: Optional[int] = None,
        concurrent_batches: Optional[int] = None,
        processing_mode: Optional[str] = None,
        **kwargs  # Additional keyword arguments for chunk persistence
    ) -> Dict[str, Any]:
        """
        Assess proficiencies using LangChain with dynamic prompt template
        """
        from datetime import datetime
        logger.info(f"[{datetime.now().strftime('%H:%M:%S')}] assess_with_langchain called")
        logger.info(f"Skills: {len(skills)}, Provider: {provider}, Model: {model}")
        logger.info(f"Batch config - size: {batch_size}, concurrent: {concurrent_batches}, mode: {processing_mode}")

        # Initialize provider if needed
        if provider not in self.llm_providers or api_key or model:
            if not self.initialize_provider(provider, api_key, model, temperature, max_tokens, top_p, response_format):
                raise ValueError(f"Failed to initialize provider: {provider}")
        
        # Default proficiency levels
        if not proficiency_levels:
            proficiency_levels = ["Novice", "Developing", "Intermediate", "Advanced", "Expert"]
        
        # IMPORTANT: Only use default if prompt_template_str is None (not sent)
        # Empty string from UI means user wants minimal/no prompt
        if prompt_template_str is None:
            logger.warning("No prompt template provided to LangChain, using minimal default")
            prompt_template_str = """You are an expert skills assessor. Assign proficiency levels (1-5) for these skills based on industry standards.

Proficiency Levels:
1 = Novice (0-20% mastery, basic awareness, needs supervision)
2 = Developing (21-40% mastery, fundamental concepts, occasional guidance)
3 = Intermediate (41-60% mastery, solid working knowledge, works independently)
4 = Advanced (61-80% mastery, comprehensive expertise, mentors others)
5 = Expert (81-100% mastery, industry thought leader, innovates)

Skills to assess: {skills_to_assess}

Return JSON with this structure for ALL skills:
```json
{{
    "assessments": [
        {{
            "skill_name": "exact skill name from list above",
            "proficiency": 3,
            "confidence_score": 0.85,
            "reasoning": "Brief justification for this proficiency level"
        }}
    ]
}}
```

Consider: skill complexity, industry standards, typical learning time, market demand.
Return ONLY valid JSON with ALL skills assessed."""
        elif prompt_template_str == "":
            # User explicitly wants empty/minimal prompt
            logger.info("User provided empty prompt template, using minimal format")
            prompt_template_str = "Assess skills: {skills_to_assess}\nReturn JSON: {\"assessments\": [{\"skill_name\": \"name\", \"proficiency\": 1-5}]}"
        
        # Handle large skill sets by batching
        # IMPORTANT: Always use UI-provided batch_size when available, NO backend defaults
        max_skills_per_batch = batch_size if batch_size is not None else settings.skills_batch_size

        if len(skills) > max_skills_per_batch:
            logger.info(f"Processing {len(skills)} skills in batches of {max_skills_per_batch}")

            # Use batch processing
            return self._assess_skills_in_batches(
                skills=skills,
                resume_text=resume_text,
                provider=provider,
                proficiency_levels=proficiency_levels,
                prompt_template_str=prompt_template_str,
                api_key=api_key,
                model=model,
                progress_callback=progress_callback,
                batch_size=batch_size,
                concurrent_batches=concurrent_batches,
                processing_mode=processing_mode,
                **kwargs  # Pass along any additional keyword arguments
            )
        
        # For smaller skill sets, process normally
        # Create skills list for the prompt
        skills_list = ', '.join([s.get('name', s.get('skill_name', '')) for s in skills])

        # Check if template has a placeholder for skills, otherwise append them
        if '{skills_to_assess}' not in prompt_template_str and '{skills}' not in prompt_template_str:
            # No placeholder found, append skills to the prompt
            prompt_template_str += f"\n\nSKILLS TO ASSESS:\n{skills_list}"

        # Provide default values for complex templates
        default_values = {
            "role_title": "General Role",
            "job_level": "Mid-level",
            "seniority_level": "3-5 years",
            "role_description": "General skill assessment",
            "experience_years": "3-5",
            "proficiency_levels_description": "1=Novice, 2=Developing, 3=Intermediate, 4=Advanced, 5=Expert",
            "skills_to_assess": skills_list
        }
        
        # Create LangChain prompt template - handle JSON escaping
        # PromptTemplate uses Python's str.format() which treats {key} as variables
        # We need to escape JSON examples by doubling braces

        import re
        escaped_template = prompt_template_str

        # Find actual template variables (not JSON keys)
        template_vars = re.findall(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}', escaped_template)

        # Protect template variables
        protected_vars = {}
        for i, var in enumerate(template_vars):
            placeholder = f"__TEMPLATE_VAR_{i}__"
            protected_vars[placeholder] = f"{{{var}}}"
            escaped_template = escaped_template.replace(f"{{{var}}}", placeholder)

        # Escape all remaining braces (JSON examples)
        escaped_template = escaped_template.replace('{', '{{').replace('}', '}}')

        # Restore template variables
        for placeholder, var in protected_vars.items():
            escaped_template = escaped_template.replace(placeholder, var)

        # Add resume_text if not already present
        if "resume_text" not in template_vars:
            template_vars.append("resume_text")

        # Create prompt with properly escaped template
        prompt = PromptTemplate(
            input_variables=template_vars,
            template=escaped_template
        )
        
        # Execute based on provider
        try:
            if provider in ["openai", "anthropic", "kimi", "deepseek", "google"]:
                from langchain.chains import LLMChain
                llm = self.llm_providers[provider]
                chain = LLMChain(llm=llm, prompt=prompt)
                
                # Run the chain with appropriate variables
                if len(prompt.input_variables) == 1 and prompt.input_variables[0] == "resume_text":
                    # Simple template - just resume_text
                    response = chain.run(resume_text=resume_text)
                    formatted_prompt = prompt.format(resume_text=resume_text[:200] + "...")
                else:
                    # Complex template - provide all required variables
                    chain_params = {"resume_text": resume_text}
                    for var in prompt.input_variables:
                        if var not in chain_params:
                            if var in default_values:
                                chain_params[var] = default_values[var]
                            else:
                                chain_params[var] = ""  # Fallback for any unexpected variables
                    response = chain.run(**chain_params)
                    # Create formatted prompt for logging
                    log_params = dict(chain_params)
                    log_params["resume_text"] = resume_text[:200] + "..."
                    formatted_prompt = prompt.format(**log_params)
                
                # Log the raw response
                logger.info(f"LangChain response length: {len(response)}")
                
                return {
                    "success": True,
                    "provider": provider,
                    "raw_response": response,
                    "chain_type": "LLMChain",
                    "prompt_used": formatted_prompt[:500] + "..." if len(formatted_prompt) > 500 else formatted_prompt,
                    "batch_info": {
                        "total_skills": len(skills),
                        "total_batches": 1,
                        "successful_batches": 1,
                        "failed_batches": 0,
                        "skills_per_batch": len(skills),
                        "successful_assessments": len(skills),
                        "all_batches_failed": False,
                        "batch_size": batch_size,
                        "concurrent_batches": concurrent_batches,
                        "processing_mode": processing_mode,
                        "max_workers": 1
                    }
                }
                
            elif provider == "google":
                # Handle Google Gemini with LangChain
                llm = self.llm_providers[provider]
                
                # Format the prompt with appropriate variables
                if len(prompt.input_variables) == 1:
                    # Simple template - just resume_text
                    formatted_prompt = prompt.format(resume_text=resume_text)
                else:
                    # Complex template - provide all required variables
                    format_params = {"resume_text": resume_text}
                    for var in prompt.input_variables:
                        if var not in format_params:
                            if var in default_values:
                                format_params[var] = default_values[var]
                            else:
                                format_params[var] = ""  # Fallback for any unexpected variables
                    formatted_prompt = prompt.format(**format_params)
                
                # Generate response using LangChain invoke
                response = llm.invoke(formatted_prompt)
                
                # Extract content from the response
                response_text = response.content if hasattr(response, 'content') else str(response)
                
                return {
                    "success": True,
                    "provider": provider,
                    "raw_response": response_text,
                    "chain_type": "LangChain ChatGoogleGenerativeAI",
                    "prompt_used": formatted_prompt[:500] + "...",  # Truncate for logging
                    "batch_info": {
                        "total_skills": len(skills),
                        "total_batches": 1,
                        "successful_batches": 1,
                        "failed_batches": 0,
                        "skills_per_batch": len(skills),
                        "successful_assessments": len(skills),
                        "all_batches_failed": False,
                        "batch_size": batch_size,
                        "concurrent_batches": concurrent_batches,
                        "processing_mode": processing_mode,
                        "max_workers": 1
                    }
                }
                
            elif provider == "grok":
                # Placeholder for Grok implementation
                logger.warning("Grok provider not fully implemented, using mock response")
                mock_response = self._generate_mock_response(skills, proficiency_levels)
                
                return {
                    "success": True,
                    "provider": provider,
                    "raw_response": str(mock_response),
                    "chain_type": "Mock",
                    "prompt_used": "Mock prompt for Grok",
                    "batch_info": {
                        "total_skills": len(skills),
                        "total_batches": 1,
                        "successful_batches": 1,
                        "failed_batches": 0,
                        "skills_per_batch": len(skills),
                        "successful_assessments": len(skills),
                        "all_batches_failed": False,
                        "batch_size": batch_size,
                        "concurrent_batches": concurrent_batches,
                        "processing_mode": processing_mode,
                        "max_workers": 1
                    }
                }
                
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"Error in LangChain assessment: {e}")
            raise
    
    def _assess_skills_in_batches(
        self,
        skills: List[Dict[str, Any]],
        resume_text: str,
        provider: str,
        proficiency_levels: List[str],
        prompt_template_str: str,
        api_key: str,
        model: str,
        progress_callback: Optional[Callable] = None,
        batch_size: Optional[int] = None,
        concurrent_batches: Optional[int] = None,
        processing_mode: Optional[str] = None,
        **kwargs  # Additional keyword arguments for chunk persistence
    ) -> Dict[str, Any]:
        """Process skills in batches to handle large skill sets"""
        from langchain.prompts import PromptTemplate
        from langchain.chains import LLMChain

        # Special handling for Google - optimize for token limits
        if provider == 'google':
            # Google has 8K output token limit and rate limits
            # Batch 3 often fails with rate limits, so use adaptive sizing

            # For Google, enforce maximum batch size regardless of user input
            # Google has 8K output token limit - but respect user settings
            google_suggested_max = 300  # Suggested safe size for 8K token limit

            if batch_size:
                # User specified batch size - respect it but warn if large
                if batch_size > google_suggested_max:
                    logger.warning(f"Google: Using user batch size {batch_size} (>{google_suggested_max} may hit limits)")
                    logger.info("⚠️ Monitor for truncation with large batches")
                else:
                    logger.info(f"Google: Using user batch size {batch_size}")
                max_skills_per_batch = batch_size
            else:
                # No user preference, use safe default
                max_skills_per_batch = google_suggested_max
                logger.info(f"Google: Using default batch size {max_skills_per_batch}")

            # Already logged above, no need for duplicate
        else:
            max_skills_per_batch = batch_size if batch_size is not None else settings.skills_batch_size

        # Generate unique chunk ID for this assessment run
        chunk_id = hashlib.md5(f"{time.time()}_{len(skills)}".encode()).hexdigest()[:8]
        session_id = kwargs.get('session_id', None)
        enable_chunk_persistence = kwargs.get('enable_chunk_persistence', True)
        restart_from_chunk = kwargs.get('restart_from_chunk', None)

        # Load existing chunks if restarting
        existing_chunks = {}
        if restart_from_chunk:
            existing_chunks = self._load_chunks(restart_from_chunk, session_id)
            if existing_chunks:
                logger.info(f"Loaded {len(existing_chunks)} existing chunks for restart")

        all_assessments = []
        total_batches = (len(skills) + max_skills_per_batch - 1) // max_skills_per_batch

        logger.info(f"Processing {len(skills)} skills in {total_batches} batches (batch size: {max_skills_per_batch})")
        if enable_chunk_persistence:
            logger.info(f"Chunk ID: {chunk_id} - Results will be saved for recovery")

        # For Google, show expected output size warning
        if provider == 'google' and total_batches > 10:
            estimated_chars_per_batch = max_skills_per_batch * 250  # ~250 chars per skill in compact format
            logger.info(f"Google: Each batch will generate ~{estimated_chars_per_batch:,} chars of JSON output")

        # Use the original prompt template passed in - no simplified version needed

        # Function to process a single batch
        def process_batch(batch_index: int, batch_skills: List[Dict], batch_prompt_template: str = None) -> tuple:
            # Use passed template or fall back to outer scope
            if batch_prompt_template is None:
                batch_prompt_template = prompt_template_str
            import json  # Import json for this function scope
            logger.info(f"Processing batch {batch_index + 1}/{total_batches} ({len(batch_skills)} skills)")

            # Report progress if callback provided
            # Initial progress callback for batch start
            if progress_callback:
                progress_callback(batch_index + 1, total_batches, f"Processing batch {batch_index + 1}")

            try:
                # Process this batch directly without recursion
                # Skills are passed in JSON, not in prompt template

                # Create skills list from the batch
                skills_to_assess = ', '.join([s.get('name', s.get('skill_name', '')) for s in batch_skills])

                # Check if user explicitly selected simplified prompt
                is_simplified_prompt = (batch_prompt_template and 'SIMPLIFIED_PROMPT_MARKER' in batch_prompt_template)

                # REMOVED: Google auto-optimization that overrides user prompts
                # Now ONLY use simplified prompt if user explicitly selected it
                if is_simplified_prompt:
                    logger.info(f"Batch {batch_index + 1}: User selected simplified prompt")
                    logger.info(f"Batch {batch_index + 1}: Using simplified format for {len(batch_skills)} skills")
                    # Simplified prompt - minimal output for faster response
                    batch_prompt_template = """Rate each skill 1-5:
1=Novice 2=Developing 3=Intermediate 4=Advanced 5=Expert

Skills: {skills_to_assess}

Return ONLY valid JSON with this structure:
{"assessments": [{"skill_name": "skill name here", "proficiency": number_between_1_and_5}]}

Example for one skill:
{"assessments": [{"skill_name": "Python", "proficiency": 3}]}"""

                # For skill-only assessment, inject the skills list directly into the template
                # Replace any {skills_to_assess} placeholder with actual skills
                if '{skills_to_assess}' in batch_prompt_template:
                    batch_prompt_template = batch_prompt_template.replace('{skills_to_assess}', skills_to_assess)
                elif '{skills}' in batch_prompt_template:
                    batch_prompt_template = batch_prompt_template.replace('{skills}', skills_to_assess)
                else:
                    # If no placeholder found, append skills to the end of the prompt
                    batch_prompt_template += f"\n\nSKILLS TO ASSESS:\n{skills_to_assess}"

                # After replacement, escape JSON examples to prevent PromptTemplate from treating them as variables
                # PromptTemplate uses Python's str.format() which treats {key} as variables
                # We need to escape JSON by doubling the braces: { becomes {{ and } becomes }}
                escaped_template = batch_prompt_template

                # Only escape JSON-like patterns, not template variables
                import re

                # First, protect actual template variables by temporarily replacing them
                template_vars = re.findall(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}', escaped_template)
                protected_vars = {}
                for i, var in enumerate(template_vars):
                    placeholder = f"__TEMPLATE_VAR_{i}__"
                    protected_vars[placeholder] = f"{{{var}}}"
                    escaped_template = escaped_template.replace(f"{{{var}}}", placeholder)

                # Now escape all remaining braces (which should be JSON)
                escaped_template = escaped_template.replace('{', '{{').replace('}', '}}')

                # Restore the protected template variables
                for placeholder, var in protected_vars.items():
                    escaped_template = escaped_template.replace(placeholder, var)

                # Create prompt with escaped JSON
                prompt = PromptTemplate(
                    input_variables=template_vars if template_vars else [],
                    template=escaped_template
                )
                
                # Execute based on provider
                if provider in ["openai", "anthropic", "kimi", "deepseek", "google"]:
                    from langchain.chains import LLMChain
                    import time
                    llm = self.llm_providers[provider]
                    chain = LLMChain(llm=llm, prompt=prompt)

                    # No staggering needed with proper batch sizes
                    
                    # Provide default values for the original template variables
                    default_values = {
                        "role_title": "General Role",
                        "job_level": "Mid-level",
                        "seniority_level": "3-5 years",
                        "role_description": "General skill assessment",
                        "experience_years": "3-5",
                        "proficiency_levels_description": "1=Novice, 2=Developing, 3=Intermediate, 4=Advanced, 5=Expert",
                        "skills_to_assess": skills_to_assess,
                        "resume_text": resume_text
                    }

                    # Build chain parameters with all required variables
                    chain_params = {}
                    for var in prompt.input_variables:
                        if var in default_values:
                            chain_params[var] = default_values[var]
                        else:
                            chain_params[var] = ""  # Fallback for any unexpected variables

                    # Debug logging
                    logger.info(f"Batch {batch_index + 1}: Input variables found: {prompt.input_variables}")
                    logger.info(f"Batch {batch_index + 1}: Chain params keys: {list(chain_params.keys())}")

                    # Run the chain with retry logic for rate limits
                    max_retries = 5 if provider == 'google' else 3  # More retries for Google with longer delays
                    retry_count = 0
                    retry_info = {"batch": batch_index + 1, "retries": 0, "rate_limited": False}

                    while retry_count < max_retries:
                        try:
                            if chain_params:
                                # Run with parameters
                                response = chain.run(**chain_params)
                            else:
                                # For templates with no variables, run without parameters
                                response = chain.run({})
                            break  # Success, exit retry loop
                        except Exception as e:
                            error_str = str(e).lower()
                            if "429" in str(e) or "quota" in error_str or "rate" in error_str or "limit" in error_str:
                                retry_count += 1
                                retry_info["retries"] = retry_count
                                retry_info["rate_limited"] = True

                                # For Google quota/limit errors, provide helpful message
                                if provider == 'google' and ('quota' in error_str or 'limit' in error_str):
                                    if 'output' in error_str or 'token' in error_str:
                                        logger.error(f"\n⚠️ Google Output Token Limit Exceeded (Batch {batch_index + 1}/{total_batches})")
                                        logger.error(f"Batch size {len(batch_skills)} is too large for Google's 8K output token limit.")
                                        logger.error(f"Try reducing batch size to 50-75 skills per batch.")
                                        raise Exception(f"Google output token limit exceeded. Reduce batch size to 50-75 skills.")
                                    elif retry_count >= max_retries:
                                        # Only fail if we've exhausted retries
                                        logger.error(f"\n⚠️ Google API Limit Exceeded after {retry_count} retries (Batch {batch_index + 1}/{total_batches})")
                                        logger.error(f"Error: {str(e)}")
                                        raise Exception(f"Google API limit after {retry_count} retries: {str(e)}")

                                if retry_count < max_retries:
                                    # Much longer wait for Google to respect rate limits
                                    if provider == 'google':
                                        # Exponential backoff with longer base: 10s, 20s, 40s, 80s, 160s
                                        base_wait = 10
                                        wait_time = base_wait * (2 ** (retry_count - 1))
                                        # Add jitter to avoid thundering herd
                                        import random
                                        wait_time += random.uniform(0, 5)
                                    else:
                                        base_wait = 2
                                        wait_time = base_wait * (2 ** retry_count)

                                    logger.warning(f"Rate limit hit for batch {batch_index + 1}, retry {retry_count}/{max_retries}, waiting {wait_time:.1f} seconds...")
                                    retry_info["last_wait_time"] = wait_time

                                    # Report retry status via progress callback
                                    if progress_callback:
                                        progress_callback(
                                            batch_index + 1,
                                            total_batches,
                                            f"Batch {batch_index + 1}: Rate limited, retry {retry_count}/{max_retries} (waiting {wait_time:.0f}s)"
                                        )

                                    time.sleep(wait_time)

                                    # After wait, report that we're retrying
                                    if progress_callback:
                                        progress_callback(
                                            batch_index + 1,
                                            total_batches,
                                            f"Batch {batch_index + 1}: Retrying after rate limit (attempt {retry_count + 1}/{max_retries})"
                                        )
                                else:
                                    raise  # Re-raise if max retries exceeded
                            else:
                                raise  # Re-raise non-rate-limit errors
                    
                    # Log the LLM request and response
                    self._log_batch_request_response(
                        batch_index=batch_index,
                        provider=provider,
                        request={"skills": [s.get('name', s.get('skill_name', '')) for s in batch_skills]},
                        response=response
                    )
                    
                    batch_result = {
                        "success": True,
                        "provider": provider,
                        "raw_response": response,
                        "retry_info": retry_info if retry_info["rate_limited"] else None
                    }
                else:
                    # For other providers, generate mock response
                    mock_response = self._generate_mock_response(batch_skills, proficiency_levels, provider)
                    batch_result = {
                        "success": True,
                        "provider": provider,
                        "raw_response": json.dumps(mock_response)
                    }
                    
                # Include retry info in the return
                if batch_result and "retry_info" not in batch_result:
                    batch_result["retry_info"] = None
                return batch_index, batch_result
            except Exception as e:
                error_msg = str(e)
                # Log the full exception details for debugging
                logger.error(f"Exception in batch {batch_index + 1}: Type: {type(e).__name__}, Message: {error_msg}")
                logger.error(f"Exception repr: {repr(e)}")

                # Check if this is a quota/rate limit error
                if "quota" in error_msg.lower() or "rate" in error_msg.lower() or "limit" in error_msg.lower() or "429" in error_msg:
                    logger.warning(f"Rate limit/quota exceeded in batch {batch_index + 1}: {e}")
                    # Extract meaningful error message
                    if "429" in error_msg and "quota" in error_msg.lower():
                        clean_msg = "Google API quota exceeded (50 requests/day on free tier). Please wait 24 hours or upgrade to a paid plan."
                    else:
                        clean_msg = error_msg
                    return batch_index, {"error": "rate_limit", "message": clean_msg}
                else:
                    logger.error(f"Error in batch {batch_index + 1}: {e}")
                    return batch_index, {"error": "processing", "message": error_msg}
        
        # Create batches, skipping already completed ones if restarting
        batches = []
        for batch_index in range(total_batches):
            # Skip if this batch was already completed in a previous run
            if batch_index in existing_chunks and existing_chunks[batch_index].get("status") == "completed":
                logger.info(f"Skipping batch {batch_index} - already completed in previous run")
                continue

            start_idx = batch_index * max_skills_per_batch
            end_idx = min(start_idx + max_skills_per_batch, len(skills))
            batch_skills = skills[start_idx:end_idx]
            batches.append((batch_index, batch_skills))
        
        # Process batches based on processing mode
        # Use passed concurrent_batches or fall back to settings
        max_concurrent = concurrent_batches if concurrent_batches is not None else settings.max_concurrent_batches

        # Respect user's processing mode and concurrent batch settings
        if processing_mode == 'parallel' and max_concurrent > 1:
            max_workers = min(max_concurrent, total_batches)
            logger.info(f"Processing {total_batches} batches with {max_workers} parallel workers (user configured)")
        else:
            max_workers = 1
            logger.info(f"Processing {total_batches} batches sequentially")
        
        batch_results = {}
        successful_batches = 0
        failed_batches = 0
        rate_limit_warnings = []  # Track rate limit retry attempts
        batch_errors = []  # Track specific errors for failed batches

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all batch processing tasks
            future_to_batch = {
                executor.submit(process_batch, batch_idx, batch_skills): batch_idx
                for batch_idx, batch_skills in batches
            }
            
            # Process completed batches as they finish
            for future in as_completed(future_to_batch):
                batch_idx = future_to_batch[future]
                try:
                    idx, batch_result = future.result(timeout=settings.batch_processing_timeout)
                    batch_results[idx] = batch_result

                    # Save chunk if persistence is enabled
                    if enable_chunk_persistence and batch_result:
                        batch_skills = next((b[1] for b in batches if b[0] == idx), [])
                        self._save_chunk(chunk_id, idx, batch_skills, batch_result, session_id)

                    # Collect rate limit retry info if present
                    if batch_result and batch_result.get('retry_info'):
                        retry_info = batch_result['retry_info']
                        warning_msg = f"Batch {retry_info['batch']}: Rate limited, retried {retry_info['retries']} time(s)"
                        if 'last_wait_time' in retry_info:
                            warning_msg += f" (last wait: {retry_info['last_wait_time']:.1f}s)"
                        rate_limit_warnings.append(warning_msg)
                        logger.warning(f"Rate limit warning: {warning_msg}")

                    # Check if batch_result is an error dict
                    if batch_result and 'error' in batch_result:
                        # Handle error result
                        error_type = batch_result.get('error')
                        error_message = batch_result.get('message', 'Unknown error')
                        if error_type == 'rate_limit':
                            logger.error(f"Batch {idx + 1} hit rate limit: {error_message}")
                            failed_batches += 1
                            # Use the clean error message from the batch result
                            raise Exception(error_message)
                        else:
                            logger.error(f"Batch {idx + 1} processing error: {error_message}")
                            failed_batches += 1
                            # Pass through the error message as-is
                            raise Exception(error_message)
                    elif batch_result and batch_result.get('success') and 'raw_response' in batch_result:
                        # Parse batch response
                        try:
                            import json
                            raw_response = batch_result['raw_response']
                            logger.info(f"Parsing batch {idx + 1} raw_response: {raw_response[:200]}...")
                            
                            # Clean response - remove markdown code blocks if present
                            cleaned_response = self._clean_json_response(raw_response)
                            batch_data = json.loads(cleaned_response)

                            # Handle both list and dict formats
                            if isinstance(batch_data, list):
                                # Direct list of assessments
                                logger.info(f"Parsed as list with {len(batch_data)} items")
                                all_assessments.extend(batch_data)
                                if idx == 0 and batch_data:
                                    logger.info(f"Sample parsed assessments from batch 1 (first 3): {batch_data[:3]}")
                            elif isinstance(batch_data, dict):
                                logger.info(f"Parsed batch data keys: {list(batch_data.keys())}")
                                if 'assessments' in batch_data:
                                    # Log sample of parsed assessments to see what LLM returned
                                    if idx == 0 and batch_data['assessments']:
                                        logger.info(f"Sample parsed assessments from batch 1 (first 3): {batch_data['assessments'][:3]}")
                                    all_assessments.extend(batch_data['assessments'])
                            else:
                                logger.warning(f"Unexpected batch data type: {type(batch_data)}")
                            successful_batches += 1
                            skills_count = len(batch_data) if isinstance(batch_data, list) else len(batch_data.get('assessments', []))
                            logger.info(f"✅ Batch {idx + 1}/{total_batches} completed successfully - {skills_count} skills assessed")

                            # Report success via progress callback
                            if progress_callback:
                                progress_callback(
                                    idx + 1,
                                    total_batches,
                                    f"✅ Batch {idx + 1} completed - {skills_count} skills assessed"
                                )

                            # No delay needed with current batch configuration
                        except json.JSONDecodeError as e:
                            raw_resp = batch_result.get('raw_response', 'No response')
                            logger.error(f"Failed to parse batch {idx + 1} response: {e}")
                            logger.error(f"Response length: {len(raw_resp)} characters")

                            # Check if response appears truncated
                            if not raw_resp.rstrip().endswith('}') and not raw_resp.rstrip().endswith('```'):
                                logger.error(f"Response appears truncated. Last 200 chars: ...{raw_resp[-200:]}")
                                if provider == 'google' and len(batch_skills) > 300:
                                    error_detail = f"Google Gemini output token limit exceeded. Batch size {len(batch_skills)} is too large. Reduce to 300 or fewer skills per batch."
                                else:
                                    error_detail = f"Response truncated at {len(raw_resp)} chars (batch had {len(batch_skills)} skills). Try reducing batch size to {max(100, len(batch_skills)//2)} skills."
                            else:
                                logger.error(f"Raw response that failed to parse (first 500 chars): {raw_resp[:500]}")
                                logger.error(f"Last 200 chars: {raw_resp[-200:]}")
                                error_detail = f"Invalid JSON format in response. Check LLM output format."

                            failed_batches += 1
                            batch_errors.append(f"Batch {idx + 1}: {error_detail}")
                            logger.error(f"Batch {idx + 1} failed: {error_detail}")
                            # Continue processing other batches instead of raising immediately
                            continue
                    else:
                        logger.error(f"Batch {idx + 1} failed completely")
                        failed_batches += 1
                        batch_errors.append(f"Batch {idx + 1}: No response from LLM")
                        # Continue processing other batches instead of raising immediately
                        continue
                            
                except Exception as e:
                    failed_batches += 1
                    error_msg = str(e)

                    # Log batch failure with context
                    logger.error(f"Batch {batch_idx + 1}/{total_batches} failed after processing {successful_batches} successful batches")
                    logger.error(f"Error details: {error_msg}")

                    # Provide specific error message based on the failure type
                    if "Rate limit" in error_msg or "429" in error_msg or "quota" in error_msg.lower():
                        # For rate limit errors, continue processing with partial results if we have some
                        if successful_batches > 0:
                            logger.warning(f"⚠️ Batch {batch_idx + 1} hit rate limit after {successful_batches} successful batches")
                            logger.warning(f"Continuing with partial results from {successful_batches}/{total_batches} batches")
                            # Don't raise exception - continue with partial results
                        else:
                            detailed_msg = (f"Batch {batch_idx + 1} failed due to API rate limit/quota exceeded. "
                                          f"No batches were successfully processed. "
                                          f"Try: 1) Waiting a few minutes, 2) Reducing batch size, 3) Switching API provider")
                            logger.error(detailed_msg)
                            raise Exception(detailed_msg)
                    elif "API key" in error_msg or "authentication" in error_msg.lower():
                        raise Exception(f"Batch {batch_idx + 1} failed: API key invalid or missing. {successful_batches} batch(es) completed before failure.")
                    elif "timeout" in error_msg.lower():
                        raise Exception(f"Batch {batch_idx + 1} failed: Request timeout after {successful_batches} successful batch(es). Try smaller batch size.")
                    else:
                        # Include batch completion status in error
                        raise Exception(f"Batch {batch_idx + 1}/{total_batches} failed. {successful_batches} batch(es) completed successfully. Error: {error_msg}")
        
        # If we have existing chunks from restart, combine them with new results
        if existing_chunks:
            logger.info(f"Combining {len(existing_chunks)} existing chunks with {len(batch_results)} new results")
            # Add existing chunks to batch_results
            for idx, chunk_data in existing_chunks.items():
                if idx not in batch_results and chunk_data.get("status") == "completed":
                    batch_results[idx] = chunk_data.get("result")

        # If chunk persistence is enabled, save final combined results
        if enable_chunk_persistence:
            # Combine all chunks for this run
            all_chunks = self._load_chunks(chunk_id, session_id)
            if all_chunks:
                unique_assessments = self._combine_chunk_results(all_chunks)
                all_assessments = unique_assessments
                logger.info(f"Combined {len(unique_assessments)} unique assessments from chunks")

        # Combine all batch results and determine overall success
        import json
        combined_response = {
            "assessments": all_assessments,
            "chunk_info": {
                "chunk_id": chunk_id if enable_chunk_persistence else None,
                "total_chunks": total_batches,
                "completed_chunks": successful_batches,
                "failed_chunks": failed_batches,
                "persistence_enabled": enable_chunk_persistence
            }
        }
        
        # Determine if processing was truly successful
        # Consider successful if at least half the batches succeeded
        overall_success = successful_batches > 0 and (successful_batches >= failed_batches)
        
        # Log batch processing summary with clear formatting
        if failed_batches > 0:
            logger.error(f"⚠️ Batch processing incomplete: {successful_batches}/{total_batches} batches successful, {failed_batches} failed")
        else:
            logger.info(f"✅ All batches processed successfully: {successful_batches}/{total_batches} completed")
        
        # Create detailed error message if batches failed
        error_detail = None
        if failed_batches == total_batches:
            logger.error("⚠️  ALL BATCHES FAILED - No skills were assessed")
            error_detail = "All batches failed. " + (batch_errors[0] if batch_errors else "Check LLM configuration.")
        elif failed_batches > 0:
            logger.warning(f"⚠️  {failed_batches} out of {total_batches} batches failed - Partial results available")
            error_detail = f"{failed_batches}/{total_batches} batches failed. " + (batch_errors[0] if batch_errors else "Some skills not assessed.")

        return {
            "success": overall_success,
            "provider": provider,
            "raw_response": json.dumps(combined_response),
            "chain_type": f"BatchLLMChain ({total_batches} batches)",
            "batch_info": {
                "total_skills": len(skills),
                "total_batches": total_batches,
                "successful_batches": successful_batches,
                "failed_batches": failed_batches,
                "skills_per_batch": max_skills_per_batch,
                "successful_assessments": len(all_assessments),
                "all_batches_failed": failed_batches == total_batches,
                "rate_limit_warnings": rate_limit_warnings if rate_limit_warnings else None,
                "batch_errors": batch_errors if batch_errors else None,
                # Include UI configuration parameters for verification
                "batch_size": batch_size,
                "concurrent_batches": concurrent_batches,
                "processing_mode": processing_mode,
                "max_workers": max_workers,
                "chunk_id": chunk_id if enable_chunk_persistence else None,
                "persistence_enabled": enable_chunk_persistence
            },
            "chunk_info": combined_response.get("chunk_info", {}),
            "warning": "Some assessments are estimated fallback values due to batch failures" if failed_batches > 0 else None,
            "error_detail": error_detail  # Include error detail for frontend to display
        }
    
    def _generate_mock_response(self, skills: List[Dict[str, Any]], proficiency_levels: List[str], provider: str = None) -> Dict[str, Any]:
        """Generate a mock response for testing"""
        import random

        assessments = []
        for skill in skills:
            skill_name = skill.get('name', skill.get('skill_name', ''))
            # Generate random proficiency 1-5
            proficiency = random.randint(1, 5)
            confidence = random.uniform(0.6, 0.95)
            
            assessment = {
                "skill_name": skill_name,
                "proficiency": proficiency
            }
            # Only add optional fields if needed for non-Google providers
            if provider != 'google':
                assessment["confidence_score"] = round(confidence, 2)
                assessment["evidence"] = [f"Skill assessment for {skill_name}", f"Proficiency evaluation"]
                assessment["reasoning"] = f"Mock assessment: Assigned proficiency level {proficiency} for {skill_name} (fallback response)"
            assessments.append(assessment)
        
        return {"assessments": assessments}
    
    def _log_batch_request_response(self, batch_index: int, provider: str, request: Dict, response: str):
        """Log LLM request and response for debugging"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = LOG_DIR / f"batch_{batch_index}_{provider}_{timestamp}.json"
            
            log_data = {
                "timestamp": datetime.now().isoformat(),
                "batch_index": batch_index,
                "provider": provider,
                "request": request,
                "response": response,
                "response_length": len(response) if response else 0
            }
            
            with open(log_file, 'w') as f:
                json.dump(log_data, f, indent=2)
            
            logger.info(f"Logged batch {batch_index} to {log_file}")
        except Exception as e:
            logger.error(f"Failed to log batch request/response: {e}")
    
    def _get_chunk_dir(self, session_id: str = None) -> Path:
        """Get the directory for storing chunk results"""
        chunk_dir = Path("chunk_results")
        if session_id:
            chunk_dir = chunk_dir / session_id
        chunk_dir.mkdir(parents=True, exist_ok=True)
        return chunk_dir

    def _save_chunk(self, chunk_id: str, batch_index: int, skills: List[Dict],
                    result: Dict, session_id: str = None) -> str:
        """Save a chunk result to disk for recovery"""
        chunk_dir = self._get_chunk_dir(session_id)
        chunk_file = chunk_dir / f"chunk_{chunk_id}_batch_{batch_index}.json"

        chunk_data = {
            "chunk_id": chunk_id,
            "batch_index": batch_index,
            "timestamp": datetime.now().isoformat(),
            "skills_count": len(skills),
            "skills": skills,
            "result": result,
            "status": "completed" if result.get("success") else "failed"
        }

        with open(chunk_file, 'w') as f:
            json.dump(chunk_data, f, indent=2)

        logger.info(f"Saved chunk {batch_index} to {chunk_file}")
        return str(chunk_file)

    def _load_chunks(self, chunk_id: str, session_id: str = None) -> Dict[int, Dict]:
        """Load all saved chunks for a given chunk_id"""
        chunk_dir = self._get_chunk_dir(session_id)
        chunks = {}

        for chunk_file in chunk_dir.glob(f"chunk_{chunk_id}_batch_*.json"):
            try:
                with open(chunk_file, 'r') as f:
                    chunk_data = json.load(f)
                    batch_index = chunk_data["batch_index"]
                    chunks[batch_index] = chunk_data
                    logger.info(f"Loaded chunk {batch_index} from {chunk_file}")
            except Exception as e:
                logger.error(f"Failed to load chunk from {chunk_file}: {e}")

        return chunks

    def _combine_chunk_results(self, chunks: Dict[int, Dict]) -> List[Dict]:
        """Combine results from multiple chunks into a single list"""
        all_assessments = []

        # Sort by batch index to maintain order
        for batch_index in sorted(chunks.keys()):
            chunk_data = chunks[batch_index]
            if chunk_data.get("status") == "completed" and chunk_data.get("result"):
                result = chunk_data["result"]
                if isinstance(result.get("raw_response"), str):
                    try:
                        # Parse the raw response to get assessments
                        cleaned = self._clean_json_response(result["raw_response"])
                        parsed = json.loads(cleaned)
                        if "assessments" in parsed:
                            all_assessments.extend(parsed["assessments"])
                            logger.info(f"Added {len(parsed['assessments'])} assessments from chunk {batch_index}")
                    except Exception as e:
                        logger.error(f"Failed to parse chunk {batch_index} results: {e}")

        # Remove duplicates based on skill_name
        seen = set()
        unique_assessments = []
        for assessment in all_assessments:
            skill_name = assessment.get("skill_name")
            if skill_name and skill_name not in seen:
                seen.add(skill_name)
                unique_assessments.append(assessment)

        logger.info(f"Combined {len(unique_assessments)} unique assessments from {len(chunks)} chunks")
        return unique_assessments

    def _clean_json_response(self, raw_response: str) -> str:
        """Clean LLM response to extract pure JSON from markdown code blocks"""
        if not raw_response:
            return raw_response
            
        # Remove markdown code blocks (```json ... ```)
        import re
        
        # Pattern to match ```json ... ``` or ``` ... ```
        code_block_pattern = r'```(?:json)?\s*(.*?)\s*```'
        match = re.search(code_block_pattern, raw_response, re.DOTALL)
        
        if match:
            cleaned = match.group(1).strip()
            logger.info(f"Extracted JSON from code block: {cleaned[:100]}...")
            return cleaned
        
        # If no code blocks, return as-is (might already be clean JSON)
        return raw_response.strip()
    
    def _parse_llm_response_fallback(self, raw_response: str, skills: List[Dict]) -> List[Dict]:
        """Try to extract assessment data from malformed LLM response"""
        if not raw_response:
            return []
        
        assessments = []
        try:
            # Try to find JSON-like structures in the response
            # Look for skill names and proficiency numbers
            for skill in skills:
                skill_name = skill.get('name', skill.get('skill_name', ''))
                if not skill_name:
                    continue
                
                # Search for the skill name and nearby proficiency number
                pattern = rf'{re.escape(skill_name)}[^0-9]*([1-5])'
                match = re.search(pattern, raw_response, re.IGNORECASE)
                
                if match:
                    proficiency = int(match.group(1))
                    assessment = {
                        "skill_name": skill_name,
                        "proficiency": proficiency
                    }
                    # Add optional fields only if they exist in the response
                    if "confidence" in content or "score" in content:
                        assessment["confidence_score"] = 0.7
                    if "reasoning" in content or "reason" in content:
                        assessment["reasoning"] = "Extracted from partial response"
                    assessments.append(assessment)
                    logger.info(f"Extracted assessment for {skill_name}: {proficiency}")
        except Exception as e:
            logger.error(f"Fallback parsing failed: {e}")
        
        return assessments
    
    def update_api_keys(self, keys: Dict[str, str]):
        """Update API keys for the session"""
        if 'openai' in keys:
            self.openai_api_key = keys['openai']
        if 'anthropic' in keys:
            self.anthropic_api_key = keys['anthropic']
        if 'google' in keys:
            self.google_api_key = keys['google']
        if 'grok' in keys:
            self.grok_api_key = keys['grok']
        if 'kimi' in keys:
            self.kimi_api_key = keys['kimi']
        if 'deepseek' in keys:
            self.deepseek_api_key = keys['deepseek']
        
        logger.info("Updated LangChain service API keys")
    
    def query_with_context(self, prompt: str, model: str = "gpt-3.5-turbo", api_key: str = None) -> str:
        """
        Simple query method for answering questions with context.
        Used by the API documentation assistant.
        """
        try:
            # Use provided API key or fallback to instance key
            # Import OpenAI here to avoid global import issues
            import openai
            
            if api_key:
                openai.api_key = api_key
            elif self.openai_api_key:
                openai.api_key = self.openai_api_key
            else:
                return "No OpenAI API key available"
            
            # Create a simple completion
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful API documentation assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=1.0,
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error in query_with_context: {e}")
            return f"Error querying documentation: {str(e)}"

# Global instance
langchain_service = LangChainService()