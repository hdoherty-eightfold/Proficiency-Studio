#!/usr/bin/env python3
"""
Batch Performance Testing Script
Tests different batch configurations to measure actual API response times
"""

import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict, Any
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.langchain_service import LangChainService
from core.llm_service import LLMService
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BatchPerformanceTester:
    def __init__(self, provider: str = "google", api_key: str = None):
        self.provider = provider
        self.api_key = api_key or os.getenv('GOOGLE_API_KEY')
        self.langchain_service = LangChainService()
        self.llm_service = LLMService()
        self.results = []

    def generate_test_skills(self, count: int) -> List[Dict]:
        """Generate a list of test skills"""
        skills = []
        # Use real skill names for realistic testing
        skill_templates = [
            "Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "MongoDB",
            "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Machine Learning", "Deep Learning",
            "Data Analysis", "Data Visualization", "Git", "CI/CD", "Agile", "Scrum",
            "Project Management", "Communication", "Leadership", "Problem Solving", "Critical Thinking",
            "Java", "C++", "C#", "Go", "Rust", "Swift", "Kotlin", "Ruby", "PHP", "Scala",
            "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn", "FastAPI", "Django", "Flask",
            "REST API", "GraphQL", "Microservices", "System Design", "Database Design", "Security",
            "DevOps", "Linux", "Windows Server", "Networking", "Cloud Architecture"
        ]

        for i in range(count):
            skill_name = f"{skill_templates[i % len(skill_templates)]}"
            if i >= len(skill_templates):
                skill_name += f" {i // len(skill_templates)}"
            skills.append({"name": skill_name, "skill_name": skill_name})

        return skills

    async def test_single_batch(self, skill_count: int) -> Dict[str, Any]:
        """Test processing all skills in a single batch"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Testing SINGLE BATCH with {skill_count} skills")
        logger.info(f"{'='*60}")

        skills = self.generate_test_skills(skill_count)

        # Configure for single batch
        config = {
            "batch_size": skill_count,  # All skills in one batch
            "concurrent_batches": 1,
            "processing_mode": "sequential"
        }

        start_time = time.time()
        logger.info(f"Start time: {datetime.now().strftime('%H:%M:%S')}")
        logger.info(f"Configuration: {config}")
        logger.info(f"Sending {skill_count} skills to {self.provider} API...")

        try:
            # Update API keys
            if self.api_key:
                self.langchain_service.update_api_keys({self.provider: self.api_key})

            # Run assessment
            result = self.langchain_service.assess_with_langchain(
                skills=skills,
                resume_text="",  # No resume for simple proficiency assignment
                provider=self.provider,
                api_key=self.api_key,
                model="gemini-2.5-pro" if self.provider == "google" else None,
                batch_size=config["batch_size"],
                concurrent_batches=config["concurrent_batches"],
                processing_mode=config["processing_mode"]
            )

            end_time = time.time()
            duration = end_time - start_time

            test_result = {
                "test_name": f"Single Batch ({skill_count} skills)",
                "configuration": config,
                "skill_count": skill_count,
                "start_time": datetime.fromtimestamp(start_time).isoformat(),
                "end_time": datetime.fromtimestamp(end_time).isoformat(),
                "duration_seconds": round(duration, 2),
                "duration_minutes": round(duration / 60, 2),
                "success": result.get("success", False),
                "assessed_count": len(result.get("assessed_skills", [])),
                "errors": result.get("errors", [])
            }

            logger.info(f"End time: {datetime.now().strftime('%H:%M:%S')}")
            logger.info(f"Duration: {test_result['duration_minutes']:.2f} minutes")
            logger.info(f"Skills assessed: {test_result['assessed_count']}/{skill_count}")
            logger.info(f"Success rate: {(test_result['assessed_count']/skill_count)*100:.1f}%")

            # Save individual test result
            self.save_test_result(test_result, f"test_single_batch_{skill_count}_skills.json")

            return test_result

        except Exception as e:
            logger.error(f"Test failed: {str(e)}")
            return {
                "test_name": f"Single Batch ({skill_count} skills)",
                "configuration": config,
                "error": str(e),
                "success": False
            }

    async def test_parallel_batches(self, skill_count: int, batch_size: int, concurrent: int = 2) -> Dict[str, Any]:
        """Test processing skills in parallel batches"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Testing PARALLEL BATCHES with {skill_count} skills")
        logger.info(f"{'='*60}")

        skills = self.generate_test_skills(skill_count)

        # Configure for parallel batches
        config = {
            "batch_size": batch_size,
            "concurrent_batches": concurrent,
            "processing_mode": "parallel"
        }

        num_batches = (skill_count + batch_size - 1) // batch_size

        start_time = time.time()
        logger.info(f"Start time: {datetime.now().strftime('%H:%M:%S')}")
        logger.info(f"Configuration: {config}")
        logger.info(f"Will process {num_batches} batches of {batch_size} skills each")
        logger.info(f"Concurrent batches: {concurrent}")
        logger.info(f"Sending {skill_count} skills to {self.provider} API...")

        try:
            # Update API keys
            if self.api_key:
                self.langchain_service.update_api_keys({self.provider: self.api_key})

            # Run assessment
            result = self.langchain_service.assess_with_langchain(
                skills=skills,
                resume_text="",
                provider=self.provider,
                api_key=self.api_key,
                model="gemini-2.5-pro" if self.provider == "google" else None,
                batch_size=config["batch_size"],
                concurrent_batches=config["concurrent_batches"],
                processing_mode=config["processing_mode"]
            )

            end_time = time.time()
            duration = end_time - start_time

            test_result = {
                "test_name": f"Parallel Batches ({skill_count} skills, {batch_size} per batch, {concurrent} concurrent)",
                "configuration": config,
                "skill_count": skill_count,
                "num_batches": num_batches,
                "start_time": datetime.fromtimestamp(start_time).isoformat(),
                "end_time": datetime.fromtimestamp(end_time).isoformat(),
                "duration_seconds": round(duration, 2),
                "duration_minutes": round(duration / 60, 2),
                "success": result.get("success", False),
                "assessed_count": len(result.get("assessed_skills", [])),
                "errors": result.get("errors", [])
            }

            logger.info(f"End time: {datetime.now().strftime('%H:%M:%S')}")
            logger.info(f"Duration: {test_result['duration_minutes']:.2f} minutes")
            logger.info(f"Skills assessed: {test_result['assessed_count']}/{skill_count}")
            logger.info(f"Success rate: {(test_result['assessed_count']/skill_count)*100:.1f}%")

            # Save individual test result
            filename = f"test_parallel_{skill_count}_skills_{batch_size}batch_{concurrent}concurrent.json"
            self.save_test_result(test_result, filename)

            return test_result

        except Exception as e:
            logger.error(f"Test failed: {str(e)}")
            return {
                "test_name": f"Parallel Batches ({skill_count} skills)",
                "configuration": config,
                "error": str(e),
                "success": False
            }

    def save_test_result(self, result: Dict, filename: str):
        """Save test result to file"""
        filepath = os.path.join("benchmark_results", filename)
        os.makedirs("benchmark_results", exist_ok=True)

        with open(filepath, 'w') as f:
            json.dump(result, f, indent=2)

        logger.info(f"Test result saved to: {filepath}")

    def compare_results(self, results: List[Dict]):
        """Compare and analyze test results"""
        logger.info(f"\n{'='*60}")
        logger.info("PERFORMANCE COMPARISON")
        logger.info(f"{'='*60}\n")

        comparison = {
            "test_date": datetime.now().isoformat(),
            "provider": self.provider,
            "tests": results,
            "summary": {}
        }

        for result in results:
            if result.get("success"):
                logger.info(f"Test: {result['test_name']}")
                logger.info(f"  Duration: {result.get('duration_minutes', 'N/A')} minutes")
                logger.info(f"  Skills/minute: {result['skill_count'] / result['duration_minutes']:.1f}")
                logger.info(f"  Success rate: {(result.get('assessed_count', 0)/result['skill_count'])*100:.1f}%")
                logger.info("")

        # Calculate speedup if we have both results
        if len(results) == 2 and all(r.get("success") for r in results):
            single_time = results[0]["duration_seconds"]
            parallel_time = results[1]["duration_seconds"]
            speedup = single_time / parallel_time

            comparison["summary"]["speedup"] = round(speedup, 2)
            comparison["summary"]["time_saved_seconds"] = round(single_time - parallel_time, 2)
            comparison["summary"]["time_saved_minutes"] = round((single_time - parallel_time) / 60, 2)

            logger.info(f"PERFORMANCE GAIN:")
            logger.info(f"  Speedup: {speedup:.2f}x")
            logger.info(f"  Time saved: {comparison['summary']['time_saved_minutes']:.2f} minutes")

            if speedup > 1:
                logger.info(f"  ✅ Parallel processing is {speedup:.2f}x FASTER")
            else:
                logger.info(f"  ⚠️ Single batch processing is {1/speedup:.2f}x FASTER")

        # Save comparison
        self.save_test_result(comparison, "benchmark_comparison.json")

        return comparison

async def main():
    """Run the benchmark tests"""

    # Check for API key
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        logger.error("Please set GOOGLE_API_KEY environment variable")
        return

    tester = BatchPerformanceTester(provider="google", api_key=api_key)

    # Test configuration
    SKILL_COUNT = 650  # Number of skills to test

    results = []

    # Test 1: Single batch of 650 skills
    logger.info("Starting Test 1: Single batch processing")
    result1 = await tester.test_single_batch(SKILL_COUNT)
    results.append(result1)

    # Wait a bit between tests
    logger.info("\nWaiting 10 seconds before next test...")
    await asyncio.sleep(10)

    # Test 2: Two parallel batches of 325 skills each
    logger.info("\nStarting Test 2: Parallel batch processing")
    result2 = await tester.test_parallel_batches(
        skill_count=SKILL_COUNT,
        batch_size=650,  # Standard batch size for consistency
        concurrent=2      # Process 2 batches at once
    )
    results.append(result2)

    # Compare results
    tester.compare_results(results)

    logger.info("\n✅ Benchmark tests completed!")
    logger.info("Check 'benchmark_results' folder for detailed results")

if __name__ == "__main__":
    asyncio.run(main())