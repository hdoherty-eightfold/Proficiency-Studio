"""
Data models for skills and proficiency assessment
Based on ProfFromSkillsRagPl models
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProficiencyLevel(str, Enum):
    """Proficiency levels for skills"""
    NOVICE = "Novice"
    DEVELOPING = "Developing"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"

class Skill(BaseModel):
    """Skill model matching Eightfold API structure"""
    id: str
    name: str
    description: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    external_id: Optional[str] = None
    category: Optional[str] = None
    
    def to_api_format(self) -> Dict[str, Any]:
        """Convert to API format"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "keywords": self.keywords,
            "external_id": self.external_id,
            "category": self.category
        }

class SkillProficiency(BaseModel):
    """Skill with proficiency assessment"""
    skill: Skill
    proficiency_level: ProficiencyLevel
    confidence_score: float = Field(ge=0.0, le=1.0)
    evidence: List[str] = Field(default_factory=list)
    reasoning: str
    years_experience: Optional[float] = None
    
    def to_api_format(self) -> Dict[str, Any]:
        """Convert to API format for Eightfold"""
        return {
            "skill_id": self.skill.id,
            "skill_name": self.skill.name,
            "proficiency_level": self.proficiency_level.value,
            "confidence_score": self.confidence_score,
            "evidence": self.evidence,
            "reasoning": self.reasoning,
            "years_experience": self.years_experience
        }

class SkillMatch(BaseModel):
    """Result of skill matching/similarity search"""
    skill: Skill
    similarity_score: float
    match_reason: Optional[str] = None

class AssessmentRequest(BaseModel):
    """Request for skill proficiency assessment"""
    text: str = Field(..., description="Resume text or profile to analyze")
    skills: Optional[List[str]] = Field(None, description="Specific skills to assess")
    use_rag: bool = Field(False, description="Use RAG enhancement")
    context_documents: Optional[List[str]] = Field(None, description="Additional context for RAG")
    provider: str = Field("openai", description="LLM provider to use")
    method: str = Field("direct", description="Assessment method: direct, rag, or barebones")
    target_role: Optional[str] = Field(None, description="Target role for comparison")

class AssessmentResult(BaseModel):
    """Result of skill proficiency assessment"""
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    method: str
    provider: str
    skills_assessed: List[SkillProficiency]
    total_skills: int
    processing_time: float
    tokens_used: Optional[int] = None
    rag_context_used: bool = False
    
    def summary(self) -> Dict[str, Any]:
        """Get summary statistics"""
        proficiency_distribution = {}
        for level in ProficiencyLevel:
            proficiency_distribution[level.value] = len([
                s for s in self.skills_assessed 
                if s.proficiency_level == level
            ])
        
        return {
            "total_skills": self.total_skills,
            "average_confidence": sum(s.confidence_score for s in self.skills_assessed) / len(self.skills_assessed) if self.skills_assessed else 0,
            "proficiency_distribution": proficiency_distribution,
            "processing_time": self.processing_time,
            "method": self.method,
            "provider": self.provider
        }

class ComparisonResult(BaseModel):
    """Result of comparing different assessment methods"""
    direct_result: Optional[AssessmentResult] = None
    rag_result: Optional[AssessmentResult] = None
    barebones_result: Optional[AssessmentResult] = None
    agreement_score: float = Field(ge=0.0, le=1.0)
    differences: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.now)