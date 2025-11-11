#!/usr/bin/env python3
"""
Test script to debug why chunk 3 (skills 817-1223) fails
while chunks 1 and 2 succeed.
"""

import json
import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from core.langchain_service import LangChainService
from core.llm_service import LLMService

async def load_skills_from_latest_assessment():
    """Load skills from a recent assessment that has all 1223 skills"""
    # Try to load from a known good assessment file
    assessment_file = Path("assessment_results/proficiency_reasoning_20250915_100840.json")

    if not assessment_file.exists():
        # Fallback to any recent assessment
        assessment_dir = Path("assessment_results")
        files = list(assessment_dir.glob("proficiency_reasoning_*.json"))
        if not files:
            print("❌ No assessment files found")
            return None
        assessment_file = files[0]

    print(f"📂 Loading skills from: {assessment_file}")

    with open(assessment_file, 'r') as f:
        data = json.load(f)

    # Extract unique skills
    all_skills = []
    seen_names = set()

    if 'assessments' in data:
        for assessment in data['assessments']:
            skill_name = assessment.get('skill_name', '').strip()
            if skill_name and skill_name not in seen_names:
                seen_names.add(skill_name)
                all_skills.append({
                    'name': skill_name,
                    'description': ''
                })

    print(f"✅ Loaded {len(all_skills)} unique skills")
    return all_skills

async def test_chunk_3():
    """Test processing chunk 3 specifically"""

    # Load all skills
    all_skills = await load_skills_from_latest_assessment()
    if not all_skills:
        return

    # Get chunk 3 skills (817-1223, 0-indexed so 816-1222)
    chunk_size = 408
    chunk_3_start = chunk_size * 2  # 816
    chunk_3_end = min(chunk_3_start + 407, len(all_skills))  # 407 skills for chunk 3

    chunk_3_skills = all_skills[chunk_3_start:chunk_3_end]

    print(f"\n📊 Chunk 3 Analysis:")
    print(f"   - Start index: {chunk_3_start}")
    print(f"   - End index: {chunk_3_end}")
    print(f"   - Skills count: {len(chunk_3_skills)}")
    print(f"   - First skill: {chunk_3_skills[0]['name'] if chunk_3_skills else 'N/A'}")
    print(f"   - Last skill: {chunk_3_skills[-1]['name'] if chunk_3_skills else 'N/A'}")

    # Analyze skill names in chunk 3
    skill_name_lengths = [len(skill['name']) for skill in chunk_3_skills]
    avg_name_length = sum(skill_name_lengths) / len(skill_name_lengths) if skill_name_lengths else 0

    print(f"\n📏 Skill Name Analysis for Chunk 3:")
    print(f"   - Average name length: {avg_name_length:.1f} chars")
    print(f"   - Longest name: {max(skill_name_lengths)} chars")
    print(f"   - Shortest name: {min(skill_name_lengths)} chars")

    # Find unusually long skill names (potential culprits)
    long_skills = [(s['name'], len(s['name'])) for s in chunk_3_skills if len(s['name']) > 50]
    if long_skills:
        print(f"\n⚠️ Found {len(long_skills)} skills with names > 50 chars:")
        for name, length in sorted(long_skills, key=lambda x: x[1], reverse=True)[:5]:
            print(f"   - [{length} chars] {name[:80]}...")

    # Compare with chunk 1 and 2
    print(f"\n📊 Comparing with other chunks:")
    for chunk_num in [1, 2]:
        chunk_start = (chunk_num - 1) * chunk_size
        chunk_end = min(chunk_start + chunk_size, len(all_skills))
        chunk_skills = all_skills[chunk_start:chunk_end]

        chunk_name_lengths = [len(skill['name']) for skill in chunk_skills]
        chunk_avg_length = sum(chunk_name_lengths) / len(chunk_name_lengths) if chunk_name_lengths else 0

        print(f"\n   Chunk {chunk_num} ({len(chunk_skills)} skills):")
        print(f"   - Average name length: {chunk_avg_length:.1f} chars")
        print(f"   - Longest name: {max(chunk_name_lengths) if chunk_name_lengths else 0} chars")

    # Test with smaller subsets to isolate the problem
    print(f"\n🧪 Testing chunk 3 in smaller batches...")

    # Test first half of chunk 3
    first_half = chunk_3_skills[:200]
    print(f"\n   Testing first 200 skills of chunk 3...")

    try:
        # Initialize LangChain service
        langchain_service = LangChainService()

        # Set Google API key (from environment or settings)
        import os
        from config.settings import Settings
        settings = Settings()

        google_key = os.getenv('GOOGLE_API_KEY') or settings.google_api_key
        if google_key:
            langchain_service.set_api_key('google', google_key)
            print(f"   ✅ Google API key configured")
        else:
            print(f"   ❌ No Google API key found")
            return

        # Call the assessment
        result = langchain_service.assess_with_langchain(
            skills=first_half,
            provider='google',
            model='gemini-2.0-flash-exp',
            batch_size=200,
            max_concurrent=1,
            prompt_mode='simple'
        )

        if result.get('success'):
            print(f"   ✅ First half succeeded!")
            print(f"   - Response length: {len(result.get('llm_raw_response', ''))} chars")
            print(f"   - Assessed skills: {len(result.get('assessed_skills', []))}")
        else:
            print(f"   ❌ First half failed: {result.get('error')}")

        # Test second half
        second_half = chunk_3_skills[200:]
        print(f"\n   Testing last {len(second_half)} skills of chunk 3...")

        result2 = langchain_service.assess_with_langchain(
            skills=second_half,
            provider='google',
            model='gemini-2.0-flash-exp',
            batch_size=207,
            max_concurrent=1,
            prompt_mode='simple'
        )

        if result2.get('success'):
            print(f"   ✅ Second half succeeded!")
            print(f"   - Response length: {len(result2.get('llm_raw_response', ''))} chars")
            print(f"   - Assessed skills: {len(result2.get('assessed_skills', []))}")
        else:
            print(f"   ❌ Second half failed: {result2.get('error')}")

    except Exception as e:
        print(f"   ❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chunk_3())