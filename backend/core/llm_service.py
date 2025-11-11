"""
LLM Service for proficiency assessment
Supports multiple providers: OpenAI, Anthropic, Google, Grok
"""
import json
from typing import List, Dict, Any, Optional
import openai
from anthropic import Anthropic
import google.generativeai as genai
import requests

from core.models import Skill, SkillProficiency, ProficiencyLevel
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

class LLMService:
    """Service for LLM-based proficiency assessment"""
    
    def __init__(self):
        self.providers = {}
        # Store API keys at instance level for session-based management
        self.openai_api_key = None
        self.anthropic_api_key = None
        self.google_api_key = None
        self.grok_api_key = None
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available LLM providers"""
        # OpenAI
        if settings.openai_api_key:
            openai.api_key = settings.openai_api_key
            self.providers['openai'] = 'initialized'
            logger.info("Initialized OpenAI provider")
        
        # Anthropic
        if settings.anthropic_api_key:
            self.providers['anthropic'] = Anthropic(api_key=settings.anthropic_api_key)
            logger.info("Initialized Anthropic provider")
        
        # Google
        if settings.google_api_key:
            genai.configure(api_key=settings.google_api_key)
            self.providers['google'] = 'initialized'
            logger.info("Initialized Google provider")
        
        # Grok (placeholder - would need actual implementation)
        if settings.grok_api_key:
            self.providers['grok'] = settings.grok_api_key
            logger.info("Initialized Grok provider")
    
    def assess_proficiencies(self, text: str, skills: List[Skill], 
                           context: str = "", provider: str = "openai") -> List[SkillProficiency]:
        """Assess proficiency levels for given skills"""
        
        if provider not in self.providers:
            logger.warning(f"Provider {provider} not initialized, using mock assessment")
            return self._mock_assessment(skills)
        
        # Create prompt
        prompt = self._create_assessment_prompt(text, skills, context)
        
        # Get assessment from LLM
        try:
            if provider == "openai":
                response = self._assess_with_openai(prompt)
            elif provider == "anthropic":
                response = self._assess_with_anthropic(prompt)
            elif provider == "google":
                response = self._assess_with_google(prompt)
            elif provider == "grok":
                response = self._assess_with_grok(prompt)
            elif provider == "kimi":
                response = self._assess_with_kimi(prompt)
            elif provider == "deepseek":
                response = self._assess_with_deepseek(prompt)
            else:
                response = None
            
            if response:
                return self._parse_assessment_response(response, skills)
            else:
                return self._mock_assessment(skills)
                
        except Exception as e:
            logger.error(f"Error in LLM assessment: {e}")
            return self._mock_assessment(skills)
    
    def _create_assessment_prompt(self, text: str, skills: List[Skill], context: str = "") -> str:
        """Create prompt for proficiency assessment"""
        skills_list = "\n".join([f"- {skill.name}: {skill.description or 'No description'}" for skill in skills])
        
        prompt = f"""Analyze the following text and assess proficiency levels for the listed skills.

Text to analyze:
{text}

{'Additional context:\n' + context if context else ''}

Skills to assess:
{skills_list}

Proficiency levels:
- Novice: Less than 6 months experience, basic understanding
- Developing: 6 months to 1 year, can work with guidance
- Intermediate: 1-3 years experience, works independently
- Advanced: 3-5 years experience, deep expertise
- Expert: 5+ years, thought leader, teaches others

For each skill, provide:
1. Proficiency level
2. Confidence score (0.0 to 1.0)
3. Evidence from the text
4. Reasoning for the assessment

Return as JSON array with format:
[
  {{
    "skill_name": "skill name",
    "proficiency_level": "level",
    "confidence_score": 0.0-1.0,
    "evidence": ["evidence 1", "evidence 2"],
    "reasoning": "explanation",
    "years_experience": estimated years or null
  }}
]"""
        
        return prompt
    
    def call_llm(self, prompt: str, provider: str = "openai") -> str:
        """Generic method to call any LLM provider with a prompt"""
        try:
            if provider == "openai":
                return self._assess_with_openai(prompt)
            elif provider == "anthropic":
                return self._assess_with_anthropic(prompt)
            elif provider == "google":
                return self._assess_with_google(prompt)
            elif provider == "grok":
                return self._assess_with_grok(prompt)
            elif provider == "kimi":
                return self._assess_with_kimi(prompt)
            elif provider == "deepseek":
                return self._assess_with_deepseek(prompt)
            else:
                logger.error(f"Unknown provider: {provider}")
                return json.dumps({"error": f"Unknown provider: {provider}"})
        except Exception as e:
            logger.error(f"Error calling {provider}: {e}")
            return json.dumps({"error": str(e)})
    
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

    def _assess_with_openai(self, prompt: str) -> str:
        """Get assessment from OpenAI"""
        # Use instance-level API key if available, otherwise fall back to settings
        api_key = self.openai_api_key or settings.openai_api_key
        if not api_key:
            raise ValueError("OpenAI API key not configured")
        
        client = openai.OpenAI(api_key=api_key)
        
        # Build request parameters
        request_params = {
            "model": settings.default_model,
            "messages": [
                {"role": "system", "content": "You are an expert at assessing technical skills and proficiency levels. Always respond with valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7
        }
        
        # Only add response_format if the model supports it
        if self._supports_json_format(settings.default_model):
            request_params["response_format"] = {"type": "json_object"}
        
        response = client.chat.completions.create(**request_params)
        
        return response.choices[0].message.content
    
    def _assess_with_anthropic(self, prompt: str) -> str:
        """Get assessment from Anthropic"""
        # Use instance-level API key if available
        api_key = self.anthropic_api_key or settings.anthropic_api_key
        if not api_key:
            raise ValueError("Anthropic API key not configured")
        
        client = Anthropic(api_key=api_key)
        
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        return response.content[0].text
    
    def _assess_with_google(self, prompt: str) -> str:
        """Get assessment from Google Gemini"""
        # Use instance-level API key if available
        api_key = self.google_api_key or settings.google_api_key
        if not api_key:
            raise ValueError("Google API key not configured")
        
        genai.configure(api_key=api_key)
        
        # Try different model names in order of preference
        # Gemini 2.5 Pro is now the default, with Flash as backup
        model_names = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.0-pro', 'gemini-pro']
        model = None
        
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                logger.info(f"Using Google model: {model_name}")
                break
            except Exception as e:
                logger.debug(f"Model {model_name} not available: {e}")
                continue
        
        if not model:
            # Fall back to default
            model = genai.GenerativeModel('gemini-pro')
            
        response = model.generate_content(prompt)
        return response.text
    
    def _assess_with_grok(self, prompt: str) -> str:
        """Get assessment from Grok (placeholder)"""
        # This would be the actual Grok API implementation
        logger.warning("Grok provider not fully implemented")
        return None
    
    def _assess_with_kimi(self, prompt: str) -> str:
        """Get assessment from Kimi (Moonshot)"""
        # Use instance-level API key if available
        api_key = self.kimi_api_key or getattr(settings, 'kimi_api_key', None)
        if not api_key:
            raise ValueError("Kimi API key not configured")
        
        import openai
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.moonshot.cn/v1"
        )
        
        response = client.chat.completions.create(
            model="moonshot-v1-8k",
            messages=[
                {"role": "system", "content": "You are an expert at assessing technical skills and proficiency levels. Always respond with valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    def _assess_with_deepseek(self, prompt: str) -> str:
        """Get assessment from DeepSeek"""
        # Use instance-level API key if available
        api_key = self.deepseek_api_key or getattr(settings, 'deepseek_api_key', None)
        if not api_key:
            raise ValueError("DeepSeek API key not configured")
        
        import openai
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are an expert at assessing technical skills and proficiency levels. Always respond with valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    def _parse_assessment_response(self, response: str, skills: List[Skill]) -> List[SkillProficiency]:
        """Parse LLM response into SkillProficiency objects"""
        try:
            # Extract JSON from response
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                assessments = json.loads(json_match.group(0))
            else:
                assessments = json.loads(response)
            
            # Create skill proficiencies
            proficiencies = []
            skills_by_name = {skill.name.lower(): skill for skill in skills}
            
            for assessment in assessments:
                skill_name = assessment.get("skill_name", "").lower()
                if skill_name not in skills_by_name:
                    continue
                
                skill = skills_by_name[skill_name]
                
                # Parse proficiency level
                level_str = assessment.get("proficiency_level", "Intermediate")
                try:
                    proficiency_level = ProficiencyLevel(level_str)
                except ValueError:
                    proficiency_level = ProficiencyLevel.INTERMEDIATE
                
                proficiency = SkillProficiency(
                    skill=skill,
                    proficiency_level=proficiency_level,
                    confidence_score=float(assessment.get("confidence_score", 0.7)),
                    evidence=assessment.get("evidence", []),
                    reasoning=assessment.get("reasoning", "Based on text analysis"),
                    years_experience=assessment.get("years_experience")
                )
                
                proficiencies.append(proficiency)
            
            return proficiencies
            
        except Exception as e:
            logger.error(f"Error parsing assessment response: {e}")
            return self._mock_assessment(skills)
    
    def _mock_assessment(self, skills: List[Skill]) -> List[SkillProficiency]:
        """Create mock assessment for testing"""
        import random
        
        proficiencies = []
        levels = list(ProficiencyLevel)
        
        for skill in skills:
            level = random.choice(levels)
            confidence = random.uniform(0.6, 0.95)
            
            proficiency = SkillProficiency(
                skill=skill,
                proficiency_level=level,
                confidence_score=confidence,
                evidence=[f"Mentioned {skill.name} in text"],
                reasoning=f"Mock assessment for {skill.name}",
                years_experience=random.uniform(0.5, 10) if level != ProficiencyLevel.BEGINNER else None
            )
            
            proficiencies.append(proficiency)
        
        return proficiencies
    
    def get_provider_status(self) -> Dict[str, bool]:
        """Get status of all providers"""
        return {
            provider: provider in self.providers
            for provider in ["openai", "anthropic", "google", "grok"]
        }

# Global instance
llm_service = LLMService()