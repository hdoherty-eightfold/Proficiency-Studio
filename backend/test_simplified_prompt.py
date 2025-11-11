#!/usr/bin/env python3
"""
Test Script for Simplified Prompt
Tests the performance improvement with simplified JSON output
"""

import asyncio
import json
import time
from datetime import datetime
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.langchain_service import LangChainService
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('simplified_prompt_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

async def test_simplified_prompt():
    """Test the simplified prompt with 100 skills first"""

    # Check for API key
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        logger.error("Please set GOOGLE_API_KEY environment variable")
        return

    langchain_service = LangChainService()

    # Generate test skills (start with 100 to avoid quota issues)
    skill_count = 100
    skills = []
    skill_templates = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "MongoDB",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Machine Learning", "Deep Learning",
        "Data Analysis", "Data Visualization", "Git", "CI/CD", "Agile", "Scrum"
    ]

    for i in range(skill_count):
        skill_name = f"{skill_templates[i % len(skill_templates)]}"
        if i >= len(skill_templates):
            skill_name += f" {i // len(skill_templates)}"
        skills.append({"name": skill_name, "skill_name": skill_name})

    logger.info(f"Testing SIMPLIFIED PROMPT with {skill_count} skills")
    logger.info("="*60)
    logger.info("Expected output format: {\"assessments\":[{\"skill_name\":\"name\",\"proficiency\":1-5}]}")
    logger.info("="*60)

    start_time = time.time()
    logger.info(f"Start time: {datetime.now().strftime('%H:%M:%S')}")

    try:
        # Update API keys
        langchain_service.update_api_keys({"google": api_key})

        # Run assessment with simplified prompt
        result = langchain_service.assess_with_langchain(
            skills=skills,
            resume_text="",  # No resume for simple proficiency assignment
            provider="google",
            api_key=api_key,
            model="gemini-2.5-pro",
            batch_size=skill_count,  # Single batch
            concurrent_batches=1,
            processing_mode="sequential"
        )

        end_time = time.time()
        duration = end_time - start_time

        # Analyze results
        logger.info(f"End time: {datetime.now().strftime('%H:%M:%S')}")
        logger.info(f"Duration: {duration:.2f} seconds ({duration/60:.2f} minutes)")

        if result.get("success"):
            assessed_skills = result.get("assessed_skills", [])
            logger.info(f"Skills assessed: {len(assessed_skills)}/{skill_count}")
            logger.info(f"Success rate: {(len(assessed_skills)/skill_count)*100:.1f}%")

            # Check if the response format is simplified (no confidence_score/reasoning)
            if assessed_skills:
                sample = assessed_skills[0]
                has_confidence = "confidence_score" in sample
                has_reasoning = "reasoning" in sample

                logger.info(f"Response format check:")
                logger.info(f"  - Has confidence_score: {has_confidence}")
                logger.info(f"  - Has reasoning: {has_reasoning}")

                if not has_confidence and not has_reasoning:
                    logger.info("✅ SUCCESS: Response uses simplified format!")
                else:
                    logger.warning("⚠️ Response still includes optional fields")

                # Show sample output
                logger.info(f"Sample assessment: {json.dumps(sample, indent=2)}")
        else:
            logger.error(f"Assessment failed: {result.get('error')}")
            if result.get('errors'):
                for error in result['errors']:
                    logger.error(f"  - {error}")

        # Save results
        output_file = f"simplified_test_{skill_count}_skills_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump({
                "test": "simplified_prompt",
                "skill_count": skill_count,
                "duration_seconds": duration,
                "result": result
            }, f, indent=2)

        logger.info(f"Results saved to: {output_file}")

        return result

    except Exception as e:
        logger.error(f"Test failed with error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

if __name__ == "__main__":
    logger.info("Starting Simplified Prompt Test")
    logger.info("This test uses a minimal JSON output format to reduce token usage")
    asyncio.run(test_simplified_prompt())