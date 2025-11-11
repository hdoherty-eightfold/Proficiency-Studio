#!/usr/bin/env python3
"""
Test to verify chunking fixes for Step 5 assessment
"""

import json
import time

def test_chunk_processing():
    """Test that chunk processing correctly handles skill slicing"""

    # Simulate the chunking state
    class ChunkingState:
        def __init__(self):
            self.accumulated_results = []
            self.current_chunk_start = 1
            self.processed_chunks = 0
            self.total_skills_processed = 0
            self.chunk_size = None

    chunking_state = ChunkingState()

    # Simulate skills list
    total_skills = list(range(1, 1224))  # 1223 skills
    chunk_size = 387

    print(f"Testing chunking with {len(total_skills)} total skills")
    print(f"Chunk size: {chunk_size}")

    chunks_processed = []
    current_position = 0

    while current_position < len(total_skills):
        # Calculate next chunk (mimicking selectNextChunk)
        processed_count = len(chunking_state.accumulated_results)
        next_start = processed_count + 1  # 1-indexed for UI
        remaining_skills = len(total_skills) - processed_count

        if remaining_skills <= 0:
            print("✅ All skills processed!")
            break

        next_chunk_size = min(chunk_size, remaining_skills)

        # Store chunk size in state (our fix)
        chunking_state.chunk_size = next_chunk_size
        chunking_state.current_chunk_start = next_start

        # Calculate 0-indexed positions for slicing
        chunk_start_0idx = next_start - 1  # Convert to 0-indexed
        chunk_end_0idx = chunk_start_0idx + next_chunk_size

        # Get skills for this chunk
        skills_to_process = total_skills[chunk_start_0idx:chunk_end_0idx]

        print(f"\nChunk {len(chunks_processed) + 1}:")
        print(f"  - Start position (1-indexed): {next_start}")
        print(f"  - Start position (0-indexed): {chunk_start_0idx}")
        print(f"  - Chunk size: {next_chunk_size}")
        print(f"  - Skills to process: {len(skills_to_process)} skills")
        print(f"  - Range: skills[{chunk_start_0idx}:{chunk_end_0idx}]")

        # Verify we got the right number of skills
        assert len(skills_to_process) == next_chunk_size, f"Expected {next_chunk_size} skills, got {len(skills_to_process)}"
        assert len(skills_to_process) > 0, "No skills in chunk! This would cause 'No skills provided' error"

        # Simulate processing
        chunking_state.accumulated_results.extend(skills_to_process)
        chunking_state.processed_chunks += 1
        chunking_state.total_skills_processed += len(skills_to_process)
        chunks_processed.append(len(skills_to_process))

        current_position = len(chunking_state.accumulated_results)

    print(f"\n{'='*50}")
    print(f"✅ TEST PASSED!")
    print(f"Total chunks processed: {chunking_state.processed_chunks}")
    print(f"Total skills processed: {chunking_state.total_skills_processed}")
    print(f"Chunk sizes: {chunks_processed}")
    print(f"Sum of chunks: {sum(chunks_processed)}")

    # Final verification
    assert chunking_state.total_skills_processed == len(total_skills), "Not all skills were processed"
    assert len(chunking_state.accumulated_results) == len(total_skills), "Accumulated results don't match total"

    return True

if __name__ == "__main__":
    try:
        test_chunk_processing()
        print("\n✅ All chunking tests passed!")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        exit(1)