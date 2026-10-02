#!/bin/bash
# Generate runtime configuration for the frontend container
# This script is called by the container entrypoint to inject environment variables
# into the frontend at runtime (after build).

set -e

# Default to empty string if not set
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-}"

# Generate the runtime config file
cat > /app/public/runtime-config.js <<EOF
// Runtime configuration injected by the container entrypoint script.
// This file is generated at container startup from environment variables.
// Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
window.__RUNTIME_CONFIG__ = {
  basePath: '${BASE_PATH}'
};
EOF

echo "Runtime config generated with basePath: '${BASE_PATH}'"
