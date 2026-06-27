import os
import sys

# Ensure the backend package modules are importable from tests regardless of
# where pytest is invoked from.
sys.path.insert(0, os.path.dirname(__file__))
