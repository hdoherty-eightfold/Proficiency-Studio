"""
RAG Pipeline adapted from ProfFromSkillsRagPl
"""
import torch
import json
import time
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import numpy as np
from sentence_transformers import SentenceTransformer

from core.models import Skill, SkillProficiency, SkillMatch, ProficiencyLevel
from core.llm_service import LLMService
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

class RAGSkillsAnalyzer:
    """RAG-based skills analyzer using PyTorch for fast similarity search"""
    
    def __init__(self):
        # Initialize embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize LLM service
        self.llm_service = LLMService()
        
        # PyTorch device
        if settings.pytorch_device == 'auto':
            self.device = torch.device('cuda' if torch.cuda.is_available() else 
                                     'mps' if torch.backends.mps.is_available() else 'cpu')
        else:
            self.device = torch.device(settings.pytorch_device)
        
        logger.info(f"Using device: {self.device}")
        
        # Storage for embeddings and metadata
        self.skill_embeddings = None
        self.skill_metadata = []
        self.skills_by_id = {}
        
        # Load existing embeddings if available
        self._load_embeddings()
    
    def add_skills(self, skills: List[Skill], rebuild_embeddings: bool = False):
        """Add skills to the RAG system"""
        if rebuild_embeddings or self.skill_embeddings is None:
            self.skill_metadata = []
            self.skills_by_id = {}
        
        # Store skills
        for skill in skills:
            self.skills_by_id[skill.id] = skill
            
            # Create text representation for embedding
            text = f"{skill.name} {skill.description or ''} {' '.join(skill.keywords)}"
            self.skill_metadata.append({
                'id': skill.id,
                'text': text,
                'skill': skill
            })
        
        # Generate embeddings
        texts = [meta['text'] for meta in self.skill_metadata]
        embeddings = self.embedding_model.encode(texts, convert_to_tensor=True)
        
        # Move to device and normalize
        self.skill_embeddings = embeddings.to(self.device)
        self.skill_embeddings = torch.nn.functional.normalize(self.skill_embeddings, p=2, dim=1)
        
        # Save embeddings
        self._save_embeddings()
        
        logger.info(f"Added {len(skills)} skills to RAG system")
    
    def add_context_documents(self, documents: List[str]) -> int:
        """Add context documents for RAG enhancement"""
        # For this implementation, we'll embed documents and store separately
        # In a full implementation, these would be chunked and indexed
        doc_embeddings = self.embedding_model.encode(documents, convert_to_tensor=True)
        doc_embeddings = doc_embeddings.to(self.device)
        
        # Store in temporary context (would be persisted in production)
        self.context_embeddings = torch.nn.functional.normalize(doc_embeddings, p=2, dim=1)
        self.context_documents = documents
        
        return len(documents)
    
    def analyze_text(self, text: str, top_k: int = 10, use_context: bool = False) -> List[SkillMatch]:
        """Analyze text to find matching skills"""
        if not self.skill_embeddings:
            logger.warning("No skills loaded in RAG system")
            return []
        
        # Generate embedding for input text
        text_embedding = self.embedding_model.encode([text], convert_to_tensor=True)
        text_embedding = text_embedding.to(self.device)
        text_embedding = torch.nn.functional.normalize(text_embedding, p=2, dim=1)
        
        # Compute similarities
        similarities = torch.matmul(text_embedding, self.skill_embeddings.T).squeeze()
        
        # Get top-k matches
        top_k = min(top_k, len(self.skill_metadata))
        top_scores, top_indices = torch.topk(similarities, top_k)
        
        # Create skill matches
        matches = []
        for idx, score in zip(top_indices.cpu().numpy(), top_scores.cpu().numpy()):
            if score >= settings.min_similarity_score:
                skill_meta = self.skill_metadata[idx]
                matches.append(SkillMatch(
                    skill=skill_meta['skill'],
                    similarity_score=float(score),
                    match_reason=f"Semantic similarity: {score:.2f}"
                ))
        
        return matches
    
    def assess_proficiencies(self, text: str, skills: List[Skill], 
                           use_context: bool = False, provider: str = "openai") -> List[SkillProficiency]:
        """Assess proficiency levels for skills"""
        start_time = time.time()
        
        # Get context if RAG is enabled
        context = ""
        if use_context and hasattr(self, 'context_documents'):
            # Find most relevant context
            text_embedding = self.embedding_model.encode([text], convert_to_tensor=True)
            text_embedding = text_embedding.to(self.device)
            text_embedding = torch.nn.functional.normalize(text_embedding, p=2, dim=1)
            
            context_similarities = torch.matmul(text_embedding, self.context_embeddings.T).squeeze()
            top_context_idx = torch.argmax(context_similarities).item()
            context = self.context_documents[top_context_idx]
        
        # Use LLM to assess proficiencies
        proficiencies = self.llm_service.assess_proficiencies(
            text=text,
            skills=skills,
            context=context,
            provider=provider
        )
        
        processing_time = time.time() - start_time
        logger.info(f"Assessed {len(proficiencies)} skills in {processing_time:.2f}s")
        
        return proficiencies
    
    def analyze_and_assess(self, text: str, use_rag: bool = False, 
                          provider: str = "openai", specific_skills: Optional[List[str]] = None) -> Tuple[List[SkillProficiency], Dict[str, Any]]:
        """Complete pipeline: analyze text and assess proficiencies"""
        start_time = time.time()
        
        # Get skills to assess
        if specific_skills:
            # Find specific skills from our database
            skills_to_assess = [
                self.skills_by_id.get(skill_id) or 
                next((s for s in self.skills_by_id.values() if s.name.lower() == skill_id.lower()), None)
                for skill_id in specific_skills
            ]
            skills_to_assess = [s for s in skills_to_assess if s]
        else:
            # Find matching skills using similarity search
            matches = self.analyze_text(text, top_k=settings.top_k_results)
            skills_to_assess = [match.skill for match in matches]
        
        # Assess proficiencies
        proficiencies = self.assess_proficiencies(
            text=text,
            skills=skills_to_assess,
            use_context=use_rag,
            provider=provider
        )
        
        # Calculate metrics
        processing_time = time.time() - start_time
        metrics = {
            "total_skills": len(skills_to_assess),
            "assessed_skills": len(proficiencies),
            "processing_time": processing_time,
            "provider": provider,
            "rag_enabled": use_rag,
            "device": str(self.device)
        }
        
        return proficiencies, metrics
    
    def _save_embeddings(self):
        """Save embeddings and metadata to disk"""
        try:
            # Save embeddings
            torch.save(self.skill_embeddings, settings.vector_store_path)
            
            # Save metadata
            metadata = {
                'skill_metadata': [
                    {
                        'id': meta['id'],
                        'text': meta['text'],
                        'skill': meta['skill'].dict()
                    }
                    for meta in self.skill_metadata
                ]
            }
            
            with open(settings.skills_metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info("Saved embeddings and metadata")
            
        except Exception as e:
            logger.error(f"Error saving embeddings: {e}")
    
    def _load_embeddings(self):
        """Load embeddings and metadata from disk"""
        try:
            if settings.vector_store_path.exists() and settings.skills_metadata_path.exists():
                # Load embeddings
                self.skill_embeddings = torch.load(settings.vector_store_path, map_location=self.device)
                
                # Load metadata
                with open(settings.skills_metadata_path, 'r') as f:
                    data = json.load(f)
                
                self.skill_metadata = []
                self.skills_by_id = {}
                
                for meta in data['skill_metadata']:
                    skill = Skill(**meta['skill'])
                    self.skills_by_id[skill.id] = skill
                    self.skill_metadata.append({
                        'id': meta['id'],
                        'text': meta['text'],
                        'skill': skill
                    })
                
                logger.info(f"Loaded {len(self.skill_metadata)} skills from disk")
                
        except Exception as e:
            logger.error(f"Error loading embeddings: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the RAG system"""
        return {
            "total_skills": len(self.skill_metadata),
            "embedding_dimension": self.skill_embeddings.shape[1] if self.skill_embeddings is not None else 0,
            "device": str(self.device),
            "memory_usage_mb": self.skill_embeddings.element_size() * self.skill_embeddings.nelement() / 1024 / 1024 if self.skill_embeddings is not None else 0
        }