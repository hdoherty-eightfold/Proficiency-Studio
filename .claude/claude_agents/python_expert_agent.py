"""
Python Expert Agent - Python and AI best practices
"""
from typing import Dict, Any, List
import json

class PythonExpertAgent:
    """Agent with expertise in Python and AI best practices"""
    
    def __init__(self):
        self.best_practices = self._initialize_best_practices()
        
    def _initialize_best_practices(self) -> Dict[str, List[str]]:
        """Initialize Python and AI best practices"""
        return {
            "code_quality": [
                "Use type hints for better code clarity",
                "Follow PEP 8 style guidelines",
                "Write comprehensive docstrings",
                "Implement proper error handling",
                "Use context managers for resource management"
            ],
            "ai_pipeline": [
                "Validate input data before processing",
                "Implement retry logic for API calls",
                "Cache embeddings to reduce costs",
                "Use batch processing when possible",
                "Monitor token usage and costs"
            ],
            "performance": [
                "Use async/await for I/O operations",
                "Implement connection pooling",
                "Cache frequently accessed data",
                "Optimize vector similarity searches",
                "Profile code to identify bottlenecks"
            ],
            "security": [
                "Never hardcode API keys",
                "Use environment variables for secrets",
                "Implement rate limiting",
                "Validate and sanitize all inputs",
                "Use HTTPS for all API calls"
            ]
        }
    
    def execute_barebones(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute barebones Python implementation without frameworks"""
        skills = data.get("skills", [])
        provider = data.get("provider", "openai")
        api_key = data.get("api_key")
        
        try:
            # Direct API call without frameworks
            if provider == "openai":
                result = self._barebones_openai(skills, api_key)
            elif provider == "anthropic":
                result = self._barebones_anthropic(skills, api_key)
            else:
                result = self._barebones_mock(skills)
            
            return {
                "success": True,
                "method": "barebones",
                "provider": provider,
                "results": result,
                "implementation": "Pure Python with requests library"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "method": "barebones"
            }
    
    def _barebones_openai(self, skills: List[str], api_key: str) -> List[Dict[str, str]]:
        """Barebones OpenAI implementation"""
        import requests
        
        if not api_key:
            return self._barebones_mock(skills)
        
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""Assign proficiency levels to these skills:
{', '.join(skills)}

Levels: Novice, Developing, Intermediate, Advanced, Expert

For each skill, provide:
Skill: [name] | Proficiency: [level] | Reasoning: [brief explanation]"""
        
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"]
                return self._parse_barebones_response(content, skills)
            else:
                return self._barebones_mock(skills)
        except:
            return self._barebones_mock(skills)
    
    def _barebones_anthropic(self, skills: List[str], api_key: str) -> List[Dict[str, str]]:
        """Barebones Anthropic implementation"""
        import requests
        
        if not api_key:
            return self._barebones_mock(skills)
        
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        prompt = f"""Assign proficiency levels to these skills:
{', '.join(skills)}

Levels: Novice, Developing, Intermediate, Advanced, Expert

For each skill, provide:
Skill: [name] | Proficiency: [level] | Reasoning: [brief explanation]"""
        
        payload = {
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 1000,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                content = response.json()["content"][0]["text"]
                return self._parse_barebones_response(content, skills)
            else:
                return self._barebones_mock(skills)
        except:
            return self._barebones_mock(skills)
    
    def _barebones_mock(self, skills: List[str]) -> List[Dict[str, str]]:
        """Mock implementation for barebones demo"""
        import random
        
        proficiency_levels = ["Novice", "Developing", "Intermediate", "Advanced", "Expert"]
        results = []
        
        for skill in skills:
            level = random.choice(proficiency_levels)
            reasoning = f"Based on general assessment criteria for {skill}"
            
            results.append({
                "skill": skill,
                "proficiency": level,
                "reasoning": reasoning
            })
        
        return results
    
    def _parse_barebones_response(self, response: str, skills: List[str]) -> List[Dict[str, str]]:
        """Parse response from barebones implementation"""
        results = []
        
        for skill in skills:
            # Simple parsing logic
            skill_found = False
            for line in response.split('\n'):
                if skill.lower() in line.lower():
                    # Extract proficiency and reasoning
                    parts = line.split('|')
                    proficiency = "Intermediate"  # Default
                    reasoning = f"Assessment for {skill}"
                    
                    for part in parts:
                        if 'proficiency:' in part.lower():
                            prof_text = part.split(':')[-1].strip()
                            if prof_text in ["Novice", "Developing", "Intermediate", "Advanced", "Expert"]:
                                proficiency = prof_text
                        elif 'reasoning:' in part.lower():
                            reasoning = part.split(':')[-1].strip()
                    
                    results.append({
                        "skill": skill,
                        "proficiency": proficiency,
                        "reasoning": reasoning
                    })
                    skill_found = True
                    break
            
            if not skill_found:
                results.append({
                    "skill": skill,
                    "proficiency": "Intermediate",
                    "reasoning": "Default assessment"
                })
        
        return results
    
    def review_implementation(self, code_type: str) -> Dict[str, Any]:
        """Review implementation and provide best practices"""
        reviews = {
            "direct_pipeline": {
                "strengths": [
                    "Simple and straightforward",
                    "Lower latency",
                    "Cost-effective"
                ],
                "improvements": [
                    "Add input validation",
                    "Implement retry logic",
                    "Cache common responses",
                    "Add logging for debugging"
                ],
                "best_practices": self.best_practices["ai_pipeline"]
            },
            "rag_pipeline": {
                "strengths": [
                    "Context-aware assessments",
                    "More accurate results",
                    "Customizable with domain knowledge"
                ],
                "improvements": [
                    "Optimize chunk size for better retrieval",
                    "Implement semantic caching",
                    "Use hybrid search (keyword + semantic)",
                    "Monitor embedding costs"
                ],
                "best_practices": self.best_practices["ai_pipeline"] + [
                    "Regularly update context documents",
                    "Use appropriate embedding models",
                    "Implement relevance scoring"
                ]
            },
            "barebones": {
                "strengths": [
                    "Minimal dependencies",
                    "Easy to understand",
                    "Direct control over API calls"
                ],
                "improvements": [
                    "Add proper error handling",
                    "Implement timeout handling",
                    "Add response validation",
                    "Consider connection pooling"
                ],
                "best_practices": self.best_practices["code_quality"]
            }
        }
        
        return reviews.get(code_type, {"error": "Unknown implementation type"})
    
    def optimize_code(self, code_snippet: str) -> Dict[str, Any]:
        """Provide optimization suggestions for code"""
        suggestions = []
        
        # Check for common issues
        if "api_key" in code_snippet and "=" in code_snippet:
            suggestions.append({
                "issue": "Potential hardcoded API key",
                "suggestion": "Use environment variables: os.getenv('API_KEY')",
                "severity": "high"
            })
        
        if "requests." in code_snippet and "timeout" not in code_snippet:
            suggestions.append({
                "issue": "Missing timeout in requests",
                "suggestion": "Add timeout parameter: requests.get(url, timeout=30)",
                "severity": "medium"
            })
        
        if "try:" not in code_snippet and "requests." in code_snippet:
            suggestions.append({
                "issue": "Missing error handling for API calls",
                "suggestion": "Wrap API calls in try-except blocks",
                "severity": "high"
            })
        
        if "async def" in code_snippet:
            suggestions.append({
                "issue": "Using async functions",
                "suggestion": "Ensure proper await usage and consider asyncio.gather for parallel calls",
                "severity": "info"
            })
        
        return {
            "suggestions": suggestions,
            "general_tips": self.best_practices["performance"]
        }
    
    def generate_implementation_comparison(self) -> Dict[str, Any]:
        """Generate comparison of all three implementation approaches"""
        return {
            "comparison": {
                "direct": {
                    "complexity": "Medium",
                    "dependencies": ["langchain", "llm providers"],
                    "performance": "Good",
                    "accuracy": "Good",
                    "cost": "Low",
                    "use_case": "Quick assessments, prototyping"
                },
                "rag_enhanced": {
                    "complexity": "High",
                    "dependencies": ["langchain", "vector db", "embeddings"],
                    "performance": "Moderate",
                    "accuracy": "Excellent",
                    "cost": "Medium",
                    "use_case": "Production systems, accuracy-critical"
                },
                "barebones": {
                    "complexity": "Low",
                    "dependencies": ["requests only"],
                    "performance": "Excellent",
                    "accuracy": "Good",
                    "cost": "Low",
                    "use_case": "Minimal systems, learning, debugging"
                }
            },
            "recommendation": "Use RAG for production, direct for development, barebones for understanding"
        }
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "Execute barebones Python implementation",
            "Provide Python best practices",
            "Review code implementations",
            "Optimize code snippets",
            "Compare implementation approaches",
            "AI/ML best practices guidance"
        ]