# Breaking Changes History

## Purpose
Document all breaking changes that have occurred to prevent repeating the same mistakes.

## Critical Pattern: Step 6 Dropdown Breaking
**Frequency**: 100+ times (per user report)
**Root Cause**: Removing JavaScript dependencies from index.html

### The Problem
When modifying `web/templates/index.html`, the following files are often accidentally removed:
- `step6-workflow.js` - Controls Step 6 dropdown population
- `step6-operations.js` - Handles Step 6 CRUD operations

### Why It Happens
1. Cleaning up script includes without checking dependencies
2. Reorganizing JavaScript files without understanding connections
3. No validation that UI still works after template changes

### Prevention
- **NEVER** remove script tags without checking what they do
- **ALWAYS** run `python ui_validation_test.py` after HTML changes
- **USE** `python safety_check.py web/templates/index.html` before editing

---

## Common Breaking Patterns

### 1. JavaScript File Removal
**Files Often Broken**: index.html
**Impact**: UI features stop working
**Prevention**: Check critical_files.json before removing any script tag

### 2. Element ID Changes
**Files Often Broken**: workflow.js, step6-*.js
**Impact**: JavaScript can't find elements, features fail silently
**Prevention**: Search for ID usage before changing

### 3. API Endpoint Modifications
**Files Often Broken**: eightfold_client.py, workflow.js
**Impact**: API calls fail, authentication breaks
**Prevention**: Update all calling code when changing endpoints

### 4. Environment Configuration
**Files Often Broken**: environments.py
**Impact**: Authentication fails, environments disappear
**Prevention**: Test all environments after config changes

### 5. Test File Deletion
**Files Often Broken**: auto_test.py dependencies
**Impact**: Can't validate changes
**Prevention**: Keep test files, they're critical infrastructure

---

## Specific Incidents to Avoid

### Incident 1: Step 6 Dropdown Disappears
**What Happened**: Removed step6-workflow.js from index.html
**Why**: "Cleaning up" JavaScript includes
**Impact**: Step 6 role management completely broken
**Fix**: Re-add the script tags
**Lesson**: Every JS file has a purpose, don't remove without checking

### Incident 2: Environment Dropdown Empty
**What Happened**: Modified get_environments() incorrectly
**Why**: Trying to filter environments without understanding the code
**Impact**: Can't switch environments, auth fails
**Fix**: Restore original logic
**Lesson**: Test environment switching after any config change

### Incident 3: Assessment Fails Silently
**What Happened**: Changed element IDs in HTML
**Why**: "Improving" naming without checking JS dependencies
**Impact**: JavaScript can't find elements, no error shown
**Fix**: Restore original IDs or update all JS references
**Lesson**: Element IDs are API contracts with JavaScript

---

## Protection Mechanisms Now in Place

1. **critical_files.json** - Registry of files that must not break
2. **safety_check.py** - Pre-edit validation and backup
3. **ui_validation_test.py** - Ensures UI components work
4. **Auto-backup** - Restore points before changes
5. **Dependency tracking** - Know what breaks when you change something

---

## Rules to Live By

1. **Run safety_check.py before editing any file**
2. **Run ui_validation_test.py after any HTML/JS change**
3. **Never remove JavaScript files without checking usage**
4. **Test the actual UI in browser after changes**
5. **Keep backups of working versions**
6. **When in doubt, don't delete - comment out first**
7. **Test Step 6 specifically - it breaks most often**

---

## Recovery Procedures

### If Step 6 Breaks:
```bash
# Check if JS files are loaded
python ui_validation_test.py

# If missing, restore them in index.html:
# Add back:
# <script src="/static/js/step6-workflow.js?v=2.1"></script>
# <script src="/static/js/step6-operations.js?v=1.0"></script>
```

### If Environments Disappear:
```bash
# Check environment configuration
python -c "from config.environments import env_manager; print(env_manager.get_environments())"

# Restart server to reload config
# Kill current server and restart
```

### If Tests Fail:
```bash
# Restore from backup
python safety_check.py --restore <backup_path> <original_path>

# Or git reset to last working commit
git status  # Check what changed
git checkout -- <broken_file>  # Restore specific file
```

---

## Learning from Mistakes

Each breaking change teaches us:
1. What dependencies exist that weren't obvious
2. What tests we're missing
3. What documentation we need
4. What safety checks to add

The goal is ZERO breaking changes going forward.