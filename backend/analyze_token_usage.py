import json

# Current typical JSON response for one skill assessment
current_format = {
    "skill_name": "Python Programming",
    "proficiency": 4,
    "level": "Advanced",
    "confidence_score": 0.85,
    "reasoning": "The candidate demonstrates extensive experience with Python through multiple projects involving data analysis, machine learning, and web development. They have used advanced Python features and frameworks."
}

# Calculate character count for current format
current_json = json.dumps(current_format)
current_chars = len(current_json)

print("CURRENT JSON FORMAT ANALYSIS")
print("="*60)
print(f"Single skill assessment:")
print(json.dumps(current_format, indent=2))
print(f"\nCharacter count: {current_chars}")
print(f"For 408 skills: {current_chars * 408:,} characters")

# Breakdown by field
field_sizes = {
    "skill_name": len(json.dumps(current_format["skill_name"])),
    "proficiency": len(json.dumps(current_format["proficiency"])),
    "level": len(json.dumps(current_format["level"])),
    "confidence_score": len(json.dumps(current_format["confidence_score"])),
    "reasoning": len(json.dumps(current_format["reasoning"])),
    "json_structure": len('{"":"","":"","":"","":"","":""}')  # Keys and structure
}

print("\nField size breakdown:")
for field, size in field_sizes.items():
    print(f"  {field}: {size} chars ({size/current_chars*100:.1f}%)")

# OPTIMIZATION 1: CSV Format
print("\n" + "="*60)
print("OPTIMIZATION 1: CSV FORMAT")
print("="*60)

csv_row = "Python Programming,4,Advanced,0.85,\"The candidate demonstrates extensive experience with Python through multiple projects involving data analysis, machine learning, and web development. They have used advanced Python features and frameworks.\""
csv_chars = len(csv_row)
print(f"CSV row: {csv_row[:100]}...")
print(f"Character count: {csv_chars}")
print(f"Savings: {current_chars - csv_chars} chars ({(current_chars - csv_chars)/current_chars*100:.1f}%)")
print(f"For 408 skills: {csv_chars * 408:,} characters")

# OPTIMIZATION 2: Minimal JSON (no reasoning)
print("\n" + "="*60)
print("OPTIMIZATION 2: MINIMAL JSON (NO REASONING)")
print("="*60)

minimal_json = {
    "skill_name": "Python Programming",
    "proficiency": 4,
    "confidence_score": 0.85
}
minimal_chars = len(json.dumps(minimal_json))
print(json.dumps(minimal_json))
print(f"Character count: {minimal_chars}")
print(f"Savings: {current_chars - minimal_chars} chars ({(current_chars - minimal_chars)/current_chars*100:.1f}%)")
print(f"For 408 skills: {minimal_chars * 408:,} characters")

# OPTIMIZATION 3: Ultra-compact format (array)
print("\n" + "="*60)
print("OPTIMIZATION 3: ULTRA-COMPACT ARRAY FORMAT")
print("="*60)

# Format: [skill_name, proficiency, confidence]
compact_array = ["Python Programming", 4, 0.85]
compact_chars = len(json.dumps(compact_array))
print(f"Array format: {json.dumps(compact_array)}")
print(f"Character count: {compact_chars}")
print(f"Savings: {current_chars - compact_chars} chars ({(current_chars - compact_chars)/current_chars*100:.1f}%)")
print(f"For 408 skills: {compact_chars * 408:,} characters")

# OPTIMIZATION 4: Abbreviated keys
print("\n" + "="*60)
print("OPTIMIZATION 4: ABBREVIATED KEYS")
print("="*60)

abbreviated = {
    "s": "Python Programming",  # skill
    "p": 4,                     # proficiency  
    "c": 0.85,                  # confidence
    "r": "Brief reason"         # reasoning (shortened)
}
abbrev_chars = len(json.dumps(abbreviated))
print(json.dumps(abbreviated))
print(f"Character count: {abbrev_chars}")
print(f"Savings: {current_chars - abbrev_chars} chars ({(current_chars - abbrev_chars)/current_chars*100:.1f}%)")
print(f"For 408 skills: {abbrev_chars * 408:,} characters")

# OPTIMIZATION 5: TSV (Tab-separated, even more compact)
print("\n" + "="*60)
print("OPTIMIZATION 5: TSV FORMAT (TAB-SEPARATED)")
print("="*60)

tsv_row = "Python Programming\t4\t0.85"
tsv_chars = len(tsv_row)
print(f"TSV row: {tsv_row}")
print(f"Character count: {tsv_chars}")
print(f"Savings: {current_chars - tsv_chars} chars ({(current_chars - tsv_chars)/current_chars*100:.1f}%)")
print(f"For 408 skills: {tsv_chars * 408:,} characters")

# Summary comparison
print("\n" + "="*60)
print("SUMMARY COMPARISON (for 408 skills)")
print("="*60)

formats = [
    ("Current JSON (with reasoning)", current_chars * 408),
    ("CSV format", csv_chars * 408),
    ("Minimal JSON (no reasoning)", minimal_chars * 408),
    ("Ultra-compact array", compact_chars * 408),
    ("Abbreviated keys JSON", abbrev_chars * 408),
    ("TSV format", tsv_chars * 408)
]

for name, size in formats:
    reduction = ((current_chars * 408) - size) / (current_chars * 408) * 100
    print(f"{name:30} {size:8,} chars ({reduction:+6.1f}% reduction)")

print("\n" + "="*60)
print("RECOMMENDATIONS")
print("="*60)
print("""
1. REMOVE REASONING: Biggest savings (50-70% reduction)
   - The 'reasoning' field is the largest consumer of tokens
   - Often not needed for bulk assessment
   - Can be made optional

2. USE CSV/TSV FORMAT: 60-80% reduction
   - Simple format: skill,proficiency,confidence
   - Client can parse to JSON
   - Much more compact

3. REMOVE REDUNDANT FIELDS: 20-30% reduction
   - Don't include both 'proficiency' (4) and 'level' (Advanced)
   - Pick one representation

4. USE ABBREVIATED KEYS: 30-40% reduction
   - 's' instead of 'skill_name'
   - 'p' instead of 'proficiency'
   - 'c' instead of 'confidence_score'

5. BATCH RESPONSE OPTIMIZATION:
   - Return skills in order matching input
   - Skip skill names in response (use index)
   - Just return: [[4,0.85],[3,0.70],[5,0.95]...]
""")

