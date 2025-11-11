"""
CareerHub Client - Handles project applications and recruitment functionality
Extension of EightfoldClient specifically for CareerHub features
"""
import logging
from typing import List, Dict, Any, Optional
from core.eightfold_client import EightfoldClient
from core.project_models import Project, ProjectApplication, ApplicationRequest, ApplicationResponse, ProjectStatus
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class CareerHubClient(EightfoldClient):
    """Client for CareerHub project application functionality"""
    
    def __init__(self):
        super().__init__()
        self.careerhub_base_url = f"{self.base_url}/api/v2/careerhub"
    
    def get_projects(self, status_filter: Optional[ProjectStatus] = None, page: int = 1, limit: int = 10) -> List[Project]:
        """Fetch projects from CareerHub"""
        if not self.auth_token:
            logger.error("No auth token available - authentication required")
            return []
        
        # Try CareerHub projects endpoint
        url = f"{self.careerhub_base_url}/projects"
        params = {
            "page": page,
            "limit": limit
        }
        
        if status_filter:
            params["status"] = status_filter.value
        
        try:
            response = self.session.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            logger.info(f"Projects response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                projects_data = data.get("data", [])
                
                projects = []
                for project_data in projects_data:
                    try:
                        project = Project(
                            id=project_data.get("id"),
                            title=project_data.get("title", ""),
                            description=project_data.get("description", ""),
                            status=ProjectStatus(project_data.get("status", "Draft")),
                            project_type=project_data.get("project_type", "Other"),
                            location=project_data.get("location", ""),
                            project_manager=project_data.get("project_manager", ""),
                            project_manager_id=project_data.get("project_manager_id", ""),
                            skills_required=project_data.get("skills_required", []),
                            skills_preferred=project_data.get("skills_preferred", []),
                            time_commitment=project_data.get("time_commitment"),
                            remote_allowed=project_data.get("remote_allowed", False)
                        )
                        projects.append(project)
                    except Exception as e:
                        logger.error(f"Error parsing project data: {e}")
                        continue
                
                return projects
            else:
                logger.error(f"Failed to fetch projects: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching projects: {e}")
            return []
    
    def get_project_details(self, project_id: str) -> Optional[Project]:
        """Get detailed information about a specific project"""
        if not self.auth_token:
            logger.error("No auth token - authentication required")
            return None
        
        try:
            url = f"{self.careerhub_base_url}/projects/{project_id}"
            response = self.session.get(
                url,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                project_data = response.json()
                return Project(**project_data)
            else:
                logger.error(f"Failed to fetch project {project_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching project {project_id}: {e}")
            return None
    
    def apply_to_project(self, application_request: ApplicationRequest, applicant_id: str, applicant_name: str) -> ApplicationResponse:
        """Apply to a project with proper status validation"""
        try:
            # First, check if project exists and is recruiting
            project = self.get_project_details(application_request.project_id)
            
            if not project:
                return ApplicationResponse(
                    success=False,
                    message="Project not found",
                    error_code="PROJECT_NOT_FOUND"
                )
            
            # CRITICAL: Check if project is actively recruiting
            if not project.is_actively_recruiting:
                return ApplicationResponse(
                    success=False,
                    message=f"Cannot apply as the project is not recruiting at the moment. Current status: {project.status.value}",
                    error_code="PROJECT_NOT_RECRUITING"
                )
            
            # If we have auth token, try real API call
            if self.auth_token:
                url = f"{self.careerhub_base_url}/projects/{application_request.project_id}/applications"
                
                payload = {
                    "applicant_id": applicant_id,
                    "applicant_name": applicant_name,
                    "personal_note": application_request.personal_note
                }
                
                response = self.session.post(
                    url,
                    json=payload,
                    headers={"Authorization": f"Bearer {self.auth_token}"}
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    return ApplicationResponse(
                        success=True,
                        application_id=data.get("application_id"),
                        message="Application submitted successfully"
                    )
                elif response.status_code == 403:
                    return ApplicationResponse(
                        success=False,
                        message="Cannot apply as the project is not recruiting at the moment",
                        error_code="PROJECT_NOT_RECRUITING"
                    )
                else:
                    return ApplicationResponse(
                        success=False,
                        message=f"Application failed: {response.status_code}",
                        error_code="API_ERROR"
                    )
            else:
                # No auth token - return error
                return ApplicationResponse(
                    success=False,
                    message="Authentication required",
                    error_code="AUTH_REQUIRED"
                )
                
        except Exception as e:
            logger.error(f"Error applying to project: {e}")
            return ApplicationResponse(
                success=False,
                message=f"Application failed: {str(e)}",
                error_code="SYSTEM_ERROR"
            )
    
    def get_my_applications(self, applicant_id: str) -> List[ProjectApplication]:
        """Get applications for a specific user"""
        if not self.auth_token:
            logger.error("No auth token - authentication required")
            return []
        
        try:
            url = f"{self.careerhub_base_url}/applications"
            response = self.session.get(
                url,
                params={"applicant_id": applicant_id},
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                applications_data = response.json().get("data", [])
                return [ProjectApplication(**app) for app in applications_data]
            else:
                logger.error(f"Failed to fetch applications: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching applications: {e}")
            return []
    

