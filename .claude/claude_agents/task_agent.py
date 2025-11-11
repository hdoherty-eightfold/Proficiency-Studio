"""
Task Tracking Agent - Manages and tracks all tasks in the system
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
import json

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"

class TaskPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Task:
    """Individual task representation"""
    def __init__(self, task_id: str, name: str, description: str, 
                 priority: TaskPriority = TaskPriority.MEDIUM,
                 dependencies: List[str] = None):
        self.id = task_id
        self.name = name
        self.description = description
        self.priority = priority
        self.status = TaskStatus.PENDING
        self.dependencies = dependencies or []
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.completed_at = None
        self.assigned_to = None
        self.result = None
        self.error = None
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "priority": self.priority.value,
            "status": self.status.value,
            "dependencies": self.dependencies,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "assigned_to": self.assigned_to,
            "result": self.result,
            "error": self.error
        }

class TaskAgent:
    """Agent responsible for tracking and managing all system tasks"""
    
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.task_history: List[Dict[str, Any]] = []
        self._initialize_system_tasks()
        
    def _initialize_system_tasks(self):
        """Initialize the core system tasks"""
        core_tasks = [
            ("setup_api_storage", "Set up API key storage system", "Store API keys for OpenAI, Claude, Grok, Gemini, and Eightfold", TaskPriority.CRITICAL),
            ("create_skill_pipeline", "Create skill extraction pipeline", "Build pipeline to pull skills from API", TaskPriority.HIGH),
            ("create_proficiency_pipeline", "Create proficiency assignment pipeline", "Build LangChain pipeline for proficiency selection", TaskPriority.HIGH),
            ("create_rag_pipeline", "Create RAG-enhanced pipeline", "Build pipeline with document context support", TaskPriority.HIGH),
            ("create_barebones_impl", "Create barebones Python implementation", "Simple Python implementation without frameworks", TaskPriority.HIGH),
            ("build_flask_ui", "Build Flask web UI", "Create web interface with model switching", TaskPriority.HIGH),
            ("implement_comparison", "Implement comparison features", "Compare direct vs RAG approaches", TaskPriority.MEDIUM),
            ("create_demo_mode", "Create demo mode", "Build demo functionality for testing", TaskPriority.MEDIUM),
            ("create_live_mode", "Create live mode", "Build live functionality with real APIs", TaskPriority.MEDIUM),
            ("implement_qa_tests", "Implement QA tests", "Create verification tests", TaskPriority.MEDIUM)
        ]
        
        for task_id, name, desc, priority in core_tasks:
            self.create_task(task_id, name, desc, priority)
    
    def create_task(self, task_id: str, name: str, description: str,
                   priority: TaskPriority = TaskPriority.MEDIUM,
                   dependencies: List[str] = None) -> Task:
        """Create a new task"""
        task = Task(task_id, name, description, priority, dependencies)
        self.tasks[task_id] = task
        self._log_event("task_created", task_id, {"name": name})
        return task
    
    def update_task_status(self, task_id: str, status: TaskStatus, 
                          result: Any = None, error: str = None) -> bool:
        """Update task status"""
        if task_id not in self.tasks:
            return False
            
        task = self.tasks[task_id]
        old_status = task.status
        task.status = status
        task.updated_at = datetime.now()
        
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.now()
            task.result = result
        elif status == TaskStatus.FAILED:
            task.error = error
            
        self._log_event("status_changed", task_id, {
            "old_status": old_status.value,
            "new_status": status.value,
            "result": result,
            "error": error
        })
        
        return True
    
    def assign_task(self, task_id: str, agent_name: str) -> bool:
        """Assign task to an agent"""
        if task_id not in self.tasks:
            return False
            
        self.tasks[task_id].assigned_to = agent_name
        self.tasks[task_id].updated_at = datetime.now()
        self._log_event("task_assigned", task_id, {"agent": agent_name})
        return True
    
    def get_pending_tasks(self) -> List[Task]:
        """Get all pending tasks"""
        return [task for task in self.tasks.values() 
                if task.status == TaskStatus.PENDING]
    
    def get_ready_tasks(self) -> List[Task]:
        """Get tasks that are ready to execute (dependencies met)"""
        ready_tasks = []
        for task in self.get_pending_tasks():
            if self._dependencies_met(task):
                ready_tasks.append(task)
        return sorted(ready_tasks, key=lambda t: t.priority.value, reverse=True)
    
    def _dependencies_met(self, task: Task) -> bool:
        """Check if all task dependencies are completed"""
        for dep_id in task.dependencies:
            if dep_id in self.tasks:
                dep_task = self.tasks[dep_id]
                if dep_task.status != TaskStatus.COMPLETED:
                    return False
        return True
    
    def get_task_status_summary(self) -> Dict[str, int]:
        """Get summary of task statuses"""
        summary = {status.value: 0 for status in TaskStatus}
        for task in self.tasks.values():
            summary[task.status.value] += 1
        return summary
    
    def get_progress_report(self) -> Dict[str, Any]:
        """Get detailed progress report"""
        total_tasks = len(self.tasks)
        completed_tasks = len([t for t in self.tasks.values() 
                              if t.status == TaskStatus.COMPLETED])
        
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "progress_percentage": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            "status_summary": self.get_task_status_summary(),
            "pending_high_priority": len([t for t in self.get_pending_tasks() 
                                        if t.priority in [TaskPriority.HIGH, TaskPriority.CRITICAL]]),
            "blocked_tasks": len([t for t in self.tasks.values() 
                                if t.status == TaskStatus.BLOCKED]),
            "failed_tasks": len([t for t in self.tasks.values() 
                               if t.status == TaskStatus.FAILED])
        }
    
    def _log_event(self, event_type: str, task_id: str, details: Dict[str, Any]):
        """Log task event for history"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "task_id": task_id,
            "details": details
        }
        self.task_history.append(event)
    
    def export_tasks(self) -> str:
        """Export all tasks as JSON"""
        export_data = {
            "tasks": {tid: task.to_dict() for tid, task in self.tasks.items()},
            "history": self.task_history[-100:],  # Last 100 events
            "summary": self.get_progress_report()
        }
        return json.dumps(export_data, indent=2)
    
    def get_task_timeline(self) -> List[Dict[str, Any]]:
        """Get timeline of task completions"""
        timeline = []
        for task in self.tasks.values():
            if task.completed_at:
                timeline.append({
                    "task_id": task.id,
                    "name": task.name,
                    "completed_at": task.completed_at.isoformat(),
                    "duration_hours": (task.completed_at - task.created_at).total_seconds() / 3600
                })
        return sorted(timeline, key=lambda x: x["completed_at"])