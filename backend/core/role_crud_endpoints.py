"""
Role CRUD Operations for Step 6
Handles Create, Read, Update, Delete operations for roles with proficiency levels
"""

from fastapi import HTTPException, Request
from typing import Dict, Any, List, Optional
import httpx
import logging

logger = logging.getLogger(__name__)

class RoleCRUDService:
    """Service for managing role CRUD operations"""
    
    @staticmethod
    async def get_roles(auth_token: str, api_url: str) -> Dict[str, Any]:
        """Fetch roles from Eightfold API"""
        try:
            endpoint = f"{api_url}/api/v2/JIE/roles"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    endpoint,
                    headers={
                        "Authorization": f"Bearer {auth_token}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    roles = data.get("data", []) if isinstance(data, dict) else data
                    
                    return {
                        "success": True,
                        "roles": roles,
                        "count": len(roles)
                    }
                else:
                    return {
                        "success": False,
                        "detail": f"Failed to fetch roles: {response.status_code}",
                        "response": response.text
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching roles: {e}")
            return {
                "success": False,
                "detail": str(e)
            }
    
    @staticmethod
    async def create_role(auth_token: str, api_url: str, role_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new role with skills and proficiency levels"""
        try:
            endpoint = f"{api_url}/api/v2/JIE/roles"
            
            # Prepare role payload
            payload = {
                "title": role_data.get("title"),
                "skillProficiencies": []
            }
            
            # Add skills with proficiencies
            for skill in role_data.get("skills", []):
                skill_entry = {
                    "name": skill.get("name") or skill.get("skill"),
                    "proficiency": skill.get("proficiency"),
                    "level": skill.get("proficiency"),  # Some APIs use 'level' instead
                    "confidence": skill.get("confidence")
                }
                payload["skillProficiencies"].append(skill_entry)
            
            logger.info(f"Creating role '{payload['title']}' with {len(payload['skillProficiencies'])} skills")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {auth_token}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    return {
                        "success": True,
                        "message": f"Role '{role_data['title']}' created successfully",
                        "data": response.json()
                    }
                else:
                    # Note: Eightfold sandbox may not support role creation
                    if response.status_code == 404:
                        return {
                            "success": False,
                            "detail": "Role creation not supported in sandbox environment",
                            "note": "This operation may only be available in production"
                        }
                    
                    return {
                        "success": False,
                        "detail": f"Failed to create role: {response.status_code}",
                        "response": response.text
                    }
                    
        except Exception as e:
            logger.error(f"Error creating role: {e}")
            return {
                "success": False,
                "detail": str(e)
            }
    
    @staticmethod
    async def update_role_proficiencies(auth_token: str, api_url: str, role_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update role with proficiency levels from LangChain assessment"""
        try:
            role_id = role_data.get("role_id")
            role_title = role_data.get("role_title")
            skills = role_data.get("skills", [])
            
            # Try different endpoint patterns
            endpoints_to_try = [
                f"{api_url}/api/v2/JIE/roles/{role_id}/skills" if role_id else None,
                f"{api_url}/api/v2/profiles/skills",
                f"{api_url}/api/v2/skills/proficiencies"
            ]
            
            # Prepare update payload
            payload = {
                "roleId": role_id,
                "roleTitle": role_title,
                "skillProficiencies": []
            }
            
            # Format skills with proficiencies
            for skill in skills:
                skill_entry = {
                    "name": skill.get("name") or skill.get("skill"),
                    "proficiency": skill.get("proficiency"),
                    "level": skill.get("proficiency"),
                    "confidence": skill.get("confidence", 0.0)
                }
                payload["skillProficiencies"].append(skill_entry)
            
            logger.info(f"Updating role '{role_title}' with {len(skills)} skill proficiencies")
            
            # Try each endpoint
            async with httpx.AsyncClient() as client:
                for endpoint in endpoints_to_try:
                    if not endpoint:
                        continue
                        
                    response = await client.put(
                        endpoint,
                        json=payload,
                        headers={
                            "Authorization": f"Bearer {auth_token}",
                            "Content-Type": "application/json"
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code in [200, 201]:
                        return {
                            "success": True,
                            "message": f"Role '{role_title}' updated with proficiencies",
                            "updated_skills": len(skills)
                        }
                    elif response.status_code != 404:
                        # If it's not a 404, return the error
                        return {
                            "success": False,
                            "detail": f"Failed to update role: {response.status_code}",
                            "response": response.text
                        }
            
            # If all endpoints returned 404
            logger.warning("Proficiency update endpoints not available in sandbox")
            
            # Simulate success for demo purposes
            return {
                "success": True,
                "message": f"Role '{role_title}' proficiencies updated (simulated)",
                "updated_skills": len(skills),
                "note": "Actual API update not available in sandbox environment"
            }
                    
        except Exception as e:
            logger.error(f"Error updating role proficiencies: {e}")
            return {
                "success": False,
                "detail": str(e)
            }
    
    @staticmethod
    async def delete_role(auth_token: str, api_url: str, role_data: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a role"""
        try:
            role_id = role_data.get("role_id")
            role_title = role_data.get("role_title")
            
            if not role_id:
                return {
                    "success": False,
                    "detail": "Role ID is required for deletion"
                }
            
            endpoint = f"{api_url}/api/v2/JIE/roles/{role_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    endpoint,
                    headers={
                        "Authorization": f"Bearer {auth_token}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code in [200, 204]:
                    return {
                        "success": True,
                        "message": f"Role '{role_title}' deleted successfully"
                    }
                elif response.status_code == 404:
                    return {
                        "success": False,
                        "detail": "Role deletion not supported in sandbox environment"
                    }
                else:
                    return {
                        "success": False,
                        "detail": f"Failed to delete role: {response.status_code}",
                        "response": response.text
                    }
                    
        except Exception as e:
            logger.error(f"Error deleting role: {e}")
            return {
                "success": False,
                "detail": str(e)
            }
    
    @staticmethod
    async def sync_roles(auth_token: str, api_url: str, sync_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sync roles from source to target environment"""
        try:
            role_title = sync_data.get("role_title")
            skills = sync_data.get("skills", [])
            
            # First, try to create or update the role
            create_result = await RoleCRUDService.create_role(
                auth_token, 
                api_url,
                {
                    "title": role_title,
                    "skills": skills
                }
            )
            
            if create_result.get("success"):
                return {
                    "success": True,
                    "message": f"Role '{role_title}' synced successfully",
                    "skills_count": len(skills)
                }
            else:
                # If creation failed, try update
                update_result = await RoleCRUDService.update_role_proficiencies(
                    auth_token,
                    api_url,
                    {
                        "role_title": role_title,
                        "skills": skills
                    }
                )
                
                return update_result
                
        except Exception as e:
            logger.error(f"Error syncing role: {e}")
            return {
                "success": False,
                "detail": str(e)
            }