"""
Configuration Storage Manager for Eightfold Environments
Handles saving, loading, and managing authentication configurations
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path
from pydantic import BaseModel, Field

class EightfoldEnvironment(BaseModel):
    """Model for Eightfold environment configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    api_url: str
    environment_type: str = Field(default="sandbox")  # sandbox, production, dev
    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.now)
    last_used: Optional[datetime] = None

    # Authentication details
    username: Optional[str] = None
    password_hash: Optional[str] = None  # Store hashed for security
    auth_header: Optional[str] = None
    grant_type: str = Field(default="password")

    # Metadata
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    connection_status: Optional[str] = None  # "connected", "failed", "untested"
    last_test: Optional[datetime] = None

class ConfigTemplate(BaseModel):
    """Predefined configuration templates"""
    id: str
    name: str
    description: str
    category: str  # "sandbox", "production", "demo"
    template_data: Dict[str, Any]
    is_system: bool = Field(default=True)  # System vs user-created

class ConfigStorage:
    """Manages configuration storage with JSON persistence"""

    def __init__(self, storage_dir: str = "config_data"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.env_file = self.storage_dir / "environments.json"
        self.templates_file = self.storage_dir / "templates.json"
        self._init_default_templates()

    def _init_default_templates(self):
        """Initialize default configuration templates"""
        default_templates = [
            {
                "id": "adoherty-demo",
                "name": "ADoherty Demo Environment",
                "description": "Standard ADoherty demo sandbox configuration",
                "category": "sandbox",
                "template_data": {
                    "name": "ADoherty Demo",
                    "description": "ADoherty Demo Environment",
                    "api_url": "https://apiv2.eightfold.ai",
                    "environment_type": "sandbox",
                    "username": "demo@eightfolddemo-adoherty.com",
                    "grant_type": "password"
                },
                "is_system": True
            },
            {
                "id": "test-sandbox",
                "name": "Test Sandbox",
                "description": "Generic test sandbox configuration",
                "category": "sandbox",
                "template_data": {
                    "name": "Test Sandbox",
                    "description": "Test Environment",
                    "api_url": "https://apiv2.eightfold.ai",
                    "environment_type": "sandbox",
                    "grant_type": "password"
                },
                "is_system": True
            },
            {
                "id": "production-template",
                "name": "Production Template",
                "description": "Production environment template (credentials required)",
                "category": "production",
                "template_data": {
                    "name": "Production",
                    "description": "Production Environment",
                    "api_url": "https://api.eightfold.ai",
                    "environment_type": "production",
                    "grant_type": "authorization_code"
                },
                "is_system": True
            }
        ]

        if not self.templates_file.exists():
            self.save_templates(default_templates)

    def save_environment(self, env: EightfoldEnvironment) -> str:
        """Save an environment configuration"""
        environments = self.load_environments()

        # Check if this is an update or new config
        existing_index = None
        for i, existing in enumerate(environments):
            if existing["id"] == env.id:
                existing_index = i
                break

        env_dict = env.dict()
        env_dict["created_at"] = env_dict["created_at"].isoformat()
        if env_dict["last_used"]:
            env_dict["last_used"] = env_dict["last_used"].isoformat()
        if env_dict["last_test"]:
            env_dict["last_test"] = env_dict["last_test"].isoformat()

        if existing_index is not None:
            environments[existing_index] = env_dict
        else:
            environments.append(env_dict)

        # Handle default setting
        if env.is_default:
            for e in environments:
                if e["id"] != env.id:
                    e["is_default"] = False

        self._save_environments_file(environments)
        return env.id

    def load_environments(self) -> List[Dict]:
        """Load all environment configurations"""
        if not self.env_file.exists():
            return []

        try:
            with open(self.env_file, 'r') as f:
                environments = json.load(f)

                # Convert datetime strings back to datetime objects for processing
                for env in environments:
                    if env.get("created_at"):
                        env["created_at"] = datetime.fromisoformat(env["created_at"])
                    if env.get("last_used"):
                        env["last_used"] = datetime.fromisoformat(env["last_used"])
                    if env.get("last_test"):
                        env["last_test"] = datetime.fromisoformat(env["last_test"])

                return environments
        except Exception as e:
            print(f"Error loading environments: {e}")
            return []

    def get_environment(self, env_id: str) -> Optional[EightfoldEnvironment]:
        """Get a specific environment by ID"""
        environments = self.load_environments()
        for env_data in environments:
            if env_data["id"] == env_id:
                return EightfoldEnvironment(**env_data)
        return None

    def delete_environment(self, env_id: str) -> bool:
        """Delete an environment configuration"""
        environments = self.load_environments()
        original_count = len(environments)
        environments = [e for e in environments if e["id"] != env_id]

        if len(environments) < original_count:
            self._save_environments_file(environments)
            return True
        return False

    def get_default_environment(self) -> Optional[EightfoldEnvironment]:
        """Get the default environment"""
        environments = self.load_environments()
        for env_data in environments:
            if env_data.get("is_default", False):
                return EightfoldEnvironment(**env_data)

        # If no default, return the first one
        if environments:
            return EightfoldEnvironment(**environments[0])
        return None

    def update_connection_status(self, env_id: str, status: str, test_time: datetime = None):
        """Update connection status for an environment"""
        env = self.get_environment(env_id)
        if env:
            env.connection_status = status
            env.last_test = test_time or datetime.now()
            env.last_used = datetime.now()
            self.save_environment(env)

    def save_templates(self, templates: List[Dict]):
        """Save configuration templates"""
        with open(self.templates_file, 'w') as f:
            json.dump(templates, f, indent=2)

    def load_templates(self) -> List[ConfigTemplate]:
        """Load configuration templates"""
        if not self.templates_file.exists():
            return []

        try:
            with open(self.templates_file, 'r') as f:
                templates_data = json.load(f)
                return [ConfigTemplate(**t) for t in templates_data]
        except Exception as e:
            print(f"Error loading templates: {e}")
            return []

    def create_from_template(self, template_id: str, custom_data: Dict[str, Any] = None) -> Optional[EightfoldEnvironment]:
        """Create a new environment from a template"""
        templates = self.load_templates()
        template = next((t for t in templates if t.id == template_id), None)

        if not template:
            return None

        # Merge template data with custom overrides
        env_data = template.template_data.copy()
        if custom_data:
            env_data.update(custom_data)

        # Ensure we have a unique ID
        env_data["id"] = str(uuid.uuid4())

        return EightfoldEnvironment(**env_data)

    def export_configuration(self, env_ids: List[str] = None) -> Dict[str, Any]:
        """Export configurations for backup/sharing"""
        environments = self.load_environments()

        if env_ids:
            environments = [e for e in environments if e["id"] in env_ids]

        # Remove sensitive data for export
        export_data = []
        for env in environments:
            export_env = env.copy()
            # Remove sensitive fields
            export_env.pop("password_hash", None)
            export_env.pop("username", None)
            export_env.pop("auth_header", None)
            export_data.append(export_env)

        return {
            "export_date": datetime.now().isoformat(),
            "version": "1.0",
            "environments": export_data
        }

    def import_configuration(self, import_data: Dict[str, Any], overwrite: bool = False) -> List[str]:
        """Import configurations from backup/sharing"""
        imported_ids = []

        if "environments" not in import_data:
            return imported_ids

        existing_environments = self.load_environments()
        existing_ids = {e["id"] for e in existing_environments}

        for env_data in import_data["environments"]:
            # Generate new ID if conflict and not overwriting
            if env_data["id"] in existing_ids and not overwrite:
                env_data["id"] = str(uuid.uuid4())

            # Create environment object and save
            try:
                env = EightfoldEnvironment(**env_data)
                self.save_environment(env)
                imported_ids.append(env.id)
            except Exception as e:
                print(f"Error importing environment {env_data.get('name', 'Unknown')}: {e}")
                continue

        return imported_ids

    def _save_environments_file(self, environments: List[Dict]):
        """Internal method to save environments to file"""
        # Convert datetime objects to strings for JSON serialization
        serializable_envs = []
        for env in environments:
            env_copy = env.copy()
            if isinstance(env_copy.get("created_at"), datetime):
                env_copy["created_at"] = env_copy["created_at"].isoformat()
            if isinstance(env_copy.get("last_used"), datetime):
                env_copy["last_used"] = env_copy["last_used"].isoformat()
            if isinstance(env_copy.get("last_test"), datetime):
                env_copy["last_test"] = env_copy["last_test"].isoformat()
            serializable_envs.append(env_copy)

        with open(self.env_file, 'w') as f:
            json.dump(serializable_envs, f, indent=2)

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        environments = self.load_environments()
        templates = self.load_templates()

        env_types = {}
        for env in environments:
            env_type = env.get("environment_type", "unknown")
            env_types[env_type] = env_types.get(env_type, 0) + 1

        return {
            "total_environments": len(environments),
            "total_templates": len(templates),
            "environment_types": env_types,
            "has_default": any(e.get("is_default", False) for e in environments),
            "storage_path": str(self.storage_dir)
        }