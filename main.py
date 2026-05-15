import subprocess
import sys
import os

root = os.path.dirname(os.path.abspath(__file__))
shell = sys.platform == "win32"

# Always run npm install so newly added dependencies are picked up.
# npm install is a no-op when everything is already up to date.
print("Syncing dependencies...")
subprocess.run("npm install", cwd=root, check=True, shell=shell)

subprocess.run("npm run dev", cwd=root, shell=shell)
