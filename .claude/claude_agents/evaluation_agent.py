"""
Evaluation Agent - Compares different assessment approaches
"""
from typing import Dict, Any, List, Tuple
import time
from datetime import datetime
import numpy as np

class EvaluationAgent:
    """Agent responsible for evaluating and comparing different approaches"""
    
    def __init__(self):
        self.evaluation_history = []
        self.metrics = {
            "accuracy": [],
            "consistency": [],
            "reasoning_quality": [],
            "performance": [],
            "cost_estimate": []
        }
        
    def compare_approaches(self, 
                         direct_result: Dict[str, Any],
                         rag_result: Dict[str, Any],
                         barebones_result: Dict[str, Any] = None) -> Dict[str, Any]:
        """Compare results from different approaches"""
        
        comparison = {
            "timestamp": datetime.now().isoformat(),
            "approaches_compared": [],
            "detailed_comparison": {},
            "recommendations": []
        }
        
        # Add approaches to comparison
        if direct_result:
            comparison["approaches_compared"].append("direct")
            comparison["detailed_comparison"]["direct"] = self._analyze_result(direct_result)
            
        if rag_result:
            comparison["approaches_compared"].append("rag_enhanced")
            comparison["detailed_comparison"]["rag_enhanced"] = self._analyze_result(rag_result)
            
        if barebones_result:
            comparison["approaches_compared"].append("barebones")
            comparison["detailed_comparison"]["barebones"] = self._analyze_result(barebones_result)
        
        # Compare proficiency assignments
        if len(comparison["approaches_compared"]) >= 2:
            comparison["proficiency_differences"] = self._compare_proficiencies(
                direct_result, rag_result, barebones_result
            )
            
            # Calculate agreement score
            comparison["agreement_score"] = self._calculate_agreement(
                direct_result, rag_result, barebones_result
            )
            
            # Analyze reasoning quality
            comparison["reasoning_analysis"] = self._analyze_reasoning_quality(
                direct_result, rag_result, barebones_result
            )
        
        # Generate recommendations
        comparison["recommendations"] = self._generate_recommendations(comparison)
        
        # Store in history
        self.evaluation_history.append(comparison)
        
        return comparison
    
    def _analyze_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single result"""
        if not result.get("success", False):
            return {"error": result.get("error", "Unknown error")}
            
        analysis = {
            "method": result.get("method", "unknown"),
            "provider": result.get("provider", "unknown"),
            "skill_count": len(result.get("results", [])),
            "proficiency_distribution": self._get_proficiency_distribution(result),
            "has_reasoning": all(r.get("reasoning", "").strip() for r in result.get("results", [])),
            "context_used": result.get("context_used", False)
        }
        
        # Estimate quality metrics
        analysis["estimated_accuracy"] = self._estimate_accuracy(result)
        analysis["reasoning_quality_score"] = self._score_reasoning_quality(result)
        
        return analysis
    
    def _get_proficiency_distribution(self, result: Dict[str, Any]) -> Dict[str, int]:
        """Get distribution of proficiency levels"""
        distribution = {
            "Novice": 0,
            "Developing": 0,
            "Intermediate": 0,
            "Advanced": 0,
            "Expert": 0,
            "Not assigned": 0
        }
        
        for skill_result in result.get("results", []):
            prof = skill_result.get("proficiency", "Not assigned")
            if prof in distribution:
                distribution[prof] += 1
                
        return distribution
    
    def _compare_proficiencies(self, direct: Dict, rag: Dict, barebones: Dict = None) -> Dict[str, Any]:
        """Compare proficiency assignments across methods"""
        differences = {
            "total_differences": 0,
            "skill_differences": []
        }
        
        # Get results from each method
        direct_results = {r["skill"]: r for r in direct.get("results", [])}
        rag_results = {r["skill"]: r for r in rag.get("results", [])}
        barebones_results = {r["skill"]: r for r in barebones.get("results", [])} if barebones else {}
        
        # Compare each skill
        all_skills = set(direct_results.keys()) | set(rag_results.keys()) | set(barebones_results.keys())
        
        for skill in all_skills:
            skill_diff = {"skill": skill, "assignments": {}}
            
            if skill in direct_results:
                skill_diff["assignments"]["direct"] = direct_results[skill]["proficiency"]
            if skill in rag_results:
                skill_diff["assignments"]["rag_enhanced"] = rag_results[skill]["proficiency"]
            if skill in barebones_results:
                skill_diff["assignments"]["barebones"] = barebones_results[skill]["proficiency"]
            
            # Check if there are differences
            unique_assignments = set(skill_diff["assignments"].values())
            if len(unique_assignments) > 1:
                differences["total_differences"] += 1
                skill_diff["has_difference"] = True
                differences["skill_differences"].append(skill_diff)
        
        return differences
    
    def _calculate_agreement(self, direct: Dict, rag: Dict, barebones: Dict = None) -> float:
        """Calculate agreement score between methods"""
        total_skills = 0
        agreements = 0
        
        direct_results = {r["skill"]: r["proficiency"] for r in direct.get("results", [])}
        rag_results = {r["skill"]: r["proficiency"] for r in rag.get("results", [])}
        
        for skill in direct_results:
            if skill in rag_results:
                total_skills += 1
                if direct_results[skill] == rag_results[skill]:
                    agreements += 1
        
        if barebones:
            barebones_results = {r["skill"]: r["proficiency"] for r in barebones.get("results", [])}
            # Calculate three-way agreement
            three_way_total = 0
            three_way_agreements = 0
            
            for skill in direct_results:
                if skill in rag_results and skill in barebones_results:
                    three_way_total += 1
                    if (direct_results[skill] == rag_results[skill] == barebones_results[skill]):
                        three_way_agreements += 1
            
            if three_way_total > 0:
                return three_way_agreements / three_way_total
        
        return agreements / total_skills if total_skills > 0 else 0
    
    def _analyze_reasoning_quality(self, direct: Dict, rag: Dict, barebones: Dict = None) -> Dict[str, Any]:
        """Analyze the quality of reasoning across methods"""
        analysis = {
            "direct": self._assess_reasoning_set(direct.get("results", [])),
            "rag_enhanced": self._assess_reasoning_set(rag.get("results", []))
        }
        
        if barebones:
            analysis["barebones"] = self._assess_reasoning_set(barebones.get("results", []))
        
        # Compare reasoning characteristics
        if rag.get("context_used"):
            analysis["rag_context_impact"] = "RAG method provided context-aware reasoning"
        
        return analysis
    
    def _assess_reasoning_set(self, results: List[Dict]) -> Dict[str, Any]:
        """Assess quality of reasoning for a set of results"""
        if not results:
            return {"quality": "N/A", "characteristics": []}
            
        total_length = 0
        has_context_reference = 0
        has_specific_criteria = 0
        
        for result in results:
            reasoning = result.get("reasoning", "")
            total_length += len(reasoning)
            
            if "context" in reasoning.lower() or "document" in reasoning.lower():
                has_context_reference += 1
            if any(word in reasoning.lower() for word in ["years", "experience", "industry", "standard"]):
                has_specific_criteria += 1
        
        avg_length = total_length / len(results) if results else 0
        
        return {
            "average_length": avg_length,
            "context_references": has_context_reference,
            "specific_criteria": has_specific_criteria,
            "quality_score": self._calculate_reasoning_score(avg_length, has_specific_criteria, len(results))
        }
    
    def _calculate_reasoning_score(self, avg_length: float, specific_criteria: int, total: int) -> float:
        """Calculate a quality score for reasoning"""
        # Simple scoring: longer reasoning with specific criteria is better
        length_score = min(avg_length / 100, 1.0)  # Cap at 100 chars average
        criteria_score = specific_criteria / total if total > 0 else 0
        
        return (length_score + criteria_score) / 2
    
    def _estimate_accuracy(self, result: Dict[str, Any]) -> float:
        """Estimate accuracy based on result characteristics"""
        # This is a placeholder - in real implementation, you'd compare against ground truth
        score = 0.7  # Base score
        
        if result.get("context_used"):
            score += 0.1
        if all(r.get("reasoning", "").strip() for r in result.get("results", [])):
            score += 0.1
        if result.get("provider") in ["gpt-4", "claude-3-opus"]:
            score += 0.1
            
        return min(score, 1.0)
    
    def _score_reasoning_quality(self, result: Dict[str, Any]) -> float:
        """Score the quality of reasoning in results"""
        results = result.get("results", [])
        if not results:
            return 0.0
            
        total_score = 0
        for r in results:
            reasoning = r.get("reasoning", "")
            score = 0
            
            # Length check
            if len(reasoning) > 50:
                score += 0.3
            if len(reasoning) > 100:
                score += 0.2
                
            # Content quality indicators
            quality_indicators = ["because", "due to", "based on", "considering", "given"]
            if any(indicator in reasoning.lower() for indicator in quality_indicators):
                score += 0.3
                
            # Specific criteria mentioned
            if any(word in reasoning.lower() for word in ["experience", "skill level", "industry"]):
                score += 0.2
                
            total_score += score
            
        return total_score / len(results)
    
    def _generate_recommendations(self, comparison: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on comparison"""
        recommendations = []
        
        # Check agreement score
        agreement = comparison.get("agreement_score", 0)
        if agreement < 0.7:
            recommendations.append("Low agreement between methods. Consider reviewing proficiency criteria.")
        
        # Check reasoning quality
        reasoning = comparison.get("reasoning_analysis", {})
        if reasoning.get("rag_enhanced", {}).get("quality_score", 0) > reasoning.get("direct", {}).get("quality_score", 0):
            recommendations.append("RAG-enhanced method provides better reasoning. Use when accuracy is critical.")
        
        # Check for specific improvements
        if comparison.get("detailed_comparison", {}).get("rag_enhanced", {}).get("context_used"):
            recommendations.append("Context documents improve assessment quality. Maintain updated context library.")
        
        # Performance vs accuracy trade-off
        recommendations.append("For quick assessments, use direct method. For critical decisions, use RAG-enhanced.")
        
        return recommendations
    
    def get_evaluation_summary(self) -> Dict[str, Any]:
        """Get summary of all evaluations"""
        if not self.evaluation_history:
            return {"message": "No evaluations performed yet"}
            
        return {
            "total_evaluations": len(self.evaluation_history),
            "average_agreement": np.mean([e.get("agreement_score", 0) for e in self.evaluation_history]),
            "methods_evaluated": list(set(
                method for e in self.evaluation_history 
                for method in e.get("approaches_compared", [])
            )),
            "latest_evaluation": self.evaluation_history[-1]
        }
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities"""
        return [
            "Compare proficiency assignments across methods",
            "Analyze reasoning quality",
            "Calculate agreement scores",
            "Generate recommendations",
            "Track evaluation history"
        ]