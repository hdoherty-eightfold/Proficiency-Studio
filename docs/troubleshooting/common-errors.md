# Common Errors and Solutions

## Backend Connection Issues

### "Backend server is unavailable"

**Symptoms**: Red banner at top of app, all API calls fail

**Causes**:
- Backend server not running
- Wrong BACKEND_URL environment variable
- Network issues

**Solutions**:
1. Start the backend server:
   ```bash
   cd ProfStudio/backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```
2. Verify backend is running:
   ```bash
   curl http://localhost:8000/health
   ```
3. Check environment variable:
   ```bash
   echo $BACKEND_URL  # Should be http://localhost:8000
   ```

### "Request timed out"

**Symptoms**: Operations hang then fail after 30 seconds

**Causes**:
- Backend overloaded
- Network latency
- Large file processing

**Solutions**:
1. Check backend logs for errors
2. Reduce batch size for large operations
3. Check network connectivity

## File Upload Issues

### "Storage limit exceeded"

**Symptoms**: CSV upload fails silently or shows storage error

**Causes**:
- File too large for localStorage (>5MB limit)
- localStorage already full

**Solutions**:
1. Use smaller files (<5MB)
2. Clear app data:
   - Settings > Clear Data
   - Or manually clear localStorage in DevTools
3. The app now stores file_id reference instead of full content for large files

### "Invalid file type"

**Symptoms**: File rejected with type error

**Causes**:
- Wrong file extension
- File not CSV format

**Solutions**:
1. Ensure file has `.csv` extension
2. Verify file is actually CSV (comma or pipe delimited)
3. Check file encoding (UTF-8 recommended)

### "File encoding issues" / Corrupted characters

**Symptoms**: Special characters (é, ü, ß, etc.) display incorrectly

**Causes**:
- File saved with non-UTF-8 encoding
- BOM markers missing

**Solutions**:
1. Re-save file as UTF-8 with BOM
2. The app now auto-detects encoding (UTF-8, UTF-16, ISO-8859-1)
3. For persistent issues, convert file:
   ```bash
   iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
   ```

## SFTP Issues

### "Connection Failed"

**Symptoms**: Cannot connect to SFTP server

**Causes**:
- Wrong credentials
- Firewall blocking port 22
- Server unreachable

**Solutions**:
1. Test connection from terminal:
   ```bash
   sftp username@host
   ```
2. Verify port is open:
   ```bash
   nc -zv host 22
   ```
3. Check credentials are correct

### "Browse Failed"

**Symptoms**: Connected but cannot browse directories

**Causes**:
- Permission denied
- Path doesn't exist

**Solutions**:
1. Check directory permissions on server
2. Verify default path exists
3. Try browsing from root `/`

## Eightfold API Issues

### "Authentication Failed"

**Symptoms**: OAuth login fails

**Causes**:
- Invalid credentials
- Expired pre-auth value
- Environment misconfigured

**Solutions**:
1. Verify credentials in Environment Manager
2. Re-generate OAuth pre-auth value
3. Check base URL is correct for your environment

## UI Issues

### App unresponsive after navigation

**Symptoms**: UI freezes when switching pages

**Causes**: (Fixed in latest version)
- Previous async operations not cancelled

**Solutions**:
1. Update to latest version (now includes abort controllers)
2. Refresh the app
3. Check DevTools console for errors

### Toast notifications not showing

**Symptoms**: Actions complete but no feedback

**Causes**:
- Toaster component not mounted
- State not updating

**Solutions**:
1. Check Toaster is in App.tsx
2. Refresh the app
3. Check browser console for errors

## Development Issues

### Tests failing

**Symptoms**: npm test shows failures

**Solutions**:
1. Ensure dependencies installed:
   ```bash
   npm install
   ```
2. Check test setup file exists at `src/renderer/test/setup.ts`
3. Run specific test to isolate:
   ```bash
   npm test -- --run src/renderer/lib/errors.test.ts
   ```

### "Electron API not available"

**Symptoms**: Error in DevTools, API calls fail

**Causes**:
- Running in browser instead of Electron
- Preload script not loading

**Solutions**:
1. Run via Electron:
   ```bash
   npm run dev
   ```
2. Not browser (http://localhost:5173 direct access)
3. Check preload script in electron-main.ts

## Getting More Help

1. Check the [Architecture Overview](../architecture/overview.md)
2. Review [IPC Communication](../architecture/electron-ipc.md)
3. Enable debug logging:
   ```typescript
   localStorage.setItem('debug', 'true');
   ```
4. Check electron-log output:
   ```bash
   tail -f ~/Library/Logs/ProfStudio-Desktop/main.log
   ```
