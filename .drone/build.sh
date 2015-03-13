#!/bin/bash
################################################################
# Use this script to initialize the first (or only) host in
# a MarkLogic Server cluster. Use the options to control admin
# username and password, authentication mode, and the security
# realm. If no hostname is given, localhost is assumed. Only
# minimal error checking is performed, so this script is not
# suitable for production use.
#
# Usage:  this_command [options] hostname
#
################################################################

BOOTSTRAP_HOST="localhost"
USER="admin"
PASS="password"
AUTH_MODE="anyauth"
SEC_REALM="public"
N_RETRY=5
RETRY_INTERVAL=10

echo "Initialization complete for $BOOTSTRAP_HOST..."
#exit 0
