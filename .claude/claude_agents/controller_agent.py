"""
Controller Agent - Main coordinator that manages all other agents
"""
from typing import Dict, Any, List, Optional
from anthropic import Anthropic
import json
import os
from datetime import datetime

from claude_agents.task_agent import TaskAgent, TaskStatus, TaskPriority
from claude_agents.knowledge_agent import KnowledgeAgent
from claude_agents.ai_pipeline_agent import AIPipelineAgent
from claude_agents.evaluation_agent import EvaluationAgent
from claude_agents.demo_agent import DemoAgent
from claude_agents.live_agent import LiveAgent
from claude_agents.qa_agent import QAAgent
from claude_agents.python_expert_agent import PythonExpertAgent

class ControllerAgent:
    """Main controller that coordinates all Claude agents"""
    
    def __init__(self, anthropic_api_key: Optional[str] = None):
        self.api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = Anthropic(api_key=self.api_key) if self.api_key else None
        
        # Initialize all agents
        self.task_agent = TaskAgent()
        self.knowledge_agent = KnowledgeAgent()
        self.ai_pipeline_agent = AIPipelineAgent()
        self.evaluation_agent = EvaluationAgent()
        self.demo_agent = DemoAgent()
        self.live_agent = LiveAgent()
        self.qa_agent = QAAgent()
        self.python_expert = PythonExpertAgent()
        
        # Agent registry
        self.agents = {
            "task": self.task_agent,
            "knowledge": self.knowledge_agent,
            "ai_pipeline": self.ai_pipeline_agent,
            "evaluation": self.evaluation_agent,
            "demo": self.demo_agent,
            "live": self.live_agent,
            "qa": self.qa_agent,
            "python_expert": self.python_expert
        }
        
        # Execution context
        self.execution_log = []
        self.current_context = {}
        
    def analyze_request(self, request: str) -> Dict[str, Any]:
        """Analyze user request to determine which agents to involve"""
        if not self.client:
            return self._fallback_analysis(request)
            
        prompt = f"""Analyze this request and determine which agents should handle it:

Request: {request}

Available agents:
- task: Tracks and manages tasks
- knowledge: Understands project requirements and architecture
- ai_pipeline: Handles LLM interactions and pipelines
- evaluation: Compares different approaches
- demo: Runs demonstrations
- live: Handles live API interactions
- qa: Performs quality assurance
- python_expert: Python and AI best practices

Return JSON with:
{{
    "primary_agent": "agent_name",
    "supporting_agents": ["agent1", "agent2"],
    "approach": "description of approach",
    "tasks": ["task1", "task2"]
}}"""

        try:
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Extract JSON from response
            text = response.content[0].text
            import re
            json_match = re.search(r'\{.*?\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            print(f"Analysis error: {e}")
            
        return self._fallback_analysis(request)
    
    def _fallback_analysis(self, request: str) -> Dict[str, Any]:
        """Fallback analysis when Claude is not available"""
        request_lower = request.lower()
        
        if "demo" in request_lower:
            return {
                "primary_agent": "demo",
                "supporting_agents": ["task", "qa"],
                "approach": "Run demonstration",
                "tasks": ["run_demo"]
            }
        elif "compare" in request_lower or "evaluation" in request_lower:
            return {
                "primary_agent": "evaluation",
                "supporting_agents": ["ai_pipeline", "knowledge"],
                "approach": "Compare approaches",
                "tasks": ["compare_methods"]
            }
        elif "live" in request_lower or "api" in request_lower:
            return {
                "primary_agent": "live",
                "supporting_agents": ["ai_pipeline", "task"],
                "approach": "Execute live API calls",
                "tasks": ["live_execution"]
            }
        else:
            return {
                "primary_agent": "ai_pipeline",
                "supporting_agents": ["knowledge", "python_expert"],
                "approach": "Process with AI pipeline",
                "tasks": ["process_request"]
            }
    
    async def execute_request(self, request: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute user request by coordinating agents"""
        # Update context
        self.current_context.update(context or {})
        
        # Analyze request
        analysis = self.analyze_request(request)
        
        # Log execution start
        self._log_execution("request_start", {
            "request": request,
            "analysis": analysis
        })
        
        # Get primary agent
        primary = self.agents.get(analysis["primary_agent"])
        if not primary:
            return {"error": f"Unknown agent: {analysis['primary_agent']}"}
        
        # Create tasks
        for task_desc in analysis.get("tasks", []):
            task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.task_agent.create_task(
                task_id, 
                task_desc, 
                f"Task for: {request[:50]}...",
                TaskPriority.HIGH
            )
            self.task_agent.assign_task(task_id, analysis["primary_agent"])
        
        # Execute with primary agent
        try:
            if hasattr(primary, 'execute'):
                result = await primary.execute(request, self.current_context)
            else:
                result = {"message": f"Agent {analysis['primary_agent']} processed request"}
            
            # Get insights from supporting agents
            insights = {}
            for agent_name in analysis.get("supporting_agents", []):
                agent = self.agents.get(agent_name)
                if agent and hasattr(agent, 'provide_insight'):
                    insights[agent_name] = await agent.provide_insight(request, result)
            
            # Combine results
            final_result = {
                "primary_result": result,
                "insights": insights,
                "analysis": analysis,
                "task_summary": self.task_agent.get_progress_report()
            }
            
            self._log_execution("request_complete", final_result)
            return final_result
            
        except Exception as e:
            error_result = {
                "error": str(e),
                "agent": analysis["primary_agent"]
            }
            self._log_execution("request_error", error_result)
            return error_result
    
    def get_agent_capabilities(self) -> Dict[str, List[str]]:
        """Get capabilities of all agents"""
        capabilities = {}
        for name, agent in self.agents.items():
            if hasattr(agent, 'get_capabilities'):
                capabilities[name] = agent.get_capabilities()
            else:
                capabilities[name] = ["General processing"]
        return capabilities
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        return {
            "agents": list(self.agents.keys()),
            "task_summary": self.task_agent.get_progress_report(),
            "active_context": self.current_context,
            "capabilities": self.get_agent_capabilities(),
            "execution_history": len(self.execution_log)
        }
    
    def _log_execution(self, event_type: str, details: Any):
        """Log execution events"""
        self.execution_log.append({
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "details": details
        })
        
        # Keep only last 1000 events
        if len(self.execution_log) > 1000:
            self.execution_log = self.execution_log[-1000:]
    
    def coordinate_pipeline_execution(self, pipeline_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate execution of specific pipeline"""
        if pipeline_type == "direct_proficiency":
            return self._execute_direct_pipeline(data)
        elif pipeline_type == "rag_proficiency":
            return self._execute_rag_pipeline(data)
        elif pipeline_type == "barebones":
            return self._execute_barebones_pipeline(data)
        else:
            return {"error": f"Unknown pipeline type: {pipeline_type}"}
    
    def _execute_direct_pipeline(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute direct proficiency assessment pipeline"""
        # This will be called by the Flask app
        return self.ai_pipeline_agent.process_direct_assessment(data)
    
    def _execute_rag_pipeline(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute RAG-enhanced proficiency assessment pipeline"""
        # This will be called by the Flask app
        return self.ai_pipeline_agent.process_rag_assessment(data)
    
    def _execute_barebones_pipeline(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute barebones Python implementation"""
        # This will be called by the Flask app
        return self.python_expert.execute_barebones(data)