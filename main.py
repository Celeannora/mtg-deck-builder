import subprocess
import sys
import os

root = os.path.dirname(os.path.abspath(__file__))
shell = sys.platform == "win32"

if not os.path.isdir(os.path.join(root, "node_modules")):
    print("Installing dependencies (first run only)...")
    subprocess.run("npm install", cwd=root, check=True, shell=shell)

subprocess.run("npm run dev", cwd=root, shell=shell)
