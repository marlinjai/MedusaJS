#!/bin/bash
# backup-database.sh
# Automated PostgreSQL database backup script
# Creates compressed database dumps and uploads them to Supabase S3
# Implements 30-day retention policy

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
BACKUP_RETENTION_DAYS=30
S3_BACKUP_PREFIX="database-backups"
TEMP_DIR="/tmp/medusa-backups"
LOG_FILE="/var/log/medusa/backup.log"

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

# Function to create database backup
create_backup() {
    local backup_file="$1"

    log_info "Creating database backup: $backup_file"
    log_to_file "Creating backup: $backup_file"

    # Create temporary directory
    mkdir -p "$TEMP_DIR"

    # Create backup using pg_dump inside container
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -F p "$DB_NAME" > "$backup_file" 2>&1; then
        log_success "Database dump created successfully"
        log_to_file "Backup created: $backup_file"
        return 0
    else
        log_error "Failed to create database dump"
        log_to_file "ERROR: Failed to create database dump"
        rm -f "$backup_file"
        return 1
    fi
}

# Function to compress backup
compress_backup() {
    local backup_file="$1"
    local compressed_file="${backup_file}.gz"

    log_info "Compressing backup..." >&2
    log_to_file "Compressing: $backup_file"

    if gzip -f "$backup_file"; then
        log_success "Backup compressed successfully" >&2
        log_to_file "Compressed: $compressed_file"
        echo "$compressed_file"
        return 0
    else
        log_error "Failed to compress backup" >&2
        log_to_file "ERROR: Failed to compress backup"
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

# Function to upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local s3_key="$2"

    log_info "Uploading backup to S3: s3://${S3_BUCKET}/${s3_key}"
    log_to_file "Uploading to S3: s3://${S3_BUCKET}/${s3_key}"

    # Configure AWS CLI for S3-compatible storage
    export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"

    # Upload to S3 using AWS CLI with S3-compatible endpoint
    if aws s3 cp "$backup_file" "s3://${S3_BUCKET}/${s3_key}" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-verify-ssl 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Backup uploaded to S3 successfully"
        log_to_file "Upload successful: s3://${S3_BUCKET}/${s3_key}"
        return 0
    else
        log_error "Failed to upload backup to S3"
        log_to_file "ERROR: Failed to upload to S3"
        return 1
    fi
}

# Function to clean up old backups from S3
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
    log_to_file "Cleaning up old backups (retention: ${BACKUP_RETENTION_DAYS} days)"

    # Configure AWS CLI
    export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"

    # List all backups and delete old ones
    # Calculate cutoff date (works on both Linux and macOS)
    local cutoff_date
    if date -v-${BACKUP_RETENTION_DAYS}d +%Y-%m-%d >/dev/null 2>&1; then
        # macOS date command
        cutoff_date=$(date -v-${BACKUP_RETENTION_DAYS}d +%Y-%m-%d)
    else
        # Linux date command
        cutoff_date=$(date -u -d "${BACKUP_RETENTION_DAYS} days ago" +%Y-%m-%d)
    fi

    # Get list of backups from S3
    local old_backups=$(aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-verify-ssl 2>/dev/null | awk '{print $4}' | grep "medusa-backup-.*\.sql\.gz$" || true)

    local deleted_count=0
    for backup in $old_backups; do
        # Extract date from backup filename (format: medusa-backup-YYYY-MM-DD-HHMMSS.sql.gz)
        local backup_date=$(echo "$backup" | sed -n 's/medusa-backup-\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\).*/\1/p')

        if [[ -n "$backup_date" ]]; then
            # Compare dates (simple string comparison works for YYYY-MM-DD format)
            if [[ "$backup_date" < "$cutoff_date" ]]; then
                log_info "Deleting old backup: $backup"
                log_to_file "Deleting old backup: $backup"
                if aws s3 rm "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/${backup}" \
                    --endpoint-url "$S3_ENDPOINT" \
                    --no-verify-ssl >> "$LOG_FILE" 2>&1; then
                    ((deleted_count++))
                fi
            fi
        fi
    done

    if [[ $deleted_count -gt 0 ]]; then
        log_success "Deleted $deleted_count old backup(s)"
        log_to_file "Deleted $deleted_count old backup(s)"
    else
        log_info "No old backups to delete"
        log_to_file "No old backups to delete"
    fi
}

# Function to cleanup temporary files
cleanup_temp() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
        log_info "Cleaned up temporary files"
    fi
}

# Main backup process
main() {
    log_info "Starting database backup process"
    log_to_file "=== Backup process started ==="

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

    # Generate backup filename with timestamp
    local timestamp=$(date '+%Y-%m-%d-%H%M%S')
    local backup_filename="medusa-backup-${timestamp}.sql"
    local backup_file="${TEMP_DIR}/${backup_filename}"
    local s3_key="${S3_BACKUP_PREFIX}/${backup_filename}.gz"

    # Create backup
    if ! create_backup "$backup_file"; then
        cleanup_temp
        exit 1
    fi

    # Compress backup
    local compressed_file
    if ! compressed_file=$(compress_backup "$backup_file"); then
        cleanup_temp
        exit 1
    fi

    # Verify backup
    if ! verify_backup "$compressed_file"; then
        cleanup_temp
        exit 1
    fi

    # Upload to S3
    if ! upload_to_s3 "$compressed_file" "$s3_key"; then
        cleanup_temp
        exit 1
    fi

    # Clean up old backups
    cleanup_old_backups

    # Cleanup temporary files
    cleanup_temp

    log_success "Backup process completed successfully"
    log_to_file "=== Backup process completed successfully ==="
    log_to_file "Backup location: s3://${S3_BUCKET}/${s3_key}"

    exit 0
}

# Trap to ensure cleanup on exit
trap cleanup_temp EXIT

# Run main function
main

