"""
AI Pipeline Agent - Handles LLM interactions and pipeline execution
"""
from typing import Dict, Any, List, Optional
import os
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.llms import HuggingFaceHub
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
import chromadb
import torch
from sentence_transformers import SentenceTransformer
import numpy as np
from config.settings import settings

class AIPipelineAgent:
    """Agent responsible for AI pipeline execution and LLM interactions"""
    
    def __init__(self):
        self.llm_providers = {}
        self.vector_store = None
        self.embeddings_model = None
        self.chroma_client = None
        self._initialize_embeddings()
        
    def _initialize_embeddings(self):
        """Initialize embedding models"""
        try:
            # Use sentence-transformers for embeddings
            self.embeddings_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Error initializing embeddings: {e}")
            
    def initialize_llm(self, provider: str, api_key: str, model_name: Optional[str] = None) -> bool:
        """Initialize LLM provider"""
        try:
            if provider == "openai":
                model = model_name or "gpt-4"
                self.llm_providers[provider] = ChatOpenAI(
                    api_key=api_key,
                    model_name=model,
                    temperature=0.7
                )
            elif provider == "anthropic":
                model = model_name or "claude-3-sonnet-20240229"
                self.llm_providers[provider] = ChatAnthropic(
                    anthropic_api_key=api_key,
                    model=model,
                    temperature=0.7
                )
            elif provider == "google":
                # For Gemini, you'd need google-generativeai setup
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                # Store the configured API for later use
                self.llm_providers[provider] = {"api_key": api_key, "model": model_name or "gemini-pro"}
            elif provider == "grok":
                # Grok would need specific implementation
                self.llm_providers[provider] = {"api_key": api_key, "model": model_name or "grok-1"}
            else:
                return False
            return True
        except Exception as e:
            print(f"Error initializing {provider}: {e}")
            return False
    
    def setup_vector_store(self, store_type: str = "chroma") -> bool:
        """Set up vector store for RAG"""
        try:
            if store_type == "chroma":
                self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
                collection_name = "skills_proficiency"
                
                # Create or get collection
                try:
                    self.vector_store = self.chroma_client.get_collection(collection_name)
                except:
                    self.vector_store = self.chroma_client.create_collection(
                        name=collection_name,
                        metadata={"hnsw:space": "cosine"}
                    )
            return True
        except Exception as e:
            print(f"Error setting up vector store: {e}")
            return False
    
    def add_documents_to_rag(self, documents: List[str]) -> bool:
        """Add documents to RAG vector store"""
        if not self.vector_store or not self.embeddings_model:
            return False
            
        try:
            # Split documents into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50
            )
            
            all_chunks = []
            for doc in documents:
                chunks = text_splitter.split_text(doc)
                all_chunks.extend(chunks)
            
            # Create embeddings
            embeddings = self.embeddings_model.encode(all_chunks)
            
            # Add to vector store
            ids = [f"doc_{i}" for i in range(len(all_chunks))]
            self.vector_store.add(
                embeddings=embeddings.tolist(),
                documents=all_chunks,
                ids=ids
            )
            
            return True
        except Exception as e:
            print(f"Error adding documents: {e}")
            return False
    
    def process_direct_assessment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process direct proficiency assessment without RAG"""
        skills = data.get("skills", [])
        provider = data.get("provider", "openai")
        
        if provider not in self.llm_providers:
            return {"error": f"Provider {provider} not initialized"}
        
        # Create prompt using configured template
        prompt_template = settings.skills_assessment_prompt

        skills_text = "\n".join([f"- {skill}" for skill in skills])
        proficiency_levels_desc = settings.get_proficiency_levels_description()
        
        # Get LLM response
        try:
            if provider in ["openai", "anthropic"]:
                llm = self.llm_providers[provider]
                prompt = PromptTemplate(
                    input_variables=["proficiency_levels_description", "context", "skills_list"],
                    template=prompt_template
                )
                chain = LLMChain(llm=llm, prompt=prompt)
                response = chain.run(
                    proficiency_levels_description=proficiency_levels_desc,
                    context="Direct assessment without additional context",
                    skills_list=skills_text
                )
            else:
                # Handle other providers
                response = self._handle_other_providers(provider, prompt_template, skills)
            
            # Parse response
            parsed_results = self._parse_proficiency_response(response, skills)
            
            return {
                "success": True,
                "method": "direct",
                "provider": provider,
                "results": parsed_results,
                "raw_response": response
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "provider": provider
            }
    
    def process_rag_assessment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process RAG-enhanced proficiency assessment"""
        skills = data.get("skills", [])
        provider = data.get("provider", "openai")
        context_docs = data.get("context_documents", [])
        
        if provider not in self.llm_providers:
            return {"error": f"Provider {provider} not initialized"}
        
        # Add context documents if provided
        if context_docs and self.vector_store:
            self.add_documents_to_rag(context_docs)
        
        # Retrieve relevant context
        context = ""
        if self.vector_store and self.embeddings_model:
            # Create query embedding
            query = f"Proficiency levels for skills: {', '.join(skills)}"
            query_embedding = self.embeddings_model.encode([query])[0]
            
            # Search vector store
            results = self.vector_store.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=5
            )
            
            if results['documents']:
                context = "\n\n".join(results['documents'][0])
        
        # Create enhanced prompt using configured template
        prompt_template = settings.skills_assessment_prompt

        skills_text = "\n".join([f"- {skill}" for skill in skills])
        proficiency_levels_desc = settings.get_proficiency_levels_description()
        
        # Get LLM response
        try:
            if provider in ["openai", "anthropic"]:
                llm = self.llm_providers[provider]
                prompt = PromptTemplate(
                    input_variables=["proficiency_levels_description", "context", "skills_list"],
                    template=prompt_template
                )
                chain = LLMChain(llm=llm, prompt=prompt)
                response = chain.run(
                    proficiency_levels_description=proficiency_levels_desc,
                    context=context or "No specific context available",
                    skills_list=skills_text
                )
            else:
                response = self._handle_other_providers(provider, prompt_template, skills, context)
            
            # Parse response
            parsed_results = self._parse_proficiency_response(response, skills)
            
            return {
                "success": True,
                "method": "rag_enhanced",
                "provider": provider,
                "context_used": bool(context),
                "results": parsed_results,
                "raw_response": response
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "provider": provider
            }
    
    def _parse_proficiency_response(self, response: str, skills: List[str]) -> List[Dict[str, str]]:
        """Parse LLM response to extract proficiency assignments"""
        results = []
        
        # Split response into lines and look for skill assignments
        lines = response.split('\n')
        
        for skill in skills:
            skill_result = {
                "skill": skill,
                "proficiency": "Not assigned",
                "reasoning": "No reasoning provided"
            }
            
            # Find lines containing this skill
            for line in lines:
                if skill.lower() in line.lower() and '|' in line:
                    parts = line.split('|')
                    if len(parts) >= 3:
                        # Extract proficiency and reasoning
                        for part in parts:
                            if 'proficiency' in part.lower() and ':' in part:
                                prof_text = part.split(':')[-1].strip()
                                # Extract the proficiency level name (might include "Level X")
                                for level_name in settings.proficiency_levels.keys():
                                    if level_name in prof_text:
                                        skill_result["proficiency"] = level_name
                                        break
                            elif 'reasoning:' in part.lower() or 'justification:' in part.lower():
                                skill_result["reasoning"] = part.split(':')[-1].strip()
                    break
            
            results.append(skill_result)
        
        return results
    
    def _handle_other_providers(self, provider: str, prompt: str, skills: List[str], context: str = "") -> str:
        """Handle non-LangChain providers"""
        if provider == "google":
            import google.generativeai as genai
            model = genai.GenerativeModel('gemini-pro')
            full_prompt = prompt.format(
                proficiency_levels_description=settings.get_proficiency_levels_description(),
                context=context or "No specific context",
                skills_list="\n".join([f"- {s}" for s in skills])
            )
            response = model.generate_content(full_prompt)
            return response.text
        elif provider == "grok":
            # Grok implementation would go here
            return "Grok provider not fully implemented"
        else:
            return "Unknown provider"
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "LLM provider management (OpenAI, Anthropic, Google, Grok)",
            "Direct proficiency assessment",
            "RAG-enhanced assessment",
            "Vector store management",
            "Document embedding and retrieval",
            "Multi-model support"
        ]
    
    def get_provider_status(self) -> Dict[str, bool]:
        """Get status of initialized providers"""
        return {
            provider: provider in self.llm_providers
            for provider in ["openai", "anthropic", "google", "grok"]
        }