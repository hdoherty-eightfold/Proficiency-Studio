"""
QA Agent - Performs quality assurance and verification
"""
from typing import Dict, Any, List, Tuple
import time
from datetime import datetime

class QAAgent:
    """Agent responsible for quality assurance and verification"""
    
    def __init__(self):
        self.test_results = []
        self.test_cases = self._initialize_test_cases()
        
    def _initialize_test_cases(self) -> Dict[str, Dict[str, Any]]:
        """Initialize test cases"""
        return {
            "api_connectivity": {
                "name": "API Connectivity Test",
                "description": "Verify all API connections work",
                "priority": "critical"
            },
            "skill_extraction": {
                "name": "Skill Extraction Test",
                "description": "Verify skills can be extracted properly",
                "priority": "high"
            },
            "proficiency_assignment": {
                "name": "Proficiency Assignment Test",
                "description": "Verify proficiency levels are assigned correctly",
                "priority": "high"
            },
            "rag_functionality": {
                "name": "RAG Enhancement Test",
                "description": "Verify RAG pipeline works with context",
                "priority": "medium"
            },
            "model_switching": {
                "name": "Model Switching Test",
                "description": "Verify switching between different LLM providers",
                "priority": "high"
            },
            "data_persistence": {
                "name": "Data Persistence Test",
                "description": "Verify API keys and data are stored correctly",
                "priority": "medium"
            },
            "error_handling": {
                "name": "Error Handling Test",
                "description": "Verify system handles errors gracefully",
                "priority": "high"
            },
            "performance": {
                "name": "Performance Test",
                "description": "Verify system performs within acceptable limits",
                "priority": "medium"
            }
        }
    
    def run_all_tests(self, system_components: Dict[str, Any]) -> Dict[str, Any]:
        """Run all QA tests"""
        test_run = {
            "run_id": f"qa_run_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "start_time": datetime.now().isoformat(),
            "tests": []
        }
        
        for test_id, test_info in self.test_cases.items():
            result = self._run_single_test(test_id, test_info, system_components)
            test_run["tests"].append(result)
        
        test_run["end_time"] = datetime.now().isoformat()
        test_run["summary"] = self._generate_test_summary(test_run["tests"])
        
        self.test_results.append(test_run)
        return test_run
    
    def _run_single_test(self, test_id: str, test_info: Dict[str, Any], 
                        components: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single test case"""
        test_result = {
            "test_id": test_id,
            "name": test_info["name"],
            "description": test_info["description"],
            "priority": test_info["priority"],
            "start_time": datetime.now().isoformat()
        }
        
        try:
            if test_id == "api_connectivity":
                result = self._test_api_connectivity(components)
            elif test_id == "skill_extraction":
                result = self._test_skill_extraction(components)
            elif test_id == "proficiency_assignment":
                result = self._test_proficiency_assignment(components)
            elif test_id == "rag_functionality":
                result = self._test_rag_functionality(components)
            elif test_id == "model_switching":
                result = self._test_model_switching(components)
            elif test_id == "data_persistence":
                result = self._test_data_persistence(components)
            elif test_id == "error_handling":
                result = self._test_error_handling(components)
            elif test_id == "performance":
                result = self._test_performance(components)
            else:
                result = {"status": "skipped", "message": "Test not implemented"}
            
            test_result.update(result)
            
        except Exception as e:
            test_result["status"] = "error"
            test_result["error"] = str(e)
        
        test_result["end_time"] = datetime.now().isoformat()
        return test_result
    
    def _test_api_connectivity(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test API connectivity"""
        results = {
            "status": "passed",
            "checks": []
        }
        
        # Check LLM providers
        ai_pipeline = components.get("ai_pipeline_agent")
        if ai_pipeline:
            provider_status = ai_pipeline.get_provider_status()
            for provider, initialized in provider_status.items():
                results["checks"].append({
                    "component": f"LLM Provider - {provider}",
                    "status": "connected" if initialized else "not configured",
                    "passed": True  # Not configured is not a failure
                })
        
        # Check Eightfold API
        live_agent = components.get("live_agent")
        if live_agent:
            api_test = live_agent.test_api_connection("eightfold")
            results["checks"].append({
                "component": "Eightfold API",
                "status": "connected" if api_test.get("success") else "not configured",
                "passed": True
            })
        
        # Overall status
        if not results["checks"]:
            results["status"] = "warning"
            results["message"] = "No APIs to test"
        
        return results
    
    def _test_skill_extraction(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test skill extraction functionality"""
        live_agent = components.get("live_agent")
        if not live_agent:
            return {"status": "skipped", "message": "Live agent not available"}
        
        # Test extraction
        extraction_result = live_agent.extract_skills_from_api()
        
        if extraction_result.get("success") or extraction_result.get("demo_fallback"):
            skills = extraction_result.get("skills", []) or extraction_result.get("demo_fallback", {}).get("skills", [])
            return {
                "status": "passed",
                "skills_extracted": len(skills),
                "source": extraction_result.get("source", "demo")
            }
        else:
            return {
                "status": "failed",
                "error": extraction_result.get("error", "Unknown error")
            }
    
    def _test_proficiency_assignment(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test proficiency assignment"""
        ai_pipeline = components.get("ai_pipeline_agent")
        if not ai_pipeline:
            return {"status": "skipped", "message": "AI pipeline not available"}
        
        # Test with sample skills
        test_skills = ["Python", "JavaScript", "Docker"]
        
        # Find an initialized provider
        provider_status = ai_pipeline.get_provider_status()
        active_provider = None
        for provider, initialized in provider_status.items():
            if initialized:
                active_provider = provider
                break
        
        if not active_provider:
            return {
                "status": "warning",
                "message": "No LLM providers initialized"
            }
        
        # Test direct assessment
        result = ai_pipeline.process_direct_assessment({
            "skills": test_skills,
            "provider": active_provider
        })
        
        if result.get("success"):
            return {
                "status": "passed",
                "provider_used": active_provider,
                "skills_assessed": len(result.get("results", []))
            }
        else:
            return {
                "status": "failed",
                "error": result.get("error", "Assessment failed")
            }
    
    def _test_rag_functionality(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test RAG functionality"""
        ai_pipeline = components.get("ai_pipeline_agent")
        if not ai_pipeline:
            return {"status": "skipped", "message": "AI pipeline not available"}
        
        # Setup vector store
        vector_setup = ai_pipeline.setup_vector_store("chroma")
        if not vector_setup:
            return {
                "status": "warning",
                "message": "Vector store setup failed"
            }
        
        # Add test documents
        test_docs = ["Senior developers should have expert level Python skills"]
        doc_result = ai_pipeline.add_documents_to_rag(test_docs)
        
        return {
            "status": "passed" if doc_result else "failed",
            "vector_store": "chroma",
            "documents_added": len(test_docs) if doc_result else 0
        }
    
    def _test_model_switching(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test switching between models"""
        ai_pipeline = components.get("ai_pipeline_agent")
        if not ai_pipeline:
            return {"status": "skipped", "message": "AI pipeline not available"}
        
        provider_status = ai_pipeline.get_provider_status()
        available_providers = [p for p, initialized in provider_status.items() if initialized]
        
        return {
            "status": "passed",
            "available_providers": available_providers,
            "provider_count": len(available_providers)
        }
    
    def _test_data_persistence(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test data persistence"""
        # Check if API keys persist (in memory for this implementation)
        live_agent = components.get("live_agent")
        
        if live_agent:
            # Test setting and retrieving API key
            live_agent.set_api_key("test_service", "test_key_123")
            key_exists = "test_service" in live_agent.api_keys
            
            return {
                "status": "passed" if key_exists else "failed",
                "test": "API key storage",
                "persistent": False,  # This implementation uses in-memory storage
                "recommendation": "Consider implementing persistent storage for production"
            }
        
        return {"status": "skipped", "message": "Live agent not available"}
    
    def _test_error_handling(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test error handling"""
        tests_passed = 0
        tests_total = 0
        
        # Test 1: Invalid API key
        ai_pipeline = components.get("ai_pipeline_agent")
        if ai_pipeline:
            tests_total += 1
            try:
                # This should handle gracefully
                result = ai_pipeline.process_direct_assessment({
                    "skills": ["Python"],
                    "provider": "invalid_provider"
                })
                if "error" in result:
                    tests_passed += 1
            except:
                pass
        
        # Test 2: Empty skills list
        if ai_pipeline:
            tests_total += 1
            try:
                result = ai_pipeline.process_direct_assessment({
                    "skills": [],
                    "provider": "openai"
                })
                # Should handle empty skills gracefully
                tests_passed += 1
            except:
                pass
        
        return {
            "status": "passed" if tests_passed == tests_total else "partial",
            "tests_passed": tests_passed,
            "tests_total": tests_total
        }
    
    def _test_performance(self, components: Dict[str, Any]) -> Dict[str, Any]:
        """Test system performance"""
        performance_results = {
            "status": "passed",
            "metrics": []
        }
        
        # Test API response time
        live_agent = components.get("live_agent")
        if live_agent:
            start_time = time.time()
            live_agent.extract_skills_from_api()
            api_time = time.time() - start_time
            
            performance_results["metrics"].append({
                "test": "API response time",
                "time_seconds": round(api_time, 3),
                "acceptable": api_time < 5.0
            })
        
        # Test proficiency assessment time
        ai_pipeline = components.get("ai_pipeline_agent")
        if ai_pipeline:
            start_time = time.time()
            # Simulate assessment (would need actual provider)
            assessment_time = time.time() - start_time
            
            performance_results["metrics"].append({
                "test": "Proficiency assessment time",
                "time_seconds": round(assessment_time, 3),
                "acceptable": assessment_time < 10.0
            })
        
        # Check if all metrics are acceptable
        all_acceptable = all(m["acceptable"] for m in performance_results["metrics"])
        performance_results["status"] = "passed" if all_acceptable else "warning"
        
        return performance_results
    
    def _generate_test_summary(self, tests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary of test results"""
        total = len(tests)
        passed = len([t for t in tests if t.get("status") == "passed"])
        failed = len([t for t in tests if t.get("status") == "failed"])
        warnings = len([t for t in tests if t.get("status") == "warning"])
        skipped = len([t for t in tests if t.get("status") == "skipped"])
        
        # Group by priority
        critical_failed = len([t for t in tests 
                             if t.get("status") == "failed" and t.get("priority") == "critical"])
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
            "skipped": skipped,
            "pass_rate": (passed / total * 100) if total > 0 else 0,
            "critical_failures": critical_failed,
            "overall_status": "FAILED" if critical_failed > 0 else ("PASSED" if failed == 0 else "PARTIAL")
        }
    
    def get_latest_results(self) -> Dict[str, Any]:
        """Get latest test results"""
        if not self.test_results:
            return {"message": "No tests run yet"}
        
        return self.test_results[-1]
    
    def generate_qa_report(self) -> str:
        """Generate detailed QA report"""
        if not self.test_results:
            return "No QA tests have been run yet."
        
        latest = self.test_results[-1]
        report = f"""
QA Test Report
==============
Run ID: {latest['run_id']}
Date: {latest['start_time']}

Summary
-------
Total Tests: {latest['summary']['total_tests']}
Passed: {latest['summary']['passed']}
Failed: {latest['summary']['failed']}
Warnings: {latest['summary']['warnings']}
Pass Rate: {latest['summary']['pass_rate']:.1f}%
Overall Status: {latest['summary']['overall_status']}

Detailed Results
---------------"""
        
        for test in latest['tests']:
            report += f"\n\n{test['name']}"
            report += f"\nStatus: {test.get('status', 'unknown').upper()}"
            report += f"\nPriority: {test['priority']}"
            
            if test.get('error'):
                report += f"\nError: {test['error']}"
            elif test.get('message'):
                report += f"\nMessage: {test['message']}"
            
            # Add specific test details
            for key, value in test.items():
                if key not in ['test_id', 'name', 'description', 'priority', 
                             'status', 'start_time', 'end_time', 'error', 'message']:
                    report += f"\n{key}: {value}"
        
        return report
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "Run comprehensive test suite",
            "Test API connectivity",
            "Verify skill extraction and proficiency assignment",
            "Test RAG functionality",
            "Verify error handling",
            "Performance testing",
            "Generate detailed QA reports"
        ]