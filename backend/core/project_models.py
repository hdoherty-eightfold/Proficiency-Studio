"""
Project models for CareerHub integration
Implements the project application system with proper recruitment status handling
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProjectStatus(str, Enum):
    """Project status types that control application availability"""
    DRAFT = "Draft"
    RECRUITING = "Recruiting"
    ACTIVE = "Active"
    ARCHIVED = "Archived"
    CANCELLED = "Cancelled"

class ProjectType(str, Enum):
    """Types of projects available"""
    DEVELOPMENT = "Development"
    RESEARCH = "Research"
    CONSULTING = "Consulting"
    TRAINING = "Training"
    OTHER = "Other"

class Project(BaseModel):
    """Project model matching CareerHub structure"""
    id: str
    title: str
    description: str
    status: ProjectStatus
    project_type: ProjectType
    location: str
    project_manager: str
    project_manager_id: str
    skills_required: List[str] = Field(default_factory=list)
    skills_preferred: List[str] = Field(default_factory=list)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    time_commitment: Optional[str] = None  # e.g., "Full-time", "Part-time", "10 hours/week"
    remote_allowed: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    @property
    def is_actively_recruiting(self) -> bool:
        """Check if project is accepting applications"""
        return self.status == ProjectStatus.RECRUITING
    
    @property
    def can_apply(self) -> bool:
        """Determine if the Apply Now button should be enabled"""
        return self.is_actively_recruiting
    
    def to_api_format(self) -> Dict[str, Any]:
        """Convert to API format"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status.value,
            "project_type": self.project_type.value,
            "location": self.location,
            "project_manager": self.project_manager,
            "project_manager_id": self.project_manager_id,
            "skills_required": self.skills_required,
            "skills_preferred": self.skills_preferred,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "time_commitment": self.time_commitment,
            "remote_allowed": self.remote_allowed,
            "is_actively_recruiting": self.is_actively_recruiting,
            "can_apply": self.can_apply,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class ApplicationStatus(str, Enum):
    """Application status types"""
    SUBMITTED = "Submitted"
    UNDER_REVIEW = "Under Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"

class ProjectApplication(BaseModel):
    """Project application model"""
    id: str
    project_id: str
    applicant_id: str
    applicant_name: str
    personal_note: str
    status: ApplicationStatus = ApplicationStatus.SUBMITTED
    submitted_at: datetime = Field(default_factory=datetime.now)
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    
    def to_api_format(self) -> Dict[str, Any]:
        """Convert to API format"""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "applicant_id": self.applicant_id,
            "applicant_name": self.applicant_name,
            "personal_note": self.personal_note,
            "status": self.status.value,
            "submitted_at": self.submitted_at.isoformat(),
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "reviewer_id": self.reviewer_id,
            "reviewer_notes": self.reviewer_notes
        }

class ApplicationRequest(BaseModel):
    """Request to apply to a project"""
    project_id: str
    personal_note: str = Field(..., min_length=10, description="Required personal note")
    
class ApplicationResponse(BaseModel):
    """Response after applying to a project"""
    success: bool
    application_id: Optional[str] = None
    message: str
    error_code: Optional[str] = None

