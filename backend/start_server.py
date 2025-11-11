#!/usr/bin/env python
"""Simple server starter without the import loop"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app_fastapi:app",
        host="127.0.0.1",
        port=5000,
        reload=True,
        reload_dirs=[".", "core", "claude_agents", "config", "web"],
        log_level="info"
    )