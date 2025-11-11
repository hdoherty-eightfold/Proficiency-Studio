#!/usr/bin/env python3
"""
Comprehensive Chunking and Batch Processing Test Suite
Tests various configurations to find optimal settings for skill assessment
"""

import asyncio
import json
import time
import sys
import os
from typing import Dict, List, Tuple
from datetime import datetime
import requests
from dataclasses import dataclass
from collections import defaultdict

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

@dataclass
class TestResult:
    """Store test results for analysis"""
    chunk_size: int
    batch_size: int
    concurrent_batches: int
    total_skills: int
    success: bool
    processing_time: float
    response_size: int
    error_message: str = None
    truncation_detected: bool = False
    skills_assessed: int = 0

    @property
    def throughput(self) -> float:
        """Skills processed per second"""
        if self.processing_time > 0:
            return self.skills_assessed / self.processing_time
        return 0

class ChunkingTester:
    """Test different chunking configurations"""

    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.test_results = []
        self.verbose_prompt = """You are evaluating technical skills. For each skill, provide a proficiency level.

IMPORTANT: You must assess EVERY skill provided. Do not skip any skills.

For each skill, return EXACTLY this format:
{
  "skill_name": "exact skill name as provided",
  "proficiency": number from 1-5,
  "level": one of ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
  "confidence_score": number from 0.0-1.0,
  "reasoning": "Brief explanation of why this level was chosen"
}

Proficiency Mapping:
1 = Novice (Beginner, just starting to learn)
2 = Developing (Some exposure, basic understanding)
3 = Intermediate (Working knowledge, can perform tasks independently)
4 = Advanced (Deep expertise, can mentor others)
5 = Expert (Master level, recognized authority)

Consider these factors:
- Complexity of the skill
- Industry demand
- Learning curve
- Practical application
"""

    def generate_test_skills(self, count: int) -> List[Dict]:
        """Generate test skills for assessment"""
        skills = []
        categories = ["Programming", "Database", "Cloud", "DevOps", "AI/ML", "Security", "Frontend", "Backend"]

        for i in range(count):
            category = categories[i % len(categories)]
            skills.append({
                "name": f"{category} Skill {i+1}",
                "category": category,
                "description": f"Test skill for {category} domain"
            })
        return skills

    def test_configuration(self, chunk_size: int, batch_size: int,
                          concurrent_batches: int, total_skills: int,
                          use_verbose_prompt: bool = True) -> TestResult:
        """Test a specific configuration"""
        print(f"\n{'='*60}")
        print(f"Testing Configuration:")
        print(f"  Chunk Size: {chunk_size}")
        print(f"  Batch Size: {batch_size}")
        print(f"  Concurrent Batches: {concurrent_batches}")
        print(f"  Total Skills: {total_skills}")
        print(f"  Prompt: {'Verbose' if use_verbose_prompt else 'Simple'}")
        print(f"{'='*60}")

        # Generate test skills
        skills = self.generate_test_skills(total_skills)

        # Prepare request
        request_data = {
            "skills": skills[:chunk_size],  # Simulate chunked data
            "provider": "google",  # Using Google as it's most reliable
            "model": "gemini-1.5-flash",
            "proficiency_levels": ["Novice", "Developing", "Intermediate", "Advanced", "Expert"],
            "prompt_template": self.verbose_prompt if use_verbose_prompt else None,
            "use_langchain": True,
            "batch_size": batch_size,
            "concurrent_batches": concurrent_batches,
            "processing_mode": "parallel" if concurrent_batches > 1 else "sequential",
            "chunk_start": 0,
            "chunk_size": chunk_size,
            "is_chunked": True,
            "environment": "test_environment"
        }

        # Make request
        start_time = time.time()
        try:
            response = requests.post(
                f"{self.base_url}/api/skills/assess-proficiencies-simple",
                json=request_data,
                timeout=300  # 5 minute timeout
            )
            processing_time = time.time() - start_time

            # Check response
            if response.status_code == 200:
                result_data = response.json()

                # Check for truncation
                truncation_detected = False
                if "warning" in result_data and "truncated" in result_data.get("warning", "").lower():
                    truncation_detected = True

                result = TestResult(
                    chunk_size=chunk_size,
                    batch_size=batch_size,
                    concurrent_batches=concurrent_batches,
                    total_skills=total_skills,
                    success=result_data.get("success", False),
                    processing_time=processing_time,
                    response_size=len(json.dumps(result_data)),
                    truncation_detected=truncation_detected,
                    skills_assessed=len(result_data.get("assessed_skills", []))
                )

                print(f"✅ SUCCESS in {processing_time:.2f}s")
                print(f"  Skills Assessed: {result.skills_assessed}/{chunk_size}")
                print(f"  Response Size: {result.response_size:,} bytes")
                print(f"  Throughput: {result.throughput:.1f} skills/second")
                if truncation_detected:
                    print(f"  ⚠️ WARNING: Response truncation detected!")

            else:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                result = TestResult(
                    chunk_size=chunk_size,
                    batch_size=batch_size,
                    concurrent_batches=concurrent_batches,
                    total_skills=total_skills,
                    success=False,
                    processing_time=processing_time,
                    response_size=0,
                    error_message=error_msg
                )
                print(f"❌ FAILED: {error_msg}")

        except requests.Timeout:
            processing_time = time.time() - start_time
            result = TestResult(
                chunk_size=chunk_size,
                batch_size=batch_size,
                concurrent_batches=concurrent_batches,
                total_skills=total_skills,
                success=False,
                processing_time=processing_time,
                response_size=0,
                error_message="Request timeout"
            )
            print(f"❌ TIMEOUT after {processing_time:.2f}s")

        except Exception as e:
            processing_time = time.time() - start_time
            result = TestResult(
                chunk_size=chunk_size,
                batch_size=batch_size,
                concurrent_batches=concurrent_batches,
                total_skills=total_skills,
                success=False,
                processing_time=processing_time,
                response_size=0,
                error_message=str(e)
            )
            print(f"❌ ERROR: {str(e)}")

        self.test_results.append(result)
        return result

    def run_comprehensive_tests(self):
        """Run comprehensive test suite"""
        print("\n" + "="*80)
        print("COMPREHENSIVE CHUNKING TEST SUITE")
        print("="*80)

        # Test configurations - start conservative
        configurations = [
            # (chunk_size, batch_size, concurrent_batches, test_with_verbose_prompt)
            # Small tests first
            (50, 50, 1, True),    # Tiny chunk, single batch
            (100, 100, 1, True),  # Small chunk, single batch
            (100, 50, 2, True),   # Small chunk, 2 batches sequential

            # Medium tests
            (200, 200, 1, True),  # Medium chunk, single batch
            (200, 100, 2, True),  # Medium chunk, 2 batches
            (300, 150, 2, True),  # Medium-large chunk, 2 batches

            # Large tests (if smaller ones work)
            (400, 400, 1, True),  # Large chunk, single batch
            (400, 200, 2, True),  # Large chunk, 2 batches
            (500, 250, 2, True),  # Very large chunk, 2 batches

            # Test parallel processing
            (200, 100, 2, True),  # Parallel test
            (300, 100, 3, True),  # More parallel

            # Test without verbose prompt (should be faster/smaller)
            (400, 400, 1, False), # Large chunk, simple prompt
            (600, 600, 1, False), # Very large, simple prompt
        ]

        total_skills = 1223  # Simulate full dataset

        print(f"\nRunning {len(configurations)} test configurations...")
        print(f"Total skills to process: {total_skills}")

        for chunk_size, batch_size, concurrent, use_verbose in configurations:
            # Skip if chunk is too large for the dataset
            if chunk_size > total_skills:
                print(f"\nSkipping config with chunk_size={chunk_size} (exceeds total skills)")
                continue

            self.test_configuration(
                chunk_size=chunk_size,
                batch_size=batch_size,
                concurrent_batches=concurrent,
                total_skills=total_skills,
                use_verbose_prompt=use_verbose
            )

            # Small delay between tests
            time.sleep(2)

    def analyze_results(self):
        """Analyze test results and find optimal configuration"""
        print("\n" + "="*80)
        print("TEST RESULTS ANALYSIS")
        print("="*80)

        if not self.test_results:
            print("No test results to analyze")
            return

        # Successful configurations
        successful = [r for r in self.test_results if r.success and not r.truncation_detected]
        truncated = [r for r in self.test_results if r.success and r.truncation_detected]
        failed = [r for r in self.test_results if not r.success]

        print(f"\n📊 Summary:")
        print(f"  Total Tests: {len(self.test_results)}")
        print(f"  Successful: {len(successful)}")
        print(f"  Truncated: {len(truncated)}")
        print(f"  Failed: {len(failed)}")

        if successful:
            print(f"\n✅ Successful Configurations:")
            print(f"{'Chunk':<8} {'Batch':<8} {'Concurrent':<12} {'Time(s)':<10} {'Throughput':<12} {'Assessment Rate'}")
            print("-" * 70)

            # Sort by throughput
            successful.sort(key=lambda x: x.throughput, reverse=True)

            for r in successful:
                assessment_rate = (r.skills_assessed / r.chunk_size) * 100
                print(f"{r.chunk_size:<8} {r.batch_size:<8} {r.concurrent_batches:<12} "
                      f"{r.processing_time:<10.2f} {r.throughput:<12.1f} {assessment_rate:.1f}%")

            # Find optimal
            optimal = successful[0]
            print(f"\n🏆 OPTIMAL CONFIGURATION:")
            print(f"  Chunk Size: {optimal.chunk_size}")
            print(f"  Batch Size: {optimal.batch_size}")
            print(f"  Concurrent Batches: {optimal.concurrent_batches}")
            print(f"  Processing Time: {optimal.processing_time:.2f}s")
            print(f"  Throughput: {optimal.throughput:.1f} skills/second")

            # Estimate full processing time
            total_chunks = 1223 // optimal.chunk_size + (1 if 1223 % optimal.chunk_size else 0)
            estimated_time = total_chunks * optimal.processing_time
            print(f"\n⏱️  Estimated time for 1223 skills:")
            print(f"  {total_chunks} chunks × {optimal.processing_time:.2f}s = {estimated_time:.2f}s ({estimated_time/60:.1f} minutes)")

        if truncated:
            print(f"\n⚠️ Configurations with Truncation:")
            for r in truncated:
                print(f"  Chunk: {r.chunk_size}, Batch: {r.batch_size} - Reduce batch size!")

        if failed:
            print(f"\n❌ Failed Configurations:")
            for r in failed:
                print(f"  Chunk: {r.chunk_size}, Batch: {r.batch_size} - {r.error_message[:50]}")

        # Recommendations
        print(f"\n📝 RECOMMENDATIONS:")
        if successful:
            # Find most reliable (highest success rate with good performance)
            reliable = [r for r in successful if r.skills_assessed == r.chunk_size]
            if reliable:
                reliable.sort(key=lambda x: x.chunk_size, reverse=True)
                best_reliable = reliable[0]
                print(f"  1. Most Reliable: Chunk={best_reliable.chunk_size}, Batch={best_reliable.batch_size}")
                print(f"     (100% assessment rate, {best_reliable.throughput:.1f} skills/s)")

        print(f"  2. For 1223 skills, use {3 if optimal.chunk_size <= 400 else 2} chunks")
        print(f"  3. Keep batch_size = chunk_size to avoid sub-batching")
        print(f"  4. Use sequential processing for reliability")
        print(f"  5. With verbose prompt, max chunk size ~400 skills")
        print(f"  6. Without verbose prompt, can go up to 600 skills")

def main():
    """Main test execution"""
    print("Starting Comprehensive Chunking Tests...")
    print("Make sure the FastAPI server is running on port 5000")

    # Check server is running
    try:
        response = requests.get("http://localhost:5000/api/status")
        if response.status_code != 200:
            print("❌ Server not responding properly")
            return
        print("✅ Server is running")
    except:
        print("❌ Cannot connect to server at localhost:5000")
        return

    # Run tests
    tester = ChunkingTester()
    tester.run_comprehensive_tests()
    tester.analyze_results()

    # Save results
    results_file = f"chunking_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        results_data = [
            {
                "chunk_size": r.chunk_size,
                "batch_size": r.batch_size,
                "concurrent_batches": r.concurrent_batches,
                "success": r.success,
                "processing_time": r.processing_time,
                "throughput": r.throughput,
                "skills_assessed": r.skills_assessed,
                "truncation_detected": r.truncation_detected,
                "error": r.error_message
            }
            for r in tester.test_results
        ]
        json.dump(results_data, f, indent=2)

    print(f"\n💾 Results saved to: {results_file}")

if __name__ == "__main__":
    main()