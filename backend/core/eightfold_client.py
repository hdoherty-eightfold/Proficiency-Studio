"""
Eightfold API client adapted from ProfFromSkillsRagPl
"""
import os
import requests
from typing import List, Dict, Any, Optional
from core.models import Skill, SkillProficiency
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

class EightfoldClient:
    """Client for interacting with Eightfold API"""
    
    def __init__(self):
        self.base_url = settings.eightfold_api_url
        self.session = requests.Session()
        self.auth_token = None  # Don't use settings token
        
        # Initialize authentication
        if settings.eightfold_username and settings.eightfold_password:
            self._authenticate()
    
    def _authenticate(self) -> bool:
        """Authenticate with Eightfold API using settings credentials"""
        if settings.eightfold_username and settings.eightfold_password:
            return self.authenticate(settings.eightfold_username, settings.eightfold_password)
        return False
    
    def authenticate(self, username: str, password: str) -> bool:
        """Authenticate with Eightfold API"""
        # ALL users use OAuth authentication, including __EF_api_key__ users
        # The __EF_api_key__ prefix is just part of the username convention
        
        # Use OAuth endpoint for regular authentication
        auth_url = f"{self.base_url}/oauth/v1/authenticate"
        logger.info(f"Attempting OAuth authentication at: {auth_url}")
        logger.info(f"Username: {username}")
        
        # Pre-auth value for Basic auth header
        PRE_AUTH_VALUE = "MU92YTg4T1JyMlFBVktEZG8wc1dycTdEOnBOY1NoMno1RlFBMTZ6V2QwN3cyeUFvc3QwTU05MmZmaXFFRDM4ZzJ4SFVyMGRDaw=="
        
        headers = {
            "Authorization": f"Basic {PRE_AUTH_VALUE}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        payload = {
            "grant_type": "password",
            "username": username,
            "password": password
        }
        
        try:
            response = self.session.post(
                auth_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            logger.info(f"Auth response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Token can be in different locations depending on the response
                # Try direct access_token first (most common)
                self.auth_token = data.get("access_token")
                
                # If not found, try in data.access_token structure
                if not self.auth_token:
                    token_data = data.get("data", {})
                    self.auth_token = token_data.get("access_token")
                
                # Also try bearer_token as alternative name
                if not self.auth_token:
                    self.auth_token = data.get("bearer_token")
                
                if self.auth_token:
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.auth_token}"
                    })
                    logger.info(f"Successfully authenticated with Eightfold API")
                    logger.info(f"Token received (first 10 chars): {self.auth_token[:10]}...")
                    return True
                else:
                    logger.error("No token found in authentication response")
                    logger.error(f"Response structure: {data}")
                    return False
            else:
                logger.error(f"Authentication failed: {response.status_code}")
                logger.error(f"Response: {response.text[:200]}...")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during authentication: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected authentication error: {e}")
            return False
    
    def get_skills(self, page: int = 1, limit: int = 100) -> Dict[str, Any]:
        """Fetch skills from Eightfold API and return detailed info"""
        if not self.auth_token:
            logger.error("No auth token available - authentication required")
            return {
                "skills": [],
                "source": "error",
                "endpoint": "N/A - Not Authenticated",
                "status_code": 401,
                "api_response": {"error": "Authentication required. Please authenticate with Eightfold API first."}
            }
        
        # Try different endpoints to get skills data
        # Based on Eightfold API docs: https://apidocs.eightfold.ai/reference
        endpoints_to_try = [
            # Primary JIE roles endpoint - returns roles with skills
            f"{self.base_url}/api/v2/JIE/roles",
            # Positions endpoint may have skills in job descriptions
            f"{self.base_url}/api/v2/core/positions",
            # Try v1 version of JIE roles
            f"{self.base_url}/api/v1/JIE/roles",
            # CareerHub skills suggestions endpoint
            f"{self.base_url}/api/v2/careerhub/skills/suggestions",
        ]
        
        for url in endpoints_to_try:
            logger.info(f"Attempting to fetch skills from: {url}")
            logger.info(f"Auth token (first 10 chars): {self.auth_token[:10]}..." if self.auth_token else "No token")
            
            try:
                response = self.session.get(
                    url,
                    params={"limit": min(limit, 10)},  # Start with a small limit
                    headers={"Authorization": f"Bearer {self.auth_token}"}
                )
                
                logger.info(f"Response status code: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Better logging for debugging
                    if isinstance(data, dict):
                        logger.info(f"Response is dict with keys: {list(data.keys())[:10]}")  # First 10 keys
                    elif isinstance(data, list):
                        logger.info(f"Response is list with {len(data)} items")
                        if len(data) > 0 and isinstance(data[0], dict):
                            logger.info(f"First item keys: {list(data[0].keys())[:10]}")
                    else:
                        logger.info(f"Response type: {type(data)}")
                    
                    # Log sample for debugging
                    logger.debug(f"Response sample (first 500 chars): {str(data)[:500]}")
                    
                    # Try to extract skills from different response formats
                    skills_data = []
                    
                    # Special handling for JIE roles endpoint
                    if "/JIE/roles" in url:
                        logger.info(f"Processing JIE roles response")
                        logger.info(f"Response type: {type(data)}, sample: {str(data)[:200]}")
                        
                        # JIE roles endpoint returns a list of roles
                        if isinstance(data, list):
                            logger.info(f"Direct list with {len(data)} items")
                            # Direct array of roles
                            for i, role in enumerate(data[:3]):  # Check first 3 roles
                                if isinstance(role, dict):
                                    logger.info(f"Role {i} keys: {list(role.keys())}")
                                    # Extract skills from role
                                    if "skills" in role:
                                        skills_data.extend(role.get("skills", []))
                                    if "required_skills" in role:
                                        skills_data.extend(role.get("required_skills", []))
                                    if "preferred_skills" in role:
                                        skills_data.extend(role.get("preferred_skills", []))
                                    # Some roles might have skill names directly
                                    if "skill_names" in role:
                                        for skill_name in role.get("skill_names", []):
                                            skills_data.append({"name": skill_name})
                        elif "data" in data and isinstance(data["data"], list):
                            logger.info(f"Found data array with {len(data['data'])} roles")
                            # JIE roles are wrapped in data object
                            for role in data["data"]:
                                # The actual field is skillProficiencies
                                if "skillProficiencies" in role:
                                    skill_profs = role.get("skillProficiencies", [])
                                    logger.info(f"Found {len(skill_profs)} skills in role: {role.get('title', 'Unknown')}")
                                    # Each skill proficiency has a 'name' field
                                    for skill_prof in skill_profs:
                                        if isinstance(skill_prof, dict) and "name" in skill_prof:
                                            skills_data.append({
                                                "name": skill_prof["name"],
                                                "proficiency": skill_prof.get("proficiency"),
                                                "level": skill_prof.get("level"),
                                                "skill_groups": skill_prof.get("skillGroupList", [])
                                            })
                                # Also check other possible fields
                                if "skills" in role:
                                    skills_data.extend(role.get("skills", []))
                                if "required_skills" in role:
                                    skills_data.extend(role.get("required_skills", []))
                                if "preferred_skills" in role:
                                    skills_data.extend(role.get("preferred_skills", []))
                        elif "roles" in data and isinstance(data["roles"], list):
                            # Wrapped in roles object
                            for role in data["roles"]:
                                if "skills" in role:
                                    skills_data.extend(role.get("skills", []))
                    # Check for direct skills array
                    elif "skills" in data:
                        skills_data = data.get("skills", [])
                    # Check for data array (common in v2 API)
                    elif "data" in data and isinstance(data["data"], list):
                        # For positions endpoint, extract skills from positions
                        if "positions" in url:
                            for item in data["data"]:
                                # Look for skills in various places within the item
                                if "skills" in item:
                                    if isinstance(item["skills"], list):
                                        skills_data.extend(item["skills"])
                                elif "required_skills" in item:
                                    if isinstance(item["required_skills"], list):
                                        skills_data.extend(item["required_skills"])
                                elif "preferred_skills" in item:
                                    if isinstance(item["preferred_skills"], list):
                                        skills_data.extend(item["preferred_skills"])
                        else:
                            skills_data = data["data"]
                    # Check for results array
                    elif "results" in data:
                        skills_data = data.get("results", [])
                    # For suggest-skills endpoints, check for suggestions
                    elif "suggestions" in data:
                        skills_data = data.get("suggestions", [])
                    
                    if skills_data:
                        logger.info(f"Successfully fetched {len(skills_data)} skills from {url}")
                        
                        # Convert to Skill objects
                        skills = []
                        seen_names = set()  # Track unique skill names
                        for item in skills_data:
                            # Handle different skill data formats
                            if isinstance(item, str):
                                # Simple string skill name
                                name = item
                            else:
                                # Dict with skill data
                                name = item.get("name", item.get("skill_name", item.get("title", "")))
                            
                            # Skip duplicates
                            if name and name not in seen_names:
                                seen_names.add(name)
                                skill = Skill(
                                    id=str(item.get("id", "")) if isinstance(item, dict) else "",
                                    name=name,
                                    description=item.get("description", "") if isinstance(item, dict) else "",
                                    keywords=item.get("keywords", item.get("tags", [])) if isinstance(item, dict) else [],
                                    external_id=item.get("external_id", "") if isinstance(item, dict) else "",
                                    category=item.get("category", item.get("skill_category", "")) if isinstance(item, dict) else ""
                                )
                                skills.append(skill)
                        
                        if skills:
                            return {
                                "skills": skills,
                                "source": "eightfold_api",
                                "endpoint": url,
                                "status_code": response.status_code,
                                "api_response": {
                                    "total_found": len(skills_data),
                                    "returned": len(skills),
                                    "response_keys": list(data.keys()),
                                    "data_structure": "skills extracted from API response"
                                }
                            }
                        
                    logger.info(f"No skills found in response from {url}, trying next endpoint...")
                    
                elif response.status_code == 404:
                    logger.info(f"Endpoint not found: {url}")
                    continue
                elif response.status_code == 403:
                    logger.warning(f"Access forbidden for {url} - may require different permissions")
                    continue
                elif response.status_code == 401:
                    logger.warning(f"Unauthorized access to {url} - token may be invalid")
                    continue
                else:
                    logger.error(f"Failed to fetch from {url}: {response.status_code}")
                    logger.error(f"Response text: {response.text[:200]}...")
                    # For debugging, let's see what's in the response
                    try:
                        if response.headers.get('content-type', '').startswith('application/json'):
                            error_data = response.json()
                            logger.error(f"Error details: {error_data}")
                    except:
                        pass
                    continue
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error fetching skills from {url}: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error fetching skills from {url}: {e}")
                continue
        
        # If we get here, none of the endpoints worked - return error
        logger.error("Could not fetch skills from any endpoint")
        return {
            "skills": [],
            "source": "error",
            "endpoint": "All API endpoints failed",
            "status_code": 404,
            "api_response": {
                "error": "Could not fetch skills from any Eightfold API endpoint",
                "tried_endpoints": endpoints_to_try
            }
        }
    
    def search_skills(self, query: str) -> List[Skill]:
        """Search for skills by query"""
        if not self.auth_token:
            logger.error("No auth token - authentication required")
            return []
        
        try:
            response = self.session.get(
                f"{self.base_url}/skills/search",
                params={"q": query},
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                skills_data = response.json().get("skills", [])
                return [
                    Skill(
                        id=skill.get("id"),
                        name=skill.get("name"),
                        description=skill.get("description"),
                        keywords=skill.get("keywords", []),
                        external_id=skill.get("external_id"),
                        category=skill.get("category")
                    )
                    for skill in skills_data
                ]
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error searching skills: {e}")
            return []
    
    def update_skill_proficiencies(self, proficiencies: List[SkillProficiency]) -> Dict[str, Any]:
        """Update skill proficiencies back to Eightfold"""
        if not self.auth_token:
            logger.warning("No auth token, simulating update")
            return {
                "success": True,
                "updated": len(proficiencies),
                "message": "Simulated update (no auth token)"
            }
        
        try:
            payload = {
                "proficiencies": [p.to_api_format() for p in proficiencies]
            }
            
            response = self.session.post(
                f"{self.base_url}/skills/proficiencies",
                json=payload,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "updated": len(proficiencies),
                    "response": response.json()
                }
            else:
                return {
                    "success": False,
                    "error": f"API returned {response.status_code}",
                    "message": response.text
                }
                
        except Exception as e:
            logger.error(f"Error updating proficiencies: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
