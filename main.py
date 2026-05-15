import subprocess
import sys
import os

root = os.path.dirname(os.path.abspath(__file__))

if not os.path.isdir(os.path.join(root, "node_modules")):
    print("Installing dependencies (first run only)...")
    subprocess.run(["npm", "install"], cwd=root, check=True)

subprocess.run(["npm", "run", "dev"], cwd=root)
