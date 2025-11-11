"""
Demo Agent - Handles demonstration functionality
"""
from typing import Dict, Any, List
import random

class DemoAgent:
    """Agent responsible for running demonstrations"""
    
    def __init__(self):
        self.demo_skills = [
            "Python", "JavaScript", "React", "Django", "Flask",
            "Machine Learning", "Data Analysis", "SQL", "MongoDB",
            "Docker", "Kubernetes", "AWS", "Git", "CI/CD",
            "REST APIs", "GraphQL", "Microservices", "TDD",
            "Agile", "System Design"
        ]
        
        self.demo_contexts = {
            "senior_developer": """
            Job Description: Senior Full-Stack Developer
            
            Requirements:
            - 5+ years of experience with Python and JavaScript
            - Expert level in React and modern frontend frameworks
            - Advanced knowledge of cloud services (AWS preferred)
            - Strong system design and architecture skills
            - Experience leading development teams
            """,
            "data_scientist": """
            Job Description: Senior Data Scientist
            
            Requirements:
            - Expert in Python for data science (pandas, numpy, scikit-learn)
            - Advanced machine learning and deep learning knowledge
            - Strong SQL skills and experience with big data
            - Experience with cloud ML platforms
            - Ability to communicate complex findings
            """,
            "devops_engineer": """
            Job Description: DevOps Engineer
            
            Requirements:
            - Expert with Docker and Kubernetes
            - Advanced CI/CD pipeline design
            - Strong cloud infrastructure knowledge (AWS/GCP/Azure)
            - Infrastructure as Code experience
            - Monitoring and logging expertise
            """
        }
    
    def get_demo_skills(self, count: int = 10) -> List[str]:
        """Get a random selection of demo skills"""
        return random.sample(self.demo_skills, min(count, len(self.demo_skills)))
    
    def get_demo_context(self, context_type: str = "senior_developer") -> str:
        """Get demo context document"""
        return self.demo_contexts.get(context_type, self.demo_contexts["senior_developer"])
    
    def generate_demo_request(self, demo_type: str = "basic") -> Dict[str, Any]:
        """Generate a complete demo request"""
        if demo_type == "basic":
            return {
                "skills": self.get_demo_skills(8),
                "provider": "openai",
                "method": "direct"
            }
        elif demo_type == "rag_enhanced":
            return {
                "skills": self.get_demo_skills(10),
                "provider": "anthropic",
                "method": "rag",
                "context_documents": [self.get_demo_context("senior_developer")]
            }
        elif demo_type == "comparison":
            skills = self.get_demo_skills(12)
            return {
                "skills": skills,
                "providers": ["openai", "anthropic"],
                "methods": ["direct", "rag"],
                "context_documents": [
                    self.get_demo_context("senior_developer"),
                    self.get_demo_context("data_scientist")
                ]
            }
        else:
            return self.generate_demo_request("basic")
    
    def simulate_api_response(self, skills: List[str], method: str = "direct") -> Dict[str, Any]:
        """Simulate API response for demo purposes"""
        proficiency_distribution = {
            "Novice": 0.10,
            "Developing": 0.20,
            "Intermediate": 0.35,
            "Advanced": 0.25,
            "Expert": 0.10
        }
        
        results = []
        for skill in skills:
            # Assign proficiency based on distribution
            rand = random.random()
            cumulative = 0
            proficiency = "Intermediate"
            
            for level, prob in proficiency_distribution.items():
                cumulative += prob
                if rand <= cumulative:
                    proficiency = level
                    break
            
            # Generate reasoning
            reasoning = self._generate_reasoning(skill, proficiency, method)
            
            results.append({
                "skill": skill,
                "proficiency": proficiency,
                "reasoning": reasoning
            })
        
        return {
            "success": True,
            "method": method,
            "provider": "demo",
            "results": results,
            "context_used": method == "rag"
        }
    
    def _generate_reasoning(self, skill: str, proficiency: str, method: str) -> str:
        """Generate demo reasoning for proficiency assignment"""
        base_reasoning = {
            "Novice": [
                f"Limited practical experience with {skill}",
                f"Basic understanding of {skill} fundamentals",
                f"Requires guidance for {skill} tasks"
            ],
            "Developing": [
                f"Growing competence with {skill}",
                f"Can handle basic {skill} tasks with occasional guidance",
                f"1-2 years of {skill} experience"
            ],
            "Intermediate": [
                f"Solid working knowledge of {skill}",
                f"Can handle standard {skill} tasks independently",
                f"2-3 years of practical {skill} experience"
            ],
            "Advanced": [
                f"Deep expertise in {skill} with complex implementations",
                f"Can architect {skill} solutions",
                f"4-6 years of {skill} experience with leadership"
            ],
            "Expert": [
                f"Master level {skill} knowledge",
                f"Industry recognized {skill} expert",
                f"7+ years including teaching {skill}"
            ]
        }
        
        reasoning = random.choice(base_reasoning.get(proficiency, ["Standard proficiency"]))
        
        if method == "rag":
            reasoning += " Based on job description requirements and industry standards."
        
        return reasoning
    
    def run_full_demo(self) -> Dict[str, Any]:
        """Run a complete demonstration"""
        demo_steps = []
        
        # Step 1: Basic assessment
        basic_request = self.generate_demo_request("basic")
        basic_result = self.simulate_api_response(basic_request["skills"], "direct")
        demo_steps.append({
            "step": "Basic Assessment",
            "request": basic_request,
            "result": basic_result
        })
        
        # Step 2: RAG-enhanced assessment
        rag_request = self.generate_demo_request("rag_enhanced")
        rag_result = self.simulate_api_response(rag_request["skills"], "rag")
        demo_steps.append({
            "step": "RAG-Enhanced Assessment",
            "request": rag_request,
            "result": rag_result
        })
        
        # Step 3: Comparison
        comparison = self._generate_comparison(basic_result, rag_result)
        demo_steps.append({
            "step": "Method Comparison",
            "comparison": comparison
        })
        
        return {
            "demo_type": "full",
            "timestamp": "2024-01-20T10:00:00",
            "steps": demo_steps,
            "summary": self._generate_demo_summary(demo_steps)
        }
    
    def _generate_comparison(self, direct_result: Dict, rag_result: Dict) -> Dict[str, Any]:
        """Generate demo comparison between methods"""
        # Find common skills
        direct_skills = {r["skill"]: r for r in direct_result.get("results", [])}
        rag_skills = {r["skill"]: r for r in rag_result.get("results", [])}
        
        common_skills = set(direct_skills.keys()) & set(rag_skills.keys())
        
        differences = []
        agreements = 0
        
        for skill in common_skills:
            if direct_skills[skill]["proficiency"] == rag_skills[skill]["proficiency"]:
                agreements += 1
            else:
                differences.append({
                    "skill": skill,
                    "direct": direct_skills[skill]["proficiency"],
                    "rag": rag_skills[skill]["proficiency"]
                })
        
        return {
            "total_skills": len(common_skills),
            "agreements": agreements,
            "differences": len(differences),
            "agreement_percentage": (agreements / len(common_skills) * 100) if common_skills else 0,
            "difference_details": differences[:3]  # Show first 3 differences
        }
    
    def _generate_demo_summary(self, steps: List[Dict]) -> Dict[str, Any]:
        """Generate summary of demo execution"""
        return {
            "total_steps": len(steps),
            "methods_demonstrated": ["direct", "rag_enhanced", "comparison"],
            "key_findings": [
                "RAG-enhanced method provides more contextual reasoning",
                "Direct method is faster but may lack context",
                "Agreement rate between methods: ~75-85%"
            ],
            "recommendation": "Use RAG-enhanced for critical assessments, direct for quick evaluations"
        }
    
    def get_demo_scenarios(self) -> List[Dict[str, str]]:
        """Get available demo scenarios"""
        return [
            {
                "id": "basic",
                "name": "Basic Skills Assessment",
                "description": "Simple demonstration of direct proficiency assessment"
            },
            {
                "id": "rag_enhanced",
                "name": "RAG-Enhanced Assessment",
                "description": "Demonstration with context documents"
            },
            {
                "id": "comparison",
                "name": "Method Comparison",
                "description": "Compare direct vs RAG approaches"
            },
            {
                "id": "full",
                "name": "Full Demonstration",
                "description": "Complete walkthrough of all features"
            }
        ]
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "Generate demo skill sets",
            "Simulate API responses",
            "Create context documents",
            "Run full demonstrations",
            "Compare assessment methods"
        ]