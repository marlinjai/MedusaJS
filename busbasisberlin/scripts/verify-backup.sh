#!/bin/bash
# verify-backup.sh
# Verify backup integrity and health checks
# Can verify local files or backups in S3

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
S3_BACKUP_PREFIX="database-backups"
TEMP_DIR="/tmp/medusa-verify"
LOG_FILE="/var/log/medusa/verify.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log to file
log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to verify local backup file
verify_local_backup() {
    local backup_file="$1"
    local errors=0

    log_info "Verifying local backup file: $backup_file"
    log_to_file "Verifying local backup: $backup_file"

    # Check if file exists
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file does not exist: $backup_file"
        log_to_file "ERROR: File not found: $backup_file"
        return 1
    fi

    # Check file size
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    if [[ $file_size -eq 0 ]]; then
        log_error "Backup file is empty (0 bytes)"
        log_to_file "ERROR: File is empty: $backup_file"
        ((errors++))
    else
        log_success "File size: $(numfmt --to=iec-i --suffix=B $file_size 2>/dev/null || echo "${file_size} bytes")"
        log_to_file "File size: ${file_size} bytes"
    fi

    # Check file permissions
    if [[ ! -r "$backup_file" ]]; then
        log_error "Backup file is not readable"
        log_to_file "ERROR: File not readable: $backup_file"
        ((errors++))
    else
        log_success "File is readable"
    fi

    # Test gzip integrity
    log_info "Testing gzip integrity..."
    if gzip -t "$backup_file" 2>/dev/null; then
        log_success "Gzip integrity check passed"
        log_to_file "Gzip integrity: OK"
    else
        log_error "Gzip integrity check failed - file may be corrupted"
        log_to_file "ERROR: Gzip integrity check failed"
        ((errors++))
    fi

    # Try to peek at first few lines (if it's a SQL dump)
    log_info "Checking file format..."
    if gunzip -c "$backup_file" 2>/dev/null | head -n 1 | grep -q "PostgreSQL database dump"; then
        log_success "File appears to be a valid PostgreSQL dump"
        log_to_file "File format: PostgreSQL dump"
    else
        log_warning "File format check inconclusive (may still be valid)"
        log_to_file "WARNING: File format check inconclusive"
    fi

    if [[ $errors -eq 0 ]]; then
        log_success "Backup file verification passed"
        log_to_file "Verification result: PASSED"
        return 0
    else
        log_error "Backup file verification failed with $errors error(s)"
        log_to_file "Verification result: FAILED ($errors errors)"
        return 1
    fi
}

# Function to verify backup in S3
verify_s3_backup() {
    local backup_name="$1"
    local errors=0

    log_info "Verifying backup in S3: $backup_name"
    log_to_file "Verifying S3 backup: $backup_name"

    # Check required environment variables
    local required_vars=(
        "S3_ACCESS_KEY_ID"
        "S3_SECRET_ACCESS_KEY"
        "S3_BUCKET"
        "S3_ENDPOINT"
        "S3_REGION"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Missing required environment variable: $var"
            log_to_file "ERROR: Missing environment variable: $var"
            return 1
        fi
    done

    # Configure AWS CLI
    export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"

    # Check if backup exists in S3
    log_info "Checking if backup exists in S3..."
    if aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/${backup_name}" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-verify-ssl > /dev/null 2>&1; then
        log_success "Backup exists in S3"
        log_to_file "S3 existence check: OK"
    else
        log_error "Backup not found in S3: $backup_name"
        log_to_file "ERROR: Backup not found in S3"
        return 1
    fi

    # Get backup size from S3
    local s3_size=$(aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/${backup_name}" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-verify-ssl 2>/dev/null | awk '{print $3}' || echo "0")

    if [[ "$s3_size" -eq 0 ]]; then
        log_error "Backup file in S3 is empty (0 bytes)"
        log_to_file "ERROR: S3 file is empty"
        ((errors++))
    else
        log_success "S3 file size: $(numfmt --to=iec-i --suffix=B $s3_size 2>/dev/null || echo "${s3_size} bytes")"
        log_to_file "S3 file size: ${s3_size} bytes"
    fi

    # Download and verify locally (optional deep check)
    if [[ "$DEEP_VERIFY" == "true" ]]; then
        log_info "Performing deep verification (downloading backup)..."
        mkdir -p "$TEMP_DIR"
        local local_file="${TEMP_DIR}/${backup_name}"

        if aws s3 cp "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/${backup_name}" "$local_file" \
            --endpoint-url "$S3_ENDPOINT" \
            --no-verify-ssl > /dev/null 2>&1; then
            if verify_local_backup "$local_file"; then
                log_success "Deep verification passed"
                log_to_file "Deep verification: PASSED"
            else
                log_error "Deep verification failed"
                log_to_file "Deep verification: FAILED"
                ((errors++))
            fi
            rm -f "$local_file"
        else
            log_warning "Could not download backup for deep verification"
            log_to_file "WARNING: Deep verification skipped"
        fi
    fi

    if [[ $errors -eq 0 ]]; then
        log_success "S3 backup verification passed"
        log_to_file "S3 verification result: PASSED"
        return 0
    else
        log_error "S3 backup verification failed with $errors error(s)"
        log_to_file "S3 verification result: FAILED ($errors errors)"
        return 1
    fi
}

# Function to verify latest backup
verify_latest_backup() {
    log_info "Finding and verifying latest backup..."
    log_to_file "Verifying latest backup"

    # Check required environment variables
    local required_vars=(
        "S3_ACCESS_KEY_ID"
        "S3_SECRET_ACCESS_KEY"
        "S3_BUCKET"
        "S3_ENDPOINT"
        "S3_REGION"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Missing required environment variable: $var"
            log_to_file "ERROR: Missing environment variable: $var"
            return 1
        fi
    done

    # Configure AWS CLI
    export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"

    # Get latest backup
    local latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-verify-ssl 2>/dev/null | awk '{print $4}' | grep "medusa-backup-.*\.sql\.gz$" | sort -r | head -n 1 || true)

    if [[ -z "$latest_backup" ]]; then
        log_error "No backups found in S3"
        log_to_file "ERROR: No backups found"
        return 1
    fi

    log_info "Latest backup: $latest_backup"
    verify_s3_backup "$latest_backup"
}

# Function to generate health check report
generate_health_report() {
    log_info "Generating backup health check report..."
    log_to_file "Generating health report"

    local report_file="/var/log/medusa/backup-health-report.txt"
    local report_date=$(date '+%Y-%m-%d %H:%M:%S')

    {
        echo "=== Backup Health Check Report ==="
        echo "Generated: $report_date"
        echo ""

        # Check if AWS CLI is available
        if command -v aws &> /dev/null; then
            echo "✓ AWS CLI installed"
        else
            echo "✗ AWS CLI not installed"
        fi

        # Check environment variables
        echo ""
        echo "Environment Variables:"
        local required_vars=("S3_ACCESS_KEY_ID" "S3_SECRET_ACCESS_KEY" "S3_BUCKET" "S3_ENDPOINT" "S3_REGION")
        for var in "${required_vars[@]}"; do
            if [[ -n "${!var}" ]]; then
                echo "  ✓ $var is set"
            else
                echo "  ✗ $var is not set"
            fi
        done

        # Check S3 connectivity and list backups
        echo ""
        echo "S3 Backups:"
        if [[ -n "$S3_BUCKET" ]] && [[ -n "$S3_ENDPOINT" ]]; then
            export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
            export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
            export AWS_DEFAULT_REGION="$S3_REGION"

            local backup_count=$(aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/" \
                --endpoint-url "$S3_ENDPOINT" \
                --no-verify-ssl 2>/dev/null | grep -c "medusa-backup-.*\.sql\.gz$" || echo "0")
            echo "  Total backups: $backup_count"

            if [[ $backup_count -gt 0 ]]; then
                local latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/${S3_BACKUP_PREFIX}/" \
                    --endpoint-url "$S3_ENDPOINT" \
                    --no-verify-ssl 2>/dev/null | awk '{print $4}' | grep "medusa-backup-.*\.sql\.gz$" | sort -r | head -n 1)
                echo "  Latest backup: $latest_backup"

                # Check age of latest backup
                if [[ -n "$latest_backup" ]]; then
                    local backup_date=$(echo "$latest_backup" | sed -n 's/medusa-backup-\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\).*/\1/p')
                    if [[ -n "$backup_date" ]]; then
                        # Calculate days old (works on both Linux and macOS)
                        local days_old
                        if date -j -f "%Y-%m-%d" "$backup_date" +%s >/dev/null 2>&1; then
                            # macOS date command
                            days_old=$(($(($(date +%s) - $(date -j -f "%Y-%m-%d" "$backup_date" +%s))) / 86400))
                        else
                            # Linux date command
                            days_old=$(($(($(date +%s) - $(date -d "$backup_date" +%s))) / 86400))
                        fi
                        echo "  Latest backup age: $days_old day(s)"
                        if [[ $days_old -gt 1 ]]; then
                            echo "  ⚠ WARNING: Latest backup is more than 1 day old"
                        fi
                    fi
                fi
            else
                echo "  ⚠ WARNING: No backups found"
            fi
        else
            echo "  ✗ Cannot check S3 (missing configuration)"
        fi

        # Check log files
        echo ""
        echo "Log Files:"
        if [[ -f "/var/log/medusa/backup.log" ]]; then
            local last_backup_log=$(tail -n 1 /var/log/medusa/backup.log 2>/dev/null || echo "No log entries")
            echo "  Last backup log entry: $last_backup_log"
        else
            echo "  ⚠ Backup log file not found"
        fi

        echo ""
        echo "=== End of Report ==="
    } > "$report_file"

    log_success "Health report generated: $report_file"
    cat "$report_file"
    log_to_file "Health report generated: $report_file"
}

# Function to cleanup temporary files
cleanup_temp() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [backup-file|backup-name]"
    echo ""
    echo "Options:"
    echo "  -l, --latest          Verify the latest backup in S3"
    echo "  -r, --report          Generate health check report"
    echo "  -d, --deep            Perform deep verification (download and test)"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backup.sql.gz                                    # Verify local backup file"
    echo "  $0 medusa-backup-2024-01-15-020000.sql.gz          # Verify backup in S3"
    echo "  $0 --latest                                          # Verify latest backup in S3"
    echo "  $0 --report                                          # Generate health check report"
    echo "  $0 --latest --deep                                   # Deep verify latest backup"
}

# Main function
main() {
    local verify_latest=false
    local generate_report=false
    local deep_verify=false
    local backup_arg=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--latest)
                verify_latest=true
                shift
                ;;
            -r|--report)
                generate_report=true
                shift
                ;;
            -d|--deep)
                deep_verify=true
                export DEEP_VERIFY=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                backup_arg="$1"
                shift
                ;;
        esac
    done

    log_info "Starting backup verification"
    log_to_file "=== Verification process started ==="

    # Generate report if requested
    if [[ "$generate_report" == true ]]; then
        generate_health_report
    fi

    # Verify latest backup if requested
    if [[ "$verify_latest" == true ]]; then
        if ! verify_latest_backup; then
            cleanup_temp
            exit 1
        fi
    # Verify specific backup if provided
    elif [[ -n "$backup_arg" ]]; then
        # Check if it's a local file or S3 backup name
        if [[ -f "$backup_arg" ]]; then
            if ! verify_local_backup "$backup_arg"; then
                cleanup_temp
                exit 1
            fi
        else
            if ! verify_s3_backup "$backup_arg"; then
                cleanup_temp
                exit 1
            fi
        fi
    else
        log_error "No backup specified. Use --latest, --report, or provide a backup file/name"
        show_usage
        cleanup_temp
        exit 1
    fi

    cleanup_temp
    log_success "Verification process completed"
    log_to_file "=== Verification process completed ==="

    exit 0
}

# Trap to ensure cleanup on exit
trap cleanup_temp EXIT

# Run main function
main "$@"

