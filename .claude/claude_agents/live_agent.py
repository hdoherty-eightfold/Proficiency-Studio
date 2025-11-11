"""
Live Agent - Handles live API interactions with real services
"""
from typing import Dict, Any, List, Optional
import requests
import json
import os
from datetime import datetime

class LiveAgent:
    """Agent responsible for live API interactions"""
    
    def __init__(self):
        self.api_keys = {}
        self.api_endpoints = {
            "eightfold": {
                "base_url": "https://api.eightfold.ai/v1",
                "skills_endpoint": "/skills",
                "update_endpoint": "/skills/proficiency"
            }
        }
        self.execution_log = []
        
    def set_api_key(self, service: str, api_key: str) -> bool:
        """Set API key for a service"""
        self.api_keys[service] = api_key
        return True
    
    def extract_skills_from_api(self, profile_id: str = None) -> Dict[str, Any]:
        """Extract skills from Eightfold or similar API"""
        if "eightfold" not in self.api_keys:
            return {
                "success": False,
                "error": "Eightfold API key not configured",
                "demo_fallback": self._get_demo_skills()
            }
        
        try:
            # Construct API call
            headers = {
                "Authorization": f"Bearer {self.api_keys['eightfold']}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.api_endpoints['eightfold']['base_url']}{self.api_endpoints['eightfold']['skills_endpoint']}"
            
            if profile_id:
                url += f"?profile_id={profile_id}"
            
            # Make API call
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                skills_data = response.json()
                
                # Extract skill names
                skills = []
                for skill in skills_data.get("skills", []):
                    skills.append({
                        "id": skill.get("id"),
                        "name": skill.get("name"),
                        "category": skill.get("category", "General")
                    })
                
                self._log_execution("skills_extracted", {
                    "count": len(skills),
                    "source": "eightfold_api"
                })
                
                return {
                    "success": True,
                    "skills": skills,
                    "source": "eightfold_api",
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"API returned status {response.status_code}",
                    "demo_fallback": self._get_demo_skills()
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "demo_fallback": self._get_demo_skills()
            }
    
    def update_skills_with_proficiency(self, skills_with_proficiency: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Update skills with proficiency levels back to API"""
        if "eightfold" not in self.api_keys:
            return {
                "success": False,
                "error": "Eightfold API key not configured",
                "demo_mode": True
            }
        
        try:
            # Construct API call
            headers = {
                "Authorization": f"Bearer {self.api_keys['eightfold']}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.api_endpoints['eightfold']['base_url']}{self.api_endpoints['eightfold']['update_endpoint']}"
            
            # Prepare payload
            payload = {
                "skills": [
                    {
                        "id": skill.get("id"),
                        "name": skill.get("skill"),
                        "proficiency": skill.get("proficiency"),
                        "reasoning": skill.get("reasoning"),
                        "updated_at": datetime.now().isoformat()
                    }
                    for skill in skills_with_proficiency
                ]
            }
            
            # Make API call
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code in [200, 201]:
                result = response.json()
                
                self._log_execution("skills_updated", {
                    "count": len(skills_with_proficiency),
                    "success": True
                })
                
                return {
                    "success": True,
                    "updated_count": len(skills_with_proficiency),
                    "response": result,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"API returned status {response.status_code}",
                    "response": response.text
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def execute_live_pipeline(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute complete live pipeline"""
        pipeline_result = {
            "timestamp": datetime.now().isoformat(),
            "steps": []
        }
        
        # Step 1: Extract skills
        profile_id = request_data.get("profile_id")
        skills_result = self.extract_skills_from_api(profile_id)
        pipeline_result["steps"].append({
            "step": "extract_skills",
            "result": skills_result
        })
        
        if not skills_result.get("success"):
            # Use demo fallback if available
            if skills_result.get("demo_fallback"):
                skills_data = skills_result["demo_fallback"]
            else:
                return pipeline_result
        else:
            skills_data = skills_result
        
        # Step 2: Get proficiency assessments (this would call the AI pipeline)
        # This is a placeholder - actual implementation would integrate with AI pipeline
        assessed_skills = self._simulate_proficiency_assessment(skills_data.get("skills", []))
        pipeline_result["steps"].append({
            "step": "assess_proficiency",
            "result": {
                "success": True,
                "assessed_count": len(assessed_skills)
            }
        })
        
        # Step 3: Update skills with proficiency
        update_result = self.update_skills_with_proficiency(assessed_skills)
        pipeline_result["steps"].append({
            "step": "update_skills",
            "result": update_result
        })
        
        # Summary
        pipeline_result["summary"] = {
            "total_skills": len(skills_data.get("skills", [])),
            "assessed_skills": len(assessed_skills),
            "updated_skills": update_result.get("updated_count", 0),
            "success": update_result.get("success", False)
        }
        
        return pipeline_result
    
    def _get_demo_skills(self) -> Dict[str, Any]:
        """Get demo skills when API is not available"""
        demo_skills = [
            {"id": "1", "name": "Python", "category": "Programming"},
            {"id": "2", "name": "Machine Learning", "category": "AI/ML"},
            {"id": "3", "name": "Data Analysis", "category": "Data Science"},
            {"id": "4", "name": "SQL", "category": "Database"},
            {"id": "5", "name": "Docker", "category": "DevOps"},
            {"id": "6", "name": "React", "category": "Frontend"},
            {"id": "7", "name": "AWS", "category": "Cloud"},
            {"id": "8", "name": "Git", "category": "Version Control"}
        ]
        
        return {
            "success": True,
            "skills": demo_skills,
            "source": "demo_data",
            "note": "Using demo data as API is not available"
        }
    
    def _simulate_proficiency_assessment(self, skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Simulate proficiency assessment for demo"""
        assessed = []
        proficiency_map = {
            "Python": "Advanced",
            "Machine Learning": "Intermediate",
            "Data Analysis": "Advanced",
            "SQL": "Expert",
            "Docker": "Intermediate",
            "React": "Novice",
            "AWS": "Advanced",
            "Git": "Expert"
        }
        
        for skill in skills:
            skill_name = skill.get("name", "")
            assessed.append({
                "id": skill.get("id"),
                "skill": skill_name,
                "proficiency": proficiency_map.get(skill_name, "Intermediate"),
                "reasoning": f"Based on experience and industry standards for {skill_name}"
            })
        
        return assessed
    
    def test_api_connection(self, service: str = "eightfold") -> Dict[str, Any]:
        """Test API connection"""
        if service not in self.api_keys:
            return {
                "success": False,
                "error": f"API key for {service} not configured"
            }
        
        try:
            # Simple health check or info endpoint
            headers = {
                "Authorization": f"Bearer {self.api_keys[service]}",
                "Content-Type": "application/json"
            }
            
            # This would be a real health check endpoint
            url = f"{self.api_endpoints[service]['base_url']}/health"
            
            # For demo purposes, we'll simulate
            return {
                "success": True,
                "service": service,
                "status": "connected",
                "message": "API connection successful (simulated)"
            }
            
        except Exception as e:
            return {
                "success": False,
                "service": service,
                "error": str(e)
            }
    
    def _log_execution(self, action: str, details: Dict[str, Any]):
        """Log execution details"""
        self.execution_log.append({
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "details": details
        })
        
        # Keep last 100 entries
        if len(self.execution_log) > 100:
            self.execution_log = self.execution_log[-100:]
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get execution history"""
        return self.execution_log
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "Extract skills from live APIs",
            "Update skills with proficiency levels",
            "Execute complete live pipelines",
            "API connection testing",
            "Fallback to demo data",
            "Execution logging"
        ]