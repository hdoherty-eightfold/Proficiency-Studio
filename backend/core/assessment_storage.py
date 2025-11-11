"""
Assessment Storage Manager
Handles saving and loading assessment results to/from disk
"""

import os
import json
import glob
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

class AssessmentStorage:
    def __init__(self, storage_dir: str = "assessment_history"):
        """Initialize assessment storage with specified directory"""
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
    
    def save_assessment(self, assessment_data: dict) -> str:
        """
        Save assessment to disk with descriptive filename
        Returns the filename that was created
        """
        # Extract metadata for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        environment = assessment_data.get('environment', 'unknown').replace(' ', '_').replace('(', '').replace(')', '')
        
        # Clean up model string for filename (remove slashes and special chars)
        model = assessment_data.get('model', 'unknown')
        model = model.replace('/', '_').replace('\\', '_').replace(' ', '_')
        
        skill_count = len(assessment_data.get('skills', []))
        
        # Create descriptive filename
        filename = f"assessment_{timestamp}_{environment}_{model}_{skill_count}skills.json"
        filepath = self.storage_dir / filename
        
        # Add metadata to the assessment
        assessment_data['_metadata'] = {
            'saved_at': datetime.now().isoformat(),
            'filename': filename,
            'filepath': str(filepath)
        }
        
        # Save to disk
        with open(filepath, 'w') as f:
            json.dump(assessment_data, f, indent=2)
        
        return filename
    
    def list_assessments(self, limit: int = 50) -> List[Dict]:
        """
        List all saved assessments with metadata
        Returns list sorted by date (newest first)
        """
        assessments = []
        
        # Find all JSON files in the storage directory
        pattern = str(self.storage_dir / "assessment_*.json")
        files = glob.glob(pattern)
        
        for filepath in files:
            try:
                # Extract metadata from filename
                filename = os.path.basename(filepath)
                parts = filename.replace('.json', '').split('_')
                
                # Get file stats
                stat = os.stat(filepath)
                file_size = stat.st_size
                modified_time = datetime.fromtimestamp(stat.st_mtime)
                
                # Try to parse date from filename
                if len(parts) >= 3:
                    date_str = parts[1]  # YYYYMMDD
                    time_str = parts[2]  # HHMMSS
                    try:
                        file_date = datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
                    except:
                        file_date = modified_time
                else:
                    file_date = modified_time
                
                # Extract other metadata from filename
                environment = parts[3] if len(parts) > 3 else 'unknown'
                model = parts[4] if len(parts) > 4 else 'unknown'
                
                # Extract skill count if present
                skill_count = 0
                for part in parts:
                    if 'skills' in part:
                        try:
                            skill_count = int(part.replace('skills', ''))
                        except:
                            pass
                
                # Read file to get additional metadata
                try:
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                        # Handle different JSON formats
                        if 'assessments' in data and 'provider' in data:
                            # LangChain format (like TM-sandbox.json)
                            actual_env = 'tm-sandbox' if 'TM-sandbox' in filename else environment
                            actual_model = f"{data.get('provider', 'openai')}/chatgpt-4o-latest"
                            actual_skills = len(data.get('assessments', []))
                            processing_time = 0  # Not stored in this format
                        else:
                            # Standard format
                            actual_env = data.get('environment', environment)
                            actual_model = data.get('model', model)
                            actual_skills = len(data.get('skills', []))
                            processing_time = data.get('statistics', {}).get('processing_time', 0)
                except:
                    actual_env = environment
                    actual_model = model
                    actual_skills = skill_count
                    processing_time = 0
                
                assessments.append({
                    'filename': filename,
                    'filepath': filepath,
                    'date': file_date.isoformat(),
                    'date_display': file_date.strftime("%Y-%m-%d %H:%M:%S"),
                    'environment': actual_env,
                    'model': actual_model,
                    'skill_count': actual_skills,
                    'file_size': file_size,
                    'processing_time': processing_time
                })
            except Exception as e:
                print(f"Error processing file {filepath}: {e}")
                continue
        
        # Sort by date (newest first)
        assessments.sort(key=lambda x: x['date'], reverse=True)
        
        # Limit results
        return assessments[:limit]
    
    def load_assessment(self, filename: str) -> Optional[dict]:
        """Load a specific assessment by filename"""
        filepath = self.storage_dir / filename
        
        if not filepath.exists():
            return None
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                
                # Handle different JSON formats (like your TM-sandbox.json)
                if 'assessments' in data and not 'skills':
                    # Convert from LangChain format to standard format
                    data['skills'] = data.get('assessments', [])
                    data['environment'] = filename.replace('.json', '').replace('_', ' ')
                    data['model'] = data.get('provider', 'unknown') + '/chatgpt-4o-latest'
                
                return data
        except Exception as e:
            print(f"Error loading assessment {filename}: {e}")
            return None
    
    def delete_assessment(self, filename: str) -> bool:
        """Delete a specific assessment file"""
        filepath = self.storage_dir / filename
        
        # Also check claude_agents directory for backward compatibility
        if not filepath.exists():
            claude_agents_dir = Path("claude_agents")
            filepath = claude_agents_dir / filename
        
        if not filepath.exists():
            return False
        
        try:
            os.remove(filepath)
            return True
        except Exception as e:
            print(f"Error deleting assessment {filename}: {e}")
            return False
    
    def get_storage_info(self) -> dict:
        """Get information about storage usage"""
        assessments = self.list_assessments(limit=1000)
        total_size = sum(a['file_size'] for a in assessments)
        
        return {
            'storage_dir': str(self.storage_dir),
            'total_assessments': len(assessments),
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'oldest_assessment': assessments[-1]['date_display'] if assessments else None,
            'newest_assessment': assessments[0]['date_display'] if assessments else None
        }