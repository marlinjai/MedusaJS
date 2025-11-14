#!/bin/bash
# restore-database.sh
# Restore PostgreSQL database from S3 backup
# Supports both interactive and non-interactive modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Configuration
CONTAINER_NAME="medusa_postgres"
# Use DB_NAME from env if set, otherwise POSTGRES_DB, otherwise default
DB_NAME="${DB_NAME:-${POSTGRES_DB:-medusa-store}}"
DB_USER="${POSTGRES_USER:-postgres}"
S3_BACKUP_PREFIX="database-backups"
TEMP_DIR="/tmp/medusa-restore"
LOG_FILE="/var/log/medusa/restore.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log to file
log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to check if Docker container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "PostgreSQL container '${CONTAINER_NAME}' is not running"
        log_to_file "ERROR: Container ${CONTAINER_NAME} not running"
        return 1
    fi
    return 0
}

# Function to check required environment variables
check_env_vars() {
    local required_vars=(
        "S3_ACCESS_KEY_ID"
        "S3_SECRET_ACCESS_KEY"
        "S3_BUCKET"
        "S3_ENDPOINT"
        "S3_REGION"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_to_file "ERROR: Missing environment variables: ${missing_vars[*]}"
        return 1
    fi

    return 0
}

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        log_to_file "ERROR: AWS CLI not installed"
        return 1
    fi
    return 0
}

# Function to list available backups from S3
list_backups() {
    log_info "Fetching list of available backups from S3..."
    log_to_file "Listing backups from S3"

    # Configure AWS CLI
    export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"

    # List backups from S3
    local backups=$(aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-verify-ssl 2>/dev/null | awk '{print $4}' | grep "medusa-backup-.*\.sql\.gz$" | sort -r || true)

    if [[ -z "$backups" ]]; then
        log_warning "No backups found in S3"
        log_to_file "WARNING: No backups found"
        return 1
    fi

    echo "$backups"
    return 0
}

# Function to download backup from S3
download_backup() {
    local backup_name="$1"
    local local_file="$2"

    log_info "Downloading backup from S3: $backup_name"
    log_to_file "Downloading: $backup_name"

    # Configure AWS CLI
    export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"

    # Download from S3
    if aws s3 cp "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/${backup_name}" "$local_file" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-verify-ssl 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Backup downloaded successfully"
        log_to_file "Download successful: $local_file"
        return 0
    else
        log_error "Failed to download backup from S3"
        log_to_file "ERROR: Failed to download backup"
        return 1
    fi
}

# Function to verify backup file
verify_backup() {
    local backup_file="$1"

    log_info "Verifying backup file integrity..."
    log_to_file "Verifying: $backup_file"

    # Check if file exists and has size > 0
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file does not exist: $backup_file"
        log_to_file "ERROR: Backup file missing: $backup_file"
        return 1
    fi

    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    if [[ $file_size -eq 0 ]]; then
        log_error "Backup file is empty: $backup_file"
        log_to_file "ERROR: Backup file is empty: $backup_file"
        return 1
    fi

    # Test gzip integrity
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "Backup file is corrupted (gzip test failed): $backup_file"
        log_to_file "ERROR: Backup file corrupted: $backup_file"
        return 1
    fi

    log_success "Backup file verified: ${file_size} bytes"
    log_to_file "Backup verified: $backup_file (${file_size} bytes)"
    return 0
}

# Function to restore database
restore_database() {
    local backup_file="$1"

    log_warning "WARNING: This will REPLACE all data in the database!"
    log_warning "Database: $DB_NAME"
    log_warning "Container: $CONTAINER_NAME"
    log_to_file "Restore started for: $backup_file"

    # Safety check: confirm in interactive mode
    if [[ -t 0 ]]; then
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "Restore cancelled by user"
            log_to_file "Restore cancelled by user"
            return 1
        fi
    fi

    log_info "Restoring database from backup..."
    log_to_file "Restoring database: $DB_NAME"

    # Decompress backup
    local decompressed_file="${backup_file%.gz}"
    log_info "Decompressing backup..."
    if ! gunzip -c "$backup_file" > "$decompressed_file"; then
        log_error "Failed to decompress backup"
        log_to_file "ERROR: Failed to decompress backup"
        rm -f "$decompressed_file"
        return 1
    fi

    # Restore database using psql inside container
    log_info "Restoring database (this may take a while)..."
    if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$decompressed_file" >> "$LOG_FILE" 2>&1; then
        log_success "Database restored successfully"
        log_to_file "Database restored successfully"
        rm -f "$decompressed_file"
        return 0
    else
        log_error "Failed to restore database"
        log_to_file "ERROR: Failed to restore database"
        rm -f "$decompressed_file"
        return 1
    fi
}

# Function to cleanup temporary files
cleanup_temp() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
        log_info "Cleaned up temporary files"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [backup-name]"
    echo ""
    echo "Options:"
    echo "  backup-name    Name of the backup file to restore (optional, will list if not provided)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # List available backups and prompt for selection"
    echo "  $0 medusa-backup-2024-01-15-020000.sql.gz  # Restore specific backup"
}

# Main restore process
main() {
    local backup_name="$1"

    log_info "Starting database restore process"
    log_to_file "=== Restore process started ==="

    # Pre-flight checks
    if ! check_container; then
        exit 1
    fi

    if ! check_env_vars; then
        exit 1
    fi

    if ! check_aws_cli; then
        exit 1
    fi

    # Create temporary directory
    mkdir -p "$TEMP_DIR"

    # If backup name not provided, list and prompt
    if [[ -z "$backup_name" ]]; then
        local backups
        if ! backups=$(list_backups); then
            cleanup_temp
            exit 1
        fi

        log_info "Available backups:"
        echo ""
        local index=1
        local backup_array=()
        while IFS= read -r backup; do
            echo "  $index) $backup"
            backup_array+=("$backup")
            ((index++))
        done <<< "$backups"
        echo ""

        if [[ ${#backup_array[@]} -eq 0 ]]; then
            log_error "No backups available"
            cleanup_temp
            exit 1
        fi

        # Prompt for selection in interactive mode
        if [[ -t 0 ]]; then
            read -p "Select backup number to restore (1-${#backup_array[@]}): " selection
            if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le ${#backup_array[@]} ]]; then
                backup_name="${backup_array[$((selection-1))]}"
            else
                log_error "Invalid selection"
                cleanup_temp
                exit 1
            fi
        else
            log_error "Backup name required in non-interactive mode"
            show_usage
            cleanup_temp
            exit 1
        fi
    fi

    # Download backup
    local local_backup="${TEMP_DIR}/${backup_name}"
    if ! download_backup "$backup_name" "$local_backup"; then
        cleanup_temp
        exit 1
    fi

    # Verify backup
    if ! verify_backup "$local_backup"; then
        cleanup_temp
        exit 1
    fi

    # Restore database
    if ! restore_database "$local_backup"; then
        cleanup_temp
        exit 1
    fi

    # Cleanup temporary files
    cleanup_temp

    log_success "Restore process completed successfully"
    log_to_file "=== Restore process completed successfully ==="

    exit 0
}

# Trap to ensure cleanup on exit
trap cleanup_temp EXIT

# Handle help flag
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"

