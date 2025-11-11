"""
Knowledge Agent - Understands the project requirements and architecture
"""
from typing import Dict, Any, List

class KnowledgeAgent:
    """Agent that maintains knowledge about the project structure and requirements"""
    
    def __init__(self):
        self.project_knowledge = self._initialize_knowledge()
        
    def _initialize_knowledge(self) -> Dict[str, Any]:
        """Initialize project knowledge base"""
        return {
            "project_goal": "Skills proficiency assessment system with direct and RAG-enhanced pipelines",
            "core_components": {
                "skill_extraction": {
                    "description": "Pull skills from API (Eightfold or similar)",
                    "apis": ["Eightfold Skills API"],
                    "output": "List of skills without proficiencies"
                },
                "proficiency_assignment": {
                    "description": "Use LLM to assign appropriate proficiency levels",
                    "levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
                    "reasoning": "LLM provides reasoning for each proficiency choice"
                },
                "rag_enhancement": {
                    "description": "Optional document context for better proficiency assignment",
                    "components": ["Vector database (ChromaDB/PyTorch)", "Document embedding", "Context retrieval"],
                    "benefit": "More accurate proficiency assignment with domain context"
                },
                "api_writeback": {
                    "description": "Send skills with proficiencies back to API",
                    "format": "Skills + proficiency levels + reasoning"
                }
            },
            "supported_models": {
                "openai": {"models": ["gpt-4", "gpt-3.5-turbo"], "api_key_required": True},
                "anthropic": {"models": ["claude-3-opus", "claude-3-sonnet"], "api_key_required": True},
                "google": {"models": ["gemini-pro"], "api_key_required": True},
                "grok": {"models": ["grok-1"], "api_key_required": True}
            },
            "pipelines": {
                "direct": {
                    "steps": ["Extract skills", "Prompt LLM for proficiencies", "Return with reasoning"],
                    "components": ["LangChain", "LLM API", "Prompt templates"]
                },
                "rag_enhanced": {
                    "steps": ["Extract skills", "Load context docs", "Embed and retrieve", "Enhanced LLM prompt", "Return with reasoning"],
                    "components": ["LangChain", "Vector DB", "Embeddings", "LLM API"]
                },
                "barebones": {
                    "steps": ["Simple API calls", "Basic LLM prompt", "Minimal dependencies"],
                    "components": ["Requests library", "Direct API calls", "No frameworks"]
                }
            },
            "evaluation_criteria": {
                "accuracy": "How well proficiencies match expected levels",
                "reasoning_quality": "Quality of explanations for choices",
                "consistency": "Consistent proficiency assignments across similar skills",
                "performance": "Speed and resource usage",
                "cost": "API call costs"
            },
            "ui_requirements": {
                "features": [
                    "Model switching (OpenAI, Claude, Gemini, Grok)",
                    "API key management and storage",
                    "Side-by-side comparison of methods",
                    "Reasoning display for each proficiency",
                    "Performance metrics",
                    "Demo and live modes"
                ],
                "technology": "Flask web framework"
            }
        }
    
    def get_pipeline_info(self, pipeline_type: str) -> Dict[str, Any]:
        """Get detailed information about a specific pipeline"""
        return self.project_knowledge["pipelines"].get(pipeline_type, {})
    
    def get_model_info(self, provider: str) -> Dict[str, Any]:
        """Get information about a model provider"""
        return self.project_knowledge["supported_models"].get(provider, {})
    
    def get_evaluation_criteria(self) -> Dict[str, str]:
        """Get evaluation criteria for comparing approaches"""
        return self.project_knowledge["evaluation_criteria"]
    
    def get_proficiency_levels(self) -> List[str]:
        """Get available proficiency levels"""
        return self.project_knowledge["core_components"]["proficiency_assignment"]["levels"]
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "Project architecture knowledge",
            "Pipeline specifications",
            "Model provider information",
            "Evaluation criteria",
            "UI requirements"
        ]
    
    def provide_context_for_task(self, task_type: str) -> Dict[str, Any]:
        """Provide relevant context for a specific task"""
        context_map = {
            "skill_extraction": {
                "apis": self.project_knowledge["core_components"]["skill_extraction"]["apis"],
                "expected_format": "List of skill names/IDs"
            },
            "proficiency_assignment": {
                "levels": self.get_proficiency_levels(),
                "require_reasoning": True,
                "output_format": {"skill": "name", "proficiency": "proficiency_level", "reasoning": "explanation"}
            },
            "rag_setup": {
                "vector_stores": ["ChromaDB", "PyTorch embeddings"],
                "embedding_models": ["sentence-transformers", "OpenAI embeddings"],
                "retrieval_method": "Semantic similarity search"
            },
            "comparison": {
                "criteria": self.get_evaluation_criteria(),
                "methods": ["direct", "rag_enhanced", "barebones"],
                "metrics_to_track": ["accuracy", "speed", "cost", "reasoning_quality"]
            }
        }
        return context_map.get(task_type, {})
    
    def validate_implementation(self, implementation_type: str, components: List[str]) -> Dict[str, Any]:
        """Validate if an implementation has all required components"""
        required = self.project_knowledge["pipelines"].get(implementation_type, {}).get("components", [])
        missing = [comp for comp in required if comp not in components]
        
        return {
            "valid": len(missing) == 0,
            "missing_components": missing,
            "recommendation": f"Add these components: {', '.join(missing)}" if missing else "Implementation complete"
        }
    
    def get_prompt_template(self, task: str) -> str:
        """Get prompt template for specific tasks"""
        templates = {
            "proficiency_assignment": """Given these skills, assign appropriate proficiency levels.

Skills: {skills}

Proficiency levels: Novice, Developing, Intermediate, Advanced, Expert

For each skill:
1. Assign the most appropriate proficiency level
2. Provide clear reasoning for your choice
3. Consider industry standards and typical progression

Return in format:
- Skill: [name] | Proficiency: [level] | Reasoning: [explanation]""",
            
            "rag_proficiency_assignment": """Using the provided context documents, assign proficiency levels to these skills.

Context:
{context}

Skills: {skills}

Proficiency levels: Novice, Developing, Intermediate, Advanced, Expert

For each skill:
1. Reference the context to inform your decision
2. Assign the most appropriate proficiency level
3. Explain how the context influenced your choice

Return in format:
- Skill: [name] | Proficiency: [level] | Reasoning: [explanation with context reference]"""
        }
        
        return templates.get(task, "No template available for this task")